import { TourDefinition } from '../tour-types';

export const analyticsTour: TourDefinition = {
  id: 'analytics',
  name: 'Analytics',
  icon: '📊',
  description: 'Operational and financial insights',
  estimatedTime: '~2 minutes',
  steps: [
    {
      id: 'analytics-overview',
      target: '[data-tour="analytics.tabs"]',
      title: 'Analytics Brings The Signals Together',
      description: 'Use Analytics to move from raw operational data into trend, risk, and cost insight without building a report first.',
      context: '💡 The tabs split operational health from labor cost so each question can be reviewed in the right frame.',
      position: 'bottom',
      module: 'analytics'
    },
    {
      id: 'analytics-task-metrics',
      target: '[data-tour="analytics.task-overview"]',
      title: 'Start With Operational Health',
      description: 'The operational view helps you read completion, overdue pressure, blockers, and other signals that show whether execution is stable or drifting.',
      context: '💡 Analytics is most useful when it leads to a follow-up action in Tasks, Projects, or Team.',
      position: 'right',
      module: 'analytics'
    },
    {
      id: 'analytics-project-performance',
      target: '[data-tour="analytics.project-performance"]',
      title: 'Project Performance Shows Where To Intervene',
      description: 'This area highlights which projects deserve attention because progress, blockers, or task health suggest the plan is drifting.',
      context: '💡 Project analytics become more useful when task and project data are both being maintained consistently.',
      whyItMatters: 'It is easier to protect delivery timing when risk is visible before it becomes a missed milestone',
      position: 'right',
      module: 'analytics'
    },
    {
      id: 'analytics-labor-overview',
      target: '[data-tour="analytics.labor-overview"]',
      title: 'Labor Cost Turns Team Setup Into Spend Visibility',
      description: 'The labor view translates roles, staffing mix, and logged work into a financial picture so operational choices can be read as cost impact.',
      context: '💡 This view depends on good team and work-log data upstream, which is why those earlier modules matter.',
      position: 'center',
      module: 'analytics',
      beforeShow: () => {
        // Switch to Labor Cost tab if exists
        const laborTab = document.querySelector('[data-tour="analytics.tab.labor"]');
        if (laborTab) (laborTab as HTMLElement).click();
      }
    },
    {
      id: 'analytics-category-breakdown',
      target: '[data-tour="analytics.category-breakdown"]',
      title: 'Category Breakdown Shows Where Spend Concentrates',
      description: 'The category view makes it easier to compare where labor spend is accumulating and which staffing groups dominate the cost base.',
      context: '💡 High concentration is not always bad, but it is usually worth understanding.',
      position: 'center',
      module: 'analytics'
    },
    {
      id: 'analytics-roster',
      target: '[data-tour="analytics.workforce-roster"]',
      title: 'Roster Lets You Inspect Individual Cost Drivers',
      description: 'The roster is where broad labor trends can be traced back to specific people, role types, engagement models, and compliance attributes.',
      context: '💡 Use this view when the summary looks off and you need to understand which records are driving it.',
      position: 'center',
      module: 'analytics',
      beforeShow: () => {
        const laborTab = document.querySelector('[data-tour="analytics.tab.labor"]');
        const rosterTab = document.querySelector('[data-tour="analytics.labor-tab.roster"]');
        if (laborTab) (laborTab as HTMLElement).click();
        if (rosterTab) (rosterTab as HTMLElement).click();
      }
    }
  ]
};
