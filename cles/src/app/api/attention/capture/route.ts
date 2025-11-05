import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { session_id, attention_status, q_label } = body;

    // Validate input
    if (!session_id || !attention_status || !q_label) {
      return NextResponse.json(
        { error: 'Missing required fields: session_id, attention_status, q_label' },
        { status: 400 }
      );
    }

    // Validate attention_status
    if (attention_status !== 'FOCUSED' && attention_status !== 'DISTRACTED') {
      return NextResponse.json(
        { error: 'attention_status must be either FOCUSED or DISTRACTED' },
        { status: 400 }
      );
    }

    // Validate q_label format (q1, q2, q3, q4, q5)
    if (!/^q[1-5]$/.test(q_label)) {
      return NextResponse.json(
        { error: 'q_label must be in format q1, q2, q3, q4, or q5' },
        { status: 400 }
      );
    }

    // Check if admin client is available
    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'Service role key not configured' },
        { status: 500 }
      );
    }

    // Insert attention event into database using admin client (bypasses RLS)
    const { data, error } = await supabaseAdmin
      .from('attention_events')
      .insert({
        session_id: Number(session_id),
        attention_status,
        q_label,
        timestamp: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error('Error inserting attention event:', error);
      return NextResponse.json(
        { error: 'Failed to insert attention event', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data
    });
  } catch (error: any) {
    console.error('Error in attention capture endpoint:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
