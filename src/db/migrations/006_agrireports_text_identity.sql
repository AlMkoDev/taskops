-- AgriReports identity compatibility
-- Migration 006: align Agri tables with existing string-based app IDs

ALTER TABLE agri_users
  ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN NOT NULL DEFAULT FALSE;

DROP VIEW IF EXISTS v_pending_reviews;
DROP VIEW IF EXISTS v_reports_full;
DROP VIEW IF EXISTS v_notification_stats;

ALTER TABLE agri_report_activity DROP CONSTRAINT IF EXISTS agri_report_activity_report_id_fkey;
ALTER TABLE agri_report_activity DROP CONSTRAINT IF EXISTS agri_report_activity_user_id_fkey;
ALTER TABLE agri_whatsapp_messages DROP CONSTRAINT IF EXISTS agri_whatsapp_messages_report_id_fkey;
ALTER TABLE agri_whatsapp_messages DROP CONSTRAINT IF EXISTS agri_whatsapp_messages_notification_id_fkey;
ALTER TABLE agri_notifications DROP CONSTRAINT IF EXISTS agri_notifications_report_id_fkey;
ALTER TABLE agri_notifications DROP CONSTRAINT IF EXISTS agri_notifications_recipient_id_fkey;
ALTER TABLE agri_report_audit_log DROP CONSTRAINT IF EXISTS agri_report_audit_log_report_id_fkey;
ALTER TABLE agri_report_audit_log DROP CONSTRAINT IF EXISTS agri_report_audit_log_actor_id_fkey;
ALTER TABLE agri_reports DROP CONSTRAINT IF EXISTS agri_reports_author_id_fkey;
ALTER TABLE agri_reports DROP CONSTRAINT IF EXISTS agri_reports_reviewer_id_fkey;

ALTER TABLE agri_report_activity ALTER COLUMN id DROP DEFAULT;
ALTER TABLE agri_report_activity ALTER COLUMN report_id TYPE TEXT USING report_id::text;
ALTER TABLE agri_report_activity ALTER COLUMN user_id TYPE TEXT USING user_id::text;
ALTER TABLE agri_report_activity ALTER COLUMN id TYPE TEXT USING id::text;

ALTER TABLE agri_whatsapp_messages ALTER COLUMN id DROP DEFAULT;
ALTER TABLE agri_whatsapp_messages ALTER COLUMN report_id TYPE TEXT USING report_id::text;
ALTER TABLE agri_whatsapp_messages ALTER COLUMN notification_id TYPE TEXT USING notification_id::text;
ALTER TABLE agri_whatsapp_messages ALTER COLUMN id TYPE TEXT USING id::text;

ALTER TABLE agri_notifications ALTER COLUMN id DROP DEFAULT;
ALTER TABLE agri_notifications ALTER COLUMN report_id TYPE TEXT USING report_id::text;
ALTER TABLE agri_notifications ALTER COLUMN recipient_id TYPE TEXT USING recipient_id::text;
ALTER TABLE agri_notifications ALTER COLUMN id TYPE TEXT USING id::text;

ALTER TABLE agri_report_audit_log ALTER COLUMN id DROP DEFAULT;
ALTER TABLE agri_report_audit_log ALTER COLUMN report_id TYPE TEXT USING report_id::text;
ALTER TABLE agri_report_audit_log ALTER COLUMN actor_id TYPE TEXT USING actor_id::text;
ALTER TABLE agri_report_audit_log ALTER COLUMN id TYPE TEXT USING id::text;

ALTER TABLE agri_reports ALTER COLUMN id DROP DEFAULT;
ALTER TABLE agri_reports ALTER COLUMN author_id TYPE TEXT USING author_id::text;
ALTER TABLE agri_reports ALTER COLUMN reviewer_id TYPE TEXT USING reviewer_id::text;
ALTER TABLE agri_reports ALTER COLUMN id TYPE TEXT USING id::text;

ALTER TABLE agri_users ALTER COLUMN id DROP DEFAULT;
ALTER TABLE agri_users ALTER COLUMN id TYPE TEXT USING id::text;

