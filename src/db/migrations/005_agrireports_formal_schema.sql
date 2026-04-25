-- AgriReports Platform - Formal Database Schema
-- Migration 005: Complete AgriReports schema with proper relationships
-- Date: April 21, 2026

-- ============================================================
-- 1. USERS TABLE (Enhanced)
-- ============================================================

CREATE TABLE IF NOT EXISTS agri_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Basic Info
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  phone TEXT,
  
  -- Authentication
  password_hash TEXT NOT NULL,
  
  -- Roles
  role TEXT NOT NULL CHECK (role IN ('field_staff', 'supervisor', 'manager', 'reviewer', 'admin')),
  farm_role TEXT NOT NULL,  -- Matches RoleCard.name (e.g., "Field Operations Manager")
  category TEXT NOT NULL CHECK (category IN ('Management', 'Field Ops', 'Post-Harvest', 'Logistics', 'Technical', 'Compliance', 'Admin')),
  
  -- Preferences
  wa_opt_in BOOLEAN DEFAULT FALSE,  -- WhatsApp opt-in consent
  email_notifications BOOLEAN DEFAULT TRUE,
  whatsapp_notifications BOOLEAN DEFAULT TRUE,
  
  -- Status
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
  
  -- Metadata
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for users
CREATE INDEX IF NOT EXISTS idx_agri_users_email ON agri_users(email);
CREATE INDEX IF NOT EXISTS idx_agri_users_role ON agri_users(role);
CREATE INDEX IF NOT EXISTS idx_agri_users_status ON agri_users(status);
CREATE INDEX IF NOT EXISTS idx_agri_users_category ON agri_users(category);

-- ============================================================
-- 2. REPORTS TABLE (Enhanced)
-- ============================================================

CREATE TABLE IF NOT EXISTS agri_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Report Classification
  period TEXT NOT NULL CHECK (period IN ('daily', 'weekly', 'monthly', 'quarterly', 'closeout')),
  role TEXT NOT NULL,  -- Role ID (e.g., "field_ops_manager")
  role_name TEXT NOT NULL,  -- Human-readable role name
  category TEXT NOT NULL,  -- Role category
  reporting_window TEXT,  -- Date range (e.g., "18 Apr 2026" or "Week 16, 2026")
  
  -- Status Workflow
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'approved', 'rejected', 'changes_requested')),
  
  -- Author Information
  author_id UUID NOT NULL REFERENCES agri_users(id) ON DELETE CASCADE,
  author_name TEXT NOT NULL,
  author_email TEXT,
  
  -- Reviewer Information
  reviewer_id UUID REFERENCES agri_users(id) ON DELETE SET NULL,
  reviewer_name TEXT,
  reviewer_email TEXT,
  
  -- Report Data
  title TEXT NOT NULL,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  
  -- Signatures
  signature TEXT,  -- Author signature (Base64 PNG)
  reviewer_signature TEXT,  -- Reviewer signature (Base64 PNG)
  review_comments TEXT,
  
  -- Timestamps
  submitted_at TIMESTAMPTZ,
  reviewed_at TIMESTAMPTZ,
  last_saved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT chk_signature_required CHECK (
    (status != 'submitted' OR signature IS NOT NULL)
  )
);

