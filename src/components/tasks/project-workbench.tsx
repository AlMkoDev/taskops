'use client';

import { BarChart3, CalendarDays, FolderTree, Plus, Settings2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Project, ProjectPhase, Task, TaskPriority, TaskStatus, User, WbsCadence } from '@/types/domain';

type ProjectWorkbenchTab = 'wbs' | 'gantt' | 'cadence' | 'daily' | 'summary';

type PhaseDraft = {
  name: string;
  description: string;
  startWeek: string;
  endWeek: string;
};

type WbsTaskDraft = {
  title: string;
  description: string;
  projectPhaseId: string;
  cadenceType: WbsCadence;
  triggerLabel: string;
  durationLabel: string;
  responsibleLabel: string;
  startWeek: string;
  endWeek: string;
  priority: TaskPriority;
};

type ProjectSettingsDraft = {
  name: string;
  subtitle: string;
  description: string;
  type: string;
  totalWeeks: string;
  ownerLabel: string;
};

const phaseColors = [
  { color: '#153351', dotColor: '#60a5fa' },
  { color: '#173a31', dotColor: '#34d399' },
  { color: '#402d12', dotColor: '#fbbf24' },
  { color: '#37264a', dotColor: '#a78bfa' },
  { color: '#4a2222', dotColor: '#f87171' }
];

const tabConfig: Array<{ id: ProjectWorkbenchTab; label: string; description: string; tone?: 'primary' | 'secondary' }> = [
  { id: 'summary', label: 'Summary', description: 'Best starting point for project health.', tone: 'primary' },
  { id: 'daily', label: 'Daily Board', description: 'Use for execution handoffs and active delivery.', tone: 'primary' },
  { id: 'wbs', label: 'WBS Tasks', description: 'Plan the detailed work breakdown structure.', tone: 'secondary' },
  { id: 'gantt', label: 'Gantt', description: 'Use for schedule pressure and deadline planning.', tone: 'secondary' },
  { id: 'cadence', label: 'Cadence', description: 'Track repeating or stage-based project rhythms.', tone: 'secondary' }
];
const ADVANCED_PROJECT_HINT_STORAGE_KEY = 'taskops:project-advanced-hint-dismissed';

const emptyPhaseDraft: PhaseDraft = {
  name: '',
  description: '',
  startWeek: '1',
  endWeek: '2'
};

const emptyWbsTaskDraft: WbsTaskDraft = {
  title: '',
  description: '',
  projectPhaseId: '',
  cadenceType: 'fixed',
  triggerLabel: '',
  durationLabel: '1 week',
  responsibleLabel: '',
  startWeek: '1',
  endWeek: '1',
  priority: 'P2'
};

function buildSettingsDraft(project: Project): ProjectSettingsDraft {
  return {
    name: project.name,
    subtitle: project.subtitle ?? '',
    description: project.description ?? '',
    type: project.type,
    totalWeeks: project.totalWeeks ? String(project.totalWeeks) : '',
    ownerLabel: project.ownerLabel ?? ''
  };
}

function statusLabel(status: TaskStatus) {
  switch (status) {
    case 'in_progress':
      return 'In Progress';
    default:
      return status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ');
  }
}

function phaseTaskCount(tasks: Task[], phaseId: string) {
  return tasks.filter((task) => task.projectPhaseId === phaseId).length;
}

type ProjectWorkbenchProps = {
  project: Project | null;
  phases: ProjectPhase[];
  tasks: Task[];
  users: User[];
  selectedPhaseId: string | null;
  onSelectPhase: (phaseId: string | null) => void;
  onCreateProject: () => void;
  onAddPhase: (phase: ProjectPhase) => void;
  onUpdateProject: (projectId: string, updates: Partial<Project>) => void;
  onAddTask: (task: Task) => void;
  onOpenTask: (taskId: string) => void;
};

