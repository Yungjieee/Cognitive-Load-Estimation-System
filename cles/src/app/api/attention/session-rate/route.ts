import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const session_id = searchParams.get('session_id');

    // Validate input
    if (!session_id) {
      return NextResponse.json(
        { error: 'Missing required parameter: session_id' },
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

    // Get all attention events for this session
    const { data: events, error: eventsError } = await supabaseAdmin
      .from('attention_events')
      .select('attention_status')
      .eq('session_id', Number(session_id));

    if (eventsError) {
      console.error('Error fetching attention events:', eventsError);
      return NextResponse.json(
        { error: 'Failed to fetch attention events', details: eventsError.message },
        { status: 500 }
      );
    }

    // Calculate overall attention rate
    if (!events || events.length === 0) {
      return NextResponse.json({
        attention_rate: null,
        focused_count: 0,
        total_count: 0,
        message: 'No attention data found for this session'
      });
    }

    const focusedCount = events.filter(e => e.attention_status === 'FOCUSED').length;
    const totalCount = events.length;
    const attentionRate = (focusedCount / totalCount) * 100;

    // Update the sessions table with the calculated attention rate
    const { error: updateError } = await supabaseAdmin
      .from('sessions')
      .update({ attention_rate: attentionRate })
      .eq('id', Number(session_id));

    if (updateError) {
      console.warn('Failed to update session attention_rate:', updateError);
      // Don't fail the request, just log the warning
    }

    return NextResponse.json({
      attention_rate: Number(attentionRate.toFixed(2)),
      focused_count: focusedCount,
      total_count: totalCount,
      session_id: Number(session_id)
    });
  } catch (error: any) {
    console.error('Error in session-rate endpoint:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
