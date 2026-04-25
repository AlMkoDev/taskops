# TaskOps UX Redesign — Sprint-by-Sprint Task Breakdown

**Product:** TaskOps  
**Document Type:** Sprint Task Breakdown  
**Version:** 1.0  
**Prepared:** April 2026

---

## Story Point Scale

| Points | Size | Typical Effort |
|--------|------|---------------|
| 1 | Trivial | < 1 hour |
| 2 | Very Small | Half a day |
| 3 | Small | 1 day |
| 5 | Moderate | 2–3 days |
| 8 | Large | 3–5 days |
| 13 | Very Large | Full sprint slice |

---

## Dependency Legend

> **Depends on:** tickets that must be complete before this can begin  
> **Blocks:** tickets that cannot begin until this is done  
> **Risk:** known implementation or coordination risk

---

## Sprint 1: Trust and Reliability

**Objective:** Remove the biggest trust-breakers before changing structure. Make the app reliable enough for daily use.

**Sprint Goal:** A first-time user can open the app, trust time-based views, and encounter no clickable dead ends.

**Total Points: 32**

---

### S1-01 — Set default landing section to Tasks

| Field | Detail |
|-------|--------|
| **Points** | 2 |
| **Owner** | Frontend Engineer |
| **File** | `use-task-ops-store.ts` line ~150 |
| **Depends on** | None |
| **Blocks** | S1-02, S2-05, S2-06 |

**Description:**  
Update the persisted store default from `projects` to `tasks`. This is the single highest-signal change for first-run alignment with the product's stated philosophy.

**Acceptance Criteria:**
- [ ] First load opens in Tasks section
- [ ] Empty-state guidance in Tasks is shown when no tasks exist
- [ ] Default section value in store is `tasks`
- [ ] No other logic is broken by the default change

**Risk:** Low. Simple store default change, but verify no secondary logic assumes `projects` as the starting context.

---

### S1-02 — Audit persisted state for returning users

| Field | Detail |
|-------|--------|
| **Points** | 2 |
| **Owner** | Full-Stack Engineer |
| **File** | `use-task-ops-store.ts` |
| **Depends on** | S1-01 |
| **Blocks** | None |

**Description:**  
Ensure returning users who previously had a saved section preference are not silently reset. The default change should apply to new users only, or be communicated clearly.

**Acceptance Criteria:**
- [ ] Returning users with a persisted section preference retain it
- [ ] New users (no persisted state) land in Tasks
- [ ] No hydration errors or state mismatch on first load after the change

**Risk:** Low-medium. Hydration edge cases in SSR/SSG contexts.

---

### S1-03 — Replace hardcoded "today" logic in Due Today filter

| Field | Detail |
|-------|--------|
| **Points** | 5 |
| **Owner** | Full-Stack Engineer |
| **File** | `tasks-workspace.tsx` — `REFERENCE_NOW`, `due_today` filter logic |
| **Depends on** | None |
| **Blocks** | S1-04, S1-05, S1-06, S2-05 |

**Description:**  
The Due Today task filter uses a hardcoded reference date (`2026-04-07`). Replace with a live `new Date()` call or a shared date utility. This is the root of the trust problem in daily dashboards.

**Acceptance Criteria:**
- [ ] Due Today filter reflects the actual current date at time of page load
- [ ] Filter is recalculated on revisit, not cached to a stale value
- [ ] A shared date utility is created to avoid repeating this pattern
- [ ] Existing filter tests updated to not rely on hardcoded date assertions

**Risk:** Medium. May affect snapshot tests, integration tests, or any test that currently depends on the fixed reference date.

---

### S1-04 — Replace hardcoded reference date in timeline grouping

| Field | Detail |
|-------|--------|
| **Points** | 5 |
| **Owner** | Full-Stack Engineer |
| **File** | `tasks-workspace.tsx` — timeline section grouping |
| **Depends on** | S1-03 (shared date utility) |
| **Blocks** | S1-06 |

**Description:**  
Task timeline groupings (Today, This Week, Overdue, etc.) use the same hardcoded reference date. Migrate to the shared date utility created in S1-03.

**Acceptance Criteria:**
- [ ] Timeline groups (Today / This Week / Next Week / Overdue) reflect live date
- [ ] Groupings recalculate correctly across date boundaries (e.g., midnight transitions)
- [ ] Uses shared date utility from S1-03

**Risk:** Medium. Timeline display logic may have its own boundary conditions around week start day configuration.

---

### S1-05 — Replace hardcoded reference date in calendar view

| Field | Detail |
|-------|--------|
| **Points** | 5 |
| **Owner** | Full-Stack Engineer |
| **File** | `tasks-workspace.tsx` — calendar Today badge, month anchoring |
| **Depends on** | S1-03 (shared date utility) |
| **Blocks** | S1-06 |

**Description:**  
The calendar "Today" badge and the default month anchor are pinned to the hardcoded date. Replace with live date logic using the shared utility.

**Acceptance Criteria:**
- [ ] Calendar defaults to current month on open
- [ ] Today badge highlights the actual current date
- [ ] Navigating months works correctly relative to real today
- [ ] Uses shared date utility from S1-03

**Risk:** Low-medium. Calendar component may rely on internal state that was seeded with the hardcoded date.

---

### S1-06 — Standardise timezone/date formatting across task views

| Field | Detail |
|-------|--------|
| **Points** | 3 |
| **Owner** | Full-Stack Engineer |
| **File** | Task views, date display components |
| **Depends on** | S1-03, S1-04, S1-05 |
| **Blocks** | None |

