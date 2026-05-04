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
  Trash2,
  Users,
  X,
  Upload
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useTaskOpsStore } from '../../store/use-task-ops-store';
import { AuthUser, AutomationRule, Project, ProjectPhase, ProjectType, ReportTemplate, Task, TaskPriority, TaskStatus, TaskTemplate, TaskType, User, UserRole } from '../../types/domain';
import { formatDateTimeLabel, formatDayLabel, formatMonthLabel, getCurrentDate, isOverdue, isSameDay, isToday, startOfDay } from '../../utils/date';
import { TaskDetailPanel } from './task-detail-panel';
import { ProjectWorkbench } from './project-workbench';
import { HrImportWizard } from './hr-import-wizard';
import { LaborCostAnalytics } from './labor-cost-analytics';
import { ReportsModule } from './reports-module';
import { categoryLabels } from '../../data/agricultural-roles';
import { getDefaultReportData, reportPeriods } from '../../data/report-framework';
import { TourOverlay, TourWelcomeScreen, TourCompletionModal, useTour } from '../tour';
import '../tour/tour-styles.css';
import './team-card-actions.css';

const statusLabel: Record<TaskStatus, string> = {
  backlog: 'Backlog',
  ready: 'Ready',
  in_progress: 'In Progress',
  review: 'Review',
  blocked: 'Blocked',
  done: 'Done',
  archived: 'Archived'
};

type SystemStatus = {
  database?: {
    configured: boolean;
    unavailable: boolean;
    required?: boolean;
    mode: 'postgres' | 'fallback';
  };
};

type SetupWizardStepId = 'team' | 'project' | 'work';
type PendingDelete = { type: 'user'; userId: string } | { type: 'team'; teamName: string };

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
  position: string;
  capacityHoursPerWeek: string;
};

type InlineEditDraft = {
  name: string;
  position: string;
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
type TeamLoadFilter = 'overloaded' | 'blocked' | 'overdue';

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
  position: '',
  capacityHoursPerWeek: '40'
};

const suggestedProjectTypes = ['project', 'operations', 'workstream', 'client', 'account'];

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

const CONTEXT_HINTS_STORAGE_KEY = 'taskops:contextual-module-hints-dismissed';
const SETUP_WIZARD_COMPLETED_STORAGE_KEY = 'taskops:setup-wizard-completed';

