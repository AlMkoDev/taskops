-- AgriReports session storage
-- Migration 007: move active report auth sessions onto Agri-native identity tables

CREATE TABLE IF NOT EXISTS agri_sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES agri_users(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_agri_sessions_token ON agri_sessions(token);
CREATE INDEX IF NOT EXISTS idx_agri_sessions_user_id ON agri_sessions(user_id);
