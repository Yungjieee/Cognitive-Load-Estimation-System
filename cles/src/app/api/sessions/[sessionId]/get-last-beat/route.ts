// API route to get the last beat for a specific q_label
// Used for calculating question boundaries based on actual beat timestamps

import { NextRequest, NextResponse } from 'next/server';
import { DatabaseClient } from '@/lib/database';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId: sessionIdParam } = await params;
    const sessionId = sessionIdParam;

    const searchParams = request.nextUrl.searchParams;
    const q_label = searchParams.get('q_label');

    if (!q_label) {
      return NextResponse.json(
        { error: 'Missing q_label parameter' },
        { status: 400 }
      );
    }

    // Validate q_label format
    if (!q_label.match(/^q[0-5]$/)) {
      return NextResponse.json(
        { error: 'Invalid q_label. Must be q0-q5' },
        { status: 400 }
      );
    }

    console.log(`🔍 [API] Getting last beat for session ${sessionId}, q_label=${q_label}`);

    // Get last beat for this q_label
    const lastBeat = await DatabaseClient.getLastBeatByLabel(sessionId, q_label);

    if (lastBeat) {
      console.log(`✅ [API] Found last beat: ts=${lastBeat.ts_ms}ms, bpm=${lastBeat.bpm}`);
    } else {
      console.log(`⚠️ [API] No beats found for ${q_label}`);
    }

    return NextResponse.json({
      success: true,
      lastBeat,
      timestamp: lastBeat ? lastBeat.ts_ms : null
    });

  } catch (error) {
    console.error('❌ [API] Error getting last beat:', error);
    return NextResponse.json(
      {
        error: 'Failed to get last beat',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}
