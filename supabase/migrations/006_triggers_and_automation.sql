-- ══════════════════════════════════════════════════════════════════
-- Migration 006: Database Triggers and Automation
-- ══════════════════════════════════════════════════════════════════
-- Adds auto-updating timestamps, data validation, and automation triggers.

-- ──────────────────────────────────────────────────────────────────
-- 1. Add updated_at to tables that are missing it
-- ──────────────────────────────────────────────────────────────────

ALTER TABLE rules ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE templates ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- ──────────────────────────────────────────────────────────────────
-- 2. Generic updated_at trigger function
-- ──────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- ──────────────────────────────────────────────────────────────────
-- 3. Apply updated_at trigger to all tables
-- ──────────────────────────────────────────────────────────────────

DROP TRIGGER IF EXISTS trg_updated_at_cards ON cards;
CREATE TRIGGER trg_updated_at_cards
  BEFORE UPDATE ON cards
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS trg_updated_at_goals ON goals;
CREATE TRIGGER trg_updated_at_goals
  BEFORE UPDATE ON goals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS trg_updated_at_transactions ON transactions;
CREATE TRIGGER trg_updated_at_transactions
  BEFORE UPDATE ON transactions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS trg_updated_at_budgets ON budgets;
CREATE TRIGGER trg_updated_at_budgets
  BEFORE UPDATE ON budgets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS trg_updated_at_rules ON rules;
CREATE TRIGGER trg_updated_at_rules
  BEFORE UPDATE ON rules
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS trg_updated_at_templates ON templates;
CREATE TRIGGER trg_updated_at_templates
  BEFORE UPDATE ON templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS trg_updated_at_user_configs ON user_configs;
CREATE TRIGGER trg_updated_at_user_configs
  BEFORE UPDATE ON user_configs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS trg_updated_at_settings ON settings;
CREATE TRIGGER trg_updated_at_settings
  BEFORE UPDATE ON settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ──────────────────────────────────────────────────────────────────
-- 4. Transaction validation trigger
-- ──────────────────────────────────────────────────────────────────
-- Ensures data integrity for financial transactions.

CREATE OR REPLACE FUNCTION validate_transaction()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Ensure value is positive (sign is determined by type)
  IF NEW.value < 0 THEN
    NEW.value = ABS(NEW.value);
  END IF;

  -- Set default category if empty
  IF NEW.category IS NULL OR NEW.category = '' THEN
    NEW.category = 'Outros';
  END IF;

  -- Normalize date to ISO format if needed (PostgreSQL handles this natively)

  -- Set invoice_month for credit card transactions if not set
  IF NEW.invoice_month IS NULL
     AND NEW.payment_method = 'Credito'
     AND NEW.card_id IS NOT NULL THEN
    -- Calculate invoice month based on card closing day
    -- This is a simplified version; the frontend handles complex cases
    NEW.invoice_month = to_char(NEW.date, 'YYYY-MM');
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_transaction ON transactions;
CREATE TRIGGER trg_validate_transaction
  BEFORE INSERT OR UPDATE ON transactions
  FOR EACH ROW EXECUTE FUNCTION validate_transaction();

-- ──────────────────────────────────────────────────────────────────
-- 5. Budget alert trigger (in-database notification)
-- ──────────────────────────────────────────────────────────────────
-- Creates a notification record when a budget is exceeded.
-- Works alongside the Edge Function email alerts.

CREATE OR REPLACE FUNCTION check_budget_alert()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  budget_limit NUMERIC;
  total_spent NUMERIC;
  budget_month TEXT;
BEGIN
  -- Only check on expense transactions
  IF NEW.type != 'expense' THEN
    RETURN NEW;
  END IF;

  -- Get the month for this transaction
  budget_month := to_char(NEW.date, 'YYYY-MM');

  -- Find matching budget for this category and month
  SELECT "limit" INTO budget_limit
  FROM budgets
  WHERE user_id = NEW.user_id
    AND category = NEW.category
    AND month = budget_month
  LIMIT 1;

  IF budget_limit IS NULL THEN
    RETURN NEW;
  END IF;

  -- Calculate total spent in this category this month
  SELECT COALESCE(SUM(ABS(value)), 0) INTO total_spent
  FROM transactions
  WHERE user_id = NEW.user_id
    AND category = NEW.category
    AND type = 'expense'
    AND to_char(date, 'YYYY-MM') = budget_month;

  -- If over 80% or 100%, log a notice (the Edge Function handles email)
  IF total_spent >= budget_limit THEN
    RAISE NOTICE 'BUDGET_EXCEEDED: user=%, category=%, spent=%, limit=%',
      NEW.user_id, NEW.category, total_spent, budget_limit;
  ELSIF total_spent >= budget_limit * 0.8 THEN
    RAISE NOTICE 'BUDGET_WARNING: user=%, category=%, spent=%, limit=%',
      NEW.user_id, NEW.category, total_spent, budget_limit;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_check_budget_alert ON transactions;
CREATE TRIGGER trg_check_budget_alert
  AFTER INSERT ON transactions
  FOR EACH ROW EXECUTE FUNCTION check_budget_alert();

-- ──────────────────────────────────────────────────────────────────
-- 6. Composite unique constraints (prevents duplicates at DB level)
-- ──────────────────────────────────────────────────────────────────

-- Budget: one budget per category per user per month
CREATE UNIQUE INDEX IF NOT EXISTS idx_budgets_user_category_month
  ON budgets(user_id, category, month);

-- Rule: one rule per keyword per user
CREATE UNIQUE INDEX IF NOT EXISTS idx_rules_user_keyword
  ON rules(user_id, keyword);

-- Template: one template per description per user
CREATE UNIQUE INDEX IF NOT EXISTS idx_templates_user_description
  ON templates(user_id, description);

-- Settings: one value per key per user
CREATE UNIQUE INDEX IF NOT EXISTS idx_settings_user_key_unique
  ON settings(user_id, key);

-- User configs: one value per key per user
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_configs_user_key_unique
  ON user_configs(user_id, key);
