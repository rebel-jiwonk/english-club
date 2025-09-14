-- Fix RLS policies to work without authentication
-- This migration updates the policies to allow public access for the challenge dashboard

-- Drop existing policies
DROP POLICY IF EXISTS "Users can read all users data" ON challenge_users;
DROP POLICY IF EXISTS "Users can insert their own data" ON challenge_users;
DROP POLICY IF EXISTS "Users can update their own data" ON challenge_users;
DROP POLICY IF EXISTS "Users can read all logs" ON challenge_logs;
DROP POLICY IF EXISTS "Users can insert their own logs" ON challenge_logs;
DROP POLICY IF EXISTS "Users can update their own logs" ON challenge_logs;
DROP POLICY IF EXISTS "Users can delete their own logs" ON challenge_logs;
DROP POLICY IF EXISTS "Anyone can view study photos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload study photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own photos" ON storage.objects;

-- Create new policies that work without authentication
-- Allow public read access to all data (needed for leaderboard and community feed)
CREATE POLICY "Public can read all users data"
  ON challenge_users
  FOR SELECT
  USING (true);

CREATE POLICY "Public can insert users"
  ON challenge_users
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Public can update users"
  ON challenge_users
  FOR UPDATE
  USING (true);

-- Allow public read access to all logs (needed for community feed)
CREATE POLICY "Public can read all logs"
  ON challenge_logs
  FOR SELECT
  USING (true);

-- Allow public insert/update/delete for logs (users manage their own data via application logic)
CREATE POLICY "Public can insert logs"
  ON challenge_logs
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Public can update logs"
  ON challenge_logs
  FOR UPDATE
  USING (true);

CREATE POLICY "Public can delete logs"
  ON challenge_logs
  FOR DELETE
  USING (true);

-- Storage policies for public access
CREATE POLICY "Public can view study photos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'study-photos');

CREATE POLICY "Public can upload study photos"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'study-photos');

CREATE POLICY "Public can update study photos"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'study-photos');

CREATE POLICY "Public can delete study photos"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'study-photos');