**Description:**  
After replacing hardcoded dates, ensure the formatting and timezone handling is consistent across all three views (list, timeline, calendar). Dates should display in a consistent format and respect the user's local timezone or a configured org timezone.

**Acceptance Criteria:**
- [ ] Date format is consistent across list, timeline, and calendar views
- [ ] Timezone behaviour is documented and consistent
- [ ] No timezone-shift bugs where a task due "today" appears as "yesterday" or "tomorrow"

**Risk:** Low-medium. Timezone handling is a common source of subtle bugs.

---

### S1-07 — Disable or hide non-functional task detail controls

| Field | Detail |
|-------|--------|
| **Points** | 3 |
| **Owner** | Frontend Engineer |
| **File** | `task-detail-panel.tsx` lines ~194, ~199 |
| **Depends on** | None |
| **Blocks** | S1-09, S2-07 |

**Description:**  
Start, Reset, Attach file, and Export buttons in the task detail panel currently appear interactive but produce no outcome. These erode trust. Disable them visually (greyed, with tooltip: "Coming soon") or remove them entirely until wired.

**Acceptance Criteria:**
- [ ] No task detail button appears active without a wired outcome
- [ ] If buttons are kept, they are visually disabled with a tooltip explanation
- [ ] If buttons are removed, no layout gaps remain
- [ ] Static timer display is either animated or removed

**Risk:** Low. Visual-only change with no logic impact.

---

### S1-08 — Hide or disable non-functional bulk action bar

| Field | Detail |
|-------|--------|
| **Points** | 2 |
| **Owner** | Frontend Engineer |
| **File** | `tasks-workspace.tsx` line ~809 |
| **Depends on** | None |
| **Blocks** | S1-09 |

**Description:**  
The bulk action bar shows Reassign, Export, and Archive with no actions wired. Hide the bar entirely until actions are implemented, or show only implemented actions.

**Acceptance Criteria:**
- [ ] No unimplemented bulk actions are visible or clickable
- [ ] If selection mode is kept, the bar only shows implemented actions (or is hidden)
- [ ] Selecting tasks does not surface a misleading action bar

**Risk:** Low.

---

### S1-09 — Update UX copy to match actual app behaviour

| Field | Detail |
|-------|--------|
| **Points** | 2 |
| **Owner** | Product Designer |
| **File** | `tasks-workspace.tsx` line ~245 (onboarding copy), inline UI labels |
| **Depends on** | S1-01, S1-07, S1-08 |
| **Blocks** | None |

**Description:**  
Onboarding copy currently says "Start in Tasks" while the app opens in Projects. After S1-01, this will be consistent — but all inline copy, empty states, and helper text should be audited to ensure nothing contradicts the new default behaviour.

**Acceptance Criteria:**
- [ ] Onboarding/walkthrough copy is consistent with Tasks-first default
- [ ] No visible contradiction between UI labels and actual behaviour
- [ ] Empty states in Tasks, Projects, and Blocked all have coherent next-step copy

**Risk:** Low.

---

### S1-10 — Regression test core task views and selection behaviour

| Field | Detail |
|-------|--------|
| **Points** | 3 |
| **Owner** | QA / Full-Stack Engineer |
| **Depends on** | S1-03 through S1-08 |
| **Blocks** | Sprint 2 start |

**Description:**  
Full regression pass across task list, task detail, timeline, calendar, and selection behaviour after all Sprint 1 changes. Confirm no regressions in existing core flows.

**Acceptance Criteria:**
- [ ] Task list renders correctly with live date logic
- [ ] Task detail loads and displays without errors
- [ ] No console errors in core task views
- [ ] Existing E2E or integration tests pass (or are updated to reflect intent)

---

## Sprint 2: Task Workflow Simplification

**Objective:** Make the core daily workflow faster and more intuitive.

**Sprint Goal:** A user can create and update a task with fewer decisions. The task detail panel feels like a working surface.

**Total Points: 39**

---

### S2-01 — Redesign create-task modal into Essential and Advanced sections

| Field | Detail |
|-------|--------|
| **Points** | 5 |
| **Owner** | Frontend Engineer + Product Designer |
| **File** | Task creation modal component |
| **Depends on** | Sprint 1 complete |
| **Blocks** | S2-02, S2-03, S2-04 |

**Description:**  
The current modal asks too much upfront. Redesign into two clear sections:  
**Essential:** Title, Project, Owner, Due Date  
**Advanced (collapsible):** Description, Tags, Reviewer, Backup Owner, Recurrence

**Acceptance Criteria:**
- [ ] Essential fields are visible by default
- [ ] Advanced section is collapsed by default with a clear expand affordance
- [ ] Task can be saved with only Essential fields completed
- [ ] Advanced section state (expanded/collapsed) does not reset mid-session

**Risk:** Medium. Need to ensure required field validation adapts to the two-section model.

---

### S2-02 — Pre-fill project and owner defaults from current context

| Field | Detail |
|-------|--------|
| **Points** | 3 |
| **Owner** | Full-Stack Engineer |
| **Depends on** | S2-01 |
| **Blocks** | None |

**Description:**  
When opening the create-task modal from within a project, pre-populate the Project field. When the logged-in user has a default team assignment, pre-populate Owner.

**Acceptance Criteria:**
- [ ] Project field is pre-filled when opening modal from a project context
- [ ] Owner defaults to the current user or logical assignee from context
- [ ] Pre-filled values can be overridden manually
- [ ] No pre-fill occurs when context is ambiguous (e.g., opening from All Tasks)

