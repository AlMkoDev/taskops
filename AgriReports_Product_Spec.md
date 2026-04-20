**AgriReports Platform**

Product Requirements Specification

Version 1.0  |  April 2026

# **1\. Product Overview**

AgriReports is a full-stack reporting platform for agricultural operations. It digitises the entire farm reporting lifecycle — from daily field observations to seasonal closeout audits — replacing verbal summaries, ad hoc spreadsheets, and paper registers with a structured, role-aware, approval-routed reporting engine.

## **1.1 Problem Statement**

Agricultural operations currently suffer from:

* Fragmented reporting across WhatsApp, paper forms, and spreadsheets with no single source of truth.

* No enforcement of report structure or mandatory fields, leading to incomplete data.

* No formal review or approval workflow, meaning critical decisions are made on unverified data.

* Lack of role-differentiated views — all roles see the same fields regardless of relevance.

* No offline capability for field staff with intermittent connectivity.

## **1.2 Solution Summary**

A modular web application with a Reports module at its core, delivering:

* Role-based report templates across five reporting frequencies.

* Draft autosave, offline queuing, and sync-on-reconnect.

* Submit → Review → Approve/Reject workflow with digital signatures.

* WhatsApp Business API and email notifications at each workflow stage.

* REST API backend with JWT authentication, OpenAPI 3.0 contract, and Prometheus metrics.

## **1.3 Target Users**

| Role | Primary Use | Report Frequency |
| :---- | :---- | :---- |
| Farm / Project Manager | Oversight, approval, strategic decisions | All frequencies |
| Agronomist / Crop Advisor | Crop health, irrigation, yield forecasting | Daily, Weekly, Monthly |
| Operations Supervisor | Labour, equipment, block progress | Daily, Weekly |
| Field Labour & Crews | Task completion, field observations | Daily |
| QA / Packhouse Officer | Quality grading, non-conformances | Daily, Weekly, Monthly |
| Financial Controller | Budgets, variance, cost reconciliation | Monthly, Quarterly, Closeout |
| Compliance / OHS Officer | Regulatory, PPE, audit readiness | Daily, Weekly, Closeout |
| M\&E Officer | Data quality, KPI tracking, deviation flags | Weekly, Monthly, Quarterly |

# **2\. Reporting Framework**

Reports are structured around five cadences. Each cadence maps to specific roles, mandatory fields, and escalation paths.

## **2.1 Report Frequencies & Scope**

| Frequency | Cadence | Audience | Format |
| :---- | :---- | :---- | :---- |
| Daily | End of each working day | Supervisor / Farm Manager | Mobile app / WhatsApp / Field register |
| Weekly | Every Friday | Farm Manager & Dept Leads | Structured 1–2 page report or dashboard |
| Monthly | Last working day of month | Owner / Investors / Co-op Management | Formal report with tables, graphs & variance analysis |
| Quarterly | End of Q1/Q2/Q3/Q4 | Board / Funders / Strategic Partners | Executive summary with ESG and financial narrative |
| Closeout | End of season / project | All Stakeholders \+ Auditors | Audit-ready document with digital signatures |

## **2.2 Role-Category Matrix**

Roles are grouped into seven operational categories, each displayed with distinct colour coding in the UI:

| Category | Roles Included |
| :---- | :---- |
| Management | Farm/Project Manager, Operations Supervisor, Agronomist/Crop Advisor, Procurement Officer |
| Field Ops | Field Labour, Planting Crew, Weeding Crew, Spray Team, Irrigation Technician, IPM Scout, Harvest Crew |
| Post-Harvest | Grader/Sorter, Packer, Packhouse Supervisor, QA Officer, Cold Chain Handler |
| Logistics | Inventory Clerk, Driver, Sales Officer, Transport Coordinator |
| Technical | M\&E Officer |
| Compliance | OHS Representative, Labour Compliance Officer |
| Admin | Financial Controller |

## **2.3 Report Item Structure**

Each report item in the framework carries:

* Metric / observation label (e.g., 'Crop growth stage per block (BBCH)')

* Status indicator: on-track (green), warning (amber), critical (red)

* Action trigger: threshold-based flags surfaced to the relevant role (e.g., 'Wind speed \>15 km/h — pause spraying')

* Data source tag: links the field to its input system (IoT sensor, FMS, manual, weather API)

# **3\. Feature Specifications**

## **3.1 Reports Module — Core UI**

### **3.1.1 Framework Browser (Read-Only Reference)**

An interactive reference view showing all role cards across frequencies. Features:

* Tab navigation by frequency (Daily / Weekly / Monthly / Quarterly / Closeout)

* Category filter buttons (Management, Field Ops, Post-Harvest, Logistics, Technical, Compliance, Admin)

* Live search across role names, metric labels, and action triggers

* Status badge chips per item (on-track / warning / critical)

* Export current view to CSV

* Print stylesheet: hides controls, preserves card layout, page-break-inside: avoid

* WCAG-compliant: ARIA labels, keyboard navigation, focus-visible rings, prefers-reduced-motion

### **3.1.2 Report List & Sidebar**

