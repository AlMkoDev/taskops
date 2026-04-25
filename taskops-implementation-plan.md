# TaskOps UX Redesign — Detailed Implementation Plan

**Product:** TaskOps  
**Document Type:** Implementation Plan  
**Version:** 1.0  
**Prepared:** April 2026

---

## 1. Executive Summary

This implementation plan translates the TaskOps UX audit, journey redesign, and backlog into an actionable delivery programme. The goal is to move TaskOps from a strong but operationally heavy prototype into a friction-light daily operating tool.

The programme is structured across **6 sprints** (~12 weeks at 2-week cadence), organised by risk and dependency order:

1. **Trust and Reliability** — fix what breaks confidence
2. **Task Workflow Simplification** — make the core faster
3. **Navigation and IA** — restructure the hierarchy
4. **Projects and Blocked** — reframe coordination surfaces
5. **Team and Analytics** — improve people and decision tools
6. **Reports and Onboarding** — simplify the heaviest module and improve learning

Total estimated scope: **192 story points**

---

## 2. Problem Statement

TaskOps has a solid operations domain model, but the current UX creates unnecessary cognitive load at every stage:

- The app defaults to **Projects**, but the product philosophy is **Tasks-first**
- **Time-sensitive views** use a hardcoded reference date, breaking trust in daily dashboards
- **Dead-end controls** appear interactive but produce no outcome
- **All modules** carry equal visual weight, hiding the primary daily workflow
- **Task creation** asks too much upfront, slowing capture

The net effect: a product that feels like several powerful modules living side by side, rather than one smooth workflow.

---

## 3. Goals and Non-Goals

### Goals

| # | Goal |
|---|------|
| G1 | Make Tasks the unmistakable primary daily workspace |
| G2 | Reduce first-run cognitive load |
| G3 | Restore trust in time-sensitive views |
| G4 | Remove or label all dead-end interactions |
| G5 | Separate core workflow from advanced/admin workflow |
| G6 | Improve discoverability without increasing complexity |

### Non-Goals

- Rebuilding domain logic or data models
- Replacing the reports feature set entirely
- Full visual rebrand before workflow changes are validated
- Role-based access control or permissions model changes

---

## 4. Primary Users and Role Mapping

| Role | Primary Surface | Secondary Surfaces |
|------|----------------|-------------------|
| Operator | Tasks | Blocked |
| Team Lead | Blocked, Team, Projects | Tasks, Analytics |
| Reporting User | Reports | Tasks |
| Manager / Admin | Analytics, Settings | Reports, Team |

The IA and navigation redesign in Sprint 3 will encode this role mapping into the visual hierarchy without hard-locking users to a single path.

---

## 5. Target User Journey

The redesigned journey establishes one unmistakable primary path:

```
Open App (Tasks)
  └─ Review My Work / Due Today / Blocked
       └─ Open Task
            ├─ Update Status / Log Work
            └─ Mark Blocker
                 └─ Escalate via Blocked screen
                      └─ Coordinate in Projects / Team
                           └─ Analyse in Analytics
                                └─ Configure in Settings
```

Reporting users branch at step 1 into Reports. All other advanced surfaces are accessed when context demands, not by default.

---

## 6. Proposed Information Architecture

### Primary Navigation
- Tasks
- Blocked
- Projects
- Reports

### Secondary Navigation (lower visual emphasis)
- Team
- Analytics
- Settings

### Within Tasks
- My Work *(default)*
- Due Today
- Blocked
- Watching
- Recurring
- All Tasks

### Within Projects
- Summary *(default)*
- Daily Board
- WBS
- Gantt
- Cadence

### Within Reports
- My Drafts
- Awaiting Review
- Approved / History
- Admin Tools *(separated from author view)*

### Within Analytics
- Operational Health
- Labor Cost

### Within Settings
- Automations
- Templates
- Routing Rules

---

## 7. Technical Scope by Module

### 7.1 State Management (`use-task-ops-store.ts`)

| Change | Impact | Sprint |
|--------|--------|--------|
| Change `defaultSection` from `projects` to `tasks` | Low | 1 |
| Preserve persisted section for returning users | Low | 1 |
| Remove all `REFERENCE_NOW` / hardcoded date constants | Medium | 1 |
| Expose live `currentDate` / timezone context from store | Medium | 1 |

### 7.2 Tasks Workspace (`tasks-workspace.tsx`)

| Change | Impact | Sprint |
|--------|--------|--------|
| Wire Due Today filter to live date | Medium | 1 |
| Wire timeline grouping to live date | Medium | 1 |
| Wire calendar Today badge to live date | Medium | 1 |
| Add KPI strip (Due Today, Blocked, Overdue, Needs Review) | Medium | 2 |
| Set default filter to My Work | Low | 2 |
| Hide non-functional bulk action bar | Low | 1 |
| Nav rebalance: primary vs secondary | Medium | 3 |

### 7.3 Task Detail Panel (`task-detail-panel.tsx`)

