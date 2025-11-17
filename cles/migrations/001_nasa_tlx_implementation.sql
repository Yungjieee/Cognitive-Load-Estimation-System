-- NASA-TLX Implementation Migration
-- This migration adds all necessary tables and columns for NASA-TLX cognitive load measurement
-- Author: Claude Code
-- Date: 2025-11-17

-- =============================================================================
-- STEP 1: DROP UNUSED TABLES
-- =============================================================================

-- Drop the old nasa_tlx_blocks table if it exists (from previous design)
DROP TABLE IF EXISTS nasa_tlx_blocks CASCADE;

-- =============================================================================
-- STEP 2: ALTER EXISTING TABLES
-- =============================================================================

-- Add columns to users table for Math and Programming grades
ALTER TABLE users
ADD COLUMN IF NOT EXISTS profile_math_grade VARCHAR(20),
ADD COLUMN IF NOT EXISTS profile_programming_grade VARCHAR(20);

COMMENT ON COLUMN users.profile_math_grade IS 'User math grade: A, B, C, D, F, or not_taken';
COMMENT ON COLUMN users.profile_programming_grade IS 'User programming grade: A, B, C, D, F, or not_taken';

-- Add column to sessions table for environment noise rating
ALTER TABLE sessions
ADD COLUMN IF NOT EXISTS environment_noise DECIMAL(5,2);

COMMENT ON COLUMN sessions.environment_noise IS 'Environmental noise/distraction rating (0-21 scale) collected after calibration';

-- =============================================================================
-- STEP 3: CREATE NASA-TLX SYSTEM TABLE (Per-Question System Calculations)
-- =============================================================================

