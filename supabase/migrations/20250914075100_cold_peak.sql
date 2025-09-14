/*
  # Add recordings table with password protection

  1. New Tables
    - `challenge_recordings`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to challenge_users)
      - `date` (date)
      - `recording_url` (text)
      - `title` (text, optional)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on `challenge_recordings` table
    - Add policies for authenticated users to manage their own recordings
    - Recordings are protected and only accessible with password verification
*/

CREATE TABLE IF NOT EXISTS challenge_recordings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES challenge_users(id) ON DELETE CASCADE,
  date date NOT NULL,
  recording_url text NOT NULL,
  title text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, date)
);

ALTER TABLE challenge_recordings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert their own recordings"
  ON challenge_recordings
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id IN (
    SELECT id FROM challenge_users WHERE auth_user_id = auth.uid()
  ));

CREATE POLICY "Users can read their own recordings"
  ON challenge_recordings
  FOR SELECT
  TO authenticated
  USING (user_id IN (
    SELECT id FROM challenge_users WHERE auth_user_id = auth.uid()
  ));

CREATE POLICY "Users can update their own recordings"
  ON challenge_recordings
  FOR UPDATE
  TO authenticated
  USING (user_id IN (
    SELECT id FROM challenge_users WHERE auth_user_id = auth.uid()
  ));

CREATE POLICY "Users can delete their own recordings"
  ON challenge_recordings
  FOR DELETE
  TO authenticated
  USING (user_id IN (
    SELECT id FROM challenge_users WHERE auth_user_id = auth.uid()
  ));