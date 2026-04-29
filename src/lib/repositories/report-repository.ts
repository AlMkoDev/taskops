// AgriReports Platform - Reports Repository
// Database operations for reports

import { QueryResultRow } from 'pg';
import { Report, ReportStatus, ReportFrequency, RoleCategory } from '../../types/agrireports';
import { ListReportsQuery } from '../../types/agrireports-api';
import { getDatabaseUrl, isPostgresConnectionError, queryPostgres } from '../postgres';
import { toReportModel } from '../reports-adapter';
import { createReportRecord, getReportRecord, readReports, replaceReportRecord, reviewReportRecord, submitReportRecord } from '../reports-persistence';

type ReportRow = QueryResultRow & {
  id: string;
  period: ReportFrequency;
  role: string;
  role_name: string | null;
  category: RoleCategory | null;
  reporting_window: string | null;
  title: string | null;
  status: ReportStatus;
  author_id: string;
  author_name: string;
  author_email: string | null;
  reviewer_id: string | null;
  reviewer_name: string | null;
  reviewer_email: string | null;
  data: Record<string, unknown> | string;
  signature: string | null;
  reviewer_signature: string | null;
  review_comments: string | null;
  submitted_at: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
  last_saved_at: string | null;
};

const REPORT_SELECT = `
  SELECT
    r.id,
    r.period,
    r.role,
    r.role_name,
    r.category,
    r.reporting_window,
    r.title,
    r.status,
    r.author_id,
    r.author_name,
    COALESCE(r.author_email, au.email) AS author_email,
    r.reviewer_id,
    r.reviewer_name,
    COALESCE(r.reviewer_email, ru.email) AS reviewer_email,
    r.data,
    r.signature,
    r.reviewer_signature,
    r.review_comments,
    r.submitted_at,
    r.reviewed_at,
    r.created_at,
    r.updated_at,
    r.last_saved_at
  FROM agri_reports r
  LEFT JOIN agri_users au ON r.author_id = au.id
  LEFT JOIN agri_users ru ON r.reviewer_id = ru.id
`;

function shouldFallbackToJson(error: unknown) {
  return isPostgresConnectionError(error);
}

