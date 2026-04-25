import { TourDefinition } from '../tour-types';

export const settingsTour: TourDefinition = {
  id: 'settings',
  name: 'Settings',
  icon: '⚙️',
  description: 'Automation and configuration',
  estimatedTime: '~2 minutes',
  steps: [
    {
      id: 'settings-overview',
      target: '[data-tour="settings.automations"]',
      title: 'Settings Defines How The Workspace Behaves',
      description: 'Use Settings to shape the reusable structures and workflow rules that keep the rest of the app consistent.',
      context: '💡 This module matters most when the team wants repeatability, not just one-off task management.',
      position: 'bottom',
      module: 'settings'
    },
    {
      id: 'settings-automations',
      target: '[data-tour="settings.automations"]',
      title: 'Automations Turn Conditions Into Action',
      description: 'This section is for workflow rules that watch for a condition and respond in a predictable way when it happens.',
      context: '💡 Good automation reduces follow-up work, but only if the rule is clear enough that the team trusts it.',
      position: 'right',
      module: 'settings'
    },
    {
      id: 'settings-task-templates',
      target: '[data-tour="settings.task-templates"]',
      title: 'Task Templates Standardize Repeat Work',
      description: 'Use task templates when the same kind of work keeps being created and you want the title, description, and expected structure to start from a strong default.',
      context: '💡 Templates work best when they reduce decision fatigue without making the task feel rigid.',
      whyItMatters: 'Consistent task setup improves execution quality and reduces admin overhead',
      position: 'right',
      module: 'settings'
    },
    {
      id: 'settings-report-templates',
      target: '[data-tour="settings.report-templates"]',
      title: 'Report Templates Make Reporting Repeatable',
      description: 'This section helps recurring reporting start from a known structure instead of being rebuilt each cycle.',
      context: '💡 Repetition is where templates create the most value because they remove setup work from every reporting round.',
      position: 'right',
      module: 'settings'
    },
    {
      id: 'settings-escalations',
      target: '[data-tour="settings.automations"]',
      title: 'Escalation Logic Still Lives Inside Automation Rules',
      description: 'There is not a separate escalation console yet, so escalation behavior is currently defined through the same rule model used for other automation.',
      context: '💡 It is better for the tour to explain the current design honestly than to pretend a dedicated escalation surface already exists.',
      position: 'right',
      module: 'settings'
    },
    {
      id: 'settings-notifications',
      target: null,
      title: 'Notifications Are The Last Mile Of The Workflow',
      description: 'Whether the system reacts through email, messaging, or in-app reminders, the goal is the same: make sure important events reach the right person in time.',
      context: '💡 Notification design works best when it is specific enough to be useful without becoming noise.',
      position: 'center',
      module: 'settings'
    }
  ]
};
