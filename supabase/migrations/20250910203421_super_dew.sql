/*
  # Create Challenge Dashboard Tables

  1. New Tables
    - `challenge_users`
      - `id` (uuid, primary key)
      - `email` (text, unique)
      - `name` (text)
      - `created_at` (timestamp)
    - `challenge_logs`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key)
      - `date` (date)
      - `study_text` (text)
      - `photo_url` (text, optional)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on both tables
    - Add policies for authenticated users to manage their own data
    - Add policies for reading all users' data (for leaderboard/feed)

  3. Storage
    - Create storage bucket for study photos
    - Add RLS policies for photo uploads
*/

-- Create challenge_users table
CREATE TABLE IF NOT EXISTS challenge_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  name text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create challenge_logs table
CREATE TABLE IF NOT EXISTS challenge_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES challenge_users(id) ON DELETE CASCADE,
  date date NOT NULL,
  study_text text NOT NULL,
  photo_url text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, date)
);

-- Enable RLS
ALTER TABLE challenge_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE challenge_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for challenge_users
CREATE POLICY "Users can read all users data"
  ON challenge_users
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert their own data"
  ON challenge_users
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update their own data"
  ON challenge_users
  FOR UPDATE
  TO authenticated
  USING (auth.uid()::text = id::text);

-- RLS Policies for challenge_logs
CREATE POLICY "Users can read all logs"
  ON challenge_logs
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert their own logs"
  ON challenge_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id IN (
      SELECT id FROM challenge_users WHERE auth.uid()::text = id::text
    )
  );

CREATE POLICY "Users can update their own logs"
  ON challenge_logs
  FOR UPDATE
  TO authenticated
  USING (
    user_id IN (
      SELECT id FROM challenge_users WHERE auth.uid()::text = id::text
    )
  );

CREATE POLICY "Users can delete their own logs"
  ON challenge_logs
  FOR DELETE
  TO authenticated
  USING (
    user_id IN (
      SELECT id FROM challenge_users WHERE auth.uid()::text = id::text
    )
  );

-- Create storage bucket for study photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('study-photos', 'study-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "Anyone can view study photos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'study-photos');

CREATE POLICY "Authenticated users can upload study photos"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'study-photos');

CREATE POLICY "Users can update their own photos"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'study-photos');

CREATE POLICY "Users can delete their own photos"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'study-photos');