import { promises as fs } from 'fs';
import path from 'path';
import { ReportAuditEntry, ReportNotificationEntry } from '@/types/domain';

const AUDIT_FILE = path.join(process.cwd(), 'data', 'report-audit-log.json');
const NOTIFICATIONS_FILE = path.join(process.cwd(), 'data', 'report-notifications.json');

async function ensureFile(filePath: string) {
  const directory = path.dirname(filePath);
  await fs.mkdir(directory, { recursive: true });

  try {
    await fs.access(filePath);
  } catch {
    await fs.writeFile(filePath, '[]', 'utf8');
  }
}

async function readJsonFile<T>(filePath: string): Promise<T[]> {
  await ensureFile(filePath);
  const contents = await fs.readFile(filePath, 'utf8');
  return JSON.parse(contents) as T[];
}

async function writeJsonFile<T>(filePath: string, records: T[]) {
  await ensureFile(filePath);
  await fs.writeFile(filePath, JSON.stringify(records, null, 2), 'utf8');
}

export async function readReportAuditEntries(reportId?: string) {
  const entries = await readJsonFile<ReportAuditEntry>(AUDIT_FILE);
  return reportId ? entries.filter((entry) => entry.reportId === reportId) : entries;
}

export async function appendReportAuditEntry(entry: Omit<ReportAuditEntry, 'id' | 'createdAt'>) {
  const entries = await readJsonFile<ReportAuditEntry>(AUDIT_FILE);
  const record: ReportAuditEntry = {
    id: `audit_${Date.now()}`,
    createdAt: new Date().toISOString(),
    ...entry
  };
  await writeJsonFile(AUDIT_FILE, [record, ...entries]);
  return record;
}

export async function readReportNotificationEntries(reportId?: string) {
  const entries = await readJsonFile<ReportNotificationEntry>(NOTIFICATIONS_FILE);
  return reportId ? entries.filter((entry) => entry.reportId === reportId) : entries;
}

export async function appendReportNotificationEntries(entriesToAdd: Array<Omit<ReportNotificationEntry, 'id' | 'createdAt'>>) {
  const entries = await readJsonFile<ReportNotificationEntry>(NOTIFICATIONS_FILE);
  const records = entriesToAdd.map<ReportNotificationEntry>((entry, index) => ({
    id: `notify_${Date.now()}_${index}`,
    createdAt: new Date().toISOString(),
    ...entry
  }));
  await writeJsonFile(NOTIFICATIONS_FILE, [...records, ...entries]);
  return records;
}
