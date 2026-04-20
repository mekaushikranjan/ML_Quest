-- Create submissions table
CREATE TABLE IF NOT EXISTS submissions (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID NOT NULL,
  problem_id          UUID NOT NULL,
  code                TEXT NOT NULL,
  language            VARCHAR(50) NOT NULL,
  status              VARCHAR(20) DEFAULT 'pending', -- pending, running, accepted, wrong_answer, runtime_error, time_limit_exceeded, compilation_error
  runtime_ms          INTEGER,
  memory_mb           DECIMAL(10, 2),
  passed_tests        INTEGER DEFAULT 0,
  total_tests         INTEGER DEFAULT 0,
  error_message       TEXT,
  created_at          TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_submissions_user ON submissions(user_id);
CREATE INDEX IF NOT EXISTS idx_submissions_problem ON submissions(problem_id);
CREATE INDEX IF NOT EXISTS idx_submissions_status ON submissions(status);
CREATE INDEX IF NOT EXISTS idx_submissions_user_problem ON submissions(user_id, problem_id);
CREATE INDEX IF NOT EXISTS idx_submissions_created_at ON submissions(created_at);

-- Create test case results table for detailed results
CREATE TABLE IF NOT EXISTS test_case_results (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id       UUID NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
  test_case_id        UUID NOT NULL,
  status              VARCHAR(20) NOT NULL, -- passed, failed, runtime_error, time_limit_exceeded
  actual_output       TEXT,
  expected_output     TEXT,
  error_message       TEXT,
  runtime_ms          INTEGER,
  memory_mb           DECIMAL(10, 2),
  created_at          TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_test_results_submission ON test_case_results(submission_id);