| Change | Impact | Sprint |
|--------|--------|--------|
| Disable/hide Start, Reset, Attach file, Export | Low | 1 |
| Reorder panel: status → work log → blocker action | Medium | 2 |
| Add explicit Mark Blocked action | Medium | 2 |
| Add contextual primary CTA based on task state | Medium | 2 |

### 7.4 Task Creation Modal

| Change | Impact | Sprint |
|--------|--------|--------|
| Split into Essential / Advanced sections | Medium | 2 |
| Pre-fill project/owner from context | Low | 2 |
| Reduce required fields | Low | 2 |
| Rename date fields to "Due Date" | Low | 2 |

### 7.5 Project Workbench (`project-workbench.tsx`)

| Change | Impact | Sprint |
|--------|--------|--------|
| Change default tab to Summary or Daily Board | Low | 4 |
| Add tab helper descriptions | Low | 4 |
| Visually de-emphasise WBS/Gantt/Cadence | Low | 4 |
| Add transitions back to Tasks | Low | 4 |

### 7.6 Reports Module (`reports-module.tsx`)

| Change | Impact | Sprint |
|--------|--------|--------|
| New landing: Continue Draft / Create Report | High | 6 |
| Separate author view from admin/security view | High | 6 |
| Add guided step progression for report editing | Medium | 6 |
| Improve save/submission/review state visibility | Low | 6 |

### 7.7 Onboarding / Walkthrough

| Change | Impact | Sprint |
|--------|--------|--------|
| Shorten walkthrough to 3–4 action-based steps | Medium | 6 |
| Replace architecture walkthrough with habit-teaching flow | Medium | 6 |
| Add contextual module-level hints instead of front-loaded tour | Medium | 6 |

---

## 8. Risk Register

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Date logic changes break existing tests or timezone edge cases | Medium | High | Isolate in a shared date utility; test against multiple TZ configs |
| Nav rebalance disrupts power-user habits | Medium | Medium | Preserve all module access; communicate change in UI |
| Reports simplification reduces specialist efficiency | Low | High | Separate author/admin views cleanly; don't remove capability |
| Unfinished controls remain past Sprint 1 | Low | High | Sprint 1 definition of done requires control cleanup |
| Sprint 6 scope too large for one sprint | Medium | Medium | Time-box reports to author/admin split; carry guided steps to Sprint 7 if needed |

---

## 9. Success Metrics

| Metric | Measurement Approach |
|--------|---------------------|
| Time to first task creation | Instrumented session timing |
| Tasks as primary landing behaviour | Section hit tracking |
| Task creation abandonment rate | Modal open vs submit events |
| Navigation hops per common workflow | Click-path analysis |
| Blocked screen engagement by leads | Role-segmented session data |
| Onboarding completion rate | Walkthrough step tracking |

---

## 10. Definition of Done (All Sprints)

- [ ] UX copy matches actual behaviour
- [ ] No visible dead-end controls
- [ ] Empty states provide one clear next action
- [ ] Navigation hierarchy reflects real product priorities
- [ ] Time-based views use live date logic
- [ ] Core task flow works without training
- [ ] Regression tests pass for affected flows
- [ ] Design review sign-off per sprint

---

## 11. Release Strategy

| Milestone | After Sprint | What Ships |
|-----------|-------------|-----------|
| Core Workflow Improvement | Sprint 2 | Trust fixes + faster task flow |
| Workflow Coherence | Sprint 4 | IA restructure + Projects/Blocked reframe |
| Full UX Redesign Phase 1 | Sprint 6 | Reports simplification + onboarding |

---

## 12. Team and Capacity Assumptions

| Role | Allocation |
|------|-----------|
| Product Designer | 1 FTE |
| Frontend Engineer | 1 FTE |
| Full-Stack Engineer | 1 FTE |
| QA (optional) | 0.5 FTE from Sprint 2 |

**Estimated velocity scenarios:**

| Velocity | Projected Duration |
|----------|--------------------|
| 20–25 pts/sprint | 8–10 sprints |
| 30–35 pts/sprint | 6–7 sprints |
| 40+ pts/sprint | 6 sprints (tight scope) |

---

## 13. Appendix: Ticket Cross-Reference

| Ticket | Sprint | Story Points |
|--------|--------|-------------|
| UX-001 Default landing to Tasks | 1 | 2 |
| UX-002 Live date logic | 1 | 13 |
| UX-003 Dead-end controls | 1 | 5 |
| UX-004 Task creation redesign | 2 | 13 |
| UX-005 Tasks default state | 2 | 8 |
| UX-006 Task detail execution flow | 2 | 15 |
| UX-007 Nav rebalance | 3 | 13 |
| UX-008 Search scope | 3 | 7 |
| UX-009 Projects reframe | 4 | 13 |
| UX-010 Workbench default tab | 4 | 7 |
| UX-011 Reports author/admin split | 6 | 13 |
| UX-012 Guided report progression | 6 | 8 |
| UX-013 Blocked as command centre | 4 | 13 |
| UX-014 Team split | 5 | 15 |
| UX-015 Action-first onboarding | 6 | 10 |

---

*End of Implementation Plan*
