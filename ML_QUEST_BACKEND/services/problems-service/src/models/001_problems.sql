

CREATE TABLE IF NOT EXISTS problems (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug            VARCHAR(100) UNIQUE NOT NULL,
  title           VARCHAR(200) NOT NULL,
  description     TEXT NOT NULL,
  difficulty      VARCHAR(10) NOT NULL CHECK (difficulty IN ('easy', 'medium', 'hard')),
  tags            TEXT[] NOT NULL DEFAULT '{}',
  constraints     TEXT,
  examples        JSONB NOT NULL DEFAULT '[]',
  acceptance_rate FLOAT DEFAULT 0,
  is_premium      BOOLEAN DEFAULT false,
  created_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_problems_difficulty ON problems(difficulty);
CREATE INDEX IF NOT EXISTS idx_problems_tags ON problems USING GIN(tags);
CREATE UNIQUE INDEX IF NOT EXISTS idx_problems_slug ON problems(slug);

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER problems_updated_at
  BEFORE UPDATE ON problems
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
