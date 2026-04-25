import { TourDefinition } from '../tour-types';

export const projectsTour: TourDefinition = {
  id: 'projects',
  name: 'Projects',
  icon: '📁',
  description: 'Seasonal planning and WBS',
  estimatedTime: '~2 minutes',
  steps: [
    {
      id: 'projects-overview',
      target: '[data-tour="projects.header"]',
      title: 'Projects Turn Tasks Into Delivery Structure',
      description: 'Use Projects when the work needs planning context: phases, timelines, grouped execution, and a clearer view of whether delivery is healthy or at risk.',
      context: '💡 This is where individual tasks start to read as a coordinated stream of work instead of isolated items.',
      missingTargetFallback: {
        target: '[data-tour="projects.empty-state"]',
        title: 'Projects Starts With A Blank Shell',
        description: 'This module is ready even before a project exists. Start by creating a clean project shell, then layer in phases, tasks, schedule views, and delivery structure as the work becomes real.',
        context: '💡 A guided empty state is better onboarding than pretending the plan already exists.',
        position: 'bottom'
      },
      position: 'bottom',
      module: 'projects'
    },
    {
      id: 'project-health',
      target: '[data-tour="projects.summary"]',
      title: 'Read The Summary Before You Dive Deep',
      description: 'The summary view shows whether the project is moving, where blockers are accumulating, and how much work and time are sitting inside the plan.',
      context: '💡 A project can look busy and still be unhealthy if blockers are stacking or progress is concentrated in the wrong phase.',
      whyItMatters: 'Healthy projects depend on seeing risk early rather than after deadlines are already compressed',
      missingTargetFallback: {
        target: '[data-tour="projects.empty-state"]',
        title: 'Create A Project Shell Before Health Signals Appear',
        description: 'There is no active project summary yet, which usually means a project has not been created or selected. Once the shell exists, this summary becomes the fastest way to judge whether the plan is healthy.',
        context: '💡 In an empty workspace, the right next action is to create the first project rather than hunt for non-existent health data.',
        position: 'bottom'
      },
      position: 'right',
      module: 'projects'
    },
    {
      id: 'project-workbench',
      target: '[data-tour="projects.workbench-tabs"]',
      title: 'The Workbench Splits Planning Into Clear Modes',
      description: 'The workbench tabs separate health, day-to-day execution, work breakdown, timeline planning, and cadence so you can focus on one planning lens at a time.',
      context: '💡 Start with Summary when orienting, then move into Daily, WBS, Gantt, or Cadence depending on the decision you need to make.',
      missingTargetFallback: {
        target: '[data-tour="projects.empty-state"]',
        title: 'The Workbench Appears Once A Project Exists',
        description: 'There is no active workbench yet because the workspace does not have a selected project shell to open. After the first project is created, the tabs become the main way to move between planning views.',
        context: '💡 This is a good example of the tour adapting to setup state instead of assuming the module is already populated.',
        position: 'bottom'
      },
      position: 'right',
      module: 'projects'
    },
    {
      id: 'project-wbs',
      target: '[data-tour="projects.wbs"]',
      title: 'Use WBS To Define The Shape Of The Work',
      description: 'The WBS view is where phases, task packages, ownership, cadence, and triggers become explicit so the project has a durable structure behind it.',
      context: '💡 This is the best place to make hidden planning assumptions visible before they become execution issues.',
      missingTargetFallback: {
        target: '[data-tour="projects.create-project"]',
        title: 'WBS Starts After The First Project Is In Place',
        description: 'There is no WBS surface to highlight yet because the project shell or selected phase is still empty. Once you have a project, WBS becomes the place where packages, ownership, cadence, and triggers are made explicit.',
        position: 'left'
      },
      position: 'right',
      module: 'projects',
      beforeShow: () => {
        const wbsTab = document.querySelector('[data-tour="projects.tab.wbs"]');
        if (wbsTab) {
          (wbsTab as HTMLElement).click();
        }
      }
    },
    {
      id: 'project-gantt',
      target: '[data-tour="projects.gantt"]',
      title: 'Use Gantt To See Schedule Pressure',
      description: 'The Gantt view makes sequencing visible. It is useful when you need to see overlap, compressed timing, or gaps between work that depends on other work finishing first.',
      context: '💡 Timeline risk is easier to notice when it is visual instead of buried in individual task due dates.',
      missingTargetFallback: {
        target: '[data-tour="projects.create-project"]',
        title: 'Timeline Planning Comes After Basic Setup',
        description: 'There is no Gantt surface to anchor yet because the project does not have enough structure to render a meaningful timeline. Create the shell, add phases, then use Gantt to inspect sequence and schedule pressure.',
        position: 'left'
      },
      position: 'center',
      module: 'projects',
      beforeShow: () => {
        const ganttTab = document.querySelector('[data-tour="projects.tab.gantt"]');
        if (ganttTab) {
          (ganttTab as HTMLElement).click();
        }
      }
    },
    {
      id: 'project-create',
      target: '[data-tour="projects.add-phase"]',
      title: 'Build Structure In Layers',
      description: 'Projects do not need to be perfect on day one. Create the shell, add phases, then refine settings, ownership, and scheduling as the delivery model becomes clearer.',
      context: '💡 A simple project with clear phases is usually better than a detailed plan nobody will maintain.',
      missingTargetFallback: {
        target: '[data-tour="projects.create-project"]',
        title: 'Start By Creating The First Project',
        description: 'When the Projects module is still empty, this is the first real action: create the project shell. After that, add phases and continue building the structure in manageable layers.',
        position: 'left'
      },
      position: 'bottom',
      module: 'projects'
    }
  ]
};
