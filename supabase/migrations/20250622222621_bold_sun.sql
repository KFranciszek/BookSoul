/*
  # Survey Sessions and Ratings System

  1. New Tables
    - `survey_sessions`
      - `id` (uuid, primary key)
      - `survey_mode` (text) - quick/deep/cinema
      - `survey_data` (jsonb) - complete survey responses
      - `recommendations` (jsonb) - AI generated recommendations
      - `user_ratings` (jsonb) - user ratings for each recommendation
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
      - `user_email` (text, optional)
      - `session_metadata` (jsonb) - processing time, agents used, etc.

  2. Security
    - Enable RLS on `survey_sessions` table
    - Add policies for public access (anonymous data collection)
    - Add policy for email-based access if user provided email

  3. Indexes
    - Index on survey_mode for analytics
    - Index on created_at for time-based queries
    - GIN index on survey_data and recommendations for JSON queries
*/

CREATE TABLE IF NOT EXISTS survey_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  survey_mode text NOT NULL CHECK (survey_mode IN ('quick', 'deep', 'cinema')),
  survey_data jsonb NOT NULL DEFAULT '{}',
  recommendations jsonb NOT NULL DEFAULT '[]',
  user_ratings jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  user_email text,
  session_metadata jsonb DEFAULT '{}'
);

-- Enable RLS
ALTER TABLE survey_sessions ENABLE ROW LEVEL SECURITY;

-- Allow public read/write for anonymous data collection
CREATE POLICY "Allow public survey session creation"
  ON survey_sessions
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Allow public survey session updates"
  ON survey_sessions
  FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow public survey session reads"
  ON survey_sessions
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_survey_sessions_mode ON survey_sessions(survey_mode);
CREATE INDEX IF NOT EXISTS idx_survey_sessions_created_at ON survey_sessions(created_at);
CREATE INDEX IF NOT EXISTS idx_survey_sessions_email ON survey_sessions(user_email) WHERE user_email IS NOT NULL;

-- GIN indexes for JSON queries
CREATE INDEX IF NOT EXISTS idx_survey_sessions_survey_data ON survey_sessions USING GIN(survey_data);
CREATE INDEX IF NOT EXISTS idx_survey_sessions_recommendations ON survey_sessions USING GIN(recommendations);
CREATE INDEX IF NOT EXISTS idx_survey_sessions_ratings ON survey_sessions USING GIN(user_ratings);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to automatically update updated_at
CREATE TRIGGER update_survey_sessions_updated_at
  BEFORE UPDATE ON survey_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();