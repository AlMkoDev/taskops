'use client';

import {
  AlertTriangle,
  CheckSquare,
  Clock3,
  Flag,
  MessageSquare
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useTaskOpsStore } from '../../store/use-task-ops-store';
import { formatDateTimeLabel } from '../../utils/date';
import { Project, Task, TaskBlocker, TaskStatus, User, WorkLog } from '../../types/domain';

interface TaskDetailPanelProps {
  task: Task | null;
  users: User[];
  projects: Project[];
  workLogs: WorkLog[];
}

const statusOptions: Array<{ value: TaskStatus; label: string }> = [
  { value: 'backlog', label: 'Backlog' },
  { value: 'ready', label: 'Ready' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'review', label: 'In Review' },
  { value: 'blocked', label: 'Blocked' },
  { value: 'done', label: 'Done' }
];

const blockerCategories: Array<TaskBlocker['category']> = ['dependency', 'approval', 'external', 'resource', 'technical', 'other'];
const blockerSeverities: Array<TaskBlocker['severity']> = ['low', 'medium', 'high', 'critical'];

function getPrimaryAction(task: Task) {
  switch (task.status) {
    case 'backlog':
    case 'ready':
      return { label: 'Start Work', updates: { status: 'in_progress' as const, progress: Math.max(task.progress, 5) } };
    case 'in_progress':
      return { label: 'Submit for Review', updates: { status: 'review' as const, progress: Math.max(task.progress, 85) } };
    case 'blocked':
      return { label: 'Resolve Blocker', updates: { status: 'ready' as const, blocker: null, progress: Math.max(task.progress, 5) } };
    case 'review':
      return { label: 'Approve Task', updates: { status: 'done' as const, progress: 100 } };
    case 'done':
      return { label: 'Reopen Task', updates: { status: 'ready' as const, progress: 95 } };
    default:
      return null;
  }
}