export class ReportRepository {
  async findAll(query: ListReportsQuery): Promise<{ reports: Report[]; total: number }> {
    if (!getDatabaseUrl()) {
      const reports = (await readReports()).map(toReportModel);
      return { reports, total: reports.length };
    }

    try {
      const { status, frequency, authorId, reviewerId, page = 1, pageSize = 20, search } = query;

      const whereClause: string[] = [];
      const params: Array<string | number> = [];
      let paramIndex = 1;

      if (status) {
        whereClause.push(`status = $${paramIndex}`);
        params.push(status);
        paramIndex++;
      }

      if (frequency) {
        whereClause.push(`period = $${paramIndex}`);
        params.push(frequency);
        paramIndex++;
      }

      if (authorId) {
        whereClause.push(`author_id = $${paramIndex}`);
        params.push(authorId);
        paramIndex++;
      }

      if (reviewerId) {
        whereClause.push(`reviewer_id = $${paramIndex}`);
        params.push(reviewerId);
        paramIndex++;
      }

      if (search) {
        whereClause.push(`(role_name ILIKE $${paramIndex} OR title ILIKE $${paramIndex})`);
        params.push(`%${search}%`);
        paramIndex++;
      }

      const whereSQL = whereClause.length > 0 ? `WHERE ${whereClause.join(' AND ')}` : '';

      // Get total count
      const countQuery = `SELECT COUNT(*) as total FROM agri_reports ${whereSQL}`;
      const countResult = await queryPostgres<{ total: string }>(countQuery, params);
      const total = parseInt(countResult.rows[0].total);

      // Get paginated results
      const offset = (page - 1) * pageSize;
      const dataQuery = `
        ${REPORT_SELECT}
        ${whereSQL}
        ORDER BY r.updated_at DESC
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;

      params.push(pageSize, offset);
      const dataResult = await queryPostgres<ReportRow>(dataQuery, params);

      const reports = dataResult.rows.map(this.rowToReport);

      return { reports, total };
    } catch (error) {
      if (shouldFallbackToJson(error)) {
        const reports = (await readReports()).map(toReportModel);
        return { reports, total: reports.length };
      }
      throw error;
    }
  }

  // Legacy method for backward compatibility with metrics endpoint
  async list(): Promise<Report[]> {
    if (!getDatabaseUrl()) {
      return (await readReports()).map(toReportModel);
    }

    try {
      const query = `${REPORT_SELECT} ORDER BY r.updated_at DESC`;
      const result = await queryPostgres<ReportRow>(query);
      return result.rows.map(this.rowToReport);
    } catch (error) {
      if (shouldFallbackToJson(error)) {
        return (await readReports()).map(toReportModel);
      }
      throw error;
    }
  }

  // Alias methods for backward compatibility
  async getById(id: string): Promise<Report | null> {
    return this.findById(id);
  }

  async submit(id: string, signature: string): Promise<Report | null> {
    if (!getDatabaseUrl()) {
      const updated = await submitReportRecord(id, signature);
      return updated ? toReportModel(updated) : null;
    }

    try {
      return await this.updateStatus(id, 'submitted', undefined, undefined, signature);
    } catch (error) {
      if (shouldFallbackToJson(error)) {
        const updated = await submitReportRecord(id, signature);
        return updated ? toReportModel(updated) : null;
      }
      throw error;
    }
  }

  async review(
    id: string,
    action: 'approve' | 'reject' | 'changes_requested',
    options: { comments?: string; signature?: string; reviewerId?: string }
  ): Promise<Report | null> {
    if (!getDatabaseUrl()) {
      const updated = await reviewReportRecord(id, action, {
        comments: options.comments,
        signature: options.signature
      });
      return updated ? toReportModel(updated) : null;
    }

    const statusMap: Record<string, ReportStatus> = {
      approve: 'approved',
      reject: 'rejected',
      changes_requested: 'changes_requested'
    };

    try {
      return await this.updateStatus(
        id,
        statusMap[action],
        options.reviewerId,
        options.comments,
        options.signature
      );
    } catch (error) {
      if (shouldFallbackToJson(error)) {
        const updated = await reviewReportRecord(id, action, {
          comments: options.comments,
          signature: options.signature
        });
        return updated ? toReportModel(updated) : null;
      }
      throw error;
    }
  }

  async findById(id: string): Promise<Report | null> {
    if (!getDatabaseUrl()) {
      const report = await getReportRecord(id);
      return report ? toReportModel(report) : null;
    }

    try {
      const query = `${REPORT_SELECT} WHERE r.id = $1`;
      const result = await queryPostgres<ReportRow>(query, [id]);

      if (result.rows.length === 0) {
        return null;
      }

      return this.rowToReport(result.rows[0]);
    } catch (error) {
      if (shouldFallbackToJson(error)) {
        const report = await getReportRecord(id);
        return report ? toReportModel(report) : null;
      }
      throw error;
    }
  }

  async create(report: Omit<Report, 'id' | 'createdAt' | 'updatedAt'>): Promise<Report> {
    if (!getDatabaseUrl()) {
      const created = await createReportRecord({
        title: report.title || `${report.period} ${report.roleName ?? report.role} report`,
        period: report.period,
        roleId: report.role,
        roleName: report.roleName ?? report.role,
        category: report.category ?? 'Field Ops',
        authorId: report.authorId,
        authorName: report.authorName ?? report.author.name,
        reviewerId: report.reviewerId,
        reviewerName: report.reviewerName ?? 'Pending Review',
        reportingWindow: report.reportingWindow ?? '',
        data: Object.fromEntries(
          Object.entries(report.data).map(([key, value]) => [key, value == null ? '' : String(value)])
        )
      });
      return toReportModel(created);
    }

    try {
      const id = `rpt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const now = new Date().toISOString();
      const title = report.title || `${report.period} ${report.roleName ?? report.role} report`;

      const query = `
        INSERT INTO agri_reports (
          id, title, period, role, role_name, category, status, author_id, author_name, author_email, reviewer_id, reviewer_name, reviewer_email,
          reporting_window, submitted_at, reviewed_at, last_saved_at, signature, reviewer_signature, review_comments, data, created_at, updated_at
        ) VALUES (
          $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,
          $13,$14,$15,$16,$17,$18,$19,$20,$21::jsonb,$22,$23
        )
        RETURNING *
      `;

      const values = [
        id,
        title,
        report.period,
        report.role,
        report.roleName || null,
        report.category || null,
        report.status,
        report.authorId,
        report.authorName || report.author?.name || 'Unknown',
        report.author?.email || null,
        report.reviewerId || null,
        report.reviewerName || 'Pending Review',
        report.reviewedBy?.email || null,
        report.reportingWindow || null,
        null,
        null,
        now,
        report.signature || null,
        report.reviewerSignature || null,
        report.reviewComments || null,
        JSON.stringify(report.data),
        now,
        now
      ];

      const result = await queryPostgres<ReportRow>(query, values);
      return this.rowToReport(result.rows[0]);
    } catch (error) {
      if (shouldFallbackToJson(error)) {
        const created = await createReportRecord({
          title: report.title || `${report.period} ${report.roleName ?? report.role} report`,
          period: report.period,
          roleId: report.role,
          roleName: report.roleName ?? report.role,
          category: report.category ?? 'Field Ops',
          authorId: report.authorId,
          authorName: report.authorName ?? report.author.name,
          reviewerId: report.reviewerId,
          reviewerName: report.reviewerName ?? 'Pending Review',
          reportingWindow: report.reportingWindow ?? '',
          data: Object.fromEntries(
            Object.entries(report.data).map(([key, value]) => [key, value == null ? '' : String(value)])
          )
        });
        return toReportModel(created);
      }
      throw error;
    }
  }