export function ProjectWorkbench({
  project,
  phases,
  tasks,
  users,
  selectedPhaseId,
  onSelectPhase,
  onCreateProject,
  onAddPhase,
  onUpdateProject,
  onAddTask,
  onOpenTask
}: ProjectWorkbenchProps) {
  const [activeTab, setActiveTab] = useState<ProjectWorkbenchTab>('summary');
  const [isPhaseModalOpen, setIsPhaseModalOpen] = useState(false);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [phaseDraft, setPhaseDraft] = useState<PhaseDraft>(emptyPhaseDraft);
  const [taskDraft, setTaskDraft] = useState<WbsTaskDraft>(emptyWbsTaskDraft);
  const [settingsDraft, setSettingsDraft] = useState<ProjectSettingsDraft | null>(null);
  const [isAdvancedHintDismissed, setIsAdvancedHintDismissed] = useState(false);

  const orderedPhases = useMemo(
    () => [...phases].sort((left, right) => left.startWeek - right.startWeek || left.endWeek - right.endWeek),
    [phases]
  );

  const activePhaseId = selectedPhaseId ?? orderedPhases[0]?.id ?? null;
  const visibleTasks = activePhaseId ? tasks.filter((task) => task.projectPhaseId === activePhaseId) : tasks;
  const totalWeeks = project?.totalWeeks ?? Math.max(orderedPhases.reduce((max, phase) => Math.max(max, phase.endWeek), 0), 8);

  const dailyGroups = useMemo(
    () => [
      { id: 'ready', label: 'Ready Next', tasks: tasks.filter((task) => task.status === 'ready' || task.status === 'backlog') },
      { id: 'in_progress', label: 'Doing Today', tasks: tasks.filter((task) => task.status === 'in_progress') },
      { id: 'review', label: 'Needs Review', tasks: tasks.filter((task) => task.status === 'review') },
      { id: 'done', label: 'Recently Done', tasks: tasks.filter((task) => task.status === 'done') }
    ],
    [tasks]
  );

  const cadenceGroups = useMemo(
    () =>
      (['fixed', 'stage', 'threshold', 'milestone', 'continuous'] as WbsCadence[]).map((cadence) => ({
        cadence,
        tasks: tasks.filter((task) => task.cadenceType === cadence)
      })),
    [tasks]
  );

  useEffect(() => {
    if (typeof window === 'undefined' || !project) return;
    const savedTab = window.sessionStorage.getItem(`taskops:project-tab:${project.id}`) as ProjectWorkbenchTab | null;
    if (savedTab && tabConfig.some((tab) => tab.id === savedTab)) {
      setActiveTab(savedTab);
    }
  }, [project]);

  useEffect(() => {
    if (typeof window === 'undefined' || !project) return;
    window.sessionStorage.setItem(`taskops:project-tab:${project.id}`, activeTab);
  }, [activeTab, project]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    setIsAdvancedHintDismissed(window.localStorage.getItem(ADVANCED_PROJECT_HINT_STORAGE_KEY) === 'true');
  }, []);

  const isAdvancedPlanningTab = activeTab === 'wbs' || activeTab === 'gantt' || activeTab === 'cadence';

  function dismissAdvancedHint() {
    setIsAdvancedHintDismissed(true);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(ADVANCED_PROJECT_HINT_STORAGE_KEY, 'true');
    }
  }

  if (!project) {
    return (
      <section className="task-manager-empty">
        <div className="task-manager-badge">Task Manager</div>
        <h2>Start with a blank project shell</h2>
        <p>
          Build the structure you actually need: create a project, add phases, then plan work through WBS, Gantt,
          Cadence, Daily Board, and Summary views.
        </p>
        <div className="task-manager-stats">
          <div className="metric-box">
            <strong>0</strong>
            <span>projects</span>
          </div>
          <div className="metric-box">
            <strong>0</strong>
            <span>phases</span>
          </div>
          <div className="metric-box">
            <strong>0</strong>
            <span>tasks</span>
          </div>
        </div>
        <div className="task-manager-actions">
          <button className="primary-button" onClick={onCreateProject}>
            <Plus size={16} />
            Create Project
          </button>
          <button className="ghost-button" onClick={onCreateProject}>
            <FolderTree size={16} />
            Add Phase
          </button>
          <button className="ghost-button" disabled>
            <CalendarDays size={16} />
            Start from Template
          </button>
        </div>
      </section>
    );
  }

  const openSettings = () => {
    setSettingsDraft(buildSettingsDraft(project));
    setIsSettingsOpen(true);
  };

  const handleCreatePhase = () => {
    const name = phaseDraft.name.trim();
    const startWeek = Number(phaseDraft.startWeek) || 1;
    const endWeek = Number(phaseDraft.endWeek) || startWeek;
    if (!name) return;
    const palette = phaseColors[orderedPhases.length % phaseColors.length];
    const phase: ProjectPhase = {
      id: `phase_${Date.now()}`,
      projectId: project.id,
      name,
      description: phaseDraft.description.trim() || undefined,
      startWeek: Math.max(1, startWeek),
      endWeek: Math.max(startWeek, endWeek),
      color: palette.color,
      dotColor: palette.dotColor
    };
    onAddPhase(phase);
    onSelectPhase(phase.id);
    setPhaseDraft(emptyPhaseDraft);
    setIsPhaseModalOpen(false);
  };

  const handleCreateWbsTask = () => {
    const title = taskDraft.title.trim();
    if (!title) return;
    const projectPhaseId = taskDraft.projectPhaseId || activePhaseId || undefined;
    const phase = orderedPhases.find((item) => item.id === projectPhaseId);
    const siblingCount = projectPhaseId ? tasks.filter((task) => task.projectPhaseId === projectPhaseId).length : tasks.length;
    const wbsCode = phase ? `${orderedPhases.findIndex((item) => item.id === phase.id) + 1}.${siblingCount + 1}` : `0.${tasks.length + 1}`;
    const matchedUser = users.find((user) => user.name.toLowerCase() === taskDraft.responsibleLabel.trim().toLowerCase()) ?? null;
    onAddTask({
      id: `task_${Date.now()}`,
      type: 'standard',
      title,
      description: taskDraft.description.trim() || undefined,
      status: 'backlog',
      priority: taskDraft.priority,
      projectId: project.id,
      projectPhaseId,
      wbsCode,
      cadenceType: taskDraft.cadenceType,
      triggerLabel: taskDraft.triggerLabel.trim() || undefined,
      durationLabel: taskDraft.durationLabel.trim() || undefined,
      responsibleLabel: taskDraft.responsibleLabel.trim() || undefined,
      startWeek: Number(taskDraft.startWeek) || undefined,
      endWeek: Number(taskDraft.endWeek) || Number(taskDraft.startWeek) || undefined,
      ownerId: matchedUser?.id ?? '',
      reviewerId: undefined,
      backupOwnerId: undefined,
      watcherIds: [],
      tags: ['wbs'],
      loggedHours: 0,
      progress: 0,
      dependencyIds: [],
      subtasks: [],
      blocker: null,
      sla: { enabled: false },
      attachmentIds: [],
      workLogIds: [],
      activityIds: []
    });
    setTaskDraft({
      ...emptyWbsTaskDraft,
      projectPhaseId: activePhaseId ?? '',
      startWeek: phase?.startWeek ? String(phase.startWeek) : '1',
      endWeek: phase?.startWeek ? String(phase.startWeek) : '1'
    });
    setIsTaskModalOpen(false);
  };

  const handleSaveProjectSettings = () => {
    if (!settingsDraft) return;
    const name = settingsDraft.name.trim();
    if (!name) return;
    onUpdateProject(project.id, {
      name,
      subtitle: settingsDraft.subtitle.trim() || undefined,
      description: settingsDraft.description.trim() || undefined,
      type: settingsDraft.type.trim() || project.type,
      totalWeeks: Number(settingsDraft.totalWeeks) || undefined,
      ownerLabel: settingsDraft.ownerLabel.trim() || undefined
    });
    setIsSettingsOpen(false);
  };

  return (
    <>
      <section className="project-workbench">
        <div className="project-shell-header">
          <div>
            <div className="task-manager-badge">Task Manager</div>
            <h2>{project.name}</h2>
            <p>
              {orderedPhases.length} phases · {tasks.length} tasks
              {project.subtitle ? ` · ${project.subtitle}` : ''}
            </p>
          </div>
          <div className="project-shell-actions">
            <button className="ghost-button" onClick={() => { if (tasks[0]) onOpenTask(tasks[0].id); }} disabled={tasks.length === 0}>
              <BarChart3 size={16} />
              View in Tasks
            </button>
            <button className="ghost-button" onClick={() => setIsPhaseModalOpen(true)}>
              <Plus size={16} />
              Add Phase
            </button>
            <button className="ghost-button" onClick={openSettings}>
              <Settings2 size={16} />
              Project Settings
            </button>
          </div>
        </div>

        <div className="project-shell-tabs">
          <button className={activePhaseId === null ? 'is-active' : ''} onClick={() => onSelectPhase(null)}>
            All Phases
          </button>
          {orderedPhases.map((phase) => (
            <button
              key={phase.id}
              className={activePhaseId === phase.id ? 'is-active' : ''}
              onClick={() => onSelectPhase(phase.id)}
            >
              {phase.name}
            </button>
          ))}
        </div>

        <div className="project-shell-tabs">
          {tabConfig.map((tab) => (
            <button
              key={tab.id}
              className={`${activeTab === tab.id ? 'is-active' : ''}${tab.tone === 'secondary' ? ' is-secondary' : ''}`}
              onClick={() => setActiveTab(tab.id)}
              title={tab.description}
            >
              <span>{tab.label}</span>
              <small>{tab.description}</small>
            </button>
          ))}
        </div>

        {isAdvancedPlanningTab && !isAdvancedHintDismissed ? (
          <div className="calm-card">
            <div className="modal-header" style={{ padding: 0, border: 0 }}>
              <div>
                <h3 style={{ margin: 0 }}>Advanced Planning Hint</h3>
                <p style={{ marginTop: 6 }}>
                  Use Summary and Daily Board for routine execution. Switch to WBS, Gantt, or Cadence when you are planning structure, dependencies, or schedules.
                </p>
              </div>
              <button className="ghost-button" onClick={dismissAdvancedHint}>Dismiss</button>
            </div>
          </div>
        ) : null}

        {activeTab === 'wbs' ? (
          <div className="wbs-section">
            <div className="wbs-toolbar">
              <div>
                <strong>WBS Tasks</strong>
                <p>Plan phases, work packages, and task items on one generic project spine.</p>
              </div>
              <button className="primary-button" onClick={() => setIsTaskModalOpen(true)}>
                <Plus size={16} />
                Add WBS Task
              </button>
            </div>
            <div className="wbs-table">
              <div className="wbs-row wbs-head">
                <span>WBS ID</span>
                <span>Task Name</span>
                <span>Description</span>
                <span>Cadence</span>
                <span>Responsible</span>
                <span>Duration</span>
                <span>Trigger</span>
              </div>
              {visibleTasks.length > 0 ? (
                visibleTasks.map((task) => (
                  <button key={task.id} className="wbs-row" onClick={() => onOpenTask(task.id)}>
                    <span>{task.wbsCode ?? '-'}</span>
                    <span>{task.title}</span>
                    <span>{task.description ?? 'No description yet'}</span>
                    <span className={`cadence-pill cadence-${task.cadenceType ?? 'fixed'}`}>{task.cadenceType ?? 'fixed'}</span>
                    <span>{task.responsibleLabel ?? task.ownerId ?? 'Unassigned'}</span>
                    <span>{task.durationLabel ?? `${task.estimateHours ?? 0}h`}</span>
                    <span>{task.triggerLabel ?? 'Manual start'}</span>
                  </button>
                ))
              ) : (
                <div className="wbs-empty">
                  <FolderTree size={18} />
                  <h3>No WBS tasks yet</h3>
                  <p>Add a phase and then create the first work package or task item.</p>
                </div>
              )}
            </div>
          </div>
        ) : null}

        {activeTab === 'gantt' ? (
          <div className="gantt-wrap">
            <div className="gantt-grid" style={{ gridTemplateColumns: `240px repeat(${totalWeeks}, minmax(48px, 1fr))` }}>
              <div className="gantt-corner">Task</div>
              {Array.from({ length: totalWeeks }, (_, index) => (
                <div key={index} className="gantt-week">W{index + 1}</div>
              ))}
              {tasks.length > 0 ? (
                tasks.map((task) => {
                  const startWeek = Math.max(1, task.startWeek ?? 1);
                  const endWeek = Math.max(startWeek, task.endWeek ?? startWeek);
                  return (
                    <div className="gantt-row" key={task.id} style={{ gridColumn: '1 / -1' }}>
                      <div className="gantt-task-label">{task.title}</div>
                      {Array.from({ length: totalWeeks }, (_, index) => {
                        const week = index + 1;
                        const isActive = week >= startWeek && week <= endWeek;
                        return (
                          <div key={week} className="gantt-cell">
                            {isActive ? <div className="gantt-bar">{task.wbsCode ?? task.title}</div> : null}
                          </div>
                        );
                      })}
                    </div>
                  );
                })
              ) : (
                <div className="gantt-empty">
                  <CalendarDays size={18} />
                  <h3>No scheduled work yet</h3>
                  <p>Once tasks have start and end weeks, this view becomes the planning strip for the project.</p>
                </div>
              )}
            </div>
          </div>
        ) : null}

        {activeTab === 'cadence' ? (
          <div className="cadence-grid">
            {cadenceGroups.map((group) => (
              <section key={group.cadence} className="cadence-card">
                <div className="cadence-card-head">
                  <h3>{group.cadence}</h3>
                  <span>{group.tasks.length}</span>
                </div>
                <div className="cadence-list">
                  {group.tasks.length > 0 ? (
                    group.tasks.map((task) => (
                      <button key={task.id} className="cadence-list-row" onClick={() => onOpenTask(task.id)}>
                        <div>
                          <strong>{task.title}</strong>
                          <small>{task.triggerLabel ?? 'No trigger'} · {task.durationLabel ?? 'No duration'}</small>
                        </div>
                        <span>{task.wbsCode ?? '-'}</span>
                      </button>
                    ))
                  ) : (
                    <div className="cadence-empty">No {group.cadence} work yet.</div>
                  )}
                </div>
              </section>
            ))}
          </div>
        ) : null}

        {activeTab === 'daily' ? (
          <div className="day-board">
            {dailyGroups.map((group) => (
              <section key={group.id} className="day-section">
                <div className="day-section-head">
                  <h3>{group.label}</h3>
                  <span>{group.tasks.length}</span>
                </div>
                <div className="day-section-list">
                  {group.tasks.length > 0 ? (
                    group.tasks.map((task) => (
                      <button key={task.id} className="day-task" onClick={() => onOpenTask(task.id)}>
                        <div>
                          <strong>{task.title}</strong>
                          <small>{statusLabel(task.status)} · {task.responsibleLabel ?? 'No responsible label'}</small>
                        </div>
                        <span>{task.triggerLabel ?? 'Direct'}</span>
                      </button>
                    ))
                  ) : (
                    <div className="cadence-empty">Nothing in this lane yet.</div>
                  )}
                </div>
              </section>
            ))}
          </div>
        ) : null}

        {activeTab === 'summary' ? (
          <div className="summary-grid">
            <section className="summary-kpi-grid">
              <div className="project-metric">
                <strong>{orderedPhases.length}</strong>
                <span>Phases</span>
              </div>
              <div className="project-metric">
                <strong>{tasks.length}</strong>
                <span>Total Tasks</span>
              </div>
              <div className="project-metric">
                <strong>{tasks.filter((task) => task.status === 'blocked').length}</strong>
                <span>Blocked</span>
              </div>
              <div className="project-metric">
                <strong>{Math.round(tasks.reduce((sum, task) => sum + task.progress, 0) / Math.max(tasks.length, 1))}%</strong>
                <span>Progress</span>
              </div>
            </section>
            <section className="summary-card">
              <div className="summary-card-head">
                <h3>Phase Breakdown</h3>
                <BarChart3 size={16} />
              </div>
              <div className="summary-list">
                {orderedPhases.length > 0 ? (
                  orderedPhases.map((phase) => (
                    <div key={phase.id} className="summary-list-row">
                      <div>
                        <strong>{phase.name}</strong>
                        <small>Weeks {phase.startWeek}-{phase.endWeek}</small>
                      </div>
                      <span>{phaseTaskCount(tasks, phase.id)} tasks</span>
                    </div>
                  ))
                ) : (
                  <div className="cadence-empty">No phases yet.</div>
                )}
              </div>
            </section>
            <section className="summary-card">
              <div className="summary-card-head">
                <h3>Project Notes</h3>
              </div>
              <p>{project.description ?? 'Add project settings to describe the purpose and operating horizon of this work.'}</p>
              <div className="summary-meta">
                <span>Owner: {project.ownerLabel ?? 'Unassigned'}</span>
                <span>Type: {project.type}</span>
                <span>Total weeks: {project.totalWeeks ?? totalWeeks}</span>
              </div>
            </section>
          </div>
        ) : null}
      </section>

      {isPhaseModalOpen ? (
        <div className="modal-backdrop" onClick={() => setIsPhaseModalOpen(false)}>
          <div className="modal-card" onClick={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h2>Add Phase</h2>
                <p>Create a new phase or workstream for this project.</p>
              </div>
            </div>
            <div className="modal-grid">
              <label className="field field-full">
                <span>Phase Name</span>
                <input value={phaseDraft.name} onChange={(event) => setPhaseDraft((current) => ({ ...current, name: event.target.value }))} placeholder="Discovery, Delivery, Closeout..." />
              </label>
              <label className="field field-full">
                <span>Description</span>
                <textarea value={phaseDraft.description} onChange={(event) => setPhaseDraft((current) => ({ ...current, description: event.target.value }))} placeholder="What happens in this phase?" />
              </label>
              <label className="field">
                <span>Start Week</span>
                <input type="number" min="1" value={phaseDraft.startWeek} onChange={(event) => setPhaseDraft((current) => ({ ...current, startWeek: event.target.value }))} />
              </label>
              <label className="field">
                <span>End Week</span>
                <input type="number" min="1" value={phaseDraft.endWeek} onChange={(event) => setPhaseDraft((current) => ({ ...current, endWeek: event.target.value }))} />
              </label>
            </div>
            <div className="modal-actions">
              <button className="ghost-button" onClick={() => setIsPhaseModalOpen(false)}>Cancel</button>
              <button className="primary-button" onClick={handleCreatePhase}>Add Phase</button>
            </div>
          </div>
        </div>
      ) : null}

      {isTaskModalOpen ? (
        <div className="modal-backdrop" onClick={() => setIsTaskModalOpen(false)}>
          <div className="modal-card" onClick={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h2>Add WBS Task</h2>
                <p>Create a generic work package or task item without locking the project to any one domain.</p>
              </div>
            </div>
            <div className="modal-grid">
              <label className="field field-full">
                <span>Task Name</span>
                <input value={taskDraft.title} onChange={(event) => setTaskDraft((current) => ({ ...current, title: event.target.value }))} />
              </label>
              <label className="field field-full">
                <span>Description</span>
                <textarea value={taskDraft.description} onChange={(event) => setTaskDraft((current) => ({ ...current, description: event.target.value }))} />
              </label>
              <label className="field">
                <span>Phase</span>
                <select value={taskDraft.projectPhaseId} onChange={(event) => setTaskDraft((current) => ({ ...current, projectPhaseId: event.target.value }))}>
                  <option value="">Unphased</option>
                  {orderedPhases.map((phase) => <option key={phase.id} value={phase.id}>{phase.name}</option>)}
                </select>
              </label>
              <label className="field">
                <span>Cadence</span>
                <select value={taskDraft.cadenceType} onChange={(event) => setTaskDraft((current) => ({ ...current, cadenceType: event.target.value as WbsCadence }))}>
                  <option value="fixed">Fixed</option>
                  <option value="stage">Stage</option>
                  <option value="threshold">Threshold</option>
                  <option value="milestone">Milestone</option>
                  <option value="continuous">Continuous</option>
                </select>
              </label>
              <label className="field">
                <span>Responsible</span>
                <input value={taskDraft.responsibleLabel} onChange={(event) => setTaskDraft((current) => ({ ...current, responsibleLabel: event.target.value }))} placeholder="Role or owner name" />
              </label>
              <label className="field">
                <span>Duration</span>
                <input value={taskDraft.durationLabel} onChange={(event) => setTaskDraft((current) => ({ ...current, durationLabel: event.target.value }))} placeholder="2 days, 1 week..." />
              </label>
              <label className="field">
                <span>Trigger</span>
                <input value={taskDraft.triggerLabel} onChange={(event) => setTaskDraft((current) => ({ ...current, triggerLabel: event.target.value }))} placeholder="Stage complete, manual, threshold..." />
              </label>
              <label className="field">
                <span>Priority</span>
                <select value={taskDraft.priority} onChange={(event) => setTaskDraft((current) => ({ ...current, priority: event.target.value as TaskPriority }))}>
                  <option value="P1">P1</option>
                  <option value="P2">P2</option>
                  <option value="P3">P3</option>
                  <option value="P4">P4</option>
                </select>
              </label>
              <label className="field">
                <span>Start Week</span>
                <input type="number" min="1" value={taskDraft.startWeek} onChange={(event) => setTaskDraft((current) => ({ ...current, startWeek: event.target.value }))} />
              </label>
              <label className="field">
                <span>End Week</span>
                <input type="number" min="1" value={taskDraft.endWeek} onChange={(event) => setTaskDraft((current) => ({ ...current, endWeek: event.target.value }))} />
              </label>
            </div>
            <div className="modal-actions">
              <button className="ghost-button" onClick={() => setIsTaskModalOpen(false)}>Cancel</button>
              <button className="primary-button" onClick={handleCreateWbsTask}>Add WBS Task</button>
            </div>
          </div>
        </div>
      ) : null}

      {isSettingsOpen && settingsDraft ? (
        <div className="modal-backdrop" onClick={() => setIsSettingsOpen(false)}>
          <div className="modal-card" onClick={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h2>Project Settings</h2>
                <p>Set the generic project shell without preloading any default domain content.</p>
              </div>
            </div>
            <div className="modal-grid">
              <label className="field field-full">
                <span>Project Name</span>
                <input value={settingsDraft.name} onChange={(event) => setSettingsDraft((current) => current ? { ...current, name: event.target.value } : current)} />
              </label>
              <label className="field field-full">
                <span>Subtitle</span>
                <input value={settingsDraft.subtitle} onChange={(event) => setSettingsDraft((current) => current ? { ...current, subtitle: event.target.value } : current)} placeholder="Optional short descriptor" />
              </label>
              <label className="field field-full">
                <span>Description</span>
                <textarea value={settingsDraft.description} onChange={(event) => setSettingsDraft((current) => current ? { ...current, description: event.target.value } : current)} />
              </label>
              <label className="field">
                <span>Type</span>
                <input value={settingsDraft.type} onChange={(event) => setSettingsDraft((current) => current ? { ...current, type: event.target.value } : current)} />
              </label>
              <label className="field">
                <span>Owner Label</span>
                <input value={settingsDraft.ownerLabel} onChange={(event) => setSettingsDraft((current) => current ? { ...current, ownerLabel: event.target.value } : current)} placeholder="Ops lead, client owner..." />
              </label>
              <label className="field">
                <span>Total Weeks</span>
                <input type="number" min="1" value={settingsDraft.totalWeeks} onChange={(event) => setSettingsDraft((current) => current ? { ...current, totalWeeks: event.target.value } : current)} />
              </label>
            </div>
            <div className="modal-actions">
              <button className="ghost-button" onClick={() => setIsSettingsOpen(false)}>Cancel</button>
              <button className="primary-button" onClick={handleSaveProjectSettings}>Save Settings</button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