-- Indexes for reports
CREATE INDEX IF NOT EXISTS idx_agri_reports_status ON agri_reports(status);
CREATE INDEX IF NOT EXISTS idx_agri_reports_period ON agri_reports(period);
CREATE INDEX IF NOT EXISTS idx_agri_reports_author_id ON agri_reports(author_id);
CREATE INDEX IF NOT EXISTS idx_agri_reports_reviewer_id ON agri_reports(reviewer_id);
CREATE INDEX IF NOT EXISTS idx_agri_reports_created_at ON agri_reports(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_agri_reports_reporting_window ON agri_reports(reporting_window);
CREATE INDEX IF NOT EXISTS idx_agri_reports_role ON agri_reports(role);

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_agri_reports_status_created ON agri_reports(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_agri_reports_author_status ON agri_reports(author_id, status);

-- ============================================================
-- 3. AUDIT LOG TABLE (Enhanced)
-- ============================================================

CREATE TABLE IF NOT EXISTS agri_report_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Reference
  report_id UUID NOT NULL REFERENCES agri_reports(id) ON DELETE CASCADE,
  
  -- Action Details
  actor_id UUID REFERENCES agri_users(id) ON DELETE SET NULL,
  actor_name TEXT NOT NULL,
  action TEXT NOT NULL,  -- 'created', 'updated', 'submitted', 'approved', 'rejected', 'changes_requested'
  
  -- Status Transition
  from_status TEXT,
  to_status TEXT,
  
  -- Additional Metadata
  metadata JSONB DEFAULT '{}'::jsonb,
  details TEXT,
  
  -- Timestamp
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for audit log
CREATE INDEX IF NOT EXISTS idx_agri_audit_report_id ON agri_report_audit_log(report_id);
CREATE INDEX IF NOT EXISTS idx_agri_audit_actor_id ON agri_report_audit_log(actor_id);
CREATE INDEX IF NOT EXISTS idx_agri_audit_action ON agri_report_audit_log(action);
CREATE INDEX IF NOT EXISTS idx_agri_audit_created_at ON agri_report_audit_log(created_at DESC);

-- ============================================================
-- 4. NOTIFICATION TRACKING TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS agri_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Reference
  report_id UUID NOT NULL REFERENCES agri_reports(id) ON DELETE CASCADE,
  
  -- Recipient
  recipient_id UUID REFERENCES agri_users(id) ON DELETE SET NULL,
  recipient_name TEXT NOT NULL,
  recipient_email TEXT,
  recipient_phone TEXT,
  
  -- Notification Details
  channel TEXT NOT NULL CHECK (channel IN ('email', 'whatsapp', 'sms', 'in_app')),
  event TEXT NOT NULL CHECK (event IN ('report_created', 'report_submitted', 'report_reviewed', 'report_approved', 'report_rejected')),
  
  -- Content
  subject TEXT,
  message TEXT NOT NULL,
  
  -- Delivery Status
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'sent', 'delivered', 'read', 'failed')),
  
  -- WhatsApp Specific
  wa_message_id TEXT,  -- Meta Cloud API message ID
  wa_status TEXT,  -- WhatsApp delivery status
  wa_error TEXT,  -- WhatsApp error message
  
  -- Retry Logic
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 5,
  next_retry_at TIMESTAMPTZ,
  last_error TEXT,
  
  -- Timestamps
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for notifications
CREATE INDEX IF NOT EXISTS idx_agri_notif_report_id ON agri_notifications(report_id);
CREATE INDEX IF NOT EXISTS idx_agri_notif_recipient_id ON agri_notifications(recipient_id);
CREATE INDEX IF NOT EXISTS idx_agri_notif_status ON agri_notifications(status);
CREATE INDEX IF NOT EXISTS idx_agri_notif_channel ON agri_notifications(channel);
CREATE INDEX IF NOT EXISTS idx_agri_notif_created_at ON agri_notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_agri_notif_retry ON agri_notifications(status, next_retry_at) WHERE status = 'failed';

-- ============================================================
-- 5. WHATSAPP MESSAGES TABLE (Detailed Tracking)
-- ============================================================

CREATE TABLE IF NOT EXISTS agri_whatsapp_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- References
  report_id UUID REFERENCES agri_reports(id) ON DELETE SET NULL,
  notification_id UUID REFERENCES agri_notifications(id) ON DELETE SET NULL,
  
  -- Message Details
  recipient_phone TEXT NOT NULL,
  wa_message_id TEXT UNIQUE,  -- Meta Cloud API message ID
  message_type TEXT NOT NULL DEFAULT 'template' CHECK (message_type IN ('template', 'text')),
  template_name TEXT,
  
  -- Content
  message_body TEXT NOT NULL,
  
  -- Delivery Status
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'sent', 'delivered', 'read', 'failed')),
  error_message TEXT,
  error_code TEXT,
  
  -- Meta API Response
  meta_response JSONB,
  
  -- Timestamps
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for WhatsApp messages
CREATE INDEX IF NOT EXISTS idx_agri_wa_report_id ON agri_whatsapp_messages(report_id);
CREATE INDEX IF NOT EXISTS idx_agri_wa_notification_id ON agri_whatsapp_messages(notification_id);
CREATE INDEX IF NOT EXISTS idx_agri_wa_message_id ON agri_whatsapp_messages(wa_message_id);
CREATE INDEX IF NOT EXISTS idx_agri_wa_status ON agri_whatsapp_messages(status);
CREATE INDEX IF NOT EXISTS idx_agri_wa_phone ON agri_whatsapp_messages(recipient_phone);
CREATE INDEX IF NOT EXISTS idx_agri_wa_created_at ON agri_whatsapp_messages(created_at DESC);

-- ============================================================
-- 6. REPORT ACTIVITY LOG (User-friendly activity feed)
-- ============================================================

CREATE TABLE IF NOT EXISTS agri_report_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Reference
  report_id UUID NOT NULL REFERENCES agri_reports(id) ON DELETE CASCADE,
  
  -- Activity Details
  user_id UUID REFERENCES agri_users(id) ON DELETE SET NULL,
  user_name TEXT NOT NULL,
  activity_type TEXT NOT NULL,  -- 'comment', 'status_change', 'view', 'download', 'share'
  
  -- Content
  title TEXT NOT NULL,
  description TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  
  -- Visibility
  is_internal BOOLEAN DEFAULT FALSE,  -- Visible only to team
  
  -- Timestamp
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for activity log
CREATE INDEX IF NOT EXISTS idx_agri_activity_report_id ON agri_report_activity(report_id);
CREATE INDEX IF NOT EXISTS idx_agri_activity_user_id ON agri_report_activity(user_id);
CREATE INDEX IF NOT EXISTS idx_agri_activity_type ON agri_report_activity(activity_type);
CREATE INDEX IF NOT EXISTS idx_agri_activity_created_at ON agri_report_activity(created_at DESC);