**Risk:** Low.

---

### S2-03 — Rename and simplify date field labels

| Field | Detail |
|-------|--------|
| **Points** | 2 |
| **Owner** | Frontend Engineer |
| **Depends on** | S2-01 |
| **Blocks** | None |

**Description:**  
Rename ambiguous date fields to clearly communicate intent. "End Date" becomes "Due Date". Remove or move any secondary date fields to the Advanced section.

**Acceptance Criteria:**
- [ ] Primary task date field is labelled "Due Date"
- [ ] No ambiguous date labels remain in the Essential section
- [ ] Secondary date fields (start date, estimated completion) are in Advanced if present

**Risk:** Low.

---

### S2-04 — Reduce required fields for standard task creation

| Field | Detail |
|-------|--------|
| **Points** | 3 |
| **Owner** | Full-Stack Engineer |
| **Depends on** | S2-01 |
| **Blocks** | None |

**Description:**  
Ensure only Title is strictly required to create a task. Project, Owner, and Due Date should be strongly encouraged (highlighted as recommended) but not blocking.

**Acceptance Criteria:**
- [ ] A task can be saved with only a Title
- [ ] Optional but recommended fields are visually indicated (e.g., subtle prompt)
- [ ] Validation errors only appear for truly required fields
- [ ] Incomplete tasks are clearly distinguishable in the task list

**Risk:** Medium. Domain logic may enforce required fields at the data layer — coordinate with backend if needed.

---

### S2-05 — Add task KPI strip to Tasks home

| Field | Detail |
|-------|--------|
| **Points** | 5 |
| **Owner** | Frontend Engineer |
| **File** | `tasks-workspace.tsx` |
| **Depends on** | S1-03 (live date logic), S1-01 (Tasks as home) |
| **Blocks** | S2-06 |

**Description:**  
Add a compact KPI strip at the top of the Tasks section showing: Due Today count, Blocked count, Overdue count, Needs Review count. Each count should be clickable to filter the task list accordingly.

**Acceptance Criteria:**
- [ ] KPI strip is visible at the top of the Tasks home view
- [ ] All four counts reflect live, accurate data
- [ ] Clicking a KPI count filters the task list to that subset
- [ ] Strip does not appear when counts are all zero (or shows empty state gracefully)
- [ ] Strip uses live date logic from S1-03

**Risk:** Medium. Requires accurate count queries for each state.

---

### S2-06 — Set stronger default task filter for first-run experience

| Field | Detail |
|-------|--------|
| **Points** | 3 |
| **Owner** | Frontend Engineer |
| **File** | `tasks-workspace.tsx` |
| **Depends on** | S2-05 |
| **Blocks** | None |

**Description:**  
Default the task list to "My Work" (tasks assigned to the current user) rather than showing all tasks. Show a clear affordance to switch to "All Tasks" or other views.

**Acceptance Criteria:**
- [ ] Tasks home defaults to My Work filter
- [ ] Empty My Work state provides a clear CTA ("Create your first task" or "Browse all tasks")
- [ ] Filter selection is persisted per session
- [ ] Filter label is clearly visible and easy to change

**Risk:** Low.

---

### S2-07 — Reorder task detail panel to emphasise execution

| Field | Detail |
|-------|--------|
| **Points** | 5 |
| **Owner** | Frontend Engineer + Product Designer |
| **File** | `task-detail-panel.tsx` |
| **Depends on** | S1-07 (dead controls removed) |
| **Blocks** | S2-08, S2-09 |

**Description:**  
Reorder the task detail panel sections to reflect the primary daily execution actions:  
1. Task title + current status  
2. Primary action (contextual CTA — see S2-09)  
3. Work log composer  
4. Blocker action (see S2-08)  
5. Description / planning info  
6. Checklist  
7. Activity history  

**Acceptance Criteria:**
- [ ] Panel order matches the specification above
- [ ] Status and work log are immediately visible without scrolling
- [ ] Description/planning info is accessible but not competing for immediate attention
- [ ] Panel is usable on standard desktop viewport without excessive scrolling

**Risk:** Medium. Panel reordering may require layout refactoring if sections are tightly coupled.

---

### S2-08 — Add explicit Mark Blocked action in task detail

| Field | Detail |
|-------|--------|
| **Points** | 5 |
| **Owner** | Full-Stack Engineer |
| **File** | `task-detail-panel.tsx` |
| **Depends on** | S2-07 |
| **Blocks** | S4-06 (Blocked screen sorting will benefit from consistent blocker data) |

**Description:**  
Add a clear "Mark Blocked" action to the task detail panel. When triggered, it should prompt for a brief blocker reason and optionally an escalation contact. The task status should update and the task should appear in the Blocked view.

**Acceptance Criteria:**
- [ ] "Mark Blocked" action is visible in the task detail panel
- [ ] Clicking it opens a brief form: blocker reason (required), escalate to (optional)
- [ ] Task status updates to Blocked after submission
- [ ] Task appears in the Blocked section view
- [ ] A "Resolve Blocker" action replaces "Mark Blocked" when task is already blocked

**Risk:** Medium. Requires data model support for blocker reason field if not already present.

---

### S2-09 — Add contextual primary action based on task state

| Field | Detail |
|-------|--------|
| **Points** | 5 |
| **Owner** | Frontend Engineer + Full-Stack Engineer |
| **File** | `task-detail-panel.tsx` |
| **Depends on** | S2-07 |
| **Blocks** | None |

**Description:**  
The primary CTA in the task detail panel should change based on the task's current state, guiding the user to the most logical next action:

