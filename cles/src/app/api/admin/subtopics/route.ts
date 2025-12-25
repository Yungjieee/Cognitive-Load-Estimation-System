import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// GET - Fetch all subtopics (not used in UI, but useful for API)
export async function GET(request: NextRequest) {
  try {
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is admin
    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (userData?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 })
    }

    const { data, error } = await supabase
      .from('subtopics')
      .select('*')
      .order('name')

    if (error) throw error

    return NextResponse.json({ subtopics: data })
  } catch (error: any) {
    console.error('Error fetching subtopics:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch subtopics' },
      { status: 500 }
    )
  }
}

// POST - Create new subtopic
export async function POST(request: NextRequest) {
  try {
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is admin
    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (userData?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 })
    }

    const body = await request.json()
    const { key, name, description, enabled } = body

    // Validate required fields
    if (!key || !name) {
      return NextResponse.json(
        { error: 'Key and Name are required' },
        { status: 400 }
      )
    }

    // Check if key already exists
    const { data: existing } = await supabase
      .from('subtopics')
      .select('id')
      .eq('key', key)
      .single()

    if (existing) {
      return NextResponse.json(
        { error: 'A subtopic with this key already exists' },
        { status: 400 }
      )
    }

    // Insert new subtopic
    const { data, error } = await supabase
      .from('subtopics')
      .insert([{
        key,
        name,
        description: description || null,
        enabled: enabled ?? true
      }])
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ success: true, subtopic: data })
  } catch (error: any) {
    console.error('Error creating subtopic:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create subtopic' },
      { status: 500 }
    )
  }
}

// PUT - Update subtopic
export async function PUT(request: NextRequest) {
  try {
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is admin
    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (userData?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 })
    }

    const body = await request.json()
    const { id, name, description, enabled } = body

    // Validate
    if (!id || !name) {
      return NextResponse.json(
        { error: 'ID and Name are required' },
        { status: 400 }
      )
    }

    // Update subtopic
    const { data, error } = await supabase
      .from('subtopics')
      .update({
        name,
        description: description || null,
        enabled: enabled ?? true
      })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ success: true, subtopic: data })
  } catch (error: any) {
    console.error('Error updating subtopic:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to update subtopic' },
      { status: 500 }
    )
  }
}

// DELETE - Delete subtopic
export async function DELETE(request: NextRequest) {
  try {
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is admin
    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (userData?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 })
    }

    const body = await request.json()
    const { id } = body

    if (!id) {
      return NextResponse.json(
        { error: 'Subtopic ID is required' },
        { status: 400 }
      )
    }

    // Check if subtopic has associated sessions
    const { count } = await supabase
      .from('sessions')
      .select('*', { count: 'exact', head: true })
      .eq('subtopic_id', id)

    if (count && count > 0) {
      return NextResponse.json(
        { error: `Cannot delete subtopic: ${count} sessions are associated with it. Consider disabling instead.` },
        { status: 400 }
      )
    }

    // Check if subtopic has associated questions
    const { count: questionCount } = await supabase
      .from('questions')
      .select('*', { count: 'exact', head: true })
      .eq('subtopic_id', id)

    if (questionCount && questionCount > 0) {
      return NextResponse.json(
        { error: `Cannot delete subtopic: ${questionCount} questions are associated with it. Consider disabling instead.` },
        { status: 400 }
      )
    }

    // Delete subtopic
    const { error } = await supabase
      .from('subtopics')
      .delete()
      .eq('id', id)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error deleting subtopic:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to delete subtopic' },
      { status: 500 }
    )
  }
}