  async update(id: string, updates: Partial<Report>): Promise<Report | null> {
    if (!getDatabaseUrl()) {
      const updated = await replaceReportRecord(id, {
        title: updates.title,
        period: updates.period,
        roleId: updates.role,
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
          ? Object.fromEntries(Object.entries(updates.data).map(([key, value]) => [key, value == null ? '' : String(value)]))
          : undefined
      });
      return updated ? toReportModel(updated) : null;
    }

    try {
      const existing = await this.findById(id);
      if (!existing) {
        return null;
      }

      const updated = { ...existing, ...updates, updatedAt: new Date().toISOString() };
      if (updates.data || updates.signature || updates.reportingWindow) {
        updated.lastSavedAt = new Date().toISOString();
      }

      const query = `
        UPDATE agri_reports SET
          title = $1,
          period = $2,
          role = $3,
          role_name = $4,
          category = $5,
          status = $6,
          author_id = $7,
          author_name = $8,
          author_email = $9,
          reviewer_id = $10,
          reviewer_name = $11,
          reviewer_email = $12,
          reporting_window = $13,
          submitted_at = $14,
          reviewed_at = $15,
          last_saved_at = $16,
          signature = $17,
          reviewer_signature = $18,
          review_comments = $19,
          data = $20::jsonb,
          created_at = $21,
          updated_at = $22
        WHERE id = $23
        RETURNING *
      `;

      const values = [
        updated.title || `${updated.period} ${updated.roleName} report`,
        updated.period,
        updated.role,
        updated.roleName || null,
        updated.category || null,
        updated.status,
        updated.authorId,
        updated.authorName || updated.author?.name || 'Unknown',
        updated.author?.email || existing.author?.email || null,
        updated.reviewerId || null,
        updated.reviewerName || 'Pending Review',
        updated.reviewedBy?.email || existing.reviewedBy?.email || null,
        updated.reportingWindow || null,
        rowSubmittedAt(updated),
        rowReviewedAt(updated),
        updated.lastSavedAt || null,
        updated.signature || null,
        updated.reviewerSignature || null,
        updated.reviewComments || null,
        JSON.stringify(updated.data),
        updated.createdAt,
        updated.updatedAt,
        id
      ];

      const result = await queryPostgres<ReportRow>(query, values);
      return this.rowToReport(result.rows[0]);
    } catch (error) {
      if (shouldFallbackToJson(error)) {
        const updated = await replaceReportRecord(id, {
          title: updates.title,
          period: updates.period,
          roleId: updates.role,
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
            ? Object.fromEntries(Object.entries(updates.data).map(([key, value]) => [key, value == null ? '' : String(value)]))
            : undefined
        });
        return updated ? toReportModel(updated) : null;
      }
      throw error;
    }
  }

