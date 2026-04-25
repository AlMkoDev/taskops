-- AgriReports Platform - Seed Data for Testing
-- This file populates the database with sample data for development and testing
-- Run AFTER migration 005_agrireports_formal_schema.sql

-- ============================================================
-- 1. SEED USERS
-- ============================================================

-- Insert users (password hash is "password123" for all test users)
-- In production, use proper bcrypt hashing
INSERT INTO agri_users (id, name, email, phone, password_hash, role, farm_role, category, wa_opt_in, status)
VALUES
  -- Admin User
  ('11111111-1111-1111-1111-111111111111', 
   'Admin User', 
   'admin@agrireports.com', 
   '+27123456789',
   '$2a$10$abcdefghijklmnopqrstuvwx yz',  -- Replace with actual bcrypt hash
   'admin',
   'System Administrator',
   'Admin',
   TRUE,
   'active'),
  
  -- Farm Manager
  ('22222222-2222-2222-2222-222222222222',
   'John Mokoena',
   'john.mokoena@farm.co.za',
   '+27821234567',
   '$2a$10$abcdefghijklmnopqrstuvwx yz',
   'manager',
   'Farm Manager',
   'Management',
   TRUE,
   'active'),
  
  -- Field Operations Manager
  ('33333333-3333-3333-3333-333333333333',
   'Sarah van der Merwe',
   'sarah.vdm@farm.co.za',
   '+27831234568',
   '$2a$10$abcdefghijklmnopqrstuvwx yz',
   'reviewer',
   'Field Operations Manager',
   'Field Ops',
   TRUE,
   'active'),
  
  -- Field Staff 1
  ('44444444-4444-4444-4444-444444444444',
   'Thabo Ndlovu',
   'thabo.ndlovu@farm.co.za',
   '+27841234569',
   '$2a$10$abcdefghijklmnopqrstuvwx yz',
   'field_staff',
   'Field Supervisor',
   'Field Ops',
   FALSE,
   'active'),
  
  -- Field Staff 2
  ('55555555-5555-5555-5555-555555555555',
   'Maria Botha',
   'maria.both@farm.co.za',
   '+27851234570',
   '$2a$10$abcdefghijklmnopqrstuvwx yz',
   'field_staff',
   'Irrigation Technician',
   'Technical',
   TRUE,
   'active'),
  
  -- Post-Harvest Supervisor
  ('66666666-6666-6666-6666-666666666666',
   'Pieter Steyn',
   'pieter.steyn@farm.co.za',
   '+27861234571',
   '$2a$10$abcdefghijklmnopqrstuvwx yz',
   'supervisor',
   'Post-Harvest Supervisor',
   'Post-Harvest',
   TRUE,
   'active'),
  
  -- Logistics Coordinator
  ('77777777-7777-7777-7777-777777777777',
   'Nomsa Khumalo',
   'nomsa.khumalo@farm.co.za',
   '+27871234572',
   '$2a$10$abcdefghijklmnopqrstuvwx yz',
   'field_staff',
   'Logistics Coordinator',
   'Logistics',
   FALSE,
   'active')
ON CONFLICT (email) DO NOTHING;

-- ============================================================
-- 2. SEED REPORTS
-- ============================================================

