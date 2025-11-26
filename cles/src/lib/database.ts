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
  profile_math_grade?: 'A' | 'B' | 'C' | 'D' | 'F' | 'not_taken' | null
  profile_programming_grade?: 'A' | 'B' | 'C' | 'D' | 'F' | 'not_taken' | null
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
  qtype: 'mcq' | 'short' | 'code' | 'image_mcq' | 'image_short'
  prompt: string
  options: any[] | null
  answer_key: any
  hints: string[]
  explanation: string | null
  example: string | null
  image_url: string | null
  example_image_url: string | null
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
  attention_rate?: number
  rmssd_baseline?: number
  rmssd_confidence?: 'ok' | 'low'
  baseline_beat_count?: number
  environment_noise?: number
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
  attention_rate?: number
  metrics: {
    attention?: 'high' | 'low'
    hrv?: 'high' | 'low'
    overall?: number
    intrinsic?: number
    extraneous?: number
    germane?: number
    rmssd_q?: number
    rmssd_base?: number
    hrv_confidence?: 'ok' | 'low'
    hintPenalty?: number
    examplePenalty?: number
    extraTimePenalty?: number
    totalPenalty?: number
    pointsAwarded?: number
    skipped?: boolean
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

export interface ReportInsights {
  id: number
  session_id: number
  insights_text: string
  created_at: string
}

// SWOT Analysis (comprehensive analysis across all 3 subtopics)
export interface SwotAnalysis {
  id: number
  user_id: string
  swot_strengths: string
  swot_weaknesses: string
  swot_opportunities: string
  swot_threats: string
  radar_explanation: string
  radar_data: {
    array: {
      mental: number
      physical: number
      temporal: number
      performance: number
      effort: number
      frustration: number
      cognitiveLoad: number
    }
    linkedList: {
      mental: number
      physical: number
      temporal: number
      performance: number
      effort: number
      frustration: number
      cognitiveLoad: number
    }
    stack: {
      mental: number
      physical: number
      temporal: number
      performance: number
      effort: number
      frustration: number
      cognitiveLoad: number
    }
  }
  total_sessions_analyzed: number
  avg_score_array: number | null
  avg_score_linked_list: number | null
  avg_score_stack: number | null
  generated_at: string
  created_at: string
}

// NASA-TLX System (per-question calculations)
export interface NasaTlxSystem {
  id: number
  session_id: number
  question_id: number
  q_index: number
  mental_demand: number
  physical_demand: number
  temporal_demand: number
  performance: number
  effort: number
  frustration: number
  cognitive_load: number
  created_at: string
}

// NASA-TLX User (subjective survey)
export interface NasaTlxUser {
  id: number
  session_id: number
  mental_demand: number
  physical_demand: number
  temporal_demand: number
  performance: number
  effort: number
  frustration: number
  cognitive_load: number
  created_at: string
}

// Cognitive Load Summary (weighted aggregates)
export interface CognitiveLoadSummary {
  id: number
  session_id: number
  sys_mental_demand: number
  sys_physical_demand: number
  sys_temporal_demand: number
  sys_performance: number
  sys_effort: number
  sys_frustration: number
  sys_cognitive_load: number
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

  // Get session with responses
  static async getSessionWithDetails(sessionId: string | number): Promise<{
    session: Session
    responses: Response[]
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

    return {
      session,
      responses: responses || [],
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
    profile_math_grade?: 'A' | 'B' | 'C' | 'D' | 'F' | 'not_taken'
    profile_programming_grade?: 'A' | 'B' | 'C' | 'D' | 'F' | 'not_taken'
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

  static async getSubtopicById(subtopicId: number | string): Promise<Subtopic | null> {
    const { data, error } = await supabase
      .from('subtopics')
      .select('*')
      .eq('id', Number(subtopicId))
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
    environment_noise?: number
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

  static async getResponseBySessionAndIndex(
    sessionId: number,
    qIndex: number
  ): Promise<Response | null> {
    const { data, error } = await supabase
      .from('responses')
      .select('*')
      .eq('session_id', sessionId)
      .eq('q_index', qIndex)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null // No rows found
      throw error
    }

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

  // ============================================================================
  // NASA-TLX Methods
  // ============================================================================

  // NASA-TLX System (per-question calculations)
  static async createNasaTlxSystem(data: {
    session_id: number
    question_id: number
    q_index: number
    mental_demand: number
    physical_demand: number
    temporal_demand: number
    performance: number
    effort: number
    frustration: number
    cognitive_load: number
  }): Promise<NasaTlxSystem> {
    const { data: result, error } = await supabase
      .from('nasa_tlx_system')
      .insert([data])
      .select()
      .single()

    if (error) throw error
    return result
  }

  static async getSessionNasaTlxSystem(sessionId: string): Promise<NasaTlxSystem[]> {
    // Use admin client to bypass RLS for server-side operations
    if (!supabaseAdmin) {
      // Fallback to regular client if admin not configured
      
      const { data, error } = await supabase
        .from('nasa_tlx_system')
        .select('*')
        .eq('session_id', Number(sessionId))
        .order('q_index')

      if (error) throw error
      return data
    }

    // Use admin client for server-side API routes
    const { data, error } = await supabaseAdmin
      .from('nasa_tlx_system')
      .select('*')
      .eq('session_id', Number(sessionId))
      .order('q_index')

    if (error) throw error
    return data
  }

  static async getSessionNasaTlxSystemWithQuestions(
    sessionId: string
  ): Promise<Array<NasaTlxSystem & { question: { difficulty: 'E' | 'M' | 'H' } }>> {
    const { data, error } = await supabase
      .from('nasa_tlx_system')
      .select(`
        *,
        questions:question_id (
          difficulty
        )
      `)
      .eq('session_id', Number(sessionId))
      .order('q_index')

    if (error) throw error

    // Transform data: rename 'questions' to 'question'
    const transformedData = data?.map(record => {
      const { questions, ...rest } = record as any
      return {
        ...rest,
        question: questions // Rename questions → question
      }
    }) || []

    return transformedData as Array<NasaTlxSystem & { question: { difficulty: 'E' | 'M' | 'H' } }>
  }

  // NASA-TLX User (subjective survey)
  static async createNasaTlxUser(data: {
    session_id: number
    mental_demand: number
    physical_demand: number
    temporal_demand: number
    performance: number
    effort: number
    frustration: number
    cognitive_load: number
  }): Promise<NasaTlxUser> {
    const { data: result, error } = await supabase
      .from('nasa_tlx_user')
      .insert([data])
      .select()
      .single()

    if (error) throw error
    return result
  }

  static async getSessionNasaTlxUser(sessionId: string): Promise<NasaTlxUser | null> {
    // Use admin client to bypass RLS for server-side operations
    if (!supabaseAdmin) {
      // Fallback to regular client if admin not configured
      
      const { data, error } = await supabase
        .from('nasa_tlx_user')
        .select('*')
        .eq('session_id', Number(sessionId))
        .single()

      if (error) {
        if (error.code === 'PGRST116') return null // No rows found
        throw error
      }
      return data
    }

    // Use admin client for server-side API routes
    const { data, error } = await supabaseAdmin
      .from('nasa_tlx_user')
      .select('*')
      .eq('session_id', Number(sessionId))
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null // No rows found
      throw error
    }
    return data
  }

  // Cognitive Load Summary (weighted aggregates)
  static async createCognitiveLoadSummary(data: {
    session_id: number
    sys_mental_demand: number
    sys_physical_demand: number
    sys_temporal_demand: number
    sys_performance: number
    sys_effort: number
    sys_frustration: number
    sys_cognitive_load: number
  }): Promise<CognitiveLoadSummary> {
    const { data: result, error } = await supabase
      .from('cognitive_load_summary')
      .insert([data])
      .select()
      .single()

    if (error) throw error
    return result
  }

  static async getSessionCognitiveLoadSummary(sessionId: string): Promise<CognitiveLoadSummary | null> {
    // Use admin client to bypass RLS for server-side operations
    if (!supabaseAdmin) {
      // Fallback to regular client if admin not configured
      
      const { data, error } = await supabase
        .from('cognitive_load_summary')
        .select('*')
        .eq('session_id', Number(sessionId))
        .single()

      if (error) {
        if (error.code === 'PGRST116') return null // No rows found
        throw error
      }
      return data
    }

    // Use admin client for server-side API routes
    const { data, error } = await supabaseAdmin
      .from('cognitive_load_summary')
      .select('*')
      .eq('session_id', Number(sessionId))
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null // No rows found
      throw error
    }
    return data
  }

  /**
   * Get cached AI-generated insights for a session report
   * Returns null if no insights exist yet
   * Uses admin client to ensure server-side API routes can access the data
   */
  static async getReportInsights(sessionId: string | number): Promise<ReportInsights | null> {
    // Use admin client to bypass RLS for server-side operations
    if (!supabaseAdmin) {
      // Fallback to regular client if admin not configured
      // (for client-side usage where auth.uid() exists)
      console.warn('Supabase admin client not configured. Falling back to regular client.')
      const { data, error } = await supabase
        .from('report_insights')
        .select('*')
        .eq('session_id', sessionId)
        .single()

      if (error && error.code !== 'PGRST116') { // PGRST116 = not found
        console.error('Error fetching report insights:', error)
      }

      return data
    }

    // Use admin client for server-side API routes
    const { data, error } = await supabaseAdmin
      .from('report_insights')
      .select('*')
      .eq('session_id', sessionId)
      .single()

    if (error && error.code !== 'PGRST116') { // PGRST116 = not found
      console.error('Error fetching report insights:', error)
    }

    return data
  }

  /**
   * Save newly generated AI insights for a session report
   * This is called after Gemini generates the insights
   * Uses admin client to bypass RLS since this is a server-side operation
   */
  static async saveReportInsights(
    sessionId: string | number,
    insightsText: string
  ): Promise<void> {
    if (!supabaseAdmin) {
      throw new Error('Supabase admin client not configured. Please set SUPABASE_SERVICE_ROLE_KEY in environment variables.')
    }

    const { error } = await supabaseAdmin
      .from('report_insights')
      .insert({
        session_id: sessionId,
        insights_text: insightsText
      })

    if (error) {
      console.error('Error saving report insights:', error)
      throw error
    }
  }

  // ============================================================================
  // SWOT Analysis Methods
  // ============================================================================

  /**
   * Get average score for a specific subtopic
   * Queries by subtopic_id after looking up subtopic by key
   * Returns 0 if no completed sessions found
   */
  static async getSubtopicAverageScore(
    userId: string,
    subtopicKey: string
  ): Promise<number> {
    if (!supabaseAdmin) {
      console.warn('Supabase admin client not configured. Falling back to regular client.')
    }

    const client = supabaseAdmin ?? supabase

    // Step 1: Get subtopic_id from key
    const { data: subtopic, error: subtopicError } = await client
      .from('subtopics')
      .select('id')
      .eq('key', subtopicKey)
      .single()

    if (subtopicError || !subtopic) {
      console.error(`Subtopic '${subtopicKey}' not found`)
      return 0
    }

    // Step 2: Query sessions by subtopic_id
    const { data, error } = await client
      .from('sessions')
      .select('score_total')
      .eq('user_id', userId)
      .eq('subtopic_id', subtopic.id)
      .not('score_total', 'is', null)
      .not('ended_at', 'is', null)

    if (error || !data || data.length === 0) {
      return 0
    }

    const sum = data.reduce((acc, session) => acc + (session.score_total || 0), 0)
    const average = sum / data.length

    return Math.round(average * 100) / 100
  }

  /**
   * Check if user has completed at least one session for all 3 subtopics
   * Returns completion status, missing topics, and session counts
   */
  static async hasCompletedAllSubtopics(userId: string): Promise<{
    completed: boolean
    missing: string[]
    counts: { array: number; linkedList: number; stack: number }
  }> {
    const requiredSubtopics = ['array', 'linked_list', 'stack']
    const missing: string[] = []
    const counts = { array: 0, linkedList: 0, stack: 0 }

    const client = supabaseAdmin ?? supabase

    for (const key of requiredSubtopics) {
      // Get subtopic_id
      const { data: subtopic } = await client
        .from('subtopics')
        .select('id')
        .eq('key', key)
        .single()

      if (subtopic) {
        // Count completed sessions
        const { count } = await client
          .from('sessions')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', userId)
          .eq('subtopic_id', subtopic.id)
          .not('ended_at', 'is', null)

        const sessionCount = count || 0

        // Update counts
        if (key === 'array') counts.array = sessionCount
        if (key === 'linked_list') counts.linkedList = sessionCount
        if (key === 'stack') counts.stack = sessionCount

        // Check if missing
        if (sessionCount === 0) {
          missing.push(key)
        }
      } else {
        missing.push(key)
      }
    }

    return {
      completed: missing.length === 0,
      missing,
      counts
    }
  }

  /**
   * Get existing SWOT analysis for user
   * Uses admin client to bypass RLS for server-side operations
   */
  static async getSWOTAnalysis(userId: string): Promise<SwotAnalysis | null> {
    if (!supabaseAdmin) {
      const { data, error } = await supabase
        .from('swot_analysis')
        .select('*')
        .eq('user_id', userId)
        .single()

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching SWOT:', error)
      }
      return data
    }

    const { data, error } = await supabaseAdmin
      .from('swot_analysis')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching SWOT:', error)
    }
    return data
  }

  /**
   * Upsert SWOT analysis (INSERT if new, UPDATE if exists)
   * Uses admin client to bypass RLS
   */
  static async upsertSWOTAnalysis(data: {
    user_id: string
    swot_strengths: string
    swot_weaknesses: string
    swot_opportunities: string
    swot_threats: string
    radar_explanation: string
    radar_data: any
    total_sessions_analyzed: number
    avg_score_array: number
    avg_score_linked_list: number
    avg_score_stack: number
  }): Promise<void> {
    if (!supabaseAdmin) {
      throw new Error('Supabase admin client not configured.')
    }

    // Check if exists
    const existing = await this.getSWOTAnalysis(data.user_id)

    if (existing) {
      // UPDATE
      const { error } = await supabaseAdmin
        .from('swot_analysis')
        .update({
          ...data,
          generated_at: new Date().toISOString()
        })
        .eq('user_id', data.user_id)

      if (error) throw error
    } else {
      // INSERT
      const { error } = await supabaseAdmin
        .from('swot_analysis')
        .insert(data)

      if (error) throw error
    }
  }

  /**
   * Get aggregated NASA-TLX data for all 3 subtopics
   * Uses cognitive_load_summary table for sys_* dimensions
   * Returns averages for radar chart visualization
   */
  static async getAggregatedNasaTlxData(userId: string): Promise<{
    array: { mental: number; physical: number; temporal: number; performance: number; effort: number; frustration: number; cognitiveLoad: number }
    linkedList: { mental: number; physical: number; temporal: number; performance: number; effort: number; frustration: number; cognitiveLoad: number }
    stack: { mental: number; physical: number; temporal: number; performance: number; effort: number; frustration: number; cognitiveLoad: number }
  }> {
    const subtopicKeys = ['array', 'linked_list', 'stack']
    const result: any = {}

    const client = supabaseAdmin ?? supabase

    for (const key of subtopicKeys) {
      // Get subtopic_id
      const { data: subtopic } = await client
        .from('subtopics')
        .select('id')
        .eq('key', key)
        .single()

      if (!subtopic) continue

      // Get all completed session IDs for this subtopic
      const { data: sessions } = await client
        .from('sessions')
        .select('id')
        .eq('user_id', userId)
        .eq('subtopic_id', subtopic.id)
        .not('ended_at', 'is', null)

      if (!sessions || sessions.length === 0) {
        result[key] = { mental: 0, physical: 0, temporal: 0, performance: 0, effort: 0, frustration: 0, cognitiveLoad: 0 }
        continue
      }

      const sessionIds = sessions.map(s => s.id)

      // Get cognitive_load_summary for all these sessions
      const { data: summaries } = await client
        .from('cognitive_load_summary')
        .select('*')
        .in('session_id', sessionIds)

      if (!summaries || summaries.length === 0) {
        result[key] = { mental: 0, physical: 0, temporal: 0, performance: 0, effort: 0, frustration: 0, cognitiveLoad: 0 }
        continue
      }

      // Calculate averages
      const avgMental = summaries.reduce((sum, s) => sum + s.sys_mental_demand, 0) / summaries.length
      const avgPhysical = summaries.reduce((sum, s) => sum + s.sys_physical_demand, 0) / summaries.length
      const avgTemporal = summaries.reduce((sum, s) => sum + s.sys_temporal_demand, 0) / summaries.length
      const avgPerformance = summaries.reduce((sum, s) => sum + s.sys_performance, 0) / summaries.length
      const avgEffort = summaries.reduce((sum, s) => sum + s.sys_effort, 0) / summaries.length
      const avgFrustration = summaries.reduce((sum, s) => sum + s.sys_frustration, 0) / summaries.length
      const avgCognitiveLoad = summaries.reduce((sum, s) => sum + s.sys_cognitive_load, 0) / summaries.length

      result[key] = {
        mental: Math.round(avgMental * 100) / 100,
        physical: Math.round(avgPhysical * 100) / 100,
        temporal: Math.round(avgTemporal * 100) / 100,
        performance: Math.round(avgPerformance * 100) / 100,
        effort: Math.round(avgEffort * 100) / 100,
        frustration: Math.round(avgFrustration * 100) / 100,
        cognitiveLoad: Math.round(avgCognitiveLoad * 100) / 100
      }
    }

    return {
      array: result.array || { mental: 0, physical: 0, temporal: 0, performance: 0, effort: 0, frustration: 0, cognitiveLoad: 0 },
      linkedList: result.linked_list || { mental: 0, physical: 0, temporal: 0, performance: 0, effort: 0, frustration: 0, cognitiveLoad: 0 },
      stack: result.stack || { mental: 0, physical: 0, temporal: 0, performance: 0, effort: 0, frustration: 0, cognitiveLoad: 0 }
    }
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

