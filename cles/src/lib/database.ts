// Database utilities and type definitions for CLES Phase 2

import { supabase, supabaseAdmin } from './supabase'

// Type definitions matching the database schema
export interface User {
  id: string
  email: string
  created_at: string
  updated_at: string
  profile_completed: boolean
  profile_prior_knowledge: Record<string, string>
  profile_experience_taken_course: 'yes' | 'no' | 'not_sure' | null
  profile_experience_hands_on: 'none' | 'some_exercises' | 'small_project' | 'large_project' | null
  profile_interest_subtopics: string[]
  settings_mode: 'support' | 'no_support'
}

export interface Subtopic {
  id: number
  key: string
  name: string
  description: string | null
  enabled: boolean
  created_at: string
}

export interface Question {
  id: number
  subtopic_id: number
  difficulty: 'E' | 'M' | 'H'
  qtype: 'mcq' | 'short' | 'code'
  prompt: string
  options: any[] | null
  answer_key: any
  hints: string[]
  explanation: string | null
  enabled: boolean
  created_at: string
  updated_at: string
}

export interface Session {
  id: number
  user_id: string
  subtopic_id: number
  mode: 'support' | 'no_support'
  started_at: string
  ended_at: string | null
  score_total: number
  rmssd_baseline?: number
  rmssd_confidence?: 'ok' | 'low'
  baseline_beat_count?: number
  created_at: string
  subtopics?: {
    key: string
    name: string
  }
}

export interface Response {
  id: number
  session_id: number
  question_id: number
  q_index: number
  user_answer: any
  correct: boolean | null
  time_ms: number | null
  hints_used: number
  extra_time_used: boolean
  metrics: {
    attention?: 'high' | 'low'
    hrv?: 'high' | 'low'
    overall?: number
    intrinsic?: number
    extraneous?: number
    germane?: number
  }
  created_at: string
}

export interface Event {
  id: number
  session_id: number
  ts_ms: number
  etype: string
  payload: any
  created_at: string
}

export interface HRBeat {
  id: number
  session_id: number
  ts_ms: number
  ibi_ms: number | null
  bpm: number | null
  q_label: string
  created_at: string
}

export interface NASATLXBlock {
  id: number
  session_id: number
  block: 'easy' | 'medium' | 'hard'
  mental: number | null
  physical: number | null
  temporal: number | null
  performance: number | null
  effort: number | null
  frustration: number | null
  created_at: string
}

// Database operations
export class DatabaseClient {
  // Ensure a row exists in public.users for the authenticated user
  static async ensureUserRecord(userId: string, email: string): Promise<void> {
    // Check if exists
    const { data, error } = await supabase
      .from('users')
      .select('id')
      .eq('id', userId)
      .single();

    if (error && (error as any).code !== 'PGRST116') {
      // An actual error other than not found
      throw error;
    }

    if (!data) {
      // Insert with defaults. Prefer admin client to bypass RLS if available.
      const client: any = (supabaseAdmin as unknown as object) ?? supabase;
      const { error: insertError } = await client
        .from('users')
        .insert([{ 
          id: userId, 
          email, 
          profile_completed: false, 
          profile_prior_knowledge: {},
          profile_interest_subtopics: [],
          settings_mode: 'support'
        }]);
      if (insertError) throw insertError;
    }
  }

  // Update session score
  static async updateSessionScore(sessionId: number, scoreTotal: number): Promise<void> {
    const { error } = await supabase
      .from('sessions')
      .update({ 
        score_total: scoreTotal,
        ended_at: new Date().toISOString()
      })
      .eq('id', sessionId)

    if (error) throw error
  }


  // Get sessions for a user
  static async getSessionsByUser(userId: string): Promise<Session[]> {
    const { data, error } = await supabase
      .from('sessions')
      .select(`
        *,
        subtopics:subtopic_id (
          key,
          name
        )
      `)
      .eq('user_id', userId)
      .order('started_at', { ascending: false })

    if (error) throw error
    return data || []
  }

