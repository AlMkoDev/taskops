import { TourDefinition } from '../tour-types';

export const tasksTour: TourDefinition = {
  id: 'tasks',
  name: 'Tasks',
  icon: '🌾',
  description: 'Daily task management and execution',
  estimatedTime: '~3 minutes',
  steps: [
    {
      id: 'tasks-welcome',
      target: null,
      title: 'Tasks Is The Daily Execution Surface',
      description: 'This module is built for the work that needs to move today: review assignments, update status, capture progress, and surface blockers early.',
      context: '💡 The default view keeps attention on assigned work first so the next action is usually visible as soon as the page loads.',
      whyItMatters: 'Good execution data here improves project tracking, reporting, and labor visibility everywhere else',
      position: 'center',
      module: 'tasks'
    },
    {
      id: 'tasks-topbar',
      target: '[data-tour="shell.topbar"]',
      title: 'Use The Top Bar For Fast Switching',
      description: 'From here you can jump across modules, restart the current module tour, search across work, and create new tasks without leaving the workspace.',
      context: '💡 This keeps orientation, search, and creation in one predictable place.',
      position: 'bottom',
      module: 'tasks'
    },
    {
      id: 'tasks-page-header',
      target: '[data-tour="shell.page-header"]',
      title: 'The Header Tells You What This Module Is For',
      description: 'The page header keeps the current module explicit and reinforces the job to be done here: move active work forward.',
      position: 'bottom',
      module: 'tasks'
    },
    {
      id: 'tasks-view-switcher',
      target: '[data-tour="tasks.views"]',
      title: 'Pick The View That Fits The Decision',
      description: 'Use List for detailed execution, Board for flow, Timeline for schedule pressure, and Calendar for due-date planning.',
      context: '💡 The best view depends on the question you are answering, not on different data.',
      position: 'bottom',
      module: 'tasks'
    },
    {
      id: 'tasks-filter-chips',
      target: '[data-tour="tasks.filters"]',
      title: 'Filter By The Pressure Point You Need To Manage',
      description: 'The filter chips change the task list from a broad queue into a focused working set: your work, today’s work, blocked items, overdue items, review items, recurring work, or watched work.',
      context: '💡 A strong daily habit is to start with My Work, then check Due Today and Blocked.',
      position: 'bottom',
      module: 'tasks'
    },
    {
      id: 'tasks-kpi-cards',
      target: '[data-tour="tasks.kpis"]',
      title: 'Use The KPI Cards As Shortcuts',
      description: 'These cards summarize the most urgent task states and double as one-click filters into the matching queue.',
      whyItMatters: 'They make it easier to spot pressure early and move directly into the slice of work that needs attention',
      position: 'bottom',
      module: 'tasks'
    },
    {
      id: 'tasks-sidebar',
      target: '[data-tour="shell.sidebar"]',
      title: 'The Sidebar Keeps Nearby Context Close',
      description: 'Use the sidebar for saved views and fast jumps into related projects without losing your place in the main task workspace.',
      whyItMatters: 'This reduces navigation overhead when you need to pivot from execution into project context',
      position: 'right',
      module: 'tasks'
    },
    {
      id: 'tasks-table',
      target: '[data-tour="tasks.table-head"]',
      title: 'The Table Is Your Working Queue',
      description: 'Each row shows the key execution fields in one place: task, project context, status, priority, owner, due date, and progress.',
      context: '💡 Priority helps with ordering; the row gives enough detail to scan before deciding where to click in.',
      position: 'right',
      module: 'tasks'
    },
    {
      id: 'tasks-task-row',
      target: '[data-tour="tasks.first-row"]',
      title: 'Open A Row To Start Working',
      description: 'A task row is not just a status readout. It is the entry point into the detail panel where progress, notes, blockers, and work logs are captured.',
      whyItMatters: 'The quality of the task record affects downstream reporting, planning, and cost visibility',
      missingTargetFallback: {
        title: 'Create The First Task To Start The Loop',
        description: 'There is no live task row to open yet, which usually means this queue is empty. Once the first task exists, opening the row becomes the main way to update progress, notes, blockers, and work logs.',
        context: '💡 Empty-state tours should explain the workflow honestly instead of pointing at a row that is not there yet.',
        whyItMatters: 'The task record becomes the source of truth once work starts moving',
        position: 'center'
      },
      position: 'right',
      module: 'tasks'
    },
    {
      id: 'tasks-detail-panel',
      target: null,
      title: 'The Detail Panel Is Where The Task Moves',
      description: 'This is where you update state, log work, keep notes current, manage checklists, and make blockers explicit so the rest of the system can react.',
      context: '💡 Logging progress here improves both handoffs and analytics because the update lives on the task itself.',
      whyItMatters: 'Clear task updates improve handoff quality, budget visibility, and delivery confidence',
      position: 'center',
      module: 'tasks',
      beforeShow: () => {
        // Click the first task row to open detail panel
        const firstTaskRow = document.querySelector('[data-tour="tasks.first-row"]');
        if (firstTaskRow) {
          (firstTaskRow as HTMLElement).click();
        }
      }
    },
    {
      id: 'tasks-create-button',
      target: '[data-tour="tasks.create-task"]',
      title: 'Create Work As Soon As It Becomes Real',
      description: 'Use New Task when work should be tracked, assigned, and reviewed in the system instead of living in chat, memory, or side notes.',
      context: '💡 Linking a task to a project makes the work visible in planning and health views later.',
      position: 'left',
      module: 'tasks'
    },
    {
      id: 'tasks-complete',
      target: null,
      title: 'You Are Ready To Work In Tasks',
      description: 'You have seen the main execution loop: find the right queue, open a task, update it, and use the surrounding views when planning pressure changes.',
      whyItMatters: 'Strong task habits make every downstream module more trustworthy',
      position: 'center',
      module: 'tasks'
    }
  ]
};
