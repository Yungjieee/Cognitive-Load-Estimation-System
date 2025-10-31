//Process HRV data for completed session

import { NextRequest, NextResponse } from 'next/server';
import { DatabaseClient } from '@/lib/database';
import { supabase } from '@/lib/supabase';
import { 
  computeBaselineRMSSD, 
  computeQuestionHRV, 
  processSessionHRV,
  createHRVAggregator,
  addQuestionBoundary,
  type ProcessedIBI
} from '@/lib/hrvAggregator';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId: sessionIdParam } = await params;
    const sessionId = Number(sessionIdParam);

    // Validate session exists and user has access
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify session belongs to user
    const sessions = await DatabaseClient.getSessionsByUser(user.id);
    const session = sessions.find(s => s.id === sessionId);
    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    // Get all HR beats for this session (convert number to string for method signature)
    const hrBeats = await DatabaseClient.getSessionHRBeats(String(sessionId));
    
    // Get question boundaries
    const boundaries = await DatabaseClient.getQuestionBoundaries(sessionId);

    // Convert HR beats to ProcessedIBI format
    const processedIBIs: ProcessedIBI[] = hrBeats
      .filter(beat => beat.ibi_ms !== null)
      .map(beat => ({
        ibi_ms: beat.ibi_ms!,
        timestamp: beat.ts_ms
      }));

    if (processedIBIs.length === 0) {
      return NextResponse.json({ 
        success: true, 
        message: 'No HR data available for processing' 
      });
    }

    // Create HRV aggregator
    const aggregator = createHRVAggregator(sessionId);

    // Compute baseline RMSSD (first 10 seconds)
    const calibrationEndMs = 10000; // 10 seconds
    const baselineResult = computeBaselineRMSSD(processedIBIs, calibrationEndMs);
    aggregator.baselineRMSSD = baselineResult.rmssd;
    aggregator.baselineConfidence = baselineResult.confidence;

    // Add question boundaries to aggregator
    boundaries.forEach(boundary => {
      addQuestionBoundary(
        aggregator,
        boundary.q_index,
        boundary.timestamp,
        boundary.event_type as 'question_start' | 'question_end'
      );
    });

    // Process HRV metrics for all questions
    const hrvResults = processSessionHRV(aggregator, processedIBIs);

    // Update response metrics with HRV data
    for (let qIndex = 1; qIndex <= 5; qIndex++) {
      const hrvMetrics = hrvResults.get(qIndex);
      if (hrvMetrics) {
        await DatabaseClient.updateResponseHRVMetrics(sessionId, qIndex, hrvMetrics);
      }
    }

    return NextResponse.json({ 
      success: true,
      baselineRMSSD: aggregator.baselineRMSSD,
      baselineConfidence: aggregator.baselineConfidence,
      processedQuestions: hrvResults.size
    });
  } catch (error) {
    console.error('Error processing HRV:', error);
    return NextResponse.json(
      { error: 'Failed to process HRV data' },
      { status: 500 }
    );
  }
}