| Task State | Primary CTA |
|-----------|-------------|
| Not started | Start Work |
| In Progress | Submit for Review |
| Blocked | Resolve Blocker |
| In Review | Approve / Request Changes |
| Complete | View History |

**Acceptance Criteria:**
- [ ] Primary CTA is always the most contextually appropriate next action
- [ ] CTA label and action change dynamically with task state
- [ ] Each CTA triggers the correct state transition
- [ ] Transitions are reflected immediately in the panel without a full reload

**Risk:** Medium. Requires clear state machine definition. Coordinate with backend on valid state transitions.

---

### S2-10 — Regression test task creation and task detail flows

| Field | Detail |
|-------|--------|
| **Points** | 3 |
| **Owner** | QA / Engineer |
| **Depends on** | S2-01 through S2-09 |
| **Blocks** | Sprint 3 start |

**Acceptance Criteria:**
- [ ] Task creation works end-to-end with essential fields only
- [ ] Task creation works with all advanced fields
- [ ] Task detail panel loads, updates status, logs work, and marks blocked correctly
- [ ] No regressions in Sprint 1 fixes

---

## Sprint 3: Navigation and Information Architecture

**Objective:** Make the app hierarchy match the actual workflow priority.

**Sprint Goal:** The app reads as one coherent operating tool. Users can visually distinguish daily work areas from secondary/admin areas.

**Total Points: 25**

---

### S3-01 — Redesign top-level nav into primary vs secondary groups

| Field | Detail |
|-------|--------|
| **Points** | 5 |
| **Owner** | Product Designer + Frontend Engineer |
| **File** | `tasks-workspace.tsx` line ~780, nav/shell components |
| **Depends on** | Sprint 2 complete |
| **Blocks** | S3-02, S3-03, S3-04, S4-01 |

**Description:**  
Introduce a clear visual hierarchy in the top-level navigation:

**Primary (daily work):** Tasks, Blocked, Projects, Reports  
**Secondary (support/admin):** Team, Analytics, Settings

The secondary group should be visually lighter — smaller, muted colour, or placed in a utility zone — without hiding or removing access.

**Acceptance Criteria:**
- [ ] Primary nav items are visually dominant
- [ ] Secondary items are accessible but clearly de-emphasised
- [ ] Active section highlight works correctly for both groups
- [ ] Keyboard navigation still covers all items

**Risk:** Medium. Visual hierarchy change — may need stakeholder sign-off before shipping.

---

### S3-02 — Update shell layout to support new nav hierarchy

| Field | Detail |
|-------|--------|
| **Points** | 3 |
| **Owner** | Frontend Engineer |
| **Depends on** | S3-01 |
| **Blocks** | None |

**Description:**  
Implement the layout and styling changes required to support the two-tier nav design. Update CSS/Tailwind classes and layout components.

**Acceptance Criteria:**
- [ ] Layout correctly renders primary and secondary nav groups at all viewport widths
- [ ] No overflow, clipping, or z-index issues at standard desktop sizes
- [ ] Mobile/responsive behaviour is tested and acceptable

**Risk:** Low-medium.

---

### S3-03 — Move Team, Analytics, Settings to secondary visual emphasis

| Field | Detail |
|-------|--------|
| **Points** | 3 |
| **Owner** | Frontend Engineer |
| **Depends on** | S3-01, S3-02 |
| **Blocks** | None |

**Description:**  
Apply the secondary visual treatment to Team, Analytics, and Settings nav items. These modules remain fully accessible but are no longer presented as co-equal daily work surfaces.

**Acceptance Criteria:**
- [ ] Team, Analytics, Settings use secondary nav styling
- [ ] Clicking any secondary nav item still navigates correctly
- [ ] The visual difference is meaningful but not confusing (no icons removed, no labels hidden)

**Risk:** Low.

---

### S3-04 — Preserve direct accessibility to all modules after nav rebalance

| Field | Detail |
|-------|--------|
| **Points** | 2 |
| **Owner** | Frontend Engineer |
| **Depends on** | S3-01, S3-03 |
| **Blocks** | None |

**Description:**  
Verify that all modules remain directly accessible via nav, deep link, and keyboard shortcut after the hierarchy change. No module should be buried or require extra clicks versus today.

**Acceptance Criteria:**
- [ ] All 7 modules accessible in ≤ 1 click from any screen
- [ ] Deep links to all sections still resolve correctly
- [ ] No module is hidden behind a submenu or overflow that wasn't there before

**Risk:** Low.

---

### S3-05 — Clarify search scope in placeholder and section labelling

| Field | Detail |
|-------|--------|
| **Points** | 2 |
| **Owner** | Product Designer + Frontend Engineer |
| **Depends on** | None |
| **Blocks** | S3-06 |

**Description:**  
The search bar's placeholder text or a visible label should communicate what is being searched. If search is task-centric, it should not imply it searches projects, reports, or team members.

**Acceptance Criteria:**
- [ ] Search placeholder clearly states the scope (e.g., "Search tasks…" or "Search all…")
- [ ] If search is section-aware, the placeholder updates per section
- [ ] No misleading search affordance in non-searchable contexts

**Risk:** Low.

---

### S3-06 — Align search behaviour with labelled scope

| Field | Detail |
|-------|--------|
| **Points** | 5 |
| **Owner** | Full-Stack Engineer |
| **Depends on** | S3-05 |
| **Blocks** | None |

**Description:**  
Ensure search results match the scope communicated in S3-05. If "Search tasks" is labelled, only tasks should return. If cross-section search is intended, results should be clearly grouped by type.

