import { Report, RoleCategory } from '@/types/agrireports';
import { ReportRecord } from '@/types/domain';

const DEFAULT_CATEGORY: RoleCategory = 'Field Ops';

export function toReportRecord(report: Report): ReportRecord {
  return {
    id: report.id,
    title: report.title || `${report.period} ${report.roleName ?? report.role} report`,
    period: report.period,
    roleId: report.role,
    roleName: report.roleName ?? report.role,
    category: report.category ?? DEFAULT_CATEGORY,
    status: report.status,
    authorId: report.authorId,
    authorName: report.authorName ?? report.author.name,
    reviewerId: report.reviewerId,
    reviewerName: report.reviewerName ?? 'Pending Review',
    reportingWindow: report.reportingWindow ?? '',
    submittedAt: undefined,
    reviewedAt: undefined,
    lastSavedAt: report.lastSavedAt,
    signature: report.signature,
    reviewerSignature: report.reviewerSignature,
    reviewComments: report.reviewComments,
    data: normalizeReportData(report.data),
    createdAt: report.createdAt,
    updatedAt: report.updatedAt
  };
}

export function toReportUpdates(updates: Partial<ReportRecord>): Partial<Report> {
  return {
    title: updates.title,
    period: updates.period,
    role: updates.roleId,
    roleName: updates.roleName,
    category: updates.category,
    status: updates.status,
    authorId: updates.authorId,
    authorName: updates.authorName,
    reviewerId: updates.reviewerId,
    reviewerName: updates.reviewerName,
    reportingWindow: updates.reportingWindow,
    lastSavedAt: updates.lastSavedAt,
    signature: updates.signature,
    reviewerSignature: updates.reviewerSignature,
    reviewComments: updates.reviewComments,
    data: updates.data
  };
}

export function toReportModel(record: ReportRecord): Report {
  return {
    id: record.id,
    period: record.period,
    role: record.roleId,
    roleName: record.roleName,
    category: record.category,
    title: record.title,
    status: record.status,
    author: {
      id: record.authorId ?? 'unknown',
      name: record.authorName,
      email: ''
    },
    authorId: record.authorId ?? 'unknown',
    authorName: record.authorName,
    data: record.data,
    signature: record.signature,
    reviewerSignature: record.reviewerSignature,
    reviewComments: record.reviewComments,
    reviewerId: record.reviewerId,
    reviewerName: record.reviewerName,
    reportingWindow: record.reportingWindow,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    lastSavedAt: record.lastSavedAt
  };
}

function normalizeReportData(data: Record<string, unknown>): Record<string, string> {
  return Object.fromEntries(
    Object.entries(data).map(([key, value]) => [key, value == null ? '' : String(value)])
  );
}