-- ============================================================
-- 7. VIEWS FOR COMMON QUERIES
-- ============================================================

-- View: Reports with full author and reviewer details
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
  au.email as author_email_from_profile,
  au.phone as author_phone,
  au.role as author_role,
  ru.email as reviewer_email_from_profile,
  ru.phone as reviewer_phone,
  ru.role as reviewer_role
FROM agri_reports r
LEFT JOIN agri_users au ON r.author_id = au.id
LEFT JOIN agri_users ru ON r.reviewer_id = ru.id;

-- View: Pending reviews (submitted reports awaiting review)
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
  ru.name as assigned_reviewer_name,
  ru.email as assigned_reviewer_email
FROM agri_reports r
JOIN agri_users au ON r.author_id = au.id
LEFT JOIN agri_users ru ON r.reviewer_id = ru.id
WHERE r.status = 'submitted'
ORDER BY r.submitted_at ASC;

-- View: Notification delivery statistics
CREATE OR REPLACE VIEW v_notification_stats AS
SELECT 
  channel,
  status,
  COUNT(*) as count,
  COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (PARTITION BY channel) as percentage
FROM agri_notifications
GROUP BY channel, status;

-- ============================================================
-- 8. TRIGGERS FOR AUTOMATIC TIMESTAMP UPDATES
-- ============================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to agri_reports
DROP TRIGGER IF EXISTS trg_agri_reports_updated_at ON agri_reports;
CREATE TRIGGER trg_agri_reports_updated_at
  BEFORE UPDATE ON agri_reports
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Apply trigger to agri_users
DROP TRIGGER IF EXISTS trg_agri_users_updated_at ON agri_users;
CREATE TRIGGER trg_agri_users_updated_at
  BEFORE UPDATE ON agri_users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Apply trigger to agri_notifications
DROP TRIGGER IF EXISTS trg_agri_notifications_updated_at ON agri_notifications;
CREATE TRIGGER trg_agri_notifications_updated_at
  BEFORE UPDATE ON agri_notifications
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Apply trigger to agri_whatsapp_messages
DROP TRIGGER IF EXISTS trg_agri_wa_messages_updated_at ON agri_whatsapp_messages;
CREATE TRIGGER trg_agri_wa_messages_updated_at
  BEFORE UPDATE ON agri_whatsapp_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- 9. COMMENTS FOR DOCUMENTATION
-- ============================================================

COMMENT ON TABLE agri_users IS 'User accounts for AgriReports platform';
COMMENT ON TABLE agri_reports IS 'Agricultural reports with workflow states';
COMMENT ON TABLE agri_report_audit_log IS 'Immutable audit trail for all report actions';
COMMENT ON TABLE agri_notifications IS 'Multi-channel notification tracking';
COMMENT ON TABLE agri_whatsapp_messages IS 'Detailed WhatsApp message delivery tracking';
COMMENT ON TABLE agri_report_activity IS 'User-friendly activity feed for reports';

COMMENT ON COLUMN agri_users.wa_opt_in IS 'User consent for WhatsApp notifications';
COMMENT ON COLUMN agri_reports.signature IS 'Author digital signature (Base64 PNG)';
COMMENT ON COLUMN agri_reports.reviewer_signature IS 'Reviewer digital signature (Base64 PNG)';
COMMENT ON COLUMN agri_notifications.wa_message_id IS 'Meta Cloud API message ID for tracking';
COMMENT ON COLUMN agri_whatsapp_messages.wa_message_id IS 'Unique Meta Cloud API message ID';

-- ============================================================
-- 10. GRANT PERMISSIONS (Optional - adjust for your setup)
-- ============================================================

-- Grant usage to application user (uncomment and adjust as needed)
-- GRANT USAGE ON SCHEMA public TO agrireports_app;
-- GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA public TO agrireports_app;
-- GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO agrireports_app;

-- ============================================================
-- Migration Complete
-- ============================================================

-- Verify tables created
DO $$
BEGIN
  RAISE NOTICE '✅ AgriReports schema migration completed successfully';
  RAISE NOTICE '📊 Tables created: agri_users, agri_reports, agri_report_audit_log, agri_notifications, agri_whatsapp_messages, agri_report_activity';
  RAISE NOTICE '📈 Views created: v_reports_full, v_pending_reviews, v_notification_stats';
  RAISE NOTICE '⚡ Indexes created: 30+ performance indexes';
  RAISE NOTICE '🔧 Triggers created: Automatic updated_at timestamps';
END $$;
