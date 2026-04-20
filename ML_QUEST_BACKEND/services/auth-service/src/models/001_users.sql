CREATE TABLE users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username      VARCHAR(50)  UNIQUE NOT NULL,
  email         VARCHAR(255) UNIQUE NOT NULL,
  password_hash TEXT,
  oauth_provider VARCHAR(20),
  oauth_id      TEXT,
  tier          VARCHAR(10) NOT NULL DEFAULT 'free' CHECK (tier IN ('free','premium')),
  role          VARCHAR(10) NOT NULL DEFAULT 'user' CHECK (role IN ('admin','editor','user')),
  is_active     BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_users_email    ON users(email);
CREATE INDEX idx_users_username ON users(username);