**Acceptance Criteria:**
- [ ] Search results match the labelled scope
- [ ] If cross-section: results are grouped and labelled by entity type
- [ ] Empty search results state is clear and helpful
- [ ] Search does not return unexpected entity types

**Risk:** Medium. May require backend query scope changes.

---

### S3-07 — Update onboarding and helper copy to reflect new IA

| Field | Detail |
|-------|--------|
| **Points** | 2 |
| **Owner** | Product Designer |
| **Depends on** | S3-01 through S3-06 |
| **Blocks** | None |

**Acceptance Criteria:**
- [ ] Walkthrough references updated nav structure
- [ ] Helper copy does not reference old module positions or hierarchy
- [ ] Quick Start sidebar reflects primary nav grouping

**Risk:** Low.

---

### S3-08 — Regression test cross-section navigation

| Field | Detail |
|-------|--------|
| **Points** | 3 |
| **Owner** | QA / Engineer |
| **Depends on** | S3-01 through S3-07 |
| **Blocks** | Sprint 4 start |

**Acceptance Criteria:**
- [ ] All 7 modules navigate correctly from all starting points
- [ ] Back/forward browser navigation works
- [ ] Active state highlights correctly in both nav groups
- [ ] No regressions in Sprint 1–2 task flows

---

## Sprint 4: Projects and Blocked Reframing

**Objective:** Improve coordination workflows after the task core is stable.

**Sprint Goal:** Leads can use Blocked to intervene quickly. Project planning no longer overshadows daily execution.

**Total Points: 31**

---

### S4-01 — Rework Projects landing to emphasise summary/activity

| Field | Detail |
|-------|--------|
| **Points** | 5 |
| **Owner** | Frontend Engineer + Product Designer |
| **File** | `project-workbench.tsx` |
| **Depends on** | S3-01 (Projects positioned as coordination, not home) |
| **Blocks** | S4-02, S4-03, S4-04, S4-05 |

**Description:**  
The Projects landing should show project summary and recent task activity before presenting advanced planning tools. A project card or summary view should be the entry point, with advanced workbench tabs accessible from there.

**Acceptance Criteria:**
- [ ] Projects section opens to a project list/summary view
- [ ] Each project card shows: name, status, open task count, blocked count, last activity
- [ ] Advanced workbench opens on project selection, not on nav click
- [ ] Empty projects state has a clear CTA: "Create your first project"

**Risk:** Medium. May require a new landing component if the current entry goes straight to workbench.

---

### S4-02 — Change Project Workbench default tab to Summary or Daily Board

| Field | Detail |
|-------|--------|
| **Points** | 2 |
| **Owner** | Frontend Engineer |
| **File** | `project-workbench.tsx` line ~46 |
| **Depends on** | S4-01 |
| **Blocks** | None |

**Acceptance Criteria:**
- [ ] Workbench opens on Summary or Daily Board tab by default
- [ ] Last-visited tab is remembered within a session
- [ ] WBS, Gantt, Cadence are still accessible via tabs

**Risk:** Low.

---

### S4-03 — Add helper descriptions for project workbench tabs

| Field | Detail |
|-------|--------|
| **Points** | 2 |
| **Owner** | Product Designer + Frontend Engineer |
| **Depends on** | S4-02 |
| **Blocks** | None |

**Description:**  
Each workbench tab (Summary, Daily Board, WBS, Gantt, Cadence) should have a short tooltip or sub-label describing when to use it.

**Acceptance Criteria:**
- [ ] Each tab has a one-line description accessible on hover or as a sub-label
- [ ] Descriptions are accurate and actionable ("Use Gantt for deadline planning")
- [ ] Descriptions do not clutter the tab bar at normal viewport size

**Risk:** Low.

---

### S4-04 — Visually de-emphasise advanced planning tabs for new users

| Field | Detail |
|-------|--------|
| **Points** | 3 |
| **Owner** | Frontend Engineer + Product Designer |
| **Depends on** | S4-02 |
| **Blocks** | None |

**Description:**  
WBS, Gantt, and Cadence should be visually lighter than Summary and Daily Board, suggesting they are power-user tools. Consider grouping them under an "Advanced Planning" label or using a visual divider.

**Acceptance Criteria:**
- [ ] Summary and Daily Board are visually primary
- [ ] WBS, Gantt, Cadence are accessible but visually secondary
- [ ] No capability is removed; just hierarchy adjusted
- [ ] First-time users are less likely to default to WBS

**Risk:** Low.

---

### S4-05 — Add stronger transitions from Projects back to Tasks

| Field | Detail |
|-------|--------|
| **Points** | 3 |
| **Owner** | Frontend Engineer |
| **Depends on** | S4-01 |
| **Blocks** | None |

**Description:**  
Within the project workbench, add clear and consistent navigation affordances back to the task execution surface. A task count link, a "View in Tasks" button, or a breadcrumb back to Tasks should always be visible.

**Acceptance Criteria:**
- [ ] At least one clear link from project view to filtered task view is visible
- [ ] The link filters correctly to tasks belonging to the current project
- [ ] Breadcrumb or back navigation works as expected

**Risk:** Low.

---

### S4-06 — Redesign Blocked list sorting by urgency/severity/age

| Field | Detail |
|-------|--------|
| **Points** | 5 |
| **Owner** | Full-Stack Engineer |
| **Depends on** | S2-08 (blocker data now consistently structured) |
| **Blocks** | S4-07, S4-08 |