Persistent sidebar displaying the user's report history:

* Filters: Frequency, Status (Draft / Submitted / Approved / Rejected), free-text search

* List items show: Report ID, period, role, status badge, last updated timestamp

* Active report highlighted; clicking opens the form panel

* '+ New Report' button triggers frequency selection and creates a draft

### **3.1.3 Report Form**

Dynamic form generated from the PERIODS data model, scoped to the user's role:

* Fields: Executive Summary, Variance / Root Cause, Corrective Actions, plus role-specific metric inputs

* Autosave every 3 seconds on any field change (debounced)

* Mandatory field validation on Submit; inline error highlighting

* Digital signature canvas (touch-enabled) shown on submission/approval

* Read-only lock applied after submission; reviewer sees Approve / Request Changes / Reject panel

* Status transitions: Draft → Submitted → Approved | Rejected | Changes Requested → (re-Draft)

## **3.2 Offline & Sync**

* Full offline capability: report list and drafts cached in local storage

* Actions queued while offline (create, update, submit, review)

* Queue auto-flushed on network reconnect via navigator.onLine events

* Optimistic UI updates with rollback on sync failure

* Toast notifications for save success, sync status, and errors

## **3.3 Notification System**

### **3.3.1 Email Notifications (via Nodemailer / SendGrid / AWS SES)**

| Trigger Event | Recipients | Email Content |
| :---- | :---- | :---- |
| Report Submitted | All reviewers for that role | Period, role, author name, link to review |
| Report Approved | Report author | Status confirmed, no action required |
| Report Rejected | Report author | Status \+ reviewer comments |
| Changes Requested | Report author | Comments \+ link to re-edit draft |

### **3.3.2 WhatsApp Business API Notifications**

Mirror of email notifications delivered via Meta's WhatsApp Business API:

* Configured via WABA Phone Number ID and permanent access token in .env

* Sends text messages with report ID, status, and deep link

* Webhook endpoint /webhooks/whatsapp handles delivery status callbacks

* Webhook signature verification via HMAC-SHA256 against META\_APP\_SECRET

* Failed sends queued to Redis/BullMQ with exponential backoff (2s, 4s, 8s, 16s, 32s; 5 attempts)

# **4\. API Specification**

## **4.1 Authentication**

All API endpoints require a Bearer JWT token. Tokens are issued at login and validated per request via middleware.

## **4.2 Endpoints**

| Method | Endpoint | Description |
| :---- | :---- | :---- |
| GET | /api/v1/reports | List reports. Query params: status, frequency (filterable) |
| POST | /api/v1/reports | Create new draft report. Body: { period, role, data } |
| PUT | /api/v1/reports/:id | Update a draft report (locked post-submit) |
| POST | /api/v1/reports/:id/submit | Submit draft for review; locks editing; fires notifications |
| POST | /api/v1/reports/:id/review | Reviewer action: approve | reject | changes\_requested \+ comments \+ signature |
| GET | /api/v1/health | Health check. Returns 200 \+ uptime, version |
| GET | /metrics | Prometheus metrics endpoint (report counts, WhatsApp delivery rate, latency) |
| GET | /webhooks/whatsapp | WhatsApp webhook verification (hub.mode, hub.verify\_token, hub.challenge) |
| POST | /webhooks/whatsapp | WhatsApp delivery status callbacks; HMAC-verified |

## **4.3 Report Data Schema**

| Field | Type | Notes |
| :---- | :---- | :---- |
| id | UUID string | Auto-generated on create |
| period | Enum string | daily | weekly | monthly | quarterly | closeout |
| role | String | Role name matching the PERIODS framework |
| status | Enum string | draft | submitted | approved | rejected | changes\_requested |
| author | Object | { id, name, email } — populated from JWT claims |
| data | Object | Free-form key/value map of report field responses |
| signature | String (Base64 URI) | PNG of digital signature canvas; required for approval |
| review\_comments | String | Reviewer's free-text comments |
| created\_at | ISO 8601 datetime | Set on creation, never updated |
| updated\_at | ISO 8601 datetime | Updated on every save, submit, or review action |

# **5\. Infrastructure & Integrations**

## **5.1 Technology Stack**

| Layer | Technology | Purpose |
| :---- | :---- | :---- |
| Frontend | Vanilla JS / React / Vue (framework-agnostic) | Reports module UI, form engine, offline sync |
| Backend | Node.js \+ Express | REST API, notification orchestration, webhook handling |
| Database | Any (MongoDB / PostgreSQL / Dataverse) | Report persistence; module uses a pluggable model layer |
| Queue | Redis \+ BullMQ | WhatsApp retry queue with exponential backoff |
| Email | Nodemailer / SendGrid / AWS SES | Transactional notifications |
| Messaging | Meta WhatsApp Business API | Mobile-first field notifications |
| Monitoring | Prometheus \+ Grafana | API latency, report submission rates, WhatsApp delivery KPIs |
| Auth | JWT (Bearer token) | Role-based access control across all endpoints |
| Containerisation | Docker \+ Docker Compose | Local dev; Redis, app, and optional DB in one compose file |

