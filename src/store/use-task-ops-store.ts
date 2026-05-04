import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { activities, attachments, projectPhases, projects, tasks, users, workLogs } from '../data/mock';
import { workforceRoleTemplates } from '../data/agricultural-roles';
import { getDefaultReportData, initialReports, reportPeriods } from '../data/report-framework';
import {
  Activity,
  Attachment,
  AutomationRule,
  Project,
  ProjectPhase,
  ReportFrequency,
  ReportRecord,
  ReportReviewAction,
  ReportTemplate,
  Task,
  TaskTemplate,
  User,
  WorkLog
} from '../types/domain';

type LinkedCorrectiveAction = {
  id: string;
  text: string;
  owner: string;
  status: 'pending' | 'in_progress' | 'completed';
  completed: boolean;
  priority: 'low' | 'medium' | 'high' | 'critical';
  dueDate?: string;
  linkedTaskId?: string;
};

type Section = 'today' | 'tasks' | 'projects' | 'team' | 'profiles' | 'reports' | 'analytics' | 'settings' | 'blocked';
type TaskView = 'list' | 'board' | 'timeline' | 'calendar';
type TaskFilter = 'all' | 'my_work' | 'due_today' | 'blocked' | 'overdue' | 'review' | 'recurring' | 'watching';

type TaskOpsStore = {
  tasks: Task[];
  users: User[];
  teams: string[];
  projects: Project[];
  projectPhases: ProjectPhase[];
  attachments: Attachment[];
  workLogs: WorkLog[];
  activities: Activity[];
  automationRules: AutomationRule[];
  taskTemplates: TaskTemplate[];
  reportTemplates: ReportTemplate[];
  reports: ReportRecord[];
  activeSection: Section;
  activeView: TaskView;
  activeFilter: TaskFilter;
  selectedTaskId: string | null;
  selectedTaskIds: string[];
  selectedProjectId: string | null;
  selectedUserId: string | null;
  selectedReportId: string | null;
  searchQuery: string;
  addUser: (user: User) => void;
  addTeam: (teamName: string) => void;
  deleteTeam: (teamName: string) => void;
  updateUser: (userId: string, updates: Partial<User>) => void;
  deleteUser: (userId: string) => void;
  addTask: (task: Task) => void;
  updateTask: (taskId: string, updates: Partial<Task>) => void;
  toggleSubtask: (taskId: string, subtaskId: string) => void;
  addProject: (project: Project) => void;
  updateProject: (projectId: string, updates: Partial<Project>) => void;
  addProjectPhase: (phase: ProjectPhase) => void;
  updateProjectPhase: (phaseId: string, updates: Partial<ProjectPhase>) => void;
  addWorkLog: (workLog: WorkLog) => void;
  resolveBlocker: (taskId: string) => void;
  addAutomationRule: (rule: AutomationRule) => void;
  updateAutomationRule: (ruleId: string, updates: Partial<AutomationRule>) => void;
  toggleAutomationRuleStatus: (ruleId: string) => void;
  addTaskTemplate: (template: TaskTemplate) => void;
  updateTaskTemplate: (templateId: string, updates: Partial<TaskTemplate>) => void;
  addReportTemplate: (template: ReportTemplate) => void;
  updateReportTemplate: (templateId: string, updates: Partial<ReportTemplate>) => void;
  setReports: (reports: ReportRecord[]) => void;
  upsertReport: (report: ReportRecord) => void;
  createReport: (input: { period: ReportFrequency; roleId: string; reportingWindow: string; authorName?: string; reviewerName?: string }) => string | null;
  updateReport: (reportId: string, updates: Partial<ReportRecord>) => void;
  updateReportField: (reportId: string, field: string, value: string) => void;
  markReportSaved: (reportId: string) => void;
  submitReport: (reportId: string, signature?: string) => void;
  reviewReport: (reportId: string, action: ReportReviewAction, payload: { comments?: string; signature?: string }) => void;
  reopenReportDraft: (reportId: string) => void;
  importAgriculturalRoles: (roles: Array<{ roleKey: string; quantity: number; team: string }>) => void;
  bulkAddUsers: (users: User[]) => void;
  setActiveSection: (section: Section) => void;
  setActiveView: (view: TaskView) => void;
  setActiveFilter: (filter: TaskFilter) => void;
  setSelectedTaskId: (taskId: string | null) => void;
  toggleTaskSelection: (taskId: string) => void;
  setSelectedProjectId: (projectId: string | null) => void;
  setSelectedUserId: (userId: string | null) => void;
  setSelectedReportId: (reportId: string | null) => void;
  setSearchQuery: (query: string) => void;
};