**Description:**  
The Blocked screen should sort by urgency — combining factors like SLA risk, blocker age, and task priority — rather than creation order. Add filter options for Severity, Owner, and Blocker Age.

**Acceptance Criteria:**
- [ ] Default sort is by urgency (SLA risk + age + priority)
- [ ] Filter controls: Severity, Owner, Blocker Age available
- [ ] Sort and filter state is retained within a session
- [ ] Sort/filter changes are immediate, no full reload

**Risk:** Medium. Requires definition of "urgency" score — agree formula with product owner.

---

### S4-07 — Add blocker age, SLA risk, and owner context to blocked cards

| Field | Detail |
|-------|--------|
| **Points** | 3 |
| **Owner** | Frontend Engineer |
| **Depends on** | S4-06 |
| **Blocks** | None |

**Description:**  
Each blocked task card should display: task name, blocker reason, how long it has been blocked (e.g., "Blocked 3 days"), owner name, and SLA indicator if applicable.

**Acceptance Criteria:**
- [ ] Blocked duration is calculated from the time the blocker was marked
- [ ] Owner name or avatar is visible on each card
- [ ] SLA indicator shows if task is near or past a due-date threshold
- [ ] Card remains scannable — no information overload

**Risk:** Low.

---

### S4-08 — Add one-click intervention actions to blocked cards

| Field | Detail |
|-------|--------|
| **Points** | 5 |
| **Owner** | Full-Stack Engineer + Frontend Engineer |
| **Depends on** | S4-06, S4-07 |
| **Blocks** | None |

**Description:**  
Each blocked card should have quick actions accessible without opening the full task detail: Open Task, Reassign, Resolve Blocker, Escalate.

**Acceptance Criteria:**
- [ ] Quick actions visible on card hover or via action menu
- [ ] "Resolve Blocker" removes the task from Blocked view and updates status
- [ ] "Reassign" opens an owner picker inline
- [ ] "Escalate" sends a notification or updates an escalation field
- [ ] "Open Task" navigates to task detail panel

**Risk:** Medium. Escalation requires definition of notification/routing mechanism.

---

### S4-09 — Regression test Projects and Blocked handoff flows

| Field | Detail |
|-------|--------|
| **Points** | 3 |
| **Owner** | QA / Engineer |
| **Depends on** | S4-01 through S4-08 |
| **Blocks** | Sprint 5 start |

**Acceptance Criteria:**
- [ ] Projects landing, workbench tabs, and task transitions all work correctly
- [ ] Blocked sorting, filtering, and quick actions work end-to-end
- [ ] No regressions in Sprint 1–3 flows

---

## Sprint 5: Team and Analytics Optimisation

**Objective:** Improve people-management and decision-support screens.

**Sprint Goal:** Leads can spot team overload and act. Analytics informs decisions instead of adding dashboard fatigue.

**Total Points: 29**

---

### S5-01 — Split Team screen into Load Overview and Member Management zones

| Field | Detail |
|-------|--------|
| **Points** | 5 |
| **Owner** | Frontend Engineer + Product Designer |
| **Depends on** | Sprint 4 complete |
| **Blocks** | S5-02, S5-03, S5-04 |

**Description:**  
The Team screen currently mixes utilisation overview with add/edit member actions. Separate into two clearly distinct zones:  
- **Load Overview** (primary): team capacity, workload, blocked status  
- **Member Management** (secondary): add, edit, import team members

**Acceptance Criteria:**
- [ ] Two distinct zones are visually clear on the Team screen
- [ ] Load overview is the default visible state
- [ ] Member management actions require a deliberate navigation step or modal
- [ ] Import wizard is accessible but not visually dominant

**Risk:** Medium. May require layout refactor if both currently share one component tree.

---

### S5-02 — De-emphasise import wizard relative to team operations

| Field | Detail |
|-------|--------|
| **Points** | 2 |
| **Owner** | Frontend Engineer |
| **File** | `hr-import-wizard.tsx` |
| **Depends on** | S5-01 |
| **Blocks** | None |

**Acceptance Criteria:**
- [ ] HR import wizard is accessible but not visible by default
- [ ] Import is triggered from Member Management zone, not the Load Overview
- [ ] Import wizard does not interfere with team load scanning

**Risk:** Low.

---

### S5-03 — Add team filters for overloaded, blocked, overdue

| Field | Detail |
|-------|--------|
| **Points** | 5 |
| **Owner** | Full-Stack Engineer |
| **Depends on** | S5-01 |
| **Blocks** | None |

**Description:**  
Add filter chips or a filter bar to the Load Overview so leads can quickly surface team members who are overloaded, have blocked tasks, or have overdue work.

**Acceptance Criteria:**
- [ ] Filters: Overloaded, Has Blocked Tasks, Has Overdue Tasks
- [ ] Filters are combinable
- [ ] Filter state is maintained within a session
- [ ] Filter results reflect live task data

**Risk:** Low-medium. Requires accurate capacity/load data per team member.

---

### S5-04 — Improve team member action paths to task and workload details

| Field | Detail |
|-------|--------|
| **Points** | 3 |
| **Owner** | Frontend Engineer |
| **Depends on** | S5-01, S5-03 |
| **Blocks** | None |

**Description:**  
Each team member card in Load Overview should have direct action paths: "View Tasks" (filtered to their assigned tasks), "Adjust Capacity", and "Reassign Work".

**Acceptance Criteria:**
- [ ] "View Tasks" link navigates to Tasks filtered by that team member
- [ ] "Adjust Capacity" opens an inline edit or modal for their capacity setting
- [ ] "Reassign Work" opens a task list for bulk reassignment
- [ ] All actions are accessible without leaving the Team screen unnecessarily

