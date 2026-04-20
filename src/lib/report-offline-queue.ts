import { ReportRecord, ReportReviewAction } from '@/types/domain';

const STORAGE_KEY = 'taskops:report-offline-queue';

export type QueuedReportAction =
  | {
      id: string;
      type: 'create';
      tempReportId: string;
      payload: {
        title: string;
        period: ReportRecord['period'];
        roleId: string;
        roleName: string;
        category: ReportRecord['category'];
        authorId?: string;
        authorName: string;
        reviewerId?: string;
        reviewerName: string;
        reportingWindow: string;
        data: Record<string, string>;
      };
    }
  | {
      id: string;
      type: 'update';
      reportId: string;
      payload: Partial<ReportRecord>;
    }
  | {
      id: string;
      type: 'submit';
      reportId: string;
      payload: { signature: string };
    }
  | {
      id: string;
      type: 'review';
      reportId: string;
      payload: { action: ReportReviewAction; comments?: string; signature?: string };
    };

function canUseStorage() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

export function readQueuedReportActions(): QueuedReportAction[] {
  if (!canUseStorage()) return [];

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as QueuedReportAction[];
  } catch {
    return [];
  }
}

export function writeQueuedReportActions(actions: QueuedReportAction[]) {
  if (!canUseStorage()) return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(actions));
}

export function enqueueReportAction(action: QueuedReportAction) {
  const current = readQueuedReportActions();
  const next = [...current, action];
  writeQueuedReportActions(next);
  return next;
}

export function clearQueuedReportActions() {
  if (!canUseStorage()) return;
  window.localStorage.removeItem(STORAGE_KEY);
}

export function replaceQueuedReportActions(actions: QueuedReportAction[]) {
  writeQueuedReportActions(actions);
}