INSERT INTO agri_reports (
  id, period, role, role_name, category, reporting_window,
  status, author_id, author_name, author_email,
  reviewer_id, reviewer_name, reviewer_email,
  title, data, signature, review_comments,
  submitted_at, reviewed_at, created_at, updated_at
)
VALUES
  -- Draft Report
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
   'daily', 'field_ops_manager', 'Field Operations Manager', 'Field Ops', '21 Apr 2026',
   'draft', 
   '44444444-4444-4444-4444-444444444444', 'Thabo Ndlovu', 'thabo.ndlovu@farm.co.za',
   '33333333-3333-3333-3333-333333333333', 'Sarah van der Merwe', 'sarah.vdm@farm.co.za',
   'Daily Field Operations Manager Report',
   '{"executive_summary": "<p>All operations running smoothly</p>", "variance_root_cause": "", "corrective_actions": ""}'::jsonb,
   NULL, NULL,
   NULL, NULL,
   NOW() - INTERVAL '2 hours', NOW() - INTERVAL '2 hours'),
  
  -- Submitted Report (Awaiting Review)
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
   'daily', 'irrigation_tech', 'Irrigation Technician', 'Technical', '21 Apr 2026',
   'submitted',
   '55555555-5555-5555-5555-555555555555', 'Maria Botha', 'maria.botha@farm.co.za',
   '33333333-3333-3333-3333-333333333333', 'Sarah van der Merwe', 'sarah.vdm@farm.co.za',
   'Daily Irrigation Technician Report',
   '{"executive_summary": "<p>Irrigation systems operational</p>", "variance_root_cause": "<p>Minor pressure drop in Zone 3</p>", "corrective_actions": "Scheduled maintenance for Zone 3"}'::jsonb,
   'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
   NULL,
   NOW() - INTERVAL '1 hour', NULL,
   NOW() - INTERVAL '3 hours', NOW() - INTERVAL '1 hour'),
  
  -- Approved Report
  ('cccccccc-cccc-cccc-cccc-cccccccccccc',
   'weekly', 'farm_manager', 'Farm Manager', 'Management', 'Week 16, 2026',
   'approved',
   '22222222-2222-2222-2222-222222222222', 'John Mokoena', 'john.mokoena@farm.co.za',
   '11111111-1111-1111-1111-111111111111', 'Admin User', 'admin@agrireports.com',
   'Weekly Farm Manager Report',
   '{"executive_summary": "<p>Excellent week overall</p>", "variance_root_cause": "", "corrective_actions": ""}'::jsonb,
   'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
   'All metrics within acceptable ranges. Great work!',
   NOW() - INTERVAL '2 days', NOW() - INTERVAL '1 day',
   NOW() - INTERVAL '3 days', NOW() - INTERVAL '1 day'),
  
  -- Rejected Report
  ('dddddddd-dddd-dddd-dddd-dddddddddddd',
   'daily', 'post_harvest_supervisor', 'Post-Harvest Supervisor', 'Post-Harvest', '20 Apr 2026',
   'rejected',
   '66666666-6666-6666-6666-666666666666', 'Pieter Steyn', 'pieter.steyn@farm.co.za',
   '22222222-2222-2222-2222-222222222222', 'John Mokoena', 'john.mokoena@farm.co.za',
   'Daily Post-Harvest Supervisor Report',
   '{"executive_summary": "<p>Processing completed</p>", "variance_root_cause": "", "corrective_actions": ""}'::jsonb,
   'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
   'Incomplete data. Missing temperature logs for cold storage units 2 and 3.',
   NOW() - INTERVAL '1 day', NOW() - INTERVAL '20 hours',
   NOW() - INTERVAL '2 days', NOW() - INTERVAL '20 hours'),
  
  -- Changes Requested Report
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
   'monthly', 'logistics_coordinator', 'Logistics Coordinator', 'Logistics', 'April 2026',
   'changes_requested',
   '77777777-7777-7777-7777-777777777777', 'Nomsa Khumalo', 'nomsa.khumalo@farm.co.za',
   '22222222-2222-2222-2222-222222222222', 'John Mokoena', 'john.mokoena@farm.co.za',
   'Monthly Logistics Coordinator Report',
   '{"executive_summary": "<p>Delivery schedules updated</p>", "variance_root_cause": "", "corrective_actions": ""}'::jsonb,
   'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
   'Please add fuel consumption data and vehicle maintenance records.',
   NOW() - INTERVAL '5 days', NOW() - INTERVAL '4 days',
   NOW() - INTERVAL '6 days', NOW() - INTERVAL '4 days')
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 3. SEED AUDIT LOG ENTRIES
-- ============================================================