ALTER TABLE agri_reports
  ADD CONSTRAINT agri_reports_author_id_fkey
    FOREIGN KEY (author_id) REFERENCES agri_users(id) ON DELETE CASCADE,
  ADD CONSTRAINT agri_reports_reviewer_id_fkey
    FOREIGN KEY (reviewer_id) REFERENCES agri_users(id) ON DELETE SET NULL;

ALTER TABLE agri_report_audit_log
  ADD CONSTRAINT agri_report_audit_log_report_id_fkey
    FOREIGN KEY (report_id) REFERENCES agri_reports(id) ON DELETE CASCADE,
  ADD CONSTRAINT agri_report_audit_log_actor_id_fkey
    FOREIGN KEY (actor_id) REFERENCES agri_users(id) ON DELETE SET NULL;

ALTER TABLE agri_notifications
  ADD CONSTRAINT agri_notifications_report_id_fkey
    FOREIGN KEY (report_id) REFERENCES agri_reports(id) ON DELETE CASCADE,
  ADD CONSTRAINT agri_notifications_recipient_id_fkey
    FOREIGN KEY (recipient_id) REFERENCES agri_users(id) ON DELETE SET NULL;

ALTER TABLE agri_whatsapp_messages
  ADD CONSTRAINT agri_whatsapp_messages_report_id_fkey
    FOREIGN KEY (report_id) REFERENCES agri_reports(id) ON DELETE SET NULL,
  ADD CONSTRAINT agri_whatsapp_messages_notification_id_fkey
    FOREIGN KEY (notification_id) REFERENCES agri_notifications(id) ON DELETE SET NULL;

ALTER TABLE agri_report_activity
  ADD CONSTRAINT agri_report_activity_report_id_fkey
    FOREIGN KEY (report_id) REFERENCES agri_reports(id) ON DELETE CASCADE,
  ADD CONSTRAINT agri_report_activity_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES agri_users(id) ON DELETE SET NULL;

CREATE OR REPLACE VIEW v_reports_full AS
SELECT
  r.id,
  r.period,
  r.role,
  r.role_name,
  r.category,
  r.reporting_window,
  r.status,
  r.author_id,
  r.author_name,
  r.author_email,
  r.reviewer_id,
  r.reviewer_name,
  r.reviewer_email,
  r.title,
  r.data,
  r.signature,
  r.reviewer_signature,
  r.review_comments,
  r.submitted_at,
  r.reviewed_at,
  r.last_saved_at,
  r.created_at,
  r.updated_at,
  au.email AS author_email_from_profile,
  au.phone AS author_phone,
  au.role AS author_role,
  ru.email AS reviewer_email_from_profile,
  ru.phone AS reviewer_phone,
  ru.role AS reviewer_role
FROM agri_reports r
LEFT JOIN agri_users au ON r.author_id = au.id
LEFT JOIN agri_users ru ON r.reviewer_id = ru.id;

CREATE OR REPLACE VIEW v_pending_reviews AS
SELECT
  r.id,
  r.period,
  r.role,
  r.role_name,
  r.category,
  r.reporting_window,
  r.status,
  r.author_id,
  r.author_name,
  r.author_email,
  r.reviewer_id,
  r.reviewer_name,
  r.reviewer_email,
  r.title,
  r.data,
  r.signature,
  r.reviewer_signature,
  r.review_comments,
  r.submitted_at,
  r.reviewed_at,
  r.last_saved_at,
  r.created_at,
  r.updated_at,
  ru.name AS assigned_reviewer_name,
  ru.email AS assigned_reviewer_email
FROM agri_reports r
JOIN agri_users au ON r.author_id = au.id
LEFT JOIN agri_users ru ON r.reviewer_id = ru.id
WHERE r.status = 'submitted'
ORDER BY r.submitted_at ASC;

CREATE OR REPLACE VIEW v_notification_stats AS
SELECT
  channel,
  status,
  COUNT(*) AS count,
  COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (PARTITION BY channel) AS percentage
FROM agri_notifications
GROUP BY channel, status;
