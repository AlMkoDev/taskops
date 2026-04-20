CREATE TABLE IF NOT EXISTS auth_users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  role TEXT NOT NULL,
  team TEXT NOT NULL,
  status TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS auth_sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL
);

ALTER TABLE reports
  ADD COLUMN IF NOT EXISTS author_id TEXT REFERENCES auth_users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS reviewer_id TEXT REFERENCES auth_users(id) ON DELETE SET NULL;

ALTER TABLE report_audit_entries
  ADD COLUMN IF NOT EXISTS actor_id TEXT REFERENCES auth_users(id) ON DELETE SET NULL;

ALTER TABLE report_notification_entries
  ADD COLUMN IF NOT EXISTS recipient_user_id TEXT REFERENCES auth_users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_auth_users_email ON auth_users(lower(email));
CREATE INDEX IF NOT EXISTS idx_auth_sessions_token ON auth_sessions(token);
CREATE INDEX IF NOT EXISTS idx_reports_author_id ON reports(author_id);
CREATE INDEX IF NOT EXISTS idx_reports_reviewer_id ON reports(reviewer_id);
CREATE INDEX IF NOT EXISTS idx_report_audit_entries_actor_id ON report_audit_entries(actor_id);
CREATE INDEX IF NOT EXISTS idx_report_notification_entries_recipient_user_id ON report_notification_entries(recipient_user_id);