  // Get session with responses and events
  static async getSessionWithDetails(sessionId: string | number): Promise<{
    session: Session
    responses: Response[]
    events: Event[]
    subtopic: Subtopic
  } | null> {
    // Get session
    const { data: session, error: sessionError } = await supabase
      .from('sessions')
      .select(`
        *,
        subtopics:subtopic_id (
          key,
          name,
          description
        )
      `)
      .eq('id', Number(sessionId))
      .single()

    if (sessionError) throw sessionError
    if (!session) return null

    // Get responses
    const { data: responses, error: responsesError } = await supabase
      .from('responses')
      .select(`
        *,
        questions:question_id (
          prompt,
          difficulty,
          qtype
        )
      `)
      .eq('session_id', Number(sessionId))
      .order('q_index', { ascending: true })

    if (responsesError) throw responsesError

    // Get events
    const { data: events, error: eventsError } = await supabase
      .from('events')
      .select('*')
      .eq('session_id', Number(sessionId))
      .order('ts_ms', { ascending: true })

    if (eventsError) throw eventsError

    return {
      session,
      responses: responses || [],
      events: events || [],
      subtopic: session.subtopics
    }
  }
  static async createUser(userData: {
    id: string
    email: string
  }): Promise<User> {
    const adminClient: any = (supabaseAdmin as unknown as object) ?? supabase;
    const { data, error } = await adminClient
      .from('users')
      .insert([{
        id: userData.id,
        email: userData.email,
        profile_completed: false,
        profile_prior_knowledge: {},
        profile_experience_taken_course: null,
        profile_experience_hands_on: null,
        profile_interest_subtopics: [],
        settings_mode: 'support'
      }])
      .select()
      .single()

    if (error) throw error
    return data
  }

  static async getUser(userId: string): Promise<User | null> {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single()

    if (error && error.code !== 'PGRST116') throw error
    return data
  }

