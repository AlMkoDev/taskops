import { promises as fs } from 'fs';
import path from 'path';
import { initialReports } from '../data/report-framework';
import { ReportRecord, ReportReviewAction } from '../types/domain';

const REPORTS_FILE = path.join(process.cwd(), 'data', 'reports.json');

type CreateReportInput = Pick<ReportRecord, 'title' | 'period' | 'roleId' | 'roleName' | 'category' | 'authorId' | 'authorName' | 'reviewerId' | 'reviewerName' | 'reportingWindow' | 'data'>;

async function ensureReportsFile() {
  const directory = path.dirname(REPORTS_FILE);
  await fs.mkdir(directory, { recursive: true });

  try {
    await fs.access(REPORTS_FILE);
  } catch {
    await fs.writeFile(REPORTS_FILE, JSON.stringify(initialReports, null, 2), 'utf8');
  }
}

async function writeReports(reports: ReportRecord[]) {
  await ensureReportsFile();
  await fs.writeFile(REPORTS_FILE, JSON.stringify(reports, null, 2), 'utf8');
}

export async function readReports(): Promise<ReportRecord[]> {
  await ensureReportsFile();
  const contents = await fs.readFile(REPORTS_FILE, 'utf8');
  return JSON.parse(contents) as ReportRecord[];
}

export async function createReportRecord(input: CreateReportInput): Promise<ReportRecord> {
  const reports = await readReports();
  const now = new Date().toISOString();
  const report: ReportRecord = {
    id: `report_${Date.now()}`,
    status: 'draft',
    createdAt: now,
    updatedAt: now,
    lastSavedAt: now,
    submittedAt: undefined,
    reviewedAt: undefined,
    signature: undefined,
    reviewerSignature: undefined,
    reviewComments: undefined,
    ...input
  };

  await writeReports([report, ...reports]);
  return report;
}

export async function getReportRecord(id: string): Promise<ReportRecord | null> {
  const reports = await readReports();
  return reports.find((report) => report.id === id) ?? null;
}

export async function updateReportRecord(id: string, updater: (current: ReportRecord) => ReportRecord): Promise<ReportRecord | null> {
  const reports = await readReports();
  let updatedRecord: ReportRecord | null = null;

  const nextReports = reports.map((report) => {
    if (report.id !== id) return report;
    updatedRecord = updater(report);
    return updatedRecord;
  });

  if (!updatedRecord) return null;
  await writeReports(nextReports);
  return updatedRecord;
}

export async function replaceReportRecord(id: string, updates: Partial<ReportRecord>): Promise<ReportRecord | null> {
  return updateReportRecord(id, (current) => ({
    ...current,
    ...updates,
    updatedAt: new Date().toISOString()
  }));
}

export async function submitReportRecord(id: string, signature: string): Promise<ReportRecord | null> {
  return updateReportRecord(id, (current) => ({
    ...current,
    status: 'submitted',
    signature,
    submittedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }));
}

export async function reviewReportRecord(id: string, action: ReportReviewAction, payload: { comments?: string; signature?: string }): Promise<ReportRecord | null> {
  return updateReportRecord(id, (current) => ({
    ...current,
    status: action === 'approve' ? 'approved' : action === 'reject' ? 'rejected' : 'changes_requested',
    reviewComments: payload.comments?.trim() || current.reviewComments,
    reviewerSignature: action === 'approve' ? payload.signature ?? current.reviewerSignature : current.reviewerSignature,
    reviewedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }));
}
