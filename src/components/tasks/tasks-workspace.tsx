'use client';

import {
  AlertTriangle,
  CalendarDays,
  Clock3,
  FileText,
  FolderKanban,
  LayoutGrid,
  ListTodo,
  Plus,
  Search,
  TimerReset,
  Users,
  X,
  BookOpen,
  Upload
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useTaskOpsStore } from '@/store/use-task-ops-store';
import { AutomationRule, Project, ProjectPhase, ProjectType, ReportTemplate, Task, TaskPriority, TaskStatus, TaskTemplate, TaskType, User, UserRole } from '@/types/domain';
import { TaskDetailPanel } from './task-detail-panel';
import { ProjectWorkbench } from './project-workbench';
import { HrImportWizard } from './hr-import-wizard';
import { LaborCostAnalytics } from './labor-cost-analytics';
import { ReportsModule } from './reports-module';
import { formatCurrency } from '@/utils/agricultural-import-validator';
import { categoryIcons, categoryLabels } from '@/data/agricultural-roles';

const statusLabel: Record<TaskStatus, string> = {
  backlog: 'Backlog',
  ready: 'Ready',
  in_progress: 'In Progress',
  review: 'Review',
  blocked: 'Blocked',
  done: 'Done',
  archived: 'Archived'
};

const statusTone: Record<TaskStatus, string> = {
  backlog: 'slate',
  ready: 'blue',
  in_progress: 'amber',
  review: 'violet',
  blocked: 'red',
  done: 'green',
  archived: 'slate'
};

type NewTaskDraft = {
  title: string;
  description: string;
  type: TaskType;
  status: TaskStatus;
  priority: TaskPriority;
  projectId: string;
  ownerId: string;
  reviewerId: string;
  backupOwnerId: string;
  startAt: string;
  endAt: string;
  estimateHours: string;
  tags: string;
  recurrence: '' | 'daily' | 'weekly' | 'monthly' | 'quarterly';
};

type NewProjectDraft = {
  name: string;
  subtitle: string;
  description: string;
  type: ProjectType;
  ownerName: string;
  totalWeeks: string;
};

type TeamMemberDraft = {
  name: string;
  role: UserRole;
  team: string;
  capacityHoursPerWeek: string;
};

type ProjectSummary = {
  project: Project;
  taskCount: number;
  openCount: number;
  blockedCount: number;
  avgProgress: number;
  loggedHours: number;
  ownerName: string;
  tasks: Task[];
};

type TeamSummary = {
  user: User;
  openCount: number;
  blockedCount: number;
  overdueCount: number;
  reviewCount: number;
  loggedHours: number;
  utilization: number;
  tasks: Task[];
};

type SettingsSummary = {
  activeAutomations: number;
  taskTemplateCount: number;
  reportTemplateCount: number;
  escalationRules: number;
  notificationRules: number;
};

type AnalyticsSummary = {
  completionRate: number;
  overdueCount: number;
  blockedCount: number;
  reportVolume: number;
  avgProgress: number;
  totalLoggedHours: number;
  activeProjects: number;
  busiestTeamMember: string;
  busiestTeamLoad: number;
};

const emptyDraft: NewTaskDraft = {
  title: '',
  description: '',
  type: 'standard',
  status: 'backlog',
  priority: 'P2',
  projectId: '',
  ownerId: '',
  reviewerId: '',
  backupOwnerId: '',
  startAt: '',
  endAt: '',
  estimateHours: '2',
  tags: '',
  recurrence: ''
};

const emptyProjectDraft: NewProjectDraft = {
  name: '',
  subtitle: '',
  description: '',
  type: 'project',
  ownerName: '',
  totalWeeks: '12'
};

const emptyTeamMemberDraft: TeamMemberDraft = {
  name: '',
  role: 'member',
  team: '',
  capacityHoursPerWeek: '40'
};

const suggestedProjectTypes = ['project', 'operations', 'workstream', 'client', 'account'];

const DISPLAY_LOCALE = 'en-ZA';
const DISPLAY_TIME_ZONE = 'UTC';
const REFERENCE_NOW = new Date('2026-04-07T12:00:00.000Z');

function startOfDay(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function isSameDay(left: Date, right: Date) {
  return (
    left.getUTCFullYear() === right.getUTCFullYear() &&
    left.getUTCMonth() === right.getUTCMonth() &&
    left.getUTCDate() === right.getUTCDate()
  );
}

function formatDayLabel(date: Date) {
  return new Intl.DateTimeFormat(DISPLAY_LOCALE, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    timeZone: DISPLAY_TIME_ZONE
  }).format(date);
}

function formatDateTimeLabel(date: Date) {
  return new Intl.DateTimeFormat(DISPLAY_LOCALE, {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: DISPLAY_TIME_ZONE
  }).format(date).replace(',', '');
}

function formatMonthLabel(date: Date) {
  return new Intl.DateTimeFormat(DISPLAY_LOCALE, {
    month: 'long',
    year: 'numeric',
    timeZone: DISPLAY_TIME_ZONE
  }).format(date);
}

function buildEmptyTaskDraft(projectList: Project[], userList: User[]): NewTaskDraft {
  const ownerId = userList[0]?.id ?? '';
  return {
    ...emptyDraft,
    projectId: projectList[0]?.id ?? '',
    ownerId,
    reviewerId: userList[1]?.id ?? ownerId,
    backupOwnerId: userList[2]?.id ?? ownerId
  };
}

function findUserByName(userList: User[], ownerName: string) {
  const normalizedOwnerName = ownerName.trim().toLowerCase();
  if (!normalizedOwnerName) return null;
  return userList.find((user) => user.name.trim().toLowerCase() === normalizedOwnerName) ?? null;
}

type OnboardingStep = {
  title: string;
  body: string;
  bullets: string[];
  section: 'tasks' | 'projects' | 'team' | 'reports' | 'analytics' | 'settings' | 'blocked';
  view?: 'list' | 'board' | 'timeline' | 'calendar';
  filter?: 'all' | 'my_work' | 'due_today' | 'blocked' | 'recurring' | 'watching';
};

const ONBOARDING_STORAGE_KEY = 'taskops:onboarding-complete';
const onboardingSteps: OnboardingStep[] = [
  {
    title: 'Welcome to TaskOps',
    body: 'TaskOps is the shared operating system for planning, executing, tracking, and escalating work.',
    bullets: [
      'Tasks are the source of truth for day-to-day work.',
      'Projects, Team, Reports, Blocked, Analytics, and Settings all support that core task flow.',
      'This walkthrough will move the app as you go so you can learn by seeing the real screens.'
    ],
    section: 'tasks',
    view: 'list',
    filter: 'all'
  },
  {
    title: 'Start in Tasks',
    body: 'This is where operators should begin every day.',
    bullets: [
      'Review My Work, Due Today, Blocked, and Overdue pressure.',
      'Open a task and keep status, subtasks, and work logs current.',
      'Use the right detail panel as the working surface, not just the list.'
    ],
    section: 'tasks',
    view: 'list',
    filter: 'my_work'
  },
  {
    title: 'Use Views to Sequence Work',
    body: 'The task model stays the same while the view changes to fit the job in front of you.',
    bullets: [
      'Board is best for flow by status.',
      'Timeline is best for sequencing due work over the coming days.',
      'Calendar is best when date pressure matters more than status.'
    ],
    section: 'tasks',
    view: 'timeline',
    filter: 'all'
  },
  {
    title: 'Projects Show Delivery Health',
    body: 'Projects group related tasks without replacing the task-first operating model.',
    bullets: [
      'Use Projects to review open work, blocked work, progress, and effort by delivery stream.',
      'Drill back into tasks whenever a project needs attention.',
      'Projects organize work; they should not become a separate tracking system.'
    ],
    section: 'projects'
  },
  {
    title: 'Team Protects Flow',
    body: 'Team leads use this view to balance ownership and spot pressure early.',
    bullets: [
      'Watch utilization, blocked owned work, overdue work, and review load.',
      'Reassign or rebalance before work clusters into the same people.',
      'Treat this as an operational load view, not a directory.'
    ],
    section: 'team'
  },
  {
    title: 'Reports and Blocked are Intervention Screens',
    body: 'Recurring deliverables and stuck work need their own focused views.',
    bullets: [
      'Reports helps teams stay ahead of recurring deliverables and review routing.',
      'Blocked is the command center for intervention and escalation.',
      'When work is stuck, make the blocker explicit instead of letting it silently drift.'
    ],
    section: 'reports'
  },
  {
    title: 'Analytics and Settings Improve the System',
    body: 'Managers and admins use these screens to improve the operating model over time.',
    bullets: [
      'Analytics shows completion, overdue work, blocked volume, and load patterns.',
      'Settings holds templates, automations, and routing rules for repeatable work.',
      'Tune the system after patterns emerge; do not automate unstable workflows too early.'
    ],
    section: 'analytics'
  },
  {
    title: 'Recommended Daily Rhythm',
    body: 'The simplest good workflow is to capture work quickly, execute from tasks, and escalate friction early.',
    bullets: [
      'Operators live in Tasks and keep records current in real time.',
      'Leads work from Blocked, Team, and Projects to protect delivery flow.',
      'Managers review Analytics weekly, and admins improve Settings as patterns emerge.'
    ],
    section: 'blocked'
  }
];

function TaskStatusBadge({ status }: { status: TaskStatus }) {
  return <span className={`status-badge status-${statusTone[status]}`}>{statusLabel[status]}</span>;
}