function formatReportStatus(status: unknown) {
  return typeof status === 'string' && status.trim()
    ? status.replace(/_/g, ' ')
    : 'unknown';
}

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
    teams,
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
    addTeam,
    deleteTeam,
    updateTask,
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
    createReport,
    updateReport,
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

  const { startTour, progress, registerWorkspaceController, openWelcome } = useTour();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isCreateProjectOpen, setIsCreateProjectOpen] = useState(false);
  const [selectedProjectPhaseId, setSelectedProjectPhaseId] = useState<string | null>(null);
  const [draft, setDraft] = useState<NewTaskDraft>(() => buildEmptyTaskDraft([], []));
  const [projectDraft, setProjectDraft] = useState<NewProjectDraft>(emptyProjectDraft);
  const [teamMemberDraft, setTeamMemberDraft] = useState<TeamMemberDraft>(emptyTeamMemberDraft);
  const [teamDraftName, setTeamDraftName] = useState('');
  const [ruleDraft, setRuleDraft] = useState<Pick<AutomationRule, 'name' | 'description' | 'trigger' | 'action'>>({ name: '', description: '', trigger: 'task_overdue', action: 'notify_owner' });
  const [taskTemplateDraft, setTaskTemplateDraft] = useState<Pick<TaskTemplate, 'name' | 'description' | 'type' | 'priority' | 'defaultEstimateHours'>>({ name: '', description: '', type: 'standard', priority: 'P2', defaultEstimateHours: 2 });
  const [reportTemplateDraft, setReportTemplateDraft] = useState<Pick<ReportTemplate, 'name' | 'description' | 'cadence' | 'reviewerLabel'>>({ name: '', description: '', cadence: 'monthly', reviewerLabel: '' });
  const [showImportWizard, setShowImportWizard] = useState(false);
  const [analyticsView, setAnalyticsView] = useState<'task' | 'labor'>('task');
  const [isTaskAdvancedOpen, setIsTaskAdvancedOpen] = useState(false);
  const [dismissedModuleHints, setDismissedModuleHints] = useState<Record<string, boolean>>({});
  const [teamLoadFilters, setTeamLoadFilters] = useState<TeamLoadFilter[]>([]);
  const [selectedTeamName, setSelectedTeamName] = useState<string>('all');
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [inlineEditDraft, setInlineEditDraft] = useState<InlineEditDraft>({
    name: '',
    position: '',
    role: 'member',
    team: '',
    capacityHoursPerWeek: '40'
  });
  const [rosterViewMode, setRosterViewMode] = useState<'list' | 'grid'>('list');
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null);
  const [isSetupWizardOpen, setIsSetupWizardOpen] = useState(false);
  const [setupWizardStep, setSetupWizardStep] = useState<SetupWizardStepId>('team');
  const [setupWizardCompleted, setSetupWizardCompleted] = useState(false);
  const [setupWizardReturnStep, setSetupWizardReturnStep] = useState<SetupWizardStepId | null>(null);
  const [sessionUser, setSessionUser] = useState<AuthUser | null>(null);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<PendingDelete | null>(null);

  const taskMap = useMemo(() => new Map(tasks.map((task) => [task.id, task])), [tasks]);
  const selectedTask = selectedTaskId ? taskMap.get(selectedTaskId) ?? null : null;
  const currentUserId = users[0]?.id ?? '';
  const currentUser = users[0] ?? null;
  const canManageTeams = users.length === 0 || currentUser?.role === 'admin';
  const [now, setNow] = useState(() => getCurrentDate());

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

  useEffect(() => {
    const refreshClock = () => setNow(getCurrentDate());
    refreshClock();
    const intervalId = window.setInterval(refreshClock, 60_000);
    return () => window.clearInterval(intervalId);
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function loadSystemStatus() {
      try {
        const response = await fetch('/api/system/status', { cache: 'no-store' });
        if (!response.ok) return;
        const payload = await response.json() as { data?: SystemStatus };
        if (isMounted) setSystemStatus(payload.data ?? null);
      } catch {
        if (isMounted) setSystemStatus(null);
      }
    }

    void loadSystemStatus();
    const intervalId = window.setInterval(loadSystemStatus, 30_000);
    return () => {
      isMounted = false;
      window.clearInterval(intervalId);
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function loadSessionUser() {
      try {
        const response = await fetch('/api/auth/session', { cache: 'no-store' });
        if (!response.ok) return;
        const payload = await response.json() as { data?: AuthUser | null };
        if (isMounted) setSessionUser(payload.data ?? null);
      } catch {
        if (isMounted) setSessionUser(null);
      }
    }

    void loadSessionUser();
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const rawHints = window.localStorage.getItem(CONTEXT_HINTS_STORAGE_KEY);
    if (!rawHints) return;
    try {
      const parsed = JSON.parse(rawHints) as Record<string, boolean>;
      setDismissedModuleHints(parsed);
    } catch {
      setDismissedModuleHints({});
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    setSetupWizardCompleted(window.localStorage.getItem(SETUP_WIZARD_COMPLETED_STORAGE_KEY) === 'true');
  }, []);

  function dismissModuleHint(module: 'reports' | 'analytics' | 'settings') {
    setDismissedModuleHints((current) => {
      const next = { ...current, [module]: true };
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(CONTEXT_HINTS_STORAGE_KEY, JSON.stringify(next));
      }
      return next;
    });
  }

  function toggleTeamLoadFilter(filter: TeamLoadFilter) {
    setTeamLoadFilters((current) => (
      current.includes(filter) ? current.filter((item) => item !== filter) : [...current, filter]
    ));
  }

  function applyExclusiveTeamLoadFilter(filter: TeamLoadFilter) {
    setTeamLoadFilters((current) => (
      current.length === 1 && current[0] === filter ? [] : [filter]
    ));
  }

  const filteredTasks = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return tasks.filter((task) => {
      const projectName = projects.find((project) => project.id === task.projectId)?.name.toLowerCase() ?? '';
      const ownerName = users.find((user) => user.id === task.ownerId)?.name.toLowerCase() ?? '';
      const matchesQuery = query.length === 0 || task.title.toLowerCase().includes(query) || task.tags.some((tag) => tag.toLowerCase().includes(query)) || projectName.includes(query) || ownerName.includes(query);
      if (!matchesQuery) return false;
      switch (activeFilter) {
        case 'my_work': return currentUserId ? task.ownerId === currentUserId : true;
        case 'due_today': return isToday(task.dueAt);
        case 'blocked': return task.status === 'blocked';
        case 'overdue': return task.status !== 'done' && isOverdue(task.dueAt);
        case 'review': return task.status === 'review';
        case 'recurring': return task.type === 'report' || task.type === 'recurring';
        case 'watching': return currentUserId ? task.watcherIds.includes(currentUserId) : false;
        default: return true;
      }
    });
  }, [activeFilter, currentUserId, projects, searchQuery, tasks, users]);

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
      overdueCount: userTasks.filter((task) => Boolean(task.dueAt) && isOverdue(task.dueAt) && task.status !== 'done').length,
      reviewCount: userTasks.filter((task) => task.status === 'review').length,
      loggedHours: Number(userTasks.reduce((sum, task) => sum + task.loggedHours, 0).toFixed(1)),
      utilization: Math.min(200, Math.round((estimatedHours / capacity) * 100)),
      tasks: userTasks
    };
  }), [tasks, users]);
  const filteredTeamSummaries = useMemo(() => {
    return teamSummaries.filter((summary) => {
      const matchesTeam = selectedTeamName === 'all' || summary.user.team === selectedTeamName;
      if (!matchesTeam) return false;
      if (teamLoadFilters.length === 0) return true;
      return teamLoadFilters.every((filter) => {
        if (filter === 'overloaded') return summary.utilization >= 90;
        if (filter === 'blocked') return summary.blockedCount > 0;
        return summary.overdueCount > 0;
      });
    });
  }, [selectedTeamName, teamLoadFilters, teamSummaries]);
  const teamDirectory = useMemo(() => teams.map((teamName) => {
    const members = users.filter((user) => user.team === teamName);
    const totalOpen = members.reduce((sum, member) => {
      const summary = teamSummaries.find((item) => item.user.id === member.id);
      return sum + (summary?.openCount ?? 0);
    }, 0);

    return {
      name: teamName,
      memberCount: members.length,
      totalOpen
    };
  }), [teamSummaries, teams, users]);
  const selectedTeamViewSummary = useMemo(() => {
    const memberCount = filteredTeamSummaries.length;
    const blockedCount = filteredTeamSummaries.reduce((sum, summary) => sum + summary.blockedCount, 0);
    const overdueCount = filteredTeamSummaries.reduce((sum, summary) => sum + summary.overdueCount, 0);
    const openCount = filteredTeamSummaries.reduce((sum, summary) => sum + summary.openCount, 0);
    const avgUtilization = memberCount > 0
      ? Math.round(filteredTeamSummaries.reduce((sum, summary) => sum + summary.utilization, 0) / memberCount)
      : 0;

    return {
      memberCount,
      blockedCount,
      overdueCount,
      openCount,
      avgUtilization
    };
  }, [filteredTeamSummaries]);
  const selectedTeamAvgCapacity = useMemo(() => {
    if (filteredTeamSummaries.length === 0) return 40;
    const totalCapacity = filteredTeamSummaries.reduce((sum, summary) => sum + (summary.user.capacityHoursPerWeek ?? 40), 0);
    return Math.round(totalCapacity / filteredTeamSummaries.length);
  }, [filteredTeamSummaries]);
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
      overdueCount: tasks.filter((task) => Boolean(task.dueAt) && isOverdue(task.dueAt) && task.status !== 'done').length,
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
  const selectedTeamSummary = filteredTeamSummaries.find((summary) => summary.user.id === selectedUserId) ?? filteredTeamSummaries[0] ?? null;
  const selectedReportRecord = reports.find((report) => report.id === selectedReportId) ?? reports[0] ?? null;
  const taskKpis = useMemo(() => ({
    dueToday: tasks.filter((task) => task.status !== 'done' && isToday(task.dueAt)).length,
    blocked: tasks.filter((task) => task.status === 'blocked' || Boolean(task.blocker)).length,
    overdue: tasks.filter((task) => task.status !== 'done' && isOverdue(task.dueAt)).length,
    needsReview: tasks.filter((task) => task.status === 'review').length
  }), [tasks]);
  const todayTasks = useMemo(() => tasks.filter((task) => task.status !== 'done' && isToday(task.dueAt)), [tasks]);
  const myTasks = useMemo(() => tasks.filter((task) => task.ownerId === currentUserId && task.status !== 'done'), [currentUserId, tasks]);
  const overdueTasks = useMemo(() => tasks.filter((task) => task.status !== 'done' && isOverdue(task.dueAt)), [tasks]);
  const reportsDue = useMemo(() => reports.filter((report) => report.status === 'draft'), [reports]);
  const reportsAwaitingReview = useMemo(() => reports.filter((report) => report.status === 'submitted'), [reports]);
  const reportsNeedingAttention = useMemo(
    () => reports.filter((report) => report.status === 'changes_requested' || report.status === 'rejected'),
    [reports]
  );
  const teamGapCount = (users.length === 0 ? 1 : 0) + users.filter((user) => !user.team || user.team === 'Unassigned').length;
  const selectedProjectReportObligations = useMemo(
    () => reportTemplates.map((template) => ({
      template,
      matchingReports: reports.filter((report) => report.period === template.cadence),
      nextDueLabel: template.cadence === 'weekly' ? 'Next 7 days' : template.cadence === 'monthly' ? 'This month' : 'This quarter',
      ownerLabel: selectedProject?.ownerLabel ?? selectedProjectSummary?.ownerName ?? 'Unassigned'
    })),
    [reportTemplates, reports, selectedProject?.ownerLabel, selectedProjectSummary?.ownerName]
  );
  const pendingDeleteSummary = useMemo(() => {
    if (!pendingDelete) return null;
    if (pendingDelete.type === 'user') {
      const user = users.find((item) => item.id === pendingDelete.userId);
      const ownedTasks = tasks.filter((task) => task.ownerId === pendingDelete.userId && task.status !== 'done');
      const projectsOwned = projects.filter((project) => project.ownerId === pendingDelete.userId);
      return {
        title: `Delete ${user?.name ?? 'team member'}?`,
        body: 'This removes the member from the directory and reassigns active ownership where possible.',
        impacts: [
          `${ownedTasks.length} open task${ownedTasks.length === 1 ? '' : 's'} will be reassigned`,
          `${projectsOwned.length} project${projectsOwned.length === 1 ? '' : 's'} will lose this owner`,
          'Reviewer, backup owner, and watcher references will be removed'
        ]
      };
    }

    const teamMembers = users.filter((user) => user.team === pendingDelete.teamName);
    const openTasks = tasks.filter((task) => teamMembers.some((user) => user.id === task.ownerId) && task.status !== 'done');
    return {
      title: `Delete ${pendingDelete.teamName}?`,
      body: 'This removes the team label and moves its members to Unassigned.',
      impacts: [
        `${teamMembers.length} member${teamMembers.length === 1 ? '' : 's'} will move to Unassigned`,
        `${openTasks.length} open task${openTasks.length === 1 ? '' : 's'} are owned by those members`,
        'The Unassigned team will remain available for cleanup'
      ]
    };
  }, [pendingDelete, projects, tasks, users]);
  const hasOperationalSetup = users.length > 0 && projects.length > 0 && tasks.length > 0;
  const setupSteps = [
    {
      id: 'team',
      title: 'Build the team',
      body: users.length > 0 ? `${users.length} team member${users.length === 1 ? '' : 's'} ready for ownership.` : 'Add the people who will own work, reviews, and capacity.',
      complete: users.length > 0,
      action: 'Open Team',
      onClick: () => openSetupWizard('team')
    },
    {
      id: 'project',
      title: 'Create a project',
      body: projects.length > 0 ? `${projects.length} project shell${projects.length === 1 ? '' : 's'} available.` : 'Create the operating shell before tasks start piling up.',
      complete: projects.length > 0,
      action: 'Create Project',
      onClick: () => openSetupWizard('project')
    },
    {
      id: 'task',
      title: 'Capture first work or cadence',
      body: tasks.length > 0 ? `${tasks.length} task${tasks.length === 1 ? '' : 's'} in the execution model.` : 'Create the first task or open Reports to confirm the first reporting cadence.',
      complete: tasks.length > 0,
      action: 'New Task / Report',
      onClick: () => openSetupWizard('work')
    }
  ];
  const setupWizardSteps: Array<{ id: SetupWizardStepId; title: string; complete: boolean; description: string }> = [
    {
      id: 'team',
      title: 'Team',
      complete: users.length > 0,
      description: 'Create or import the people who will own work.'
    },
    {
      id: 'project',
      title: 'Project',
      complete: projects.length > 0,
      description: 'Create the first operating shell.'
    },
    {
      id: 'work',
      title: 'Work',
      complete: tasks.length > 0 || reports.length > 0 || reportTemplates.length > 0,
      description: 'Capture first work or confirm report cadence.'
    }
  ];
  const activeSetupStepIndex = Math.max(0, setupWizardSteps.findIndex((step) => step.id === setupWizardStep));
  const setupWizardProgress = Math.round((setupWizardSteps.filter((step) => step.complete).length / setupWizardSteps.length) * 100);
  const isSetupReady = setupWizardSteps.every((step) => step.complete);
  const canContinueSetup = setupWizardSteps[activeSetupStepIndex]?.complete ?? false;
  const timelineGroups = useMemo(() => {
    const today = startOfDay(now);
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
  }, [filteredTasks, now]);

  const calendarDays = useMemo(() => {
    const datedTasks = filteredTasks.filter((task) => task.dueAt);
    const today = getCurrentDate();
    const anchor = datedTasks.length > 0 ? new Date(datedTasks[0].dueAt as string) : today;
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
  const currentTourModule: 'tasks' | 'projects' | 'team' | 'reports' | 'analytics' | 'settings' =
    activeSection === 'blocked' || activeSection === 'today' ? 'tasks' : activeSection;

  useEffect(() => {
    if (selectedTeamName !== 'all' && !teams.includes(selectedTeamName)) {
      setSelectedTeamName('all');
    }
  }, [selectedTeamName, teams]);

  useEffect(() => {
    if (activeSection !== 'team') return;
    const nextSelectedUserId = filteredTeamSummaries.find((summary) => summary.user.id === selectedUserId)?.user.id
      ?? filteredTeamSummaries[0]?.user.id
      ?? null;

    if (nextSelectedUserId !== selectedUserId) {
      setSelectedUserId(nextSelectedUserId);
    }
  }, [activeSection, filteredTeamSummaries, selectedUserId, setSelectedUserId]);

  useEffect(() => {
    registerWorkspaceController({
      prepareStep: (tourId, step) => {
        if (step.module && step.module !== 'global') {
          setActiveSection(step.module);
        }

        switch (tourId) {
          case 'global':
          case 'tasks':
            setActiveSection('tasks');
            if (step.id !== 'tasks-detail-panel') {
              setActiveView('list');
            }
            break;
          case 'projects':
            setActiveSection('projects');
            if (!selectedProjectId && projects[0]) {
              setSelectedProjectId(projects[0].id);
            }
            break;
          case 'team':
            setActiveSection('team');
            break;
          case 'reports':
            setActiveSection('reports');
            break;
          case 'analytics':
            setActiveSection('analytics');
            if (step.id === 'analytics-labor-overview' || step.id === 'analytics-category-breakdown' || step.id === 'analytics-roster') {
              setAnalyticsView('labor');
            } else {
              setAnalyticsView('task');
            }
            break;
          case 'settings':
            setActiveSection('settings');
            break;
        }

        if ((tourId === 'global' || tourId === 'tasks') && tasks.length > 0 && (step.id === 'tasks-detail-panel' || step.id === 'tasks-task-row')) {
          setSelectedTaskId(tasks[0].id);
        }

        if (tourId === 'tasks') {
          if (step.id === 'tasks-filter-chips') setActiveFilter('my_work');
          if (step.id === 'tasks-kpi-cards') setActiveFilter('due_today');
        }

        if (tourId === 'team' && step.id === 'team-hr-import') {
          setShowImportWizard(false);
        }
      }
    });

    return () => registerWorkspaceController(null);
  }, [projects, registerWorkspaceController, selectedProjectId, setActiveFilter, setActiveSection, setActiveView, setSelectedProjectId, setSelectedTaskId, tasks]);

  const handleDraftChange = <K extends keyof NewTaskDraft>(key: K, value: NewTaskDraft[K]) => setDraft((current) => ({ ...current, [key]: value }));
  const handleOpenTask = (taskId: string) => { setSelectedTaskId(taskId); setActiveSection('tasks'); };

  function openSetupWizard(step: SetupWizardStepId = setupWizardSteps.find((item) => !item.complete)?.id ?? 'work') {
    setSetupWizardStep(step);
    setIsSetupWizardOpen(true);
  }

  function openRoleImport(fromSetupStep?: SetupWizardStepId) {
    setSetupWizardReturnStep(fromSetupStep ?? null);
    if (fromSetupStep) {
      setIsSetupWizardOpen(false);
    }
    setShowImportWizard(true);
  }

  function closeRoleImport() {
    setShowImportWizard(false);
    if (setupWizardReturnStep) {
      setSetupWizardStep(setupWizardReturnStep);
      setIsSetupWizardOpen(true);
      setSetupWizardReturnStep(null);
    }
  }

  function continueSetupWizard() {
    const nextStep = setupWizardSteps.slice(activeSetupStepIndex + 1).find((step) => !step.complete)
      ?? setupWizardSteps[activeSetupStepIndex + 1];

    if (nextStep) {
      setSetupWizardStep(nextStep.id);
      return;
    }

    setSetupWizardCompleted(true);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(SETUP_WIZARD_COMPLETED_STORAGE_KEY, 'true');
    }
    setIsSetupWizardOpen(false);
    setActiveSection('today');
  }

  function finishSetupWizard() {
    setSetupWizardCompleted(true);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(SETUP_WIZARD_COMPLETED_STORAGE_KEY, 'true');
    }
    setIsSetupWizardOpen(false);
    setActiveSection('today');
  }

  async function handleSignOut() {
    setIsSigningOut(true);
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      setSessionUser(null);
      if (typeof window !== 'undefined') {
        window.location.reload();
      }
    } finally {
      setIsSigningOut(false);
    }
  }

  function handleRequestCreateTask() {
    if (users.length === 0) {
      setActiveSection('team');
      return;
    }

    if (projects.length === 0) {
      setIsCreateProjectOpen(true);
      return;
    }

    setIsCreateOpen(true);
  }

  const handleCreateTask = () => {
    const title = draft.title.trim();
    if (users.length === 0 || projects.length === 0) {
      handleRequestCreateTask();
      return;
    }
    if (!title) return;
    addTask({ id: `t${Date.now()}`, type: draft.type, title, description: draft.description.trim() || undefined, status: draft.status, priority: draft.priority, projectId: draft.projectId || undefined, ownerId: draft.ownerId || currentUserId || 'unassigned', reviewerId: draft.reviewerId || undefined, backupOwnerId: draft.backupOwnerId || undefined, watcherIds: draft.reviewerId ? [draft.reviewerId] : [], tags: draft.tags.split(',').map((tag) => tag.trim()).filter(Boolean), startAt: draft.startAt ? new Date(draft.startAt).toISOString() : undefined, dueAt: draft.endAt ? new Date(draft.endAt).toISOString() : undefined, estimateHours: Number(draft.estimateHours) || undefined, loggedHours: 0, progress: 0, recurrence: draft.recurrence || undefined, dependencyIds: [], subtasks: [], blocker: null, sla: { enabled: false }, attachmentIds: [], workLogIds: [], activityIds: [] });
    setDraft(buildEmptyTaskDraft(projects, users));
    setIsTaskAdvancedOpen(false);
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
    const team = teamMemberDraft.team.trim() || teamDraftName.trim();
    const position = teamMemberDraft.position.trim();
    if (!name || !team) return;

    addUser({
      id: `u${Date.now()}`,
      name,
      role: teamMemberDraft.role,
      team,
      position: position || undefined,
      capacityHoursPerWeek: Number(teamMemberDraft.capacityHoursPerWeek) || undefined
    });
    setTeamMemberDraft(emptyTeamMemberDraft);
  };

  const handleAddTeam = () => {
    const teamName = teamDraftName.trim();
    if (!teamName) return;
    addTeam(teamName);
    setTeamDraftName('');
    setTeamMemberDraft((current) => ({ ...current, team: current.team || teamName }));
  };

  const handleDeleteTeamMember = (userId: string) => {
    setPendingDelete({ type: 'user', userId });
  };

  const handleDeleteTeam = (teamName: string) => {
    if (!canManageTeams || teamName === 'Unassigned') return;
    setPendingDelete({ type: 'team', teamName });
  };

  function confirmPendingDelete() {
    if (!pendingDelete) return;

    if (pendingDelete.type === 'user') {
      deleteUser(pendingDelete.userId);
      if (selectedUserId === pendingDelete.userId) {
        setSelectedUserId(users.find((user) => user.id !== pendingDelete.userId)?.id ?? null);
      }
      setPendingDelete(null);
      return;
    }

    deleteTeam(pendingDelete.teamName);
    if (selectedTeamName === pendingDelete.teamName) {
      setSelectedTeamName('all');
    }
    setTeamMemberDraft((current) => ({
      ...current,
      team: current.team === pendingDelete.teamName ? 'Unassigned' : current.team
    }));
    setPendingDelete(null);
  }

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

  function handleCreateProjectReport(template: ReportTemplate) {
    if (!selectedProject) return;
    const periodDefinition = reportPeriods.find((period) => period.id === template.cadence);
    const roleDefinition = periodDefinition?.roles[0];
    if (!periodDefinition || !roleDefinition) return;

    const reportId = createReport({
      period: template.cadence,
      roleId: roleDefinition.id,
      reportingWindow: `${template.name} · ${selectedProject.name}`,
      authorName: selectedProject.ownerLabel ?? selectedProjectSummary?.ownerName,
      reviewerName: template.reviewerLabel
    });

    if (!reportId) return;
    updateReport(reportId, {
      title: `${selectedProject.name} - ${template.name}`,
      data: {
        ...getDefaultReportData(roleDefinition),
        project_id: selectedProject.id,
        project_name: selectedProject.name,
        project_report_template_id: template.id
      }
    });
    setActiveSection('reports');
  }

  return (
    <div className="shell">
      <header className="topbar" data-tour="shell.topbar">
        <div className="brand"><div className="brand-dot" /><div><div className="brand-name">Task Manager</div><div className="brand-meta">Start blank, structure projects, and execute work clearly.</div></div></div>
        <div className="topbar-nav" data-tour="shell.module-nav">
          <div className="topbar-nav-group">
            <button className={activeSection === 'today' ? 'is-active' : ''} onClick={() => setActiveSection('today')}>Today</button>
            <button className={activeSection === 'tasks' || activeSection === 'projects' || activeSection === 'blocked' ? 'is-active' : ''} onClick={() => setActiveSection('tasks')}>Work</button>
            <button className={activeSection === 'reports' ? 'is-active' : ''} onClick={() => setActiveSection('reports')}>Reports</button>
            <button className={activeSection === 'team' ? 'is-active' : ''} onClick={() => setActiveSection('team')}>Team</button>
            <button className={activeSection === 'analytics' ? 'is-active' : ''} onClick={() => setActiveSection('analytics')}>Analytics</button>
            <button className={activeSection === 'settings' ? 'is-active' : ''} onClick={() => setActiveSection('settings')}>Settings</button>
          </div>
        </div>
        <div className="searchbox" data-tour="shell.search"><Search size={15} /><input value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="Search tasks, tags, projects, or owners..." /></div>
        <div className="topbar-actions" data-tour="shell.actions"><button className="ghost-button" onClick={() => startTour(currentTourModule)} style={{ marginLeft: 8 }}>{progress[currentTourModule]?.completed ? '↺ Replay Tour' : '❓ Take Tour'}</button><button className="ghost-button" onClick={() => openWelcome?.()}>All Tours</button><button className="ghost-button" onClick={() => setIsCreateProjectOpen(true)}><FolderKanban size={16} />Create Project</button><button className="primary-button" data-tour="tasks.create-task" onClick={handleRequestCreateTask}><Plus size={16} />New Task</button>{sessionUser ? <div className="user-menu"><div><strong>{sessionUser.name}</strong><span>{sessionUser.role} · {sessionUser.team}</span></div><button className="ghost-button" onClick={handleSignOut} disabled={isSigningOut}>{isSigningOut ? 'Signing out...' : 'Log out'}</button></div> : <div className="user-menu is-anonymous"><div><strong>Not signed in</strong><span>Session unavailable</span></div></div>}</div>
      </header>

      {systemStatus?.database?.mode === 'fallback' ? (
        <div className="system-status-banner" role="status">
          <AlertTriangle size={16} />
          <div>
            <strong>{systemStatus.database.configured ? 'Database unavailable' : 'Database not configured'}</strong>
            <span>{systemStatus.database.required ? 'Production requires PostgreSQL. Check DATABASE_URL and redeploy before entering operational data.' : systemStatus.database.configured ? 'Using fallback storage. Changes may not persist after redeploy.' : 'Using local fallback storage until DATABASE_URL is configured.'}</span>
          </div>
        </div>
      ) : null}

      <div className="page-header" data-tour="shell.page-header">
        <div>
          <h1>{activeSection === 'today' ? 'Today' : activeSection === 'tasks' || activeSection === 'projects' || activeSection === 'blocked' ? 'Work' : activeSection === 'team' ? 'Team' : activeSection === 'reports' ? 'Reports' : activeSection === 'analytics' ? 'Analytics' : 'Settings & Automations'}</h1>
          <p>{activeSection === 'today' ? 'Start with the work, blockers, reviews, and setup gaps that need attention now.' : activeSection === 'tasks' ? 'Track active work, update progress, and move execution forward.' : activeSection === 'projects' ? 'Plan project shells, phases, task breakdowns, and report obligations in one execution model.' : activeSection === 'blocked' ? 'Resolve stuck work quickly and keep delivery moving.' : activeSection === 'team' ? 'Monitor ownership, workload, and delivery pressure across the team.' : activeSection === 'reports' ? 'Manage recurring deliverables and keep reporting work on schedule.' : activeSection === 'analytics' ? 'Review completion, overdue work, blockers, and operational performance.' : 'Shape how TaskOps runs with templates, automations, and routing rules.'}</p>
        </div>
        {activeSection === 'tasks' ? <div className="view-switcher" data-tour="tasks.views">{[{ id: 'list', label: 'List', icon: <ListTodo size={14} /> }, { id: 'board', label: 'Board', icon: <LayoutGrid size={14} /> }, { id: 'timeline', label: 'Timeline', icon: <TimerReset size={14} /> }, { id: 'calendar', label: 'Calendar', icon: <CalendarDays size={14} /> }].map((view) => <button key={view.id} className={activeView === view.id ? 'is-active' : ''} onClick={() => setActiveView(view.id as typeof activeView)}>{view.icon}{view.label}</button>)}</div> : <div className="blocked-metrics"><div className="metric-box"><strong>{activeSection === 'today' ? todayTasks.length : activeSection === 'analytics' ? `${analyticsSummary.completionRate}%` : activeSection === 'settings' ? settingsSummary.activeAutomations : activeSection === 'reports' ? reports.length : activeSection === 'projects' ? projects.length : activeSection === 'team' ? teamSummaries.length : blockedTasks.length}</strong><span>{activeSection === 'today' ? 'due today' : activeSection === 'analytics' ? 'completion rate' : activeSection === 'settings' ? 'active automations' : activeSection === 'reports' ? 'report records' : activeSection === 'projects' ? 'project shells' : activeSection === 'team' ? 'team members' : 'blocked tasks'}</span></div><div className="metric-box"><strong>{activeSection === 'today' ? blockedTasks.length + reportsAwaitingReview.length : activeSection === 'analytics' ? analyticsSummary.overdueCount : activeSection === 'settings' ? taskTemplates.length + reportTemplates.length : activeSection === 'reports' ? reports.filter((report) => report.status === 'changes_requested' || report.status === 'rejected').length : activeSection === 'projects' ? selectedProjectPhases.length : activeSection === 'team' ? teamSummaries.reduce((sum, member) => sum + member.blockedCount, 0) : blockedTasks.filter((task) => task.priority === 'P1').length}</strong><span>{activeSection === 'today' ? 'needs action' : activeSection === 'analytics' ? 'overdue tasks' : activeSection === 'settings' ? 'templates' : activeSection === 'reports' ? 'needs attention' : activeSection === 'projects' ? 'selected phases' : activeSection === 'team' ? 'blocked owned' : 'P1 blocked'}</span></div></div>}
      </div>

      {(activeSection === 'reports' || activeSection === 'analytics' || activeSection === 'settings') &&
      !dismissedModuleHints[activeSection] ? (
        <div className="chip-row">
          <div className="calm-card" style={{ width: '100%' }}>
            <div className="modal-header" style={{ padding: 0, border: 0 }}>
              <div>
                <h3 style={{ margin: 0 }}>
                  {activeSection === 'reports'
                    ? 'Reports hint'
                    : activeSection === 'analytics'
                      ? 'Analytics hint'
                      : 'Settings hint'}
                </h3>
                <p style={{ marginTop: 6 }}>
                  {activeSection === 'reports'
                    ? 'Use Reports for recurring narrative and review workflows. Keep daily execution in Tasks and Blocked.'
                    : activeSection === 'analytics'
                      ? 'Start in Operational Health, drill into flagged metrics, and jump back to Tasks for action.'
                      : 'Use Settings to maintain templates and automations; return to Tasks once configuration changes are saved.'}
                </p>
              </div>
              <button
                className="ghost-button"
                onClick={() => dismissModuleHint(activeSection)}
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {activeSection === 'tasks' || activeSection === 'projects' || activeSection === 'blocked' ? <div className="chip-row" data-tour="tasks.filters"><button className={activeSection === 'tasks' ? 'chip is-active' : 'chip'} onClick={() => setActiveSection('tasks')}>Tasks</button><button className={activeSection === 'projects' ? 'chip is-active' : 'chip'} onClick={() => setActiveSection('projects')}>Projects</button><button className={activeSection === 'blocked' ? 'chip is-active' : 'chip'} onClick={() => setActiveSection('blocked')}>Blocked</button></div> : null}
      {activeSection === 'tasks' ? <div className="chip-row" data-tour="tasks.filters">{[['all', 'All'], ['my_work', 'My Work'], ['due_today', 'Due Today'], ['blocked', 'Blocked'], ['overdue', 'Overdue'], ['review', 'Needs Review'], ['recurring', 'Recurring'], ['watching', 'Watching']].map(([id, label]) => <button key={id} className={activeFilter === id ? 'chip is-active' : 'chip'} onClick={() => setActiveFilter(id as typeof activeFilter)}>{label}</button>)}</div> : null}
      {activeSection === 'tasks' && Object.values(taskKpis).some((count) => count > 0) ? <div className="summary-kpi-grid" data-tour="tasks.kpis"><button className="metric-box project-card" onClick={() => setActiveFilter('due_today')}><strong>{taskKpis.dueToday}</strong><span>Due Today</span></button><button className="metric-box project-card" onClick={() => setActiveFilter('blocked')}><strong>{taskKpis.blocked}</strong><span>Blocked</span></button><button className="metric-box project-card" onClick={() => setActiveFilter('overdue')}><strong>{taskKpis.overdue}</strong><span>Overdue</span></button><button className="metric-box project-card" onClick={() => setActiveFilter('review')}><strong>{taskKpis.needsReview}</strong><span>Needs Review</span></button></div> : null}

      <div className="workspace">
        <aside className="sidebar" data-tour="shell.sidebar">
          {activeSection === 'today' ? <><div className="sidebar-section"><div className="sidebar-title">Start Here</div><div className="quick-start-card"><p>{hasOperationalSetup ? 'Use Today to clear urgent work before browsing modules.' : 'Set up the operating model before creating loose tasks.'}</p><ol className="quick-start-list">{setupSteps.map((step) => <li key={step.id}><strong>{step.complete ? 'Done' : 'Next'}:</strong> {step.title}</li>)}</ol></div></div><div className="sidebar-section"><div className="sidebar-title">Jump To</div><button className="sidebar-item" onClick={() => { setActiveSection('tasks'); setActiveFilter('due_today'); }}><Clock3 size={14} />Due Today</button><button className="sidebar-item" onClick={() => setActiveSection('blocked')}><AlertTriangle size={14} />Blocked</button><button className="sidebar-item" onClick={() => setActiveSection('reports')}><FileText size={14} />Reports</button></div></> : activeSection === 'tasks' ? <><div className="sidebar-section"><div className="sidebar-title">Quick Start</div><div className="quick-start-card" data-tour="tasks.quick-start"><p>Start here to keep work current and visible.</p><ol className="quick-start-list"><li>Review <strong>My Work</strong> and <strong>Due Today</strong>.</li><li>Open each task and update status as work moves.</li><li>Add a work log when progress or context matters.</li><li>Mark blockers immediately so leads can intervene.</li></ol><button className="quick-start-button" onClick={() => startTour('tasks')}>{progress.tasks?.completed ? 'Replay tasks tour' : 'Start tasks tour'}</button></div></div><div className="sidebar-section"><div className="sidebar-title">Saved Views</div><button className={activeFilter === 'my_work' ? 'sidebar-item is-active' : 'sidebar-item'} onClick={() => setActiveFilter('my_work')}><ListTodo size={14} />My Tasks</button><button className={activeFilter === 'due_today' ? 'sidebar-item is-active' : 'sidebar-item'} onClick={() => setActiveFilter('due_today')}><Clock3 size={14} />Due Today</button><button className={activeFilter === 'blocked' ? 'sidebar-item is-active' : 'sidebar-item'} onClick={() => setActiveFilter('blocked')}><AlertTriangle size={14} />Blocked</button></div><div className="sidebar-section"><div className="sidebar-title">Projects</div>{projects.length > 0 ? projects.map((project) => <button key={project.id} className="sidebar-item" onClick={() => { setSelectedProjectId(project.id); setActiveSection('projects'); }}><FolderKanban size={14} /><span>{project.name}</span></button>) : <div className="sidebar-item static"><span>No projects yet. Create one to begin.</span></div>}</div></> : activeSection === 'projects' ? <><div className="sidebar-section" data-tour="projects.sidebar"><div className="sidebar-title">Project Shells</div>{projects.length > 0 ? projects.map((project) => <button key={project.id} className={selectedProject?.id === project.id ? 'sidebar-item is-active' : 'sidebar-item'} onClick={() => setSelectedProjectId(project.id)}><FolderKanban size={14} /><span>{project.name}</span></button>) : <div className="sidebar-item static"><span>No projects created yet.</span></div>}</div><div className="sidebar-section"><div className="sidebar-title">Phases</div>{selectedProjectPhases.length > 0 ? <><button className={selectedProjectPhaseId === null ? 'sidebar-item is-active' : 'sidebar-item'} onClick={() => setSelectedProjectPhaseId(null)}><span>All phases</span></button>{selectedProjectPhases.map((phase) => <button key={phase.id} className={selectedProjectPhaseId === phase.id ? 'sidebar-item is-active' : 'sidebar-item'} onClick={() => setSelectedProjectPhaseId(phase.id)}><span>{phase.name}</span><small>{`W${phase.startWeek}-W${phase.endWeek}`}</small></button>)}</> : <div className="sidebar-item static"><span>No phases yet. Add one from the workbench.</span></div>}</div><div className="sidebar-section"><div className="sidebar-title">Project Actions</div><div className="sidebar-item static"><span>{selectedProject ? `${selectedProjectTasks.length} project tasks` : 'Select a project shell'}</span></div><div className="sidebar-item static"><span>{selectedProject?.ownerLabel ?? selectedProjectSummary?.ownerName ?? 'No owner label yet'}</span></div></div><div className="sidebar-section"><div className="sidebar-title">Report Obligations</div>{selectedProjectReportObligations.length > 0 ? selectedProjectReportObligations.map(({ template, matchingReports, nextDueLabel, ownerLabel }) => <div key={template.id} className="project-report-obligation"><div><strong>{template.name}</strong><small>{template.cadence} · {nextDueLabel} · {ownerLabel}</small><small>{matchingReports.length} matching report{matchingReports.length === 1 ? '' : 's'}</small></div><button className="ghost-button" onClick={() => handleCreateProjectReport(template)}>Create</button></div>) : <div className="sidebar-item static"><span>No report templates configured.</span></div>}</div></> : activeSection === 'team' ? <div className="sidebar-section" data-tour="team.sidebar"><div className="sidebar-title">Team Members</div>{filteredTeamSummaries.length > 0 ? filteredTeamSummaries.map((summary) => <button key={summary.user.id} className={selectedTeamSummary?.user.id === summary.user.id ? 'sidebar-item is-active' : 'sidebar-item'} onClick={() => setSelectedUserId(summary.user.id)}><Users size={14} /><span>{summary.user.name}</span></button>) : <div className="sidebar-item static"><span>No team members match the current load filters.</span></div>}</div> : activeSection === 'reports' ? <><div className="sidebar-section"><div className="sidebar-title">Report Status</div><div className="sidebar-item static"><span>{reports.filter((report) => report.status === 'draft').length} drafts in progress</span></div><div className="sidebar-item static"><span>{reports.filter((report) => report.status === 'submitted').length} awaiting review</span></div><div className="sidebar-item static"><span>{reports.filter((report) => report.status === 'approved').length} approved reports</span></div></div><div className="sidebar-section"><div className="sidebar-title">Recent Reports</div>{reports.slice(0, 5).map((report) => <button key={report.id} className={selectedReportRecord?.id === report.id ? 'sidebar-item is-active' : 'sidebar-item'} onClick={() => setSelectedReportId(report.id)}><FileText size={14} /><span>{report.title}</span></button>)}</div></> : activeSection === 'analytics' ? <><div className="sidebar-section"><div className="sidebar-title">Outcome</div><div className="sidebar-item static"><span>{analyticsSummary.completionRate}% completion rate</span></div><div className="sidebar-item static"><span>{analyticsSummary.avgProgress}% average progress</span></div></div><div className="sidebar-section"><div className="sidebar-title">Load</div><div className="sidebar-item static"><span>{analyticsSummary.busiestTeamMember} at {analyticsSummary.busiestTeamLoad}% utilization</span></div></div></> : activeSection === 'settings' ? <><div className="sidebar-section"><div className="sidebar-title">Templates</div><div className="sidebar-item static"><span>{taskTemplates.length} task templates</span></div><div className="sidebar-item static"><span>{reportTemplates.length} report templates</span></div></div><div className="sidebar-section"><div className="sidebar-title">Automation Health</div><div className="sidebar-item static"><span>{settingsSummary.activeAutomations} active rules</span></div><div className="sidebar-item static"><span>{automationRules.length - settingsSummary.activeAutomations} drafts</span></div></div></> : <div className="sidebar-section"><div className="sidebar-title">Escalation Views</div><div className="sidebar-item static"><AlertTriangle size={14} /><span>All blockers</span></div></div>}
        </aside>

        <main className="content">
          {activeSection === 'today' ? <section className="today-shell"><div className="today-hero panel"><div><span className="today-kicker">Operations today</span><h2>{hasOperationalSetup ? 'Clear the day before browsing modules' : 'Set up the operating model first'}</h2><p>{hasOperationalSetup ? 'Today brings together assigned work, due dates, blockers, reviews, report cadence, and team gaps so the next action is obvious.' : 'TaskOps needs team, project, and first-work context before the task board becomes useful.'}</p></div><div className="today-actions"><button className="primary-button" onClick={() => openSetupWizard()}><Plus size={16} />Setup Wizard</button><button className="ghost-button" onClick={handleRequestCreateTask}><Plus size={16} />New Task</button><button className="ghost-button" onClick={() => setIsCreateProjectOpen(true)}><FolderKanban size={16} />Create Project</button></div></div><div className="today-kpi-grid"><button className="metric-box project-card" onClick={() => { setActiveSection('tasks'); setActiveFilter('my_work'); }}><strong>{myTasks.length}</strong><span>My tasks</span></button><button className="metric-box project-card" onClick={() => { setActiveSection('tasks'); setActiveFilter('due_today'); }}><strong>{todayTasks.length}</strong><span>Due today</span></button><button className="metric-box project-card" onClick={() => setActiveSection('blocked')}><strong>{blockedTasks.length}</strong><span>Blocked</span></button><button className="metric-box project-card" onClick={() => setActiveSection('reports')}><strong>{reportsDue.length}</strong><span>Reports due</span></button><button className="metric-box project-card" onClick={() => setActiveSection('reports')}><strong>{reportsAwaitingReview.length}</strong><span>Awaiting review</span></button><button className="metric-box project-card" onClick={() => setActiveSection('team')}><strong>{teamGapCount}</strong><span>Team gaps</span></button></div>{!hasOperationalSetup ? <div className="today-setup-grid">{setupSteps.map((step, index) => <button key={step.id} className={`today-setup-card ${step.complete ? 'is-complete' : ''}`} onClick={step.onClick}><span>{step.complete ? '✓' : index + 1}</span><div><strong>{step.title}</strong><p>{step.body}</p><small>{step.action}</small></div></button>)}</div> : null}<div className="today-grid"><section className="today-card"><div className="today-card-head"><h3>Work Queue</h3><button className="ghost-button" onClick={() => { setActiveSection('tasks'); setActiveFilter('due_today'); }}>Open Tasks</button></div>{todayTasks.length > 0 ? todayTasks.slice(0, 5).map((task) => <button key={task.id} className="today-row" onClick={() => handleOpenTask(task.id)}><div><strong>{task.title}</strong><small>{users.find((user) => user.id === task.ownerId)?.name ?? 'Unassigned'} · {projects.find((project) => project.id === task.projectId)?.name ?? 'No project'}</small></div><TaskPriorityBadge priority={task.priority} /></button>) : <div className="today-empty"><Clock3 size={16} /><span>No tasks due today.</span></div>}</section><section className="today-card"><div className="today-card-head"><h3>Risk Queue</h3><button className="ghost-button" onClick={() => setActiveSection('blocked')}>Open Blocked</button></div>{blockedTasks.length > 0 ? blockedTasks.slice(0, 5).map((task) => <button key={task.id} className="today-row" onClick={() => handleOpenTask(task.id)}><div><strong>{task.title}</strong><small>{task.blocker?.reason ?? 'Marked blocked'}</small></div><TaskStatusBadge status="blocked" /></button>) : <div className="today-empty"><AlertTriangle size={16} /><span>No blocked work right now.</span></div>}</section><section className="today-card"><div className="today-card-head"><h3>Report Queue</h3><button className="ghost-button" onClick={() => setActiveSection('reports')}>Open Reports</button></div>{[...reportsNeedingAttention, ...reportsAwaitingReview, ...reportsDue].slice(0, 5).map((report) => <button key={report.id} className="today-row" onClick={() => { setSelectedReportId(report.id); setActiveSection('reports'); }}><div><strong>{report.title}</strong><small>{report.roleName} · {report.reportingWindow}</small></div><span className="status-badge status-blue">{formatReportStatus(report.status)}</span></button>)}{reportsNeedingAttention.length + reportsAwaitingReview.length + reportsDue.length === 0 ? <div className="today-empty"><FileText size={16} /><span>No report actions waiting.</span></div> : null}</section></div></section> : null}
          {activeSection === 'tasks' && activeView === 'list' ? <section className="panel" data-tour="tasks.list-panel"><div className="table-head" data-tour="tasks.table-head"><span /><span>Task</span><span>Status</span><span>Priority</span><span>Owner</span><span>Due</span><span>Progress</span></div>{filteredTasks.length > 0 ? filteredTasks.map((task, index) => { const owner = users.find((user) => user.id === task.ownerId); return <button key={task.id} data-tour={index === 0 ? 'tasks.first-row' : undefined} className={selectedTaskId === task.id ? 'table-row is-selected' : 'table-row'} onClick={() => setSelectedTaskId(task.id)}><span className={selectedTaskIds.includes(task.id) ? 'select-box is-selected' : 'select-box'} onClick={(event) => { event.stopPropagation(); toggleTaskSelection(task.id); }} /><span className="task-cell"><strong>{task.title}</strong><small>{task.tags.join(' · ') || (task.projectId ? projects.find((project) => project.id === task.projectId)?.name : 'No project assigned')}</small></span><span><TaskStatusBadge status={task.status} /></span><span><TaskPriorityBadge priority={task.priority} /></span><span>{owner?.name ?? 'Unassigned'}</span><span>{task.dueAt ? formatDateTimeLabel(new Date(task.dueAt)) : 'No due date'}</span><span>{task.progress}%</span></button>; }) : <div className="placeholder-panel inset"><ListTodo size={18} /><h2>{activeFilter === 'my_work' ? 'No work assigned yet' : 'No tasks yet'}</h2><p>{activeFilter === 'my_work' ? 'Create your first task or switch to All to browse shared work.' : 'Create a task to start managing real work in TaskOps.'}</p><div className="modal-actions"><button className="ghost-button" onClick={() => setActiveFilter('all')}>Browse All Tasks</button><button className="primary-button" onClick={handleRequestCreateTask}><Plus size={16} />Create Task</button></div></div>}</section> : null}
          {activeSection === 'tasks' && activeView === 'board' ? <section className="kanban">{boardColumns.map((column) => <div key={column} className="kanban-column"><div className="kanban-header"><span>{statusLabel[column]}</span><span>{filteredTasks.filter((task) => task.status === column).length}</span></div>{filteredTasks.filter((task) => task.status === column).map((task) => <button key={task.id} className="kanban-card" onClick={() => setSelectedTaskId(task.id)}><div className="kanban-card-head"><TaskPriorityBadge priority={task.priority} /><span>{task.progress}%</span></div><strong>{task.title}</strong><small>{projects.find((project) => project.id === task.projectId)?.name ?? 'No project'}</small></button>)}</div>)}</section> : null}
          {activeSection === 'tasks' && activeView === 'timeline' ? <section className="timeline-board">{timelineGroups.length > 0 ? timelineGroups.map((group) => <div key={group.id} className="timeline-group"><div className="timeline-group-head"><h3>{group.label}</h3><span>{group.tasks.length}</span></div><div className="timeline-list">{group.tasks.map((task) => <button key={task.id} className={selectedTaskId === task.id ? 'timeline-card is-selected' : 'timeline-card'} onClick={() => setSelectedTaskId(task.id)}><div className="timeline-card-head"><TaskPriorityBadge priority={task.priority} /><TaskStatusBadge status={task.status} /></div><strong>{task.title}</strong><small>{projects.find((project) => project.id === task.projectId)?.name ?? 'No project'} · {users.find((user) => user.id === task.ownerId)?.name ?? 'Unassigned'}</small><div className="timeline-card-meta"><span>{task.dueAt ? formatDayLabel(new Date(task.dueAt)) : 'No due date'}</span><span>{task.progress}%</span></div></button>)}</div></div>) : <section className="placeholder-panel"><Clock3 size={18} /><h2>No scheduled tasks yet</h2><p>No tasks match this view yet. Add a due date or adjust your filters to populate the timeline.</p></section>}</section> : null}
          {activeSection === 'tasks' && activeView === 'calendar' ? <section className="calendar-board"><div className="calendar-header"><h2>{calendarDays.label}</h2><p>Use the calendar to see due-date pressure across the shared task model.</p></div><div className="calendar-grid calendar-weekdays">{['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map((day) => <span key={day}>{day}</span>)}</div><div className="calendar-grid">{calendarDays.days.map((day) => <div key={day.date.toISOString()} className={day.inMonth ? 'calendar-cell' : 'calendar-cell is-muted'}><div className="calendar-cell-head"><span>{day.date.getDate()}</span>{isSameDay(day.date, getCurrentDate()) ? <span className="calendar-today">Today</span> : null}</div><div className="calendar-cell-list">{day.tasks.slice(0, 3).map((task) => <button key={task.id} className={selectedTaskId === task.id ? 'calendar-task is-selected' : 'calendar-task'} onClick={() => setSelectedTaskId(task.id)}>{task.title}</button>)}{day.tasks.length > 3 ? <span className="calendar-overflow">+{day.tasks.length - 3} more</span> : null}</div></div>)}</div></section> : null}
          {activeSection === 'projects' ? <ProjectWorkbench project={selectedProject} phases={selectedProjectPhases} tasks={selectedProjectTasks} users={users} selectedPhaseId={selectedProjectPhaseId} onSelectPhase={setSelectedProjectPhaseId} onCreateProject={() => setIsCreateProjectOpen(true)} onAddPhase={addProjectPhase} onUpdateProject={updateProject} onAddTask={addTask} onOpenTask={handleOpenTask} /> : null}
          {activeSection === 'team' ? <section className="team-module-shell"><div className="team-overview-card settings-card" data-tour="team.filters"><div className="team-card-top"><div><h3>Team View</h3><p className="settings-copy">Filter and analyze team workload distribution</p></div><div className="team-filter-cluster"><div className="team-filter-row"><button className={selectedTeamName === 'all' ? 'chip is-active' : 'chip'} onClick={() => setSelectedTeamName('all')}>All Teams</button>{teamDirectory.map((team) => <button key={team.name} className={selectedTeamName === team.name ? 'chip is-active' : 'chip'} onClick={() => setSelectedTeamName(team.name)}>{team.name}</button>)}</div><div className="team-filter-row"><button className={teamLoadFilters.includes('overloaded') ? 'chip is-active' : 'chip'} onClick={() => toggleTeamLoadFilter('overloaded')}>Overloaded</button><button className={teamLoadFilters.includes('blocked') ? 'chip is-active' : 'chip'} onClick={() => toggleTeamLoadFilter('blocked')}>Has Blocked Tasks</button><button className={teamLoadFilters.includes('overdue') ? 'chip is-active' : 'chip'} onClick={() => toggleTeamLoadFilter('overdue')}>Has Overdue Tasks</button>{teamLoadFilters.length > 0 || selectedTeamName !== 'all' ? <button className="ghost-button" onClick={() => { setTeamLoadFilters([]); setSelectedTeamName('all'); }}>Clear view</button> : null}</div></div></div><div className="team-kpi-row"><button className="metric-box project-card" onClick={() => setTeamLoadFilters([])}><strong>{selectedTeamViewSummary.memberCount}</strong><span>{selectedTeamName === 'all' ? 'Visible Members' : 'Team Members'}</span></button><button className="metric-box project-card" onClick={() => setTeamLoadFilters([])}><strong>{selectedTeamViewSummary.openCount}</strong><span>Open Tasks</span></button><button className="metric-box project-card" onClick={() => applyExclusiveTeamLoadFilter('blocked')}><strong>{selectedTeamViewSummary.blockedCount}</strong><span>Blocked Work</span></button><button className="metric-box project-card" onClick={() => applyExclusiveTeamLoadFilter('overdue')}><strong>{selectedTeamViewSummary.overdueCount}</strong><span>Overdue Work</span></button><button className="metric-box project-card" onClick={() => applyExclusiveTeamLoadFilter('overloaded')}><strong>{selectedTeamViewSummary.avgUtilization}%</strong><span>Avg Utilization</span></button></div></div><div className="team-management-grid"><div className="settings-card"><div className="team-section-head"><div><h3>Team Directory</h3><p className="settings-copy">Create and manage teams</p></div><span className="status-badge status-blue">{teamDirectory.length} teams</span></div><p className="team-card-copy">Create multiple teams here, then assign members into them. Deleting a team moves its members to <strong>Unassigned</strong>.</p><div className="settings-form-grid"><label className="settings-field settings-field-full"><span>Team Name</span><input value={teamDraftName} onChange={(event) => setTeamDraftName(event.target.value)} placeholder="Field Operations, Compliance, Finance..." /></label></div><div className="settings-actions"><button className="primary-button" onClick={handleAddTeam}>Create Team</button>{!canManageTeams ? <span className="text-xs text-gray-500">Only admins can delete teams.</span> : null}</div><div className="settings-list">{teamDirectory.length > 0 ? teamDirectory.map((team) => <div key={team.name} className="settings-list-row"><div><strong>{team.name}</strong><small>{team.memberCount} members · {team.totalOpen} open tasks</small></div><div className="settings-actions"><button className="ghost-button" onClick={() => setSelectedTeamName(team.name)}>View Team</button>{team.name === 'Unassigned' ? <span className="status-badge status-slate">Protected</span> : null}{canManageTeams && team.name !== 'Unassigned' ? <button className="ghost-button" onClick={() => handleDeleteTeam(team.name)}><Trash2 size={14} />Delete Team</button> : null}</div></div>) : <div className="team-inline-empty"><Users size={18} /><span>No teams yet. Create the first one before adding members.</span></div>}</div></div><div className="settings-card" data-tour="team.management"><div className="team-section-head"><div><h3>Member Management</h3><p className="settings-copy">Add and configure team members</p></div><button data-tour="team.import" className="primary-button team-import-button" onClick={() => setShowImportWizard(true)}><Upload size={14} />Import Agricultural Roles</button></div><p className="team-card-copy">Create the owner list here first. Project owners now come from this saved team-member dataset.</p><div className="settings-form-grid"><label className="settings-field"><span>Name</span><input value={teamMemberDraft.name} onChange={(event) => setTeamMemberDraft((current) => ({ ...current, name: event.target.value }))} placeholder="Full name" /></label><label className="settings-field"><span>Position</span><input value={teamMemberDraft.position} onChange={(event) => setTeamMemberDraft((current) => ({ ...current, position: event.target.value }))} placeholder="e.g., Field Supervisor, Agronomist" /></label><label className="settings-field"><span>Role</span><select value={teamMemberDraft.role} onChange={(event) => setTeamMemberDraft((current) => ({ ...current, role: event.target.value as UserRole }))}><option value="member">Member</option><option value="manager">Manager</option><option value="admin">Admin</option><option value="guest">Guest</option></select></label><label className="settings-field"><span>Team</span>{teams.length > 0 ? <select value={teamMemberDraft.team} onChange={(event) => setTeamMemberDraft((current) => ({ ...current, team: event.target.value }))}><option value="">Unassigned</option>{teams.map((team) => <option key={team} value={team}>{team}</option>)}</select> : <input value={teamMemberDraft.team} onChange={(event) => setTeamMemberDraft((current) => ({ ...current, team: event.target.value }))} placeholder="Unassigned" />}</label><label className="settings-field"><span>Capacity / Week</span><input type="number" min="1" value={teamMemberDraft.capacityHoursPerWeek} onChange={(event) => setTeamMemberDraft((current) => ({ ...current, capacityHoursPerWeek: event.target.value }))} placeholder="40" /></label></div><div className="settings-actions"><button className="primary-button" onClick={handleAddTeamMember}>Add Team Member</button></div></div></div><div className="settings-card team-roster-card" data-tour="team.roles"><div className="team-roster-header"><div><h3>Member Roster</h3><p className="settings-copy">{filteredTeamSummaries.length} team member{filteredTeamSummaries.length !== 1 ? 's' : ''}</p></div><div className="roster-view-toggle"><button className={rosterViewMode === 'list' ? 'view-toggle-btn is-active' : 'view-toggle-btn'} onClick={() => setRosterViewMode('list')} title="List view"><ListTodo size={16} /></button><button className={rosterViewMode === 'grid' ? 'view-toggle-btn is-active' : 'view-toggle-btn'} onClick={() => setRosterViewMode('grid')} title="Grid view"><LayoutGrid size={16} /></button></div></div>{filteredTeamSummaries.length > 0 ? rosterViewMode === 'list' ? <div className="team-roster-list">{filteredTeamSummaries.map((summary) => { const agriRole = summary.user.agriculturalRole; const isEditing = editingUserId === summary.user.id; return <div key={summary.user.id} className={selectedTeamSummary?.user.id === summary.user.id ? 'team-roster-row is-selected' : 'team-roster-row'} onClick={() => !isEditing && setSelectedUserId(summary.user.id)}><div className="team-roster-copy">{isEditing ? <div className="inline-edit-form" onClick={(e) => e.stopPropagation()}><input className="inline-edit-input" value={inlineEditDraft.name} onChange={(e) => setInlineEditDraft(d => ({ ...d, name: e.target.value }))} placeholder="Name" /><input className="inline-edit-input" value={inlineEditDraft.position} onChange={(e) => setInlineEditDraft(d => ({ ...d, position: e.target.value }))} placeholder="Position" /><select className="inline-edit-select" value={inlineEditDraft.role} onChange={(e) => setInlineEditDraft(d => ({ ...d, role: e.target.value as UserRole }))}><option value="member">Member</option><option value="manager">Manager</option><option value="admin">Admin</option><option value="guest">Guest</option></select><input className="inline-edit-input" value={inlineEditDraft.team} onChange={(e) => setInlineEditDraft(d => ({ ...d, team: e.target.value }))} placeholder="Team" /><input type="number" className="inline-edit-input" value={inlineEditDraft.capacityHoursPerWeek} onChange={(e) => setInlineEditDraft(d => ({ ...d, capacityHoursPerWeek: e.target.value }))} placeholder="Capacity" /><div className="inline-edit-actions"><button className="ghost-button" onClick={() => { updateUser(summary.user.id, { name: inlineEditDraft.name, position: inlineEditDraft.position || undefined, role: inlineEditDraft.role, team: inlineEditDraft.team, capacityHoursPerWeek: Number(inlineEditDraft.capacityHoursPerWeek) || undefined }); setEditingUserId(null); }}>Save</button><button className="ghost-button" onClick={() => { handleDeleteTeamMember(summary.user.id); setEditingUserId(null); }}>Delete</button><button className="ghost-button" onClick={() => setEditingUserId(null)}>Cancel</button></div></div> : <><strong>{summary.user.name}</strong><small>{summary.user.position ? `${summary.user.position} · ` : ''}{summary.user.role} · {summary.user.team}{agriRole ? ` · ${categoryLabels[agriRole.category]}` : ''}</small><button className="ghost-button inline-edit-btn" onClick={(e) => { e.stopPropagation(); setEditingUserId(summary.user.id); setInlineEditDraft({ name: summary.user.name, position: summary.user.position || '', role: summary.user.role, team: summary.user.team, capacityHoursPerWeek: String(summary.user.capacityHoursPerWeek || 40) }); }}>Edit</button></>}</div><div className="team-roster-metrics"><span>{summary.openCount} open</span><span>{summary.blockedCount} blocked</span><span>{summary.overdueCount} overdue</span><span>{summary.utilization}% load</span></div></div>; })}</div> : <div className="team-roster-grid">{filteredTeamSummaries.map((summary) => { const agriRole = summary.user.agriculturalRole; const isEditing = editingUserId === summary.user.id; return <div key={summary.user.id} className={selectedTeamSummary?.user.id === summary.user.id ? 'team-roster-card-item is-selected' : 'team-roster-card-item'} onClick={() => !isEditing && setSelectedUserId(summary.user.id)}>{isEditing ? <div className="inline-edit-form" onClick={(e) => e.stopPropagation()}><input className="inline-edit-input" value={inlineEditDraft.name} onChange={(e) => setInlineEditDraft(d => ({ ...d, name: e.target.value }))} placeholder="Name" /><input className="inline-edit-input" value={inlineEditDraft.position} onChange={(e) => setInlineEditDraft(d => ({ ...d, position: e.target.value }))} placeholder="Position" /><select className="inline-edit-select" value={inlineEditDraft.role} onChange={(e) => setInlineEditDraft(d => ({ ...d, role: e.target.value as UserRole }))}><option value="member">Member</option><option value="manager">Manager</option><option value="admin">Admin</option><option value="guest">Guest</option></select><input className="inline-edit-input" value={inlineEditDraft.team} onChange={(e) => setInlineEditDraft(d => ({ ...d, team: e.target.value }))} placeholder="Team" /><input type="number" className="inline-edit-input" value={inlineEditDraft.capacityHoursPerWeek} onChange={(e) => setInlineEditDraft(d => ({ ...d, capacityHoursPerWeek: e.target.value }))} placeholder="Capacity" /><div className="inline-edit-actions"><button className="ghost-button" onClick={() => { updateUser(summary.user.id, { name: inlineEditDraft.name, position: inlineEditDraft.position || undefined, role: inlineEditDraft.role, team: inlineEditDraft.team, capacityHoursPerWeek: Number(inlineEditDraft.capacityHoursPerWeek) || undefined }); setEditingUserId(null); }}>Save</button><button className="ghost-button" onClick={() => { handleDeleteTeamMember(summary.user.id); setEditingUserId(null); }}>Delete</button><button className="ghost-button" onClick={() => setEditingUserId(null)}>Cancel</button></div></div> : <><div className="team-roster-card-header"><div className="team-roster-avatar"><Users size={20} /></div><div className="team-roster-card-info"><strong>{summary.user.name}</strong><small>{summary.user.position ? `${summary.user.position} · ` : ''}{summary.user.role}</small></div></div><div className="team-roster-card-body"><p className="team-roster-card-team">{summary.user.team}{agriRole ? ` · ${categoryLabels[agriRole.category]}` : ''}</p><div className="team-roster-card-metrics"><span>{summary.openCount} open</span><span>{summary.blockedCount} blocked</span><span>{summary.overdueCount} overdue</span><span>{summary.utilization}% load</span></div></div><div className="team-roster-card-actions"><button className="ghost-button" onClick={(e) => { e.stopPropagation(); setEditingUserId(summary.user.id); setInlineEditDraft({ name: summary.user.name, position: summary.user.position || '', role: summary.user.role, team: summary.user.team, capacityHoursPerWeek: String(summary.user.capacityHoursPerWeek || 40) }); }}>Edit</button></div></>}</div>; })}</div> : <div className="team-empty-banner"><Users size={18} /><div><h2>No team members yet</h2><p>Add the first team member here. The Create Project modal will stay owner-driven from this list only.</p></div></div>}</div></section> : null}

          {showImportWizard && <HrImportWizard onClose={closeRoleImport} onComplete={closeRoleImport} />}
          {activeSection === 'reports' ? <ReportsModule /> : null}
          {activeSection === 'analytics' ? <section className="space-y-4"><div className="flex items-center gap-2 mb-4" data-tour="analytics.tabs"><button data-tour="analytics.tab.task" className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${analyticsView === 'task' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`} onClick={() => setAnalyticsView('task')}>Operational Health</button><button data-tour="analytics.tab.labor" className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${analyticsView === 'labor' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`} onClick={() => setAnalyticsView('labor')}>Labor Cost</button></div>{analyticsView === 'task' ? <div className="analytics-grid" data-tour="analytics.task-overview"><div className="analytics-card analytics-kpis"><div className="project-metrics-grid analytics-compact"><button className="project-metric" onClick={() => { setActiveSection('tasks'); setActiveFilter('all'); }}><strong>{analyticsSummary.completionRate}%</strong><span>Completion</span></button><button className="project-metric" onClick={() => { setActiveSection('tasks'); setActiveFilter('overdue'); }}><strong>{analyticsSummary.overdueCount}</strong><span>Overdue</span></button><button className="project-metric" onClick={() => { setActiveSection('blocked'); }}><strong>{analyticsSummary.blockedCount}</strong><span>Blocked</span></button><button className="project-metric" onClick={() => { setActiveSection('reports'); }}><strong>{analyticsSummary.reportVolume}</strong><span>Reports</span></button><button className="project-metric" onClick={() => { setActiveSection('tasks'); setActiveFilter('review'); }}><strong>{tasks.filter(t => t.status === 'review').length}</strong><span>In Review</span></button><button className="project-metric" onClick={() => { setActiveSection('tasks'); setActiveFilter('my_work'); }}><strong>{tasks.filter(t => t.ownerId === currentUserId).length}</strong><span>My Tasks</span></button></div></div><div className="analytics-card" data-tour="analytics.project-performance"><div className="analytics-card-head"><h3>Project Performance</h3><span>{analyticsSummary.activeProjects} active projects</span></div><div className="analytics-list">{projectSummaries.slice(0, 4).map((summary) => <div key={summary.project.id} className="analytics-list-row"><div><strong>{summary.project.name}</strong><small>{summary.openCount} open · {summary.blockedCount} blocked · {summary.avgProgress}% progress</small></div><span>{summary.loggedHours}h</span></div>)}</div></div><div className="analytics-card"><div className="analytics-card-head"><h3>Team Load</h3><span>{analyticsSummary.busiestTeamMember}</span></div><div className="analytics-list">{teamSummaries.slice(0, 4).map((summary) => <div key={summary.user.id} className="analytics-list-row"><div><strong>{summary.user.name}</strong><small>{summary.openCount} open · {summary.blockedCount} blocked · {summary.overdueCount} overdue</small></div><span>{summary.utilization}%</span></div>)}</div></div></div> : <LaborCostAnalytics />}</section> : null}
          {activeSection === 'settings' ? <section className="settings-grid"><div className="settings-card settings-kpis"><div className="project-metrics-grid settings-compact"><div className="project-metric"><strong>{settingsSummary.activeAutomations}</strong><span>Active automations</span></div><div className="project-metric"><strong>{settingsSummary.taskTemplateCount}</strong><span>Task templates</span></div><div className="project-metric"><strong>{settingsSummary.reportTemplateCount}</strong><span>Report templates</span></div><div className="project-metric"><strong>{settingsSummary.escalationRules}</strong><span>Escalation rules</span></div></div></div><div className="settings-card" data-tour="settings.automations"><h3>Automation Rules</h3><div className="settings-form-grid"><label className="settings-field settings-field-full"><span>Name</span><input value={ruleDraft.name} onChange={(event) => setRuleDraft((current) => ({ ...current, name: event.target.value }))} placeholder="New automation rule" /></label><label className="settings-field settings-field-full"><span>Description</span><textarea value={ruleDraft.description} onChange={(event) => setRuleDraft((current) => ({ ...current, description: event.target.value }))} placeholder="What should this automation do?" /></label><label className="settings-field"><span>Trigger</span><select value={ruleDraft.trigger} onChange={(event) => setRuleDraft((current) => ({ ...current, trigger: event.target.value as AutomationRule['trigger'] }))}><option value="task_overdue">Task overdue</option><option value="task_blocked">Task blocked</option><option value="report_due">Report due</option><option value="task_created">Task created</option></select></label><label className="settings-field"><span>Action</span><select value={ruleDraft.action} onChange={(event) => setRuleDraft((current) => ({ ...current, action: event.target.value as AutomationRule['action'] }))}><option value="notify_owner">Notify owner</option><option value="escalate">Escalate</option><option value="create_report_task">Create report task</option><option value="route_review">Route review</option></select></label></div><div className="settings-actions"><button className="primary-button" onClick={handleAddAutomationRule}>Add Rule</button></div><div className="settings-list">{automationRules.map((rule) => <div key={rule.id} className="settings-list-row"><div className="settings-form-grid"><label className="settings-field settings-field-full"><span>Name</span><input value={rule.name} onChange={(event) => updateAutomationRule(rule.id, { name: event.target.value })} /></label><label className="settings-field settings-field-full"><span>Description</span><textarea value={rule.description} onChange={(event) => updateAutomationRule(rule.id, { description: event.target.value })} /></label></div><div className="settings-actions"><button className="ghost-button" onClick={() => toggleAutomationRuleStatus(rule.id)}>Toggle {rule.status}</button><span className={`status-badge ${rule.status === 'active' ? 'status-green' : 'status-slate'}`}>{rule.status}</span></div></div>)}</div></div><div className="settings-card" data-tour="settings.task-templates"><h3>Task Templates</h3><div className="settings-form-grid"><label className="settings-field settings-field-full"><span>Name</span><input value={taskTemplateDraft.name} onChange={(event) => setTaskTemplateDraft((current) => ({ ...current, name: event.target.value }))} placeholder="New task template" /></label><label className="settings-field settings-field-full"><span>Description</span><textarea value={taskTemplateDraft.description} onChange={(event) => setTaskTemplateDraft((current) => ({ ...current, description: event.target.value }))} placeholder="When should this template be used?" /></label></div><div className="settings-actions"><button className="primary-button" onClick={handleAddTaskTemplate}>Add Task Template</button></div><div className="settings-list">{taskTemplates.map((template) => <div key={template.id} className="settings-list-row"><div className="settings-form-grid"><label className="settings-field settings-field-full"><span>Name</span><input value={template.name} onChange={(event) => updateTaskTemplate(template.id, { name: event.target.value })} /></label><label className="settings-field settings-field-full"><span>Description</span><textarea value={template.description} onChange={(event) => updateTaskTemplate(template.id, { description: event.target.value })} /></label></div></div>)}</div></div><div className="settings-card" data-tour="settings.report-templates"><h3>Report Templates</h3><div className="settings-form-grid"><label className="settings-field settings-field-full"><span>Name</span><input value={reportTemplateDraft.name} onChange={(event) => setReportTemplateDraft((current) => ({ ...current, name: event.target.value }))} placeholder="New report template" /></label><label className="settings-field settings-field-full"><span>Description</span><textarea value={reportTemplateDraft.description} onChange={(event) => setReportTemplateDraft((current) => ({ ...current, description: event.target.value }))} placeholder="What reporting job does this support?" /></label><label className="settings-field"><span>Cadence</span><select value={reportTemplateDraft.cadence} onChange={(event) => setReportTemplateDraft((current) => ({ ...current, cadence: event.target.value as ReportTemplate['cadence'] }))}><option value="weekly">Weekly</option><option value="monthly">Monthly</option><option value="quarterly">Quarterly</option></select></label><label className="settings-field"><span>Reviewer</span><input value={reportTemplateDraft.reviewerLabel} onChange={(event) => setReportTemplateDraft((current) => ({ ...current, reviewerLabel: event.target.value }))} placeholder="Reviewer role or owner" /></label></div><div className="settings-actions"><button className="primary-button" onClick={handleAddReportTemplate}>Add Report Template</button></div><div className="settings-list">{reportTemplates.map((template) => <div key={template.id} className="settings-list-row"><div className="settings-form-grid"><label className="settings-field settings-field-full"><span>Name</span><input value={template.name} onChange={(event) => updateReportTemplate(template.id, { name: event.target.value })} /></label><label className="settings-field settings-field-full"><span>Description</span><textarea value={template.description} onChange={(event) => updateReportTemplate(template.id, { description: event.target.value })} /></label></div></div>)}</div></div></section> : null}
          {activeSection === 'blocked' ? <section className="blocked-panel">{blockedTasks.length > 0 ? blockedTasks.slice().sort((left, right) => { const leftAge = left.blocker?.blockedAt ? Date.now() - new Date(left.blocker.blockedAt).getTime() : 0; const rightAge = right.blocker?.blockedAt ? Date.now() - new Date(right.blocker.blockedAt).getTime() : 0; const leftUrgency = (left.priority === 'P1' ? 100 : left.priority === 'P2' ? 70 : 40) + (isOverdue(left.dueAt) ? 40 : 0) + leftAge; const rightUrgency = (right.priority === 'P1' ? 100 : right.priority === 'P2' ? 70 : 40) + (isOverdue(right.dueAt) ? 40 : 0) + rightAge; return rightUrgency - leftUrgency; }).map((task) => { const blockedAt = task.blocker?.blockedAt ? new Date(task.blocker.blockedAt) : null; const blockedAgeDays = blockedAt ? Math.max(0, Math.floor((Date.now() - blockedAt.getTime()) / (1000 * 60 * 60 * 24))) : 0; return <div key={task.id} className="blocked-card"><div className="blocked-card-head"><div><h3>{task.title}</h3><p>{projects.find((item) => item.id === task.projectId)?.name ?? 'No project'} · {users.find((user) => user.id === task.ownerId)?.name ?? 'Unassigned'}</p></div><div className="blocked-badges"><TaskPriorityBadge priority={task.priority} /><TaskStatusBadge status="blocked" /></div></div><div className="blocked-reason"><AlertTriangle size={15} /><span>{task.blocker?.reason ?? 'Task is marked blocked with no reason yet.'}</span></div><div className="blocked-meta-row"><span>{blockedAgeDays === 0 ? 'Blocked today' : `Blocked ${blockedAgeDays} day${blockedAgeDays === 1 ? '' : 's'}`}</span><span>{task.blocker?.severity ?? 'medium'} severity</span><span>{isOverdue(task.dueAt) ? 'SLA at risk' : 'SLA stable'}</span></div><div className="blocked-card-actions"><button className="ghost-button" onClick={() => handleOpenTask(task.id)}>Open Task</button><button className="ghost-button" onClick={() => updateTask(task.id, { ownerId: currentUserId || task.ownerId })} disabled={!currentUserId}>Reassign to Me</button><button className="primary-button" onClick={() => resolveBlocker(task.id)}>Resolve Blocker</button></div></div>; }) : <div className="placeholder-panel"><AlertTriangle size={18} /><h2>No blocked tasks</h2><p>No blocked tasks right now. The escalation queue is clear.</p></div>}</section> : null}
        </main>

        {activeSection === 'today' ? <SimpleDetailPanel title="Operational Focus" body={hasOperationalSetup ? 'Use this queue to decide what happens next.' : 'Complete the setup steps to unlock meaningful task and project views.'}><section className="detail-section"><div className="section-title">Setup Health</div><div className="project-detail-stack">{setupSteps.map((step) => <div key={step.id}><strong>{step.complete ? 'Ready' : 'Needed'}</strong><p>{step.title}</p></div>)}</div></section><section className="detail-section"><div className="section-title">Next Best Action</div><p>{!users.length ? 'Create or import the team first.' : !projects.length ? 'Create the first project shell.' : !tasks.length ? 'Capture the first task against the project.' : blockedTasks.length ? 'Resolve or reassign blocked work.' : reportsAwaitingReview.length ? 'Review submitted reports.' : 'The day is clear. Add planned work or inspect analytics.'}</p></section></SimpleDetailPanel> : activeSection === 'projects' ? <SimpleDetailPanel title={selectedProject?.name ?? 'Task Manager'} body={selectedProject?.subtitle ?? selectedProject?.ownerLabel ?? 'Project detail'}>{selectedProject ? <><section className="detail-section"><div className="section-title">Project Shell</div><div className="project-detail-stack"><div><strong>Owner Label</strong><p>{selectedProject.ownerLabel ?? selectedProjectSummary?.ownerName ?? 'Unassigned'}</p></div><div><strong>Type</strong><p>{selectedProject.type}</p></div><div><strong>Planning Horizon</strong><p>{selectedProject.totalWeeks ? `${selectedProject.totalWeeks} weeks` : 'Not set yet'}</p></div></div></section><section className="detail-section"><div className="section-title">Phase Outline</div><div className="project-task-list">{selectedProjectPhases.length > 0 ? selectedProjectPhases.map((phase) => <div key={phase.id} className="project-task-button"><div><strong>{phase.name}</strong><small>{phase.description ?? 'No phase description yet'}</small></div><span>{`W${phase.startWeek}-${phase.endWeek}`}</span></div>) : <div className="calm-card">Add phases to build the WBS spine for this project.</div>}</div></section></> : <section className="detail-section"><div className="section-title">Project Shell</div><p>Create the first project to start building structure.</p></section>}</SimpleDetailPanel> : activeSection === 'team' ? <aside className="detail-panel team-detail-panel"><section className="team-side-card"><div className="detail-header"><div className="detail-header-copy"><h2>{selectedTeamName === 'all' ? 'Team' : selectedTeamName}</h2><p>Team detail</p></div></div><div className="team-side-stats"><div><span>Teams</span><strong>{selectedTeamName === 'all' ? teamDirectory.length : 1}</strong></div><div><span>Members</span><strong>{selectedTeamViewSummary.memberCount}</strong></div><div><span>Avg Capacity</span><strong>{selectedTeamAvgCapacity}h</strong></div><div><span>Utilization</span><strong>{selectedTeamViewSummary.avgUtilization > 0 ? `${selectedTeamViewSummary.avgUtilization}%` : '—'}</strong></div></div></section><section className="team-side-card"><div className="team-section-head"><div><h3>Member Profile</h3><p className="settings-copy">Quick stats</p></div></div>{selectedTeamSummary ? <><div className="team-profile-summary"><div className="team-profile-placeholder"><Users size={18} /></div><div><strong>{selectedTeamSummary.user.name}</strong><p>{selectedTeamSummary.user.position ? `${selectedTeamSummary.user.position} · ` : ''}{selectedTeamSummary.user.role} · {selectedTeamSummary.user.team}</p></div></div><div className="team-profile-quickstats"><div><span>Open</span><strong>{selectedTeamSummary.openCount}</strong></div><div><span>Blocked</span><strong>{selectedTeamSummary.blockedCount}</strong></div><div><span>Overdue</span><strong>{selectedTeamSummary.overdueCount}</strong></div><div><span>Load</span><strong>{selectedTeamSummary.utilization}%</strong></div></div><div className="settings-form-grid"><label className="settings-field settings-field-full"><span>Name</span><input value={selectedTeamSummary.user.name} onChange={(event) => updateUser(selectedTeamSummary.user.id, { name: event.target.value })} /></label><label className="settings-field settings-field-full"><span>Position</span><input value={selectedTeamSummary.user.position || ''} onChange={(event) => updateUser(selectedTeamSummary.user.id, { position: event.target.value || undefined })} placeholder="e.g., Field Supervisor, Agronomist" /></label><label className="settings-field"><span>Role</span><select value={selectedTeamSummary.user.role} onChange={(event) => updateUser(selectedTeamSummary.user.id, { role: event.target.value as UserRole })}><option value="member">Member</option><option value="manager">Manager</option><option value="admin">Admin</option><option value="guest">Guest</option></select></label><label className="settings-field"><span>Team</span><input value={selectedTeamSummary.user.team} onChange={(event) => updateUser(selectedTeamSummary.user.id, { team: event.target.value })} /></label><label className="settings-field"><span>Capacity / Week</span><input type="number" min="1" value={selectedTeamSummary.user.capacityHoursPerWeek ?? ''} onChange={(event) => updateUser(selectedTeamSummary.user.id, { capacityHoursPerWeek: Number(event.target.value) || undefined })} /></label></div><div className="settings-actions"><button className="ghost-button" onClick={() => { if (selectedTeamSummary.tasks[0]) { handleOpenTask(selectedTeamSummary.tasks[0].id); } else { setActiveSection('tasks'); setActiveFilter('all'); } }}>View Tasks</button><button className="ghost-button" onClick={() => handleDeleteTeamMember(selectedTeamSummary.user.id)}>Delete Member</button></div>{selectedTeamSummary.tasks.length > 0 ? <div className="project-task-list">{selectedTeamSummary.tasks.slice(0, 4).map((task) => <button key={task.id} className="project-task-button" onClick={() => handleOpenTask(task.id)}><div><strong>{task.title}</strong><small>{statusLabel[task.status]}</small></div><span>{task.progress}%</span></button>)}</div> : <div className="team-side-empty">Add team members to build the owner database for new projects.</div>}</> : <div className="team-side-empty">Add team members to build the owner database for new projects.</div>}</section><section className="team-tip-card" data-tour="team.cost-flow"><strong>Getting Started</strong><p>Create teams first, then add members. Members can be assigned to projects as owners once added.</p></section></aside> : activeSection === 'reports' ? <SimpleDetailPanel title={selectedReportRecord?.title ?? 'Reports'} body={selectedReportRecord?.roleName ?? 'AgriReports workflow'}>{selectedReportRecord ? <><section className="detail-section"><div className="section-title">Routing</div><div className="project-detail-stack"><div><strong>Author</strong><p>{selectedReportRecord.authorName}</p></div><div><strong>Reviewer</strong><p>{selectedReportRecord.reviewerName}</p></div><div><strong>Window</strong><p>{selectedReportRecord.reportingWindow}</p></div></div></section><section className="detail-section"><div className="section-title">Workflow</div><div className="project-detail-stack"><div><strong>Status</strong><p>{formatReportStatus(selectedReportRecord.status)}</p></div><div><strong>Updated</strong><p>{formatDateTimeLabel(new Date(selectedReportRecord.updatedAt))}</p></div><div><strong>Saved</strong><p>{selectedReportRecord.lastSavedAt ? formatDateTimeLabel(new Date(selectedReportRecord.lastSavedAt)) : 'Pending autosave'}</p></div></div></section></> : <section className="detail-section"><div className="section-title">Routing</div><p>Create a report to begin.</p></section>}</SimpleDetailPanel> : activeSection === 'analytics' ? <AnalyticsDetailPanel summary={analyticsSummary} projectSummaries={projectSummaries} teamSummaries={teamSummaries} /> : activeSection === 'settings' ? <SettingsDetailPanel summary={settingsSummary} automationRules={automationRules} taskTemplates={taskTemplates} reportTemplates={reportTemplates} onToggleRule={toggleAutomationRuleStatus} /> : <TaskDetailPanel task={selectedTask} users={users} projects={projects} workLogs={workLogs} />}
      </div>

      {pendingDelete && pendingDeleteSummary ? (
        <div className="modal-backdrop" onClick={() => setPendingDelete(null)}>
          <div className="modal-card delete-impact-modal" onClick={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h2>{pendingDeleteSummary.title}</h2>
                <p>{pendingDeleteSummary.body}</p>
              </div>
              <button className="icon-button" onClick={() => setPendingDelete(null)} aria-label="Close delete confirmation"><X size={16} /></button>
            </div>
            <div className="delete-impact-list">
              {pendingDeleteSummary.impacts.map((impact) => <div key={impact}><AlertTriangle size={15} /><span>{impact}</span></div>)}
            </div>
            <div className="modal-actions">
              <button className="ghost-button" onClick={() => setPendingDelete(null)}>Cancel</button>
              <button className="danger-button" onClick={confirmPendingDelete}>{pendingDelete.type === 'user' ? 'Delete Member' : 'Delete Team'}</button>
            </div>
          </div>
        </div>
      ) : null}

      {isSetupWizardOpen ? (
        <div className="modal-backdrop" onClick={() => setIsSetupWizardOpen(false)}>
          <div className="modal-card setup-wizard-modal" onClick={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h2>Set up your operation</h2>
                <p>Complete the minimum operating model before the workspace becomes daily-use ready.</p>
              </div>
              <button className="icon-button" onClick={() => setIsSetupWizardOpen(false)} aria-label="Close setup wizard"><X size={16} /></button>
            </div>

            <div className="setup-wizard-progress">
              <div className="setup-wizard-progress-bar"><span style={{ width: `${setupWizardProgress}%` }} /></div>
              <strong>{setupWizardProgress}% complete</strong>
            </div>

            <div className="setup-wizard-layout">
              <aside className="setup-wizard-steps">
                {setupWizardSteps.map((step, index) => (
                  <button key={step.id} className={setupWizardStep === step.id ? 'is-active' : step.complete ? 'is-complete' : ''} onClick={() => setSetupWizardStep(step.id)}>
                    <span>{step.complete ? '✓' : index + 1}</span>
                    <div><strong>{step.title}</strong><small>{step.description}</small></div>
                  </button>
                ))}
              </aside>

              <section className="setup-wizard-panel">
                {setupWizardCompleted && isSetupReady ? (
                  <div className="setup-complete-banner">
                    <strong>Setup complete</strong>
                    <span>Today is now ready to act as the daily operating dashboard.</span>
                  </div>
                ) : null}

                {setupWizardStep === 'team' ? (
                  <div className="setup-wizard-section">
                    <div><h3>Team</h3><p>Add at least one owner. You can create a team manually or import agricultural role templates.</p></div>
                    <div className="modal-grid">
                      <label className="field"><span>Team Name</span><input value={teamDraftName} onChange={(event) => setTeamDraftName(event.target.value)} placeholder="Field Operations" /></label>
                      <label className="field"><span>Member Name</span><input value={teamMemberDraft.name} onChange={(event) => setTeamMemberDraft((current) => ({ ...current, name: event.target.value }))} placeholder="Full name" /></label>
                      <label className="field"><span>Position</span><input value={teamMemberDraft.position} onChange={(event) => setTeamMemberDraft((current) => ({ ...current, position: event.target.value }))} placeholder="Field Supervisor" /></label>
                      <label className="field"><span>Role</span><select value={teamMemberDraft.role} onChange={(event) => setTeamMemberDraft((current) => ({ ...current, role: event.target.value as UserRole }))}><option value="member">Member</option><option value="manager">Manager</option><option value="admin">Admin</option><option value="guest">Guest</option></select></label>
                      <label className="field"><span>Team</span><input value={teamMemberDraft.team} onChange={(event) => setTeamMemberDraft((current) => ({ ...current, team: event.target.value }))} placeholder={teamDraftName || 'Field Operations'} /></label>
                      <label className="field"><span>Capacity / Week</span><input type="number" min="1" value={teamMemberDraft.capacityHoursPerWeek} onChange={(event) => setTeamMemberDraft((current) => ({ ...current, capacityHoursPerWeek: event.target.value }))} /></label>
                    </div>
                    <div className="modal-actions"><button className="ghost-button" onClick={() => openRoleImport('team')}><Upload size={14} />Import Roles</button><button className="ghost-button" onClick={handleAddTeam} disabled={!teamDraftName.trim()}>Create Team</button><button className="primary-button" onClick={handleAddTeamMember} disabled={!teamMemberDraft.name.trim() || !(teamMemberDraft.team.trim() || teamDraftName.trim())}>Add Member</button></div>
                    {!users.length ? <p className="setup-validation">Add or import at least one team member to continue.</p> : null}
                  </div>
                ) : null}

                {setupWizardStep === 'project' ? (
                  <div className="setup-wizard-section">
                    <div><h3>Project</h3><p>Create the first project shell so tasks and report follow-ups have an operating context.</p></div>
                    <div className="modal-grid">
                      <label className="field field-full"><span>Name</span><input value={projectDraft.name} onChange={(event) => setProjectDraft((current) => ({ ...current, name: event.target.value }))} placeholder="Harvest readiness" /></label>
                      <label className="field field-full"><span>Subtitle</span><input value={projectDraft.subtitle} onChange={(event) => setProjectDraft((current) => ({ ...current, subtitle: event.target.value }))} placeholder="Short descriptor" /></label>
                      <label className="field"><span>Type</span><input value={projectDraft.type} onChange={(event) => setProjectDraft((current) => ({ ...current, type: event.target.value }))} /></label>
                      <label className="field"><span>Owner</span><input list="project-owner-options" value={projectDraft.ownerName} onChange={(event) => setProjectDraft((current) => ({ ...current, ownerName: event.target.value }))} placeholder={users[0]?.name ?? 'Owner'} /></label>
                    </div>
                    <div className="modal-actions"><button className="primary-button" onClick={handleCreateProject} disabled={!projectDraft.name.trim() || users.length === 0}>Create Project</button></div>
                    {!projects.length ? <p className="setup-validation">Create at least one project shell to continue.</p> : null}
                  </div>
                ) : null}

                {setupWizardStep === 'work' ? (
                  <div className="setup-wizard-section">
                    <div><h3>First work or report cadence</h3><p>Capture the first task, or open Reports to confirm the cadence that will generate formal follow-up work.</p></div>
                    <div className="modal-grid">
                      <label className="field field-full"><span>Task Title</span><input value={draft.title} onChange={(event) => handleDraftChange('title', event.target.value)} placeholder="First operational task" /></label>
                      <label className="field"><span>Project</span><select value={draft.projectId} onChange={(event) => handleDraftChange('projectId', event.target.value)}>{projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}</select></label>
                      <label className="field"><span>Owner</span><select value={draft.ownerId} onChange={(event) => handleDraftChange('ownerId', event.target.value)}>{users.map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}</select></label>
                      <label className="field"><span>Due Date</span><input type="date" value={draft.endAt} onChange={(event) => handleDraftChange('endAt', event.target.value)} /></label>
                    </div>
                    <div className="modal-actions"><button className="ghost-button" onClick={() => { setActiveSection('reports'); setIsSetupWizardOpen(false); }}><FileText size={14} />Open Reports</button><button className="primary-button" onClick={handleCreateTask} disabled={!draft.title.trim() || users.length === 0 || projects.length === 0}>Create First Task</button></div>
                    {!canContinueSetup ? <p className="setup-validation">Create a task or confirm an existing report cadence to finish setup.</p> : null}
                  </div>
                ) : null}
              </section>
            </div>

            <div className="modal-actions setup-wizard-footer">
              <button className="ghost-button" onClick={() => setIsSetupWizardOpen(false)}>Close</button>
              <button className="ghost-button" onClick={() => setSetupWizardStep(setupWizardSteps[Math.max(0, activeSetupStepIndex - 1)].id)} disabled={activeSetupStepIndex === 0}>Back</button>
              {isSetupReady ? <button className="primary-button" onClick={finishSetupWizard}>Finish Setup</button> : <button className="primary-button" onClick={continueSetupWizard} disabled={!canContinueSetup}>Continue</button>}
            </div>
          </div>
        </div>
      ) : null}

      {isCreateProjectOpen ? <div className="modal-backdrop" onClick={() => setIsCreateProjectOpen(false)}><div className="modal-card" onClick={(event) => event.stopPropagation()}><div className="modal-header"><div><h2>Create Project</h2><p>Start from a clean blank project shell, then add phases, WBS tasks, and cadence rules as the plan grows.</p></div><button className="icon-button" onClick={() => setIsCreateProjectOpen(false)} aria-label="Close project modal"><X size={16} /></button></div><div className="modal-grid"><label className="field field-full"><span>Name</span><input value={projectDraft.name} onChange={(event) => setProjectDraft((current) => ({ ...current, name: event.target.value }))} placeholder="Project name" /></label><label className="field field-full"><span>Subtitle</span><input value={projectDraft.subtitle} onChange={(event) => setProjectDraft((current) => ({ ...current, subtitle: event.target.value }))} placeholder="Short descriptor for this project shell" /></label><label className="field field-full"><span>Description</span><textarea value={projectDraft.description} onChange={(event) => setProjectDraft((current) => ({ ...current, description: event.target.value }))} placeholder="What is this project for?" /></label><label className="field"><span>Type</span><input list="project-type-options" value={projectDraft.type} onChange={(event) => setProjectDraft((current) => ({ ...current, type: event.target.value }))} placeholder="Project, operations, campaign..." /></label><label className="field"><span>Owner Label</span><input list="project-owner-options" value={projectDraft.ownerName} onChange={(event) => setProjectDraft((current) => ({ ...current, ownerName: event.target.value }))} placeholder="Optional person, role, or owner label" /></label><label className="field"><span>Total Weeks</span><input type="number" min="1" value={projectDraft.totalWeeks} onChange={(event) => setProjectDraft((current) => ({ ...current, totalWeeks: event.target.value }))} placeholder="12" /></label><label className="field field-full"><span>Owner Details</span><input value={findUserByName(users, projectDraft.ownerName) ? `${findUserByName(users, projectDraft.ownerName)?.role} · ${findUserByName(users, projectDraft.ownerName)?.team}${findUserByName(users, projectDraft.ownerName)?.capacityHoursPerWeek ? ` · ${findUserByName(users, projectDraft.ownerName)?.capacityHoursPerWeek}h/week` : ''}` : projectDraft.ownerName.trim() ? 'Freeform owner label. This project can be created without a saved team member.' : 'Optional. You can keep this blank and update it later in Project Settings.'} readOnly /></label></div><datalist id="project-type-options">{suggestedProjectTypes.map((projectType) => <option key={projectType} value={projectType}>{projectType}</option>)}</datalist><datalist id="project-owner-options">{users.map((user) => <option key={user.id} value={user.name}>{`${user.role} · ${user.team}`}</option>)}</datalist><div className="modal-actions"><button className="ghost-button" onClick={() => setIsCreateProjectOpen(false)}>Cancel</button><button className="primary-button" onClick={handleCreateProject} disabled={!projectDraft.name.trim()}>Create Project</button></div></div></div> : null}

      {isCreateOpen ? <div className="modal-backdrop" onClick={() => setIsCreateOpen(false)}><div className="modal-card" onClick={(event) => event.stopPropagation()}><div className="modal-header"><div><h2>Create Task</h2><p>Capture the essential details first, then add planning metadata only when it helps.</p></div><button className="icon-button" onClick={() => setIsCreateOpen(false)} aria-label="Close task modal"><X size={16} /></button></div><div className="modal-grid"><label className="field field-full"><span>Title</span><input value={draft.title} onChange={(event) => handleDraftChange('title', event.target.value)} placeholder="What needs to be done?" /></label><label className="field"><span>Project</span><select value={draft.projectId} onChange={(event) => handleDraftChange('projectId', event.target.value)}><option value="">No project yet</option>{projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}</select><small className="field-hint">Recommended when the task belongs to a delivery stream.</small></label><label className="field"><span>Owner</span><select value={draft.ownerId} onChange={(event) => handleDraftChange('ownerId', event.target.value)}><option value="">Unassigned</option>{users.map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}</select><small className="field-hint">Defaults from current team context when available.</small></label><label className="field"><span>Due Date</span><input type="date" value={draft.endAt} onChange={(event) => handleDraftChange('endAt', event.target.value)} /><small className="field-hint">Recommended for work that needs a clear handoff date.</small></label></div><div className="settings-actions"><button className="ghost-button" onClick={() => setIsTaskAdvancedOpen((current) => !current)}>{isTaskAdvancedOpen ? 'Hide Advanced' : 'Show Advanced'}</button></div>{isTaskAdvancedOpen ? <div className="modal-grid"><label className="field field-full"><span>Description</span><textarea value={draft.description} onChange={(event) => handleDraftChange('description', event.target.value)} placeholder="Context, scope, and expected outcome..." /></label><label className="field"><span>Type</span><select value={draft.type} onChange={(event) => handleDraftChange('type', event.target.value as TaskType)}><option value="standard">Standard</option><option value="recurring">Recurring</option><option value="report">Report</option><option value="approval">Approval</option><option value="incident">Incident</option></select></label><label className="field"><span>Status</span><select value={draft.status} onChange={(event) => handleDraftChange('status', event.target.value as TaskStatus)}><option value="backlog">Backlog</option><option value="ready">Ready</option><option value="in_progress">In Progress</option><option value="review">Review</option><option value="blocked">Blocked</option><option value="done">Completed</option></select></label><label className="field"><span>Priority</span><select value={draft.priority} onChange={(event) => handleDraftChange('priority', event.target.value as TaskPriority)}><option value="P1">P1</option><option value="P2">P2</option><option value="P3">P3</option><option value="P4">P4</option></select></label><label className="field"><span>Reviewer</span><select value={draft.reviewerId} onChange={(event) => handleDraftChange('reviewerId', event.target.value)}><option value="">No reviewer</option>{users.map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}</select></label><label className="field"><span>Backup Owner</span><select value={draft.backupOwnerId} onChange={(event) => handleDraftChange('backupOwnerId', event.target.value)}><option value="">No backup owner</option>{users.map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}</select></label><label className="field"><span>Start Date</span><input type="date" value={draft.startAt} onChange={(event) => handleDraftChange('startAt', event.target.value)} /></label><label className="field"><span>Estimate Hours</span><input type="number" min="0" value={draft.estimateHours} onChange={(event) => handleDraftChange('estimateHours', event.target.value)} /></label><label className="field"><span>Recurrence</span><select value={draft.recurrence} onChange={(event) => handleDraftChange('recurrence', event.target.value as NewTaskDraft['recurrence'])}><option value="">One-time</option><option value="daily">Daily</option><option value="weekly">Weekly</option><option value="monthly">Monthly</option><option value="quarterly">Quarterly</option></select></label><label className="field field-full"><span>Tags</span><input value={draft.tags} onChange={(event) => handleDraftChange('tags', event.target.value)} placeholder="finance, monthly, client" /></label></div> : null}<div className="modal-actions"><button className="ghost-button" onClick={() => setIsCreateOpen(false)}>Cancel</button><button className="primary-button" onClick={handleCreateTask} disabled={!draft.title.trim()}>Create Task</button></div></div></div> : null}

      {/* Tour System */}
      <TourWelcomeScreen />
      <TourOverlay />
      <TourCompletionModal />
    </div>
  );
}