INSERT INTO agri_report_audit_log (report_id, actor_id, actor_name, action, from_status, to_status, details)
VALUES
  -- Report aaaaaaaa (Draft - only created)
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
   '44444444-4444-4444-4444-444444444444', 'Thabo Ndlovu',
   'created', NULL, 'draft',
   'Report created'),
  
  -- Report bbbbbbbb (Submitted)
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
   '55555555-5555-5555-5555-555555555555', 'Maria Botha',
   'created', NULL, 'draft',
   'Report created'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
   '55555555-5555-5555-5555-555555555555', 'Maria Botha',
   'submitted', 'draft', 'submitted',
   'Report submitted for review'),
  
  -- Report cccccccc (Approved)
  ('cccccccc-cccc-cccc-cccc-cccccccccccc',
   '22222222-2222-2222-2222-222222222222', 'John Mokoena',
   'created', NULL, 'draft',
   'Report created'),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc',
   '22222222-2222-2222-2222-222222222222', 'John Mokoena',
   'submitted', 'draft', 'submitted',
   'Report submitted for review'),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc',
   '11111111-1111-1111-1111-111111111111', 'Admin User',
   'approved', 'submitted', 'approved',
   'Report approved: All metrics within acceptable ranges'),
  
  -- Report dddddddd (Rejected)
  ('dddddddd-dddd-dddd-dddd-dddddddddddd',
   '66666666-6666-6666-6666-666666666666', 'Pieter Steyn',
   'created', NULL, 'draft',
   'Report created'),
  ('dddddddd-dddd-dddd-dddd-dddddddddddd',
   '66666666-6666-6666-6666-666666666666', 'Pieter Steyn',
   'submitted', 'draft', 'submitted',
   'Report submitted for review'),
  ('dddddddd-dddd-dddd-dddd-dddddddddddd',
   '22222222-2222-2222-2222-222222222222', 'John Mokoena',
   'rejected', 'submitted', 'rejected',
   'Report rejected: Incomplete data'),
  
  -- Report eeeeeeee (Changes Requested)
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
   '77777777-7777-7777-7777-777777777777', 'Nomsa Khumalo',
   'created', NULL, 'draft',
   'Report created'),
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
   '77777777-7777-7777-7777-777777777777', 'Nomsa Khumalo',
   'submitted', 'draft', 'submitted',
   'Report submitted for review'),
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
   '22222222-2222-2222-2222-222222222222', 'John Mokoena',
   'changes_requested', 'submitted', 'changes_requested',
   'Changes requested: Add fuel consumption data')
ON CONFLICT DO NOTHING;

-- ============================================================
-- 4. SEED NOTIFICATIONS
-- ============================================================

INSERT INTO agri_notifications (report_id, recipient_id, recipient_name, recipient_email, recipient_phone, channel, event, message, status, wa_message_id)
VALUES
  -- Notifications for report bbbbbbbb (Submitted)
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
   '33333333-3333-3333-3333-333333333333', 'Sarah van der Merwe', 'sarah.vdm@farm.co.za', '+27831234568',
   'email', 'report_submitted',
   'Daily Irrigation Technician Report is ready for review',
   'sent', NULL),
  
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
   '33333333-3333-3333-3333-333333333333', 'Sarah van der Merwe', 'sarah.vdm@farm.co.za', '+27831234568',
   'whatsapp', 'report_submitted',
   '📋 New Report Submitted: Daily Irrigation Technician Report',
   'delivered', 'wamid.HBgLMjE3ODMxMjM0NTY4'),
  
  -- Notifications for report cccccccc (Approved)
  ('cccccccc-cccc-cccc-cccc-cccccccccccc',
   '22222222-2222-2222-2222-222222222222', 'John Mokoena', 'john.mokoena@farm.co.za', '+27821234567',
   'email', 'report_approved',
   'Weekly Farm Manager Report has been approved',
   'sent', NULL),
  
  ('cccccccc-cccc-cccc-cccc-cccccccccccc',
   '22222222-2222-2222-2222-222222222222', 'John Mokoena', 'john.mokoena@farm.co.za', '+27821234567',
   'whatsapp', 'report_approved',
   '✅ Report APPROVED: Weekly Farm Manager Report',
   'read', 'wamid.HBgLMjE3ODIxMjM0NTY3')
