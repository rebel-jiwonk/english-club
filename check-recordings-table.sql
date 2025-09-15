-- Check if challenge_recordings table exists and create if needed
-- Run this in Supabase SQL Editor if recordings aren't working

-- Check if table exists
SELECT EXISTS (
   SELECT FROM information_schema.tables 
   WHERE table_schema = 'public' 
   AND table_name = 'challenge_recordings'
);

-- Create table if it doesn't exist
CREATE TABLE IF NOT EXISTS challenge_recordings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES challenge_users(id) ON DELETE CASCADE,
  date date NOT NULL,
  recording_url text NOT NULL,
  title text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, date)
);

-- Enable RLS
ALTER TABLE challenge_recordings ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Public can read all recordings" ON challenge_recordings;
DROP POLICY IF EXISTS "Public can insert recordings" ON challenge_recordings;
DROP POLICY IF EXISTS "Public can update recordings" ON challenge_recordings;
DROP POLICY IF EXISTS "Public can delete recordings" ON challenge_recordings;

-- Create new policies
CREATE POLICY "Public can read all recordings"
  ON challenge_recordings
  FOR SELECT
  USING (true);

CREATE POLICY "Public can insert recordings"
  ON challenge_recordings
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Public can update recordings"
  ON challenge_recordings
  FOR UPDATE
  USING (true);

CREATE POLICY "Public can delete recordings"
  ON challenge_recordings
  FOR DELETE
  USING (true);

-- Create storage bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('study-recordings', 'study-recordings', true)
ON CONFLICT (id) DO NOTHING;

-- Drop existing storage policies if they exist
DROP POLICY IF EXISTS "Public can view study recordings" ON storage.objects;
DROP POLICY IF EXISTS "Public can upload study recordings" ON storage.objects;
DROP POLICY IF EXISTS "Public can update study recordings" ON storage.objects;
DROP POLICY IF EXISTS "Public can delete study recordings" ON storage.objects;

-- Create storage policies
CREATE POLICY "Public can view study recordings"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'study-recordings');

CREATE POLICY "Public can upload study recordings"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'study-recordings');

CREATE POLICY "Public can update study recordings"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'study-recordings');

CREATE POLICY "Public can delete study recordings"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'study-recordings');