  async updateStatus(
    id: string,
    status: ReportStatus,
    reviewerId?: string,
    reviewComments?: string,
    reviewerSignature?: string
  ): Promise<Report | null> {
    const query = `
      UPDATE agri_reports SET
        status = $1,
        reviewer_id = $2,
        review_comments = $3,
        reviewer_signature = $4,
        submitted_at = CASE WHEN $1 = 'submitted' THEN $5 ELSE submitted_at END,
        reviewed_at = CASE WHEN $1 IN ('approved', 'rejected', 'changes_requested') THEN $5 ELSE reviewed_at END,
        updated_at = $5
      WHERE id = $6
      RETURNING *
    `;

    const values = [
      status,
      reviewerId || null,
      reviewComments || null,
      reviewerSignature || null,
      new Date().toISOString(),
      id
    ];

    const result = await queryPostgres<ReportRow>(query, values);

    if (result.rows.length === 0) {
      return null;
    }

    return this.rowToReport(result.rows[0]);
  }

  async delete(id: string): Promise<boolean> {
    if (!getDatabaseUrl()) {
      return false;
    }

    try {
      const query = 'DELETE FROM agri_reports WHERE id = $1';
      const result = await queryPostgres(query, [id]);
      return (result.rowCount || 0) > 0;
    } catch (error) {
      if (shouldFallbackToJson(error)) {
        return false;
      }
      throw error;
    }
  }

  private rowToReport(row: ReportRow): Report {
    return {
      id: row.id,
      period: row.period as ReportFrequency,
      role: row.role,
      roleName: row.role_name || undefined,
      category: row.category || undefined,
      title: row.title || undefined,
      status: row.status as ReportStatus,
      authorId: row.author_id,
      authorName: row.author_name,
      author: {
        id: row.author_id,
        name: row.author_name,
        email: row.author_email || ''
      },
      data: typeof row.data === 'string' ? JSON.parse(row.data) : row.data,
      signature: row.signature || undefined,
      reviewerSignature: row.reviewer_signature || undefined,
      reviewComments: row.review_comments || undefined,
      reviewerId: row.reviewer_id || undefined,
      reviewerName: row.reviewer_name || undefined,
      reportingWindow: row.reporting_window || undefined,
      reviewedBy: row.reviewer_id ? {
        id: row.reviewer_id,
        name: row.reviewer_name || 'Reviewer',
        email: row.reviewer_email || ''
      } : undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      lastSavedAt: row.last_saved_at || undefined
    };
  }
}

function rowSubmittedAt(report: Report) {
  return report.status === 'submitted' ? report.updatedAt : null;
}

function rowReviewedAt(report: Report) {
  return ['approved', 'rejected', 'changes_requested'].includes(report.status) ? report.updatedAt : null;
}

// Singleton instance for use across API routes
export const reportRepository = new ReportRepository();
