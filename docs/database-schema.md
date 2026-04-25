# AgriReports Database Schema Documentation

## Overview

This document describes the formal PostgreSQL schema for the AgriReports platform, designed for production-grade agricultural reporting with audit trails, multi-channel notifications, and WhatsApp integration.

---

## Schema Architecture

### Entity Relationship Diagram

```
agri_users (1) ──────< (N) agri_reports (N) >────── (1) agri_users
   │                        │
   │                        │
   └────< (N) agri_report_audit_log
   │                        │
   │                        └────< (N) agri_notifications
   │                                     │
   │                                     └────< agri_whatsapp_messages
   │
   └────< (N) agri_report_activity
```

---

## Tables

### 1. `agri_users` - User Accounts

**Purpose:** Platform users with authentication and notification preferences.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK, DEFAULT gen_random_uuid() | Unique user ID |
| `name` | TEXT | NOT NULL | Full name |
| `email` | TEXT | UNIQUE, NOT NULL | Email address (login identifier) |
| `phone` | TEXT | | Phone number (E.164 format) |
| `password_hash` | TEXT | NOT NULL | Bcrypt hashed password |
| `role` | TEXT | NOT NULL, CHECK | Platform role (field_staff, supervisor, manager, reviewer, admin) |
| `farm_role` | TEXT | NOT NULL | Agricultural role name |
| `category` | TEXT | NOT NULL, CHECK | Role category (Management, Field Ops, Post-Harvest, Logistics, Technical, Compliance, Admin) |
| `wa_opt_in` | BOOLEAN | DEFAULT FALSE | WhatsApp notification consent |
| `email_notifications` | BOOLEAN | DEFAULT TRUE | Email notification preference |
| `whatsapp_notifications` | BOOLEAN | DEFAULT TRUE | WhatsApp notification preference |
| `status` | TEXT | NOT NULL, DEFAULT 'active' | Account status (active, inactive, suspended) |
| `last_login_at` | TIMESTAMPTZ | | Last successful login |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Account creation time |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Last update time (auto) |

**Indexes:**
- `idx_agri_users_email` - Fast email lookups (login)
- `idx_agri_users_role` - Role-based queries
- `idx_agri_users_status` - Active user filtering
- `idx_agri_users_category` - Category-based filtering

**Example:**
```sql
SELECT name, email, role, category
FROM agri_users
WHERE status = 'active' AND role = 'reviewer';
```

---

### 2. `agri_reports` - Agricultural Reports

**Purpose:** Core report entity with workflow states and digital signatures.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK, DEFAULT gen_random_uuid() | Unique report ID |
| `period` | TEXT | NOT NULL, CHECK | Report frequency (daily, weekly, monthly, quarterly, closeout) |
| `role` | TEXT | NOT NULL | Role ID (e.g., "field_ops_manager") |
| `role_name` | TEXT | NOT NULL | Human-readable role name |
| `category` | TEXT | NOT NULL | Role category |
| `reporting_window` | TEXT | | Date range (e.g., "21 Apr 2026" or "Week 16, 2026") |
| `status` | TEXT | NOT NULL, DEFAULT 'draft' | Workflow state (draft, submitted, approved, rejected, changes_requested) |
| `author_id` | UUID | NOT NULL, FK → agri_users.id | Report author |
| `author_name` | TEXT | NOT NULL | Author name (denormalized for performance) |
| `author_email` | TEXT | | Author email |
| `reviewer_id` | UUID | FK → agri_users.id | Assigned reviewer |
| `reviewer_name` | TEXT | | Reviewer name |
| `reviewer_email` | TEXT | | Reviewer email |
| `title` | TEXT | NOT NULL | Report title |
| `data` | JSONB | NOT NULL, DEFAULT '{}' | Report content (flexible schema) |
| `signature` | TEXT | | Author signature (Base64 PNG) |
| `reviewer_signature` | TEXT | | Reviewer signature (Base64 PNG) |
| `review_comments` | TEXT | | Reviewer feedback |
| `submitted_at` | TIMESTAMPTZ | | Submission timestamp |
| `reviewed_at` | TIMESTAMPTZ | | Review timestamp |
| `last_saved_at` | TIMESTAMPTZ | | Last auto-save |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Creation time |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Last update (auto) |

**Constraints:**
- `chk_signature_required`: Submitted reports MUST have author signature

