-- ML Submission Service — Database Migration
-- Run against: ml_quest_submissions database
-- Created: 2026-02-27

-- ─── ML Submissions ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ml_submissions (
  id            UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       TEXT          NOT NULL,
  problem_id    TEXT,
  code          TEXT          NOT NULL,
  task_type     TEXT          NOT NULL    DEFAULT 'general',
  status        TEXT          NOT NULL    DEFAULT 'pending',
  s3_result_key TEXT,
  error_message TEXT,
  runtime_ms    INTEGER,
  memory_mb     NUMERIC(10,2),
  created_at    TIMESTAMPTZ   NOT NULL    DEFAULT NOW(),
  updated_at    TIMESTAMPTZ   NOT NULL    DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ml_submissions_user_id   ON ml_submissions (user_id);
CREATE INDEX IF NOT EXISTS idx_ml_submissions_status    ON ml_submissions (status);
CREATE INDEX IF NOT EXISTS idx_ml_submissions_task_type ON ml_submissions (task_type);
CREATE INDEX IF NOT EXISTS idx_ml_submissions_created_at ON ml_submissions (created_at DESC);

-- ─── ML Submission Results ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ml_submission_results (
  id            UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID          NOT NULL REFERENCES ml_submissions(id) ON DELETE CASCADE,
  task_type     TEXT          NOT NULL,
  summary       TEXT,
  metrics       JSONB         NOT NULL    DEFAULT '[]'::jsonb,
  insights      JSONB         NOT NULL    DEFAULT '[]'::jsonb,
  warnings      JSONB         NOT NULL    DEFAULT '[]'::jsonb,
  raw_output    TEXT,
  created_at    TIMESTAMPTZ   NOT NULL    DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_ml_submission_results_submission_id
  ON ml_submission_results (submission_id);

-- ─── Auto-update updated_at ───────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_ml_submissions_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_ml_submissions_updated_at ON ml_submissions;
CREATE TRIGGER trg_ml_submissions_updated_at
  BEFORE UPDATE ON ml_submissions
  FOR EACH ROW EXECUTE FUNCTION update_ml_submissions_updated_at();
