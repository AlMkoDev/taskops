export type TaskStatus =
  | 'backlog'
  | 'ready'
  | 'in_progress'
  | 'review'
  | 'blocked'
  | 'done'
  | 'archived';

export type TaskPriority = 'P1' | 'P2' | 'P3' | 'P4';

export type TaskType =
  | 'standard'
  | 'recurring'
  | 'report'
  | 'approval'
  | 'incident';

export type WorkLogType =
  | 'note'
  | 'update'
  | 'call'
  | 'meeting'
  | 'field_visit'
  | 'review'
  | 'proof'
  | 'handoff';

export type UserRole = 'admin' | 'manager' | 'member' | 'guest';
export type ProjectType = string;
export type WbsCadence = 'fixed' | 'stage' | 'threshold' | 'milestone' | 'continuous';

export interface AgriculturalRole {
  category: 'management' | 'field_operations' | 'post_harvest' | 'logistics' | 'technical' | 'quality_safety' | 'support';
  engagementType: 'full_time' | 'part_time' | 'casual' | 'seasonal' | 'contract' | 'retainer';
  hourlyRate: number;
  monthlyBase: number;
  totalCostToEmployer: number;
  employerCostMultiplier: number;
  statutoryCompliance: {
    uifRegistered: boolean;
    contractType: string;
    overtimeEligible: boolean;
  };
  cashflowTiming: 'weekly_payroll' | 'monthly_payroll' | 'piece_rate';
  austerityRestricted: boolean;
  notes?: string;
}

export interface User {
  id: string;
  name: string;
  role: UserRole;
  team: string;
  position?: string;
  capacityHoursPerWeek?: number;
  agriculturalRole?: AgriculturalRole;
}

export type AuthRole = 'admin' | 'manager' | 'author' | 'reviewer';
export type AuthUserStatus = 'active' | 'disabled';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: AuthRole;
  team: string;
  status: AuthUserStatus;
  mustChangePassword: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AuthSession {
  id: string;
  userId: string;
  token: string;
  expiresAt: string;
  createdAt: string;
}

export interface AuthSessionView extends AuthSession {
  current: boolean;
}

export interface Project {
  id: string;
  name: string;
  type: ProjectType;
  status: 'active' | 'paused' | 'completed' | 'archived';
  ownerId?: string;
  ownerLabel?: string;
  teamMemberIds: string[];
  description?: string;
  subtitle?: string;
  totalWeeks?: number;
}

export interface ProjectPhase {
  id: string;
  projectId: string;
  name: string;
  description?: string;
  startWeek: number;
  endWeek: number;
  color: string;
  dotColor: string;
}

export interface TaskSubtask {
  id: string;
  title: string;
  completed: boolean;
}

export interface TaskBlocker {
  reason: string;
  category:
    | 'dependency'
    | 'approval'
    | 'external'
    | 'resource'
    | 'technical'
    | 'other';
  severity: 'low' | 'medium' | 'high' | 'critical';
  blockedAt: string;
  notes?: string;
}

export interface TaskSla {
  enabled: boolean;
  targetAt?: string;
  graceHours?: number;
}

export interface Attachment {
  id: string;
  name: string;
  url: string;
  sizeBytes?: number;
}

export interface WorkLog {
  id: string;
  taskId: string;
  type: WorkLogType;
  summary: string;
  details?: string;
  authorId: string;
  occurredAt: string;
  durationMinutes?: number;
  visibility: 'private' | 'team' | 'stakeholders';
  attachmentIds: string[];
}

export interface Activity {
  id: string;
  taskId: string;
  actorId: string;
  type:
    | 'created'
    | 'updated'
    | 'status_changed'
    | 'commented'
    | 'attached_file'
    | 'logged_work'
    | 'reassigned'
    | 'blocked'
    | 'unblocked'
    | 'submitted'
    | 'approved';
  message: string;
  createdAt: string;
}

export interface AutomationRule {
  id: string;
  name: string;
  description: string;
  trigger: 'task_overdue' | 'task_blocked' | 'report_due' | 'task_created';
  action: 'notify_owner' | 'escalate' | 'create_report_task' | 'route_review';
  status: 'active' | 'draft';
}

