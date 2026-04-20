import 'server-only';
import { getDatabaseUrl, queryPostgres } from '@/lib/postgres';
import {
  createReportRecord,
  getReportRecord,
  readReports,
  replaceReportRecord,
  reviewReportRecord,
  submitReportRecord
} from '@/lib/reports-persistence';
import { ReportRecord, ReportReviewAction } from '@/types/domain';

type CreateReportInput = Pick<ReportRecord, 'title' | 'period' | 'roleId' | 'roleName' | 'category' | 'authorId' | 'authorName' | 'reviewerId' | 'reviewerName' | 'reportingWindow' | 'data'>;

function shouldFallbackToJson(error: unknown) {
  return error instanceof Error && /(does not exist|relation .* does not exist|column .* does not exist)/i.test(error.message);
}

type ReportRow = {
  id: string;
  title: string;
  period: ReportRecord['period'];
  role_id: string;
  role_name: string;
  category: ReportRecord['category'];
  status: ReportRecord['status'];
  author_id: string | null;
  author_name: string;
  reviewer_id: string | null;
  reviewer_name: string;
  reporting_window: string;
  submitted_at: string | null;
  reviewed_at: string | null;
  last_saved_at: string | null;
  signature: string | null;
  reviewer_signature: string | null;
  review_comments: string | null;
  data: Record<string, string>;
  created_at: string;
  updated_at: string;
};

function mapReportRow(row: ReportRow): ReportRecord {
  return {
    id: row.id,
    title: row.title,
    period: row.period,
    roleId: row.role_id,
    roleName: row.role_name,
    category: row.category,
    status: row.status,
    authorId: row.author_id ?? undefined,
    authorName: row.author_name,
    reviewerId: row.reviewer_id ?? undefined,
    reviewerName: row.reviewer_name,
    reportingWindow: row.reporting_window,
    submittedAt: row.submitted_at ?? undefined,
    reviewedAt: row.reviewed_at ?? undefined,
    lastSavedAt: row.last_saved_at ?? undefined,
    signature: row.signature ?? undefined,
    reviewerSignature: row.reviewer_signature ?? undefined,
    reviewComments: row.review_comments ?? undefined,
    data: row.data ?? {},
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

async function getByIdInternal(id: string) {
  if (!getDatabaseUrl()) {
    return getReportRecord(id);
  }
  try {
    const result = await queryPostgres<ReportRow>('SELECT * FROM reports WHERE id = $1', [id]);
    return result.rows[0] ? mapReportRow(result.rows[0]) : null;
  } catch (error) {
    if (shouldFallbackToJson(error)) {
      return getReportRecord(id);
    }
    throw error;
  }
}

export const reportRepository = {
  async list(): Promise<ReportRecord[]> {
    if (!getDatabaseUrl()) {
      return readReports();
    }
    try {
      const result = await queryPostgres<ReportRow>('SELECT * FROM reports ORDER BY updated_at DESC');
      return result.rows.map(mapReportRow);
    } catch (error) {
      if (shouldFallbackToJson(error)) {
        return readReports();
      }
      throw error;
    }
  },
  getById(id: string): Promise<ReportRecord | null> {
    return getByIdInternal(id);
  },
  async create(input: CreateReportInput): Promise<ReportRecord> {
    if (!getDatabaseUrl()) {
      return createReportRecord(input);
    }
    const now = new Date().toISOString();
    const id = `report_${Date.now()}`;
    try {
      await queryPostgres(
      `INSERT INTO reports (
        id, title, period, role_id, role_name, category, status, author_id, author_name, reviewer_id, reviewer_name, reporting_window,
        submitted_at, reviewed_at, last_saved_at, signature, reviewer_signature, review_comments, data, created_at, updated_at
      ) VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,
        $13,$14,$15,$16,$17,$18,$19::jsonb,$20,$21
      )`,
      [
        id,
        input.title,
        input.period,
        input.roleId,
        input.roleName,
        input.category,
        'draft',
        input.authorId ?? null,
        input.authorName,
        input.reviewerId ?? null,
        input.reviewerName,
        input.reportingWindow,
        null,
        null,
        now,
        null,
        null,
        null,
        JSON.stringify(input.data),
        now,
        now
        ]
      );

      const created = await getByIdInternal(id);
      if (!created) {
        throw new Error('Failed to create report.');
      }
      return created;
    } catch (error) {
      if (shouldFallbackToJson(error)) {
        return createReportRecord(input);
      }
      throw error;
    }
  },
  async update(id: string, updates: Partial<ReportRecord>): Promise<ReportRecord | null> {
    if (!getDatabaseUrl()) {
      return replaceReportRecord(id, updates);
    }
    const current = await getByIdInternal(id);
    if (!current) return null;

    const next: ReportRecord = {
      ...current,
      ...updates,
      updatedAt: new Date().toISOString()
    };

    try {
      await queryPostgres(
      `UPDATE reports SET
        title = $2,
        period = $3,
        role_id = $4,
        role_name = $5,
        category = $6,
        status = $7,
        author_id = $8,
        author_name = $9,
        reviewer_id = $10,
        reviewer_name = $11,
        reporting_window = $12,
        submitted_at = $13,
        reviewed_at = $14,
        last_saved_at = $15,
        signature = $16,
        reviewer_signature = $17,
        review_comments = $18,
        data = $19::jsonb,
        created_at = $20,
        updated_at = $21
      WHERE id = $1`,
      [
        id,
        next.title,
        next.period,
        next.roleId,
        next.roleName,
        next.category,
        next.status,
        next.authorId ?? null,
        next.authorName,
        next.reviewerId ?? null,
        next.reviewerName,
        next.reportingWindow,
        next.submittedAt ?? null,
        next.reviewedAt ?? null,
        next.lastSavedAt ?? null,
        next.signature ?? null,
        next.reviewerSignature ?? null,
        next.reviewComments ?? null,
        JSON.stringify(next.data),
        next.createdAt,
        next.updatedAt
        ]
      );

      return getByIdInternal(id);
    } catch (error) {
      if (shouldFallbackToJson(error)) {
        return replaceReportRecord(id, updates);
      }
      throw error;
    }
  },
  async submit(id: string, signature: string): Promise<ReportRecord | null> {
    if (!getDatabaseUrl()) {
      return submitReportRecord(id, signature);
    }
    const current = await getByIdInternal(id);
    if (!current) return null;
    return this.update(id, {
      status: 'submitted',
      signature,
      submittedAt: new Date().toISOString()
    });
  },
  async review(id: string, action: ReportReviewAction, payload: { comments?: string; signature?: string }): Promise<ReportRecord | null> {
    if (!getDatabaseUrl()) {
      return reviewReportRecord(id, action, payload);
    }
    const current = await getByIdInternal(id);
    if (!current) return null;
    return this.update(id, {
      status: action === 'approve' ? 'approved' : action === 'reject' ? 'rejected' : 'changes_requested',
      reviewComments: payload.comments?.trim() || current.reviewComments,
      reviewerSignature: action === 'approve' ? payload.signature ?? current.reviewerSignature : current.reviewerSignature,
      reviewedAt: new Date().toISOString()
    });
  }
};