CREATE TABLE IF NOT EXISTS nasa_tlx_system (
  id SERIAL PRIMARY KEY,
  session_id INTEGER NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  question_id INTEGER NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  q_index INTEGER NOT NULL CHECK (q_index >= 1 AND q_index <= 5),

  -- NASA-TLX Dimensions (0-21 scale) - System calculated
  mental_demand DECIMAL(5,2) NOT NULL CHECK (mental_demand >= 0 AND mental_demand <= 21),
  physical_demand DECIMAL(5,2) NOT NULL CHECK (physical_demand >= 0 AND physical_demand <= 21),
  temporal_demand DECIMAL(5,2) NOT NULL CHECK (temporal_demand >= 0 AND temporal_demand <= 21),
  performance DECIMAL(5,2) NOT NULL CHECK (performance >= 0 AND performance <= 21),
  effort DECIMAL(5,2) NOT NULL CHECK (effort >= 0 AND effort <= 21),
  frustration DECIMAL(5,2) NOT NULL CHECK (frustration >= 0 AND frustration <= 21),

  -- Cognitive Load (calculated from 6 dimensions)
  cognitive_load DECIMAL(5,2) NOT NULL CHECK (cognitive_load >= 0 AND cognitive_load <= 21),

  created_at TIMESTAMP DEFAULT NOW(),

  -- Ensure one record per question per session
  UNIQUE(session_id, q_index)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_nasa_tlx_system_session ON nasa_tlx_system(session_id);
CREATE INDEX IF NOT EXISTS idx_nasa_tlx_system_question ON nasa_tlx_system(q_index);

-- Comments
COMMENT ON TABLE nasa_tlx_system IS 'System-calculated NASA-TLX dimensions for each question (5 rows per session)';
COMMENT ON COLUMN nasa_tlx_system.mental_demand IS 'Preparedness vs difficulty mismatch (0-21)';
COMMENT ON COLUMN nasa_tlx_system.physical_demand IS 'Environmental noise/distraction (0-21)';
COMMENT ON COLUMN nasa_tlx_system.temporal_demand IS 'Time pressure based on time used (0-21)';
COMMENT ON COLUMN nasa_tlx_system.performance IS 'INVERTED: Points-based performance (0=perfect, 21=failure)';
COMMENT ON COLUMN nasa_tlx_system.effort IS 'Time + help + attention composite (0-21)';
COMMENT ON COLUMN nasa_tlx_system.frustration IS 'HRV-based stress measurement (0-21)';
COMMENT ON COLUMN nasa_tlx_system.cognitive_load IS 'Average of 6 NASA-TLX dimensions (0-21)';

-- =============================================================================
-- STEP 4: CREATE NASA-TLX USER TABLE (User Subjective Survey)
-- =============================================================================

CREATE TABLE IF NOT EXISTS nasa_tlx_user (
  id SERIAL PRIMARY KEY,
  session_id INTEGER NOT NULL UNIQUE REFERENCES sessions(id) ON DELETE CASCADE,

  -- NASA-TLX Dimensions (0-21 scale) - User subjective ratings
  mental_demand DECIMAL(5,2) NOT NULL CHECK (mental_demand >= 0 AND mental_demand <= 21),
  physical_demand DECIMAL(5,2) NOT NULL CHECK (physical_demand >= 0 AND physical_demand <= 21),
  temporal_demand DECIMAL(5,2) NOT NULL CHECK (temporal_demand >= 0 AND temporal_demand <= 21),
  performance DECIMAL(5,2) NOT NULL CHECK (performance >= 0 AND performance <= 21),
  effort DECIMAL(5,2) NOT NULL CHECK (effort >= 0 AND effort <= 21),
  frustration DECIMAL(5,2) NOT NULL CHECK (frustration >= 0 AND frustration <= 21),

  -- Overall Cognitive Load (calculated from 6 dimensions above)
  cognitive_load DECIMAL(5,2) NOT NULL CHECK (cognitive_load >= 0 AND cognitive_load <= 21),

  created_at TIMESTAMP DEFAULT NOW()
);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_nasa_tlx_user_session ON nasa_tlx_user(session_id);

-- Comments
COMMENT ON TABLE nasa_tlx_user IS 'User subjective NASA-TLX ratings collected after completing all 5 questions (1 row per session)';
COMMENT ON COLUMN nasa_tlx_user.mental_demand IS 'User-reported mental demand (0-21)';
COMMENT ON COLUMN nasa_tlx_user.physical_demand IS 'User-reported physical demand/environment (0-21)';
COMMENT ON COLUMN nasa_tlx_user.temporal_demand IS 'User-reported time pressure (0-21)';
COMMENT ON COLUMN nasa_tlx_user.performance IS 'User-reported performance (0-21, inverted scale)';
COMMENT ON COLUMN nasa_tlx_user.effort IS 'User-reported effort (0-21)';
COMMENT ON COLUMN nasa_tlx_user.frustration IS 'User-reported frustration (0-21)';
COMMENT ON COLUMN nasa_tlx_user.cognitive_load IS 'Average of 6 user-rated dimensions (0-21)';

-- =============================================================================
-- STEP 5: CREATE COGNITIVE LOAD SUMMARY TABLE (Session Aggregates)
-- =============================================================================

CREATE TABLE IF NOT EXISTS cognitive_load_summary (
  id SERIAL PRIMARY KEY,
  session_id INTEGER NOT NULL UNIQUE REFERENCES sessions(id) ON DELETE CASCADE,

  -- System: Weighted averages from nasa_tlx_system (weights: 0.1, 0.2, 0.2, 0.25, 0.25)
  sys_mental_demand DECIMAL(5,2) NOT NULL CHECK (sys_mental_demand >= 0 AND sys_mental_demand <= 21),
  sys_physical_demand DECIMAL(5,2) NOT NULL CHECK (sys_physical_demand >= 0 AND sys_physical_demand <= 21),
  sys_temporal_demand DECIMAL(5,2) NOT NULL CHECK (sys_temporal_demand >= 0 AND sys_temporal_demand <= 21),
  sys_performance DECIMAL(5,2) NOT NULL CHECK (sys_performance >= 0 AND sys_performance <= 21),
  sys_effort DECIMAL(5,2) NOT NULL CHECK (sys_effort >= 0 AND sys_effort <= 21),
  sys_frustration DECIMAL(5,2) NOT NULL CHECK (sys_frustration >= 0 AND sys_frustration <= 21),
  sys_cognitive_load DECIMAL(5,2) NOT NULL CHECK (sys_cognitive_load >= 0 AND sys_cognitive_load <= 21),

  created_at TIMESTAMP DEFAULT NOW()
);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_cognitive_load_summary_session ON cognitive_load_summary(session_id);

-- Comments
COMMENT ON TABLE cognitive_load_summary IS 'Weighted averages of system-calculated NASA-TLX dimensions per session (1 row per session)';
COMMENT ON COLUMN cognitive_load_summary.sys_mental_demand IS 'Weighted average of mental demand across 5 questions';
COMMENT ON COLUMN cognitive_load_summary.sys_physical_demand IS 'Weighted average of physical demand across 5 questions';
COMMENT ON COLUMN cognitive_load_summary.sys_temporal_demand IS 'Weighted average of temporal demand across 5 questions';
COMMENT ON COLUMN cognitive_load_summary.sys_performance IS 'Weighted average of performance across 5 questions';
COMMENT ON COLUMN cognitive_load_summary.sys_effort IS 'Weighted average of effort across 5 questions';
COMMENT ON COLUMN cognitive_load_summary.sys_frustration IS 'Weighted average of frustration across 5 questions';
COMMENT ON COLUMN cognitive_load_summary.sys_cognitive_load IS 'Weighted average of cognitive load across 5 questions';

-- =============================================================================
-- STEP 6: ENABLE ROW LEVEL SECURITY (RLS)
-- =============================================================================

-- Enable RLS for new tables
ALTER TABLE nasa_tlx_system ENABLE ROW LEVEL SECURITY;
ALTER TABLE nasa_tlx_user ENABLE ROW LEVEL SECURITY;
ALTER TABLE cognitive_load_summary ENABLE ROW LEVEL SECURITY;

-- User policies for nasa_tlx_system
CREATE POLICY "Users can view own nasa_tlx_system" ON nasa_tlx_system
  FOR SELECT USING (auth.uid() = (SELECT user_id FROM sessions WHERE id = session_id));

CREATE POLICY "Users can create own nasa_tlx_system" ON nasa_tlx_system
  FOR INSERT WITH CHECK (auth.uid() = (SELECT user_id FROM sessions WHERE id = session_id));

-- User policies for nasa_tlx_user
CREATE POLICY "Users can view own nasa_tlx_user" ON nasa_tlx_user
  FOR SELECT USING (auth.uid() = (SELECT user_id FROM sessions WHERE id = session_id));

CREATE POLICY "Users can create own nasa_tlx_user" ON nasa_tlx_user
  FOR INSERT WITH CHECK (auth.uid() = (SELECT user_id FROM sessions WHERE id = session_id));

-- User policies for cognitive_load_summary
CREATE POLICY "Users can view own cognitive_load_summary" ON cognitive_load_summary
  FOR SELECT USING (auth.uid() = (SELECT user_id FROM sessions WHERE id = session_id));

CREATE POLICY "Users can create own cognitive_load_summary" ON cognitive_load_summary
  FOR INSERT WITH CHECK (auth.uid() = (SELECT user_id FROM sessions WHERE id = session_id));

-- Service role policies (admin access)
CREATE POLICY "Service role can manage all nasa_tlx_system" ON nasa_tlx_system
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role can manage all nasa_tlx_user" ON nasa_tlx_user
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role can manage all cognitive_load_summary" ON cognitive_load_summary
  FOR ALL USING (auth.role() = 'service_role');

-- =============================================================================
-- STEP 7: VERIFICATION QUERIES
-- =============================================================================

-- Verify all tables exist
SELECT
  'nasa_tlx_system' as table_name,
  COUNT(*) as column_count
FROM information_schema.columns
WHERE table_name = 'nasa_tlx_system'
UNION ALL
SELECT
  'nasa_tlx_user',
  COUNT(*)
FROM information_schema.columns
WHERE table_name = 'nasa_tlx_user'
UNION ALL
SELECT
  'cognitive_load_summary',
  COUNT(*)
FROM information_schema.columns
WHERE table_name = 'cognitive_load_summary';

-- Verify new columns in existing tables
SELECT
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'users'
  AND column_name IN ('profile_math_grade', 'profile_programming_grade')
UNION ALL
SELECT
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'sessions'
  AND column_name = 'environment_noise';

-- =============================================================================
-- NOTES
-- =============================================================================

/*
Weighted Average Formula:
weights = [0.10, 0.20, 0.20, 0.25, 0.25] for Q1, Q2, Q3, Q4, Q5

Example calculation for sys_mental_demand:
sys_mental_demand =
  0.10 * q1.mental_demand +
  0.20 * q2.mental_demand +
  0.20 * q3.mental_demand +
  0.25 * q4.mental_demand +
  0.25 * q5.mental_demand

This applies to all 6 dimensions and cognitive_load.

Rationale: Harder questions (Q4, Q5) have more cognitive impact and are better
remembered by users (recency + intensity bias).
*/