export interface TaskTemplate {
  id: string;
  name: string;
  description: string;
  type: Exclude<TaskType, 'report'>;
  priority: TaskPriority;
  defaultEstimateHours: number;
}

export type ReportFrequency = 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'closeout';
export type ReportStatus = 'draft' | 'submitted' | 'approved' | 'rejected' | 'changes_requested';
export type ReportReviewAction = 'approve' | 'reject' | 'changes_requested';
export type RoleCategory =
  | 'Management'
  | 'Field Ops'
  | 'Post-Harvest'
  | 'Logistics'
  | 'Technical'
  | 'Compliance'
  | 'Admin';

export type ReportItemStatus = 'on_track' | 'warning' | 'critical';

export interface ReportFrameworkItem {
  id: string;
  label: string;
  status: ReportItemStatus;
  trigger: string;
  source: string;
  required?: boolean;
}

export interface ReportRoleDefinition {
  id: string;
  name: string;
  category: RoleCategory;
  description: string;
  items: ReportFrameworkItem[];
}

export interface ReportPeriodDefinition {
  id: ReportFrequency;
  label: string;
  cadence: string;
  audience: string;
  format: string;
  roles: ReportRoleDefinition[];
}

export interface ReportRecord {
  id: string;
  title: string;
  period: ReportFrequency;
  roleId: string;
  roleName: string;
  category: RoleCategory;
  status: ReportStatus;
  authorId?: string;
  authorName: string;
  reviewerId?: string;
  reviewerName: string;
  reportingWindow: string;
  submittedAt?: string;
  reviewedAt?: string;
  lastSavedAt?: string;
  signature?: string;
  reviewerSignature?: string;
  reviewComments?: string;
  data: Record<string, string>;
  createdAt: string;
  updatedAt: string;
}

export interface ReportAuditEntry {
  id: string;
  reportId: string;
  action:
    | 'created'
    | 'updated'
    | 'submitted'
    | 'approved'
    | 'rejected'
    | 'changes_requested'
    | 'reopened'
    | 'user_invited'
    | 'password_reset'
    | 'password_changed'
    | 'session_revoked';
  actorId?: string;
  actorName: string;
  details: string;
  createdAt: string;
}

export interface ReportNotificationEntry {
  id: string;
  reportId: string;
  channel: 'email' | 'whatsapp' | 'in_app';
  event: 'report_created' | 'report_submitted' | 'report_reviewed' | 'user_invited';
  recipientUserId?: string;
  recipientName: string;
  status: 'queued' | 'sent';
  message: string;
  createdAt: string;
}

export interface WhatsAppMessage {
  id: string;
  reportId: string;
  recipientPhone: string;
  waMessageId: string;
  messageType: 'template' | 'text';
  templateName?: string;
  messageBody: string;
  status: 'queued' | 'sent' | 'delivered' | 'read' | 'failed';
  errorMessage?: string;
  sentAt?: string;
  deliveredAt?: string;
  readAt?: string;
  createdAt: string;
}

export interface ReportActivityEntry {
  id: string;
  reportId: string;
  userId?: string;
  userName: string;
  activityType: 'comment' | 'status_change' | 'view' | 'download' | 'share';
  title: string;
  description?: string;
  createdAt: string;
}

export interface ReportTemplate {
  id: string;
  name: string;
  description: string;
  cadence: 'weekly' | 'monthly' | 'quarterly';
  reviewerLabel: string;
}

export interface Task {
  id: string;
  type: TaskType;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  projectId?: string;
  projectPhaseId?: string;
  wbsCode?: string;
  cadenceType?: WbsCadence;
  triggerLabel?: string;
  durationLabel?: string;
  responsibleLabel?: string;
  startWeek?: number;
  endWeek?: number;
  ownerId: string;
  reviewerId?: string;
  backupOwnerId?: string;
  watcherIds: string[];
  tags: string[];
  startAt?: string;
  dueAt?: string;
  estimateHours?: number;
  loggedHours: number;
  progress: number;
  recurrence?: 'daily' | 'weekly' | 'monthly' | 'quarterly';
  dependencyIds: string[];
  subtasks: TaskSubtask[];
  blocker?: TaskBlocker | null;
  sla?: TaskSla;
  attachmentIds: string[];
  workLogIds: string[];
  activityIds: string[];
}
