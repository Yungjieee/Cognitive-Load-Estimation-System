// Test database connection
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET() {
  try {
    console.log('🔍 Testing database connection...');
    
    // Test 1: Check if Supabase client is configured
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({
        success: false,
        error: 'Supabase credentials not configured',
        details: {
          hasUrl: !!supabaseUrl,
          hasKey: !!supabaseKey
        }
      }, { status: 500 });
    }
    
    console.log('✅ Environment variables configured');
    console.log(`   Supabase URL: ${supabaseUrl}`);
    
    // Test 2: Try to query a simple table
    const { data: sessions, error: sessionsError } = await supabase
      .from('sessions')
      .select('id')
      .limit(1);
    
    if (sessionsError) {
      console.error('❌ Failed to query sessions table:', sessionsError);
      return NextResponse.json({
        success: false,
        error: 'Database query failed',
        details: {
          message: sessionsError.message,
          hint: sessionsError.hint,
          code: sessionsError.code
        }
      }, { status: 500 });
    }
    
    console.log('✅ Successfully queried sessions table');
    
    // Test 3: Try to query hr_beats table
    const { data: beats, error: beatsError } = await supabase
      .from('hr_beats')
      .select('id')
      .limit(1);
    
    if (beatsError) {
      console.error('❌ Failed to query hr_beats table:', beatsError);
      return NextResponse.json({
        success: false,
        error: 'hr_beats table query failed',
        details: {
          message: beatsError.message,
          hint: beatsError.hint,
          code: beatsError.code
        }
      }, { status: 500 });
    }
    
    console.log('✅ Successfully queried hr_beats table');
    
    // Test 4: Try to insert a test beat (then delete it)
    const testBeat = {
      session_id: '999999', // Test session ID
      ts_ms: Date.now(),
      ibi_ms: 800,
      bpm: 75
    };
    
    const { data: insertedBeat, error: insertError } = await supabase
      .from('hr_beats')
      .insert([testBeat])
      .select()
      .single();
    
    if (insertError) {
      console.error('❌ Failed to insert test beat:', insertError);
      return NextResponse.json({
        success: false,
        error: 'Database insert failed',
        details: {
          message: insertError.message,
          hint: insertError.hint,
          code: insertError.code
        }
      }, { status: 500 });
    }
    
    console.log('✅ Successfully inserted test beat');
    
    // Clean up: Delete the test beat
    if (insertedBeat) {
      await supabase
        .from('hr_beats')
        .delete()
        .eq('id', insertedBeat.id);
      console.log('✅ Cleaned up test beat');
    }
    
    // All tests passed!
    return NextResponse.json({
      success: true,
      message: '✅ Database connection working perfectly!',
      tests: {
        environmentVariables: '✅ Configured',
        querySessions: '✅ Success',
        queryHRBeats: '✅ Success',
        insertHRBeat: '✅ Success',
        deleteHRBeat: '✅ Success'
      },
      supabaseUrl: supabaseUrl,
      timestamp: new Date().toISOString()
    });
    
  } catch (error: any) {
    console.error('❌ Database test failed:', error);
    return NextResponse.json({
      success: false,
      error: 'Unexpected error during database test',
      details: {
        message: error.message || 'Unknown error',
        stack: error.stack
      }
    }, { status: 500 });
  }
}


