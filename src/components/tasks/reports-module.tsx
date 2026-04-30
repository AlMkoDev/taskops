'use client';

import { FileCheck2, FilePenLine, PanelLeftClose, PanelLeftOpen, PanelRightClose, PanelRightOpen, Search } from 'lucide-react';
import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { getDefaultReportData, reportPeriods } from '../../data/report-framework';
import { agrireportsApi, setToken as setApiToken } from '../../lib/agrireports-api-client';
import { clearQueuedReportActions, enqueueReportAction, QueuedReportAction, readQueuedReportActions, replaceQueuedReportActions } from '../../lib/report-offline-queue';
import { useTaskOpsStore } from '../../store/use-task-ops-store';
import { AuthSessionView, AuthUser, ReportAuditEntry, ReportFrequency, ReportItemStatus, ReportNotificationEntry, ReportRecord, ReportReviewAction, ReportRoleDefinition, TaskPriority, WhatsAppMessage, ReportActivityEntry } from '../../types/domain';
import { RichTextEditor } from './rich-text-editor';
import { ToastContainer, toastManager } from './toast-notification';

type ActorMode = 'author' | 'reviewer';
type LeftPanelView = 'author' | 'reviewer' | 'admin' | 'security';
type EditorSection = 'narrative' | 'metrics' | 'actions' | 'signoff' | 'activity';
type NarrativeField = 'executive_summary' | 'variance_root_cause' | 'corrective_actions';
type WorkspaceView = 'create' | 'history';
type CorrectiveActionStatus = 'pending' | 'in_progress' | 'completed';
type CorrectiveActionPriority = 'low' | 'medium' | 'high' | 'critical';

type CorrectiveActionItem = {
  id: string;
  text: string;
  owner: string;
  status: CorrectiveActionStatus;
  completed: boolean;
  priority: CorrectiveActionPriority;
  dueDate?: string;
  linkedTaskId?: string;
};

const LEFT_RAIL_STORAGE_KEY = 'taskops.reports.left-rail-collapsed';
const RIGHT_RAIL_STORAGE_KEY = 'taskops.reports.right-rail-collapsed';

function getResponsiveRailDefaults(width: number) {
  if (width < 1180) {
    return { leftCollapsed: true, rightCollapsed: true };
  }
  if (width < 1480) {
    return { leftCollapsed: false, rightCollapsed: true };
  }
  return { leftCollapsed: false, rightCollapsed: false };
}

type SignaturePadHandle = {
  clear: () => void;
  isEmpty: () => boolean;
  getDataUrl: () => string;
};

function formatDateLabel(value?: string) {
  if (!value) return 'Not saved yet';
  return new Intl.DateTimeFormat('en-ZA', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'Africa/Johannesburg'
  }).format(new Date(value));
}

function statusLabel(status: ReportItemStatus | undefined) {
  switch (status) {
    case 'on_track':
      return 'On track';
    case 'warning':
      return 'Warning';
    case 'critical':
      return 'Critical';
    default:
      return 'Not set';
  }
}

function reportStatusLabel(status: ReportRecord['status'] | undefined) {
  return typeof status === 'string' && status.trim()
    ? status.replace(/_/g, ' ')
    : 'unknown';
}

function tokenLabel(value: unknown, fallback = 'unknown') {
  return typeof value === 'string' && value.trim()
    ? value.replace(/_/g, ' ')
    : fallback;
}

async function readJsonPayload<T>(response: Response, fallbackError: string): Promise<{ data?: T; error?: string }> {
  const text = await response.text();
  if (!text.trim()) {
    return response.ok ? {} : { error: fallbackError };
  }

  try {
    return JSON.parse(text) as { data?: T; error?: string };
  } catch {
    return { error: fallbackError };
  }
}

function buildFallbackRoleDefinition(report: ReportRecord): ReportRoleDefinition {
  const metricIds = new Set<string>();
  Object.keys(report.data ?? {}).forEach((key) => {
    const match = key.match(/^(.+)__(status|note|value)$/);
    if (match) metricIds.add(match[1]);
  });

  const items = Array.from(metricIds).map((id) => ({
    id,
    label: id
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (letter) => letter.toUpperCase()),
    status: ((report.data[`${id}__status`] as ReportItemStatus | undefined) ?? 'warning') as ReportItemStatus,
    trigger: 'Imported report metric',
    source: 'Saved report data',
    required: Boolean(report.data[`${id}__note`])
  }));

  return {
    id: report.roleId,
    name: report.roleName,
    category: report.category,
    description: 'Imported report framework reconstructed from saved report data.',
    items
  };
}

function reportRowMeta(report: ReportRecord, includeUpdated = false) {
  const base = `${report.roleName} · ${report.reportingWindow}`;
  return includeUpdated ? `${base} · Updated ${formatDateLabel(report.updatedAt)}` : base;
}

function canManageReportUsers(user: AuthUser | null) {
  return user?.role === 'admin' || user?.role === 'manager';
}

function canInspectStableIds(user: AuthUser | null) {
  return user?.role === 'admin';
}

function parseCorrectiveActions(rawList: unknown, rawText: unknown): CorrectiveActionItem[] {
  if (typeof rawList === 'string' && rawList.trim()) {
    try {
      const parsed = JSON.parse(rawList) as CorrectiveActionItem[];
      if (Array.isArray(parsed)) {
        return parsed.filter((item) => typeof item?.id === 'string' && typeof item?.text === 'string').map((item) => ({
          id: item.id,
          text: item.text,
          owner: item.owner || 'Unassigned',
          status: item.status || (item.completed ? 'completed' : 'pending'),
          completed: Boolean(item.completed || item.status === 'completed'),
          priority: item.priority || 'medium',
          dueDate: item.dueDate || '',
          linkedTaskId: item.linkedTaskId
        }));
      }
    } catch {
      // Fall back to parsing the plain-text field below.
    }
  }

  if (typeof rawText === 'string' && rawText.trim()) {
    return rawText
      .split('\n')
      .map((line) => line.replace(/^[-\u2022]\s*/, '').trim())
      .filter(Boolean)
      .map((text, index) => ({
        id: `legacy_action_${index}`,
        text,
        owner: 'Unassigned',
        status: 'pending' as const,
        completed: false,
        priority: 'medium' as const,
        dueDate: ''
      }));
  }

  return [];
}

function summarizeCorrectiveActions(actions: CorrectiveActionItem[]) {
  return actions.map((action) => `${action.completed ? '[Done]' : '[Open]'} ${action.text}${action.owner ? ` - ${action.owner}` : ''}`).join('\n');
}

const SignaturePad = forwardRef<SignaturePadHandle, { readOnly?: boolean; existingSignature?: string | undefined }>(({ readOnly = false, existingSignature }, ref) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext('2d');
    if (!context) return;
    context.lineWidth = 2;
    context.lineCap = 'round';
    context.strokeStyle = '#1f2937';
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, canvas.width, canvas.height);
  }, []);

  useImperativeHandle(ref, () => ({
    clear: () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const context = canvas.getContext('2d');
      if (!context) return;
      context.clearRect(0, 0, canvas.width, canvas.height);
      context.fillStyle = '#ffffff';
      context.fillRect(0, 0, canvas.width, canvas.height);
    },
    isEmpty: () => {
      const canvas = canvasRef.current;
      if (!canvas) return true;
      const pixels = canvas.getContext('2d')?.getImageData(0, 0, canvas.width, canvas.height).data;
      if (!pixels) return true;
      for (let index = 0; index < pixels.length; index += 4) {
        if (pixels[index] !== 255 || pixels[index + 1] !== 255 || pixels[index + 2] !== 255 || pixels[index + 3] !== 255) {
          return false;
        }
      }
      return true;
    },
    getDataUrl: () => canvasRef.current?.toDataURL('image/png') ?? ''
  }));

  function pointFromEvent(event: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  }

  function handlePointerDown(event: React.PointerEvent<HTMLCanvasElement>) {
    if (readOnly) return;
    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d');
    const point = pointFromEvent(event);
    if (!canvas || !context || !point) return;
    canvas.setPointerCapture(event.pointerId);
    context.beginPath();
    context.moveTo(point.x, point.y);
    setIsDrawing(true);
  }

  function handlePointerMove(event: React.PointerEvent<HTMLCanvasElement>) {
    if (!isDrawing || readOnly) return;
    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d');
    const point = pointFromEvent(event);
    if (!canvas || !context || !point) return;
    context.lineTo(point.x, point.y);
    context.stroke();
  }

  function handlePointerUp(event: React.PointerEvent<HTMLCanvasElement>) {
    if (!readOnly) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    setIsDrawing(false);
  }

  if (readOnly && existingSignature) {
    return <img className="reports-signature-preview" src={existingSignature} alt="Saved signature" />;
  }

  return (
    <div className="reports-signature-box">
      <canvas
        ref={canvasRef}
        className="reports-signature-canvas"
        width={540}
        height={180}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={() => setIsDrawing(false)}
      />
    </div>
  );
});

SignaturePad.displayName = 'SignaturePad';

