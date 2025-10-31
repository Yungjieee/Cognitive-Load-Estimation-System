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
  qtype TEXT NOT NULL CHECK (qtype IN ('mcq', 'short', 'code')),
  prompt TEXT NOT NULL,
  options JSONB, -- For MCQ questions
  answer_key JSONB NOT NULL,
  hints TEXT[] DEFAULT '{}',
  explanation TEXT,
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
  
  -- HRV baseline fields (for audit and comparison)
  rmssd_baseline DECIMAL(8,2), -- RMSSD baseline from calibration (milliseconds)
  rmssd_confidence TEXT CHECK (rmssd_confidence IN ('ok', 'low')), -- Confidence in baseline quality
  baseline_beat_count INTEGER, -- Number of beats used for baseline calculation
  
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
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- NASA-TLX blocks table
CREATE TABLE public.nasa_tlx_blocks (
  id BIGSERIAL PRIMARY KEY,
  session_id BIGINT REFERENCES public.sessions(id) ON DELETE CASCADE,
  block TEXT NOT NULL CHECK (block IN ('easy', 'medium', 'hard')), -- After Q1, Q3, Q5
  mental INTEGER CHECK (mental >= 0 AND mental <= 100),
  physical INTEGER CHECK (physical >= 0 AND physical <= 100),
  temporal INTEGER CHECK (temporal >= 0 AND temporal <= 100),
  performance INTEGER CHECK (performance >= 0 AND performance <= 100),
  effort INTEGER CHECK (effort >= 0 AND effort <= 100),
  frustration INTEGER CHECK (frustration >= 0 AND frustration <= 100),
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
CREATE INDEX idx_nasa_tlx_blocks_session_id ON public.nasa_tlx_blocks(session_id);

-- Row Level Security (RLS) policies
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hr_beats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nasa_tlx_blocks ENABLE ROW LEVEL SECURITY;

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

CREATE POLICY "Users can view own nasa_tlx_blocks" ON public.nasa_tlx_blocks
  FOR SELECT USING (auth.uid() = (SELECT user_id FROM public.sessions WHERE id = session_id));

CREATE POLICY "Users can create own nasa_tlx_blocks" ON public.nasa_tlx_blocks
  FOR INSERT WITH CHECK (auth.uid() = (SELECT user_id FROM public.sessions WHERE id = session_id));

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

CREATE POLICY "Service role can manage all nasa_tlx_blocks" ON public.nasa_tlx_blocks
  FOR ALL USING (auth.role() = 'service_role');

