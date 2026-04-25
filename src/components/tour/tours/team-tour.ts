import { TourDefinition } from '../tour-types';

export const teamTour: TourDefinition = {
  id: 'team',
  name: 'Team',
  icon: '👥',
  description: 'Workload management and HR import',
  estimatedTime: '~2 minutes',
  steps: [
    {
      id: 'team-overview',
      target: '[data-tour="team.sidebar"]',
      title: 'Team Shows Whether Capacity Matches Demand',
      description: 'Use Team to understand who owns work, who is overloaded, and whether staffing pressure is starting to threaten delivery.',
      context: '💡 This module is most useful when the task system is already being updated well, because team pressure is calculated from the work record.',
      position: 'bottom',
      module: 'team'
    },
    {
      id: 'team-member-card',
      target: '[data-tour="team.management"]',
      title: 'Member Management Connects People To Work',
      description: 'This area keeps the team directory current so ownership, capacity, and assignment decisions in the rest of the app are based on real people rather than placeholders.',
      context: '💡 A reliable team list improves project ownership, task assignment, and later cost analysis.',
      missingTargetFallback: {
        title: 'Add The First Team Member To Activate Management',
        description: 'There is no active member management surface to highlight yet because the team directory is still empty. Once the first person is added, this area becomes the place to maintain ownership, role, and capacity details.',
        position: 'center'
      },
      position: 'right',
      module: 'team'
    },
    {
      id: 'team-filters',
      target: '[data-tour="team.filters"]',
      title: 'Filter By The Type Of Pressure You Need To Resolve',
      description: 'The filters let you focus on overload, blockers, or overdue ownership instead of scanning the full team every time.',
      context: "💡 Use these filters during high-pressure periods to find the people most likely to need intervention first.",
      whyItMatters: 'Capacity issues are easier to fix when they are visible before deadlines slip',
      position: 'bottom',
      module: 'team'
    },
    {
      id: 'team-hr-import',
      target: '[data-tour="team.import"]',
      title: 'Use Import When Headcount Grows Quickly',
      description: 'The import flow is built for bulk onboarding when seasonal or role-based staffing needs to be added faster than manual entry would allow.',
      context: '💡 The wizard moves from categories to roles to quantities to review so the batch can be checked before it lands.',
      position: 'right',
      module: 'team'
    },
    {
      id: 'team-roles',
      target: null,
      title: 'Roles Add More Than A Job Title',
      description: 'Role categories give the system a way to connect staffing structure to payroll assumptions, utilization, and later analytics.',
      context: '💡 The role model carries rate and employment context, not just a label.',
      position: 'center',
      module: 'team'
    },
    {
      id: 'team-cost-flow',
      target: null,
      title: 'Team Data Becomes Cost Insight Later',
      description: 'Once people, roles, and work logs are in place, the labor model can turn execution data into spend visibility inside Analytics.',
      context: '💡 This is why keeping team setup accurate matters even before a finance view is opened.',
      whyItMatters: 'Clean team data improves the quality of labor reporting and budget decisions',
      position: 'center',
      module: 'team'
    }
  ]
};
