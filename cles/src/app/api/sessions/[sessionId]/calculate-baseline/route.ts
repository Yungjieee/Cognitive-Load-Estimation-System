import { NextRequest, NextResponse } from 'next/server';
import { HRV_CONFIG } from '@/lib/hrvConfig';
import { DatabaseClient } from '@/lib/database';

export async function POST(
  request: NextRequest,
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
    const beatData = await getBeatsForCalibration(sessionId);
    
    console.log(`📊 Retrieved ${beatData.length} beats from database for calibration`);
    
    if (beatData.length < 10) {
      console.log(`⚠️ Not enough beats for calibration: ${beatData.length} beats (need at least 10)`);
      return NextResponse.json(
        { 
          success: false, 
          error: 'Not enough beats for calibration',
          beatCount: beatData.length
        },
        { status: 400 }
      );
    }

    // Calculate baseline RMSSD
    console.log(`🔢 Calculating RMSSD baseline for session ${sessionId}...`);
    console.log(`📊 IBI data sample: ${beatData.slice(0, 10).join(', ')}${beatData.length > 10 ? '...' : ''}`);
    
    const rmssdBase = calculateRMSSD(beatData);
    
    console.log(`✅ RMSSD baseline calculated: ${rmssdBase.toFixed(2)}ms (from ${beatData.length} beats)`);
    
    // Determine confidence level based on beat count
    const rmssdConfidence = beatData.length >= 10 ? 'ok' : 'low';
    
    // Save RMSSD baseline to database
    await DatabaseClient.updateSession(String(sessionId), {
      rmssd_baseline: rmssdBase,
      rmssd_confidence: rmssdConfidence,
      baseline_beat_count: beatData.length
    });
    
    console.log(`💾 Saved RMSSD baseline to database: ${rmssdBase.toFixed(2)}ms (confidence: ${rmssdConfidence})`);

    return NextResponse.json({
      success: true,
      sessionId,
      rmssdBase,
      beatCount: beatData.length,
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

async function getBeatsForCalibration(sessionId: number): Promise<number[]> {
  // Get all beats from database for this session
  const allBeats = await DatabaseClient.getSessionHRBeats(String(sessionId));

  console.log(`📊 Total beats in database for session ${sessionId}: ${allBeats.length}`);

  if (allBeats.length === 0) {
    return [];
  }

  // Sort by ts_ms to ensure chronological order (should already be sorted, but ensuring)
  allBeats.sort((a, b) => a.ts_ms - b.ts_ms);

  // Get first 10 seconds worth of beats (calibration period)
  // Since ESP32 sends ts as milliseconds from session start,
  // we filter beats where ts_ms <= 10000
  const calibrationEndMs = HRV_CONFIG.CALIBRATION_DURATION_MS;
  const calibrationBeats = allBeats.filter(beat => beat.ts_ms <= calibrationEndMs);

  console.log(`📊 Filtered to ${calibrationBeats.length} beats within calibration period (0-${calibrationEndMs}ms)`);

  if (calibrationBeats.length > 0) {
    console.log(`📊 Calibration beat timestamps: ${calibrationBeats.slice(0, 5).map(b => b.ts_ms).join(', ')}${calibrationBeats.length > 5 ? '...' : ''}`);
  }

  // Return IBI values for RMSSD calculation
  return calibrationBeats
    .map(beat => beat.ibi_ms)
    .filter(ibi => ibi !== null) as number[];
}

function calculateRMSSD(ibiData: number[]): number {
  if (ibiData.length < 2) return 0;
  
  let sumOfSquares = 0;
  for (let i = 0; i < ibiData.length - 1; i++) {
    const diff = ibiData[i + 1] - ibiData[i];
    sumOfSquares += diff * diff;
  }
  
  return Math.sqrt(sumOfSquares / (ibiData.length - 1));
}
