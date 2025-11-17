-- NASA-TLX Implementation Rollback Migration
-- This migration rolls back all changes made by 001_nasa_tlx_implementation.sql
-- Author: Claude Code
-- Date: 2025-11-17

-- =============================================================================
-- STEP 1: DROP RLS POLICIES
-- =============================================================================

-- Drop policies for cognitive_load_summary
DROP POLICY IF EXISTS "Users can view own cognitive_load_summary" ON cognitive_load_summary;
DROP POLICY IF EXISTS "Users can create own cognitive_load_summary" ON cognitive_load_summary;
DROP POLICY IF EXISTS "Service role can manage all cognitive_load_summary" ON cognitive_load_summary;

-- Drop policies for nasa_tlx_user
DROP POLICY IF EXISTS "Users can view own nasa_tlx_user" ON nasa_tlx_user;
DROP POLICY IF EXISTS "Users can create own nasa_tlx_user" ON nasa_tlx_user;
DROP POLICY IF EXISTS "Service role can manage all nasa_tlx_user" ON nasa_tlx_user;

-- Drop policies for nasa_tlx_system
DROP POLICY IF EXISTS "Users can view own nasa_tlx_system" ON nasa_tlx_system;
DROP POLICY IF EXISTS "Users can create own nasa_tlx_system" ON nasa_tlx_system;
DROP POLICY IF EXISTS "Service role can manage all nasa_tlx_system" ON nasa_tlx_system;

-- =============================================================================
-- STEP 2: DROP NEW TABLES (in reverse order of creation)
-- =============================================================================

DROP TABLE IF EXISTS cognitive_load_summary CASCADE;
DROP TABLE IF EXISTS nasa_tlx_user CASCADE;
DROP TABLE IF EXISTS nasa_tlx_system CASCADE;

-- =============================================================================
-- STEP 3: REMOVE COLUMNS FROM EXISTING TABLES
-- =============================================================================

-- Note: nasa_tlx_blocks table (old design) was dropped in forward migration
-- No need to recreate it in rollback as it's been removed from codebase

-- Remove columns from sessions table
ALTER TABLE sessions
DROP COLUMN IF EXISTS environment_noise;

-- Remove columns from users table
ALTER TABLE users
DROP COLUMN IF EXISTS profile_math_grade,
DROP COLUMN IF EXISTS profile_programming_grade;

-- =============================================================================
-- STEP 4: VERIFICATION
-- =============================================================================

-- Verify tables are dropped
SELECT
  table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('nasa_tlx_system', 'nasa_tlx_user', 'cognitive_load_summary');

-- Should return 0 rows if successfully dropped

-- Verify columns are removed
SELECT
  column_name
FROM information_schema.columns
WHERE table_name = 'users'
  AND column_name IN ('profile_math_grade', 'profile_programming_grade')
UNION ALL
SELECT
  column_name
FROM information_schema.columns
WHERE table_name = 'sessions'
  AND column_name = 'environment_noise';

-- Should return 0 rows if successfully removed
