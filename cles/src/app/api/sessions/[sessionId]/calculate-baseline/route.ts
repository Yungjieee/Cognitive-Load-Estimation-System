import { NextRequest, NextResponse } from 'next/server';
import { DatabaseClient } from '@/lib/database';
import { filterIBIs, computeRMSSD, type ProcessedIBI } from '@/lib/hrvAggregator';
import { HRV_CONFIG } from '@/lib/hrvConfig';

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId: sessionIdParam } = await params;
    const sessionId = Number(sessionIdParam);

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Missing sessionId' },
        { status: 400 }
      );
    }

    // Get beats from database (first 10 seconds - calibration period)
    const { processedBeats, rawCount } = await getBeatsForCalibration(sessionId);

    console.log(`📊 Retrieved ${rawCount} raw beats from database for calibration`);
    console.log(`📊 After filtering: ${processedBeats.length} valid beats`);

    // CALIBRATION REQUIREMENT: Must have at least MIN_BEATS_PER_QUESTION valid beats
    // If not, user must recalibrate
    if (processedBeats.length < HRV_CONFIG.MIN_BEATS_PER_QUESTION) {
      console.log(`⚠️ Not enough valid beats for calibration: ${processedBeats.length} beats (need at least ${HRV_CONFIG.MIN_BEATS_PER_QUESTION})`);
      console.log(`🔄 User must recalibrate to get valid baseline`);
      return NextResponse.json(
        {
          success: false,
          error: 'Not enough beats for calibration - please recalibrate',
          beatCount: processedBeats.length,
          rawBeatCount: rawCount,
          minRequired: HRV_CONFIG.MIN_BEATS_PER_QUESTION
        },
        { status: 400 }
      );
    }

    // Calculate baseline RMSSD using filtered beats
    console.log(`🔢 Calculating RMSSD baseline for session ${sessionId}...`);
    console.log(`📊 IBI data sample (filtered): ${processedBeats.slice(0, 10).map(b => b.ibi_ms).join(', ')}${processedBeats.length > 10 ? '...' : ''}`);

    const rmssdBase = computeRMSSD(processedBeats);

    console.log(`✅ RMSSD baseline calculated: ${rmssdBase.toFixed(2)}ms (from ${processedBeats.length} valid beats)`);

    // Determine confidence level based on beat count
    const rmssdConfidence = processedBeats.length >= HRV_CONFIG.MIN_BEATS_PER_QUESTION ? 'ok' : 'low';

    // Save RMSSD baseline to database
    await DatabaseClient.updateSession(String(sessionId), {
      rmssd_baseline: rmssdBase,
      rmssd_confidence: rmssdConfidence,
      baseline_beat_count: processedBeats.length
    });

    console.log(`💾 Saved RMSSD baseline to database: ${rmssdBase.toFixed(2)}ms (confidence: ${rmssdConfidence})`);

    return NextResponse.json({
      success: true,
      sessionId,
      rmssdBase,
      beatCount: processedBeats.length,
      rawBeatCount: rawCount,
      confidence: rmssdConfidence,
      timestamp: Date.now()
    });

  } catch (error) {
    console.error('Error calculating calibration RMSSD:', error);
    return NextResponse.json(
      { error: 'Failed to calculate RMSSD baseline' },
      { status: 500 }
    );
  }
}

async function getBeatsForCalibration(sessionId: number): Promise<{ processedBeats: ProcessedIBI[], rawCount: number }> {
  // Get calibration beats using q_label (much simpler than timestamp filtering!)
  const calibrationBeats = await DatabaseClient.getQuestionBeats(String(sessionId), 'q0');

  console.log(`📊 Retrieved ${calibrationBeats.length} calibration beats (q0) from database for session ${sessionId}`);

  if (calibrationBeats.length === 0) {
    return { processedBeats: [], rawCount: 0 };
  }

  // Filter out null IBI values
  const validBeats = calibrationBeats.filter(beat => beat.ibi_ms !== null);

  if (validBeats.length > 0) {
    console.log(`📊 Calibration beat timestamps: ${validBeats.slice(0, 5).map(b => b.ts_ms).join(', ')}${validBeats.length > 5 ? '...' : ''}`);
  }

  // Convert to ProcessedIBI format
  const processedBeats: ProcessedIBI[] = validBeats.map(beat => ({
    ibi_ms: beat.ibi_ms as number,
    timestamp: beat.ts_ms
  }));

  // Filter out physiologically invalid beats (IBI < 300ms or > 2000ms, large deltas)
  const filteredBeats = filterIBIs(processedBeats);

  return {
    processedBeats: filteredBeats,
    rawCount: validBeats.length
  };
}
