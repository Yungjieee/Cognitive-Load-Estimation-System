//Mark question boundaries (start/end timestamps)

import { NextRequest, NextResponse } from 'next/server';
import { DatabaseClient } from '@/lib/database';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId: sessionIdParam } = await params;
    const sessionId = Number(sessionIdParam);
    const body = await request.json();
    const { qIndex, timestamp, eventType } = body;

    // Validate required fields
    if (!qIndex || !timestamp || !eventType) {
      return NextResponse.json(
        { error: 'Missing required fields: qIndex, timestamp, eventType' },
        { status: 400 }
      );
    }

    if (!['question_start', 'question_end'].includes(eventType)) {
      return NextResponse.json(
        { error: 'eventType must be "question_start" or "question_end"' },
        { status: 400 }
      );
    }

    // Validate session exists
    const session = await DatabaseClient.getSession(String(sessionId));
    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    // Store question boundary in database (single source of truth)
    await DatabaseClient.markQuestionBoundary(
      sessionId,
      Number(qIndex),
      Number(timestamp),
      eventType as 'question_start' | 'question_end'
    );

    console.log(`✅ Question boundary marked: Session ${sessionId}, Q${qIndex}, ${eventType} at ${timestamp}ms`);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error marking question boundary:', error);
    return NextResponse.json(
      { error: 'Failed to mark question boundary' },
      { status: 500 }
    );
  }
}