**Indexes:**
- `idx_agri_reports_status` - Status filtering
- `idx_agri_reports_period` - Period-based queries
- `idx_agri_reports_author_id` - Author's reports
- `idx_agri_reports_reviewer_id` - Assigned reviews
- `idx_agri_reports_created_at DESC` - Recent reports
- `idx_agri_reports_reporting_window` - Window filtering
- `idx_agri_reports_role` - Role-based queries
- `idx_agri_reports_status_created` - Composite: Status + recency
- `idx_agri_reports_author_status` - Composite: Author's status breakdown

**Example Queries:**
```sql
-- Pending reviews
SELECT * FROM agri_reports
WHERE status = 'submitted'
ORDER BY submitted_at ASC;

-- Author's reports this month
SELECT * FROM agri_reports
WHERE author_id = 'uuid'
  AND created_at >= NOW() - INTERVAL '30 days';
```

---

### 3. `agri_report_audit_log` - Immutable Audit Trail

**Purpose:** Complete audit trail for compliance and traceability.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK, DEFAULT gen_random_uuid() | Unique entry ID |
| `report_id` | UUID | NOT NULL, FK → agri_reports.id | Related report |
| `actor_id` | UUID | FK → agri_users.id | User who performed action |
| `actor_name` | TEXT | NOT NULL | Actor name (denormalized) |
| `action` | TEXT | NOT NULL | Action type (created, updated, submitted, approved, rejected, changes_requested) |
| `from_status` | TEXT | | Previous status |
| `to_status` | TEXT | | New status |
| `metadata` | JSONB | DEFAULT '{}' | Additional context |
| `details` | TEXT | | Human-readable description |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Action timestamp |

**Indexes:**
- `idx_agri_audit_report_id` - Report's audit trail
- `idx_agri_audit_actor_id` - User's actions
- `idx_agri_audit_action` - Action type filtering
- `idx_agri_audit_created_at DESC` - Recent activity

**Example:**
```sql
-- Full audit trail for a report
SELECT action, actor_name, from_status, to_status, details, created_at
FROM agri_report_audit_log
WHERE report_id = 'uuid'
ORDER BY created_at ASC;
```

---

### 4. `agri_notifications` - Multi-Channel Notification Tracking

**Purpose:** Track email and WhatsApp notification delivery with retry logic.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK, DEFAULT gen_random_uuid() | Unique notification ID |
| `report_id` | UUID | NOT NULL, FK → agri_reports.id | Related report |
| `recipient_id` | UUID | FK → agri_users.id | Notification recipient |
| `recipient_name` | TEXT | NOT NULL | Recipient name |
| `recipient_email` | TEXT | | Email address |
| `recipient_phone` | TEXT | | Phone number |
| `channel` | TEXT | NOT NULL, CHECK | Delivery channel (email, whatsapp, sms, in_app) |
| `event` | TEXT | NOT NULL, CHECK | Trigger event (report_created, report_submitted, report_reviewed, report_approved, report_rejected) |
| `subject` | TEXT | | Notification subject |
| `message` | TEXT | NOT NULL | Notification content |
| `status` | TEXT | NOT NULL, DEFAULT 'queued' | Delivery status (queued, sent, delivered, read, failed) |
| `wa_message_id` | TEXT | | Meta Cloud API message ID |
| `wa_status` | TEXT | | WhatsApp delivery status |
| `wa_error` | TEXT | | WhatsApp error details |
| `retry_count` | INTEGER | DEFAULT 0 | Retry attempts |
| `max_retries` | INTEGER | DEFAULT 5 | Maximum retries |
| `next_retry_at` | TIMESTAMPTZ | | Scheduled retry time |
| `last_error` | TEXT | | Last error message |
| `sent_at` | TIMESTAMPTZ | | When sent |
| `delivered_at` | TIMESTAMPTZ | | When delivered |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Creation time |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Last update (auto) |

**Indexes:**
- `idx_agri_notif_report_id` - Report notifications
- `idx_agri_notif_recipient_id` - User's notifications
- `idx_agri_notif_status` - Status filtering
- `idx_agri_notif_channel` - Channel filtering
- `idx_agri_notif_created_at DESC` - Recent notifications
- `idx_agri_notif_retry` - Partial index: Failed notifications needing retry

**Example:**
```sql
-- Failed notifications needing retry
SELECT * FROM agri_notifications
WHERE status = 'failed'
  AND retry_count < max_retries
  AND next_retry_at <= NOW();
```

---

### 5. `agri_whatsapp_messages` - WhatsApp Message Tracking

