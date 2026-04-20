# AgriReports Platform — TypeScript Implementation Tasklist

> **Stack:** TypeScript · Node.js/Express · React · PostgreSQL (or MongoDB) · Redis/BullMQ · Meta WhatsApp Cloud API · Nodemailer · Prometheus · Docker
> **Convention:** Tasks are ordered by dependency. Each task includes file path, acceptance criteria, and relevant types/interfaces to define.

---

## Table of Contents

1. [Project Scaffolding & Config](#1-project-scaffolding--config)
2. [Shared Types & Data Models](#2-shared-types--data-models)
3. [Database Layer](#3-database-layer)
4. [Authentication & Middleware](#4-authentication--middleware)
5. [Reports API — Core Endpoints](#5-reports-api--core-endpoints)
6. [Workflow Engine — Submit & Review](#6-workflow-engine--submit--review)
7. [Notification Service — Email](#7-notification-service--email)
8. [Notification Service — WhatsApp (Meta Cloud API)](#8-notification-service--whatsapp-meta-cloud-api)
9. [WhatsApp Webhook Handler](#9-whatsapp-webhook-handler)
10. [Retry Queue (Redis / BullMQ)](#10-retry-queue-redis--bullmq)
11. [Monitoring — Prometheus Metrics](#11-monitoring--prometheus-metrics)
12. [Frontend — Framework Browser](#12-frontend--framework-browser)
13. [Frontend — Reports Module UI](#13-frontend--reports-module-ui)
14. [Frontend — Offline Sync](#14-frontend--offline-sync)
15. [Docker & Local Dev Environment](#15-docker--local-dev-environment)
16. [CI/CD — GitHub Actions](#16-cicd--github-actions)
17. [Testing](#17-testing)

---

## 1. Project Scaffolding & Config

### 1.1 Initialise Monorepo Structure

- [ ] Create root workspace with `pnpm workspaces` (or `npm workspaces`)
- [ ] Create `packages/api/` — Express backend
- [ ] Create `packages/web/` — React frontend (Vite)
- [ ] Create `packages/shared/` — Shared TypeScript types & constants
- [ ] Add root `tsconfig.base.json` with strict mode, `"target": "ES2022"`, `"module": "NodeNext"`
- [ ] Add per-package `tsconfig.json` extending base
- [ ] Add root `package.json` scripts: `dev`, `build`, `test`, `lint`

**Files:**
```
/
├── packages/
│   ├── api/
│   ├── web/
│   └── shared/
├── tsconfig.base.json
├── package.json
└── pnpm-workspace.yaml
```

---

### 1.2 Backend (API) Package Setup

- [ ] Initialise `packages/api/package.json` with dependencies:
  - `express`, `@types/express`
  - `jsonwebtoken`, `@types/jsonwebtoken`
  - `bcryptjs`, `@types/bcryptjs`
  - `nodemailer`, `@types/nodemailer`
  - `bullmq`, `ioredis`
  - `prom-client`
  - `zod` (request validation)
  - `dotenv`, `cors`, `helmet`
  - `pg` + `@types/pg` (or `mongoose` if MongoDB)
- [ ] Add `tsconfig.json` targeting `ES2022`, `moduleResolution: "NodeNext"`
- [ ] Add `src/server.ts` — Express app entry point
- [ ] Add `src/app.ts` — App factory (for testability)
- [ ] Configure `nodemon` + `ts-node` for local dev
- [ ] Set up `eslint` + `prettier` with TypeScript rules

**Acceptance criteria:** `pnpm dev` starts the API server on port 3000 with hot reload.

---

### 1.3 Environment Configuration

- [ ] Create `packages/api/src/config/env.ts`
  - Parse and validate all env vars with `zod`
  - Export typed `config` object — no raw `process.env` access elsewhere
- [ ] Document all required variables in `packages/api/.env.example`:

```env
# App
NODE_ENV=development
PORT=3000
JWT_SECRET=
JWT_EXPIRES_IN=7d

# Database
DATABASE_URL=

# Redis
REDIS_URL=redis://localhost:6379

# Email
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
EMAIL_FROM="AgriReports <noreply@yourdomain.com>"

# WhatsApp (Meta Cloud API)
META_PHONE_NUMBER_ID=
META_ACCESS_TOKEN=
META_WA_TEMPLATE_SUBMITTED=agri_report_submitted
META_WA_TEMPLATE_REVIEWED=agri_report_reviewed
META_WA_VERIFY_TOKEN=
META_APP_SECRET=

# Frontend URL (for notification links)
APP_BASE_URL=http://localhost:5173
```

**Acceptance criteria:** App fails to start with a descriptive error if any required env var is missing.

---

## 2. Shared Types & Data Models

> All types live in `packages/shared/src/types/` and are imported by both `api` and `web`.

### 2.1 Core Domain Types

- [ ] Create `packages/shared/src/types/report.ts`

```typescript
export type ReportFrequency = 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'closeout';

export type ReportStatus =
  | 'draft'
  | 'submitted'
  | 'approved'
  | 'rejected'
  | 'changes_requested';

export type ReviewAction = 'approve' | 'reject' | 'changes_requested';

export type RoleCategory =
  | 'Management'
  | 'Field Ops'
  | 'Post-Harvest'
  | 'Logistics'
  | 'Technical'
  | 'Compliance'
  | 'Admin';

export type ItemStatus = 'ontrack' | 'warning' | 'critical' | '';

export interface ReportItem {
  text: string;
  status: ItemStatus;
}

export interface RoleCard {
  name: string;
  cat: RoleCategory;
  items: ReportItem[];
}

export interface ReportPeriod {
  id: ReportFrequency;
  label: string;
  cadence: string;
  audience: string;
  format: string;
  roles: RoleCard[];
}

export interface ReportAuthor {
  id: string;
  name: string;
  email: string;
  phone?: string;
}

export interface Report {
  id: string;
  period: ReportFrequency;
  role: string;
  status: ReportStatus;
  author: ReportAuthor;
  data: Record<string, string>;
  signature?: string;          // Base64 PNG
  reviewerSignature?: string;  // Base64 PNG (approver)
  reviewComments?: string;
  reviewedBy?: ReportAuthor;
  createdAt: string;           // ISO 8601
  updatedAt: string;
}
```

- [ ] Create `packages/shared/src/types/user.ts`

```typescript
export type UserRole = 'field_staff' | 'supervisor' | 'manager' | 'reviewer' | 'admin';

export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: UserRole;
  farmRole: string;       // matches RoleCard.name in framework
  category: RoleCategory;
  waOptIn: boolean;       // WhatsApp opt-in consent
  createdAt: string;
  updatedAt: string;
}
```

- [ ] Create `packages/shared/src/types/api.ts`

```typescript
export interface ApiResponse<T> {
  data: T;
  message?: string;
}

export interface ApiError {
  error: string;
  details?: Record<string, string[]>;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}
```

- [ ] Create `packages/shared/src/types/notification.ts`

```typescript
export type NotificationChannel = 'email' | 'whatsapp';
export type NotificationEvent = 'report_submitted' | 'report_reviewed';

export interface NotificationPayload {
  event: NotificationEvent;
  report: Report;
  recipients: ReportAuthor[];
  channel: NotificationChannel;
}
```

- [ ] Export all types from `packages/shared/src/index.ts`

---

### 2.2 Framework Data Constants

- [ ] Create `packages/shared/src/data/periods.ts`
  - Migrate the `PERIODS` array from the chat's JS to a fully typed TypeScript constant
  - Each `ReportPeriod` includes all roles across Daily, Weekly, Monthly, Quarterly, Closeout
  - Parse emoji prefixes into typed `ItemStatus` values: `✅ → 'ontrack'`, `⚠️ → 'warning'`, `❌ → 'critical'`, `🔍 → 'warning'`
- [ ] Create `packages/shared/src/data/categoryColors.ts`
  - Typed `Record<RoleCategory, { bg: string; text: string; dot: string }>` constant

---

## 3. Database Layer

### 3.1 Schema Design (PostgreSQL)

- [ ] Create `packages/api/src/db/schema.sql` with tables:

```sql
-- Users
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  phone TEXT,
  role TEXT NOT NULL,         -- UserRole enum
  farm_role TEXT NOT NULL,
  category TEXT NOT NULL,
  wa_opt_in BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Reports
CREATE TABLE reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  period TEXT NOT NULL,
  role TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  author_id UUID REFERENCES users(id),
  data JSONB NOT NULL DEFAULT '{}',
  signature TEXT,
  reviewer_signature TEXT,
  review_comments TEXT,
  reviewed_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Audit log
CREATE TABLE report_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID REFERENCES reports(id),
  actor_id UUID REFERENCES users(id),
  action TEXT NOT NULL,
  from_status TEXT,
  to_status TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- WhatsApp delivery tracking
CREATE TABLE whatsapp_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID REFERENCES reports(id),
  recipient_phone TEXT NOT NULL,
  wa_message_id TEXT,
  status TEXT DEFAULT 'queued',  -- queued | sent | delivered | read | failed
  error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

- [ ] Add indexes: `reports(author_id)`, `reports(status)`, `reports(period)`, `report_audit_log(report_id)`

---

### 3.2 Database Client & Repository Pattern

- [ ] Create `packages/api/src/db/client.ts`
  - Export a typed `pg.Pool` instance using `DATABASE_URL` from config
- [ ] Create `packages/api/src/db/repositories/reportRepository.ts`

```typescript
// Methods to implement:
findAll(filters: { status?: ReportStatus; frequency?: ReportFrequency; authorId?: string }): Promise<Report[]>
findById(id: string): Promise<Report | null>
create(data: Omit<Report, 'id' | 'createdAt' | 'updatedAt'>): Promise<Report>
update(id: string, data: Partial<Report>): Promise<Report>
updateStatus(id: string, status: ReportStatus, actorId: string): Promise<Report>
getReviewersForRole(role: string): Promise<User[]>
```

- [ ] Create `packages/api/src/db/repositories/userRepository.ts`

```typescript
findById(id: string): Promise<User | null>
findByEmail(email: string): Promise<(User & { passwordHash: string }) | null>
create(data: Omit<User, 'id' | 'createdAt' | 'updatedAt'>): Promise<User>
```

- [ ] Create `packages/api/src/db/repositories/auditRepository.ts`

```typescript
log(entry: { reportId: string; actorId: string; action: string; fromStatus?: string; toStatus?: string; metadata?: Record<string, unknown> }): Promise<void>
```

- [ ] Create `packages/api/src/db/repositories/whatsappRepository.ts`

```typescript
create(entry: { reportId: string; recipientPhone: string; waMessageId?: string }): Promise<string>  // returns id
updateStatus(waMessageId: string, status: string, error?: string): Promise<void>
```

---

## 4. Authentication & Middleware

### 4.1 JWT Auth

- [ ] Create `packages/api/src/auth/jwt.ts`

```typescript
export interface JwtPayload {
  sub: string;        // userId
  role: UserRole;
  farmRole: string;
  email: string;
  iat: number;
  exp: number;
}

export function signToken(payload: Omit<JwtPayload, 'iat' | 'exp'>): string
export function verifyToken(token: string): JwtPayload
```

- [ ] Create `packages/api/src/auth/authController.ts`
  - `POST /api/v1/auth/login` — validate email/password, return JWT
  - `POST /api/v1/auth/refresh` — refresh token endpoint (optional)

---

### 4.2 Express Middleware

- [ ] Create `packages/api/src/middleware/authenticate.ts`
  - Extract `Bearer` token from `Authorization` header
  - Verify JWT, attach `req.user: JwtPayload` to request
  - Return `401` if missing or invalid
- [ ] Create `packages/api/src/middleware/authorize.ts`

```typescript
// Usage: router.post('/review', authenticate, authorize('reviewer', 'manager', 'admin'), handler)
export function authorize(...allowedRoles: UserRole[]): RequestHandler
```

- [ ] Create `packages/api/src/middleware/validate.ts`
  - Generic Zod schema validation middleware for `req.body`, `req.query`, `req.params`
  - Returns `400` with structured field errors on failure
- [ ] Create `packages/api/src/middleware/errorHandler.ts`
  - Global Express error handler
  - Returns typed `ApiError` JSON; never leaks stack traces in production
- [ ] Create `packages/api/src/middleware/requestLogger.ts`
  - Structured JSON logging (method, path, status, duration)

---

### 4.3 Request Validation Schemas (Zod)

- [ ] Create `packages/api/src/validation/reportSchemas.ts`

```typescript
export const createReportSchema = z.object({
  period: z.enum(['daily', 'weekly', 'monthly', 'quarterly', 'closeout']),
  role: z.string().min(1),
  data: z.record(z.string()).default({}),
});

export const updateReportSchema = z.object({
  data: z.record(z.string()),
  signature: z.string().optional(),
});

export const reviewReportSchema = z.object({
  action: z.enum(['approve', 'reject', 'changes_requested']),
  comments: z.string().optional(),
  signature: z.string().optional(),  // Required if action === 'approve'
}).refine(
  (val) => val.action !== 'approve' || !!val.signature,
  { message: 'Signature is required for approval', path: ['signature'] }
);

export const listReportsQuerySchema = z.object({
  status: z.enum(['draft', 'submitted', 'approved', 'rejected', 'changes_requested']).optional(),
  frequency: z.enum(['daily', 'weekly', 'monthly', 'quarterly', 'closeout']).optional(),
  page: z.coerce.number().min(1).default(1),
  pageSize: z.coerce.number().min(1).max(100).default(20),
});
```

---

## 5. Reports API — Core Endpoints

### 5.1 Route Setup

- [ ] Create `packages/api/src/routes/reports.ts`
  - Mount all report routes under `/api/v1/reports`
  - Apply `authenticate` to all routes
  - Apply `authorize` per route as appropriate:
    - `GET /` — all authenticated roles
    - `POST /` — all authenticated roles
    - `PUT /:id` — author only (enforce in controller)
    - `POST /:id/submit` — author only
    - `POST /:id/review` — `reviewer | manager | admin`

---

### 5.2 Reports Controller

- [ ] Create `packages/api/src/controllers/reportsController.ts` with handlers:

**`listReports`**
- [ ] Parse and validate query params with `listReportsQuerySchema`
- [ ] Call `reportRepository.findAll()` with filters
- [ ] Return `PaginatedResponse<Report>`
- [ ] Record Prometheus counter: `reports_listed_total`

**`createReport`**
- [ ] Validate body with `createReportSchema`
- [ ] Create report with `status: 'draft'`, `authorId: req.user.sub`
- [ ] Write audit log entry: `action: 'created'`
- [ ] Return `201` with created `Report`

**`updateReport`**
- [ ] Validate body with `updateReportSchema`
- [ ] Confirm `report.authorId === req.user.sub` and `report.status === 'draft'`; else `403`
- [ ] Update report data and `updatedAt`
- [ ] Write audit log entry: `action: 'updated'`
- [ ] Return updated `Report`

**`getReport`**
- [ ] Fetch by ID; return `404` if not found
- [ ] Return `Report`

---

## 6. Workflow Engine — Submit & Review

### 6.1 Submit Handler

- [ ] Create `packages/api/src/controllers/workflowController.ts`

**`submitReport`**
- [ ] Fetch report; return `404` if missing
- [ ] Confirm `req.user.sub === report.authorId`; else `403`
- [ ] Confirm `report.status === 'draft'`; else `409` ("Report is not in draft state")
- [ ] Validate mandatory fields (at minimum: `data.summary` must be non-empty)
- [ ] Set `status: 'submitted'`, update `updatedAt`
- [ ] Write audit log: `action: 'submitted'`, `fromStatus: 'draft'`, `toStatus: 'submitted'`
- [ ] Dispatch notification job to queue: `{ event: 'report_submitted', reportId, channel: 'email' }`
- [ ] Dispatch notification job to queue: `{ event: 'report_submitted', reportId, channel: 'whatsapp' }`
- [ ] Increment Prometheus counter: `reports_submitted_total{frequency, role}`
- [ ] Return updated `Report`

---

### 6.2 Review Handler

**`reviewReport`**
- [ ] Validate body with `reviewReportSchema`
- [ ] Fetch report; return `404` if missing
- [ ] Confirm `req.user.role` is `reviewer | manager | admin`; else `403`
- [ ] Confirm `report.status === 'submitted'`; else `409`
- [ ] Map `action` to new `ReportStatus`:
  - `'approve'` → `'approved'`
  - `'reject'` → `'rejected'`
  - `'changes_requested'` → `'changes_requested'`
- [ ] Set `reviewedBy`, `reviewComments`, `reviewerSignature`, `updatedAt`
- [ ] If `changes_requested`: reset `report.signature` to `null` so author must re-sign
- [ ] Write audit log: `action: reviewAction`, `fromStatus`, `toStatus`, `metadata: { reviewedBy }`
- [ ] Dispatch notification job to queue (email + whatsapp): `{ event: 'report_reviewed', reportId }`
- [ ] Increment Prometheus counter: `reports_reviewed_total{action}`
- [ ] Return updated `Report`

---

### 6.3 Status Transition Guard

- [ ] Create `packages/api/src/workflow/transitions.ts`
  - Define allowed `ReportStatus` state machine transitions as a `Map`
  - Export `canTransition(from: ReportStatus, to: ReportStatus): boolean`

```typescript
const ALLOWED: Map<ReportStatus, ReportStatus[]> = new Map([
  ['draft',             ['submitted']],
  ['submitted',         ['approved', 'rejected', 'changes_requested']],
  ['changes_requested', ['submitted']],
  ['approved',          []],
  ['rejected',          []],
]);
```

---

## 7. Notification Service — Email

### 7.1 Email Transport

- [ ] Create `packages/api/src/notifications/email/transport.ts`

```typescript
import nodemailer from 'nodemailer';
import { config } from '../../config/env';

export const transporter = nodemailer.createTransport({
  host: config.smtpHost,
  port: config.smtpPort,
  secure: false,
  auth: { user: config.smtpUser, pass: config.smtpPass },
});

export async function sendEmail(opts: { to: string; subject: string; html: string }): Promise<void>
```

- [ ] Add connection verify on startup (log warning if SMTP unreachable, do not crash)

---

### 7.2 Email Templates

- [ ] Create `packages/api/src/notifications/email/templates/reportSubmitted.ts`

```typescript
export function reportSubmittedTemplate(report: Report, reviewLink: string): { subject: string; html: string }
```

- [ ] Create `packages/api/src/notifications/email/templates/reportReviewed.ts`

```typescript
export function reportReviewedTemplate(report: Report): { subject: string; html: string }
```

Templates must include: period, role, author name, status badge, reviewer comments (if any), and a CTA button linking to `APP_BASE_URL/reports/:id`.

---

### 7.3 Email Notification Orchestrator

- [ ] Create `packages/api/src/notifications/email/emailNotificationService.ts`

```typescript
export async function notifyReviewersOnSubmit(report: Report, reviewers: User[]): Promise<void>
export async function notifyAuthorOnReview(report: Report): Promise<void>
```

---

## 8. Notification Service — WhatsApp (Meta Cloud API)

### 8.1 Meta API Client

- [ ] Create `packages/api/src/notifications/whatsapp/metaClient.ts`

```typescript
const META_API_BASE = 'https://graph.facebook.com/v18.0';

interface TextMessagePayload {
  messaging_product: 'whatsapp';
  to: string;
  type: 'text';
  text: { body: string };
}

interface TemplateMessagePayload {
  messaging_product: 'whatsapp';
  to: string;
  type: 'template';
  template: {
    name: string;
    language: { code: string };
    components: Array<{
      type: 'body';
      parameters: Array<{ type: 'text'; text: string }>;
    }>;
  };
}

export async function sendMetaWhatsApp(
  to: string,
  payload: TextMessagePayload | TemplateMessagePayload
): Promise<{ messages: Array<{ id: string }> }>
```

- [ ] Implement E.164 phone number formatter: `formatPhone(phone: string): string`
- [ ] Throw typed error on non-2xx response (include Meta error code and message)

---

### 8.2 WhatsApp Templates

- [ ] Create `packages/api/src/notifications/whatsapp/templates.ts`

```typescript
// Template: agri_report_submitted (notifies reviewers)
// Body: "📋 *New Report Submitted*\n📅 {{1}} | 👤 {{2}}\n📝 Submitted by {{3}}\n🔗 {{4}}"
export function buildSubmittedTemplate(report: Report, reviewLink: string): TemplateMessagePayload

// Template: agri_report_reviewed (notifies author)
// Body: "{{1}} *Report {{2}}*\n📄 ID: {{3}}\n💬 {{4}}"
export function buildReviewedTemplate(report: Report): TemplateMessagePayload

// Dev/sandbox: free-form text fallback
export function buildSubmittedFreeform(report: Report, reviewLink: string): TextMessagePayload
export function buildReviewedFreeform(report: Report): TextMessagePayload
```

---

### 8.3 WhatsApp Notification Orchestrator

- [ ] Create `packages/api/src/notifications/whatsapp/whatsappNotificationService.ts`

```typescript
export async function notifyReviewersOnSubmit(report: Report, reviewers: User[]): Promise<void>
// For each reviewer with wa_opt_in === true and a phone number:
//   1. Build template (or freeform in dev)
//   2. Call sendMetaWhatsApp()
//   3. Save record to whatsapp_messages table (status: 'sent')
//   4. Catch errors: save record with status: 'failed', re-throw so BullMQ can retry

export async function notifyAuthorOnReview(report: Report): Promise<void>
```

---

## 9. WhatsApp Webhook Handler

### 9.1 Webhook Verification

- [ ] Create `packages/api/src/routes/webhooks.ts`

**`GET /webhooks/whatsapp`**
- [ ] Read `hub.mode`, `hub.verify_token`, `hub.challenge` from query params
- [ ] If `hub.mode === 'subscribe'` and `hub.verify_token === config.metaWaVerifyToken`:
  - Respond `200` with plain text `hub.challenge`
- [ ] Else respond `403`

---

### 9.2 Webhook Event Handler

**`POST /webhooks/whatsapp`**
- [ ] Verify HMAC-SHA256 signature:
  - Read `x-hub-signature-256` header (`sha256=...`)
  - Compute `HMAC-SHA256(rawBody, META_APP_SECRET)`
  - Use `crypto.timingSafeEqual()` for comparison; reject with `403` on mismatch
  - **Note:** Must use raw body buffer for HMAC — configure `express.raw()` on this route before `express.json()`
- [ ] Parse `entry[].changes[].value.statuses[]` for delivery status updates
- [ ] For each status: call `whatsappRepository.updateStatus(waMessageId, status)`
- [ ] Supported status values to handle: `sent`, `delivered`, `read`, `failed`
- [ ] Increment Prometheus counter: `whatsapp_delivery_status_total{status}`
- [ ] Always respond `200 OK` to Meta (even on processing errors, to prevent retries)

---

### 9.3 Webhook Security Utility

- [ ] Create `packages/api/src/utils/hmac.ts`

```typescript
import crypto from 'crypto';

export function verifyHmacSha256(
  rawBody: Buffer,
  signature: string,
  secret: string
): boolean
```

---

## 10. Retry Queue (Redis / BullMQ)

### 10.1 Queue Definitions

- [ ] Create `packages/api/src/queue/connection.ts`
  - Export typed `IORedis` connection using `config.redisUrl`
- [ ] Create `packages/api/src/queue/notificationQueue.ts`

```typescript
import { Queue } from 'bullmq';

export interface NotificationJobData {
  event: NotificationEvent;
  reportId: string;
  channel: NotificationChannel;
}

export const notificationQueue = new Queue<NotificationJobData>('notifications', { connection });
```

---

### 10.2 Notification Worker

- [ ] Create `packages/api/src/queue/notificationWorker.ts`

```typescript
import { Worker } from 'bullmq';

// Worker processes each job:
// 1. Fetch report and relevant users from DB
// 2. Route to emailNotificationService or whatsappNotificationService
// 3. On success: job completes
// 4. On failure: BullMQ retries with exponential backoff

export const notificationWorker = new Worker<NotificationJobData>(
  'notifications',
  async (job) => { /* handler */ },
  {
    connection,
    concurrency: 5,
    defaultJobOptions: {
      attempts: 5,
      backoff: { type: 'exponential', delay: 2000 },
      removeOnComplete: 100,
      removeOnFail: 500,
    }
  }
);

notificationWorker.on('failed', (job, err) => { /* structured log */ });
```

- [ ] Start worker in `src/server.ts` alongside Express
- [ ] Add graceful shutdown: `notificationWorker.close()` on `SIGTERM`

---

### 10.3 Dead-Letter Handling

- [ ] Add `failed` event listener that writes to a `failed_notifications` DB table after all retries exhausted
- [ ] Expose `GET /api/v1/admin/failed-notifications` (admin only) for manual retry or archive

---

## 11. Monitoring — Prometheus Metrics

### 11.1 Metric Definitions

- [ ] Create `packages/api/src/monitoring/metrics.ts`

```typescript
import { Counter, Histogram, Gauge, Registry } from 'prom-client';

export const registry = new Registry();

export const reportsSubmittedTotal = new Counter({
  name: 'reports_submitted_total',
  help: 'Total reports submitted',
  labelNames: ['frequency', 'role'],
  registers: [registry],
});

export const reportsReviewedTotal = new Counter({
  name: 'reports_reviewed_total',
  help: 'Total reports reviewed',
  labelNames: ['action'],
  registers: [registry],
});

export const whatsappSentTotal = new Counter({
  name: 'whatsapp_sent_total',
  help: 'Total WhatsApp messages sent',
  registers: [registry],
});

export const whatsappDeliveryStatusTotal = new Counter({
  name: 'whatsapp_delivery_status_total',
  help: 'WhatsApp delivery status updates received',
  labelNames: ['status'],
  registers: [registry],
});

export const apiRequestDuration = new Histogram({
  name: 'api_request_duration_seconds',
  help: 'API request duration in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.05, 0.1, 0.2, 0.3, 0.5, 1, 2],
  registers: [registry],
});

export const offlineQueueDepth = new Gauge({
  name: 'offline_queue_depth',
  help: 'Number of jobs pending in the notification queue',
  registers: [registry],
});
```

---

### 11.2 Metrics Endpoint & Request Timer

- [ ] Add `GET /metrics` route returning `registry.metrics()` with `Content-Type: text/plain`
- [ ] Add `apiRequestDuration` middleware that wraps every request and records duration on response finish
- [ ] Add a periodic job (every 30s) to poll BullMQ queue size and update `offlineQueueDepth` gauge

---

## 12. Frontend — Framework Browser

### 12.1 Project Setup

- [ ] Initialise `packages/web/` with Vite + React + TypeScript
- [ ] Install: `react`, `react-dom`, `@types/react`, `@types/react-dom`
- [ ] Configure path aliases: `@shared` → `packages/shared/src`
- [ ] Set up `tailwindcss` with custom design tokens matching the chat's CSS custom property palette

---

### 12.2 FrameworkBrowser Component

- [ ] Create `packages/web/src/modules/framework/FrameworkBrowser.tsx`
  - Import `PERIODS` and `categoryColors` from `@shared/data`
  - Render tab bar per frequency; active tab uses info colour tokens
  - Render period metadata badges: cadence (green), audience (amber), format (info blue)
  - Render `RoleCard` grid using CSS Grid `auto-fill minmax(320px, 1fr)`

- [ ] Create `packages/web/src/modules/framework/RoleCard.tsx`
  - Accept `RoleCard` prop
  - Render role icon circle with category colour
  - Render `ReportItem` list with coloured dot and status chip
  - Hover: `translateY(-2px)` with shadow transition

- [ ] Create `packages/web/src/modules/framework/CategoryFilter.tsx`
  - Multi-select filter buttons (all categories)
  - Uses `aria-pressed` for accessibility

- [ ] Create `packages/web/src/modules/framework/SearchBar.tsx`
  - Debounced (300ms) search across role names and item text
  - `aria-label="Search reports"`, `role="search"`

- [ ] Create `packages/web/src/modules/framework/ExportButton.tsx`
  - On click: builds CSV from currently visible role cards and items
  - Triggers browser download via `Blob` + `URL.createObjectURL`

- [ ] Add print stylesheet: hide tabs/controls, `page-break-inside: avoid` on cards

- [ ] Accessibility audit:
  - [ ] Tab navigation via keyboard through all interactive elements
  - [ ] `aria-selected` on frequency tabs
  - [ ] `aria-live="polite"` on grid region (content changes on filter)
  - [ ] `prefers-reduced-motion` media query disables all transitions

---

## 13. Frontend — Reports Module UI

### 13.1 API Client (Typed)

- [ ] Create `packages/web/src/api/reportsApi.ts`

```typescript
export const reportsApi = {
  list(filters: ListReportsQuery): Promise<PaginatedResponse<Report>>,
  get(id: string): Promise<Report>,
  create(data: CreateReportInput): Promise<Report>,
  update(id: string, data: UpdateReportInput): Promise<Report>,
  submit(id: string): Promise<Report>,
  review(id: string, data: ReviewReportInput): Promise<Report>,
}
```

- [ ] All methods throw typed `ApiError` on non-2xx responses
- [ ] Attach `Authorization: Bearer <token>` from auth context

---

### 13.2 Auth Context

- [ ] Create `packages/web/src/context/AuthContext.tsx`
  - Store JWT in memory (not localStorage); persist to `sessionStorage` only
  - Expose `user: JwtPayload | null`, `login()`, `logout()`
  - Decode JWT payload with `jose` or a minimal decoder (no library needed for decode-only)

---

### 13.3 Reports Module Layout

- [ ] Create `packages/web/src/modules/reports/ReportsModule.tsx`
  - Two-panel layout: `ReportsSidebar` (left) + `ReportView` (right)
  - Responsive: sidebar collapses to a drawer on mobile (`< 768px`)

- [ ] Create `packages/web/src/modules/reports/ReportsSidebar.tsx`
  - Frequency filter (`<select>`)
  - Status filter (`<select>`)
  - Search input (debounced 300ms)
  - `ReportListItem` list (virtualized for large lists — use `react-window` if > 100 items)
  - "+ New Report" button → opens `NewReportModal`

- [ ] Create `packages/web/src/modules/reports/ReportListItem.tsx`
  - Display: report ID (truncated), period badge, role name, status chip, `updatedAt` relative time
  - Highlight when active

---

### 13.4 Report Form

- [ ] Create `packages/web/src/modules/reports/ReportForm.tsx`
  - Receives current `Report`; reads `isDraft`, `isSubmitted`, `isReviewer` from props + auth context
  - Renders dynamic fields from `PERIODS[period].roles` matching the report's `role`
  - Fields: Executive Summary (textarea), Variance / Root Cause (textarea), Corrective Actions (textarea), plus any role-specific items as checkbox confirmations
  - `isDraft`: all fields editable; autosave on change (debounced 3s)
  - `!isDraft`: all fields `readOnly`; shows lock banner

- [ ] Create `packages/web/src/modules/reports/SignaturePad.tsx`
  - Canvas-based signature capture using pointer events (mouse + touch)
  - Exports `getDataURL(): string` and `isEmpty(): boolean` via `useImperativeHandle`
  - Clear button resets canvas
  - Shows previously saved signature as `<img>` when in read-only mode

- [ ] Create `packages/web/src/modules/reports/ReviewPanel.tsx`
  - Shown only when `isSubmitted && isReviewer`
  - Comments textarea (optional)
  - Signature pad (required for Approve)
  - Three buttons: Approve (green), Request Changes (amber), Reject (red)
  - Confirm dialog before destructive actions (Reject)

---

### 13.5 Toast Notifications

- [ ] Create `packages/web/src/components/Toast.tsx`
  - Variants: `success`, `error`, `warning`, `info`
  - Auto-dismiss after 4s; manual dismiss via × button
  - `aria-live="assertive"` for screen readers

---

## 14. Frontend — Offline Sync

### 14.1 Offline Queue

- [ ] Create `packages/web/src/offline/offlineQueue.ts`

```typescript
export type QueuedAction =
  | { action: 'create'; data: CreateReportInput }
  | { action: 'update'; id: string; data: UpdateReportInput }
  | { action: 'submit'; id: string }
  | { action: 'review'; id: string; data: ReviewReportInput };

export interface OfflineQueue {
  enqueue(action: QueuedAction): void;
  flush(): Promise<void>;
  getQueue(): QueuedAction[];
  clear(): void;
}
```

- [ ] Persist queue to `sessionStorage` (not `localStorage` — session-scoped is safer)
- [ ] `flush()` processes queue in order; removes successfully synced items; leaves failed items

---

### 14.2 Network Status Hook

- [ ] Create `packages/web/src/hooks/useOnlineStatus.ts`
  - Subscribes to `navigator.onLine`, `window: online`, `window: offline` events
  - Returns `{ isOnline: boolean }`
  - On transition to online: trigger `offlineQueue.flush()`

---

### 14.3 Optimistic Updates

- [ ] In `ReportsModule`: maintain `localReports: Report[]` in state
- [ ] On any mutating action (create/update/submit/review):
  1. Apply optimistic update to `localReports`
  2. Attempt API call
  3. On success: replace optimistic entry with server response
  4. On failure (offline): enqueue action; show offline toast; keep optimistic state
  5. On flush success: reconcile `localReports` with server data

---

## 15. Docker & Local Dev Environment

### 15.1 Application Dockerfile

- [ ] Create `packages/api/Dockerfile`

```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build   # tsc → dist/

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
EXPOSE 3000
CMD ["node", "dist/server.js"]
```

---

### 15.2 Docker Compose (Local Dev)

- [ ] Create root `docker-compose.yml`

```yaml
version: '3.9'
services:
  app:
    build: ./packages/api
    ports: ["3000:3000"]
    env_file: ./packages/api/.env.local
    volumes:
      - ./packages/api/src:/app/src
    depends_on: [postgres, redis, mailcatcher, mock-whatsapp]
    command: npx nodemon --exec ts-node src/server.ts

  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: agrireports
      POSTGRES_USER: agrireports
      POSTGRES_PASSWORD: agrireports
    ports: ["5432:5432"]
    volumes: [postgres_data:/var/lib/postgresql/data]

  redis:
    image: redis:7-alpine
    ports: ["6379:6379"]
    volumes: [redis_data:/data]

  mailcatcher:
    image: sj26/mailcatcher
    ports:
      - "1025:1025"   # SMTP
      - "1080:1080"   # Web UI → http://localhost:1080

  mock-whatsapp:
    build: ./mock-server
    ports: ["4000:4000"]

volumes:
  postgres_data:
  redis_data:
```

---

### 15.3 Mock WhatsApp Server (TypeScript)

- [ ] Create `mock-server/src/server.ts`

```typescript
import express, { Request, Response } from 'express';
const app = express();
app.use(express.json());

// Mock Meta Cloud API
app.post('/v18.0/:phoneId/messages', (req: Request, res: Response) => {
  const { to, type, text, template } = req.body;
  const msg = type === 'template' ? `(Template: ${template?.name})` : text?.body;
  console.log(`[Mock-Meta] 📤 To: ${to} | ${msg}`);
  res.json({
    messaging_product: 'whatsapp',
    contacts: [{ input: to, wa_id: to }],
    messages: [{ id: `wamid.${Date.now()}` }],
  });
});

app.listen(4000, () => console.log('🔧 Mock WhatsApp server on http://localhost:4000'));
```

- [ ] Add `mock-server/Dockerfile` (Node 20 Alpine, compile TS before running)

---

### 15.4 Local Dev `.env.local`

- [ ] Create `packages/api/.env.local` template:

```env
NODE_ENV=development
PORT=3000
JWT_SECRET=dev_secret_not_for_prod
DATABASE_URL=postgres://agrireports:agrireports@localhost:5432/agrireports
REDIS_URL=redis://localhost:6379

# Email → Mailcatcher
SMTP_HOST=localhost
SMTP_PORT=1025
SMTP_USER=dev
SMTP_PASS=dev
EMAIL_FROM="AgriReports Dev <dev@localhost>"

# WhatsApp → Mock server
META_PHONE_NUMBER_ID=123456789
META_ACCESS_TOKEN=mock_token
META_API_BASE_URL=http://localhost:4000   # Override in notificationService for dev
META_WA_VERIFY_TOKEN=dev_verify_token
META_APP_SECRET=dev_app_secret
META_WA_TEMPLATE_SUBMITTED=agri_report_submitted
META_WA_TEMPLATE_REVIEWED=agri_report_reviewed

APP_BASE_URL=http://localhost:5173
```

---

## 16. CI/CD — GitHub Actions

### 16.1 PR Checks Workflow

- [ ] Create `.github/workflows/ci.yml`

```yaml
name: CI
on: [push, pull_request]

jobs:
  lint-typecheck:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v3
      - uses: actions/setup-node@v4
        with: { node-version: '20', cache: 'pnpm' }
      - run: pnpm install --frozen-lockfile
      - run: pnpm lint
      - run: pnpm typecheck

  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16-alpine
        env: { POSTGRES_DB: test, POSTGRES_USER: test, POSTGRES_PASSWORD: test }
        ports: ["5432:5432"]
        options: >-
          --health-cmd pg_isready --health-interval 10s --health-timeout 5s --health-retries 5
      redis:
        image: redis:7-alpine
        ports: ["6379:6379"]
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v3
      - uses: actions/setup-node@v4
        with: { node-version: '20', cache: 'pnpm' }
      - run: pnpm install --frozen-lockfile
      - run: pnpm test --coverage
        env:
          DATABASE_URL: postgres://test:test@localhost:5432/test
          REDIS_URL: redis://localhost:6379
          JWT_SECRET: test_secret
```

---

### 16.2 Staging Deploy Workflow

- [ ] Create `.github/workflows/deploy-staging.yml`

```yaml
name: Deploy to Staging
on:
  push:
    branches: [main]

jobs:
  build-and-push:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Build Docker image
        run: docker build -t ghcr.io/${{ github.repository }}/api:staging ./packages/api
      - name: Push to GHCR
        run: |
          echo ${{ secrets.GITHUB_TOKEN }} | docker login ghcr.io -u ${{ github.actor }} --password-stdin
          docker push ghcr.io/${{ github.repository }}/api:staging

  deploy:
    needs: build-and-push
    runs-on: ubuntu-latest
    environment: staging
    steps:
      - name: SSH & deploy
        uses: appleboy/ssh-action@v1
        with:
          host: ${{ secrets.STAGING_HOST }}
          username: ${{ secrets.STAGING_USER }}
          key: ${{ secrets.STAGING_SSH_KEY }}
          script: |
            docker pull ghcr.io/${{ github.repository }}/api:staging
            docker compose -f /opt/agrireports/docker-compose.staging.yml up -d --no-deps app
```

---

### 16.3 Required GitHub Secrets

- [ ] Document in `README.md`:

| Secret | Description |
|---|---|
| `STAGING_HOST` | IP or hostname of staging server |
| `STAGING_USER` | SSH user |
| `STAGING_SSH_KEY` | Private SSH key |
| `STAGING_DATABASE_URL` | Staging DB connection string |
| `STAGING_REDIS_URL` | Staging Redis URL |
| `STAGING_JWT_SECRET` | Staging JWT secret |
| `STAGING_META_ACCESS_TOKEN` | Meta WhatsApp token |
| `STAGING_META_APP_SECRET` | Meta HMAC secret |
| `STAGING_SMTP_*` | SMTP credentials |

---

## 17. Testing

### 17.1 Unit Tests

- [ ] Set up `vitest` as test runner (works across API and Web packages)

**API unit tests:**
- [ ] `transitions.test.ts` — all valid and invalid status transitions
- [ ] `hmac.test.ts` — HMAC verification with known vectors
- [ ] `jwt.test.ts` — token sign/verify, expiry handling
- [ ] `reportSchemas.test.ts` — Zod schema valid/invalid cases including signature-required-for-approve
- [ ] `emailTemplates.test.ts` — template renders without throwing; contains expected strings
- [ ] `whatsappTemplates.test.ts` — template parameter order matches Meta submission JSON

**Shared unit tests:**
- [ ] `periods.test.ts` — all periods have at least one role; all item statuses are valid `ItemStatus` values
- [ ] `categoryColors.test.ts` — all `RoleCategory` values have a colour entry

---

### 17.2 Integration Tests

- [ ] Set up `packages/api/src/tests/helpers/testDb.ts` — creates isolated test schema, runs migrations, tears down after each test
- [ ] `reports.integration.test.ts`:
  - [ ] `POST /api/v1/reports` creates a draft and returns 201
  - [ ] `PUT /api/v1/reports/:id` updates data and returns 200
  - [ ] `PUT /api/v1/reports/:id` returns 403 when called by a different user
  - [ ] `POST /api/v1/reports/:id/submit` transitions to submitted and enqueues notification jobs
  - [ ] `POST /api/v1/reports/:id/submit` returns 409 when report is not a draft
  - [ ] `POST /api/v1/reports/:id/review` with `approve` requires signature; returns 400 without it
  - [ ] `POST /api/v1/reports/:id/review` updates status and enqueues notification jobs
  - [ ] Unauthenticated request returns 401
  - [ ] Non-reviewer calling `/review` returns 403

- [ ] `webhooks.integration.test.ts`:
  - [ ] `GET /webhooks/whatsapp` with correct `verify_token` returns `hub.challenge`
  - [ ] `POST /webhooks/whatsapp` with valid HMAC processes status update
  - [ ] `POST /webhooks/whatsapp` with invalid HMAC returns 403

---

### 17.3 Frontend Component Tests

- [ ] Set up `vitest` + `@testing-library/react`
- [ ] `FrameworkBrowser.test.tsx`:
  - [ ] Renders all 5 frequency tabs
  - [ ] Clicking a tab shows correct roles
  - [ ] Search filters role cards by text
  - [ ] Category filter shows/hides cards
  - [ ] CSV export triggers download with correct data
- [ ] `ReportForm.test.tsx`:
  - [ ] Renders in edit mode when status is draft
  - [ ] Renders read-only when status is submitted/approved
  - [ ] Shows ReviewPanel only for reviewer role
  - [ ] Approve button is disabled when signature is empty
- [ ] `SignaturePad.test.tsx`:
  - [ ] `isEmpty()` returns true before drawing
  - [ ] Clear button resets canvas

---

### 17.4 End-to-End Tests (Optional / Phase 2)

- [ ] Set up `playwright` for E2E
- [ ] Full report lifecycle test:
  1. Log in as `field_staff`
  2. Create a daily report
  3. Fill fields and submit
  4. Log in as `manager`
  5. Approve with signature
  6. Assert report status is `approved`
  7. Assert mock WhatsApp server received both notifications

---

## Appendix — Definition of Done

A task is complete when all of the following are true:

- [ ] Code compiles with `tsc --noEmit` and no type errors
- [ ] ESLint passes with zero warnings
- [ ] All associated unit and integration tests pass
- [ ] New code has > 80% test coverage
- [ ] No raw `process.env` access outside `config/env.ts`
- [ ] No `any` types without an explicit `// eslint-disable-next-line` comment and justification
- [ ] API changes are reflected in `openapi.yaml`
- [ ] Sensitive operations (submit, review, webhook) have an audit log entry

---

*Generated from chat: Report Content Improvement Suggestions — April 2026*
