CREATE TABLE IF NOT EXISTS test_cases (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  problem_id      UUID NOT NULL REFERENCES problems(id) ON DELETE CASCADE,
  s3_input_key    TEXT NOT NULL,
  s3_output_key   TEXT NOT NULL,
  is_sample       BOOLEAN DEFAULT false,
  created_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_test_cases_problem ON test_cases(problem_id);
