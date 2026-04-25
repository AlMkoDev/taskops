# TaskOps/AgriReports Guided Tour Specification

## Architecture Overview

**Approach**: Per-Module Wizards (7 separate tours)  
**Design System**: Based on agriops_tour_improved.html visual patterns  
**Persistence**: LocalStorage tracking per-module completion  
**Trigger Strategy**: First visit OR manual "Take Tour" button

---

## Global Design Patterns

### Visual Design (from agriops_tour_improved.html)
- **Color Palette**: Green deep (#1a3a2a), Green mid (#27ae60), Amber (#e67e22), Red (#c0392b)
- **Typography**: Fraunces (serif) for headings, DM Sans for body
- **Spotlight**: 9999px overlay with 12px padding, pulse animation ring
- **Tooltip Modal**: 400px max-width, 4 directional arrows, smooth transitions
- **Progress Indicators**: Dots with active/done states
- **Context Boxes**: Green left border, italic text, light green background
- **Skip Confirmation**: Bottom toast with 6-second auto-dismiss
- **Completion Modal**: Centered card with celebration icon and 3 action buttons

### Common Components (All Tours)
1. **Progress Dots**: Step X of Y with active pill shape
2. **Navigation**: Back ← | Next → | Exit Tour
3. **Keyboard Support**: ArrowRight/Enter (next), ArrowLeft (back), Escape (exit confirm)
4. **Spotlight**: Smooth 0.45s cubic-bezier transition
5. **Module Auto-Switch**: Navigate to correct module before step displays
6. **BeforeShow Hooks**: Prepare UI state (open panels, expand sections)

---

## Tour 1: Global Onboarding (First Login)

**Storage Key**: `taskops:tour:global:complete`  
**Trigger**: First time app loads (check localStorage)  
**Steps**: 5  
**Estimated Time**: 90 seconds  
**Module**: Spans multiple modules (auto-switches)

### Step 1: Welcome
- **Target**: null (center modal)
- **Title**: "Welcome to TaskOps Workspace"
- **Description**: "Your agricultural operations command center — from field tasks to harvest analytics. This tour covers all 6 modules in about 3 minutes."
- **Context**: "💡 Designed for farm managers, agronomists, and field supervisors to track work, costs, and compliance."
- **Position**: center
- **BeforeShow**: null

### Step 2: Navigation Sidebar
- **Target**: "#sidebar"
- **Title**: "Your Workspace Navigation"
- **Description**: "Every module lives in the left sidebar: My Work for daily tasks, Projects for seasonal planning, Team for workload management, Reports, Analytics, and Settings."
- **Context**: "💡 The active module highlights in green. Click any module to jump directly to it."
- **Position**: right
- **BeforeShow**: null

### Step 3: Top Bar Actions
- **Target**: ".top-bar"
- **Title**: "Quick Actions & Search"
- **Description**: "Use the search bar to find tasks, projects, or reports instantly. The + New Task button creates tasks from anywhere in the app."
- **Context**: "💡 Pro tip: Search works across task titles, tags, project names, and team members."
- **Position**: bottom
- **BeforeShow**: null

### Step 4: View Switching
- **Target**: ".module-nav"
- **Title**: "Multiple Ways to View Your Work"
- **Description**: "Switch between List (detailed rows), Board (Kanban columns), Timeline (Gantt-style), and Calendar (month view) to match your planning style."
- **Context**: "💡 Each view shows the same underlying data — just organized differently for your workflow."
- **Position**: bottom
- **BeforeShow**: null

### Step 5: Getting Help
- **Target**: ".help-btn"
- **Title**: "Always Accessible Help"
- **Description**: "Click 'Restart Tour' anytime from the sidebar footer to replay this walkthrough. Each module also has its own detailed tour."
- **Context**: "💡 Module-specific tours dive deeper — you'll find 'Take Tour' buttons in Projects, Team, Reports, Analytics, and Settings."
- **Position**: right
- **BeforeShow**: null

**Completion Modal**:
- **Title**: "You're ready to start!"
- **Description**: "You've seen the workspace overview. Now explore individual modules with their own guided tours, or dive right into My Work."
- **Actions**: 
  - Primary: "Go to My Work" (navigates to tasks module)
  - Secondary: "Take Module Tours" (opens tasks module tour)
  - Tertiary: "Help Center" (opens documentation)

---

## Tour 2: Tasks Module

**Storage Key**: `taskops:tour:tasks:complete`  
**Trigger**: First visit to Tasks module OR click "Take Tour" in Tasks  
**Steps**: 7  
**Estimated Time**: 2 minutes  
**Module**: tasks (stays on tasks)

### Step 1: Tasks Overview
- **Target**: ".section-title" (My Work heading)
- **Title**: "My Work — Your Daily Command Center"
- **Description**: "This is where you'll spend most of your day. See all tasks assigned to you, filter by urgency, and track progress across field operations."
- **Context**: "💡 My Work is your default view — it automatically filters to show only your assigned tasks."
- **Position**: bottom
- **BeforeShow**: null

### Step 2: Filter Pills
- **Target**: ".filter-bar"
- **Title**: "Focus Your Work with Filters"
- **Description**: "Quickly surface what matters: Due Today for urgent field work, Blocked for items needing escalation, Overdue for missed deadlines, Review for pending approvals."
- **Context**: "💡 Due Today shows all tasks requiring action before end of shift — check this first every morning."
- **Position**: bottom
- **BeforeShow**: null

### Step 3: Task Row Anatomy
- **Target**: ".task-row" (first task)
- **Title**: "Understanding Task Information"
- **Description**: "Each row shows: priority indicator (red=P1 urgent, amber=P2, blue=P3), task title, due date, assignee, estimated hours, and current status badge."
- **Context**: "💡 Priority P1 tasks are critical path items — like irrigation failures during dry season. Address these first."
- **Position**: right
- **BeforeShow**: null

### Step 4: Task Detail Panel
- **Target**: "#detailPanel"
- **Title**: "Task Detail Panel — Execution Hub"
- **Description**: "Click any task to open the detail panel. Here you update status, log hours, work through checklists, add field photos, and flag blockers."
- **Context**: "💡 Logged hours flow directly into Labor Cost Analytics — keeping you within harvest-season budget."
- **Position**: left
- **BeforeShow**: () => openDetailPanel()

### Step 5: Status Workflow
- **Target**: "#statusSelect" (in detail panel)
- **Title**: "Task Status Lifecycle"
- **Description**: "Tasks flow through: Backlog → Ready → In Progress → Review → Done. The primary action button at the top advances status contextually (e.g., 'Start Work' moves Ready → In Progress)."
- **Context**: "💡 Moving a task to 'In Progress' automatically logs the start time for duration tracking."
- **Position**: left
- **BeforeShow**: () => openDetailPanel()

### Step 6: Work Logging & Checklists
- **Target**: "#logWorkBtn"
- **Title**: "Log Work & Track Progress"
- **Description**: "Click '+ Log Hours / Notes' to record time spent and add context for the next person. Work through checklists to ensure nothing is missed in field procedures."
- **Context**: "💡 Example log: 'Replaced 3 drip lines in Section B, water pressure normalized. 45 min spent.' This helps the next technician."
- **Position**: left
- **BeforeShow**: () => openDetailPanel()

### Step 7: Blocker Management
- **Target**: "#blockerBtn"
- **Title**: "Flag Blockers Immediately"
- **Description**: "When work is stuck (equipment failure, missing approvals, weather delays), click 'Mark as Blocker' to trigger escalation workflows and notify supervisors."
- **Context**: "💡 Blockers unresolved >4 hours auto-escalate to Farm Manager via the automation rules in Settings."
- **Position**: left
- **BeforeShow**: () => openDetailPanel()

**Completion Modal**:
- **Title**: "Tasks mastery complete!"
- **Description**: "You now know how to filter, execute, log work, and escalate blockers. Ready to see how tasks roll up into Projects?"
- **Actions**:
  - Primary: "Continue to Projects Tour" (starts projects tour)
  - Secondary: "Start Using Tasks" (closes tour, stays on tasks)
  - Tertiary: "Skip to Analytics" (jumps to analytics module)

---

## Tour 3: Projects Module

**Storage Key**: `taskops:tour:projects:complete`  
**Trigger**: First visit to Projects module OR click "Take Tour" in Projects  
**Steps**: 6  
**Estimated Time**: 2 minutes  
**Module**: projects (stays on projects)

### Step 1: Project Cards Overview
- **Target**: ".section-title" (Projects heading)
- **Title**: "Projects — Seasonal & Long-Term Planning"
- **Description**: "Monitor project health at a glance: task count, progress percentage, blocked items, and logged hours. Each card represents a seasonal cycle or initiative."
- **Context**: "💡 Common project types: Seasonal Planting, Livestock Rotation, Irrigation Upgrade, Harvest Logistics."
- **Position**: bottom
- **BeforeShow**: null

### Step 2: Project Health Metrics
- **Target**: ".card:first-child"
- **Title**: "Reading Project Health"
- **Description**: "The progress bar shows completion %, while stat chips display task count, hours logged, and blockers. Color-coded badges indicate status: On Track (green), At Risk (amber), Blocked (red)."
- **Context**: "💡 A project with 1+ blocked tasks shows a red badge even if overall progress is high — address blockers first."
- **Position**: right
- **BeforeShow**: null

### Step 3: Project Workbench
- **Target**: ".panel-btn-secondary" (Open Workbench button)
- **Title**: "Project Workbench — Deep Dive"
- **Description**: "Click 'Open Workbench' to access 5 tabs: Summary (health overview), Daily Board (execution view), WBS Tasks (work breakdown), Gantt (timeline), and Cadence (recurring rhythms)."
- **Context**: "💡 Start with Summary for a quick health check, then use Daily Board during active execution phases."
- **Position**: right
- **BeforeShow**: null

### Step 4: WBS (Work Breakdown Structure)
- **Target**: ".wbs-tree"
- **Title**: "Work Breakdown Structure"
- **Description**: "Projects break down into phases (e.g., Land Preparation → Planting → Growth Monitoring → Harvest). Each phase contains multiple tasks with dependencies and cadence types."
- **Context**: "💡 WBS tasks can have cadence types: Fixed (one-time), Stage (phase-based), Threshold (trigger-based), Milestone (checkpoint), Continuous (ongoing)."
- **Position**: right
- **BeforeShow**: null

### Step 5: Gantt Timeline View
- **Target**: null (explain concept with mock Gantt visual)
- **Title**: "Gantt View — Schedule Pressure"
- **Description**: "The Gantt tab shows task timelines visually. Identify schedule compression, overlapping dependencies, and deadline risks. Red bars indicate overdue tasks."
- **Context**: "💡 Use Gantt view before planting season to ensure land prep completes before seed delivery dates."
- **Position**: center
- **BeforeShow**: null

### Step 6: Creating Projects
- **Target**: ".btn-new" (New Task button — explain it creates projects too)
- **Title**: "Creating New Projects"
- **Description**: "Use the + button to create projects with: name, type, owner, team members, timeline (weeks), and description. You can also use templates for common seasonal cycles."
- **Context**: "💡 Templates available: Irish Potato Rotation (16 weeks), Livestock Grazing Cycle (12 weeks), Irrigation Maintenance (8 weeks)."
- **Position**: bottom
- **BeforeShow**: null

**Completion Modal**:
- **Title**: "Projects mastered!"
- **Description**: "You can now plan seasonal cycles, track WBS phases, and identify schedule pressure. Next: learn how to manage the team executing these projects."
- **Actions**:
  - Primary: "Continue to Team Tour" (starts team tour)
  - Secondary: "Start Using Projects" (closes tour, stays on projects)
  - Tertiary: "View Project Templates" (opens templates in Settings)

---

## Tour 4: Team Module

**Storage Key**: `taskops:tour:team:complete`  
**Trigger**: First visit to Team module OR click "Take Tour" in Team  
**Steps**: 6  
**Estimated Time**: 2 minutes  
**Module**: team (stays on team)

### Step 1: Team Overview
- **Target**: ".section-title" (Team Management heading)
- **Title**: "Team — Workload & Capacity Management"
- **Description**: "Monitor team member utilization, identify overload before it causes delays, and manage seasonal worker onboarding with the HR Import Wizard."
- **Context**: "💡 During harvest season, team capacity planning prevents critical bottlenecks in time-sensitive operations."
- **Position**: bottom
- **BeforeShow**: null

### Step 2: Team Member Cards
- **Target**: ".card:first-child" (first team member)
- **Title**: "Reading Team Member Cards"
- **Description**: "Each card shows: name, role, utilization % (color-coded: green <70%, amber 70-90%, red >90%), open/blocked tasks, and hours logged this week."
- **Context**: "💡 Utilization = (estimated hours / capacity hours) × 100. Red (>90%) means the person is overallocated and needs task redistribution."
- **Position**: right
- **BeforeShow**: null

### Step 3: Team Filters
- **Target**: ".filter-bar"
- **Title**: "Filter by Team Pressure Points"
- **Description**: "Quickly find: Overloaded members (>90% capacity), Blocked members (have tasks stuck), or Overdue members (past-d deadline tasks needing intervention)."
- **Context**: "💡 Filter by 'Overloaded' during harvest crunch time to reallocate tasks before deadlines slip."
- **Position**: bottom
- **BeforeShow**: null

### Step 4: HR Import Wizard
- **Target**: ".card:last-child" (HR Import Wizard card)
- **Title**: "HR Import Wizard — Bulk Seasonal Onboarding"
- **Description**: "Click the HR Import Wizard to bulk-add seasonal workers with SA-compliant agricultural roles, cost tracking, and statutory compliance (UIF, contracts, overtime eligibility)."
- **Context**: "💡 The wizard has 4 steps: Select Categories → Choose Roles → Configure Quantities → Review Costs & Import."
- **Position**: right
- **BeforeShow**: null

### Step 5: Agricultural Role System
- **Target**: null (explain concept with role icons)
- **Title**: "Agricultural Role Categories"
- **Description**: "Roles are organized by category: Management (Farm Manager), Field Operations (Supervisor, Technician), Post-Harvest (Grading, Packing), Logistics (Transport, Storage), Technical (Irrigation, Soil), Quality & Safety, and Support."
- **Context**: "💡 Each role includes: hourly rate, monthly base cost, total cost to employer (with statutory burden), and payroll timing (weekly/monthly/piece-rate)."
- **Position**: center
- **BeforeShow**: null

### Step 6: Cost Tracking Integration
- **Target**: null (show cost flow diagram)
- **Title**: "How Team Costs Flow to Analytics"
- **Description**: "Logged hours × role hourly rate = actual labor cost. This feeds directly into Labor Cost Analytics, showing budget vs actual by role category and engagement type (full-time, seasonal, contract)."
- **Context**: "💡 Example: Field Supervisor (R85/hr) logs 40h = R3,400. Analytics shows this against the R12,000/week budget threshold."
- **Position**: center
- **BeforeShow**: null

**Completion Modal**:
- **Title**: "Team management unlocked!"
- **Description**: "You can now balance workloads, onboard seasonal workers, and track labor costs. See the financial impact in Analytics."
- **Actions**:
  - Primary: "Continue to Reports Tour" (starts reports tour)
  - Secondary: "Start Using Team" (closes tour, stays on team)
  - Tertiary: "Open HR Import Wizard" (launches the wizard)

---

## Tour 5: Reports Module

**Storage Key**: `taskops:tour:reports:complete`  
**Trigger**: First visit to Reports module OR click "Take Tour" in Reports  
**Steps**: 6  
**Estimated Time**: 2 minutes  
**Module**: reports (stays on reports)

### Step 1: Reports Overview
- **Target**: ".section-title" (Reports heading)
- **Title**: "Reports — Compliance & Documentation"
- **Description**: "Create monthly field summaries, quarterly cost reports, and incident logs. Reports auto-populate from logged tasks and team hours — saving hours of manual entry."
- **Context**: "💡 Reports are required for: investor updates, compliance audits, seasonal performance reviews, and insurance documentation."
- **Position**: bottom
- **BeforeShow**: null

### Step 2: Report Status Workflow
- **Target**: ".card:first-child"
- **Title**: "Report Lifecycle: Draft → Review → Approved"
- **Description**: "Reports flow through 3 stages with full audit trail. Draft (editable) → Review (pending approval) → Approved (locked, exportable). Each transition is timestamped and attributed."
- **Context**: "💡 Only users with 'Reviewer' or 'Admin' role can approve reports. Approvers receive email/WhatsApp notifications."
- **Position**: right
- **BeforeShow**: null

### Step 3: Report Templates
- **Target**: null (explain templates concept)
- **Title**: "Report Templates — Pre-Built Structures"
- **Description**: "Use templates for common reports: Monthly Field Summary (auto-populates task metrics), Quarterly Cost & Labour Report (payroll vs budget), Incident Log (equipment failures, resolutions)."
- **Context**: "💡 Templates auto-pull data from: task completion rates, logged hours, blocker counts, team utilization, and project progress."
- **Position**: center
- **BeforeShow**: null

### Step 4: Rich Text Editor
- **Target**: null (describe editor features)
- **Title**: "Rich Text Editor & Data Embedding"
- **Description**: "Reports include formatted text, embedded charts from Analytics, field photos, and data tables. The editor supports markdown, tables, and image uploads."
- **Context**: "💡 Example: Monthly Field Summary includes auto-generated chart showing task completion trend + manually written narrative about weather impacts."
- **Position**: center
- **BeforeShow**: null

### Step 5: Notifications & Audit
- **Target**: null (explain notification system)
- **Title**: "Notifications & Audit Trail"
- **Description**: "Report submissions trigger email/WhatsApp notifications to reviewers. All edits, status changes, and approvals are logged in the audit trail for compliance tracking."
- **Context**: "💡 Audit trail includes: who made the change, what changed, timestamp, and IP address. Required for ISO and investor audits."
- **Position**: center
- **BeforeShow**: null

### Step 6: Offline Support & Export
- **Target**: null (explain offline queue)
- **Title**: "Offline Support & Export Options"
- **Description**: "Reports can be drafted offline and sync when connectivity returns. Export to PDF for sharing, or generate DOCX for further editing. Approved reports are immutable."
- **Context**: "💡 Field supervisors often draft reports in areas with poor connectivity — the offline queue ensures nothing is lost."
- **Position**: center
- **BeforeShow**: null

**Completion Modal**:
- **Title**: "Reports workflow mastered!"
- **Description**: "You can now create, review, and export compliance reports with full audit trails. See the data behind reports in Analytics."
- **Actions**:
  - Primary: "Continue to Analytics Tour" (starts analytics tour)
  - Secondary: "Start Using Reports" (closes tour, stays on reports)
  - Tertiary: "Create New Report" (opens report creation)

---

## Tour 6: Analytics Module

**Storage Key**: `taskops:tour:analytics:complete`  
**Trigger**: First visit to Analytics module OR click "Take Tour" in Analytics  
**Steps**: 6  
**Estimated Time**: 2 minutes  
**Module**: analytics (stays on analytics)

### Step 1: Analytics Overview
- **Target**: ".section-title" (Analytics Dashboard heading)
- **Title**: "Analytics — Operational & Financial Insights"
- **Description**: "Switch between Task Analytics (operational performance) and Labor Cost Analytics (financial tracking). Cross-signal insights connect task blockers directly to cost overruns."
- **Context**: "💡 Analytics updates in real-time as tasks are completed and hours are logged — no manual report generation needed."
- **Position**: bottom
- **BeforeShow**: null

### Step 2: Task Analytics Metrics
- **Target**: ".card-grid .card:nth-child(1)" (Completion Rate)
- **Title**: "Task Performance Metrics"
- **Description**: "Key metrics: Completion Rate (% of tasks done), Overdue Tasks (past deadline), Active Blockers (stuck items), and Hours Logged (productivity tracking). Compare trends vs last month/week."
- **Context**: "💡 Completion Rate <75% usually indicates understaffing or unrealistic deadlines. Investigate with team workload data."
- **Position**: right
- **BeforeShow**: null

### Step 3: Project Performance Highlights
- **Target**: ".card-grid .card:nth-child(5)" (project performance section)
- **Title**: "Project-Level Performance"
- **Description**: "See which projects are on track vs at risk. Projects with high blocker counts or low completion rates surface here for early intervention."
- **Context**: "💡 Example: 'Q3 Irish Potato Rotation' at 68% with 1 blocker — the blocker is delaying planting phase, which compresses harvest window."
- **Position**: right
- **BeforeShow**: null

### Step 4: Labor Cost Analytics — Overview
- **Target**: null (switch to Labor Cost tab)
- **Title**: "Labor Cost Command View"
- **Description**: "Total monthly labor exposure, broken down by category (Field Operations, Management, etc.), with fixed vs variable costs and statutory burden percentage."
- **Context**: "💡 Statutory burden includes: UIF, skills levy, overtime premiums, and contractual obligations. Typically 15-25% of base payroll in South Africa."
- **Position**: center
- **BeforeShow**: () => switchToLaborCostTab()

### Step 5: Labor Cost — Category Breakdown
- **Target**: null (show category bars)
- **Title**: "Cost by Role Category"
- **Description**: "Bar chart shows budget consumption by role: Field Supervisor (88%), Agronomist (72%), Field Technician (61%), Seasonal Labour (95%). Red bars indicate >90% budget consumption."
- **Context**: "💡 Seasonal Labour at 95% during harvest is expected, but >100% means you need to renegotiate rates or reduce scope."
- **Position": center
- **BeforeShow**: () => switchToLaborCostTab()

### Step 6: Workforce Roster
- **Target**: null (explain roster view)
- **Title**: "Detailed Workforce Roster"
- **Description**: "Switch to 'Workforce Roster' tab for individual worker costs: name, role category, engagement type, hourly rate, monthly cost, and statutory compliance status. Filter by category or engagement type."
- **Context**: "💡 Use roster for budget planning: 'If I add 3 seasonal pickers at R65/hr for 4 weeks, what's the total cost impact?'"
- **Position**: center
- **BeforeShow**: () => switchToLaborCostTab()

**Completion Modal**:
- **Title**: "Analytics insights unlocked!"
- **Description**: "You can now track operational performance and labor costs, identify bottlenecks, and forecast budget impact. Configure automation rules in Settings."
- **Actions**:
  - Primary: "Continue to Settings Tour" (starts settings tour)
  - Secondary: "Start Using Analytics" (closes tour, stays on analytics)
  - Tertiary: "Export Analytics" (opens export dialog)

---

## Tour 7: Settings & Automations Module

**Storage Key**: `taskops:tour:settings:complete`  
**Trigger**: First visit to Settings module OR click "Take Tour" in Settings  
**Steps**: 6  
**Estimated Time**: 2 minutes  
**Module**: settings (stays on settings)

### Step 1: Settings Overview
- **Target**: ".section-title" (Settings & Automation heading)
- **Title**: "Settings — Configuration & Automation"
- **Description**: "Configure task templates, report templates, automation rules, escalation paths, and notification preferences. Automations reduce manual admin and ensure consistent processes."
- **Context**: "💡 Well-configured automations save 2-3 hours per week by auto-escalating blockers, notifying teams, and generating recurring tasks."
- **Position**: bottom
- **BeforeShow**: null

### Step 2: Automation Rules
- **Target**: ".card:first-child" (Automation Rules card)
- **Title**: "Automation Rules — Trigger → Action"
- **Description**: "Rules follow: WHEN (trigger) → THEN (action). Examples: WHEN task_overdue >4h → THEN notify_owner. WHEN task_blocked → THEN escalate to manager. Toggle rules on/off."
- **Context**: "💡 Active rules: Auto-Escalate Blockers (4h), Harvest Completion Alert, Labour Cost Threshold Alert (R12,000/week)."
- **Position**: right
- **BeforeShow**: null

### Step 3: Task Templates
- **Target**: ".card-grid .card:first-child" (Task Templates)
- **Title**: "Task Templates — Reusable Structures"
- **Description**: "Create templates for common field operations: Daily Irrigation Check, Soil Testing Protocol, Equipment Maintenance. Templates pre-fill task type, priority, checklists, and estimated hours."
- **Context**: "💡 Example: 'Daily Irrigation Check' template includes checklist (inspect lines, test pressure, record readings), P2 priority, 2h estimate, recurring daily."
- **Position": right
- **BeforeShow**: null

### Step 4: Report Templates
- **Target**: ".card-grid .card:nth-child(2)" (Report Templates — explain)
- **Title**: "Report Templates — Cadence & Structure"
- **Description**: "Set up recurring reports with cadence (monthly, quarterly, annual), reviewer assignment, and auto-population rules. Templates define what data gets pulled from tasks and analytics."
- **Context**: "💡 Monthly Field Summary template auto-pulls: task completion rate, hours logged, blocker count, project progress, and team utilization for the selected month."
- **Position": right
- **BeforeShow**: null

### Step 5: Escalation Rules
- **Target**: ".card:last-child" (Escalation Rules)
- **Title**: "Escalation Paths — Who Gets Notified"
- **Description**: "Define escalation chains: P1 Blocker → Farm Manager (immediate), P2 Overdue >2d → Supervisor (daily digest), Budget Breach >R12,000 → Finance (instant). Escalations use email + WhatsApp."
- **Context**: "💡 Escalation rules work with automation rules: automation detects the condition, escalation determines who receives the alert."
- **Position": right
- **BeforeShow": null

### Step 6: Notification Preferences
- **Target**: null (explain notification settings)
- **Title**: "Notification Channels & Preferences"
- **Description**: "Configure delivery channels (email, WhatsApp, in-app), digest frequency (instant, daily, weekly), and quiet hours (no notifications 10pm-6am unless P1 critical)."
- **Context**: "💡 Farm managers typically set: instant alerts for P1 blockers, daily digest for overdue tasks, weekly summary for cost thresholds."
- **Position": center
- **BeforeShow": null

**Completion Modal**:
- **Title**: "All tours complete! 🎉"
- **Description**: "You've mastered all 6 modules of TaskOps. You're ready to optimize field operations, manage team workloads, track costs, and maintain compliance."
- **Actions**:
  - Primary: "Start Using TaskOps" (closes all tours, navigates to My Work)
  - Secondary: "Replay Any Tour" (opens tour selector modal)
  - Tertiary: "Help Center" (opens documentation)

---

## Implementation Notes

### Tour Orchestration
```typescript
interface TourStep {
  target: string | null;        // CSS selector or null for center
  title: string;
  description: string;
  context: string;              // "💡 ..." callout
  position: 'top' | 'bottom' | 'left' | 'right' | 'center';
  module: string | null;        // Module to switch to
  beforeShow: (() => void) | null;  // Hook to prepare UI
}
```

### Persistence Strategy
```typescript
const TOUR_STORAGE_KEYS = {
  global: 'taskops:tour:global:complete',
  tasks: 'taskops:tour:tasks:complete',
  projects: 'taskops:tour:projects:complete',
  team: 'taskops:tour:team:complete',
  reports: 'taskops:tour:reports:complete',
  analytics: 'taskops:tour:analytics:complete',
  settings: 'taskops:tour:settings:complete'
};

// Store completion timestamp
localStorage.setItem(TOUR_STORAGE_KEYS.tasks, JSON.stringify({
  completed: true,
  completedAt: '2026-04-22T10:30:00Z',
  lastStep: 7
}));
```

### Tour Trigger Logic
```typescript
// On module mount
useEffect(() => {
  const tourComplete = localStorage.getItem(TOUR_STORAGE_KEYS[module]);
  if (!tourComplete) {
    setShowTourPrompt(true);  // "Take Tour" banner
  }
}, [module]);

// Manual trigger
<button onClick={() => startTour('tasks')}>Take Tour</button>
```

---

## Total Tour Coverage

| Module | Steps | Est. Time | Key Concepts |
|--------|-------|-----------|--------------|
| Global Onboarding | 5 | 90s | Navigation, views, search |
| Tasks | 7 | 2m | Filters, detail panel, workflow, blockers |
| Projects | 6 | 2m | Health metrics, WBS, Gantt, templates |
| Team | 6 | 2m | Utilization, HR import, roles, costs |
| Reports | 6 | 2m | Lifecycle, templates, audit, offline |
| Analytics | 6 | 2m | Task metrics, labor costs, forecasting |
| Settings | 6 | 2m | Automations, templates, escalations |
| **TOTAL** | **42** | **~14m** | **Full platform mastery** |

---

## Accessibility & UX Guidelines

1. **Keyboard Navigation**: All tours navigable with Tab, Enter, Arrow keys, Escape
2. **Screen Reader Support**: ARIA labels on all interactive tour elements
3. **Reduced Motion**: Respect `prefers-reduced-motion` — disable pulse animation
4. **Color Contrast**: All text meets WCAG AA (4.5:1 minimum)
5. **Skip Option**: Always visible, 2-click exit (confirm toast prevents accidents)
6. **Progress Save**: If user exits mid-tour, offer "Resume from Step X" on return
7. **Mobile Responsive**: Tooltip repositioning for screens <768px
8. **Tour Replay**: Available from sidebar footer and module headers

---

## Next Steps

1. ✅ Review and approve this spec document
2. Create React components based on agriops_tour_improved.html design
3. Implement per-module tour orchestrator
4. Add localStorage persistence
5. Integrate with existing TasksWorkspace component
6. Test across all 7 tours
7. Add analytics tracking (tour completion rates, drop-off points)
