-- ══════════════════════════════════════════════════════════════════
-- Migration 005: pg_cron + pg_net for Edge Function scheduling
-- ══════════════════════════════════════════════════════════════════
-- This migration enables pg_cron and pg_net extensions to schedule
-- the 5 Edge Functions for automated recurring tasks.

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- ──────────────────────────────────────────────────────────────────
-- Helper: construct the Edge Function invocation URL
-- Uses current_setting to read the project URL at runtime
-- ──────────────────────────────────────────────────────────────────

-- Note: Replace YOUR_PROJECT_REF below with your actual Supabase project ref
-- You can find it in your Supabase dashboard URL: https://supabase.com/dashboard/project/YOUR_PROJECT_REF
-- Or set it via: ALTER DATABASE postgres SET app.settings.supabase_url = 'https://YOUR_PROJECT_REF.supabase.co';

-- For now, we use a SQL function that constructs the URL from settings
CREATE OR REPLACE FUNCTION invoke_edge_function(function_name TEXT, payload JSONB DEFAULT '{}')
RETURNS BIGINT
LANGUAGE plpgsql
AS $$
DECLARE
  supabase_url TEXT;
  service_key TEXT;
  request_id BIGINT;
BEGIN
  -- Read from database settings (set via ALTER DATABASE or supabase secrets)
  supabase_url := current_setting('app.settings.supabase_url', true);
  service_key := current_setting('app.settings.service_role_key', true);

  -- Fallback: try to read from Supabase vault if available
  IF supabase_url IS NULL OR supabase_url = '' THEN
    RAISE WARNING 'app.settings.supabase_url not set. Edge function % will not be invoked.', function_name;
    RETURN NULL;
  END IF;

  IF service_key IS NULL OR service_key = '' THEN
    RAISE WARNING 'app.settings.service_role_key not set. Edge function % will not be invoked.', function_name;
    RETURN NULL;
  END IF;

  -- Make HTTP POST request to Edge Function
  SELECT net.http_post(
    url := supabase_url || '/functions/v1/' || function_name,
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || service_key,
      'Content-Type', 'application/json'
    ),
    body := payload
  ) INTO request_id;

  RETURN request_id;
END;
$$;

-- ──────────────────────────────────────────────────────────────────
-- Cron Job 1: generate-recurring (1st of every month at 00:05)
-- Generates recurring transactions from templates
-- ──────────────────────────────────────────────────────────────────
SELECT cron.schedule(
  'generate-recurring-transactions',
  '5 0 1 * *',  -- 00:05 on the 1st of every month
  $$SELECT invoke_edge_function('generate-recurring')$$
);

-- ──────────────────────────────────────────────────────────────────
-- Cron Job 2: generate-recurring-budgets (1st of every month at 00:10)
-- Replicates recurring budgets for the new month
-- ──────────────────────────────────────────────────────────────────
SELECT cron.schedule(
  'generate-recurring-budgets',
  '10 0 1 * *',  -- 00:10 on the 1st of every month
  $$SELECT invoke_edge_function('generate-recurring-budgets')$$
);

-- ──────────────────────────────────────────────────────────────────
-- Cron Job 3: generate-salary (daily at 00:00, checks day internally)
-- Runs daily; the function checks if today matches the user's configured salary day
-- ──────────────────────────────────────────────────────────────────
SELECT cron.schedule(
  'generate-salary',
  '0 0 * * *',  -- 00:00 every day
  $$SELECT invoke_edge_function('generate-salary')$$
);

-- ──────────────────────────────────────────────────────────────────
-- Cron Job 4: send-budget-alert (every Monday at 08:00)
-- Sends email alerts for exceeded budgets
-- ──────────────────────────────────────────────────────────────────
SELECT cron.schedule(
  'send-budget-alert',
  '0 8 * * 1',  -- 08:00 every Monday
  $$SELECT invoke_edge_function('send-budget-alert')$$
);

-- ──────────────────────────────────────────────────────────────────
-- Cron Job 5: send-invoice-reminder (daily at 09:00)
-- Sends email reminders for upcoming card due dates
-- ──────────────────────────────────────────────────────────────────
SELECT cron.schedule(
  'send-invoice-reminder',
  '0 9 * * *',  -- 09:00 every day
  $$SELECT invoke_edge_function('send-invoice-reminder')$$
);
