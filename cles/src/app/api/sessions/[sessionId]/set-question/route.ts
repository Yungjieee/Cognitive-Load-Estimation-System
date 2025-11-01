// API route to set the current question for a session (for q_label tagging)
import { NextRequest, NextResponse } from 'next/server';
import { setSessionQuestion } from '@/lib/mqttReceiver';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId: sessionIdParam } = await params;
    const sessionId = Number(sessionIdParam);
    const body = await request.json();
    const { q_label, timestamp } = body;

    if (!sessionId || !q_label) {
      return NextResponse.json(
        { error: 'Missing sessionId or q_label' },
        { status: 400 }
      );
    }

    if (timestamp === undefined || timestamp === null) {
      return NextResponse.json(
        { error: 'Missing timestamp' },
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

    // Set the current question in MQTT receiver with timestamp
    setSessionQuestion(sessionId, q_label, timestamp);

    return NextResponse.json({
      success: true,
      sessionId,
      q_label,
      timestamp,
      message: `Session ${sessionId} set to ${q_label} at ${timestamp}ms`
    });

  } catch (error) {
    console.error('Error setting question:', error);
    return NextResponse.json(
      { error: 'Failed to set question' },
      { status: 500 }
    );
  }
}