function TaskPriorityBadge({ priority }: { priority: TaskPriority }) {
  return <span className={`priority-badge priority-${priority.toLowerCase()}`}>{priority}</span>;
}

function SimpleDetailPanel({ title, body, children }: { title: string; body: string; children?: React.ReactNode }) {
  return (
    <aside className="detail-panel">
      <div className="detail-header">
        <div className="detail-header-copy">
          <h2>{title}</h2>
          <p>{body}</p>
        </div>
      </div>
      {children}
    </aside>
  );
}

function AnalyticsDetailPanel({ summary, projectSummaries, teamSummaries }: { summary: AnalyticsSummary; projectSummaries: ProjectSummary[]; teamSummaries: TeamSummary[] }) {
  return (
    <SimpleDetailPanel title="Analytics" body="Cross-cutting performance signals derived from the shared task, project, team, and report model.">
      <section className="detail-section">
        <div className="section-title">Operational Snapshot</div>
        <div className="project-metrics-grid compact analytics-compact">
          <div className="project-metric"><strong>{summary.overdueCount}</strong><span>Overdue</span></div>
          <div className="project-metric"><strong>{summary.blockedCount}</strong><span>Blocked</span></div>
          <div className="project-metric"><strong>{summary.reportVolume}</strong><span>Reports</span></div>
          <div className="project-metric"><strong>{summary.totalLoggedHours.toFixed(1)}h</strong><span>Logged</span></div>
        </div>
      </section>
      <section className="detail-section">
        <div className="section-title">Highlights</div>
        <div className="analytics-list">
          {projectSummaries.slice(0, 3).map((project) => (
            <div key={project.project.id} className="analytics-list-row">
              <div><strong>{project.project.name}</strong><small>{project.openCount} open · {project.blockedCount} blocked</small></div>
              <span>{project.loggedHours}h</span>
            </div>
          ))}
          {teamSummaries.slice(0, 3).map((member) => (
            <div key={member.user.id} className="analytics-list-row">
              <div><strong>{member.user.name}</strong><small>{member.openCount} open · {member.blockedCount} blocked</small></div>
              <span>{member.utilization}%</span>
            </div>
          ))}
        </div>
      </section>
    </SimpleDetailPanel>
  );
}

