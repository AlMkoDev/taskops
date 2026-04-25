// AgriReports Platform - API Types

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface ApiError {
  error: string;
  message?: string;
  details?: Record<string, string[]>;
  statusCode: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

// Request/Response types for report endpoints

export interface CreateReportRequest {
  period: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'closeout';
  role: string;
  title?: string;
  roleName?: string;
  category?: 'Management' | 'Field Ops' | 'Post-Harvest' | 'Logistics' | 'Technical' | 'Compliance' | 'Admin';
  reviewerId?: string;
  reviewerName?: string;
  reportingWindow?: string;
  data?: Record<string, unknown>;
}

export interface UpdateReportRequest {
  data?: Record<string, unknown>;
  signature?: string;
  reportingWindow?: string;
}

export interface SubmitReportRequest {
  signature: string; // Base64 PNG - required for submission
}

export interface ReviewReportRequest {
  action: 'approve' | 'reject' | 'changes_requested';
  comments?: string;
  signature?: string; // Required for approve
}

export interface ListReportsQuery {
  status?: 'draft' | 'submitted' | 'approved' | 'rejected' | 'changes_requested';
  frequency?: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'closeout';
  authorId?: string;
  reviewerId?: string;
  page?: number;
  pageSize?: number;
  search?: string;
}
