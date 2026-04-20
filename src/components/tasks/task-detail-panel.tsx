'use client';

import {
  AlertTriangle,
  CheckSquare,
  Clock3,
  FileText,
  Flag,
  MessageSquare,
  Paperclip,
  PlayCircle,
  TimerReset
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTaskOpsStore } from '@/store/use-task-ops-store';
import { Project, Task, TaskStatus, User, WorkLog } from '@/types/domain';

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
  { value: 'review', label: 'Review' },
  { value: 'blocked', label: 'Blocked' },
  { value: 'done', label: 'Done' }
];

export function TaskDetailPanel({ task, users, projects, workLogs }: TaskDetailPanelProps) {
  const { addWorkLog, updateTask, toggleSubtask } = useTaskOpsStore();
  const [isEditing, setIsEditing] = useState(false);
  const [draftTitle, setDraftTitle] = useState('');
  const [draftDescription, setDraftDescription] = useState('');
  const [logSummary, setLogSummary] = useState('');
  const [logDetails, setLogDetails] = useState('');
  const [logMinutes, setLogMinutes] = useState('30');

  useEffect(() => {
    setDraftTitle(task?.title ?? '');
    setDraftDescription(task?.description ?? '');
    setLogSummary('');
    setLogDetails('');
    setLogMinutes('30');
    setIsEditing(false);
  }, [task?.id, task?.title, task?.description]);

  if (!task) {
    return (
      <aside className="detail-panel empty">
        <div className="empty-state">
          <CheckSquare size={18} />
          <h2>Select a task</h2>
          <p>Task planning, work logs, risk, and reporting context will appear here.</p>
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

  const handleToggleDone = () => {
    updateTask(task.id, {
      status: task.status === 'done' ? 'ready' : 'done',
      progress: task.status === 'done' ? Math.min(task.progress, 95) : 100
    });
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

    setLogSummary('');
    setLogDetails('');
    setLogMinutes('30');
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
              <button onClick={handleToggleDone}>{task.status === 'done' ? 'Reopen' : 'Done'}</button>
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
        <div className="section-title">Planning</div>
        <div className="info-grid">
          <div><strong>Owner</strong><span>{owner?.name ?? 'Unassigned'}</span></div>
          <div><strong>Reviewer</strong><span>{reviewer?.name ?? 'None'}</span></div>
          <div><strong>Backup</strong><span>{backupOwner?.name ?? 'None'}</span></div>
          <div><strong>Due</strong><span>{task.dueAt ? new Date(task.dueAt).toLocaleString() : 'No due date'}</span></div>
          <div><strong>Estimate</strong><span>{task.estimateHours ?? 0}h</span></div>
          <div><strong>Recurrence</strong><span>{task.recurrence ?? 'One-time'}</span></div>
        </div>
      </section>

      <section className="detail-section">
        <div className="section-title">Checklist</div>
        <div className="section-subtitle">{completedSubtasks}/{task.subtasks.length} complete</div>
        <div className="list-stack">
          {task.subtasks.map((subtask) => (
            <button key={subtask.id} className="list-row is-clickable" onClick={() => toggleSubtask(task.id, subtask.id)}>
              <span className={subtask.completed ? 'mini-check is-done' : 'mini-check'} />
              <span className={subtask.completed ? 'subtask-text is-done' : 'subtask-text'}>{subtask.title}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="detail-section">
        <div className="section-title">Execution</div>
        <div className="timer-card">
          <div>
            <strong>01:24:13</strong>
            <span>{task.loggedHours}h logged of {task.estimateHours ?? 0}h estimated</span>
          </div>
          <div className="timer-actions">
            <button><PlayCircle size={14} /> Start</button>
            <button><TimerReset size={14} /> Reset</button>
          </div>
        </div>
        <div className="action-pills">
          <span><Paperclip size={13} /> Attach file</span>
          <span><MessageSquare size={13} /> Add work log</span>
          <span><FileText size={13} /> Export</span>
        </div>
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
        <div className="section-title">Work Logs</div>
        <div className="log-stack">
          {taskWorkLogs.length > 0 ? (
            taskWorkLogs.map((log) => (
              <div key={log.id} className="log-card">
                <div className="log-card-head">
                  <strong>{log.summary}</strong>
                  <span>{new Date(log.occurredAt).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
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

      <section className="detail-section">
        <div className="section-title">Risk</div>
        {task.blocker ? (
          <div className="risk-card">
            <div className="risk-head">
              <AlertTriangle size={14} />
              <strong>{task.blocker.reason}</strong>
            </div>
            <p>{task.blocker.notes}</p>
            <div className="risk-meta">
              <span><Flag size={13} /> {task.blocker.severity}</span>
              <span><Clock3 size={13} /> SLA {task.sla?.targetAt?.slice(11, 16) ?? 'n/a'}</span>
            </div>
          </div>
        ) : (
          <div className="calm-card">No active blocker on this task.</div>
        )}
      </section>
    </aside>
  );
}
