// AgriReports Platform - Shared Type Definitions
// Core domain types for the reporting system

export type ReportFrequency = 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'closeout';

export type ReportStatus =
  | 'draft'
  | 'submitted'
  | 'approved'
  | 'rejected'
  | 'changes_requested';

export type ReviewAction = 'approve' | 'reject' | 'changes_requested';

export type RoleCategory =
  | 'Management'
  | 'Field Ops'
  | 'Post-Harvest'
  | 'Logistics'
  | 'Technical'
  | 'Compliance'
  | 'Admin';

export type ItemStatus = 'on_track' | 'warning' | 'critical' | '';

export interface ReportItem {
  id: string;
  text: string;
  status: ItemStatus;
  required?: boolean;
}

export interface RoleCard {
  id: string;
  name: string;
  cat: RoleCategory;
  items: ReportItem[];
}

export interface ReportPeriod {
  id: ReportFrequency;
  label: string;
  cadence: string;
  audience: string;
  format: string;
  roles: RoleCard[];
}

export interface ReportAuthor {
  id: string;
  name: string;
  email: string;
  phone?: string;
}

export interface Report {
  id: string;
  period: ReportFrequency;
  role: string;
  roleName?: string;
  category?: RoleCategory;
  title?: string; // Legacy field for backward compatibility
  status: ReportStatus;
  author: ReportAuthor;
  authorId: string;
  authorName?: string; // Legacy field for backward compatibility
  data: Record<string, unknown>;
  signature?: string;          // Base64 PNG
  reviewerSignature?: string;  // Base64 PNG (approver)
  reviewComments?: string;
  reviewedBy?: ReportAuthor;
  reviewerId?: string;
  reviewerName?: string; // Legacy field for backward compatibility
  reportingWindow?: string;
  createdAt: string;           // ISO 8601
  updatedAt: string;
  lastSavedAt?: string;
}