const initialAutomationRules: AutomationRule[] = [
  {
    id: 'rule_1',
    name: 'Escalate overdue work',
    description: 'Escalate P1 and P2 tasks when they move past their due date.',
    trigger: 'task_overdue',
    action: 'escalate',
    status: 'active'
  },
  {
    id: 'rule_2',
    name: 'Nudge blocked owners',
    description: 'Notify the owner when a blocked task has been idle for too long.',
    trigger: 'task_blocked',
    action: 'notify_owner',
    status: 'draft'
  }
];

const initialTaskTemplates: TaskTemplate[] = [
  {
    id: 'task_tpl_1',
    name: 'Standard follow-up',
    description: 'A lightweight task for operational follow-up work.',
    type: 'standard',
    priority: 'P2',
    defaultEstimateHours: 2
  }
];

const initialReportTemplates: ReportTemplate[] = [
  {
    id: 'report_tpl_1',
    name: 'Monthly operations report',
    description: 'Recurring report template for monthly operating rhythm.',
    cadence: 'monthly',
    reviewerLabel: 'Operations Lead'
  }
];

function calculateProgress(task: Task) {
  if (task.subtasks.length === 0) {
    return task.status === 'done' ? 100 : task.progress;
  }

  return Math.round((task.subtasks.filter((subtask) => subtask.completed).length / task.subtasks.length) * 100);
}

function dedupeTeams(teamNames: string[]) {
  return Array.from(new Set(teamNames.map((team) => team.trim()).filter(Boolean))).sort((left, right) => left.localeCompare(right));
}

