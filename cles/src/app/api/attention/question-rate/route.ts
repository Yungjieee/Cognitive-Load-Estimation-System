import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const session_id = searchParams.get('session_id');
    const q_label = searchParams.get('q_label');

    // Validate input
    if (!session_id || !q_label) {
      return NextResponse.json(
        { error: 'Missing required parameters: session_id, q_label' },
        { status: 400 }
      );
    }

    // Validate q_label format
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

    // Get all attention events for this question
    const { data: events, error: eventsError } = await supabaseAdmin
      .from('attention_events')
      .select('attention_status')
      .eq('session_id', Number(session_id))
      .eq('q_label', q_label);

    if (eventsError) {
      console.error('Error fetching attention events:', eventsError);
      return NextResponse.json(
        { error: 'Failed to fetch attention events', details: eventsError.message },
        { status: 500 }
      );
    }

    // Calculate attention rate
    if (!events || events.length === 0) {
      return NextResponse.json({
        attention_rate: null,
        focused_count: 0,
        total_count: 0,
        message: 'No attention data found for this question'
      });
    }

    const focusedCount = events.filter(e => e.attention_status === 'FOCUSED').length;
    const totalCount = events.length;
    const attentionRate = (focusedCount / totalCount) * 100;

    // Update the responses table with the calculated attention rate
    // First, find the response for this question
    const { data: session } = await supabaseAdmin
      .from('sessions')
      .select('id')
      .eq('id', Number(session_id))
      .single();

    if (session) {
      // Extract question index from q_label (q1 -> 1, q2 -> 2, etc.)
      const qIndex = parseInt(q_label.substring(1));

      // Update the response record
      const { error: updateError } = await supabaseAdmin
        .from('responses')
        .update({ attention_rate: attentionRate })
        .eq('session_id', Number(session_id))
        .eq('q_index', qIndex);

      if (updateError) {
        console.warn('Failed to update response attention_rate:', updateError);
        // Don't fail the request, just log the warning
      }
    }

    return NextResponse.json({
      attention_rate: Number(attentionRate.toFixed(2)),
      focused_count: focusedCount,
      total_count: totalCount,
      q_label
    });
  } catch (error: any) {
    console.error('Error in question-rate endpoint:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