## **5.2 Environment Variables**

| Variable | Purpose |
| :---- | :---- |
| SMTP\_HOST / SMTP\_PORT / SMTP\_USER / SMTP\_PASS | Email sending credentials |
| WHATSAPP\_PHONE\_NUMBER\_ID | Meta WhatsApp Business API — sender ID |
| WHATSAPP\_ACCESS\_TOKEN | Permanent token for WhatsApp API calls |
| WHATSAPP\_VERIFY\_TOKEN | Webhook verification secret |
| META\_APP\_SECRET | HMAC key for webhook signature validation |
| REDIS\_URL | Redis connection string (e.g., redis://redis:6379) |
| JWT\_SECRET | Token signing key |
| DATABASE\_URL | Relational or document DB connection string |

## **5.3 Monitoring Dashboard (Grafana)**

The following metrics are scraped from /metrics and visualised in Grafana:

* reports\_submitted\_total — counter by frequency and role

* reports\_approved\_total / reports\_rejected\_total — counters

* whatsapp\_sent\_total / whatsapp\_failed\_total — delivery success rate panel

* api\_request\_duration\_seconds — p50/p95/p99 latency histogram

* offline\_queue\_depth — gauge for pending retry jobs

# **6\. Non-Functional Requirements**

| Requirement | Specification |
| :---- | :---- |
| Performance | API p95 response time \< 300ms under normal load; framework browser renders \< 200ms on first paint |
| Offline | All drafted reports and the framework browser must function fully with no network connection |
| Accessibility | WCAG 2.1 AA: keyboard navigation, ARIA labels, WCAG-contrast colour palette, prefers-reduced-motion support |
| Mobile | Touch-optimised UI (tap targets ≥ 44px); signature canvas works with finger/stylus; responsive grid min 320px |
| Print | Print stylesheet: controls hidden, cards page-break-safe, signature images included |
| Security | JWT expiry enforced; HMAC signature verification on all webhooks; input sanitisation on all user-supplied fields |
| Compliance | Digital signatures captured as Base64 PNG with timestamp; audit log of all status transitions with actor and timestamp |
| Scalability | BullMQ workers are stateless and can be scaled independently from the web server (Kubernetes-ready) |
| Observability | All status transitions logged with structured JSON; Prometheus metrics available at /metrics |

# **7\. Testing & API Tools**

## **7.1 Postman Collection**

A Postman collection (AgriReports-API.postman\_collection.json) covers the following test scenarios:

* Health Check — GET /api/v1/health

* Submit Report — POST /api/v1/reports/:id/submit with Bearer token

* Review Report (Approve) — POST with action: approve, comments, and base64 signature

* Webhook Verification — GET with hub.mode, hub.verify\_token, hub.challenge

* Webhook Event (Delivery Status) — POST with HMAC-signed WhatsApp payload

## **7.2 Load Testing**

A k6 load test script should validate system behaviour at 1,000 report submissions per minute, confirming queue depth remains bounded and p95 latency stays under 500ms under peak load.

# **8\. Delivery & Integration**

## **8.1 Module File Structure**

The Reports module ships as a self-contained folder, framework-agnostic:

* reports.html — Main layout (sidebar \+ form \+ framework viewer)

* reports.css — Scoped styles using CSS custom properties

* reports.js — Core module class: state management, API calls, offline queue, form generation

* README.md — Integration guide and environment setup instructions

* controllers/notificationService.js — Email \+ WhatsApp notification logic

* routes/reports.js — Express route handlers with notification hooks

* workers/retryWorker.js — BullMQ worker for WhatsApp retry queue

* openapi.yaml — OpenAPI 3.0 specification (importable to Swagger / Postman)

## **8.2 Integration Checklist**

| Component | Integration Step |
| :---- | :---- |
| Prometheus \+ Grafana | Point Grafana Data Source to http://app:3000/metrics; import dashboard JSON |
| Redis / BullMQ | Add REDIS\_URL to .env; ensure retryWorker.js starts alongside server.js |
| WhatsApp API | Create Meta App, configure WABA, set WHATSAPP\_PHONE\_NUMBER\_ID and WHATSAPP\_ACCESS\_TOKEN |
| Email (SMTP) | Set SMTP\_\* vars; test via Postman Submit endpoint and confirm email delivery |
| Postman | Import collection; set environment vars (base\_url, jwt\_token, meta\_app\_secret); run Submit → Review → Webhook |
| Docker | Run docker compose up; Redis, app, and optional DB start together |

## **8.3 Suggested Next Phases**

* Kubernetes deployment manifests (Helm chart) to scale BullMQ workers independently from the web server

* Dead-letter dashboard (React/Express) to manually retry or archive failed WhatsApp messages

* Excel / Google Sheets export: auto-generated .xlsx with pre-populated rows, dropdowns, and conditional formatting per frequency

* PowerApps / low-code integration: expose PERIODS JSON as a SharePoint/Dataverse data source with role-based views

* AI-generated closeout insights: prompt model to surface top yield-limiting factors and lessons learned from report data