export function ReportsModule() {
  const {
    reports,
    tasks,
    users,
    projects,
    selectedReportId,
    addTask,
    updateTask,
    setSelectedTaskId,
    setActiveSection,
    updateReportField,
    setSelectedReportId,
    updateReport,
    setReports,
    upsertReport
  } = useTaskOpsStore();

  const [actorMode, setActorMode] = useState<ActorMode>('author');
  const [leftPanelView, setLeftPanelView] = useState<LeftPanelView>('author');
  const [activeEditorSection, setActiveEditorSection] = useState<EditorSection>('narrative');
  const [workspaceView, setWorkspaceView] = useState<WorkspaceView>('history');
  const [reportSearch, setReportSearch] = useState('');
  const [reportStatusFilter, setReportStatusFilter] = useState<'all' | ReportRecord['status']>('all');
  const [reportFrequencyFilter, setReportFrequencyFilter] = useState<'all' | ReportFrequency>('all');
  const [newPeriod, setNewPeriod] = useState<ReportFrequency>('daily');
  const [newRoleId, setNewRoleId] = useState(reportPeriods[0].roles[0]?.id ?? '');
  const [reportingWindow, setReportingWindow] = useState('18 Apr 2026');
  const [reviewerId, setReviewerId] = useState('');
  const [reviewComments, setReviewComments] = useState('');
  const [validationMessage, setValidationMessage] = useState('');
  const [isOnline, setIsOnline] = useState(true);
  const [_isLoading, setIsLoading] = useState(true);
  const [syncMessage, setSyncMessage] = useState('');
  const [queueCount, setQueueCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [auditEntries, setAuditEntries] = useState<ReportAuditEntry[]>([]);
  const [notificationEntries, setNotificationEntries] = useState<ReportNotificationEntry[]>([]);
  const [whatsappMessages, setWhatsappMessages] = useState<WhatsAppMessage[]>([]);
  const [activityLogs, setActivityLogs] = useState<ReportActivityEntry[]>([]);
  const [securityAuditEntries, setSecurityAuditEntries] = useState<ReportAuditEntry[]>([]);
  const [securityNotificationEntries, setSecurityNotificationEntries] = useState<ReportNotificationEntry[]>([]);
  const [activeSessions, setActiveSessions] = useState<AuthSessionView[]>([]);
  const [sessionUser, setSessionUser] = useState<AuthUser | null>(null);
  const [authUsers, setAuthUsers] = useState<AuthUser[]>([]);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('demo123');
  const [authError, setAuthError] = useState('');
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [userAdminMessage, setUserAdminMessage] = useState('');
  const [isSavingUser, setIsSavingUser] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [isLeftRailCollapsed, setIsLeftRailCollapsed] = useState(false);
  const [isRightRailCollapsed, setIsRightRailCollapsed] = useState(false);
  const [editingNarrativeField, setEditingNarrativeField] = useState<NarrativeField | null>(null);
  const [editorModalField, setEditorModalField] = useState<NarrativeField | null>(null);
  const [editorDraftHtml, setEditorDraftHtml] = useState('');
  const [newActionText, setNewActionText] = useState('');
  const [newActionOwner, setNewActionOwner] = useState('');
  const [newActionPriority, setNewActionPriority] = useState<CorrectiveActionPriority>('medium');
  const [newActionDueDate, setNewActionDueDate] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [expandedMetrics, setExpandedMetrics] = useState<Record<string, boolean>>({});
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [showMetricInfo, setShowMetricInfo] = useState<Record<string, boolean>>({});
  const [isTagsExpanded, setIsTagsExpanded] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [userForm, setUserForm] = useState({
    id: '',
    name: '',
    email: '',
    role: 'author' as AuthUser['role'],
    team: '',
    status: 'active' as AuthUser['status'],
    password: ''
  });
  const authorSignatureRef = useRef<SignaturePadHandle | null>(null);
  const reviewerSignatureRef = useRef<SignaturePadHandle | null>(null);
  const richEditorRef = useRef<HTMLDivElement | null>(null);
  const hasStoredRailPreferences = useRef(false);
  const lastAutosaveSignature = useRef<Record<string, string>>({});

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const savedLeft = window.localStorage.getItem(LEFT_RAIL_STORAGE_KEY);
    const savedRight = window.localStorage.getItem(RIGHT_RAIL_STORAGE_KEY);

    if (savedLeft !== null || savedRight !== null) {
      hasStoredRailPreferences.current = true;
      if (savedLeft !== null) {
        setIsLeftRailCollapsed(savedLeft === 'true');
      }
      if (savedRight !== null) {
        setIsRightRailCollapsed(savedRight === 'true');
      }
      return;
    }

    const defaults = getResponsiveRailDefaults(window.innerWidth);
    setIsLeftRailCollapsed(defaults.leftCollapsed);
    setIsRightRailCollapsed(defaults.rightCollapsed);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!hasStoredRailPreferences.current) return;
    window.localStorage.setItem(LEFT_RAIL_STORAGE_KEY, String(isLeftRailCollapsed));
  }, [isLeftRailCollapsed]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!hasStoredRailPreferences.current) return;
    window.localStorage.setItem(RIGHT_RAIL_STORAGE_KEY, String(isRightRailCollapsed));
  }, [isRightRailCollapsed]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    function handleResize() {
      if (hasStoredRailPreferences.current) return;
      const defaults = getResponsiveRailDefaults(window.innerWidth);
      setIsLeftRailCollapsed(defaults.leftCollapsed);
      setIsRightRailCollapsed(defaults.rightCollapsed);
    }

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (!editorModalField || !richEditorRef.current) return;
    richEditorRef.current.innerHTML = editorDraftHtml;
  }, [editorDraftHtml, editorModalField]);

  function toggleLeftRail() {
    hasStoredRailPreferences.current = true;
    setIsLeftRailCollapsed((current) => {
      const next = !current;
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(LEFT_RAIL_STORAGE_KEY, String(next));
      }
      return next;
    });
  }

  function toggleRightRail() {
    hasStoredRailPreferences.current = true;
    setIsRightRailCollapsed((current) => {
      const next = !current;
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(RIGHT_RAIL_STORAGE_KEY, String(next));
      }
      return next;
    });
  }

  function updateCorrectiveActionItems(items: CorrectiveActionItem[]) {
    if (!selectedReport) return;
    updateReportField(selectedReport.id, 'corrective_actions_items', JSON.stringify(items));
    updateReportField(selectedReport.id, 'corrective_actions', summarizeCorrectiveActions(items));
    items.forEach((item) => {
      if (!item.linkedTaskId) return;
      const isDone = item.completed || item.status === 'completed';
      updateTask(item.linkedTaskId, isDone
        ? { status: 'done', progress: 100 }
        : { status: item.status === 'pending' ? 'ready' : 'in_progress' });
    });
  }

  function correctiveActionTaskPriority(priority: CorrectiveActionPriority): TaskPriority {
    if (priority === 'critical' || priority === 'high') return 'P1';
    if (priority === 'medium') return 'P2';
    return 'P3';
  }

  function createTaskFromCorrectiveAction(action: CorrectiveActionItem) {
    if (!selectedReport || action.linkedTaskId) return;

    const taskId = `t_report_${Date.now()}`;
    const owner = users.find((user) => user.name.toLowerCase() === action.owner.toLowerCase()) ?? users[0] ?? null;
    const reviewer = users.find((user) => user.id === selectedReport.reviewerId) ?? users.find((user) => user.name === selectedReport.reviewerName);

    addTask({
      id: taskId,
      type: 'report',
      title: action.text,
      description: `Follow-up from ${selectedReport.title} (${selectedReport.reportingWindow}).`,
      status: action.completed ? 'done' : 'ready',
      priority: correctiveActionTaskPriority(action.priority),
      projectId: projects[0]?.id,
      ownerId: owner?.id ?? 'unassigned',
      reviewerId: reviewer?.id,
      backupOwnerId: undefined,
      watcherIds: reviewer?.id ? [reviewer.id] : [],
      tags: ['report-follow-up', selectedReport.roleName, selectedReport.period],
      startAt: undefined,
      dueAt: action.dueDate ? new Date(action.dueDate).toISOString() : undefined,
      estimateHours: 1,
      loggedHours: 0,
      progress: action.completed ? 100 : 0,
      recurrence: undefined,
      dependencyIds: [],
      subtasks: [],
      blocker: null,
      sla: { enabled: false },
      attachmentIds: [],
      workLogIds: [],
      activityIds: []
    });

    updateCorrectiveActionItems(correctiveActionItems.map((item) => item.id === action.id ? { ...item, linkedTaskId: taskId } : item));
    toastManager.success('Follow-up task created');
  }

  function openLinkedTask(taskId: string) {
    setSelectedTaskId(taskId);
    setActiveSection('tasks');
  }

  function openNarrativeEditor(field: NarrativeField) {
    if (!selectedReport) return;
    setEditingNarrativeField(field);
    setEditorModalField(field);
    setEditorDraftHtml((selectedReport.data[field] as string | undefined) ?? '');
  }

  function closeNarrativeEditor() {
    setEditingNarrativeField(null);
    setEditorModalField(null);
    setEditorDraftHtml('');
  }

  function applyEditorCommand(command: 'bold' | 'italic' | 'underline' | 'insertUnorderedList' | 'insertOrderedList') {
    if (typeof document === 'undefined') return;
    document.execCommand(command, false);
    setEditorDraftHtml(richEditorRef.current?.innerHTML ?? '');
    richEditorRef.current?.focus();
  }

  function saveNarrativeEditor() {
    if (!selectedReport || !editorModalField) return;
    updateReportField(selectedReport.id, editorModalField, editorDraftHtml);
    closeNarrativeEditor();
    toastManager.success('Narrative section saved');
  }

  function generateAISummary() {
    if (!selectedReport || !selectedRoleDefinition) return;
    
    // Collect data points for summary generation
    const data = selectedReport.data;
    const metrics = selectedRoleDefinition.items;
    
    // Count completed metrics
    const completedMetrics = metrics.filter(m => data[`${m.id}__note`]?.trim()).length;
    const totalMetrics = metrics.length;
    
    // Get corrective actions count
    const actionsCount = correctiveActionItems.length;
    const completedActions = correctiveActionItems.filter(a => a.completed).length;
    const pendingActions = actionsCount - completedActions;
    
    // Check for critical items
    const criticalItems = metrics.filter(m => m.status === 'critical' && data[`${m.id}__note`]?.trim());
    const warningItems = metrics.filter(m => m.status === 'warning' && data[`${m.id}__note`]?.trim());
    
    // Generate summary based on available data
    let summary = `<p><strong>${selectedReport.period.toUpperCase()} REPORT - ${selectedReport.roleName.toUpperCase()}</strong></p>`;
    summary += `<p><strong>Reporting Period:</strong> ${selectedReport.reportingWindow}</p>`;
    summary += `<p><strong>Overall Status:</strong> ${completedMetrics}/${totalMetrics} metrics captured`;
    
    if (criticalItems.length > 0) {
      summary += ` | <span style="color: #dc2626;">${criticalItems.length} CRITICAL item(s) flagged</span>`;
    }
    if (warningItems.length > 0) {
      summary += ` | <span style="color: #f59e0b;">${warningItems.length} WARNING item(s)</span>`;
    }
    summary += `</p>`;
    
    if (actionsCount > 0) {
      summary += `<p><strong>Corrective Actions:</strong> ${completedActions}/${actionsCount} completed`;
      if (pendingActions > 0) {
        summary += ` | ${pendingActions} pending`;
      }
      summary += `</p>`;
    }
    
    // Add critical findings if any
    if (criticalItems.length > 0) {
      summary += `<p><strong>Critical Findings:</strong></p><ul>`;
      criticalItems.forEach(item => {
        summary += `<li>${item.label}: ${data[`${item.id}__note`] || 'Requires immediate attention'}</li>`;
      });
      summary += `</ul>`;
    }
    
    // Add next steps
    summary += `<p><strong>Recommended Next Steps:</strong></p><ul>`;
    if (completedMetrics < totalMetrics) {
      summary += `<li>Complete remaining ${totalMetrics - completedMetrics} metric observations</li>`;
    }
    if (pendingActions > 0) {
      summary += `<li>Address ${pendingActions} pending corrective actions</li>`;
    }
    if (criticalItems.length > 0) {
      summary += `<li>Escalate ${criticalItems.length} critical item(s) to management</li>`;
    }
    summary += `<li>Submit report for review when all required fields are complete</li>`;
    summary += `</ul>`;
    
    // Update the executive summary field
    updateReportField(selectedReport.id, 'executive_summary', summary);
    toastManager.success('AI summary generated from report data');
  }

  function refreshQueueCount() {
    setQueueCount(readQueuedReportActions().length);
  }

  async function loadReports() {
    setIsLoading(true);
    try {
      const response = await fetch('/api/reports', { cache: 'no-store' });
      const payload = (await response.json()) as { data?: ReportRecord[]; error?: string };
      if (response.status === 401) {
        setSessionUser(null);
        setReports([]);
        setValidationMessage('');
        setAuthError('Sign in to access the Reports workflow.');
        return;
      }
      if (!response.ok || !payload.data) {
        throw new Error(payload.error || 'Failed to load reports.');
      }
      setReports(payload.data);
    } catch (error) {
      setValidationMessage(error instanceof Error ? error.message : 'Failed to load reports.');
    } finally {
      setIsLoading(false);
    }
  }

  async function loadSession() {
    const response = await fetch('/api/auth/session', { cache: 'no-store' });
    const payload = (await response.json()) as { data?: AuthUser | null };
    const user = payload.data ?? null;
    setSessionUser(user);
    return user;
  }

  async function loadAuthUsers() {
    const response = await fetch('/api/auth/users', { cache: 'no-store' });
    const payload = (await response.json()) as { data?: AuthUser[]; error?: string };
    if (!response.ok || !payload.data) {
      throw new Error(payload.error || 'Failed to load users.');
    }
    setAuthUsers(payload.data);
    return payload.data;
  }

  async function loadSessions() {
    const response = await fetch('/api/auth/sessions', { cache: 'no-store' });
    const payload = (await response.json()) as { data?: AuthSessionView[]; error?: string };
    if (!response.ok || !payload.data) {
      throw new Error(payload.error || 'Failed to load sessions.');
    }
    setActiveSessions(payload.data);
    return payload.data;
  }

  async function loadSecurityActivity() {
    const response = await fetch('/api/auth/activity', { cache: 'no-store' });
    const payload = (await response.json()) as {
      data?: { auditEntries?: ReportAuditEntry[]; notificationEntries?: ReportNotificationEntry[] };
      error?: string;
    };
    if (!response.ok || !payload.data) {
      throw new Error(payload.error || 'Failed to load security activity.');
    }
    setSecurityAuditEntries(payload.data.auditEntries ?? []);
    setSecurityNotificationEntries(payload.data.notificationEntries ?? []);
    return payload.data;
  }

  async function loadReportActivity(reportId: string) {
    try {
      const [auditResponse, notificationsResponse, whatsappResponse, activityResponse] = await Promise.all([
        fetch(`/api/reports/${reportId}/audit`, { cache: 'no-store' }),
        fetch(`/api/reports/${reportId}/notifications`, { cache: 'no-store' }),
        fetch(`/api/reports/${reportId}/whatsapp`, { cache: 'no-store' }),
        fetch(`/api/reports/${reportId}/activity`, { cache: 'no-store' })
      ]);
      const auditPayload = (await auditResponse.json()) as { data?: ReportAuditEntry[] };
      const notificationsPayload = (await notificationsResponse.json()) as { data?: ReportNotificationEntry[] };
      const whatsappPayload = (await whatsappResponse.json()) as { data?: WhatsAppMessage[] };
      const activityPayload = (await activityResponse.json()) as { data?: ReportActivityEntry[] };
      setAuditEntries(auditPayload.data ?? []);
      setNotificationEntries(notificationsPayload.data ?? []);
      setWhatsappMessages(whatsappPayload.data ?? []);
      setActivityLogs(activityPayload.data ?? []);
    } catch {
      setAuditEntries([]);
      setNotificationEntries([]);
      setWhatsappMessages([]);
      setActivityLogs([]);
    }
  }

  async function saveReportPatch(reportId: string, patch: Partial<ReportRecord>, successMessage?: string) {
    setSaveStatus('saving');
    try {
      const response = await fetch(`/api/reports/${reportId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch)
      });
      const payload = await readJsonPayload<ReportRecord>(response, 'The server returned an invalid report save response.');
      if (!response.ok || !payload.data) {
        throw new Error(payload.error || 'Failed to save report.');
      }
      upsertReport(payload.data);
      setSaveStatus('saved');
      if (successMessage) {
        setSyncMessage(successMessage);
      }
      setTimeout(() => setSaveStatus('idle'), 2000);
      return payload.data;
    } catch (error) {
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
      throw error;
    }
  }

  async function processQueuedAction(action: QueuedReportAction) {
    if (action.type === 'create') {
      const response = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(action.payload)
      });
      const payload = await readJsonPayload<ReportRecord>(response, 'The server returned an invalid queued report creation response.');
      if (!response.ok || !payload.data) {
        throw new Error(payload.error || 'Failed to create queued report.');
      }
      setReports(reports.map((report) => (report.id === action.tempReportId ? payload.data as ReportRecord : report)));
      setSelectedReportId(payload.data.id);
      return payload.data.id;
    }

    if (action.type === 'update') {
      await saveReportPatch(action.reportId, action.payload);
      return null;
    }

    if (action.type === 'submit') {
      const response = await fetch(`/api/reports/${action.reportId}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(action.payload)
      });
      const payload = await readJsonPayload<ReportRecord>(response, 'The server returned an invalid queued submission response.');
      if (!response.ok || !payload.data) {
        throw new Error(payload.error || 'Failed to submit queued report.');
      }
      upsertReport(payload.data);
      return null;
    }

    const response = await fetch(`/api/reports/${action.reportId}/review`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(action.payload)
    });
    const payload = await readJsonPayload<ReportRecord>(response, 'The server returned an invalid queued review response.');
    if (!response.ok || !payload.data) {
      throw new Error(payload.error || 'Failed to review queued report.');
    }
    upsertReport(payload.data);
    return null;
  }

  async function flushQueuedActions() {
    if (!isOnline) return;

    const queuedActions = readQueuedReportActions();
    if (queuedActions.length === 0) {
      refreshQueueCount();
      return;
    }

    setIsSyncing(true);
    const remaining: QueuedReportAction[] = [];
    const idMap = new Map<string, string>();

    for (const rawAction of queuedActions) {
      const action =
        rawAction.type === 'create'
          ? rawAction
          : {
              ...rawAction,
              reportId: idMap.get(rawAction.reportId) ?? rawAction.reportId
            };
      try {
        const createdId = await processQueuedAction(action);
        if (action.type === 'create' && createdId) {
          idMap.set(action.tempReportId, createdId);
        }
      } catch {
        remaining.push(action);
      }
    }

    if (remaining.length === 0) {
      clearQueuedReportActions();
      setSyncMessage('Queued report actions synced.');
    } else {
      replaceQueuedReportActions(remaining);
      setSyncMessage(`${remaining.length} queued action${remaining.length === 1 ? '' : 's'} still waiting to sync.`);
    }

    refreshQueueCount();
    setIsSyncing(false);
  }

  useEffect(() => {
    setIsOnline(typeof navigator === 'undefined' ? true : navigator.onLine);
    function handleOnlineStatus() {
      setIsOnline(navigator.onLine);
      if (navigator.onLine) {
        void flushQueuedActions();
      }
    }
    window.addEventListener('online', handleOnlineStatus);
    window.addEventListener('offline', handleOnlineStatus);
    return () => {
      window.removeEventListener('online', handleOnlineStatus);
      window.removeEventListener('offline', handleOnlineStatus);
    };
  }, []);

  useEffect(() => {
    refreshQueueCount();
    void (async () => {
      try {
        const currentUser = await loadSession();
        if (currentUser) {
          await loadAuthUsers();
          if (canManageReportUsers(currentUser)) {
            await loadSessions();
            await loadSecurityActivity();
          } else {
            setActiveSessions([]);
            setSecurityAuditEntries([]);
            setSecurityNotificationEntries([]);
          }
          await loadReports();
          setAuthError('');
          setLoginEmail(currentUser.email);
          if (typeof navigator !== 'undefined' && navigator.onLine) {
            await flushQueuedActions();
          }
        } else {
          setIsLoading(false);
          setReports([]);
          setAuthError('Sign in to access the Reports workflow.');
        }
      } catch (error) {
        setIsLoading(false);
        setAuthError(error instanceof Error ? error.message : 'Failed to initialise report authentication.');
      }
    })();
  }, []);

  useEffect(() => {
    const periodDefinition = reportPeriods.find((period) => period.id === newPeriod);
    if (!periodDefinition) return;
    setNewRoleId(periodDefinition.roles[0]?.id ?? '');
  }, [newPeriod]);

  const selectedReport = useMemo(() => reports.find((report) => report.id === selectedReportId) ?? reports[0] ?? null, [reports, selectedReportId]);
  const selectedReportDataSignature = useMemo(() => selectedReport ? JSON.stringify(selectedReport.data) : '', [selectedReport]);
  const selectedPeriodDefinition = useMemo(() => reportPeriods.find((period) => period.id === selectedReport?.period) ?? null, [selectedReport?.period]);
  const selectedRoleDefinition = useMemo(() => {
    if (!selectedReport) return null;
    return selectedPeriodDefinition?.roles.find((role) => role.id === selectedReport.roleId) ?? buildFallbackRoleDefinition(selectedReport);
  }, [selectedPeriodDefinition, selectedReport]);
  const availableRoles = useMemo(() => reportPeriods.find((period) => period.id === newPeriod)?.roles ?? [], [newPeriod]);
  const reviewerOptions = useMemo(() => authUsers.filter((user) => user.status === 'active' && user.id !== sessionUser?.id), [authUsers, sessionUser?.id]);
  const selectedReviewer = useMemo(() => reviewerOptions.find((user) => user.id === reviewerId) ?? reviewerOptions[0] ?? null, [reviewerId, reviewerOptions]);
  const canManageUsers = useMemo(() => canManageReportUsers(sessionUser), [sessionUser]);
  const hasAdminSecurityAccess = canManageUsers;
  const canInspectIds = useMemo(() => canInspectStableIds(sessionUser), [sessionUser]);
  const canAuthorSelectedReport = useMemo(() => {
    if (!sessionUser || !selectedReport) return false;
    return sessionUser.role === 'admin' || sessionUser.role === 'manager' || !selectedReport.authorId || selectedReport.authorId === sessionUser.id;
  }, [selectedReport, sessionUser]);
  const canReviewSelectedReport = useMemo(() => {
    if (!sessionUser || !selectedReport) return false;
    return sessionUser.role === 'admin' || sessionUser.role === 'manager' || !selectedReport.reviewerId || selectedReport.reviewerId === sessionUser.id;
  }, [selectedReport, sessionUser]);

  // Keyboard shortcuts
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      // Ctrl+S or Cmd+S to save current draft
      if ((event.ctrlKey || event.metaKey) && event.key === 's') {
        event.preventDefault();
        if (selectedReport && selectedReport.status === 'draft') {
          const patch = { data: selectedReport.data, lastSavedAt: new Date().toISOString() };
          saveReportPatch(selectedReport.id, patch, 'Draft saved successfully');
        } else {
          toastManager.info('No draft to save');
        }
      }
      
      // Escape to close modal or clear editing state
      if (event.key === 'Escape') {
        if (editorModalField) {
          closeNarrativeEditor();
        } else if (editingNarrativeField) {
          setEditingNarrativeField(null);
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedReport, editorModalField, editingNarrativeField]);

  useEffect(() => {
    if (!selectedReport && reports[0]) {
      setSelectedReportId(reports[0].id);
    }
  }, [reports, selectedReport, setSelectedReportId]);

  useEffect(() => {
    if (!selectedReport) return;
    if (lastAutosaveSignature.current[selectedReport.id] === undefined) {
      lastAutosaveSignature.current[selectedReport.id] = selectedReportDataSignature;
    }
  }, [selectedReport?.id, selectedReportDataSignature]);

  useEffect(() => {
    if (!reviewerId && reviewerOptions[0]) {
      setReviewerId(reviewerOptions[0].id);
    }
  }, [reviewerId, reviewerOptions]);

  useEffect(() => {
    if (actorMode === 'reviewer' && !canReviewSelectedReport) {
      const canUseReviewerWorkspace = sessionUser?.role === 'admin' || sessionUser?.role === 'manager' || sessionUser?.role === 'reviewer';
      if (!canUseReviewerWorkspace) {
        setActorMode('author');
      }
    }
  }, [actorMode, canReviewSelectedReport, sessionUser?.role]);

  useEffect(() => {
    if (leftPanelView === 'reviewer') {
      setActorMode('reviewer');
    } else if (leftPanelView === 'author') {
      setActorMode('author');
    }
  }, [leftPanelView]);

  useEffect(() => {
    if (!hasAdminSecurityAccess && (leftPanelView === 'admin' || leftPanelView === 'security')) {
      toastManager.info('Admin and security tools are available to managers only.');
      setLeftPanelView('author');
    }
  }, [hasAdminSecurityAccess, leftPanelView]);

  useEffect(() => {
    if (!selectedReport?.id || selectedReport.id.startsWith('temp_report_')) {
      setAuditEntries([]);
      setNotificationEntries([]);
      return;
    }
    void loadReportActivity(selectedReport.id);
  }, [selectedReport?.id, selectedReport?.updatedAt]);

  useEffect(() => {
    if (!selectedReport || selectedReport.status !== 'draft') return;
    if (lastAutosaveSignature.current[selectedReport.id] === selectedReportDataSignature) return;
    const timeoutId = window.setTimeout(() => {
      lastAutosaveSignature.current[selectedReport.id] = selectedReportDataSignature;
      const patch = { data: selectedReport.data, lastSavedAt: new Date().toISOString() };
      if (!isOnline || selectedReport.id.startsWith('temp_report_')) {
        enqueueReportAction({
          id: `queue_${Date.now()}`,
          type: 'update',
          reportId: selectedReport.id,
          payload: patch
        });
        refreshQueueCount();
        updateReport(selectedReport.id, patch);
        setSyncMessage('Draft saved locally and queued for sync.');
        return;
      }
      saveReportPatch(selectedReport.id, patch, 'Draft autosaved.').catch((error) => {
        setValidationMessage(error instanceof Error ? error.message : 'Autosave failed. Use Save draft to retry.');
      });
    }, 3000);
    return () => window.clearTimeout(timeoutId);
  }, [isOnline, selectedReport, selectedReportDataSignature, updateReport]);

  const reportResults = useMemo(() => {
    const normalizedQuery = reportSearch.trim().toLowerCase();
    return reports.filter((report) => {
      const title = report.title || '';
      const roleName = report.roleName || '';
      const reportingWindow = report.reportingWindow || '';
      
      const matchesSearch =
        normalizedQuery.length === 0 ||
        title.toLowerCase().includes(normalizedQuery) ||
        roleName.toLowerCase().includes(normalizedQuery) ||
        reportingWindow.toLowerCase().includes(normalizedQuery);
      const matchesStatus = reportStatusFilter === 'all' || report.status === reportStatusFilter;
      const matchesFrequency = reportFrequencyFilter === 'all' || report.period === reportFrequencyFilter;
      return matchesSearch && matchesStatus && matchesFrequency;
    });
  }, [reportFrequencyFilter, reportSearch, reportStatusFilter, reports]);

  const continueDraftReports = useMemo(
    () => reportResults.filter((report) => report.status === 'draft' && (!sessionUser || !report.authorId || report.authorId === sessionUser.id)),
    [reportResults, sessionUser]
  );
  const awaitingReviewReports = useMemo(
    () => reportResults.filter((report) => report.status === 'submitted' && (!sessionUser || !report.reviewerId || report.reviewerId === sessionUser.id || canManageUsers)),
    [canManageUsers, reportResults, sessionUser]
  );
  const historyReports = useMemo(
    () => reportResults.filter((report) => report.status === 'approved' || report.status === 'rejected' || report.status === 'changes_requested'),
    [reportResults]
  );

  function handleOpenContinueDraft() {
    if (continueDraftReports.length === 0) {
      setWorkspaceView('create');
      setValidationMessage('No draft is available yet. Create a new draft to begin.');
      return;
    }

    setWorkspaceView('history');
    setSelectedReportId(continueDraftReports[0].id);
    setValidationMessage('');
  }

  function handleOpenCreateReport() {
    setWorkspaceView('create');
    setValidationMessage('');
  }

  function validateReport(report: ReportRecord, roleDefinition: ReportRoleDefinition | null) {
    if (!report.data.executive_summary.trim()) return 'Executive summary is required before submission.';
    if (!report.data.corrective_actions.trim()) return 'Corrective actions are required before submission.';
    const missingRequiredItem = roleDefinition?.items.find((item) => item.required && !report.data[`${item.id}__note`]?.trim());
    if (missingRequiredItem) return `Add an observation for "${missingRequiredItem.label}" before submitting.`;
    return '';
  }

  async function handleCreateReport() {
    if (!sessionUser) {
      setAuthError('Sign in before creating a report.');
      return;
    }
    const periodDefinition = reportPeriods.find((period) => period.id === newPeriod);
    const roleDefinition = periodDefinition?.roles.find((role) => role.id === newRoleId);
    if (!periodDefinition || !roleDefinition) return;
    if (!selectedReviewer) {
      setValidationMessage('Choose a reviewer before creating a report.');
      return;
    }

    const createPayload = {
      title: `${periodDefinition.label} ${roleDefinition.name} report`,
      period: newPeriod,
      roleId: roleDefinition.id,
      roleName: roleDefinition.name,
      category: roleDefinition.category,
      authorId: sessionUser.id,
      authorName: sessionUser.name,
      reviewerId: selectedReviewer.id,
      reviewerName: selectedReviewer.name,
      reportingWindow,
      data: getDefaultReportData(roleDefinition)
    } satisfies Omit<Extract<QueuedReportAction, { type: 'create' }>['payload'], never>;

    if (!isOnline) {
      const now = new Date().toISOString();
      const tempReport: ReportRecord = {
        id: `temp_report_${Date.now()}`,
        status: 'draft',
        createdAt: now,
        updatedAt: now,
        lastSavedAt: now,
        submittedAt: undefined,
        reviewedAt: undefined,
        signature: undefined,
        reviewerSignature: undefined,
        reviewComments: undefined,
        ...createPayload
      };
      upsertReport(tempReport);
      enqueueReportAction({
        id: `queue_${Date.now()}`,
        type: 'create',
        tempReportId: tempReport.id,
        payload: createPayload
      });
      refreshQueueCount();
      setSelectedReportId(tempReport.id);
      setWorkspaceView('history');
      setValidationMessage('');
      setSyncMessage('Draft created locally and queued for sync.');
      return;
    }

    try {
      const response = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(createPayload)
      });
      const result = await readJsonPayload<ReportRecord>(response, 'The server returned an invalid report creation response.');
      if (!response.ok || !result.data) {
        throw new Error(result.error || 'Failed to create report.');
      }
      const createdDraft = result.data;
      upsertReport(createdDraft);
      setValidationMessage('');
      setSyncMessage('Draft created on the server.');

      setSelectedReportId(createdDraft.id);
      setWorkspaceView('history');
    } catch (error) {
      setValidationMessage(error instanceof Error ? error.message : 'Failed to create report.');
    }
  }

  async function handleSubmitReport() {
    if (!selectedReport || !selectedRoleDefinition) return;
    const error = validateReport(selectedReport, selectedRoleDefinition);
    if (error) {
      setValidationMessage(error);
      return;
    }
    if (!authorSignatureRef.current || authorSignatureRef.current.isEmpty()) {
      setValidationMessage('Author signature is required before submission.');
      return;
    }

    if (!isOnline || selectedReport.id.startsWith('temp_report_')) {
      const signature = authorSignatureRef.current.getDataUrl();
      updateReport(selectedReport.id, {
        status: 'submitted',
        signature,
        submittedAt: new Date().toISOString()
      });
      enqueueReportAction({
        id: `queue_${Date.now()}`,
        type: 'submit',
        reportId: selectedReport.id,
        payload: { signature }
      });
      refreshQueueCount();
      setValidationMessage('');
      setSyncMessage('Submission queued until connectivity returns.');
      toastManager.info('Submission queued - will sync when online');
      return;
    }

    try {
      const response = await fetch(`/api/reports/${selectedReport.id}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ signature: authorSignatureRef.current.getDataUrl() })
      });
      const payload = await readJsonPayload<ReportRecord>(response, 'The server returned an invalid submission response.');
      if (!response.ok || !payload.data) {
        throw new Error(payload.error || 'Failed to submit report.');
      }
      upsertReport(payload.data);
      setValidationMessage('');
      setSyncMessage('Report submitted for review.');
      toastManager.success('Report submitted for review successfully');
    } catch (submitError) {
      setValidationMessage(submitError instanceof Error ? submitError.message : 'Failed to submit report.');
      toastManager.error('Failed to submit report');
    }
  }

  async function handleSaveDraft() {
    if (!selectedReport || selectedReport.status !== 'draft') {
      toastManager.info('Only draft reports can be saved.');
      return;
    }
    const patch = { data: selectedReport.data, lastSavedAt: new Date().toISOString() };
    if (!isOnline || selectedReport.id.startsWith('temp_report_')) {
      enqueueReportAction({
        id: `queue_${Date.now()}`,
        type: 'update',
        reportId: selectedReport.id,
        payload: patch
      });
      refreshQueueCount();
      updateReport(selectedReport.id, patch);
      setSyncMessage('Draft saved locally and queued for sync.');
      toastManager.info('Draft saved locally');
      return;
    }

    await saveReportPatch(selectedReport.id, patch, 'Draft saved successfully.');
  }

  async function handleReview(action: ReportReviewAction) {
    if (!selectedReport) return;
    if (action === 'approve' && (!reviewerSignatureRef.current || reviewerSignatureRef.current.isEmpty())) {
      setValidationMessage('Reviewer signature is required for approval.');
      return;
    }

    if (!isOnline || selectedReport.id.startsWith('temp_report_')) {
      const signature = action === 'approve' ? reviewerSignatureRef.current?.getDataUrl() : undefined;
      updateReport(selectedReport.id, {
        status: action === 'approve' ? 'approved' : action === 'reject' ? 'rejected' : 'changes_requested',
        reviewComments,
        reviewerSignature: signature,
        reviewedAt: new Date().toISOString()
      });
      enqueueReportAction({
        id: `queue_${Date.now()}`,
        type: 'review',
        reportId: selectedReport.id,
        payload: {
          action,
          comments: reviewComments,
          signature
        }
      });
      refreshQueueCount();
      setReviewComments('');
      setValidationMessage('');
      setSyncMessage(`Review action queued: ${action.replace('_', ' ')}.`);
      return;
    }

    try {
      const response = await fetch(`/api/reports/${selectedReport.id}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          comments: reviewComments,
          signature: action === 'approve' ? reviewerSignatureRef.current?.getDataUrl() : undefined
        })
      });
      const payload = await readJsonPayload<ReportRecord>(response, 'The server returned an invalid review response.');
      if (!response.ok || !payload.data) {
        throw new Error(payload.error || 'Failed to review report.');
      }
      upsertReport(payload.data);
      setReviewComments('');
      setValidationMessage('');
      setSyncMessage(`Review submitted: ${action.replace('_', ' ')}.`);
      toastManager.success(`Report ${action.replace('_', ' ')} successfully`);
    } catch (reviewError) {
      setValidationMessage(reviewError instanceof Error ? reviewError.message : 'Failed to review report.');
      toastManager.error('Failed to review report');
    }
  }

  async function handleLogin() {
    setIsAuthenticating(true);
    setAuthError('');
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginEmail, password: loginPassword })
      });
      const payload = (await response.json()) as { data?: AuthUser; error?: string };
      if (!response.ok || !payload.data) {
        throw new Error(payload.error || 'Login failed.');
      }
      const authenticatedUser = payload.data;
      setSessionUser(authenticatedUser);
      setValidationMessage('');
      
      // Also get JWT token for v1 API access
      try {
        const jwtResponse = await agrireportsApi.login(loginEmail, loginPassword);
        if (jwtResponse.success && jwtResponse.data) {
          setApiToken(jwtResponse.data.token);
        }
      } catch (jwtError) {
        // Non-critical: v1 API token acquisition failed, but session auth succeeded
        console.warn('Failed to get JWT token for v1 API:', jwtError);
      }
      
      await loadAuthUsers();
      await loadSessions();
      await loadSecurityActivity();
      await loadReports();
      setAuthError('');
      setSyncMessage(`Signed in as ${authenticatedUser.name}.`);
      setUserForm((current) => ({
        ...current,
        name: authenticatedUser.name,
        email: authenticatedUser.email,
        team: authenticatedUser.team
      }));
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'Login failed.');
    } finally {
      setIsAuthenticating(false);
    }
  }

  function handleLoginSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void handleLogin();
  }

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    setSessionUser(null);
    setAuthUsers([]);
    setReports([]);
    setAuditEntries([]);
    setNotificationEntries([]);
    setSecurityAuditEntries([]);
    setSecurityNotificationEntries([]);
    setActiveSessions([]);
    setSelectedReportId(null);
    setSyncMessage('');
    setValidationMessage('');
    setAuthError('Signed out. Sign in to continue.');
  }

  async function handleSaveUser() {
    if (!canManageUsers) {
      setUserAdminMessage('Only managers can manage report users.');
      return;
    }

    setIsSavingUser(true);
    setUserAdminMessage('');
    try {
      const response = await fetch('/api/auth/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: userForm.id || undefined,
          name: userForm.name,
          email: userForm.email,
          role: userForm.role,
          team: userForm.team,
          status: userForm.status,
          password: userForm.password || undefined
        })
      });
      const payload = (await response.json()) as {
        data?: AuthUser;
        error?: string;
        meta?: { inviteQueued?: boolean; passwordResetLogged?: boolean };
      };
      if (!response.ok || !payload.data) {
        throw new Error(payload.error || 'Failed to save user.');
      }
      await loadAuthUsers();
      await loadSecurityActivity();
      setUserAdminMessage(
        payload.meta?.inviteQueued
          ? `Saved ${payload.data.name} and queued email/WhatsApp onboarding invites.`
          : payload.meta?.passwordResetLogged
            ? `Saved ${payload.data.name} and recorded the password reset in security activity.`
            : `Saved ${payload.data.name}.`
      );
      setUserForm({
        id: '',
        name: '',
        email: '',
        role: 'author',
        team: '',
        status: 'active',
        password: ''
      });
    } catch (error) {
      setUserAdminMessage(error instanceof Error ? error.message : 'Failed to save user.');
    } finally {
      setIsSavingUser(false);
    }
  }

  async function handleChangePassword() {
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordMessage('New password and confirmation do not match.');
      return;
    }

    setIsChangingPassword(true);
    setPasswordMessage('');
    try {
      const response = await fetch('/api/auth/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword
        })
      });
      const payload = (await response.json()) as { data?: boolean; error?: string };
      if (!response.ok || !payload.data) {
        throw new Error(payload.error || 'Failed to change password.');
      }
      setPasswordMessage('Password updated.');
      const refreshedUser = await loadSession();
      if (refreshedUser) {
        setSessionUser(refreshedUser);
      }
      if (refreshedUser && canManageReportUsers(refreshedUser)) {
        await loadSessions();
        await loadSecurityActivity();
      } else {
        setActiveSessions([]);
        setSecurityAuditEntries([]);
        setSecurityNotificationEntries([]);
      }
      await loadReports();
      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
    } catch (error) {
      setPasswordMessage(error instanceof Error ? error.message : 'Failed to change password.');
    } finally {
      setIsChangingPassword(false);
    }
  }

  async function handleRevokeSession(sessionId: string) {
    try {
      const response = await fetch('/api/auth/sessions', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId })
      });
      const payload = (await response.json()) as { data?: boolean; error?: string };
      if (!response.ok || !payload.data) {
        throw new Error(payload.error || 'Failed to revoke session.');
      }
      setPasswordMessage('Session revoked.');
      await loadSessions();
      await loadSecurityActivity();
    } catch (error) {
      setPasswordMessage(error instanceof Error ? error.message : 'Failed to revoke session.');
    }
  }

  function startEditingUser(user: AuthUser) {
    setUserForm({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      team: user.team,
      status: user.status,
      password: ''
    });
    setUserAdminMessage(`Editing ${user.name}. Leave password blank to keep the current one.`);
  }

  const isDraftEditable = selectedReport?.status === 'draft' && canAuthorSelectedReport;
  const isReviewerView = actorMode === 'reviewer' && selectedReport?.status === 'submitted' && canReviewSelectedReport;
  const totalRequiredMetrics = selectedRoleDefinition?.items.filter((item) => item.required).length ?? 0;
  const completedRequiredMetrics = selectedRoleDefinition?.items.filter((item) => !item.required || selectedReport?.data[`${item.id}__note`]?.trim()).length ?? 0;
  const narrativeComplete = Boolean(selectedReport?.data.executive_summary?.trim() && selectedReport?.data.corrective_actions?.trim());
  const reportCompletionPercent = selectedRoleDefinition
    ? Math.round((((narrativeComplete ? 1 : 0) + completedRequiredMetrics) / (1 + Math.max(totalRequiredMetrics, selectedRoleDefinition.items.length))) * 100)
    : 0;
  const correctiveActionItems = useMemo(
    () => parseCorrectiveActions(selectedReport?.data.corrective_actions_items, selectedReport?.data.corrective_actions),
    [selectedReport?.data.corrective_actions_items, selectedReport?.data.corrective_actions]
  );
  
  // Check if all required sections are complete (excluding executive summary)
  const allRequiredSectionsComplete = useMemo(() => {
    if (!selectedRoleDefinition || !selectedReport) return false;
    
    // Check all required metrics have observations
    const metricsComplete = selectedRoleDefinition.items
      .filter(item => item.required)
      .every(item => selectedReport.data[`${item.id}__note`]?.trim());
    
    // Check corrective actions have at least one item
    const hasCorrectiveActions = correctiveActionItems.length > 0;
    
    return metricsComplete && hasCorrectiveActions;
  }, [selectedRoleDefinition, selectedReport, correctiveActionItems]);
  
  // Check if executive summary is complete
  const executiveSummaryComplete = Boolean(selectedReport?.data.executive_summary?.trim());
  
  // All conditions met for submission
  const canSubmitReport = allRequiredSectionsComplete && executiveSummaryComplete;
  const narrativeSections: Array<{ field: NarrativeField; title: string; description: string; placeholder: string }> = [
    {
      field: 'executive_summary',
      title: 'Executive Summary',
      description: 'Capture the shift overview, key outcomes, and notable mentions.',
      placeholder: 'Summarize the shift, major outcomes, and notable mentions.'
    },
    {
      field: 'variance_root_cause',
      title: 'Variance / Root Cause Analysis',
      description: 'Explain the major deviations, root causes, and operational impact.',
      placeholder: 'Describe the main variance, root cause, and impact on work.'
    }
  ];

  if (!sessionUser) {
    return (
      <section className="reports-module-shell">
        <header className="reports-module-header">
          <div>
            <h2>AgriReports Module</h2>
            <p>Sign in with a persistent report user so audit events can record stable actor IDs.</p>
          </div>
        </header>

        <section className="reports-card reports-auth-card">
          <div className="reports-card-head">
            <h3>Sign In</h3>
            <span>Demo users ship with password `demo123`</span>
          </div>
          <form onSubmit={handleLoginSubmit}>
            <div className="reports-form-grid">
              <label className="reports-field">
                <span>Email</span>
                <input value={loginEmail} onChange={(event) => setLoginEmail(event.target.value)} placeholder="shift.lead@agrireports.local" autoComplete="username" />
              </label>
              <label className="reports-field">
                <span>Password</span>
                <input type="password" value={loginPassword} onChange={(event) => setLoginPassword(event.target.value)} autoComplete="current-password" />
              </label>
            </div>
            {authError ? <div className="reports-alert error">{authError}</div> : null}
            <div className="reports-inline-actions">
              <button className="primary-button" type="submit" disabled={isAuthenticating}>
                {isAuthenticating ? 'Signing in…' : 'Sign In'}
              </button>
              <span className="reports-muted-note">Examples: `shift.lead@agrireports.local`, `regional.manager@agrireports.local`.</span>
            </div>
          </form>
        </section>
      </section>
    );
  }

  if (sessionUser.mustChangePassword) {
    return (
      <section className="reports-module-shell">
        <header className="reports-module-header">
          <div>
            <h2>AgriReports Module</h2>
            <p>Welcome, {sessionUser.name}. Change your temporary password before you continue to the Reports workspace.</p>
          </div>
          <div className="reports-toolbar">
            <div className="reports-online-indicator">
              First login onboarding
            </div>
            <button className="ghost-button" onClick={handleLogout}>Sign Out</button>
          </div>
        </header>

        <section className="reports-card reports-auth-card">
          <div className="reports-card-head">
            <h3>Password Reset Required</h3>
            <span>Temporary password detected</span>
          </div>
          <div className="reports-alert warning">
            A manager created or reset this account. Set a new password now to unlock report creation, review, and history.
          </div>
          <div className="reports-form-grid">
            <label className="reports-field">
              <span>Current password</span>
              <input type="password" value={passwordForm.currentPassword} onChange={(event) => setPasswordForm((current) => ({ ...current, currentPassword: event.target.value }))} />
            </label>
            <label className="reports-field">
              <span>New password</span>
              <input type="password" value={passwordForm.newPassword} onChange={(event) => setPasswordForm((current) => ({ ...current, newPassword: event.target.value }))} />
            </label>
            <label className="reports-field">
              <span>Confirm new password</span>
              <input type="password" value={passwordForm.confirmPassword} onChange={(event) => setPasswordForm((current) => ({ ...current, confirmPassword: event.target.value }))} />
            </label>
          </div>
          {passwordMessage ? <div className={`reports-alert ${passwordMessage === 'Password updated.' ? 'success' : 'error'}`}>{passwordMessage}</div> : null}
          <div className="reports-inline-actions">
            <button className="primary-button" onClick={handleChangePassword} disabled={isChangingPassword}>
              {isChangingPassword ? 'Updating…' : 'Set New Password'}
            </button>
          </div>
        </section>
      </section>
    );
  }

  return (
    <section className="reports-module-shell" data-tour="reports.root">
      <header className="reports-module-header" data-tour="reports.header">
        <div>
          <h2>AgriReports Module</h2>
          <p>Role-aware reporting, review routing, and framework guidance inside the Reports workspace.</p>
        </div>
        <div className="reports-toolbar" data-tour="reports.toolbar">
          <div className="reports-online-indicator">
            {sessionUser.name} · {sessionUser.role}
          </div>
          <div className={`reports-online-indicator ${isOnline ? 'is-online' : 'is-offline'}`}>
            {isOnline ? 'Online sync ready' : 'Offline mode: drafts stay local'}
          </div>
          <div className="reports-online-indicator">
            {isSyncing ? 'Syncing queue…' : `${queueCount} queued action${queueCount === 1 ? '' : 's'}`}
          </div>
          <div className="reports-layout-controls">
            <button className="ghost-button" type="button" onClick={toggleLeftRail} aria-pressed={isLeftRailCollapsed}>
              {isLeftRailCollapsed ? <PanelLeftOpen size={14} /> : <PanelLeftClose size={14} />}
              {isLeftRailCollapsed ? 'Show workspace' : 'Hide workspace'}
            </button>
            <button className="ghost-button" type="button" onClick={toggleRightRail} aria-pressed={isRightRailCollapsed}>
              {isRightRailCollapsed ? <PanelRightOpen size={14} /> : <PanelRightClose size={14} />}
              {isRightRailCollapsed ? 'Show routing' : 'Hide routing'}
            </button>
          </div>
            <div className="reports-mode-switch">
              <button className={actorMode === 'author' ? 'is-active' : ''} onClick={() => { setActorMode('author'); setLeftPanelView('author'); }}>
                <FilePenLine size={14} />
                Author
              </button>
              <button className={actorMode === 'reviewer' ? 'is-active' : ''} onClick={() => { setActorMode('reviewer'); setLeftPanelView('reviewer'); }}>
                <FileCheck2 size={14} />
                Reviewer
              </button>
            </div>
          <button className="ghost-button" onClick={handleLogout}>Sign Out</button>
        </div>
      </header>

      <div className={`reports-module-grid${isLeftRailCollapsed ? ' is-left-collapsed' : ''}${isRightRailCollapsed ? ' is-right-collapsed' : ''}`}>
        <aside className={`reports-column reports-column-left${isLeftRailCollapsed ? ' reports-column-collapsed' : ''}`} data-tour="reports.workspace">
          {isLeftRailCollapsed ? (
            <div className="reports-collapsed-rail">
              <button className="ghost-button reports-rail-toggle" type="button" onClick={toggleLeftRail} aria-label="Expand workspace panel">
                <PanelLeftOpen size={16} />
              </button>
              <span>Workspace</span>
            </div>
          ) : (
            <>
          <section className="reports-card" data-tour="reports.workspace-switcher">
            <div className="reports-card-head">
              <h3>Reports Workspace</h3>
              <span>Focused views</span>
            </div>
            <div className="reports-tabs reports-left-tabs" role="tablist" aria-label="Reports workspace views">
              <button className={leftPanelView === 'author' ? 'is-active' : ''} onClick={() => setLeftPanelView('author')}>Author</button>
              <button className={leftPanelView === 'reviewer' ? 'is-active' : ''} onClick={() => setLeftPanelView('reviewer')}>Reviewer</button>
              {hasAdminSecurityAccess ? <button className={leftPanelView === 'admin' ? 'is-active' : ''} onClick={() => setLeftPanelView('admin')}>Admin</button> : null}
              {hasAdminSecurityAccess ? <button className={leftPanelView === 'security' ? 'is-active' : ''} onClick={() => setLeftPanelView('security')}>Security</button> : null}
            </div>
            <p className="reports-muted-note">
              {leftPanelView === 'author'
                ? 'Author mode keeps report creation and draft continuation front and center.'
                : leftPanelView === 'reviewer'
                  ? 'Reviewer mode isolates queued submissions so approvals are faster.'
                : leftPanelView === 'admin'
                  ? 'User management stays available, but separate from report writing.'
                  : 'Account and session controls stay available without crowding the editor.'}
            </p>
          </section>

          {leftPanelView === 'author' ? (
            <>
              <section className="reports-card" data-tour="reports.drafts">
                <div className="reports-card-head">
                  <h3>Author Landing</h3>
                  <span>Continue or create</span>
                </div>
                <div className="reports-inline-actions">
                  <button className="primary-button reports-primary-action" onClick={handleOpenContinueDraft}>
                    Continue Draft
                  </button>
                  <button className="ghost-button" onClick={handleOpenCreateReport}>
                    Create Report
                  </button>
                </div>
                {workspaceView === 'create' ? (
                  <>
                    <div className="reports-form-grid">
                      <label className="reports-field">
                        <span>Frequency</span>
                        <select value={newPeriod} onChange={(event) => setNewPeriod(event.target.value as ReportFrequency)}>
                          {reportPeriods.map((period) => <option key={period.id} value={period.id}>{period.label}</option>)}
                        </select>
                      </label>
                      <label className="reports-field">
                        <span>Role</span>
                        <select value={newRoleId} onChange={(event) => setNewRoleId(event.target.value)}>
                          {availableRoles.map((role) => <option key={role.id} value={role.id}>{role.name}</option>)}
                        </select>
                      </label>
                      <label className="reports-field">
                        <span>Reporting window</span>
                        <input value={reportingWindow} onChange={(event) => setReportingWindow(event.target.value)} />
                      </label>
                      <label className="reports-field">
                        <span>Author</span>
                        <input value={sessionUser.name} readOnly />
                      </label>
                      <label className="reports-field">
                        <span>Reviewer</span>
                        <select value={selectedReviewer?.id ?? ''} onChange={(event) => setReviewerId(event.target.value)}>
                          {reviewerOptions.map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}
                        </select>
                      </label>
                    </div>
                    <button className="primary-button reports-primary-action" onClick={handleCreateReport}>Create Draft</button>
                  </>
                ) : (
                  <>
                    <div className="reports-search-row" data-tour="reports.search">
                      <Search size={14} />
                      <input value={reportSearch} onChange={(event) => setReportSearch(event.target.value)} placeholder="Search reports" aria-label="Search reports" />
                    </div>
                    <div className="reports-filter-row" data-tour="reports.filters">
                      <select value={reportFrequencyFilter} onChange={(event) => setReportFrequencyFilter(event.target.value as 'all' | ReportFrequency)}>
                        <option value="all">All frequencies</option>
                        {reportPeriods.map((period) => <option key={period.id} value={period.id}>{period.label}</option>)}
                      </select>
                      <select value={reportStatusFilter} onChange={(event) => setReportStatusFilter(event.target.value as 'all' | ReportRecord['status'])}>
                        <option value="all">All statuses</option>
                        <option value="draft">Draft</option>
                        <option value="submitted">Submitted</option>
                        <option value="approved">Approved</option>
                        <option value="rejected">Rejected</option>
                        <option value="changes_requested">Changes requested</option>
                      </select>
                    </div>
                    <div className="reports-section-head">
                      <h4>My Drafts</h4>
                      <span>{continueDraftReports.length}</span>
                    </div>
                    <div className="reports-list" data-tour="reports.history-list">
                      {continueDraftReports.map((report) => (
                        <button key={report.id} className={selectedReport?.id === report.id ? 'reports-list-item is-active' : 'reports-list-item'} onClick={() => { setSelectedReportId(report.id); setValidationMessage(''); }}>
                          <div>
                            <strong>{report.title}</strong>
                            <small>{reportRowMeta(report, true)}</small>
                          </div>
                          <span className={`reports-status-chip status-${report.status}`}>{reportStatusLabel(report.status)}</span>
                        </button>
                      ))}
                    </div>
                    <div className="reports-section-head">
                      <h4>Awaiting Review</h4>
                      <span>{awaitingReviewReports.length}</span>
                    </div>
                    <div className="reports-list">
                      {awaitingReviewReports.slice(0, 4).map((report) => (
                        <button key={report.id} className={selectedReport?.id === report.id ? 'reports-list-item is-active' : 'reports-list-item'} onClick={() => { setSelectedReportId(report.id); setValidationMessage(''); }}>
                          <div>
                            <strong>{report.title}</strong>
                            <small>{reportRowMeta(report, true)}</small>
                          </div>
                          <span className={`reports-status-chip status-${report.status}`}>{reportStatusLabel(report.status)}</span>
                        </button>
                      ))}
                    </div>
                    <div className="reports-section-head">
                      <h4>Approved / History</h4>
                      <span>{historyReports.length}</span>
                    </div>
                  </>
                )}
              </section>
            </>
          ) : null}

          {leftPanelView === 'reviewer' ? (
            <section className="reports-card" data-tour="reports.reviewer-queue">
              <div className="reports-card-head">
                <h3>Reviewer Queue</h3>
                <span>{awaitingReviewReports.length} awaiting review</span>
              </div>
              <p className="reports-muted-note">
                Select a submitted report to approve, reject, or request changes.
              </p>
              <div className="reports-list">
                {awaitingReviewReports.length > 0 ? awaitingReviewReports.map((report) => (
                  <button
                    key={report.id}
                    className={selectedReport?.id === report.id ? 'reports-list-item is-active' : 'reports-list-item'}
                    onClick={() => {
                      setActorMode('reviewer');
                      setSelectedReportId(report.id);
                      setValidationMessage('');
                    }}
                  >
                    <div>
                      <strong>{report.title}</strong>
                      <small>{report.authorName} to {report.reviewerName} · {report.reportingWindow}</small>
                    </div>
                    <span className={`reports-status-chip status-${report.status}`}>{reportStatusLabel(report.status)}</span>
                  </button>
                )) : <div className="reports-activity-item"><strong>No reports awaiting review</strong><p>Submitted reports routed to you will appear here.</p></div>}
              </div>
            </section>
          ) : null}

          {leftPanelView === 'admin' && hasAdminSecurityAccess ? (
            <section className="reports-card">
              <div className="reports-card-head">
                <h3>User Directory</h3>
                <span>{authUsers.length} users</span>
              </div>
              <div className="reports-form-grid">
                <label className="reports-field">
                  <span>Name</span>
                  <input value={userForm.name} onChange={(event) => setUserForm((current) => ({ ...current, name: event.target.value }))} />
                </label>
                <label className="reports-field">
                  <span>Email</span>
                  <input value={userForm.email} onChange={(event) => setUserForm((current) => ({ ...current, email: event.target.value }))} />
                </label>
                <label className="reports-field">
                  <span>Role</span>
                  <select value={userForm.role} onChange={(event) => setUserForm((current) => ({ ...current, role: event.target.value as AuthUser['role'] }))}>
                    <option value="author">Author</option>
                    <option value="reviewer">Reviewer</option>
                    <option value="manager">Manager</option>
                    <option value="admin">Admin</option>
                  </select>
                </label>
                <label className="reports-field">
                  <span>Team</span>
                  <input value={userForm.team} onChange={(event) => setUserForm((current) => ({ ...current, team: event.target.value }))} />
                </label>
                <label className="reports-field">
                  <span>Status</span>
                  <select value={userForm.status} onChange={(event) => setUserForm((current) => ({ ...current, status: event.target.value as AuthUser['status'] }))}>
                    <option value="active">Active</option>
                    <option value="disabled">Disabled</option>
                  </select>
                </label>
                <label className="reports-field">
                  <span>{userForm.id ? 'New password' : 'Password'}</span>
                  <input type="password" value={userForm.password} onChange={(event) => setUserForm((current) => ({ ...current, password: event.target.value }))} placeholder={userForm.id ? 'Leave blank to keep current password' : 'Required'} />
                </label>
              </div>
              {userAdminMessage ? <div className={`reports-alert ${userAdminMessage.startsWith('Saved') || userAdminMessage.startsWith('Editing') ? 'success' : 'error'}`}>{userAdminMessage}</div> : null}
              <div className="reports-inline-actions">
                <button className="primary-button" onClick={handleSaveUser} disabled={isSavingUser}>{isSavingUser ? 'Saving…' : userForm.id ? 'Update User' : 'Create User'}</button>
                {userForm.id ? <button className="ghost-button" onClick={() => { setUserForm({ id: '', name: '', email: '', role: 'author', team: '', status: 'active', password: '' }); setUserAdminMessage(''); }}>New User</button> : null}
              </div>
              <div className="reports-activity-list">
                {authUsers.slice(0, 6).map((user) => (
                  <div key={user.id} className="reports-activity-item">
                    <strong>{user.name}</strong>
                    <small>{user.email} · {user.role} · {user.status}</small>
                    <p>{user.team}</p>
                    {canInspectIds ? <p className="reports-id-line">User ID: {user.id}</p> : null}
                    <div className="reports-inline-actions">
                      <button className="ghost-button" onClick={() => startEditingUser(user)}>Edit</button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          {leftPanelView === 'security' && hasAdminSecurityAccess ? (
            <section className="reports-card">
              <div className="reports-card-head">
                <h3>Account Security</h3>
                <span>{sessionUser.role}</span>
              </div>
              <div className="reports-form-grid">
                <label className="reports-field">
                  <span>Current password</span>
                  <input type="password" value={passwordForm.currentPassword} onChange={(event) => setPasswordForm((current) => ({ ...current, currentPassword: event.target.value }))} />
                </label>
                <label className="reports-field">
                  <span>New password</span>
                  <input type="password" value={passwordForm.newPassword} onChange={(event) => setPasswordForm((current) => ({ ...current, newPassword: event.target.value }))} />
                </label>
                <label className="reports-field">
                  <span>Confirm new password</span>
                  <input type="password" value={passwordForm.confirmPassword} onChange={(event) => setPasswordForm((current) => ({ ...current, confirmPassword: event.target.value }))} />
                </label>
              </div>
              {passwordMessage ? <div className={`reports-alert ${passwordMessage === 'Password updated.' ? 'success' : 'error'}`}>{passwordMessage}</div> : null}
              <div className="reports-inline-actions">
                <button className="primary-button" onClick={handleChangePassword} disabled={isChangingPassword}>
                  {isChangingPassword ? 'Updating…' : 'Change Password'}
                </button>
              </div>
              <div className="reports-section">
                <div className="reports-section-head">
                  <h4>Active Sessions</h4>
                  <span>{activeSessions.length} sessions</span>
                </div>
                <div className="reports-activity-list">
                  {activeSessions.length > 0 ? activeSessions.map((session) => (
                    <div key={session.id} className="reports-activity-item">
                      <strong>{session.current ? 'Current session' : 'Signed-in session'}</strong>
                      <small>Started {formatDateLabel(session.createdAt)} · Expires {formatDateLabel(session.expiresAt)}</small>
                      <p className="reports-id-line">Session ID: {session.id}</p>
                      <div className="reports-inline-actions">
                        {!session.current ? <button className="ghost-button danger" onClick={() => handleRevokeSession(session.id)}>Revoke</button> : <span className="reports-muted-note">Current browser session</span>}
                      </div>
                    </div>
                  )) : <div className="reports-activity-item"><strong>No active sessions</strong><p>Your sign-in sessions will appear here with their expiry.</p></div>}
                </div>
              </div>
              <div className="reports-section">
                <div className="reports-section-head">
                  <h4>Security Activity</h4>
                  <span>{securityAuditEntries.length} events</span>
                </div>
                <div className="reports-activity-list">
                  {securityAuditEntries.length > 0 ? securityAuditEntries.slice(0, 6).map((entry) => (
                    <div key={entry.id} className="reports-activity-item">
                      <strong>{tokenLabel(entry.action)}</strong>
                      <small>{entry.actorName} · {formatDateLabel(entry.createdAt)}</small>
                      {canInspectIds ? <p className="reports-id-line">Audit ID: {entry.id} · Actor ID: {entry.actorId ?? 'Unavailable'}</p> : null}
                      <p>{entry.details}</p>
                    </div>
                  )) : <div className="reports-activity-item"><strong>No security activity yet</strong><p>Password resets, password changes, invites, and session revocations will appear here.</p></div>}
                </div>
              </div>
              <div className="reports-section">
                <div className="reports-section-head">
                  <h4>Invite Delivery Queue</h4>
                  <span>{securityNotificationEntries.length} records</span>
                </div>
                <div className="reports-activity-list">
                  {securityNotificationEntries.length > 0 ? securityNotificationEntries.slice(0, 6).map((entry) => (
                    <div key={entry.id} className="reports-activity-item">
                      <strong>{entry.channel} · {tokenLabel(entry.event)}</strong>
                      <small>{entry.recipientName} · {entry.status} · {formatDateLabel(entry.createdAt)}</small>
                      {canInspectIds ? <p className="reports-id-line">Notification ID: {entry.id} · Recipient User ID: {entry.recipientUserId ?? 'Unavailable'}</p> : null}
                      <p>{entry.message}</p>
                    </div>
                  )) : <div className="reports-activity-item"><strong>No invite deliveries queued</strong><p>New-user onboarding invites will queue here for email and WhatsApp delivery.</p></div>}
                </div>
              </div>
            </section>
          ) : null}
            </>
          )}
        </aside>

        <main className="reports-column reports-column-center">
          {selectedReport && selectedRoleDefinition ? (
            <div className="reports-split-pane">
              <section className="reports-card reports-editor-card reports-workspace-card reports-editor-pane" data-tour="reports.editor">
              <div className="reports-editor-header">
                <div>
                  <div className="reports-kicker">{selectedPeriodDefinition?.label ?? tokenLabel(selectedReport.period, 'Imported')} report · {selectedReport.reportingWindow}</div>
                  <h3>{selectedReport.title}</h3>
                  <p>{selectedReport.roleName} · {selectedReport.authorName} to {selectedReport.reviewerName}</p>
                  {canInspectIds ? <small className="reports-id-line">Author ID: {selectedReport.authorId ?? 'Unassigned'} · Reviewer ID: {selectedReport.reviewerId ?? 'Unassigned'}</small> : null}
                  {!selectedPeriodDefinition ? <small className="reports-muted-note">Imported framework reconstructed from saved report data.</small> : null}
                </div>
                <div className="reports-editor-meta">
                  <span className={`reports-status-chip status-${selectedReport.status}`}>{reportStatusLabel(selectedReport.status)}</span>
                  <small>Last autosave {formatDateLabel(selectedReport.lastSavedAt)}</small>
                </div>
              </div>

              <div className="reports-progress-strip">
                <div className="reports-progress-copy">
                  <strong>{reportCompletionPercent}% complete</strong>
                  <span>Fill the narrative, required observations, and sign-off steps without scrolling the full page.</span>
                </div>
                <div className="reports-progress-bar">
                  <span style={{ width: `${reportCompletionPercent}%` }} />
                </div>
                <div className="reports-progress-metrics">
                  <div><strong>{narrativeComplete ? 'Ready' : 'Missing'}</strong><span>Narrative</span></div>
                  <div><strong>{completedRequiredMetrics}/{Math.max(totalRequiredMetrics, selectedRoleDefinition.items.length)}</strong><span>Metrics</span></div>
                  <div><strong>{reportStatusLabel(selectedReport.status)}</strong><span>Status</span></div>
                </div>
              </div>

              {syncMessage ? <div className="reports-alert success">{syncMessage}</div> : null}

              {selectedReport.status === 'changes_requested' ? (
                <div className="reports-alert warning">
                  Reviewer requested changes. Resume the draft to update the report and submit again.
                  <button
                    className="ghost-button"
                    onClick={() => {
                      const patch = {
                        status: 'draft' as const,
                        signature: undefined,
                        reviewerSignature: undefined
                      };
                      updateReport(selectedReport.id, patch);
                      if (!isOnline || selectedReport.id.startsWith('temp_report_')) {
                        enqueueReportAction({
                          id: `queue_${Date.now()}`,
                          type: 'update',
                          reportId: selectedReport.id,
                          payload: patch
                        });
                        refreshQueueCount();
                        setSyncMessage('Draft reopen queued for sync.');
                        return;
                      }
                      saveReportPatch(selectedReport.id, patch, 'Report reopened as draft.').catch((error) => {
                        setValidationMessage(error instanceof Error ? error.message : 'Failed to reopen report.');
                      });
                    }}
                  >
                    Return to Draft
                  </button>
                </div>
              ) : null}

              {validationMessage ? <div className="reports-alert error">{validationMessage}</div> : null}
              {!canAuthorSelectedReport && selectedReport?.status === 'draft' ? <div className="reports-alert warning">This draft is assigned to {selectedReport.authorName}. You can view it, but you cannot edit or submit it.</div> : null}
              {!canReviewSelectedReport && selectedReport?.status === 'submitted' ? <div className="reports-alert warning">This report is routed to {selectedReport.reviewerName}. Reviewer actions are hidden for your account.</div> : null}

              {/* S6-04: Enhanced status badge visibility */}
              {selectedReport && (
                <div className={`reports-status-badge-large status-${selectedReport.status}`}>
                  <span className="reports-status-dot" />
                  <span>{reportStatusLabel(selectedReport.status)}</span>
                </div>
              )}

              {/* S6-03: Guided step rail with progress indicators */}
              {isDraftEditable && (
                <div className="reports-step-rail" role="tablist" aria-label="Report editing steps">
                  {[
                    { id: 'narrative' as EditorSection, label: 'Core Narrative', number: 1, complete: narrativeComplete },
                    { id: 'metrics' as EditorSection, label: 'Rule Metrics', number: 2, complete: completedRequiredMetrics >= totalRequiredMetrics },
                    { id: 'actions' as EditorSection, label: 'Corrective Actions', number: 3, complete: correctiveActionItems.length > 0 },
                    { id: 'signoff' as EditorSection, label: 'Review & Submit', number: 4, complete: false }
                  ].map((step) => (
                    <button
                      key={step.id}
                      className={`reports-step-item ${activeEditorSection === step.id ? 'is-active' : ''} ${step.complete ? 'is-complete' : ''}`}
                      onClick={() => setActiveEditorSection(step.id)}
                      role="tab"
                      aria-selected={activeEditorSection === step.id}
                    >
                      <span className="reports-step-number">{step.complete ? '✓' : step.number}</span>
                      <div className="reports-step-info">
                        <span className="reports-step-label">{step.label}</span>
                        <span className="reports-step-status">
                          {step.complete ? 'Complete' : step.id === 'signoff' ? 'Final step' : 'In progress'}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              <div className="reports-capture-tabs" role="tablist" aria-label="Report capture sections" data-tour="reports.editor-tabs">
                <button data-tour="reports.tab.narrative" className={activeEditorSection === 'narrative' ? 'is-active' : ''} onClick={() => setActiveEditorSection('narrative')}>Core narrative</button>
                <button data-tour="reports.tab.metrics" className={activeEditorSection === 'metrics' ? 'is-active' : ''} onClick={() => setActiveEditorSection('metrics')}>Rule-specific metrics</button>
                <button data-tour="reports.tab.actions" className={activeEditorSection === 'actions' ? 'is-active' : ''} onClick={() => setActiveEditorSection('actions')}>Corrective actions</button>
                <button data-tour="reports.tab.signoff" className={activeEditorSection === 'signoff' ? 'is-active' : ''} onClick={() => setActiveEditorSection('signoff')}>Review & submit</button>
                <button data-tour="reports.tab.activity" className={activeEditorSection === 'activity' ? 'is-active' : ''} onClick={() => setActiveEditorSection('activity')}>Audit trail</button>
              </div>

              {activeEditorSection === 'narrative' && isDraftEditable ? (
                <section className="reports-card">
                  <div 
                    className="reports-card-head" 
                    onClick={() => setIsTagsExpanded(!isTagsExpanded)}
                    style={{ cursor: 'pointer' }}
                  >
                    <div className="tags-header-content">
                      <div className="tags-header-left">
                        <button className="tags-collapse-toggle" type="button" onClick={(e) => { e.stopPropagation(); setIsTagsExpanded(!isTagsExpanded); }}>
                          {isTagsExpanded ? '▼' : '▶'}
                        </button>
                        <h3>Tags & Categories</h3>
                      </div>
                      <span>{(selectedReport.data.tags?.split(',').filter(Boolean).length || 0)} tags</span>
                    </div>
                  </div>
                  {isTagsExpanded && (
                    <div className="reports-tags-container">
                      <div className="reports-tags-list">
                        {(selectedReport.data.tags?.split(',').filter(Boolean) || []).map((tag, index) => (
                          <span key={index} className="reports-tag">
                            {tag.trim()}
                            <button
                              type="button"
                              className="reports-tag-remove"
                              onClick={() => {
                                const tags = selectedReport.data.tags?.split(',').filter(Boolean) || [];
                                tags.splice(index, 1);
                                updateReportField(selectedReport.id, 'tags', tags.join(','));
                                toastManager.info('Tag removed');
                              }}
                            >
                              ×
                            </button>
                          </span>
                        ))}
                      </div>
                      <div className="reports-tag-input-row">
                        <input
                          value={tagInput}
                          onChange={(e) => setTagInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && tagInput.trim()) {
                              e.preventDefault();
                              const tags = selectedReport.data.tags?.split(',').filter(Boolean) || [];
                              if (!tags.includes(tagInput.trim())) {
                                tags.push(tagInput.trim());
                                updateReportField(selectedReport.id, 'tags', tags.join(','));
                                setTagInput('');
                                toastManager.success('Tag added');
                              }
                            }
                          }}
                          placeholder="Type a tag and press Enter (e.g., #irrigation, @safety, critical)"
                        />
                        <button
                          type="button"
                          className="ghost-button"
                          disabled={!tagInput.trim()}
                          onClick={() => {
                            const tags = selectedReport.data.tags?.split(',').filter(Boolean) || [];
                            if (!tags.includes(tagInput.trim())) {
                              tags.push(tagInput.trim());
                              updateReportField(selectedReport.id, 'tags', tags.join(','));
                              setTagInput('');
                              toastManager.success('Tag added');
                            }
                          }}
                        >
                          Add Tag
                        </button>
                      </div>
                    </div>
                  )}
                </section>
              ) : null}

              {activeEditorSection === 'narrative' ? (
                <div className="reports-capture-stack">
                  {/* Show prompt when all sections are complete but executive summary is not */}
                  {allRequiredSectionsComplete && !executiveSummaryComplete && (
                    <div className="reports-alert success reports-executive-summary-prompt">
                      <div className="prompt-content">
                        <div>
                          <strong>✨ Great progress! All required sections are complete.</strong>
                          <p>You can now complete your Executive Summary to finalize the report.</p>
                        </div>
                        <button 
                          className="primary-button" 
                          type="button"
                          onClick={() => {
                            setEditingNarrativeField('executive_summary');
                          }}
                        >
                          Go to Executive Summary
                        </button>
                      </div>
                    </div>
                  )}
                  
                  {/* Show completion message when everything is ready for submission */}
                  {isDraftEditable && canSubmitReport && (
                    <div className="reports-alert success reports-ready-to-submit">
                      <strong>✅ Report Ready for Submission!</strong>
                      <p>All required sections are complete. Review your Executive Summary and submit for review.</p>
                    </div>
                  )}
                  
                  {narrativeSections.map((section) => {
                    const value = (selectedReport.data[section.field] as string | undefined) ?? '';
                    const isEditing = editingNarrativeField === section.field;
                    
                    // Hide Executive Summary until all required sections are complete
                    if (section.field === 'executive_summary' && !allRequiredSectionsComplete) {
                      return null;
                    }

                    return (
                      <article key={section.field} className="reports-capture-card">
                        <div className="reports-capture-card-head">
                          <div>
                            <h4>{section.title}</h4>
                            <p>{section.description}</p>
                          </div>
                          <div className="reports-capture-card-actions">
                            <span className={`reports-autosave-indicator status-${saveStatus}`}>
                              {saveStatus === 'saving' && '💾 Saving...'}
                              {saveStatus === 'saved' && '✅ Saved'}
                              {saveStatus === 'error' && '❌ Save failed'}
                              {saveStatus === 'idle' && (isDraftEditable ? '💾 Autosave enabled' : 'Read only')}
                            </span>
                            {section.field === 'executive_summary' && isDraftEditable && (
                              <button
                                className="ghost-button"
                                type="button"
                                onClick={generateAISummary}
                                title="Auto-generate summary from report data"
                              >
                                ✨ AI Generate
                              </button>
                            )}
                            <button
                              className={isEditing ? 'ghost-button' : 'primary-button'}
                              type="button"
                              onClick={() => (isEditing ? setEditingNarrativeField(null) : openNarrativeEditor(section.field))}
                              disabled={!isDraftEditable && !isEditing}
                            >
                              {isEditing ? 'Close' : 'Edit'}
                            </button>
                          </div>
                        </div>

                        {isEditing ? (
                          <label className="reports-field reports-field-full">
                            <span>{section.title}</span>
                            <RichTextEditor
                              value={value}
                              onChange={(html) => updateReportField(selectedReport.id, section.field, html)}
                              placeholder={section.placeholder}
                              readOnly={!isDraftEditable}
                              height="200px"
                            />
                          </label>
                        ) : (
                          <div className="reports-capture-preview">
                            {value.trim().length > 0 ? <div dangerouslySetInnerHTML={{ __html: value }} /> : <p className="reports-empty-copy">{section.placeholder}</p>}
                          </div>
                        )}
                      </article>
                    );
                  })}
                </div>
              ) : null}

              {activeEditorSection === 'metrics' ? (
                <div className="reports-capture-stack">
                  {selectedRoleDefinition.items.map((item) => {
                    const isExpanded = expandedMetrics[item.id] !== false;
                    const itemStatus = (selectedReport.data[`${item.id}__status`] as ReportItemStatus) ?? item.status;
                    const hasNote = selectedReport.data[`${item.id}__note`]?.trim();
                    const metricValue = selectedReport.data[`${item.id}__value`] ?? '';
                    
                    return (
                      <article key={item.id} className={`reports-capture-card reports-metric-capture-card ${isExpanded ? 'is-expanded' : 'is-collapsed'}`}>
                        <div 
                          className="reports-metric-header" 
                          onClick={() => setExpandedMetrics(prev => ({ ...prev, [item.id]: !isExpanded }))}
                          style={{ cursor: 'pointer' }}
                        >
                          <div className="reports-metric-header-content">
                            <div className="reports-metric-header-left">
                              <button className="reports-accordion-toggle" type="button" onClick={(e) => { e.stopPropagation(); setExpandedMetrics(prev => ({ ...prev, [item.id]: !isExpanded })); }}>
                                {isExpanded ? '▼' : '▶'}
                              </button>
                              <div className="reports-metric-title-section">
                                <h4>{item.label}</h4>
                                <button 
                                  className="reports-metric-info-btn" 
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setShowMetricInfo(prev => ({ ...prev, [item.id]: !prev[item.id] }));
                                  }}
                                  title="Show details"
                                >
                                  ℹ️
                                </button>
                              </div>
                              {showMetricInfo[item.id] && (
                                <div className="reports-metric-metadata" onClick={(e) => e.stopPropagation()}>
                                  <div className="metadata-row">
                                    <span className="metadata-label">Source:</span>
                                    <span className="metadata-value">{item.source}</span>
                                  </div>
                                  <div className="metadata-row">
                                    <span className="metadata-label">Trigger:</span>
                                    <span className="metadata-value">{item.trigger}</span>
                                  </div>
                                </div>
                              )}
                            </div>
                            <div className="reports-metric-header-right">
                              <span className={`reports-item-chip item-${itemStatus}`}>
                                {statusLabel(itemStatus)}
                              </span>
                              {hasNote && <span className="reports-metric-complete">✓ Complete</span>}
                            </div>
                          </div>
                        </div>

                        {isExpanded && (
                          <div className="reports-metric-body">
                            <div className="reports-metric-summary-row">
                              <div className="reports-metric-summary-tile">
                                <strong>Status</strong>
                                <span>{statusLabel(itemStatus)}</span>
                              </div>
                              <div className="reports-metric-summary-tile">
                                <strong>Requirement</strong>
                                <span>{item.required ? 'Observation required' : 'Optional observation'}</span>
                              </div>
                              <div className="reports-metric-summary-tile">
                                <strong>Progress</strong>
                                <span>{hasNote ? 'Captured' : 'Pending'}</span>
                              </div>
                            </div>

                            <div className="reports-form-grid">
                              <label className="reports-field">
                                <span>Status</span>
                                <select value={itemStatus} onChange={(event) => updateReportField(selectedReport.id, `${item.id}__status`, event.target.value)} disabled={!isDraftEditable}>
                                  <option value="on_track">On track</option>
                                  <option value="warning">Warning</option>
                                  <option value="critical">Critical</option>
                                </select>
                              </label>
                              <label className="reports-field">
                                <span>Current Value</span>
                                <input 
                                  value={metricValue} 
                                  onChange={(event) => updateReportField(selectedReport.id, `${item.id}__value`, event.target.value)} 
                                  placeholder="e.g., 82% or 15/20"
                                  disabled={!isDraftEditable}
                                />
                              </label>
                              <label className="reports-field reports-field-full">
                                <span>Observation {item.required ? <em>required</em> : null}</span>
                                <RichTextEditor
                                  value={selectedReport.data[`${item.id}__note`] ?? ''}
                                  onChange={(html) => updateReportField(selectedReport.id, `${item.id}__note`, html)}
                                  readOnly={!isDraftEditable}
                                  placeholder="Add context, variance detail, or follow-up action."
                                  height="150px"
                                />
                              </label>
                            </div>
                          </div>
                        )}
                      </article>
                    );
                  })}
                </div>
              ) : null}

              {activeEditorSection === 'actions' ? (
                <div className="reports-capture-stack">
                  <section className="reports-capture-card" data-tour="reports.signoff">
                    <div className="reports-capture-card-head">
                      <div>
                        <h4>Corrective action tracker</h4>
                        <p>Track owners, progress, and follow-through instead of burying actions inside narrative text.</p>
                      </div>
                    </div>

                    <div className="reports-action-create-grid">
                      <label className="reports-field reports-field-full">
                        <span>Action description</span>
                        <input value={newActionText} onChange={(event) => setNewActionText(event.target.value)} placeholder="Describe the corrective action required..." />
                      </label>
                      <label className="reports-field">
                        <span>Owner</span>
                        <input value={newActionOwner} onChange={(event) => setNewActionOwner(event.target.value)} placeholder="Assign owner or team" />
                      </label>
                      <label className="reports-field">
                        <span>Priority</span>
                        <select value={newActionPriority} onChange={(event) => setNewActionPriority(event.target.value as CorrectiveActionPriority)}>
                          <option value="low">Low</option>
                          <option value="medium">Medium</option>
                          <option value="high">High</option>
                          <option value="critical">Critical</option>
                        </select>
                      </label>
                      <label className="reports-field">
                        <span>Due Date</span>
                        <input type="date" value={newActionDueDate} onChange={(event) => setNewActionDueDate(event.target.value)} />
                      </label>
                      <div className="reports-action-create-submit">
                        <button
                          className="primary-button"
                          type="button"
                          disabled={!isDraftEditable || !newActionText.trim()}
                          onClick={() => {
                            const nextItems = [
                              ...correctiveActionItems,
                              {
                                id: `action_${Date.now()}`,
                                text: newActionText.trim(),
                                owner: newActionOwner.trim() || 'Unassigned',
                                status: 'pending' as CorrectiveActionStatus,
                                completed: false,
                                priority: newActionPriority,
                                dueDate: newActionDueDate || undefined
                              }
                            ];
                            updateCorrectiveActionItems(nextItems);
                            setNewActionText('');
                            setNewActionOwner('');
                            setNewActionPriority('medium');
                            setNewActionDueDate('');
                            toastManager.success('Corrective action added');
                          }}
                        >
                          Add action
                        </button>
                      </div>
                    </div>

                    <div className="reports-action-list">
                      {correctiveActionItems.length > 0 ? correctiveActionItems.map((action) => (
                        <article key={action.id} className={`reports-action-item${action.completed ? ' is-complete' : ''}`}>
                          <button
                            className={action.completed ? 'reports-action-check is-complete' : 'reports-action-check'}
                            type="button"
                            disabled={!isDraftEditable}
                            onClick={() => {
                              const nextItems = correctiveActionItems.map((item) => item.id === action.id ? {
                                ...item,
                                completed: !item.completed,
                                status: (item.completed ? 'in_progress' : 'completed') as CorrectiveActionStatus
                              } : item);
                              updateCorrectiveActionItems(nextItems);
                            }}
                          >
                            {action.completed ? '✓' : ''}
                          </button>
                          <div className="reports-action-copy">
                            <strong>{action.text}</strong>
                            <div className="reports-action-meta">
                              <span>{action.owner}</span>
                              <span className={`reports-action-status status-${action.status}`}>{tokenLabel(action.status)}</span>
                              {action.priority && action.priority !== 'medium' && (
                                <span className={`reports-action-priority priority-${action.priority}`}>
                                  {action.priority === 'critical' ? '🔴' : action.priority === 'high' ? '🟠' : '🟢'} {action.priority}
                                </span>
                              )}
                              {action.dueDate && (
                                <span className="reports-action-due-date">
                                  Due: {new Date(action.dueDate).toLocaleDateString()}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="reports-action-controls">
                            {action.linkedTaskId && tasks.some((task) => task.id === action.linkedTaskId) ? (
                              <button className="reports-linked-task" type="button" onClick={() => openLinkedTask(action.linkedTaskId as string)}>
                                Task linked
                              </button>
                            ) : (
                              <button
                                className="ghost-button"
                                type="button"
                                onClick={() => createTaskFromCorrectiveAction(action)}
                              >
                                Create task
                              </button>
                            )}
                            <select
                              value={action.status}
                              onChange={(event) => {
                                const nextStatus = event.target.value as CorrectiveActionStatus;
                                const nextItems = correctiveActionItems.map((item) => item.id === action.id ? {
                                  ...item,
                                  status: nextStatus,
                                  completed: nextStatus === 'completed'
                                } : item);
                                updateCorrectiveActionItems(nextItems);
                              }}
                              disabled={!isDraftEditable}
                            >
                              <option value="pending">Pending</option>
                              <option value="in_progress">In progress</option>
                              <option value="completed">Completed</option>
                            </select>
                            <button
                              className="ghost-button danger"
                              type="button"
                              disabled={!isDraftEditable}
                              onClick={() => updateCorrectiveActionItems(correctiveActionItems.filter((item) => item.id !== action.id))}
                            >
                              Remove
                            </button>
                          </div>
                        </article>
                      )) : <div className="reports-empty-state-inline">No corrective actions yet. Add the first action to turn issues into trackable follow-up work.</div>}
                    </div>
                  </section>
                </div>
              ) : null}

              {activeEditorSection === 'signoff' ? (
                <div className="reports-capture-stack">
                  <section className="reports-capture-card">
                    <div className="reports-capture-card-head">
                      <div>
                        <h4>Review checklist</h4>
                        <p>Use this pass to confirm the report is ready before submission.</p>
                      </div>
                    </div>
                    <div className="reports-review-checklist">
                      <div className={selectedReport.data.executive_summary?.trim() ? 'is-complete' : ''}>Executive summary completed</div>
                      <div className={completedRequiredMetrics >= totalRequiredMetrics ? 'is-complete' : ''}>Required metric observations captured</div>
                      <div className={selectedReport.data.corrective_actions?.trim() ? 'is-complete' : ''}>Corrective actions recorded</div>
                      <div className={selectedReport.status !== 'draft' ? 'is-complete' : ''}>Workflow advanced beyond draft</div>
                    </div>
                  </section>

                  <section className="reports-capture-card" data-tour="reports.activity">
                    <div className="reports-capture-card-head">
                      <div>
                        <h4>Submission & approval</h4>
                        <p>Signatures, routing, and reviewer decisions live here.</p>
                      </div>
                      <span className={`reports-status-chip status-${selectedReport.status}`}>{reportStatusLabel(selectedReport.status)}</span>
                    </div>

                    {selectedReport.status === 'draft' ? (
                      <div className="reports-signature-section">
                        <div>
                          <strong>Author signature</strong>
                          <p>Required when submitting the report for review.</p>
                        </div>
                        <SignaturePad ref={authorSignatureRef} />
                        <div className="reports-inline-actions">
                          <button className="ghost-button" onClick={() => authorSignatureRef.current?.clear()}>Clear signature</button>
                          <button 
                            className="primary-button" 
                            onClick={handleSubmitReport} 
                            disabled={!canSubmitReport || !canAuthorSelectedReport}
                            title={!canSubmitReport ? 'Complete all required sections before submitting' : ''}
                          >
                            Submit for Review
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="reports-readonly-block">
                        <div>
                          <strong>Author signature</strong>
                          <p>{selectedReport.submittedAt ? `Submitted ${formatDateLabel(selectedReport.submittedAt)}` : 'Submission pending'}</p>
                        </div>
                        <SignaturePad readOnly existingSignature={selectedReport.signature} />
                      </div>
                    )}

                    {isReviewerView ? (
                      <div className="reports-review-panel">
                        <label className="reports-field reports-field-full">
                          <span>Reviewer comments</span>
                          <RichTextEditor
                            value={reviewComments}
                            onChange={(html) => setReviewComments(html)}
                            placeholder="Add review comments, feedback, or approval notes."
                            height="150px"
                          />
                        </label>
                        <div>
                          <strong>Reviewer signature</strong>
                          <p>Required for approval.</p>
                        </div>
                        <SignaturePad ref={reviewerSignatureRef} />
                        <div className="reports-inline-actions">
                          <button className="ghost-button" onClick={() => reviewerSignatureRef.current?.clear()}>Clear signature</button>
                          <button className="ghost-button" onClick={() => handleReview('changes_requested')}>Request Changes</button>
                          <button className="ghost-button danger" onClick={() => handleReview('reject')}>Reject</button>
                          <button className="primary-button" onClick={() => handleReview('approve')}>Approve Report</button>
                        </div>
                      </div>
                    ) : null}

                    {selectedReport.status === 'approved' || selectedReport.status === 'rejected' ? (
                      <div className="reports-readonly-block">
                        <div>
                          <strong>Review outcome</strong>
                          <p>{selectedReport.reviewComments || 'No reviewer comments added.'}</p>
                        </div>
                        <SignaturePad readOnly existingSignature={selectedReport.reviewerSignature} />
                      </div>
                    ) : null}
                  </section>
                </div>
              ) : null}

              {activeEditorSection === 'activity' ? (
                <div className="reports-capture-stack">
                  <section className="reports-capture-card">
                    <div className="reports-capture-card-head">
                      <div>
                        <h4>Activity & Audit Center</h4>
                        <p>Complete timeline of workflow events, notifications, and communications.</p>
                      </div>
                    </div>
                    <div className="reports-activity-columns">
                      {/* Column 1: Audit Trail */}
                      <div className="reports-section">
                        <div className="reports-section-head">
                          <h4>Audit Trail</h4>
                          <span>{auditEntries.length} events</span>
                        </div>
                        <div className="reports-activity-list">
                          {auditEntries.length > 0 ? auditEntries.slice(0, 6).map((entry) => (
                            <div key={entry.id} className="reports-activity-item">
                              <strong>{tokenLabel(entry.action)}</strong>
                              <small>{entry.actorName} · {formatDateLabel(entry.createdAt)}</small>
                              {canInspectIds ? <p className="reports-id-line">Audit ID: {entry.id} · Actor ID: {entry.actorId ?? 'Unavailable'}</p> : null}
                              <p>{entry.details}</p>
                            </div>
                          )) : <div className="reports-activity-item"><strong>No audit events yet</strong><p>Server-side workflow events will appear here.</p></div>}
                        </div>
                      </div>

                      {/* Column 2: Notifications */}
                      <div className="reports-section">
                        <div className="reports-section-head">
                          <h4>Notification Queue</h4>
                          <span>{notificationEntries.length} records</span>
                        </div>
                        <div className="reports-activity-list">
                          {notificationEntries.length > 0 ? notificationEntries.slice(0, 6).map((entry) => (
                            <div key={entry.id} className="reports-activity-item">
                              <strong>{entry.channel} · {tokenLabel(entry.event)}</strong>
                              <small>{entry.recipientName} · {entry.status} · {formatDateLabel(entry.createdAt)}</small>
                              {canInspectIds ? <p className="reports-id-line">Notification ID: {entry.id} · Recipient User ID: {entry.recipientUserId ?? 'Unavailable'}</p> : null}
                              <p>{entry.message}</p>
                            </div>
                          )) : <div className="reports-activity-item"><strong>No notifications queued yet</strong><p>Submit and review actions will create delivery records here.</p></div>}
                        </div>
                      </div>

                      {/* Column 3: WhatsApp Messages */}
                      <div className="reports-section">
                        <div className="reports-section-head">
                          <h4>WhatsApp Messages</h4>
                          <span>{whatsappMessages.length} messages</span>
                        </div>
                        <div className="reports-activity-list">
                          {whatsappMessages.length > 0 ? whatsappMessages.slice(0, 6).map((msg) => (
                            <div key={msg.id} className="reports-activity-item">
                              <strong>📱 {msg.messageType} · {msg.status}</strong>
                              <small>{msg.recipientPhone} · {msg.templateName || 'Custom message'}</small>
                              {msg.sentAt && <small> · Sent: {formatDateLabel(msg.sentAt)}</small>}
                              {msg.deliveredAt && <small> · Delivered: {formatDateLabel(msg.deliveredAt)}</small>}
                              {canInspectIds ? <p className="reports-id-line">WA ID: {msg.waMessageId}</p> : null}
                              <p className="reports-whatsapp-message">{msg.messageBody}</p>
                              {msg.errorMessage && <p className="reports-error-text">Error: {msg.errorMessage}</p>}
                            </div>
                          )) : <div className="reports-activity-item"><strong>No WhatsApp messages yet</strong><p>WhatsApp notifications will be tracked here.</p></div>}
                        </div>
                      </div>

                      {/* Column 4: Activity Log */}
                      <div className="reports-section">
                        <div className="reports-section-head">
                          <h4>Activity Feed</h4>
                          <span>{activityLogs.length} activities</span>
                        </div>
                        <div className="reports-activity-list">
                          {activityLogs.length > 0 ? activityLogs.slice(0, 6).map((activity) => (
                            <div key={activity.id} className="reports-activity-item">
                              <strong>{activity.title}</strong>
                              <small>{activity.userName} · {formatDateLabel(activity.createdAt)}</small>
                              {activity.description && <p>{activity.description}</p>}
                            </div>
                          )) : <div className="reports-activity-item"><strong>No activity logged yet</strong><p>User interactions will appear here.</p></div>}
                        </div>
                      </div>
                    </div>
                  </section>
                </div>
              ) : null}
              </section>

              {/* Live Preview Pane */}
              <aside className="reports-preview-pane" data-tour="reports.preview">
                <div className="reports-preview-header">
                  <h4>Live Preview</h4>
                  <span>Real-time preview</span>
                </div>
                <div className="reports-preview-content">
                  <div className="reports-preview-title">
                    <h3>{selectedReport.title}</h3>
                    <p className="reports-preview-meta">{selectedReport.reportingWindow} · {selectedReport.roleName}</p>
                  </div>
                  
                  {selectedReport.data.executive_summary && (
                    <div className="reports-preview-section">
                      <h5>Executive Summary</h5>
                      <div dangerouslySetInnerHTML={{ __html: selectedReport.data.executive_summary }} />
                    </div>
                  )}

                  {selectedReport.data.variance_root_cause && (
                    <div className="reports-preview-section">
                      <h5>Variance / Root Cause</h5>
                      <div dangerouslySetInnerHTML={{ __html: selectedReport.data.variance_root_cause }} />
                    </div>
                  )}

                  {correctiveActionItems.length > 0 ? (
                    <div className="reports-preview-section">
                      <h5>Corrective Actions</h5>
                      <div className="reports-preview-action-list">
                        {correctiveActionItems.slice(0, 4).map((action) => (
                          <div key={action.id} className="reports-preview-action-item">
                            <strong>{action.text}</strong>
                            <span>{action.owner} · {tokenLabel(action.status)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : selectedReport.data.corrective_actions ? (
                    <div className="reports-preview-section">
                      <h5>Corrective Actions</h5>
                      <p>{selectedReport.data.corrective_actions}</p>
                    </div>
                  ) : null}

                  <div className="reports-preview-section">
                    <h5>Metrics Summary</h5>
                    <div className="reports-preview-metrics">
                      {selectedRoleDefinition.items.slice(0, 4).map((item) => {
                        const status = selectedReport.data[`${item.id}__status`] ?? item.status;
                        const note = selectedReport.data[`${item.id}__note`];
                        return (
                          <div key={item.id} className="reports-preview-metric-item">
                            <div className="reports-preview-metric-header">
                              <strong>{item.label}</strong>
                              <span className={`reports-preview-status status-${status}`}>{statusLabel(status as ReportItemStatus)}</span>
                            </div>
                            {note && <p className="reports-preview-note">{note}</p>}
                          </div>
                        );
                      })}
                      {selectedRoleDefinition.items.length > 4 && (
                        <p className="reports-preview-more">+{selectedRoleDefinition.items.length - 4} more items</p>
                      )}
                    </div>
                  </div>

                  <div className="reports-preview-footer">
                    <div className="reports-preview-signature-preview">
                      <strong>Author:</strong> {selectedReport.authorName}
                    </div>
                    <div className="reports-preview-signature-preview">
                      <strong>Reviewer:</strong> {selectedReport.reviewerName}
                    </div>
                    <div className="reports-preview-status-footer">
                      Status: <span className={`reports-preview-status status-${selectedReport.status}`}>{reportStatusLabel(selectedReport.status)}</span>
                    </div>
                  </div>
                </div>
              </aside>
            </div>
          ) : (
            <section className="reports-card reports-empty-state">
              <h3>No report selected</h3>
              <p>Create a report draft from the left panel to start the workflow.</p>
            </section>
          )}
        </main>

        <aside className={`reports-column reports-column-right${isRightRailCollapsed ? ' reports-column-collapsed' : ''}`} data-tour="reports.routing-column">
          {isRightRailCollapsed ? (
            <div className="reports-collapsed-rail">
              <button className="ghost-button reports-rail-toggle" type="button" onClick={toggleRightRail} aria-label="Expand routing panel">
                <PanelRightOpen size={16} />
              </button>
              <span>Routing</span>
            </div>
          ) : selectedReport && selectedRoleDefinition ? (
            <>
              <section className="reports-card reports-side-panel" data-tour="reports.routing">
                <div className="reports-card-head">
                  <h3>Routing</h3>
                </div>
                <div className="reports-routing-stack">
                  <div className="reports-person-block">
                    <div className="reports-person-kicker">Author</div>
                    <strong>{selectedReport.authorName}</strong>
                    <span>Author</span>
                  </div>
                  <div className="reports-person-block">
                    <div className="reports-person-kicker">Reviewer</div>
                    <strong>{selectedReport.reviewerName}</strong>
                    <span>Reviewer</span>
                  </div>
                </div>
                <div className="reports-side-metrics">
                  <div><span>Workflow</span><strong className={`reports-status-chip status-${selectedReport.status}`}>{reportStatusLabel(selectedReport.status)}</strong></div>
                  <div><span>Window</span><strong>{selectedReport.reportingWindow}</strong></div>
                  <div><span>Updated</span><strong>{formatDateLabel(selectedReport.updatedAt)}</strong></div>
                  <div><span>Saved</span><strong>{formatDateLabel(selectedReport.lastSavedAt)}</strong></div>
                  <div><span>Framework items</span><strong>{selectedRoleDefinition.items.length}</strong></div>
                  <div><span>Audit log</span><strong>{auditEntries.length}</strong></div>
                </div>
                <div className="reports-side-actions">
                  <button className="ghost-button" onClick={handleSaveDraft} disabled={!isDraftEditable}>
                    Save draft
                  </button>
                  {selectedReport.status === 'draft' ? <span className="reports-muted-note">Submit from Review & submit after completing checks.</span> : null}
                </div>
              </section>

              <section className="reports-card reports-side-panel" data-tour="reports.side-list">
                <div className="reports-card-head">
                  <h3>Reports</h3>
                  <span>{reportResults.length} total</span>
                </div>
                <div className="reports-list">
                  {reportResults.slice(0, 6).map((report) => (
                    <button key={report.id} className={selectedReport?.id === report.id ? 'reports-list-item is-active' : 'reports-list-item'} onClick={() => { setSelectedReportId(report.id); setValidationMessage(''); }}>
                      <div>
                        <strong>{report.title}</strong>
                        <small>{reportRowMeta(report)}</small>
                      </div>
                      <span className={`reports-status-chip status-${report.status}`}>{reportStatusLabel(report.status)}</span>
                    </button>
                  ))}
                </div>
              </section>
            </>
          ) : null}
        </aside>
      </div>

      {editorModalField ? (
        <div className="modal-backdrop" onClick={closeNarrativeEditor}>
          <div className="modal-card reports-editor-modal" onClick={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h2>{editorModalField === 'executive_summary' ? 'Edit Executive Summary' : editorModalField === 'variance_root_cause' ? 'Edit Variance / Root Cause Analysis' : 'Edit Narrative'}</h2>
                <p>Use simple formatting to shape the report copy before it lands in the live preview.</p>
              </div>
              <button className="icon-button" type="button" onClick={closeNarrativeEditor} aria-label="Close editor">×</button>
            </div>
            <div className="reports-rich-editor-shell">
              <div className="reports-rich-editor-toolbar">
                <button className="ghost-button" type="button" onClick={() => applyEditorCommand('bold')}><strong>B</strong></button>
                <button className="ghost-button" type="button" onClick={() => applyEditorCommand('italic')}><em>I</em></button>
                <button className="ghost-button" type="button" onClick={() => applyEditorCommand('underline')}><u>U</u></button>
                <button className="ghost-button" type="button" onClick={() => applyEditorCommand('insertUnorderedList')}>Bullets</button>
                <button className="ghost-button" type="button" onClick={() => applyEditorCommand('insertOrderedList')}>Numbered</button>
              </div>
              <div
                ref={richEditorRef}
                className="reports-rich-editor"
                contentEditable={isDraftEditable}
                suppressContentEditableWarning
                onInput={(event) => setEditorDraftHtml(event.currentTarget.innerHTML)}
              />
            </div>
            <div className="modal-actions">
              <button className="ghost-button" type="button" onClick={closeNarrativeEditor}>Cancel</button>
              <button className="primary-button" type="button" onClick={saveNarrativeEditor} disabled={!isDraftEditable}>Save changes</button>
            </div>
          </div>
        </div>
      ) : null}
      <ToastContainer />
    </section>
  );
}
