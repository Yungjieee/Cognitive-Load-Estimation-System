-- CLES Phase 2 Database Schema
-- PostgreSQL with Supabase

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (extends Supabase auth.users)
CREATE TABLE public.users (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Profile fields (all required, structured enums only)
  profile_completed BOOLEAN DEFAULT FALSE,
  profile_prior_knowledge JSONB DEFAULT '{}', -- { subtopic_key: level_enum }
  profile_experience_taken_course TEXT CHECK (profile_experience_taken_course IN ('yes', 'no', 'not_sure')),
  profile_experience_hands_on TEXT CHECK (profile_experience_hands_on IN ('none', 'some_exercises', 'small_project', 'large_project')),
  profile_interest_subtopics TEXT[] DEFAULT '{}',
  profile_math_grade VARCHAR(20), -- A, B, C, D, F, or not_taken
  profile_programming_grade VARCHAR(20), -- A, B, C, D, F, or not_taken

  -- Settings
  settings_mode TEXT DEFAULT 'support' CHECK (settings_mode IN ('support', 'no_support'))
);

-- Subtopics table
CREATE TABLE public.subtopics (
  id BIGSERIAL PRIMARY KEY,
  key TEXT UNIQUE NOT NULL, -- 'array', 'linked_list', 'stack', 'queue', 'tree', 'sorting'
  name TEXT NOT NULL,
  description TEXT,
  enabled BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Questions table
CREATE TABLE public.questions (
  id BIGSERIAL PRIMARY KEY,
  subtopic_id BIGINT REFERENCES public.subtopics(id) ON DELETE CASCADE,
  difficulty TEXT NOT NULL CHECK (difficulty IN ('E', 'M', 'H')), -- Easy, Medium, Hard
  qtype TEXT NOT NULL CHECK (qtype IN ('mcq', 'short', 'code', 'image_mcq', 'image_short')),
  prompt TEXT NOT NULL,
  options JSONB, -- For MCQ questions
  answer_key JSONB NOT NULL,
  hints TEXT[] DEFAULT '{}',
  explanation TEXT,
  example TEXT, -- Example text (shown during question)
  image_url TEXT, -- URL to image in Supabase Storage (for question images)
  example_image_url TEXT, -- URL to image in Supabase Storage (for example images)
  enabled BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Sessions table
CREATE TABLE public.sessions (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  subtopic_id BIGINT REFERENCES public.subtopics(id) ON DELETE CASCADE,
  mode TEXT NOT NULL CHECK (mode IN ('support', 'no_support')),
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ended_at TIMESTAMP WITH TIME ZONE,
  score_total DECIMAL(5,2) DEFAULT 0, -- Max 10.00 points
  attention_rate DECIMAL(5,2), -- Overall session attention rate: (total_focused / total_captures) * 100

  -- HRV baseline fields (for audit and comparison)
  rmssd_baseline DECIMAL(8,2), -- RMSSD baseline from calibration (milliseconds)
  rmssd_confidence TEXT CHECK (rmssd_confidence IN ('ok', 'low')), -- Confidence in baseline quality
  baseline_beat_count INTEGER, -- Number of beats used for baseline calculation

  -- NASA-TLX Physical Demand input
  environment_noise DECIMAL(5,2), -- Environmental noise/distraction rating (0-21 scale) collected after calibration

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Responses table (per question in session)
CREATE TABLE public.responses (
  id BIGSERIAL PRIMARY KEY,
  session_id BIGINT REFERENCES public.sessions(id) ON DELETE CASCADE,
  question_id BIGINT REFERENCES public.questions(id) ON DELETE CASCADE,
  q_index INTEGER NOT NULL CHECK (q_index >= 1 AND q_index <= 5), -- 1-5 for 5-question sessions
  user_answer JSONB,
  correct BOOLEAN,
  time_ms INTEGER,
  hints_used INTEGER DEFAULT 0,
  extra_time_used BOOLEAN DEFAULT FALSE,
  attention_rate DECIMAL(5,2), -- Attention rate for this question: (focused_count / total_count) * 100
  metrics JSONB DEFAULT '{}', -- { attention: 'high'|'low', hrv: 'high'|'low', overall, intrinsic, extraneous, germane }
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Events table (session events timeline)
CREATE TABLE public.events (
  id BIGSERIAL PRIMARY KEY,
  session_id BIGINT REFERENCES public.sessions(id) ON DELETE CASCADE,
  ts_ms BIGINT NOT NULL, -- Timestamp in milliseconds from session start
  etype TEXT NOT NULL, -- 'hint_open', 'rest_suggest', 'time_warning', 'device_alert', etc.
  payload JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Heart rate beats table (raw HR data)
CREATE TABLE public.hr_beats (
  id BIGSERIAL PRIMARY KEY,
  session_id BIGINT REFERENCES public.sessions(id) ON DELETE CASCADE,
  ts_ms BIGINT NOT NULL, -- Timestamp in milliseconds from session start
  ibi_ms INTEGER, -- Inter-beat interval in milliseconds
  bpm INTEGER, -- Beats per minute
  q_label TEXT DEFAULT 'q0', -- Question label: 'q0' for calibration, 'q1'-'q5' for questions
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Attention events table (captures every 5 seconds during session)
CREATE TABLE public.attention_events (
  id BIGSERIAL PRIMARY KEY,
  session_id BIGINT REFERENCES public.sessions(id) ON DELETE CASCADE,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  attention_status TEXT NOT NULL CHECK (attention_status IN ('FOCUSED', 'DISTRACTED')),
  q_label TEXT NOT NULL, -- 'q1', 'q2', 'q3', 'q4', 'q5'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- NASA-TLX System (per-question calculations)
CREATE TABLE public.nasa_tlx_system (
  id BIGSERIAL PRIMARY KEY,
  session_id BIGINT REFERENCES public.sessions(id) ON DELETE CASCADE,
  question_id BIGINT REFERENCES public.questions(id) ON DELETE CASCADE,
  q_index INTEGER NOT NULL CHECK (q_index >= 1 AND q_index <= 5),
  mental_demand DECIMAL(5,2) NOT NULL CHECK (mental_demand >= 0 AND mental_demand <= 21),
  physical_demand DECIMAL(5,2) NOT NULL CHECK (physical_demand >= 0 AND physical_demand <= 21),
  temporal_demand DECIMAL(5,2) NOT NULL CHECK (temporal_demand >= 0 AND temporal_demand <= 21),
  performance DECIMAL(5,2) NOT NULL CHECK (performance >= 0 AND performance <= 21),
  effort DECIMAL(5,2) NOT NULL CHECK (effort >= 0 AND effort <= 21),
  frustration DECIMAL(5,2) NOT NULL CHECK (frustration >= 0 AND frustration <= 21),
  cognitive_load DECIMAL(5,2) NOT NULL CHECK (cognitive_load >= 0 AND cognitive_load <= 21),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(session_id, q_index)
);

-- NASA-TLX User (subjective survey)
CREATE TABLE public.nasa_tlx_user (
  id BIGSERIAL PRIMARY KEY,
  session_id BIGINT REFERENCES public.sessions(id) ON DELETE CASCADE UNIQUE,
  mental_demand DECIMAL(5,2) NOT NULL CHECK (mental_demand >= 0 AND mental_demand <= 21),
  physical_demand DECIMAL(5,2) NOT NULL CHECK (physical_demand >= 0 AND physical_demand <= 21),
  temporal_demand DECIMAL(5,2) NOT NULL CHECK (temporal_demand >= 0 AND temporal_demand <= 21),
  performance DECIMAL(5,2) NOT NULL CHECK (performance >= 0 AND performance <= 21),
  effort DECIMAL(5,2) NOT NULL CHECK (effort >= 0 AND effort <= 21),
  frustration DECIMAL(5,2) NOT NULL CHECK (frustration >= 0 AND frustration <= 21),
  cognitive_load DECIMAL(5,2) NOT NULL CHECK (cognitive_load >= 0 AND cognitive_load <= 21),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Cognitive Load Summary (weighted aggregates)
CREATE TABLE public.cognitive_load_summary (
  id BIGSERIAL PRIMARY KEY,
  session_id BIGINT REFERENCES public.sessions(id) ON DELETE CASCADE UNIQUE,
  sys_mental_demand DECIMAL(5,2) NOT NULL CHECK (sys_mental_demand >= 0 AND sys_mental_demand <= 21),
  sys_physical_demand DECIMAL(5,2) NOT NULL CHECK (sys_physical_demand >= 0 AND sys_physical_demand <= 21),
  sys_temporal_demand DECIMAL(5,2) NOT NULL CHECK (sys_temporal_demand >= 0 AND sys_temporal_demand <= 21),
  sys_performance DECIMAL(5,2) NOT NULL CHECK (sys_performance >= 0 AND sys_performance <= 21),
  sys_effort DECIMAL(5,2) NOT NULL CHECK (sys_effort >= 0 AND sys_effort <= 21),
  sys_frustration DECIMAL(5,2) NOT NULL CHECK (sys_frustration >= 0 AND sys_frustration <= 21),
  sys_cognitive_load DECIMAL(5,2) NOT NULL CHECK (sys_cognitive_load >= 0 AND sys_cognitive_load <= 21),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Report Insights (AI-generated insights from Gemini)
CREATE TABLE public.report_insights (
  id BIGSERIAL PRIMARY KEY,
  session_id BIGINT REFERENCES public.sessions(id) ON DELETE CASCADE UNIQUE,
  insights_text TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- SWOT Analysis (comprehensive analysis across all 3 subtopics)
CREATE TABLE public.swot_analysis (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE UNIQUE,

  -- SWOT content (AI-generated, stored as TEXT)
  swot_strengths TEXT NOT NULL,
  swot_weaknesses TEXT NOT NULL,
  swot_opportunities TEXT NOT NULL,
  swot_threats TEXT NOT NULL,

  -- Radar chart data (JSON format)
  radar_data JSONB NOT NULL,

  -- Stats snapshot at generation time
  total_sessions_analyzed INTEGER NOT NULL,
  avg_score_array NUMERIC(4,2),
  avg_score_linked_list NUMERIC(4,2),
  avg_score_stack NUMERIC(4,2),

  generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_users_email ON public.users(email);
CREATE INDEX idx_subtopics_key ON public.subtopics(key);
CREATE INDEX idx_subtopics_enabled ON public.subtopics(enabled);
CREATE INDEX idx_questions_subtopic_difficulty ON public.questions(subtopic_id, difficulty);
CREATE INDEX idx_questions_enabled ON public.questions(enabled);
CREATE INDEX idx_sessions_user_id ON public.sessions(user_id);
CREATE INDEX idx_sessions_subtopic_id ON public.sessions(subtopic_id);
CREATE INDEX idx_responses_session_id ON public.responses(session_id);
CREATE INDEX idx_responses_question_id ON public.responses(question_id);
CREATE INDEX idx_events_session_id ON public.events(session_id);
CREATE INDEX idx_hr_beats_session_id ON public.hr_beats(session_id);
CREATE INDEX idx_hr_beats_session_q_label ON public.hr_beats(session_id, q_label);
CREATE INDEX idx_attention_events_session_id ON public.attention_events(session_id);
CREATE INDEX idx_attention_events_session_q_label ON public.attention_events(session_id, q_label);
CREATE INDEX idx_attention_events_timestamp ON public.attention_events(timestamp);
CREATE INDEX idx_nasa_tlx_system_session ON public.nasa_tlx_system(session_id);
CREATE INDEX idx_nasa_tlx_system_question ON public.nasa_tlx_system(q_index);
CREATE INDEX idx_nasa_tlx_user_session ON public.nasa_tlx_user(session_id);
CREATE INDEX idx_cognitive_load_summary_session ON public.cognitive_load_summary(session_id);
CREATE INDEX idx_report_insights_session ON public.report_insights(session_id);
CREATE INDEX idx_swot_user ON public.swot_analysis(user_id);

-- Row Level Security (RLS) policies
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hr_beats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attention_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nasa_tlx_system ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nasa_tlx_user ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cognitive_load_summary ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.report_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.swot_analysis ENABLE ROW LEVEL SECURITY;

-- Users can only access their own data
CREATE POLICY "Users can view own profile" ON public.users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.users
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can view own sessions" ON public.sessions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own sessions" ON public.sessions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own sessions" ON public.sessions
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own responses" ON public.responses
  FOR SELECT USING (auth.uid() = (SELECT user_id FROM public.sessions WHERE id = session_id));

CREATE POLICY "Users can create own responses" ON public.responses
  FOR INSERT WITH CHECK (auth.uid() = (SELECT user_id FROM public.sessions WHERE id = session_id));

CREATE POLICY "Users can view own events" ON public.events
  FOR SELECT USING (auth.uid() = (SELECT user_id FROM public.sessions WHERE id = session_id));

CREATE POLICY "Users can create own events" ON public.events
  FOR INSERT WITH CHECK (auth.uid() = (SELECT user_id FROM public.sessions WHERE id = session_id));

CREATE POLICY "Users can view own hr_beats" ON public.hr_beats
  FOR SELECT USING (auth.uid() = (SELECT user_id FROM public.sessions WHERE id = session_id));

CREATE POLICY "Users can create own hr_beats" ON public.hr_beats
  FOR INSERT WITH CHECK (auth.uid() = (SELECT user_id FROM public.sessions WHERE id = session_id));

CREATE POLICY "Users can view own attention_events" ON public.attention_events
  FOR SELECT USING (auth.uid() = (SELECT user_id FROM public.sessions WHERE id = session_id));

CREATE POLICY "Users can create own attention_events" ON public.attention_events
  FOR INSERT WITH CHECK (auth.uid() = (SELECT user_id FROM public.sessions WHERE id = session_id));

CREATE POLICY "Users can view own nasa_tlx_system" ON public.nasa_tlx_system
  FOR SELECT USING (auth.uid() = (SELECT user_id FROM public.sessions WHERE id = session_id));

CREATE POLICY "Users can create own nasa_tlx_system" ON public.nasa_tlx_system
  FOR INSERT WITH CHECK (auth.uid() = (SELECT user_id FROM public.sessions WHERE id = session_id));

CREATE POLICY "Users can view own nasa_tlx_user" ON public.nasa_tlx_user
  FOR SELECT USING (auth.uid() = (SELECT user_id FROM public.sessions WHERE id = session_id));

CREATE POLICY "Users can create own nasa_tlx_user" ON public.nasa_tlx_user
  FOR INSERT WITH CHECK (auth.uid() = (SELECT user_id FROM public.sessions WHERE id = session_id));

CREATE POLICY "Users can view own cognitive_load_summary" ON public.cognitive_load_summary
  FOR SELECT USING (auth.uid() = (SELECT user_id FROM public.sessions WHERE id = session_id));

CREATE POLICY "Users can create own cognitive_load_summary" ON public.cognitive_load_summary
  FOR INSERT WITH CHECK (auth.uid() = (SELECT user_id FROM public.sessions WHERE id = session_id));

CREATE POLICY "Users can view own report_insights" ON public.report_insights
  FOR SELECT USING (auth.uid() = (SELECT user_id FROM public.sessions WHERE id = session_id));

CREATE POLICY "Users can create own report_insights" ON public.report_insights
  FOR INSERT WITH CHECK (auth.uid() = (SELECT user_id FROM public.sessions WHERE id = session_id));

CREATE POLICY "Users can view own SWOT analysis" ON public.swot_analysis
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own SWOT analysis" ON public.swot_analysis
  FOR UPDATE USING (auth.uid() = user_id);

-- Public read access for subtopics and questions
CREATE POLICY "Anyone can view subtopics" ON public.subtopics
  FOR SELECT USING (true);

CREATE POLICY "Anyone can view enabled questions" ON public.questions
  FOR SELECT USING (enabled = true);

-- Admin policies (for service role)
CREATE POLICY "Service role can manage all data" ON public.users
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role can manage all subtopics" ON public.subtopics
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role can manage all questions" ON public.questions
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role can manage all sessions" ON public.sessions
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role can manage all responses" ON public.responses
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role can manage all events" ON public.events
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role can manage all hr_beats" ON public.hr_beats
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role can manage all attention_events" ON public.attention_events
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role can manage all nasa_tlx_system" ON public.nasa_tlx_system
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role can manage all nasa_tlx_user" ON public.nasa_tlx_user
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role can manage all cognitive_load_summary" ON public.cognitive_load_summary
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role can manage all report_insights" ON public.report_insights
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role can manage all SWOT analysis" ON public.swot_analysis
  FOR ALL USING (auth.role() = 'service_role');