**Risk:** Low.

---

### S5-05 — Reframe Analytics into Operational Health and Labor Cost modes

| Field | Detail |
|-------|--------|
| **Points** | 3 |
| **Owner** | Frontend Engineer + Product Designer |
| **File** | `labor-cost-analytics.tsx` |
| **Depends on** | Sprint 3 nav/IA complete |
| **Blocks** | S5-06, S5-07 |

**Description:**  
Introduce a clear toggle or tab at the top of Analytics for Operational Health and Labor Cost. The two views have different audiences and complexity levels — they should feel like distinct, focused tools rather than one large dashboard.

**Acceptance Criteria:**
- [ ] Analytics opens to Operational Health by default
- [ ] Toggle/tab between Operational Health and Labor Cost is clear
- [ ] Each view has its own focused KPIs without mixing content
- [ ] Toggle state is remembered within a session

**Risk:** Low.

---

### S5-06 — Add drill-down links from analytics cards to source workflows

| Field | Detail |
|-------|--------|
| **Points** | 5 |
| **Owner** | Full-Stack Engineer + Frontend Engineer |
| **Depends on** | S5-05 |
| **Blocks** | None |

**Description:**  
Analytics cards showing metrics like "Blocked Tasks: 12" or "Overdue: 5" should link directly to the filtered view of those items in Tasks, Team, or Projects.

**Acceptance Criteria:**
- [ ] At least the top 5 KPI cards in Operational Health have drill-down links
- [ ] Drill-down navigates to the correct filtered view
- [ ] User can navigate back to Analytics without losing their drill-down context
- [ ] Labor Cost drill-downs link to relevant roster/workforce data

**Risk:** Medium. May require filter state passing between sections.

---

### S5-07 — Normalise visual hierarchy between task and labor analytics

| Field | Detail |
|-------|--------|
| **Points** | 3 |
| **Owner** | Frontend Engineer + Product Designer |
| **Depends on** | S5-05 |
| **Blocks** | None |

**Description:**  
The labor cost analytics view (`labor-cost-analytics.tsx`) uses a richer visual style than the operational task analytics. Normalise the two to use a consistent layout, card structure, and typographic scale.

**Acceptance Criteria:**
- [ ] Both analytics views use the same card and header patterns
- [ ] Typography scale and colour use are consistent
- [ ] Neither view looks more "finished" than the other
- [ ] No visual regression in the richer labor analytics charts

**Risk:** Low-medium. Labor analytics may have bespoke chart styling.

---

### S5-08 — Regression test Team and Analytics flows

| Field | Detail |
|-------|--------|
| **Points** | 3 |
| **Owner** | QA / Engineer |
| **Depends on** | S5-01 through S5-07 |
| **Blocks** | Sprint 6 start |

**Acceptance Criteria:**
- [ ] Team load overview, filters, and member actions work correctly
- [ ] Analytics toggle, KPI cards, and drill-downs work end-to-end
- [ ] No regressions in Sprint 1–4 flows

---

## Sprint 6: Reports Simplification and Onboarding

**Objective:** Reduce complexity in the heaviest module and improve learnability.

**Sprint Goal:** A normal reporting user can start or continue a report without wading through admin complexity. New users learn the product by doing core actions.

**Total Points: 36**

---

### S6-01 — Design and implement report landing focused on author actions

| Field | Detail |
|-------|--------|
| **Points** | 5 |
| **Owner** | Frontend Engineer + Product Designer |
| **File** | `reports-module.tsx` |
| **Depends on** | Sprint 3 IA complete |
| **Blocks** | S6-02, S6-03 |

**Description:**  
Replace the current Reports entry with a focused landing screen offering two primary actions: **Continue Draft** and **Create Report**. Secondary sections: Awaiting Review, Approved/History. Admin tools are separated (see S6-02).

**Acceptance Criteria:**
- [ ] Reports landing shows Continue Draft and Create Report as primary CTAs
- [ ] Awaiting Review and Approved/History are visible but secondary
- [ ] No admin/security tools visible on the author landing
- [ ] Empty states for each section have clear next-step copy

**Risk:** Medium. Current reports entry may be tightly coupled to admin views.

---

### S6-02 — Separate report author workflow from admin/security workflow

| Field | Detail |
|-------|--------|
| **Points** | 8 |
| **Owner** | Full-Stack Engineer + Frontend Engineer |
| **File** | `reports-module.tsx` (2345 lines) |
| **Depends on** | S6-01 |
| **Blocks** | S6-03, S6-04 |

**Description:**  
This is the most complex ticket in the programme. The 2345-line reports module mixes author, reviewer, and admin/security workflows. Separate these into distinct route/context areas:

- **Author view:** draft, edit, submit, track
- **Reviewer view:** review queue, approve, request changes
- **Admin view:** user management, audit log, routing rules, security

**Acceptance Criteria:**
- [ ] Standard users see only author and reviewer views
- [ ] Admin tools require admin context (role flag or explicit toggle)
- [ ] Author and reviewer views do not include admin UI elements
- [ ] No existing report data or routing logic is broken by the separation
- [ ] Admin users can still access the full admin surface

**Risk:** High. This is the highest-effort and highest-risk ticket in the programme. Time-box to 5 days of engineering; carry remainder to a Sprint 7 if needed.

---

### S6-03 — Add guided step progression for report editing

