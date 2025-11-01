// Calculate RMSSD and label HRV for a specific question
import { NextRequest, NextResponse } from 'next/server';
import { DatabaseClient } from '@/lib/database';
import { HRV_CONFIG } from '@/lib/hrvConfig';
import { computeRMSSD, filterIBIs, type ProcessedIBI } from '@/lib/hrvAggregator';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId: sessionIdParam } = await params;
    const sessionId = Number(sessionIdParam);
    const body = await request.json();
    const { qIndex } = body;

    if (!sessionId || !qIndex) {
      return NextResponse.json(
        { error: 'Missing sessionId or qIndex' },
        { status: 400 }
      );
    }

    console.log(`📊 Calculating HRV for session ${sessionId}, question ${qIndex}...`);

    // Step 1: Get session to retrieve baseline RMSSD
    const session = await DatabaseClient.getSession(String(sessionId));
    if (!session) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }

    const baselineRMSSD = session.rmssd_baseline;
    if (!baselineRMSSD || baselineRMSSD <= 0) {
      console.warn(`⚠️ No valid baseline for session ${sessionId}`);
      // Store with low confidence
      await DatabaseClient.updateResponseHRVMetrics(sessionId, qIndex, {
        hrv: 'low',
        rmssd_q: 0,
        rmssd_base: 0,
        hrv_confidence: 'low'
      });

      return NextResponse.json({
        success: true,
        hrvMetrics: {
          hrv: 'low',
          rmssd_q: 0,
          rmssd_base: 0,
          hrv_confidence: 'low'
        },
        beatCount: 0,
        warning: 'No baseline available'
      });
    }

    console.log(`✅ Baseline RMSSD: ${baselineRMSSD.toFixed(2)}ms`);

    // Step 2: Get beats for this question using q_label (much simpler!)
    const q_label = `q${qIndex}`;
    const questionBeats = await DatabaseClient.getQuestionBeats(String(sessionId), q_label);

    console.log(`💓 Retrieved ${questionBeats.length} beats for ${q_label} from database`);

    // Step 3: Convert to ProcessedIBI format and filter
    const processedBeats: ProcessedIBI[] = questionBeats.map(beat => ({
      ibi_ms: beat.ibi_ms as number,
      timestamp: beat.ts_ms
    }));

    const filteredBeats = filterIBIs(processedBeats);
    console.log(`✅ After filtering: ${filteredBeats.length} valid beats (raw: ${questionBeats.length})`);

    // Check if we have at least 2 beats (minimum for RMSSD calculation)
    if (filteredBeats.length < 2) {
      console.warn(`⚠️ Not enough valid beats after filtering for Q${qIndex}: ${filteredBeats.length} (need at least 2)`);

      await DatabaseClient.updateResponseHRVMetrics(sessionId, qIndex, {
        hrv: 'low',
        rmssd_q: 0,
        rmssd_base: baselineRMSSD,
        hrv_confidence: 'low'
      });

      return NextResponse.json({
        success: true,
        hrvMetrics: {
          hrv: 'low',
          rmssd_q: 0,
          rmssd_base: baselineRMSSD,
          hrv_confidence: 'low'
        },
        beatCount: filteredBeats.length,
        rawBeatCount: questionBeats.length,
        warning: 'Not enough valid beats after filtering (<2)'
      });
    }

    // Step 4: Calculate RMSSD for this question (even if <10 beats)
    const rmssd_q = computeRMSSD(filteredBeats);
    console.log(`📈 Question ${qIndex} RMSSD: ${rmssd_q.toFixed(2)}ms (from ${filteredBeats.length} beats)`);

    // Step 5: Compare to baseline and label HRV
    const threshold = baselineRMSSD * HRV_CONFIG.HRV_HIGH_FACTOR;
    const hrvLabel = rmssd_q >= threshold ? 'high' : 'low';

    // Step 6: Determine confidence based on beat count
    // For QUESTIONS: Allow <10 beats but mark as 'low' confidence
    const hrvConfidence = filteredBeats.length >= HRV_CONFIG.MIN_BEATS_PER_QUESTION ? 'ok' : 'low';

    if (hrvConfidence === 'low') {
      console.warn(`⚠️ Low confidence HRV for Q${qIndex}: only ${filteredBeats.length} beats (recommended: ${HRV_CONFIG.MIN_BEATS_PER_QUESTION})`);
    }

    console.log(`🎯 Threshold: ${threshold.toFixed(2)}ms, Label: ${hrvLabel} ${hrvLabel === 'high' ? '(less stress)' : '(more stress)'}, Confidence: ${hrvConfidence}`);

    // Step 7: Store in responses table
    const hrvMetrics = {
      hrv: hrvLabel,
      rmssd_q: rmssd_q,
      rmssd_base: baselineRMSSD,
      hrv_confidence: hrvConfidence
    };

    await DatabaseClient.updateResponseHRVMetrics(sessionId, qIndex, hrvMetrics);

    console.log(`✅ HRV metrics stored for session ${sessionId}, Q${qIndex}`);

    // Step 8: Return result
    const response: any = {
      success: true,
      hrvMetrics,
      beatCount: filteredBeats.length,
      rawBeatCount: questionBeats.length,
      timestamp: Date.now()
    };

    // Add warning if low confidence
    if (hrvConfidence === 'low') {
      response.warning = `Low confidence: only ${filteredBeats.length} valid beats (recommended: ${HRV_CONFIG.MIN_BEATS_PER_QUESTION})`;
    }

    return NextResponse.json(response);

  } catch (error) {
    console.error('❌ Error calculating question HRV:', error);
    return NextResponse.json(
      { error: 'Failed to calculate question HRV', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
