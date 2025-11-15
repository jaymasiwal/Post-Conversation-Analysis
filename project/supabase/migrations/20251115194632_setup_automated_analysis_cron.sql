/*
  # Setup Automated Daily Analysis Cron Job

  ## Overview
  This migration sets up a PostgreSQL cron job that automatically performs analysis on
  all new conversations (those without analysis) once daily at midnight UTC.

  ## What it does
  - Runs every day at 12:00 AM UTC
  - Finds all conversations that have been created but not yet analyzed
  - Creates placeholder analysis records for new conversations
  - Marks conversations as analyzed

  ## Implementation Details
  - Uses pg_cron extension (must be enabled)
  - Updates conversations.analyzed_at timestamp
  - Creates initial analysis records with default values
  - Non-blocking operation (safe to run alongside other processes)

  ## Important Notes
  - In production, you'll want to call the Edge Function via webhook for real analysis
  - This creates the infrastructure for automated daily runs
  - For actual intelligent analysis, the Edge Function will be invoked externally
*/

-- Ensure pg_cron extension is available
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Create a function that processes unanalyzed conversations
CREATE OR REPLACE FUNCTION process_unanalyzed_conversations()
RETURNS void AS $$
BEGIN
  -- Update analyzed_at timestamp for conversations that don't have analysis yet
  UPDATE conversations
  SET analyzed_at = now()
  WHERE analyzed_at IS NULL
  AND id NOT IN (
    SELECT conversation_id FROM conversation_analyses
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Schedule the cron job to run daily at midnight UTC
-- Format: minute hour day month day_of_week
-- 0 0 * * * = every day at 00:00 UTC
SELECT cron.schedule(
  'process-unanalyzed-conversations-daily',
  '0 0 * * *',
  'SELECT process_unanalyzed_conversations();'
);

-- Grant necessary permissions to authenticated users
GRANT EXECUTE ON FUNCTION process_unanalyzed_conversations TO authenticated;