**Purpose:** Detailed WhatsApp message delivery tracking with Meta API integration.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK, DEFAULT gen_random_uuid() | Unique message ID |
| `report_id` | UUID | FK → agri_reports.id | Related report |
| `notification_id` | UUID | FK → agri_notifications.id | Parent notification |
| `recipient_phone` | TEXT | NOT NULL | Recipient phone (E.164) |
| `wa_message_id` | TEXT | UNIQUE | Meta Cloud API message ID |
| `message_type` | TEXT | NOT NULL, DEFAULT 'template' | Message type (template, text) |
| `template_name` | TEXT | | WhatsApp template name |
| `message_body` | TEXT | NOT NULL | Message content |
| `status` | TEXT | NOT NULL, DEFAULT 'queued' | Delivery status |
| `error_message` | TEXT | | Error details |
| `error_code` | TEXT | | Meta API error code |
| `meta_response` | JSONB | | Full Meta API response |
| `sent_at` | TIMESTAMPTZ | | When sent to Meta |
| `delivered_at` | TIMESTAMPTZ | | When delivered to recipient |
| `read_at` | TIMESTAMPTZ | | When read by recipient |
| `failed_at` | TIMESTAMPTZ | | When failed |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Creation time |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Last update (auto) |

**Indexes:**
- `idx_agri_wa_report_id` - Report's WhatsApp messages
- `idx_agri_wa_notification_id` - Notification's messages
- `idx_agri_wa_message_id` - Meta message ID lookup
- `idx_agri_wa_status` - Status filtering
- `idx_agri_wa_phone` - Phone number lookup
- `idx_agri_wa_created_at DESC` - Recent messages

**Example:**
```sql
-- Delivery rate by template
SELECT 
  template_name,
  COUNT(*) as total,
  COUNT(*) FILTER (WHERE status = 'delivered') as delivered,
  ROUND(COUNT(*) FILTER (WHERE status = 'delivered') * 100.0 / COUNT(*), 2) as delivery_rate
FROM agri_whatsapp_messages
GROUP BY template_name;
```

---

### 6. `agri_report_activity` - User-Friendly Activity Feed

**Purpose:** Activity timeline for report collaboration.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK, DEFAULT gen_random_uuid() | Unique activity ID |
| `report_id` | UUID | NOT NULL, FK → agri_reports.id | Related report |
| `user_id` | UUID | FK → agri_users.id | User who performed action |
| `user_name` | TEXT | NOT NULL | User name |
| `activity_type` | TEXT | NOT NULL | Activity type (comment, status_change, view, download, share) |
| `title` | TEXT | NOT NULL | Activity title |
| `description` | TEXT | | Activity description |
| `metadata` | JSONB | DEFAULT '{}' | Additional data |
| `is_internal` | BOOLEAN | DEFAULT FALSE | Internal visibility |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Activity time |

**Indexes:**
- `idx_agri_activity_report_id` - Report activity
- `idx_agri_activity_user_id` - User activity
- `idx_agri_activity_type` - Type filtering
- `idx_agri_activity_created_at DESC` - Recent activity

**Example:**
```sql
-- Activity timeline for a report
SELECT title, description, user_name, activity_type, created_at
FROM agri_report_activity
WHERE report_id = 'uuid'
ORDER BY created_at DESC;
```

---

## Views

### `v_reports_full`

Complete report data with author and reviewer details.

```sql
SELECT 
  r.*,
  au.email as author_email,
  au.phone as author_phone,
  au.role as author_role,
  ru.email as reviewer_email,
  ru.phone as reviewer_phone,
  ru.role as reviewer_role
FROM agri_reports r
LEFT JOIN agri_users au ON r.author_id = au.id
LEFT JOIN agri_users ru ON r.reviewer_id = ru.id;
```

### `v_pending_reviews`

Submitted reports awaiting review (ordered by submission time).

```sql
SELECT * FROM agri_reports
WHERE status = 'submitted'
ORDER BY submitted_at ASC;
```

### `v_notification_stats`

Notification delivery statistics by channel and status.

```sql
SELECT 
  channel,
  status,
  COUNT(*) as count,
  COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (PARTITION BY channel) as percentage
FROM agri_notifications
GROUP BY channel, status;
```

---

## Triggers

### Automatic `updated_at` Timestamps

All main tables have triggers to automatically update the `updated_at` column on every UPDATE operation.

**Tables with triggers:**
- `agri_reports`
- `agri_users`
- `agri_notifications`
- `agri_whatsapp_messages`

