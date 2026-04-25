import { TourDefinition } from '../tour-types';

export const reportsTour: TourDefinition = {
  id: 'reports',
  name: 'Reports',
  icon: '📄',
  description: 'Compliance and documentation',
  estimatedTime: '~2 minutes',
  steps: [
    {
      id: 'reports-overview',
      target: '[data-tour="reports.header"]',
      title: 'Reports Turns Operational Data Into Formal Output',
      description: 'Use Reports when work needs to become a reviewed document with routing, signoff, audit history, and a clear status in the reporting workflow.',
      context: '💡 This module is designed for formal reporting work, not for daily task execution.',
      position: 'bottom',
      module: 'reports'
    },
    {
      id: 'reports-lifecycle',
      target: '[data-tour="reports.routing"]',
      title: 'The Workflow Is Explicit',
      description: 'Reports move through a defined lifecycle so everyone can see whether a document is still being written, waiting on review, or already approved.',
      context: '💡 Routing and status are visible in one place so approval work does not depend on side conversations.',
      missingTargetFallback: {
        title: 'Create A Report Before Routing Becomes Visible',
        description: 'There is no active routing panel to highlight yet, which usually means the reporting workspace does not have a selected report record. Once a report exists, routing makes ownership and review state explicit.',
        position: 'center'
      },
      position: 'right',
      module: 'reports'
    },
    {
      id: 'reports-templates',
      target: '[data-tour="reports.workspace-switcher"]',
      title: 'The Workspace Changes With The Role',
      description: 'Authors, reviewers, admins, and security operators each get a more focused workspace so report writing, queue handling, and account operations do not compete for the same space.',
      context: '💡 This makes the module feel more like a reporting workspace and less like a single crowded screen.',
      whyItMatters: 'Clear role separation reduces handoff friction and accidental edits',
      position: 'right',
      module: 'reports'
    },
    {
      id: 'reports-editor',
      target: '[data-tour="reports.editor"]',
      title: 'The Editor Follows The Reporting Job',
      description: 'The editor is organized around the actual reporting flow: write the narrative, capture required metrics, define corrective actions, then prepare the report for submission.',
      context: '💡 The tabs are the clearest way to learn the workflow because they mirror the shape of the report itself.',
      missingTargetFallback: {
        title: 'The Editor Opens When A Report Is Selected',
        description: 'There is no live report editor to show yet because the workspace does not currently have a report open. After the first report is created or selected, the tabs become the clearest guide to the reporting workflow.',
        position: 'center'
      },
      position: 'left',
      module: 'reports',
      beforeShow: () => {
        const narrativeTab = document.querySelector('[data-tour="reports.tab.narrative"]');
        if (narrativeTab) (narrativeTab as HTMLElement).click();
      }
    },
    {
      id: 'reports-notifications',
      target: '[data-tour="reports.activity"]',
      title: 'Activity Makes The Workflow Auditable',
      description: 'The activity area records workflow events and notification history so changes can be traced without relying on memory or chat.',
      context: '💡 This is the part of the module that turns a report into an accountable business record.',
      missingTargetFallback: {
        title: 'Audit Activity Appears Once Reporting Starts',
        description: 'There is no activity stream to highlight yet because there is not an active report record in view. Once reporting begins, this area becomes the audit trail for edits, routing, and notification events.',
        position: 'center'
      },
      position: 'left',
      module: 'reports',
      beforeShow: () => {
        const activityTab = document.querySelector('[data-tour="reports.tab.activity"]');
        if (activityTab) (activityTab as HTMLElement).click();
      }
    },
    {
      id: 'reports-offline',
      target: '[data-tour="reports.toolbar"]',
      title: 'The Toolbar Keeps Sync State Visible',
      description: 'The toolbar shows whether the report workspace is online, whether actions are queued, and whether the user can trust changes to sync immediately.',
      context: '💡 This is especially important when reporting continues in low-connectivity environments.',
      position: 'bottom',
      module: 'reports'
    }
  ]
};
