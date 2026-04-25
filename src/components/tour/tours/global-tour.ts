import { TourDefinition } from '../tour-types';

// ─── Global Onboarding Tour ───────────────────────────────────────────────────

export const globalTour: TourDefinition = {
  id: 'global',
  name: 'Getting Started',
  icon: '🚀',
  description: 'Workspace overview and navigation',
  estimatedTime: '~90 seconds',
  steps: [
    {
      id: 'global-welcome',
      target: null,
      title: 'Welcome to TaskOps',
      description: 'This quick tour orients you to the workspace, shows where each module lives, and helps you get to useful work faster.',
      context: '💡 Start with the overview here, then use the shorter module tours when you want deeper guidance inside a specific area.',
      position: 'center',
      module: null
    },
    {
      id: 'global-navigation',
      target: '[data-tour="shell.sidebar"]',
      title: 'Use The Sidebar To Move Between Workstreams',
      description: 'The sidebar keeps the main workstreams one click away: Tasks for execution, Projects for planning, Team for capacity, Reports for reporting, Analytics for insight, and Settings for configuration.',
      context: '💡 The active area stays highlighted so it is easy to see which workflow you are in before you act.',
      position: 'right',
      module: 'tasks'
    },
    {
      id: 'global-topbar',
      target: '[data-tour="shell.topbar"]',
      title: 'Search And Create From The Top Bar',
      description: 'The top bar is your fast path for jumping between modules, finding work, and creating new tasks or projects without losing context.',
      context: '💡 Search is broad enough to help when you remember a task tag, a project name, or the person attached to the work.',
      position: 'bottom',
      module: 'tasks'
    },
    {
      id: 'global-views',
      target: '[data-tour="tasks.views"]',
      title: 'The Same Work Can Be Viewed In Different Ways',
      description: 'Tasks can be viewed as a list, board, timeline, or calendar so the workspace can support daily execution, planning, and review without duplicating records.',
      context: '💡 Changing the view changes the presentation, not the underlying task data.',
      position: 'bottom',
      module: 'tasks'
    },
    {
      id: 'global-help',
      target: '[data-tour="shell.actions"]',
      title: 'Tours Stay Close to the Work',
      description: "Use 'Take Tour' to start the guide for the module you are currently in, or open 'All Tours' to come back to this starting point.",
      context: '💡 The guided tour is now the main onboarding path, so learning and doing happen in the same interface.',
      position: 'right',
      module: 'tasks'
    }
  ]
};