function parseLinkedCorrectiveActions(raw: unknown): LinkedCorrectiveAction[] {
  if (typeof raw !== 'string' || !raw.trim()) return [];

  try {
    const parsed = JSON.parse(raw) as LinkedCorrectiveAction[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function summarizeLinkedCorrectiveActions(actions: LinkedCorrectiveAction[]) {
  return actions.map((action) => `${action.completed ? '[Done]' : '[Open]'} ${action.text}${action.owner ? ` - ${action.owner}` : ''}`).join('\n');
}

function syncLinkedReportActionsForTask(reports: ReportRecord[], taskId: string, taskStatus: Task['status']) {
  const isCompleted = taskStatus === 'done';
  const nextActionStatus: LinkedCorrectiveAction['status'] = isCompleted
    ? 'completed'
    : taskStatus === 'ready' || taskStatus === 'backlog'
      ? 'pending'
      : 'in_progress';

  return reports.map((report) => {
    const actions = parseLinkedCorrectiveActions(report.data.corrective_actions_items);
    if (!actions.some((action) => action.linkedTaskId === taskId)) return report;

    const nextActions = actions.map((action) => (
      action.linkedTaskId === taskId
        ? { ...action, completed: isCompleted, status: nextActionStatus }
        : action
    ));

    return {
      ...report,
      data: {
        ...report.data,
        corrective_actions_items: JSON.stringify(nextActions),
        corrective_actions: summarizeLinkedCorrectiveActions(nextActions)
      },
      updatedAt: new Date().toISOString()
    };
  });
}

export const useTaskOpsStore = create<TaskOpsStore>()(
  persist(
    (set) => ({
      tasks,
      users,
      teams: dedupeTeams(users.map((user) => user.team)),
      projects,
      projectPhases,
      attachments,
      workLogs,
      activities,
      automationRules: initialAutomationRules,
      taskTemplates: initialTaskTemplates,
      reportTemplates: initialReportTemplates,
      reports: initialReports,
      activeSection: 'today',
      activeView: 'list',
      activeFilter: 'my_work',
      selectedTaskId: tasks[0]?.id ?? null,
      selectedTaskIds: [],
      selectedProjectId: projects[0]?.id ?? null,
      selectedUserId: users[0]?.id ?? null,
      selectedReportId: initialReports[0]?.id ?? null,
      searchQuery: '',
      addUser: (user) =>
        set((state) => ({
          users: [user, ...state.users],
          teams: dedupeTeams([...state.teams, user.team]),
          selectedUserId: user.id,
          activeSection: 'team'
        })),
      addTeam: (teamName) =>
        set((state) => ({
          teams: dedupeTeams([...state.teams, teamName])
        })),
      deleteTeam: (teamName) =>
        set((state) => {
          const normalizedTeamName = teamName.trim();
          if (!normalizedTeamName) {
            return {};
          }

          const fallbackTeam = 'Unassigned';
          const hasMembers = state.users.some((user) => user.team === normalizedTeamName);
          const nextTeams = dedupeTeams(
            state.teams
              .filter((team) => team !== normalizedTeamName)
              .concat(hasMembers ? [fallbackTeam] : [])
          );

          return {
            teams: nextTeams,
            users: state.users.map((user) =>
              user.team === normalizedTeamName ? { ...user, team: fallbackTeam } : user
            )
          };
        }),
      updateUser: (userId, updates) =>
        set((state) => ({
          users: state.users.map((user) => (user.id === userId ? { ...user, ...updates } : user)),
          teams: updates.team ? dedupeTeams([...state.teams, updates.team]) : state.teams
        })),
      deleteUser: (userId) =>
        set((state) => {
          const nextUsers = state.users.filter((user) => user.id !== userId);
          const fallbackOwnerId = nextUsers[0]?.id ?? '';

          return {
            users: nextUsers,
            teams: dedupeTeams(nextUsers.map((user) => user.team).concat(state.teams)),
            projects: state.projects.map((project) => ({
              ...project,
              ownerId: project.ownerId === userId ? undefined : project.ownerId,
              teamMemberIds: project.teamMemberIds.filter((memberId) => memberId !== userId)
            })),
            tasks: state.tasks.map((task) => ({
              ...task,
              ownerId: task.ownerId === userId ? fallbackOwnerId : task.ownerId,
              reviewerId: task.reviewerId === userId ? undefined : task.reviewerId,
              backupOwnerId: task.backupOwnerId === userId ? undefined : task.backupOwnerId,
              watcherIds: task.watcherIds.filter((watcherId) => watcherId !== userId)
            })),
            selectedUserId: nextUsers.find((user) => user.id === state.selectedUserId)?.id ?? nextUsers[0]?.id ?? null
          };
        }),
      addTask: (task) =>
        set((state) => ({
          tasks: [task, ...state.tasks],
          selectedTaskId: task.id,
          activeSection: 'tasks',
          activeView: 'list'
        })),
      updateTask: (taskId, updates) =>
        set((state) => {
          let syncedStatus: Task['status'] | null = null;
          const nextTasks = state.tasks.map((task) => {
            if (task.id !== taskId) return task;
            const nextTask = { ...task, ...updates };
            const nextProgress = updates.progress ?? calculateProgress(nextTask);
            syncedStatus = nextTask.status;
            return {
              ...nextTask,
              progress: nextTask.status === 'done' ? 100 : nextProgress
            };
          });

          return {
            tasks: nextTasks,
            reports: syncedStatus ? syncLinkedReportActionsForTask(state.reports, taskId, syncedStatus) : state.reports
          };
        }),
      toggleSubtask: (taskId, subtaskId) =>
        set((state) => ({
          tasks: state.tasks.map((task) => {
            if (task.id !== taskId) return task;
            const subtasks = task.subtasks.map((subtask) =>
              subtask.id === subtaskId ? { ...subtask, completed: !subtask.completed } : subtask
            );
            const nextTask = { ...task, subtasks };
            const nextProgress = calculateProgress(nextTask);
            return {
              ...nextTask,
              progress: nextProgress,
              status: nextProgress === 100 ? 'done' : task.status === 'done' ? 'ready' : task.status
            };
          })
        })),
      addProject: (project) =>
        set((state) => ({
          projects: [project, ...state.projects],
          selectedProjectId: project.id,
          activeSection: 'projects'
        })),
      updateProject: (projectId, updates) =>
        set((state) => ({
          projects: state.projects.map((project) => (project.id === projectId ? { ...project, ...updates } : project))
        })),
      addProjectPhase: (phase) =>
        set((state) => ({
          projectPhases: [...state.projectPhases, phase],
          selectedProjectId: phase.projectId,
          activeSection: 'projects'
        })),
      updateProjectPhase: (phaseId, updates) =>
        set((state) => ({
          projectPhases: state.projectPhases.map((phase) => (phase.id === phaseId ? { ...phase, ...updates } : phase))
        })),
      addWorkLog: (workLog) =>
        set((state) => ({
          workLogs: [workLog, ...state.workLogs],
          tasks: state.tasks.map((task) =>
            task.id === workLog.taskId
              ? {
                  ...task,
                  loggedHours: Number((task.loggedHours + (workLog.durationMinutes ?? 0) / 60).toFixed(2)),
                  workLogIds: [workLog.id, ...task.workLogIds]
                }
              : task
          )
        })),
      resolveBlocker: (taskId) =>
        set((state) => ({
          tasks: state.tasks.map((task) =>
            task.id === taskId
              ? {
                  ...task,
                  blocker: null,
                  status: task.status === 'blocked' ? 'ready' : task.status
                }
              : task
          )
        })),
      addAutomationRule: (rule) => set((state) => ({ automationRules: [rule, ...state.automationRules] })),
      updateAutomationRule: (ruleId, updates) =>
        set((state) => ({
          automationRules: state.automationRules.map((rule) => (rule.id === ruleId ? { ...rule, ...updates } : rule))
        })),
      toggleAutomationRuleStatus: (ruleId) =>
        set((state) => ({
          automationRules: state.automationRules.map((rule) =>
            rule.id === ruleId ? { ...rule, status: rule.status === 'active' ? 'draft' : 'active' } : rule
          )
        })),
      addTaskTemplate: (template) => set((state) => ({ taskTemplates: [template, ...state.taskTemplates] })),
      updateTaskTemplate: (templateId, updates) =>
        set((state) => ({
          taskTemplates: state.taskTemplates.map((template) =>
            template.id === templateId ? { ...template, ...updates } : template
          )
        })),
      addReportTemplate: (template) => set((state) => ({ reportTemplates: [template, ...state.reportTemplates] })),
      updateReportTemplate: (templateId, updates) =>
        set((state) => ({
          reportTemplates: state.reportTemplates.map((template) =>
            template.id === templateId ? { ...template, ...updates } : template
          )
        })),
      setReports: (reports) => set((state) => ({
        reports,
        selectedReportId: reports.some((report) => report.id === state.selectedReportId) ? state.selectedReportId : reports[0]?.id ?? null
      })),
      upsertReport: (report) =>
        set((state) => {
          const exists = state.reports.some((item) => item.id === report.id);
          return {
            reports: exists ? state.reports.map((item) => (item.id === report.id ? report : item)) : [report, ...state.reports],
            selectedReportId: report.id
          };
        }),
      createReport: ({ period, roleId, reportingWindow, authorName, reviewerName }) => {
        const periodDefinition = reportPeriods.find((item) => item.id === period);
        const roleDefinition = periodDefinition?.roles.find((role) => role.id === roleId);
        if (!periodDefinition || !roleDefinition) return null;

        const now = new Date().toISOString();
        const reportId = `report_${Date.now()}`;

        set((state) => ({
          reports: [
            {
              id: reportId,
              title: `${periodDefinition.label} ${roleDefinition.name} report`,
              period,
              roleId: roleDefinition.id,
              roleName: roleDefinition.name,
              category: roleDefinition.category,
              status: 'draft',
              authorName: authorName?.trim() || 'Report Author',
              reviewerName: reviewerName?.trim() || 'Reviewer',
              reportingWindow,
              createdAt: now,
              updatedAt: now,
              lastSavedAt: now,
              data: getDefaultReportData(roleDefinition)
            },
            ...state.reports
          ],
          selectedReportId: reportId,
          activeSection: 'reports'
        }));

        return reportId;
      },
      updateReport: (reportId, updates) =>
        set((state) => ({
          reports: state.reports.map((report) =>
            report.id === reportId
              ? {
                  ...report,
                  ...updates,
                  updatedAt: new Date().toISOString()
                }
              : report
          )
        })),
      updateReportField: (reportId, field, value) =>
        set((state) => ({
          reports: state.reports.map((report) =>
            report.id === reportId
              ? {
                  ...report,
                  data: {
                    ...report.data,
                    [field]: value
                  },
                  updatedAt: new Date().toISOString()
                }
              : report
          )
        })),
      markReportSaved: (reportId) =>
        set((state) => ({
          reports: state.reports.map((report) =>
            report.id === reportId
              ? {
                  ...report,
                  lastSavedAt: new Date().toISOString()
                }
              : report
          )
        })),
      submitReport: (reportId, signature) =>
        set((state) => ({
          reports: state.reports.map((report) =>
            report.id === reportId
              ? {
                  ...report,
                  status: 'submitted',
                  signature: signature ?? report.signature,
                  submittedAt: new Date().toISOString(),
                  updatedAt: new Date().toISOString()
                }
              : report
          )
        })),
      reviewReport: (reportId, action, payload) =>
        set((state) => ({
          reports: state.reports.map((report) =>
            report.id === reportId
              ? {
                  ...report,
                  status: action === 'approve' ? 'approved' : action === 'reject' ? 'rejected' : 'changes_requested',
                  reviewComments: payload.comments?.trim() || report.reviewComments,
                  reviewerSignature: payload.signature ?? report.reviewerSignature,
                  reviewedAt: new Date().toISOString(),
                  updatedAt: new Date().toISOString()
                }
              : report
          )
        })),
      reopenReportDraft: (reportId) =>
        set((state) => ({
          reports: state.reports.map((report) =>
            report.id === reportId
              ? {
                  ...report,
                  status: 'draft',
                  signature: undefined,
                  reviewerSignature: undefined,
                  updatedAt: new Date().toISOString()
                }
              : report
          )
        })),
      importAgriculturalRoles: (roleImports) =>
        set((state) => {
          const newUsers: User[] = [];
          
          roleImports.forEach(({ roleKey, quantity, team }) => {
            const template = workforceRoleTemplates[roleKey];
            if (!template) return;
            
            for (let i = 0; i < quantity; i++) {
              const roleName = (typeof roleKey === 'string' && roleKey.trim() ? roleKey : 'Role')
                .replace(/_/g, ' ')
                .replace(/\b\w/g, (l) => l.toUpperCase());
              newUsers.push({
                id: `user_${roleKey}_${Date.now()}_${i}`,
                name: `${roleName} ${i + 1}`,
                role: 'member',
                team,
                capacityHoursPerWeek: 45,
                agriculturalRole: template
              });
            }
          });
          
          return {
            users: [...newUsers, ...state.users],
            teams: dedupeTeams([...state.teams, ...newUsers.map((user) => user.team)]),
            activeSection: 'team'
          };
        }),
      bulkAddUsers: (newUsers) =>
        set((state) => ({
          users: [...newUsers, ...state.users],
          teams: dedupeTeams([...state.teams, ...newUsers.map((user) => user.team)])
        })),
      setActiveSection: (section) => set({ activeSection: section }),
      setActiveView: (view) => set({ activeView: view }),
      setActiveFilter: (filter) => set({ activeFilter: filter }),
      setSelectedTaskId: (taskId) => set({ selectedTaskId: taskId }),
      toggleTaskSelection: (taskId) =>
        set((state) => ({
          selectedTaskIds: state.selectedTaskIds.includes(taskId)
            ? state.selectedTaskIds.filter((id) => id !== taskId)
            : [...state.selectedTaskIds, taskId]
        })),
      setSelectedProjectId: (projectId) => set({ selectedProjectId: projectId }),
      setSelectedUserId: (userId) => set({ selectedUserId: userId }),
      setSelectedReportId: (reportId) => set({ selectedReportId: reportId }),
      setSearchQuery: (query) => set({ searchQuery: query })
    }),
    {
      name: 'taskops-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        tasks: state.tasks,
        users: state.users,
        teams: state.teams,
        projects: state.projects,
        projectPhases: state.projectPhases,
        attachments: state.attachments,
        workLogs: state.workLogs,
        activities: state.activities,
        automationRules: state.automationRules,
        taskTemplates: state.taskTemplates,
        reportTemplates: state.reportTemplates,
        reports: state.reports,
        activeSection: state.activeSection,
        activeView: state.activeView,
        activeFilter: state.activeFilter,
        selectedReportId: state.selectedReportId
      }),
      onRehydrateStorage: () => (state, error) => {
        if (error) {
          console.error('Failed to rehydrate taskops store:', error);
        } else {
          console.log('Taskops store rehydrated successfully', {
            usersCount: state?.users?.length || 0,
            tasksCount: state?.tasks?.length || 0
          });
        }
      },
      skipHydration: false
    }
  )
);