export function TaskDetailPanel({ task, users, projects, workLogs }: TaskDetailPanelProps) {
  const { addWorkLog, updateTask, toggleSubtask } = useTaskOpsStore();
  const [isEditing, setIsEditing] = useState(false);
  const [draftTitle, setDraftTitle] = useState('');
  const [draftDescription, setDraftDescription] = useState('');
  const [logSummary, setLogSummary] = useState('');
  const [logDetails, setLogDetails] = useState('');
  const [logMinutes, setLogMinutes] = useState('30');
  const [blockerReason, setBlockerReason] = useState('');
  const [blockerNotes, setBlockerNotes] = useState('');
  const [blockerSeverity, setBlockerSeverity] = useState<TaskBlocker['severity']>('medium');
  const [blockerCategory, setBlockerCategory] = useState<TaskBlocker['category']>('dependency');
  const [showBlockerForm, setShowBlockerForm] = useState(false);

  useEffect(() => {
    setDraftTitle(task?.title ?? '');
    setDraftDescription(task?.description ?? '');
    setLogSummary('');
    setLogDetails('');
    setLogMinutes('30');
    setBlockerReason(task?.blocker?.reason ?? '');
    setBlockerNotes(task?.blocker?.notes ?? '');
    setBlockerSeverity(task?.blocker?.severity ?? 'medium');
    setBlockerCategory(task?.blocker?.category ?? 'dependency');
    setShowBlockerForm(false);
    setIsEditing(false);
  }, [task?.id, task?.title, task?.description, task?.blocker]);

  const primaryAction = useMemo(() => (task ? getPrimaryAction(task) : null), [task]);

  if (!task) {
    return (
      <aside className="detail-panel empty">
        <div className="empty-state">
          <CheckSquare size={18} />
          <h2>Select a task</h2>
          <p>Task planning, work logs, blockers, and execution context will appear here.</p>
        </div>
      </aside>
    );
  }

  const owner = users.find((user) => user.id === task.ownerId);
  const reviewer = users.find((user) => user.id === task.reviewerId);
  const backupOwner = users.find((user) => user.id === task.backupOwnerId);
  const project = projects.find((item) => item.id === task.projectId);
  const taskWorkLogs = workLogs.filter((log) => log.taskId === task.id);
  const completedSubtasks = task.subtasks.filter((subtask) => subtask.completed).length;

  const handleSave = () => {
    updateTask(task.id, {
      title: draftTitle.trim() || task.title,
      description: draftDescription.trim() || undefined
    });
    setIsEditing(false);
  };

  const handlePrimaryAction = () => {
    if (!primaryAction) return;
    updateTask(task.id, primaryAction.updates);
  };

  const handleAddWorkLog = () => {
    const summary = logSummary.trim();
    if (!summary) return;

    const minutes = Math.max(0, Number(logMinutes) || 0);

    addWorkLog({
      id: `w${Date.now()}`,
      taskId: task.id,
      type: 'update',
      summary,
      details: logDetails.trim() || undefined,
      authorId: task.ownerId,
      occurredAt: new Date().toISOString(),
      durationMinutes: minutes,
      visibility: 'team',
      attachmentIds: []
    });

    if (task.status === 'backlog' || task.status === 'ready') {
      updateTask(task.id, { status: 'in_progress', progress: Math.max(task.progress, 10) });
    }

    setLogSummary('');
    setLogDetails('');
    setLogMinutes('30');
  };

  const handleSaveBlocker = () => {
    const reason = blockerReason.trim();
    if (!reason) return;

    updateTask(task.id, {
      status: 'blocked',
      blocker: {
        reason,
        notes: blockerNotes.trim() || undefined,
        severity: blockerSeverity,
        category: blockerCategory,
        blockedAt: new Date().toISOString()
      }
    });
    setShowBlockerForm(false);
  };

  const handleResolveBlocker = () => {
    updateTask(task.id, {
      status: 'ready',
      blocker: null
    });
    setShowBlockerForm(false);
  };

  return (
    <aside className="detail-panel">
      <div className="detail-header">
        <div className="detail-header-copy">
          {isEditing ? (
            <input className="detail-input" value={draftTitle} onChange={(event) => setDraftTitle(event.target.value)} />
          ) : (
            <h2>{task.title}</h2>
          )}
          <p>{project?.name ?? 'No project assigned'}</p>
        </div>
        <div className="detail-header-actions">
          {isEditing ? (
            <>
              <button onClick={() => setIsEditing(false)}>Cancel</button>
              <button onClick={handleSave}>Save</button>
            </>
          ) : (
            <>
              <button onClick={() => setIsEditing(true)}>Edit</button>
              <button onClick={() => updateTask(task.id, { status: task.status === 'done' ? 'ready' : 'done', progress: task.status === 'done' ? 95 : 100 })}>
                {task.status === 'done' ? 'Reopen' : 'Done'}
              </button>
            </>
          )}
        </div>
      </div>

      <section className="detail-section">
        <div className="meta-row">
          <select
            className="detail-select"
            value={task.status}
            onChange={(event) => updateTask(task.id, { status: event.target.value as TaskStatus })}
          >
            {statusOptions.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
          <span className={`priority-badge priority-${task.priority.toLowerCase()}`}>{task.priority}</span>
          <span className="progress-pill">{task.progress}% complete</span>
        </div>
        {primaryAction ? (
          <div className="timer-card">
            <div>
              <strong>{primaryAction.label}</strong>
              <span>Guide the next logical transition for this task without leaving the panel.</span>
            </div>
            <div className="timer-actions">
              <button className="primary-button" onClick={handlePrimaryAction}>{primaryAction.label}</button>
            </div>
          </div>
        ) : null}
        {isEditing ? (
          <textarea
            className="detail-textarea"
            value={draftDescription}
            onChange={(event) => setDraftDescription(event.target.value)}
          />
        ) : (
          <p>{task.description ?? 'No description yet.'}</p>
        )}
      </section>

      <section className="detail-section">
        <div className="section-title">Add Work Log</div>
        <div className="inline-form">
          <input
            className="detail-input"
            value={logSummary}
            onChange={(event) => setLogSummary(event.target.value)}
            placeholder="What did you do?"
          />
          <textarea
            className="detail-textarea compact"
            value={logDetails}
            onChange={(event) => setLogDetails(event.target.value)}
            placeholder="Optional detail or outcome"
          />
          <div className="inline-form-row">
            <input
              className="detail-input short"
              type="number"
              min="0"
              step="5"
              value={logMinutes}
              onChange={(event) => setLogMinutes(event.target.value)}
            />
            <span className="inline-form-label">minutes logged</span>
            <button className="primary-button" onClick={handleAddWorkLog} disabled={!logSummary.trim()}>
              <MessageSquare size={14} />
              Save Log
            </button>
          </div>
        </div>
      </section>

      <section className="detail-section">
        <div className="section-title">Blockers</div>
        {task.blocker ? (
          <div className="risk-card">
            <div className="risk-head">
              <AlertTriangle size={14} />
              <strong>{task.blocker.reason}</strong>
            </div>
            <p>{task.blocker.notes ?? 'No extra blocker detail recorded yet.'}</p>
            <div className="risk-meta">
              <span><Flag size={13} /> {task.blocker.severity}</span>
              <span><Clock3 size={13} /> Since {formatDateTimeLabel(new Date(task.blocker.blockedAt))}</span>
            </div>
            <div className="blocked-card-actions">
              <button className="ghost-button" onClick={() => setShowBlockerForm((current) => !current)}>Update Blocker</button>
              <button className="primary-button" onClick={handleResolveBlocker}>Resolve Blocker</button>
            </div>
          </div>
        ) : (
          <div className="calm-card">
            <strong>No active blocker.</strong>
            <p>Mark blockers immediately so leads can intervene before due work drifts.</p>
          </div>
        )}
        {!task.blocker && !showBlockerForm ? (
          <div className="blocked-card-actions">
            <button className="ghost-button" onClick={() => setShowBlockerForm(true)}>Mark Blocked</button>
          </div>
        ) : null}
        {showBlockerForm ? (
          <div className="inline-form">
            <input
              className="detail-input"
              value={blockerReason}
              onChange={(event) => setBlockerReason(event.target.value)}
              placeholder="What is blocking this task?"
            />
            <textarea
              className="detail-textarea compact"
              value={blockerNotes}
              onChange={(event) => setBlockerNotes(event.target.value)}
              placeholder="Optional context, escalation contact, or next step"
            />
            <div className="inline-form-row">
              <select className="detail-select" value={blockerSeverity} onChange={(event) => setBlockerSeverity(event.target.value as TaskBlocker['severity'])}>
                {blockerSeverities.map((severity) => <option key={severity} value={severity}>{severity}</option>)}
              </select>
              <select className="detail-select" value={blockerCategory} onChange={(event) => setBlockerCategory(event.target.value as TaskBlocker['category'])}>
                {blockerCategories.map((category) => <option key={category} value={category}>{category}</option>)}
              </select>
              <button className="primary-button" onClick={handleSaveBlocker} disabled={!blockerReason.trim()}>
                Save Blocker
              </button>
            </div>
          </div>
        ) : null}
      </section>

      <section className="detail-section">
        <div className="section-title">Planning</div>
        <div className="info-grid">
          <div><strong>Owner</strong><span>{owner?.name ?? 'Unassigned'}</span></div>
          <div><strong>Reviewer</strong><span>{reviewer?.name ?? 'None'}</span></div>
          <div><strong>Backup</strong><span>{backupOwner?.name ?? 'None'}</span></div>
          <div><strong>Due Date</strong><span>{task.dueAt ? formatDateTimeLabel(new Date(task.dueAt)) : 'No due date'}</span></div>
          <div><strong>Estimate</strong><span>{task.estimateHours ?? 0}h</span></div>
          <div><strong>Recurrence</strong><span>{task.recurrence ?? 'One-time'}</span></div>
        </div>
      </section>

      <section className="detail-section">
        <div className="section-title">Checklist</div>
        <div className="section-subtitle">{completedSubtasks}/{task.subtasks.length} complete</div>
        <div className="list-stack">
          {task.subtasks.length > 0 ? (
            task.subtasks.map((subtask) => (
              <button key={subtask.id} className="list-row is-clickable" onClick={() => toggleSubtask(task.id, subtask.id)}>
                <span className={subtask.completed ? 'mini-check is-done' : 'mini-check'} />
                <span className={subtask.completed ? 'subtask-text is-done' : 'subtask-text'}>{subtask.title}</span>
              </button>
            ))
          ) : (
            <div className="calm-card">No checklist items yet.</div>
          )}
        </div>
      </section>

      <section className="detail-section">
        <div className="section-title">Work Logs</div>
        <div className="log-stack">
          {taskWorkLogs.length > 0 ? (
            taskWorkLogs.map((log) => (
              <div key={log.id} className="log-card">
                <div className="log-card-head">
                  <strong>{log.summary}</strong>
                  <span>{formatDateTimeLabel(new Date(log.occurredAt))}</span>
                </div>
                <p>{log.details ?? 'No additional detail recorded.'}</p>
                <div className="section-subtitle">{log.durationMinutes ?? 0} min · {log.visibility}</div>
              </div>
            ))
          ) : (
            <div className="calm-card">No work logs recorded yet.</div>
          )}
        </div>
      </section>
    </aside>
  );
}
