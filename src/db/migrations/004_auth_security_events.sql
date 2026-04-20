CREATE TABLE IF NOT EXISTS auth_audit_entries (
  id TEXT PRIMARY KEY,
  report_id TEXT NOT NULL,
  action TEXT NOT NULL,
  actor_id TEXT REFERENCES auth_users(id) ON DELETE SET NULL,
  actor_name TEXT NOT NULL,
  details TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS auth_notification_entries (
  id TEXT PRIMARY KEY,
  report_id TEXT NOT NULL,
  channel TEXT NOT NULL,
  event TEXT NOT NULL,
  recipient_user_id TEXT REFERENCES auth_users(id) ON DELETE SET NULL,
  recipient_name TEXT NOT NULL,
  status TEXT NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_auth_audit_entries_actor_id ON auth_audit_entries(actor_id);
CREATE INDEX IF NOT EXISTS idx_auth_audit_entries_created_at ON auth_audit_entries(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_auth_notification_entries_recipient_user_id ON auth_notification_entries(recipient_user_id);
CREATE INDEX IF NOT EXISTS idx_auth_notification_entries_created_at ON auth_notification_entries(created_at DESC);