  static async updateUserProfile(userId: string, profileData: {
    profile_prior_knowledge?: Record<string, string>
    profile_experience_taken_course?: 'yes' | 'no' | 'not_sure'
    profile_experience_hands_on?: 'none' | 'some_exercises' | 'small_project' | 'large_project'
    profile_interest_subtopics?: string[]
  }): Promise<User> {
    const { data, error } = await supabase
      .from('users')
      .update({
        ...profileData,
        profile_completed: true,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)
      .select()
      .single()

    if (error) throw error
    return data
  }

  static async updateUserSettings(userId: string, settings: {
    settings_mode: 'support' | 'no_support'
  }): Promise<User> {
    const { data, error } = await supabase
      .from('users')
      .update({
        ...settings,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)
      .select()
      .single()

    if (error) throw error
    return data
  }

  // Subtopic operations
  static async getSubtopics(): Promise<Subtopic[]> {
    const { data, error } = await supabase
      .from('subtopics')
      .select('*')
      .order('name')

    if (error) throw error
    return data
  }

  static async getSubtopic(subtopicKey: string): Promise<Subtopic | null> {
    const { data, error } = await supabase
      .from('subtopics')
      .select('*')
      .eq('key', subtopicKey)
      .single()

    if (error && error.code !== 'PGRST116') throw error
    return data
  }

  // Question operations
  static async getQuestionsForSession(subtopicId: string): Promise<Question[]> {
    // subtopicId can be string or number; cast for query layer
    // Get 1 Easy, 2 Medium, 2 Hard questions
    const { data: easyQuestions, error: easyError } = await supabase
      .from('questions')
      .select('*')
      .eq('subtopic_id', subtopicId as any)
      .eq('difficulty', 'E')
      .eq('enabled', true)
      .limit(1)

    if (easyError) throw easyError

    const { data: mediumQuestions, error: mediumError } = await supabase
      .from('questions')
      .select('*')
      .eq('subtopic_id', subtopicId as any)
      .eq('difficulty', 'M')
      .eq('enabled', true)
      .limit(2)

    if (mediumError) throw mediumError

    const { data: hardQuestions, error: hardError } = await supabase
      .from('questions')
      .select('*')
      .eq('subtopic_id', subtopicId as any)
      .eq('difficulty', 'H')
      .eq('enabled', true)
      .limit(2)

    if (hardError) throw hardError

    // Combine and shuffle within difficulty groups
    const questions = [
      ...(easyQuestions || []),
      ...(mediumQuestions || []),
      ...(hardQuestions || [])
    ]

    // Shuffle within each difficulty group
    const shuffled = [
      ...this.shuffleArray(easyQuestions || []),
      ...this.shuffleArray(mediumQuestions || []),
      ...this.shuffleArray(hardQuestions || [])
    ]

    return shuffled
  }

  // Session operations
  static async createSession(sessionData: {
    user_id: string
    subtopic_id: number
    mode: 'support' | 'no_support'
  }): Promise<Session> {
    const { data, error } = await supabase
      .from('sessions')
      .insert([sessionData])
      .select()
      .single()

    if (error) throw error
    return data
  }

  static async getSession(sessionId: string): Promise<Session | null> {
    const { data, error } = await supabase
      .from('sessions')
      .select('*')
      .eq('id', sessionId)
      .single()

    if (error && error.code !== 'PGRST116') throw error
    return data
  }

  static async updateSession(sessionId: string, updates: {
    ended_at?: string
    score_total?: number
    rmssd_baseline?: number
    rmssd_confidence?: 'ok' | 'low'
    baseline_beat_count?: number
    current_question?: number
  }): Promise<Session> {
    const { data, error } = await supabase
      .from('sessions')
      .update(updates)
      .eq('id', sessionId)
      .select()
      .single()

    if (error) throw error
    return data
  }

  static async getCurrentQuestion(sessionId: string): Promise<number> {
    const { data, error} = await supabase
      .from('sessions')
      .select('current_question')
      .eq('id', sessionId)
      .single()

    if (error) throw error
    return data.current_question ?? 0
  }

  static async getUserSessions(userId: string): Promise<Session[]> {
    const { data, error } = await supabase
      .from('sessions')
      .select(`
        *,
        subtopics (
          key,
          name
        )
      `)
      .eq('user_id', userId)
      .order('started_at', { ascending: false })

    if (error) throw error
    return data
  }

  // Response operations
  static async createResponse(responseData: {
    session_id: string
    question_id: string
    q_index: number
    user_answer?: any
    correct?: boolean
    time_ms?: number
    hints_used?: number
    extra_time_used?: boolean
    metrics?: any
  }): Promise<Response> {
    const { data, error } = await supabase
      .from('responses')
      .insert([responseData])
      .select()
      .single()

    if (error) throw error
    return data
  }

  static async getSessionResponses(sessionId: string): Promise<Response[]> {
    const { data, error } = await supabase
      .from('responses')
      .select(`
        *,
        questions (
          prompt,
          difficulty,
          qtype
        )
      `)
      .eq('session_id', Number(sessionId))
      .order('q_index')

    if (error) throw error
    return data
  }

  // Event operations
  static async createEvent(eventData: {
    session_id: string
    ts_ms: number
    etype: string
    payload?: any
  }): Promise<Event> {
    const { data, error } = await supabase
      .from('events')
      .insert([eventData])
      .select()
      .single()

    if (error) throw error
    return data
  }

  static async getSessionEvents(sessionId: string): Promise<Event[]> {
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .eq('session_id', Number(sessionId))
      .order('ts_ms')

    if (error) throw error
    return data
  }

  // HR Beat operations
  static async createHRBeat(beatData: {
    session_id: string
    ts_ms: number
    ibi_ms?: number
    bpm?: number
    q_label?: string
  }): Promise<HRBeat> {
    // Use admin client for server-side operations (bypasses RLS)
    const client = supabaseAdmin ?? supabase

    console.log(`[DB] Inserting beat: session=${beatData.session_id}, ts=${beatData.ts_ms}ms, bpm=${beatData.bpm}, q_label=${beatData.q_label || 'q0'}`);

    const { data, error } = await client
      .from('hr_beats')
      .insert([beatData])
      .select()
      .single()

    if (error) {
      console.error(`[DB] Insert error:`, error);
      throw error;
    }

    console.log(`[DB] Insert returned ID: ${data.id}, q_label=${data.q_label}`);
    return data
  }

  static async getSessionHRBeats(sessionId: string, q_label?: string): Promise<HRBeat[]> {
    let query = supabase
      .from('hr_beats')
      .select('*')
      .eq('session_id', Number(sessionId))

    if (q_label) {
      query = query.eq('q_label', q_label)
    }

    const { data, error } = await query.order('ts_ms')

    if (error) throw error
    return data
  }

  static async deleteCalibrationBeats(sessionId: string): Promise<void> {
    const client = supabaseAdmin ?? supabase
    const { error } = await client
      .from('hr_beats')
      .delete()
      .eq('session_id', Number(sessionId))
      .eq('q_label', 'q0')

    if (error) throw error
    console.log(`🗑️ [DB] Deleted calibration beats (q0) for session ${sessionId}`)
  }

  static async getQuestionBeats(sessionId: string, q_label: string): Promise<HRBeat[]> {
    const { data, error} = await supabase
      .from('hr_beats')
      .select('*')
      .eq('session_id', Number(sessionId))
      .eq('q_label', q_label)
      .order('ts_ms')

    if (error) throw error
    return data
  }

  /**
   * Get the last beat for a specific q_label (used for boundary calculation)
   * Returns null if no beats found
   */
  static async getLastBeatByLabel(sessionId: string, q_label: string): Promise<HRBeat | null> {
    const { data, error } = await supabase
      .from('hr_beats')
      .select('*')
      .eq('session_id', Number(sessionId))
      .eq('q_label', q_label)
      .order('ts_ms', { ascending: false })
      .limit(1)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null // No rows found
      throw error
    }

    return data
  }

  static async getLastBeatForSession(sessionId: string): Promise<HRBeat | null> {
    const { data, error } = await supabase
      .from('hr_beats')
      .select('*')
      .eq('session_id', Number(sessionId))
      .order('ts_ms', { ascending: false })
      .limit(1)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null // No rows found
      throw error
    }

    return data
  }