**Implementation:**
```sql
CREATE TRIGGER trg_agri_reports_updated_at
  BEFORE UPDATE ON agri_reports
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

---

## Migration Commands

### Run Migrations
```bash
npm run db:migrate
```

### Run Seed Data (Development Only)
```bash
npm run db:seed
```

### Reset Database (Development Only)
```bash
npm run db:reset
```

### Check Migration Status
```bash
npm run db:status
```

---

## Performance Considerations

### Indexes

The schema includes **30+ indexes** optimized for common query patterns:

1. **Status-based queries:** `idx_agri_reports_status`, `idx_agri_reports_status_created`
2. **Author queries:** `idx_agri_reports_author_id`, `idx_agri_reports_author_status`
3. **Reviewer queries:** `idx_agri_reports_reviewer_id`
4. **Time-based queries:** `idx_agri_reports_created_at DESC` (all tables)
5. **Notification retries:** `idx_agri_notif_retry` (partial index for failed notifications)

### JSONB Storage

The `data` column in `agri_reports` uses JSONB for:
- Flexible report structure
- GIN index support (if needed for complex queries)
- Native PostgreSQL JSON operations

### Denormalization

Strategic denormalization for performance:
- `author_name`, `author_email` in reports (avoids JOIN for list views)
- `reviewer_name`, `reviewer_email` in reports
- `actor_name` in audit log

### Query Optimization

**Use views for complex joins:**
```sql
-- Instead of manual JOINs
SELECT * FROM v_reports_full WHERE status = 'submitted';
```

**Use partial indexes:**
```sql
-- Only index failed notifications needing retry
CREATE INDEX idx_agri_notif_retry ON agri_notifications(status, next_retry_at) 
WHERE status = 'failed';
```

---

## Security Considerations

### Row-Level Security (Optional Enhancement)

For multi-tenant deployments, consider enabling RLS:

```sql
ALTER TABLE agri_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY author_can_view ON agri_reports
  FOR SELECT
  USING (author_id = current_setting('app.current_user_id')::uuid);
```

### Sensitive Data

- **Passwords:** Stored as bcrypt hashes (never plain text)
- **Signatures:** Stored as Base64 PNG data
- **Phone numbers:** Stored in E.164 format with user consent tracking
- **Audit trail:** Immutable (only INSERT, no UPDATE/DELETE)

---

## Backup Strategy

### Recommended Backup Schedule

```bash
# Daily full backup
pg_dump -U postgres -d agrireports -f /backup/agrireports_$(date +%Y%m%d).sql

# Hourly WAL archiving (for point-in-time recovery)
# Configure in postgresql.conf:
# wal_level = replica
# archive_mode = on
# archive_command = 'cp %p /backup/wal/%f'
```

### Restore

```bash
psql -U postgres -d agrireports -f /backup/agrireports_20260421.sql
```

---

## Schema Evolution

### Adding New Columns

```sql
-- Example: Add priority field to reports
ALTER TABLE agri_reports 
ADD COLUMN priority TEXT DEFAULT 'normal' 
CHECK (priority IN ('low', 'normal', 'high', 'urgent'));

-- Add index if frequently queried
CREATE INDEX idx_agri_reports_priority ON agri_reports(priority);
```

### Migration Best Practices

1. **Always use transactions** (the migration runner does this automatically)
2. **Test migrations on staging first**
3. **Include rollback scripts for destructive operations**
4. **Never modify existing migration files** (create new ones instead)
5. **Use `IF NOT EXISTS` for idempotent operations**

---

## Monitoring Queries

### Report Status Distribution

```sql
SELECT 
  status,
  COUNT(*) as count,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) as percentage
FROM agri_reports
GROUP BY status;
```

### Notification Delivery Rate

```sql
SELECT 
  channel,
  status,
  COUNT(*) as count
FROM agri_notifications
GROUP BY channel, status
ORDER BY channel, status;
```

### Active Users (Last 7 Days)

```sql
SELECT COUNT(DISTINCT author_id) as active_authors
FROM agri_reports
WHERE created_at >= NOW() - INTERVAL '7 days';
```

---

## Next Steps

1. **Run Migration:** `npm run db:migrate`
2. **Seed Test Data:** `npm run db:seed` (development only)
3. **Verify Schema:** `npm run db:status`
4. **Update API Routes:** Migrate from `reports` table to `agri_reports` table
5. **Enable Monitoring:** Set up automated backup and alerting

---

**Last Updated:** April 21, 2026  
**Migration Version:** 005_agrireports_formal_schema.sql
