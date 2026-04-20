CREATE TABLE IF NOT EXISTS reports (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  period TEXT NOT NULL,
  role_id TEXT NOT NULL,
  role_name TEXT NOT NULL,
  category TEXT NOT NULL,
  status TEXT NOT NULL,
  author_name TEXT NOT NULL,
  reviewer_name TEXT NOT NULL,
  reporting_window TEXT NOT NULL,
  submitted_at TIMESTAMPTZ,
  reviewed_at TIMESTAMPTZ,
  last_saved_at TIMESTAMPTZ,
  signature TEXT,
  reviewer_signature TEXT,
  review_comments TEXT,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS report_audit_entries (
  id TEXT PRIMARY KEY,
  report_id TEXT NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  actor_name TEXT NOT NULL,
  details TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS report_notification_entries (
  id TEXT PRIMARY KEY,
  report_id TEXT NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
  channel TEXT NOT NULL,
  event TEXT NOT NULL,
  recipient_name TEXT NOT NULL,
  status TEXT NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status);
CREATE INDEX IF NOT EXISTS idx_reports_period ON reports(period);
CREATE INDEX IF NOT EXISTS idx_report_audit_entries_report_id ON report_audit_entries(report_id);
CREATE INDEX IF NOT EXISTS idx_report_notification_entries_report_id ON report_notification_entries(report_id);