| Field | Detail |
|-------|--------|
| **Points** | 5 |
| **Owner** | Frontend Engineer + Product Designer |
| **Depends on** | S6-02 |
| **Blocks** | S6-04 |

**Description:**  
Report editing should show a clear step rail guiding the author through: Narrative → Metrics → Actions → Sign-off. The current step should be obvious, and authors should be able to save progress at any step.

**Acceptance Criteria:**
- [ ] Step rail is visible in the report editor
- [ ] Current step is highlighted
- [ ] Authors can navigate between steps without losing work
- [ ] Progress is auto-saved or save prompt is shown on step change
- [ ] Completion percentage or step count is visible

**Risk:** Medium. Depends on clean separation from S6-02.

---

### S6-04 — Improve report save/submission/review state visibility

| Field | Detail |
|-------|--------|
| **Points** | 3 |
| **Owner** | Frontend Engineer |
| **Depends on** | S6-03 |
| **Blocks** | None |

**Description:**  
Report state (Draft, Submitted, In Review, Approved, Changes Requested) should be clearly visible at the top of the report and in the reports list. Submission and approval actions should be visually distinct from editing actions.

**Acceptance Criteria:**
- [ ] Report status badge is visible in the editor header and list view
- [ ] Submit for Review action is visually distinct from Save Draft
- [ ] Reviewer approve/reject actions are clearly separated from author edit actions
- [ ] State changes are reflected immediately without a page reload

**Risk:** Low.

---

### S6-05 — Shorten onboarding to action-first core flow

| Field | Detail |
|-------|--------|
| **Points** | 5 |
| **Owner** | Product Designer + Frontend Engineer |
| **File** | `tasks-workspace.tsx` walkthrough component |
| **Depends on** | Sprint 2 core workflow complete, Sprint 3 nav complete |
| **Blocks** | S6-06 |

**Description:**  
Replace the broad architecture walkthrough with a 3–4 step action-first flow:

1. **Review your work** — shows My Work filter
2. **Open a task** — opens task detail
3. **Log progress** — opens work log
4. **Mark a blocker** — demonstrates Mark Blocked action

Each step teaches a habit, not a screen.

**Acceptance Criteria:**
- [ ] Onboarding is ≤ 4 steps
- [ ] Each step triggers an action, not just highlights UI elements
- [ ] Users can skip or dismiss at any step
- [ ] Onboarding does not reappear after dismissal
- [ ] Onboarding copy does not reference modules or architecture

**Risk:** Medium. New onboarding model requires UX copy and interaction design effort.

---

### S6-06 — Add contextual help for advanced modules

| Field | Detail |
|-------|--------|
| **Points** | 5 |
| **Owner** | Frontend Engineer + Product Designer |
| **Depends on** | S6-05, S6-02 |
| **Blocks** | None |

**Description:**  
Replace front-loaded walkthrough coverage of advanced modules (Reports, Gantt, Analytics, Settings) with contextual hints that appear the first time a user visits each advanced area. Hints should be dismissible and not repeat.

**Acceptance Criteria:**
- [ ] First-visit hint appears for: Reports, Project Workbench advanced tabs, Analytics, Settings
- [ ] Hints are dismissible and do not reappear
- [ ] Hints are 1–2 sentences: what this is, when to use it
- [ ] No hint appears in Tasks, Blocked, or Projects Summary (these are covered by onboarding)

**Risk:** Low.

---

### S6-07 — Regression test reports, onboarding, and full programme flows

| Field | Detail |
|-------|--------|
| **Points** | 5 |
| **Owner** | QA / Engineer |
| **Depends on** | S6-01 through S6-06 |
| **Blocks** | Programme complete |

**Description:**  
Full end-to-end regression across all six sprints' changes, with specific focus on the reports module given its complexity.

**Acceptance Criteria:**
- [ ] Report creation, editing, submission, and review work end-to-end
- [ ] Admin tools accessible to admin users; not visible to standard users
- [ ] Onboarding completes correctly for new users
- [ ] Contextual hints appear and dismiss correctly
- [ ] No regressions in Sprints 1–5 flows
- [ ] Performance check: no obvious slowdowns from module separation refactor

---

## Programme Summary

| Sprint | Focus | Points | Key Outcome |
|--------|-------|--------|-------------|
| 1 | Trust and Reliability | 32 | App opens in Tasks; dates are live; no dead controls |
| 2 | Task Workflow | 39 | Faster task creation; better detail panel |
| 3 | Navigation and IA | 25 | Clear primary vs secondary nav hierarchy |
| 4 | Projects and Blocked | 31 | Projects as support; Blocked as command centre |
| 5 | Team and Analytics | 29 | Actionable team screen; decision-ready analytics |
| 6 | Reports and Onboarding | 36 | Simplified reports; habit-teaching onboarding |
| **Total** | | **192** | |

---

## Recommended Release Gates

| Gate | After | What to Validate |
|------|-------|-----------------|
| Early release | Sprint 2 | Core task workflow is trustworthy and faster |
| Coherence release | Sprint 4 | Product reads as one operating tool |
| Full redesign release | Sprint 6 | All modules simplified; onboarding teaches habits |

---

## Definition of Done (All Sprints)

- [ ] UX copy matches actual behaviour
- [ ] No visible dead-end controls
- [ ] Empty states provide one clear next action
- [ ] Navigation hierarchy reflects real product priorities
- [ ] Time-based views use live date logic
- [ ] Core task flow works without training
- [ ] Regression tests pass for all affected flows
- [ ] Design review sign-off per sprint

---

*End of Sprint Breakdown*