function SettingsDetailPanel({ summary, automationRules, taskTemplates, reportTemplates, onToggleRule }: {
  summary: SettingsSummary;
  automationRules: AutomationRule[];
  taskTemplates: TaskTemplate[];
  reportTemplates: ReportTemplate[];
  onToggleRule: (ruleId: string) => void;
}) {
  return (
    <SimpleDetailPanel title="Settings & Automations" body="Templates, escalation paths, reminder rules, and recurring automation controls.">
      <section className="detail-section">
        <div className="section-title">Configuration Summary</div>
        <div className="project-metrics-grid compact">
          <div className="project-metric"><strong>{summary.taskTemplateCount}</strong><span>Task templates</span></div>
          <div className="project-metric"><strong>{summary.reportTemplateCount}</strong><span>Report templates</span></div>
          <div className="project-metric"><strong>{summary.escalationRules}</strong><span>Escalations</span></div>
          <div className="project-metric"><strong>{summary.notificationRules}</strong><span>Notifications</span></div>
        </div>
      </section>
      <section className="detail-section">
        <div className="section-title">Quick Health</div>
        <div className="analytics-list">
          {automationRules.slice(0, 2).map((rule) => (
            <button key={rule.id} className="settings-action-row" onClick={() => onToggleRule(rule.id)}>
              <div><strong>{rule.name}</strong><small>{rule.description}</small></div>
              <span className={`status-badge ${rule.status === 'active' ? 'status-green' : 'status-slate'}`}>{rule.status}</span>
            </button>
          ))}
          {taskTemplates.slice(0, 1).map((template) => <div key={template.id} className="analytics-list-row"><div><strong>{template.name}</strong><small>{template.type} · {template.priority}</small></div><span>Task</span></div>)}
          {reportTemplates.slice(0, 1).map((template) => <div key={template.id} className="analytics-list-row"><div><strong>{template.name}</strong><small>{template.cadence} cadence</small></div><span>Report</span></div>)}
        </div>
      </section>
    </SimpleDetailPanel>
  );
}
export function TasksWorkspace() {
  const {
    tasks,
    users,
    projects,
    projectPhases,
    workLogs,
    automationRules,
    taskTemplates,
    reportTemplates,
    reports,
    activeSection,
    activeView,
    activeFilter,
    selectedTaskId,
    selectedTaskIds,
    selectedProjectId,
    selectedUserId,
    selectedReportId,
    searchQuery,
    addUser,
    updateUser,
    deleteUser,
    addTask,
    addProject,
    updateProject,
    addProjectPhase,
    resolveBlocker,
    addAutomationRule,
    updateAutomationRule,
    addTaskTemplate,
    updateTaskTemplate,
    addReportTemplate,
    updateReportTemplate,
    setActiveSection,
    setActiveView,
    setActiveFilter,
    setSelectedTaskId,
    setSelectedProjectId,
    setSelectedUserId,
    setSelectedReportId,
    toggleAutomationRuleStatus,
    toggleTaskSelection,
    setSearchQuery
  } = useTaskOpsStore();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isCreateProjectOpen, setIsCreateProjectOpen] = useState(false);
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);
  const [onboardingStepIndex, setOnboardingStepIndex] = useState(0);
  const [selectedProjectPhaseId, setSelectedProjectPhaseId] = useState<string | null>(null);
  const [draft, setDraft] = useState<NewTaskDraft>(() => buildEmptyTaskDraft([], []));
  const [projectDraft, setProjectDraft] = useState<NewProjectDraft>(emptyProjectDraft);
  const [teamMemberDraft, setTeamMemberDraft] = useState<TeamMemberDraft>(emptyTeamMemberDraft);
  const [ruleDraft, setRuleDraft] = useState<Pick<AutomationRule, 'name' | 'description' | 'trigger' | 'action'>>({ name: '', description: '', trigger: 'task_overdue', action: 'notify_owner' });
  const [taskTemplateDraft, setTaskTemplateDraft] = useState<Pick<TaskTemplate, 'name' | 'description' | 'type' | 'priority' | 'defaultEstimateHours'>>({ name: '', description: '', type: 'standard', priority: 'P2', defaultEstimateHours: 2 });
  const [reportTemplateDraft, setReportTemplateDraft] = useState<Pick<ReportTemplate, 'name' | 'description' | 'cadence' | 'reviewerLabel'>>({ name: '', description: '', cadence: 'monthly', reviewerLabel: '' });
  const [showImportWizard, setShowImportWizard] = useState(false);
  const [analyticsView, setAnalyticsView] = useState<'task' | 'labor'>('task');

  const taskMap = useMemo(() => new Map(tasks.map((task) => [task.id, task])), [tasks]);
  const selectedTask = selectedTaskId ? taskMap.get(selectedTaskId) ?? null : null;
  const hasProjects = projects.length > 0;

  useEffect(() => {
    setProjectDraft((current) => ({
      ...current,
      ownerName: current.ownerName || users[0]?.name || ''
    }));
    setDraft((current) => ({
      ...buildEmptyTaskDraft(projects, users),
      ...current,
      projectId: current.projectId || projects[0]?.id || '',
      ownerId: current.ownerId || users[0]?.id || '',
      reviewerId: current.reviewerId || users[1]?.id || users[0]?.id || '',
      backupOwnerId: current.backupOwnerId || users[2]?.id || users[0]?.id || ''
    }));
  }, [projects, users]);

  const filteredTasks = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return tasks.filter((task) => {
      const projectName = projects.find((project) => project.id === task.projectId)?.name.toLowerCase() ?? '';
      const matchesQuery = query.length === 0 || task.title.toLowerCase().includes(query) || task.tags.some((tag) => tag.toLowerCase().includes(query)) || projectName.includes(query);
      if (!matchesQuery) return false;
      switch (activeFilter) {
        case 'my_work': return task.ownerId === 'u1';
        case 'due_today': return task.dueAt?.startsWith('2026-04-07') ?? false;
        case 'blocked': return task.status === 'blocked';
        case 'recurring': return task.type === 'report' || task.type === 'recurring';
        case 'watching': return task.watcherIds.includes('u1');
        default: return true;
      }
    });
  }, [activeFilter, projects, searchQuery, tasks]);

  const blockedTasks = useMemo(() => tasks.filter((task) => task.status === 'blocked' || task.blocker), [tasks]);
  const projectSummaries = useMemo<ProjectSummary[]>(() => projects.map((project) => {
    const projectTasks = tasks.filter((task) => task.projectId === project.id);
    return {
      project,
      taskCount: projectTasks.length,
      openCount: projectTasks.filter((task) => !['done', 'archived'].includes(task.status)).length,
      blockedCount: projectTasks.filter((task) => task.status === 'blocked' || task.blocker).length,
      avgProgress: projectTasks.length > 0 ? Math.round(projectTasks.reduce((sum, task) => sum + task.progress, 0) / projectTasks.length) : 0,
      loggedHours: Number(projectTasks.reduce((sum, task) => sum + task.loggedHours, 0).toFixed(1)),
      ownerName: users.find((user) => user.id === project.ownerId)?.name ?? project.ownerLabel ?? 'Unassigned',
      tasks: projectTasks
    };
  }), [projects, tasks, users]);
  const teamSummaries = useMemo<TeamSummary[]>(() => users.map((user) => {
    const userTasks = tasks.filter((task) => task.ownerId === user.id);
    const estimatedHours = userTasks.reduce((sum, task) => sum + (task.estimateHours ?? 0), 0);
    const capacity = user.capacityHoursPerWeek ?? 1;
    return {
      user,
      openCount: userTasks.filter((task) => !['done', 'archived'].includes(task.status)).length,
      blockedCount: userTasks.filter((task) => task.status === 'blocked' || task.blocker).length,
      overdueCount: userTasks.filter((task) => Boolean(task.dueAt) && new Date(task.dueAt ?? '').getTime() < new Date('2026-04-07T12:00:00.000Z').getTime() && task.status !== 'done').length,
      reviewCount: userTasks.filter((task) => task.status === 'review').length,
      loggedHours: Number(userTasks.reduce((sum, task) => sum + task.loggedHours, 0).toFixed(1)),
      utilization: Math.min(200, Math.round((estimatedHours / capacity) * 100)),
      tasks: userTasks
    };
  }), [tasks, users]);
  const settingsSummary = useMemo<SettingsSummary>(() => ({
    activeAutomations: automationRules.filter((rule) => rule.status === 'active').length,
    taskTemplateCount: taskTemplates.length,
    reportTemplateCount: reportTemplates.length,
    escalationRules: automationRules.filter((rule) => rule.action === 'escalate').length,
    notificationRules: automationRules.filter((rule) => rule.action === 'notify_owner').length
  }), [automationRules, reportTemplates.length, taskTemplates.length]);

  const analyticsSummary = useMemo<AnalyticsSummary>(() => {
    const completedCount = tasks.filter((task) => task.status === 'done').length;
    const busiestMember = teamSummaries.slice().sort((left, right) => right.utilization - left.utilization)[0];
    return {
      completionRate: tasks.length > 0 ? Math.round((completedCount / tasks.length) * 100) : 0,
      overdueCount: tasks.filter((task) => Boolean(task.dueAt) && new Date(task.dueAt ?? '').getTime() < new Date('2026-04-07T12:00:00.000Z').getTime() && task.status !== 'done').length,
      blockedCount: blockedTasks.length,
      reportVolume: reports.length,
      avgProgress: tasks.length > 0 ? Math.round(tasks.reduce((sum, task) => sum + task.progress, 0) / tasks.length) : 0,
      totalLoggedHours: Number(tasks.reduce((sum, task) => sum + task.loggedHours, 0).toFixed(1)),
      activeProjects: projectSummaries.filter((project) => project.project.status === 'active').length,
      busiestTeamMember: busiestMember?.user.name ?? 'No team data',
      busiestTeamLoad: busiestMember?.utilization ?? 0
    };
  }, [blockedTasks.length, projectSummaries, reports.length, tasks, teamSummaries]);

  const selectedProject = projects.find((project) => project.id === selectedProjectId) ?? projects[0] ?? null;
  const selectedProjectPhases = useMemo<ProjectPhase[]>(
    () => projectPhases.filter((phase) => phase.projectId === selectedProject?.id),
    [projectPhases, selectedProject?.id]
  );
  useEffect(() => {
    if (!selectedProject) {
      setSelectedProjectPhaseId(null);
      return;
    }
    if (selectedProjectPhases.length === 0) {
      setSelectedProjectPhaseId(null);
      return;
    }
    if (!selectedProjectPhases.some((phase) => phase.id === selectedProjectPhaseId)) {
      setSelectedProjectPhaseId(selectedProjectPhases[0].id);
    }
  }, [selectedProject, selectedProjectPhaseId, selectedProjectPhases]);
  const selectedProjectTasks = useMemo<Task[]>(
    () => tasks.filter((task) => task.projectId === selectedProject?.id),
    [selectedProject?.id, tasks]
  );
  const selectedProjectSummary = projectSummaries.find((summary) => summary.project.id === selectedProjectId) ?? projectSummaries[0] ?? null;
  const selectedTeamSummary = teamSummaries.find((summary) => summary.user.id === selectedUserId) ?? teamSummaries[0] ?? null;
  const selectedReportRecord = reports.find((report) => report.id === selectedReportId) ?? reports[0] ?? null;
  const timelineGroups = useMemo(() => {
    const today = startOfDay(REFERENCE_NOW);
    const endOfWeek = new Date(today);
    endOfWeek.setDate(today.getDate() + 6);

    const groups: Array<{ id: string; label: string; tasks: Task[] }> = [
      { id: 'overdue', label: 'Overdue', tasks: [] },
      { id: 'today', label: 'Today', tasks: [] },
      { id: 'week', label: 'This Week', tasks: [] },
      { id: 'later', label: 'Later', tasks: [] },
      { id: 'no_due', label: 'No Due Date', tasks: [] }
    ];

    [...filteredTasks]
      .sort((left, right) => {
        const leftTime = left.dueAt ? new Date(left.dueAt).getTime() : Number.MAX_SAFE_INTEGER;
        const rightTime = right.dueAt ? new Date(right.dueAt).getTime() : Number.MAX_SAFE_INTEGER;
        return leftTime - rightTime;
      })
      .forEach((task: Task) => {
        if (!task.dueAt) {
          groups[4].tasks.push(task);
          return;
        }

        const dueDate = startOfDay(new Date(task.dueAt));
        if (dueDate.getTime() < today.getTime() && task.status !== 'done') {
          groups[0].tasks.push(task);
        } else if (isSameDay(dueDate, today)) {
          groups[1].tasks.push(task);
        } else if (dueDate.getTime() <= endOfWeek.getTime()) {
          groups[2].tasks.push(task);
        } else {
          groups[3].tasks.push(task);
        }
      });

    return groups.filter((group) => group.tasks.length > 0);
  }, [filteredTasks]);

  const calendarDays = useMemo(() => {
    const datedTasks = filteredTasks.filter((task) => task.dueAt);
    const anchor = datedTasks.length > 0 ? new Date(datedTasks[0].dueAt as string) : REFERENCE_NOW;
    const monthStart = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
    const monthEnd = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0);
    const gridStart = new Date(monthStart);
    gridStart.setDate(monthStart.getDate() - monthStart.getDay());
    const gridEnd = new Date(monthEnd);
    gridEnd.setDate(monthEnd.getDate() + (6 - monthEnd.getDay()));

    const days: Array<{ date: Date; inMonth: boolean; tasks: Task[] }> = [];
    const cursor = new Date(gridStart);

    while (cursor.getTime() <= gridEnd.getTime()) {
      const cellDate = new Date(cursor);
      days.push({
        date: cellDate,
        inMonth: cellDate.getMonth() === anchor.getMonth(),
        tasks: datedTasks.filter((task) => isSameDay(new Date(task.dueAt as string), cellDate))
      });
      cursor.setDate(cursor.getDate() + 1);
    }

    return {
      label: formatMonthLabel(anchor),
      days
    };
  }, [filteredTasks]);

  const boardColumns: TaskStatus[] = ['backlog', 'ready', 'in_progress', 'review', 'blocked', 'done'];
  const onboardingStep = onboardingSteps[onboardingStepIndex];
  const onboardingProgress = ((onboardingStepIndex + 1) / onboardingSteps.length) * 100;

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const hasCompletedOnboarding = window.localStorage.getItem(ONBOARDING_STORAGE_KEY) === 'true';
    if (!hasCompletedOnboarding) {
      setIsOnboardingOpen(true);
    }
  }, []);

  useEffect(() => {
    if (!isOnboardingOpen) return;
    const step = onboardingSteps[onboardingStepIndex];
    setActiveSection(step.section);
    if (step.section === 'tasks' && step.view) {
      setActiveView(step.view);
    }
    if (step.section === 'tasks' && step.filter) {
      setActiveFilter(step.filter);
    }
    if (tasks.length > 0 && !selectedTaskId) {
      setSelectedTaskId(tasks[0].id);
    }
  }, [isOnboardingOpen, onboardingStepIndex, selectedTaskId, setActiveFilter, setActiveSection, setActiveView, setSelectedTaskId, tasks]);

  const handleDraftChange = <K extends keyof NewTaskDraft>(key: K, value: NewTaskDraft[K]) => setDraft((current) => ({ ...current, [key]: value }));
  const handleOpenTask = (taskId: string) => { setSelectedTaskId(taskId); setActiveSection('tasks'); };

  const handleCreateTask = () => {
    const title = draft.title.trim();
    if (!title || !hasProjects || !draft.projectId || !draft.ownerId) return;
    addTask({ id: `t${Date.now()}`, type: draft.type, title, description: draft.description.trim() || undefined, status: draft.status, priority: draft.priority, projectId: draft.projectId || undefined, ownerId: draft.ownerId, reviewerId: draft.reviewerId || undefined, backupOwnerId: draft.backupOwnerId || undefined, watcherIds: draft.reviewerId ? [draft.reviewerId] : [], tags: draft.tags.split(',').map((tag) => tag.trim()).filter(Boolean), startAt: draft.startAt ? new Date(draft.startAt).toISOString() : undefined, dueAt: draft.endAt ? new Date(draft.endAt).toISOString() : undefined, estimateHours: Number(draft.estimateHours) || undefined, loggedHours: 0, progress: 0, recurrence: draft.recurrence || undefined, dependencyIds: [], subtasks: [], blocker: null, sla: { enabled: false }, attachmentIds: [], workLogIds: [], activityIds: [] });
    setDraft(buildEmptyTaskDraft(projects, users));
    setIsCreateOpen(false);
  };

  const handleCreateProject = () => {
    const name = projectDraft.name.trim();
    const owner = findUserByName(users, projectDraft.ownerName);
    if (!name) return;

    const projectId = `p${Date.now()}`;
    const nextProject: Project = {
      id: projectId,
      name,
      subtitle: projectDraft.subtitle.trim() || undefined,
      description: projectDraft.description.trim() || undefined,
      type: projectDraft.type,
      status: 'active',
      ownerId: owner?.id,
      ownerLabel: projectDraft.ownerName.trim() || owner?.name || undefined,
      teamMemberIds: owner?.id ? [owner.id] : [],
      totalWeeks: Number(projectDraft.totalWeeks) || undefined
    };

    addProject(nextProject);
    setProjectDraft({
      ...emptyProjectDraft,
      ownerName: users[0]?.name ?? ''
    });
    setDraft(buildEmptyTaskDraft([nextProject, ...projects], users));
    setIsCreateProjectOpen(false);
  };

  const handleAddTeamMember = () => {
    const name = teamMemberDraft.name.trim();
    const team = teamMemberDraft.team.trim();
    if (!name || !team) return;

    addUser({
      id: `u${Date.now()}`,
      name,
      role: teamMemberDraft.role,
      team,
      capacityHoursPerWeek: Number(teamMemberDraft.capacityHoursPerWeek) || undefined
    });
    setTeamMemberDraft(emptyTeamMemberDraft);
  };

  const handleDeleteTeamMember = (userId: string) => {
    deleteUser(userId);
  };

  const handleAddAutomationRule = () => {
    if (!ruleDraft.name.trim()) return;
    addAutomationRule({ id: `rule_${Date.now()}`, name: ruleDraft.name.trim(), description: ruleDraft.description.trim() || 'No description added yet.', trigger: ruleDraft.trigger, action: ruleDraft.action, status: 'draft' });
    setRuleDraft({ name: '', description: '', trigger: 'task_overdue', action: 'notify_owner' });
  };
  const handleAddTaskTemplate = () => {
    if (!taskTemplateDraft.name.trim()) return;
    addTaskTemplate({ id: `task_tpl_${Date.now()}`, name: taskTemplateDraft.name.trim(), description: taskTemplateDraft.description.trim() || 'No description added yet.', type: taskTemplateDraft.type, priority: taskTemplateDraft.priority, defaultEstimateHours: Number(taskTemplateDraft.defaultEstimateHours) || 1 });
    setTaskTemplateDraft({ name: '', description: '', type: 'standard', priority: 'P2', defaultEstimateHours: 2 });
  };
  const handleAddReportTemplate = () => {
    if (!reportTemplateDraft.name.trim()) return;
    addReportTemplate({ id: `report_tpl_${Date.now()}`, name: reportTemplateDraft.name.trim(), description: reportTemplateDraft.description.trim() || 'No description added yet.', cadence: reportTemplateDraft.cadence, reviewerLabel: reportTemplateDraft.reviewerLabel.trim() || 'Unassigned reviewer' });
    setReportTemplateDraft({ name: '', description: '', cadence: 'monthly', reviewerLabel: '' });
  };

  const openOnboarding = () => {
    setOnboardingStepIndex(0);
    setIsOnboardingOpen(true);
  };

  const closeOnboarding = (markComplete = false) => {
    if (typeof window !== 'undefined' && markComplete) {
      window.localStorage.setItem(ONBOARDING_STORAGE_KEY, 'true');
    }
    setIsOnboardingOpen(false);
  };

  const handleNextOnboardingStep = () => {
    if (onboardingStepIndex === onboardingSteps.length - 1) {
      closeOnboarding(true);
      return;
    }
    setOnboardingStepIndex((current) => current + 1);
  };

  const handlePreviousOnboardingStep = () => {
    setOnboardingStepIndex((current) => Math.max(0, current - 1));
  };
  return (
    <div className="shell">
      <header className="topbar">
        <div className="brand"><div className="brand-dot" /><div><div className="brand-name">Task Manager</div><div className="brand-meta">Start blank, structure projects, and execute work clearly.</div></div></div>
        <div className="topbar-nav">
          <button className={activeSection === 'tasks' ? 'is-active' : ''} onClick={() => setActiveSection('tasks')}>Tasks</button>
          <button className={activeSection === 'projects' ? 'is-active' : ''} onClick={() => setActiveSection('projects')}>Projects</button>
          <button className={activeSection === 'team' ? 'is-active' : ''} onClick={() => setActiveSection('team')}>Team</button>
          <button className={activeSection === 'reports' ? 'is-active' : ''} onClick={() => setActiveSection('reports')}>Reports</button>
          <button className={activeSection === 'analytics' ? 'is-active' : ''} onClick={() => setActiveSection('analytics')}>Analytics</button>
          <button className={activeSection === 'settings' ? 'is-active' : ''} onClick={() => setActiveSection('settings')}>Settings</button>
          <button className={activeSection === 'blocked' ? 'is-active' : ''} onClick={() => setActiveSection('blocked')}>Blocked</button>
        </div>
        <div className="searchbox"><Search size={15} /><input value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="Search tasks, tags, projects, or owners..." /></div>
        <div className="topbar-actions"><button className="ghost-button walkthrough-trigger" onClick={openOnboarding}><BookOpen size={16} />Walkthrough</button><button className="ghost-button" onClick={() => setIsCreateProjectOpen(true)}><FolderKanban size={16} />Create Project</button><button className="primary-button" onClick={() => setIsCreateOpen(true)} disabled={!hasProjects}><Plus size={16} />New Task</button></div>
      </header>

      <div className="page-header">
        <div>
          <h1>{activeSection === 'tasks' ? 'Tasks' : activeSection === 'projects' ? 'Task Manager' : activeSection === 'team' ? 'Team' : activeSection === 'reports' ? 'Reports' : activeSection === 'analytics' ? 'Analytics' : activeSection === 'settings' ? 'Settings & Automations' : 'Blocked Command Center'}</h1>
          <p>{activeSection === 'tasks' ? 'Track active work, update progress, and move execution forward.' : activeSection === 'projects' ? 'Start empty, add phases, and plan work through WBS, Gantt, Cadence, Daily Board, and Summary.' : activeSection === 'team' ? 'Monitor ownership, workload, and delivery pressure across the team.' : activeSection === 'reports' ? 'Manage recurring deliverables and keep reporting work on schedule.' : activeSection === 'analytics' ? 'Review completion, overdue work, blockers, and operational performance.' : activeSection === 'settings' ? 'Shape how TaskOps runs with templates, automations, and routing rules.' : 'Resolve stuck work quickly and keep delivery moving.'}</p>
        </div>
        {activeSection === 'tasks' ? <div className="view-switcher">{[{ id: 'list', label: 'List', icon: <ListTodo size={14} /> }, { id: 'board', label: 'Board', icon: <LayoutGrid size={14} /> }, { id: 'timeline', label: 'Timeline', icon: <TimerReset size={14} /> }, { id: 'calendar', label: 'Calendar', icon: <CalendarDays size={14} /> }].map((view) => <button key={view.id} className={activeView === view.id ? 'is-active' : ''} onClick={() => setActiveView(view.id as typeof activeView)}>{view.icon}{view.label}</button>)}</div> : <div className="blocked-metrics"><div className="metric-box"><strong>{activeSection === 'analytics' ? `${analyticsSummary.completionRate}%` : activeSection === 'settings' ? settingsSummary.activeAutomations : activeSection === 'reports' ? reports.length : activeSection === 'projects' ? projects.length : activeSection === 'team' ? teamSummaries.length : blockedTasks.length}</strong><span>{activeSection === 'analytics' ? 'completion rate' : activeSection === 'settings' ? 'active automations' : activeSection === 'reports' ? 'report records' : activeSection === 'projects' ? 'project shells' : activeSection === 'team' ? 'team members' : 'blocked tasks'}</span></div><div className="metric-box"><strong>{activeSection === 'analytics' ? analyticsSummary.overdueCount : activeSection === 'settings' ? taskTemplates.length + reportTemplates.length : activeSection === 'reports' ? reports.filter((report) => report.status === 'changes_requested' || report.status === 'rejected').length : activeSection === 'projects' ? selectedProjectPhases.length : activeSection === 'team' ? teamSummaries.reduce((sum, member) => sum + member.blockedCount, 0) : blockedTasks.filter((task) => task.priority === 'P1').length}</strong><span>{activeSection === 'analytics' ? 'overdue tasks' : activeSection === 'settings' ? 'templates' : activeSection === 'reports' ? 'needs attention' : activeSection === 'projects' ? 'selected phases' : activeSection === 'team' ? 'blocked owned' : 'P1 blocked'}</span></div></div>}
      </div>

      {activeSection === 'tasks' ? <div className="chip-row">{[['all', 'All'], ['my_work', 'My Work'], ['due_today', 'Due Today'], ['blocked', 'Blocked'], ['recurring', 'Recurring'], ['watching', 'Watching']].map(([id, label]) => <button key={id} className={activeFilter === id ? 'chip is-active' : 'chip'} onClick={() => setActiveFilter(id as typeof activeFilter)}>{label}</button>)}</div> : null}

      <div className="workspace">
        <aside className="sidebar">
          {activeSection === 'tasks' ? <><div className="sidebar-section"><div className="sidebar-title">Quick Start</div><div className="quick-start-card"><p>Start here to keep work current and visible.</p><ol className="quick-start-list"><li>Review <strong>My Work</strong> and <strong>Due Today</strong>.</li><li>Open each task and update status as work moves.</li><li>Add a work log when progress or context matters.</li><li>Mark blockers immediately so leads can intervene.</li></ol><button className="quick-start-button" onClick={openOnboarding}><BookOpen size={14} />Open full walkthrough</button></div></div><div className="sidebar-section"><div className="sidebar-title">Saved Views</div><button className={activeFilter === 'my_work' ? 'sidebar-item is-active' : 'sidebar-item'} onClick={() => setActiveFilter('my_work')}><ListTodo size={14} />My Tasks</button><button className={activeFilter === 'due_today' ? 'sidebar-item is-active' : 'sidebar-item'} onClick={() => setActiveFilter('due_today')}><Clock3 size={14} />Due Today</button><button className={activeFilter === 'blocked' ? 'sidebar-item is-active' : 'sidebar-item'} onClick={() => setActiveFilter('blocked')}><AlertTriangle size={14} />Blocked</button></div><div className="sidebar-section"><div className="sidebar-title">Projects</div>{projects.length > 0 ? projects.map((project) => <button key={project.id} className="sidebar-item" onClick={() => { setSelectedProjectId(project.id); setActiveSection('projects'); }}><FolderKanban size={14} /><span>{project.name}</span></button>) : <div className="sidebar-item static"><span>No projects yet. Create one to begin.</span></div>}</div></> : activeSection === 'projects' ? <><div className="sidebar-section"><div className="sidebar-title">Project Shells</div>{projects.length > 0 ? projects.map((project) => <button key={project.id} className={selectedProject?.id === project.id ? 'sidebar-item is-active' : 'sidebar-item'} onClick={() => setSelectedProjectId(project.id)}><FolderKanban size={14} /><span>{project.name}</span></button>) : <div className="sidebar-item static"><span>No projects created yet.</span></div>}</div><div className="sidebar-section"><div className="sidebar-title">Phases</div>{selectedProjectPhases.length > 0 ? <><button className={selectedProjectPhaseId === null ? 'sidebar-item is-active' : 'sidebar-item'} onClick={() => setSelectedProjectPhaseId(null)}><span>All phases</span></button>{selectedProjectPhases.map((phase) => <button key={phase.id} className={selectedProjectPhaseId === phase.id ? 'sidebar-item is-active' : 'sidebar-item'} onClick={() => setSelectedProjectPhaseId(phase.id)}><span>{phase.name}</span><small>{`W${phase.startWeek}-W${phase.endWeek}`}</small></button>)}</> : <div className="sidebar-item static"><span>No phases yet. Add one from the workbench.</span></div>}</div><div className="sidebar-section"><div className="sidebar-title">Project Actions</div><div className="sidebar-item static"><span>{selectedProject ? `${selectedProjectTasks.length} project tasks` : 'Select a project shell'}</span></div><div className="sidebar-item static"><span>{selectedProject?.ownerLabel ?? selectedProjectSummary?.ownerName ?? 'No owner label yet'}</span></div></div></> : activeSection === 'team' ? <div className="sidebar-section"><div className="sidebar-title">Team Members</div>{teamSummaries.length > 0 ? teamSummaries.map((summary) => <button key={summary.user.id} className={selectedTeamSummary?.user.id === summary.user.id ? 'sidebar-item is-active' : 'sidebar-item'} onClick={() => setSelectedUserId(summary.user.id)}><Users size={14} /><span>{summary.user.name}</span></button>) : <div className="sidebar-item static"><span>No team members yet. Add one in the main panel.</span></div>}</div> : activeSection === 'reports' ? <><div className="sidebar-section"><div className="sidebar-title">Report Status</div><div className="sidebar-item static"><span>{reports.filter((report) => report.status === 'draft').length} drafts in progress</span></div><div className="sidebar-item static"><span>{reports.filter((report) => report.status === 'submitted').length} awaiting review</span></div><div className="sidebar-item static"><span>{reports.filter((report) => report.status === 'approved').length} approved reports</span></div></div><div className="sidebar-section"><div className="sidebar-title">Recent Reports</div>{reports.slice(0, 5).map((report) => <button key={report.id} className={selectedReportRecord?.id === report.id ? 'sidebar-item is-active' : 'sidebar-item'} onClick={() => setSelectedReportId(report.id)}><FileText size={14} /><span>{report.title}</span></button>)}</div></> : activeSection === 'analytics' ? <><div className="sidebar-section"><div className="sidebar-title">Outcome</div><div className="sidebar-item static"><span>{analyticsSummary.completionRate}% completion rate</span></div><div className="sidebar-item static"><span>{analyticsSummary.avgProgress}% average progress</span></div></div><div className="sidebar-section"><div className="sidebar-title">Load</div><div className="sidebar-item static"><span>{analyticsSummary.busiestTeamMember} at {analyticsSummary.busiestTeamLoad}% utilization</span></div></div></> : activeSection === 'settings' ? <><div className="sidebar-section"><div className="sidebar-title">Templates</div><div className="sidebar-item static"><span>{taskTemplates.length} task templates</span></div><div className="sidebar-item static"><span>{reportTemplates.length} report templates</span></div></div><div className="sidebar-section"><div className="sidebar-title">Automation Health</div><div className="sidebar-item static"><span>{settingsSummary.activeAutomations} active rules</span></div><div className="sidebar-item static"><span>{automationRules.length - settingsSummary.activeAutomations} drafts</span></div></div></> : <div className="sidebar-section"><div className="sidebar-title">Escalation Views</div><div className="sidebar-item static"><AlertTriangle size={14} /><span>All blockers</span></div></div>}
        </aside>

        <main className="content">
          {selectedTaskIds.length > 0 && activeSection === 'tasks' ? <div className="bulk-bar"><span>{selectedTaskIds.length} selected</span><div><button>Reassign</button><button>Export</button><button>Archive</button></div></div> : null}
          {activeSection === 'tasks' && !hasProjects ? <section className="placeholder-panel"><FolderKanban size={18} /><h2>Create your first project</h2><p>Task Manager starts empty on purpose. Create a project first, then add tasks inside it.</p><button className="primary-button" onClick={() => setIsCreateProjectOpen(true)}><Plus size={16} />Create Project</button></section> : null}
          {activeSection === 'tasks' && hasProjects && activeView === 'list' ? <section className="panel"><div className="table-head"><span /><span>Task</span><span>Status</span><span>Priority</span><span>Owner</span><span>Due</span><span>Progress</span></div>{filteredTasks.length > 0 ? filteredTasks.map((task) => { const owner = users.find((user) => user.id === task.ownerId); return <button key={task.id} className={selectedTaskId === task.id ? 'table-row is-selected' : 'table-row'} onClick={() => setSelectedTaskId(task.id)}><span className={selectedTaskIds.includes(task.id) ? 'select-box is-selected' : 'select-box'} onClick={(event) => { event.stopPropagation(); toggleTaskSelection(task.id); }} /><span className="task-cell"><strong>{task.title}</strong><small>{task.tags.join(' · ')}</small></span><span><TaskStatusBadge status={task.status} /></span><span><TaskPriorityBadge priority={task.priority} /></span><span>{owner?.name ?? 'Unassigned'}</span><span>{task.dueAt ? formatDateTimeLabel(new Date(task.dueAt)) : 'No due date'}</span><span>{task.progress}%</span></button>; }) : <div className="placeholder-panel inset"><ListTodo size={18} /><h2>No tasks yet</h2><p>Create the first task for this project to start managing real work.</p><button className="primary-button" onClick={() => setIsCreateOpen(true)}><Plus size={16} />Create Task</button></div>}</section> : null}
          {activeSection === 'tasks' && hasProjects && activeView === 'board' ? <section className="kanban">{boardColumns.map((column) => <div key={column} className="kanban-column"><div className="kanban-header"><span>{statusLabel[column]}</span><span>{filteredTasks.filter((task) => task.status === column).length}</span></div>{filteredTasks.filter((task) => task.status === column).map((task) => <button key={task.id} className="kanban-card" onClick={() => setSelectedTaskId(task.id)}><div className="kanban-card-head"><TaskPriorityBadge priority={task.priority} /><span>{task.progress}%</span></div><strong>{task.title}</strong><small>{projects.find((project) => project.id === task.projectId)?.name}</small></button>)}</div>)}</section> : null}
          {activeSection === 'tasks' && hasProjects && activeView === 'timeline' ? <section className="timeline-board">{timelineGroups.length > 0 ? timelineGroups.map((group) => <div key={group.id} className="timeline-group"><div className="timeline-group-head"><h3>{group.label}</h3><span>{group.tasks.length}</span></div><div className="timeline-list">{group.tasks.map((task) => <button key={task.id} className={selectedTaskId === task.id ? 'timeline-card is-selected' : 'timeline-card'} onClick={() => setSelectedTaskId(task.id)}><div className="timeline-card-head"><TaskPriorityBadge priority={task.priority} /><TaskStatusBadge status={task.status} /></div><strong>{task.title}</strong><small>{projects.find((project) => project.id === task.projectId)?.name ?? 'No project'} · {users.find((user) => user.id === task.ownerId)?.name ?? 'Unassigned'}</small><div className="timeline-card-meta"><span>{task.dueAt ? formatDayLabel(new Date(task.dueAt)) : 'No due date'}</span><span>{task.progress}%</span></div></button>)}</div></div>) : <section className="placeholder-panel"><Clock3 size={18} /><h2>No scheduled tasks yet</h2><p>No tasks match this view yet. Add a due date or adjust your filters to populate the timeline.</p></section>}</section> : null}
          {activeSection === 'tasks' && hasProjects && activeView === 'calendar' ? <section className="calendar-board"><div className="calendar-header"><h2>{calendarDays.label}</h2><p>Use the calendar to see due-date pressure across the shared task model.</p></div><div className="calendar-grid calendar-weekdays">{['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map((day) => <span key={day}>{day}</span>)}</div><div className="calendar-grid">{calendarDays.days.map((day) => <div key={day.date.toISOString()} className={day.inMonth ? 'calendar-cell' : 'calendar-cell is-muted'}><div className="calendar-cell-head"><span>{day.date.getDate()}</span>{isSameDay(day.date, REFERENCE_NOW) ? <span className="calendar-today">Today</span> : null}</div><div className="calendar-cell-list">{day.tasks.slice(0, 3).map((task) => <button key={task.id} className={selectedTaskId === task.id ? 'calendar-task is-selected' : 'calendar-task'} onClick={() => setSelectedTaskId(task.id)}>{task.title}</button>)}{day.tasks.length > 3 ? <span className="calendar-overflow">+{day.tasks.length - 3} more</span> : null}</div></div>)}</div></section> : null}
          {activeSection === 'projects' ? <ProjectWorkbench project={selectedProject} phases={selectedProjectPhases} tasks={selectedProjectPhaseId ? selectedProjectTasks.filter((task) => task.projectPhaseId === selectedProjectPhaseId) : selectedProjectTasks} users={users} selectedPhaseId={selectedProjectPhaseId} onSelectPhase={setSelectedProjectPhaseId} onCreateProject={() => setIsCreateProjectOpen(true)} onAddPhase={addProjectPhase} onUpdateProject={updateProject} onAddTask={addTask} onOpenTask={handleOpenTask} /> : null}
          {activeSection === 'team' ? <section className="team-grid"><div className="settings-card"><div className="flex items-center justify-between mb-4"><h3>Team Member Database</h3><button className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm" onClick={() => setShowImportWizard(true)}><Upload size={14} />Import Agricultural Roles</button></div><p>Create the owner list here first. Project owners now come from this saved team-member dataset.</p><div className="settings-form-grid"><label className="settings-field"><span>Name</span><input value={teamMemberDraft.name} onChange={(event) => setTeamMemberDraft((current) => ({ ...current, name: event.target.value }))} placeholder="Full name" /></label><label className="settings-field"><span>Role</span><select value={teamMemberDraft.role} onChange={(event) => setTeamMemberDraft((current) => ({ ...current, role: event.target.value as UserRole }))}><option value="member">Member</option><option value="manager">Manager</option><option value="admin">Admin</option><option value="guest">Guest</option></select></label><label className="settings-field"><span>Team</span><input value={teamMemberDraft.team} onChange={(event) => setTeamMemberDraft((current) => ({ ...current, team: event.target.value }))} placeholder="Operations, Delivery, Reporting..." /></label><label className="settings-field"><span>Capacity / Week</span><input type="number" min="1" value={teamMemberDraft.capacityHoursPerWeek} onChange={(event) => setTeamMemberDraft((current) => ({ ...current, capacityHoursPerWeek: event.target.value }))} placeholder="40" /></label></div><div className="settings-actions"><button className="primary-button" onClick={handleAddTeamMember}>Add Team Member</button></div></div>{teamSummaries.length > 0 ? teamSummaries.map((summary) => {
            const agriRole = summary.user.agriculturalRole;
            return (
              <button key={summary.user.id} className={selectedTeamSummary?.user.id === summary.user.id ? 'team-card is-selected' : 'team-card'} onClick={() => setSelectedUserId(summary.user.id)}>
                <div className="team-card-head">
                  <div>
                    <h3>{summary.user.name}</h3>
                    <p>{summary.user.role} · {summary.user.team}</p>
                    {agriRole && (
                      <div className="mt-2 space-y-1">
                        <div className="flex items-center gap-2 text-sm">
                          <span className="text-lg">{categoryIcons[agriRole.category]}</span>
                          <span className="font-medium text-gray-700">{categoryLabels[agriRole.category]}</span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-semibold">
                            {formatCurrency(agriRole.hourlyRate)}/hr
                          </span>
                          <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs font-semibold">
                            {formatCurrency(agriRole.totalCostToEmployer)}/mo
                          </span>
                          <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded text-xs capitalize">
                            {agriRole.engagementType.replace('_', ' ')}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          {agriRole.statutoryCompliance.uifRegistered && (
                            <span className="text-xs text-green-600" title="UIF Registered">✓ UIF</span>
                          )}
                          <span className="text-xs text-gray-500" title={agriRole.statutoryCompliance.contractType}>
                            {agriRole.statutoryCompliance.contractType.replace(/_/g, ' ')}
                          </span>
                          {agriRole.statutoryCompliance.overtimeEligible && (
                            <span className="text-xs text-amber-600" title="Overtime Eligible">OT Eligible</span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                  <span className={`status-badge ${summary.utilization >= 90 ? 'status-red' : summary.utilization >= 70 ? 'status-amber' : 'status-green'}`}>{summary.utilization}% load</span>
                </div>
                <div className="project-metrics-grid team-compact">
                  <div className="project-metric"><strong>{summary.openCount}</strong><span>Open</span></div>
                  <div className="project-metric"><strong>{summary.blockedCount}</strong><span>Blocked</span></div>
                  <div className="project-metric"><strong>{summary.overdueCount}</strong><span>Overdue</span></div>
                  <div className="project-metric"><strong>{summary.loggedHours.toFixed(1)}h</strong><span>Logged</span></div>
                </div>
              </button>
            );
          }) : <div className="placeholder-panel"><Users size={18} /><h2>No team members yet</h2><p>Add the first team member here. The Create Project modal will stay owner-driven from this list only.</p></div>}</section> : null}

          {showImportWizard && <HrImportWizard onClose={() => setShowImportWizard(false)} onComplete={() => setShowImportWizard(false)} />}
          {activeSection === 'reports' ? <ReportsModule /> : null}
          {activeSection === 'analytics' ? <section className="space-y-4"><div className="flex items-center gap-2 mb-4"><button className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${analyticsView === 'task' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`} onClick={() => setAnalyticsView('task')}>Task Analytics</button><button className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${analyticsView === 'labor' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`} onClick={() => setAnalyticsView('labor')}>Labor Cost Analytics</button></div>{analyticsView === 'task' ? <div className="analytics-grid"><div className="analytics-card analytics-kpis"><div className="project-metrics-grid analytics-compact"><div className="project-metric"><strong>{analyticsSummary.completionRate}%</strong><span>Completion</span></div><div className="project-metric"><strong>{analyticsSummary.overdueCount}</strong><span>Overdue</span></div><div className="project-metric"><strong>{analyticsSummary.blockedCount}</strong><span>Blocked</span></div><div className="project-metric"><strong>{analyticsSummary.reportVolume}</strong><span>Reports</span></div></div></div><div className="analytics-card"><div className="analytics-card-head"><h3>Project Performance</h3><span>{analyticsSummary.activeProjects} active projects</span></div><div className="analytics-list">{projectSummaries.slice(0, 4).map((summary) => <div key={summary.project.id} className="analytics-list-row"><div><strong>{summary.project.name}</strong><small>{summary.openCount} open · {summary.blockedCount} blocked · {summary.avgProgress}% progress</small></div><span>{summary.loggedHours}h</span></div>)}</div></div><div className="analytics-card"><div className="analytics-card-head"><h3>Team Load</h3><span>{analyticsSummary.busiestTeamMember}</span></div><div className="analytics-list">{teamSummaries.slice(0, 4).map((summary) => <div key={summary.user.id} className="analytics-list-row"><div><strong>{summary.user.name}</strong><small>{summary.openCount} open · {summary.blockedCount} blocked · {summary.overdueCount} overdue</small></div><span>{summary.utilization}%</span></div>)}</div></div></div> : <LaborCostAnalytics />}</section> : null}
          {activeSection === 'settings' ? <section className="settings-grid"><div className="settings-card settings-kpis"><div className="project-metrics-grid settings-compact"><div className="project-metric"><strong>{settingsSummary.activeAutomations}</strong><span>Active automations</span></div><div className="project-metric"><strong>{settingsSummary.taskTemplateCount}</strong><span>Task templates</span></div><div className="project-metric"><strong>{settingsSummary.reportTemplateCount}</strong><span>Report templates</span></div><div className="project-metric"><strong>{settingsSummary.escalationRules}</strong><span>Escalation rules</span></div></div></div><div className="settings-card"><h3>Automation Rules</h3><div className="settings-form-grid"><label className="settings-field settings-field-full"><span>Name</span><input value={ruleDraft.name} onChange={(event) => setRuleDraft((current) => ({ ...current, name: event.target.value }))} placeholder="New automation rule" /></label><label className="settings-field settings-field-full"><span>Description</span><textarea value={ruleDraft.description} onChange={(event) => setRuleDraft((current) => ({ ...current, description: event.target.value }))} placeholder="What should this automation do?" /></label><label className="settings-field"><span>Trigger</span><select value={ruleDraft.trigger} onChange={(event) => setRuleDraft((current) => ({ ...current, trigger: event.target.value as AutomationRule['trigger'] }))}><option value="task_overdue">Task overdue</option><option value="task_blocked">Task blocked</option><option value="report_due">Report due</option><option value="task_created">Task created</option></select></label><label className="settings-field"><span>Action</span><select value={ruleDraft.action} onChange={(event) => setRuleDraft((current) => ({ ...current, action: event.target.value as AutomationRule['action'] }))}><option value="notify_owner">Notify owner</option><option value="escalate">Escalate</option><option value="create_report_task">Create report task</option><option value="route_review">Route review</option></select></label></div><div className="settings-actions"><button className="primary-button" onClick={handleAddAutomationRule}>Add Rule</button></div><div className="settings-list">{automationRules.map((rule) => <div key={rule.id} className="settings-list-row"><div className="settings-form-grid"><label className="settings-field settings-field-full"><span>Name</span><input value={rule.name} onChange={(event) => updateAutomationRule(rule.id, { name: event.target.value })} /></label><label className="settings-field settings-field-full"><span>Description</span><textarea value={rule.description} onChange={(event) => updateAutomationRule(rule.id, { description: event.target.value })} /></label></div><div className="settings-actions"><button className="ghost-button" onClick={() => toggleAutomationRuleStatus(rule.id)}>Toggle {rule.status}</button><span className={`status-badge ${rule.status === 'active' ? 'status-green' : 'status-slate'}`}>{rule.status}</span></div></div>)}</div></div><div className="settings-card"><h3>Task Templates</h3><div className="settings-form-grid"><label className="settings-field settings-field-full"><span>Name</span><input value={taskTemplateDraft.name} onChange={(event) => setTaskTemplateDraft((current) => ({ ...current, name: event.target.value }))} placeholder="New task template" /></label><label className="settings-field settings-field-full"><span>Description</span><textarea value={taskTemplateDraft.description} onChange={(event) => setTaskTemplateDraft((current) => ({ ...current, description: event.target.value }))} placeholder="When should this template be used?" /></label></div><div className="settings-actions"><button className="primary-button" onClick={handleAddTaskTemplate}>Add Task Template</button></div><div className="settings-list">{taskTemplates.map((template) => <div key={template.id} className="settings-list-row"><div className="settings-form-grid"><label className="settings-field settings-field-full"><span>Name</span><input value={template.name} onChange={(event) => updateTaskTemplate(template.id, { name: event.target.value })} /></label><label className="settings-field settings-field-full"><span>Description</span><textarea value={template.description} onChange={(event) => updateTaskTemplate(template.id, { description: event.target.value })} /></label></div></div>)}</div></div><div className="settings-card"><h3>Report Templates</h3><div className="settings-form-grid"><label className="settings-field settings-field-full"><span>Name</span><input value={reportTemplateDraft.name} onChange={(event) => setReportTemplateDraft((current) => ({ ...current, name: event.target.value }))} placeholder="New report template" /></label><label className="settings-field settings-field-full"><span>Description</span><textarea value={reportTemplateDraft.description} onChange={(event) => setReportTemplateDraft((current) => ({ ...current, description: event.target.value }))} placeholder="What reporting job does this support?" /></label><label className="settings-field"><span>Cadence</span><select value={reportTemplateDraft.cadence} onChange={(event) => setReportTemplateDraft((current) => ({ ...current, cadence: event.target.value as ReportTemplate['cadence'] }))}><option value="weekly">Weekly</option><option value="monthly">Monthly</option><option value="quarterly">Quarterly</option></select></label><label className="settings-field"><span>Reviewer</span><input value={reportTemplateDraft.reviewerLabel} onChange={(event) => setReportTemplateDraft((current) => ({ ...current, reviewerLabel: event.target.value }))} placeholder="Reviewer role or owner" /></label></div><div className="settings-actions"><button className="primary-button" onClick={handleAddReportTemplate}>Add Report Template</button></div><div className="settings-list">{reportTemplates.map((template) => <div key={template.id} className="settings-list-row"><div className="settings-form-grid"><label className="settings-field settings-field-full"><span>Name</span><input value={template.name} onChange={(event) => updateReportTemplate(template.id, { name: event.target.value })} /></label><label className="settings-field settings-field-full"><span>Description</span><textarea value={template.description} onChange={(event) => updateReportTemplate(template.id, { description: event.target.value })} /></label></div></div>)}</div></div></section> : null}
          {activeSection === 'blocked' ? <section className="blocked-panel">{blockedTasks.length > 0 ? blockedTasks.map((task) => <div key={task.id} className="blocked-card"><div className="blocked-card-head"><div><h3>{task.title}</h3><p>{projects.find((item) => item.id === task.projectId)?.name ?? 'No project'} · {users.find((user) => user.id === task.ownerId)?.name ?? 'Unassigned'}</p></div><div className="blocked-badges"><TaskPriorityBadge priority={task.priority} /><TaskStatusBadge status="blocked" /></div></div><div className="blocked-reason"><AlertTriangle size={15} /><span>{task.blocker?.reason ?? 'Task is marked blocked with no reason yet.'}</span></div><div className="blocked-card-actions"><button className="ghost-button" onClick={() => setSelectedTaskId(task.id)}>Open Task</button><button className="primary-button" onClick={() => resolveBlocker(task.id)}>Resolve Blocker</button></div></div>) : <div className="placeholder-panel"><AlertTriangle size={18} /><h2>No blocked tasks</h2><p>No blocked tasks right now. The escalation queue is clear.</p></div>}</section> : null}
        </main>

        {activeSection === 'projects' ? <SimpleDetailPanel title={selectedProject?.name ?? 'Task Manager'} body={selectedProject?.subtitle ?? selectedProject?.ownerLabel ?? 'Project detail'}>{selectedProject ? <><section className="detail-section"><div className="section-title">Project Shell</div><div className="project-detail-stack"><div><strong>Owner Label</strong><p>{selectedProject.ownerLabel ?? selectedProjectSummary?.ownerName ?? 'Unassigned'}</p></div><div><strong>Type</strong><p>{selectedProject.type}</p></div><div><strong>Planning Horizon</strong><p>{selectedProject.totalWeeks ? `${selectedProject.totalWeeks} weeks` : 'Not set yet'}</p></div></div></section><section className="detail-section"><div className="section-title">Phase Outline</div><div className="project-task-list">{selectedProjectPhases.length > 0 ? selectedProjectPhases.map((phase) => <div key={phase.id} className="project-task-button"><div><strong>{phase.name}</strong><small>{phase.description ?? 'No phase description yet'}</small></div><span>{`W${phase.startWeek}-${phase.endWeek}`}</span></div>) : <div className="calm-card">Add phases to build the WBS spine for this project.</div>}</div></section></> : <section className="detail-section"><div className="section-title">Project Shell</div><p>Create the first project to start building structure.</p></section>}</SimpleDetailPanel> : activeSection === 'team' ? <SimpleDetailPanel title={selectedTeamSummary?.user.name ?? 'Team'} body={selectedTeamSummary?.user.team ?? 'Team detail'}>{selectedTeamSummary ? <><section className="detail-section"><div className="section-title">Member Profile</div><div className="settings-form-grid"><label className="settings-field settings-field-full"><span>Name</span><input value={selectedTeamSummary.user.name} onChange={(event) => updateUser(selectedTeamSummary.user.id, { name: event.target.value })} /></label><label className="settings-field"><span>Role</span><select value={selectedTeamSummary.user.role} onChange={(event) => updateUser(selectedTeamSummary.user.id, { role: event.target.value as UserRole })}><option value="member">Member</option><option value="manager">Manager</option><option value="admin">Admin</option><option value="guest">Guest</option></select></label><label className="settings-field"><span>Team</span><input value={selectedTeamSummary.user.team} onChange={(event) => updateUser(selectedTeamSummary.user.id, { team: event.target.value })} /></label><label className="settings-field"><span>Capacity / Week</span><input type="number" min="1" value={selectedTeamSummary.user.capacityHoursPerWeek ?? ''} onChange={(event) => updateUser(selectedTeamSummary.user.id, { capacityHoursPerWeek: Number(event.target.value) || undefined })} /></label></div><div className="settings-actions"><button className="ghost-button" onClick={() => handleDeleteTeamMember(selectedTeamSummary.user.id)}>Delete Member</button></div></section><section className="detail-section"><div className="section-title">Assigned Tasks</div><div className="project-task-list">{selectedTeamSummary.tasks.slice(0, 4).map((task) => <button key={task.id} className="project-task-button" onClick={() => handleOpenTask(task.id)}><div><strong>{task.title}</strong><small>{statusLabel[task.status]}</small></div><span>{task.progress}%</span></button>)}</div></section></> : <section className="detail-section"><div className="section-title">Member Profile</div><p>Add team members to build the owner database for new projects.</p></section>}</SimpleDetailPanel> : activeSection === 'reports' ? <SimpleDetailPanel title={selectedReportRecord?.title ?? 'Reports'} body={selectedReportRecord?.roleName ?? 'AgriReports workflow'}>{selectedReportRecord ? <><section className="detail-section"><div className="section-title">Routing</div><div className="project-detail-stack"><div><strong>Author</strong><p>{selectedReportRecord.authorName}</p></div><div><strong>Reviewer</strong><p>{selectedReportRecord.reviewerName}</p></div><div><strong>Window</strong><p>{selectedReportRecord.reportingWindow}</p></div></div></section><section className="detail-section"><div className="section-title">Workflow</div><div className="project-detail-stack"><div><strong>Status</strong><p>{selectedReportRecord.status.replace('_', ' ')}</p></div><div><strong>Updated</strong><p>{formatDateTimeLabel(new Date(selectedReportRecord.updatedAt))}</p></div><div><strong>Saved</strong><p>{selectedReportRecord.lastSavedAt ? formatDateTimeLabel(new Date(selectedReportRecord.lastSavedAt)) : 'Pending autosave'}</p></div></div></section></> : <section className="detail-section"><div className="section-title">Routing</div><p>Create a report to begin.</p></section>}</SimpleDetailPanel> : activeSection === 'analytics' ? <AnalyticsDetailPanel summary={analyticsSummary} projectSummaries={projectSummaries} teamSummaries={teamSummaries} /> : activeSection === 'settings' ? <SettingsDetailPanel summary={settingsSummary} automationRules={automationRules} taskTemplates={taskTemplates} reportTemplates={reportTemplates} onToggleRule={toggleAutomationRuleStatus} /> : <TaskDetailPanel task={selectedTask} users={users} projects={projects} workLogs={workLogs} />}
      </div>

      {isOnboardingOpen ? <div className="modal-backdrop" onClick={() => closeOnboarding(true)}><div className="modal-card walkthrough-modal" onClick={(event) => event.stopPropagation()}><div className="modal-header walkthrough-header"><div><div className="walkthrough-kicker">TaskOps Walkthrough</div><h2>{onboardingStep.title}</h2><p>{onboardingStep.body}</p></div><button className="icon-button" onClick={() => closeOnboarding(true)} aria-label="Close walkthrough"><X size={16} /></button></div><div className="walkthrough-progress"><div className="walkthrough-progress-bar" style={{ width: `${onboardingProgress}%` }} /></div><div className="walkthrough-meta"><span>Step {onboardingStepIndex + 1} of {onboardingSteps.length}</span><span>{onboardingStep.section === 'tasks' && onboardingStep.view ? `${onboardingStep.section} / ${onboardingStep.view}` : onboardingStep.section}</span></div><div className="walkthrough-layout"><aside className="walkthrough-rail">{onboardingSteps.map((step, index) => <button key={step.title} className={index === onboardingStepIndex ? 'walkthrough-step is-active' : 'walkthrough-step'} onClick={() => setOnboardingStepIndex(index)}><span>{index + 1}</span><div><strong>{step.title}</strong><small>{step.section}</small></div></button>)}</aside><section className="walkthrough-body"><div className="walkthrough-panel"><div className="section-title">What To Learn Here</div><ul className="walkthrough-list">{onboardingStep.bullets.map((bullet) => <li key={bullet}>{bullet}</li>)}</ul></div><div className="walkthrough-panel"><div className="section-title">Why This Matters</div><p>The walkthrough is moving the live app behind this dialog so the user can see the actual screen for this step and build the right daily habit from the start.</p></div></section></div><div className="modal-actions walkthrough-actions"><button className="ghost-button" onClick={() => closeOnboarding(true)}>Skip Tour</button><div className="walkthrough-actions-right"><button className="ghost-button" onClick={handlePreviousOnboardingStep} disabled={onboardingStepIndex === 0}>Back</button><button className="primary-button" onClick={handleNextOnboardingStep}>{onboardingStepIndex === onboardingSteps.length - 1 ? 'Finish walkthrough' : 'Next step'}</button></div></div></div></div> : null}

      {isCreateProjectOpen ? <div className="modal-backdrop" onClick={() => setIsCreateProjectOpen(false)}><div className="modal-card" onClick={(event) => event.stopPropagation()}><div className="modal-header"><div><h2>Create Project</h2><p>Start from a clean blank project shell, then add phases, WBS tasks, and cadence rules as the plan grows.</p></div><button className="icon-button" onClick={() => setIsCreateProjectOpen(false)} aria-label="Close project modal"><X size={16} /></button></div><div className="modal-grid"><label className="field field-full"><span>Name</span><input value={projectDraft.name} onChange={(event) => setProjectDraft((current) => ({ ...current, name: event.target.value }))} placeholder="Project name" /></label><label className="field field-full"><span>Subtitle</span><input value={projectDraft.subtitle} onChange={(event) => setProjectDraft((current) => ({ ...current, subtitle: event.target.value }))} placeholder="Short descriptor for this project shell" /></label><label className="field field-full"><span>Description</span><textarea value={projectDraft.description} onChange={(event) => setProjectDraft((current) => ({ ...current, description: event.target.value }))} placeholder="What is this project for?" /></label><label className="field"><span>Type</span><input list="project-type-options" value={projectDraft.type} onChange={(event) => setProjectDraft((current) => ({ ...current, type: event.target.value }))} placeholder="Project, operations, campaign..." /></label><label className="field"><span>Owner Label</span><input list="project-owner-options" value={projectDraft.ownerName} onChange={(event) => setProjectDraft((current) => ({ ...current, ownerName: event.target.value }))} placeholder="Optional person, role, or owner label" /></label><label className="field"><span>Total Weeks</span><input type="number" min="1" value={projectDraft.totalWeeks} onChange={(event) => setProjectDraft((current) => ({ ...current, totalWeeks: event.target.value }))} placeholder="12" /></label><label className="field field-full"><span>Owner Details</span><input value={findUserByName(users, projectDraft.ownerName) ? `${findUserByName(users, projectDraft.ownerName)?.role} · ${findUserByName(users, projectDraft.ownerName)?.team}${findUserByName(users, projectDraft.ownerName)?.capacityHoursPerWeek ? ` · ${findUserByName(users, projectDraft.ownerName)?.capacityHoursPerWeek}h/week` : ''}` : projectDraft.ownerName.trim() ? 'Freeform owner label. This project can be created without a saved team member.' : 'Optional. You can keep this blank and update it later in Project Settings.'} readOnly /></label></div><datalist id="project-type-options">{suggestedProjectTypes.map((projectType) => <option key={projectType} value={projectType}>{projectType}</option>)}</datalist><datalist id="project-owner-options">{users.map((user) => <option key={user.id} value={user.name}>{`${user.role} · ${user.team}`}</option>)}</datalist><div className="modal-actions"><button className="ghost-button" onClick={() => setIsCreateProjectOpen(false)}>Cancel</button><button className="primary-button" onClick={handleCreateProject} disabled={!projectDraft.name.trim()}>Create Project</button></div></div></div> : null}

      {isCreateOpen ? <div className="modal-backdrop" onClick={() => setIsCreateOpen(false)}><div className="modal-card" onClick={(event) => event.stopPropagation()}><div className="modal-header"><div><h2>Create Task</h2><p>Capture work clearly so ownership, due dates, and execution stay visible.</p></div><button className="icon-button" onClick={() => setIsCreateOpen(false)} aria-label="Close task modal"><X size={16} /></button></div>{hasProjects ? <><div className="modal-grid"><label className="field field-full"><span>Title</span><input value={draft.title} onChange={(event) => handleDraftChange('title', event.target.value)} placeholder="What needs to be done?" /></label><label className="field field-full"><span>Description</span><textarea value={draft.description} onChange={(event) => handleDraftChange('description', event.target.value)} placeholder="Context, scope, and expected outcome..." /></label><label className="field"><span>Type</span><select value={draft.type} onChange={(event) => handleDraftChange('type', event.target.value as TaskType)}><option value="standard">Standard</option><option value="recurring">Recurring</option><option value="report">Report</option><option value="approval">Approval</option><option value="incident">Incident</option></select></label><label className="field"><span>Status</span><select value={draft.status} onChange={(event) => handleDraftChange('status', event.target.value as TaskStatus)}><option value="backlog">Backlog</option><option value="ready">Ready</option><option value="in_progress">In Progress</option><option value="review">Review</option><option value="blocked">Blocked</option><option value="done">Completed</option></select></label><label className="field"><span>Priority</span><select value={draft.priority} onChange={(event) => handleDraftChange('priority', event.target.value as TaskPriority)}><option value="P1">P1</option><option value="P2">P2</option><option value="P3">P3</option><option value="P4">P4</option></select></label><label className="field"><span>Project</span><select value={draft.projectId} onChange={(event) => handleDraftChange('projectId', event.target.value)}>{projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}</select></label><label className="field"><span>Owner</span><select value={draft.ownerId} onChange={(event) => handleDraftChange('ownerId', event.target.value)}>{users.map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}</select></label><label className="field"><span>Reviewer</span><select value={draft.reviewerId} onChange={(event) => handleDraftChange('reviewerId', event.target.value)}>{users.map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}</select></label><label className="field"><span>Start Date</span><input type="date" value={draft.startAt} onChange={(event) => handleDraftChange('startAt', event.target.value)} /></label><label className="field"><span>End Date</span><input type="date" value={draft.endAt} onChange={(event) => handleDraftChange('endAt', event.target.value)} /></label><label className="field field-full"><span>Tags</span><input value={draft.tags} onChange={(event) => handleDraftChange('tags', event.target.value)} placeholder="finance, monthly, client" /></label></div><div className="modal-actions"><button className="ghost-button" onClick={() => setIsCreateOpen(false)}>Cancel</button><button className="primary-button" onClick={handleCreateTask}>Create Task</button></div></> : <div className="placeholder-panel inset"><FolderKanban size={18} /><h2>Create a project first</h2><p>Tasks belong inside projects. Create the first project, then come back to add work.</p><div className="modal-actions"><button className="ghost-button" onClick={() => setIsCreateOpen(false)}>Close</button><button className="primary-button" onClick={() => { setIsCreateOpen(false); setIsCreateProjectOpen(true); }}><Plus size={16} />Create Project</button></div></div>}</div></div> : null}
    </div>
  );
}



















