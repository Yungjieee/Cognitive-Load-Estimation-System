-- Add HRV baseline fields to sessions table
-- Run this SQL in your Supabase SQL Editor

ALTER TABLE public.sessions 
ADD COLUMN IF NOT EXISTS rmssd_baseline DECIMAL(8,2),
ADD COLUMN IF NOT EXISTS rmssd_confidence TEXT CHECK (rmssd_confidence IN ('ok', 'low')),
ADD COLUMN IF NOT EXISTS baseline_beat_count INTEGER;

-- Add comments for documentation
COMMENT ON COLUMN public.sessions.rmssd_baseline IS 'RMSSD baseline from calibration (milliseconds)';
COMMENT ON COLUMN public.sessions.rmssd_confidence IS 'Confidence in baseline quality based on beat count';
COMMENT ON COLUMN public.sessions.baseline_beat_count IS 'Number of beats used for baseline calculation';