ON CONFLICT DO NOTHING;

-- ============================================================
-- 5. SEED WHATSAPP MESSAGES
-- ============================================================

INSERT INTO agri_whatsapp_messages (report_id, recipient_phone, wa_message_id, message_type, template_name, message_body, status, sent_at, delivered_at)
VALUES
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
   '+27831234568',
   'wamid.HBgLMjE3ODMxMjM0NTY4',
   'template',
   'agri_report_submitted',
   '📋 New Report Submitted

📅 Period: DAILY
👤 Role: Irrigation Technician
📝 Submitted by: Maria Botha
🗓️ Window: 21 Apr 2026

🔗 Review: http://localhost:3000/reports/bbbbbbbb',
   'delivered',
   NOW() - INTERVAL '59 minutes',
   NOW() - INTERVAL '58 minutes'),
  
  ('cccccccc-cccc-cccc-cccc-cccccccccccc',
   '+27821234567',
   'wamid.HBgLMjE3ODIxMjM0NTY3',
   'template',
   'agri_report_reviewed',
   '✅ Report APPROVED

📄 Report: Weekly Farm Manager Report
🆔 ID: cccccccc
👨‍💼 Reviewer: Admin User
💬 Comments: All metrics within acceptable ranges. Great work!',
   'read',
   NOW() - INTERVAL '23 hours',
   NOW() - INTERVAL '22 hours',
   NOW() - INTERVAL '20 hours')
ON CONFLICT (wa_message_id) DO NOTHING;

-- ============================================================
-- 6. SEED ACTIVITY LOG
-- ============================================================

INSERT INTO agri_report_activity (report_id, user_id, user_name, activity_type, title, description)
VALUES
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
   '55555555-5555-5555-5555-555555555555', 'Maria Botha',
   'status_change',
   'Report Submitted',
   'Maria Botha submitted the report for review'),
  
  ('cccccccc-cccc-cccc-cccc-cccccccccccc',
   '11111111-1111-1111-1111-111111111111', 'Admin User',
   'status_change',
   'Report Approved',
   'Admin User approved the report'),
  
  ('dddddddd-dddd-dddd-dddd-dddddddddddd',
   '22222222-2222-2222-2222-222222222222', 'John Mokoena',
   'status_change',
   'Report Rejected',
   'John Mokoena rejected the report with comments')
ON CONFLICT DO NOTHING;

-- ============================================================
-- Verify Seed Data
-- ============================================================

DO $$
DECLARE
  user_count INTEGER;
  report_count INTEGER;
  audit_count INTEGER;
  notif_count INTEGER;
  wa_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO user_count FROM agri_users;
  SELECT COUNT(*) INTO report_count FROM agri_reports;
  SELECT COUNT(*) INTO audit_count FROM agri_report_audit_log;
  SELECT COUNT(*) INTO notif_count FROM agri_notifications;
  SELECT COUNT(*) INTO wa_count FROM agri_whatsapp_messages;
  
  RAISE NOTICE '✅ Seed data inserted successfully';
  RAISE NOTICE '👤 Users: %', user_count;
  RAISE NOTICE '📄 Reports: %', report_count;
  RAISE NOTICE '📝 Audit Entries: %', audit_count;
  RAISE NOTICE '📧 Notifications: %', notif_count;
  RAISE NOTICE '📱 WhatsApp Messages: %', wa_count;
END $$;