  // NASA-TLX operations
  static async createNASATLXBlock(blockData: {
    session_id: string
    block: 'easy' | 'medium' | 'hard'
    mental?: number
    physical?: number
    temporal?: number
    performance?: number
    effort?: number
    frustration?: number
  }): Promise<NASATLXBlock> {
    const { data, error } = await supabase
      .from('nasa_tlx_blocks')
      .insert([blockData])
      .select()
      .single()

    if (error) throw error
    return data
  }

  static async getSessionNASATLXBlocks(sessionId: string): Promise<NASATLXBlock[]> {
    const { data, error } = await supabase
      .from('nasa_tlx_blocks')
      .select('*')
      .eq('session_id', Number(sessionId))
      .order('created_at')

    if (error) throw error
    return data
  }

  // HRV-related methods
  static async updateResponseHRVMetrics(
    sessionId: number, 
    qIndex: number, 
    hrvMetrics: any
  ): Promise<void> {
    // Get the existing response
    const { data: response, error: fetchError } = await supabase
      .from('responses')
      .select('metrics')
      .eq('session_id', sessionId)
      .eq('q_index', qIndex)
      .single()

    if (fetchError) throw fetchError

    // Merge HRV metrics with existing metrics
    const updatedMetrics = {
      ...response.metrics,
      ...hrvMetrics
    }

    // Update the response
    const { error } = await supabase
      .from('responses')
      .update({ metrics: updatedMetrics })
      .eq('session_id', sessionId)
      .eq('q_index', qIndex)

    if (error) throw error
  }

  static async markQuestionBoundary(
    sessionId: number,
    qIndex: number,
    timestamp: number,
    eventType: 'question_start' | 'question_end'
  ): Promise<void> {
    const { error } = await supabase
      .from('events')
      .insert({
        session_id: sessionId,
        ts_ms: timestamp,
        etype: eventType,
        payload: { q_index: qIndex }
      })

    if (error) throw error
  }

  static async getQuestionBoundaries(sessionId: number): Promise<Array<{
    q_index: number;
    event_type: string;
    timestamp: number;
  }>> {
    const { data, error } = await supabase
      .from('events')
      .select('ts_ms, etype, payload')
      .eq('session_id', sessionId)
      .in('etype', ['question_start', 'question_end'])
      .order('ts_ms')

    if (error) throw error

    return data.map(event => ({
      q_index: event.payload.q_index,
      event_type: event.etype,
      timestamp: event.ts_ms
    }))
  }

  // Utility functions
  private static shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array]
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
    }
    return shuffled
  }
}

