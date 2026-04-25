// AgriReports Platform - Workflow Transitions
// Defines allowed state machine transitions for reports

import { ReportStatus } from '@/types/agrireports';

const ALLOWED_TRANSITIONS: Map<ReportStatus, ReportStatus[]> = new Map([
  ['draft', ['submitted']],
  ['submitted', ['approved', 'rejected', 'changes_requested']],
  ['changes_requested', ['submitted']],
  ['approved', []],
  ['rejected', []],
]);

export function canTransition(from: ReportStatus, to: ReportStatus): boolean {
  const allowed = ALLOWED_TRANSITIONS.get(from);
  return allowed?.includes(to) ?? false;
}

export function getValidTransitions(from: ReportStatus): ReportStatus[] {
  return ALLOWED_TRANSITIONS.get(from) ?? [];
}

export function isTerminalState(status: ReportStatus): boolean {
  return status === 'approved' || status === 'rejected';
}

export function getTransitionError(from: ReportStatus, to: ReportStatus): string {
  const allowed = ALLOWED_TRANSITIONS.get(from);
  
  if (!allowed) {
    return `Invalid status: ${from}`;
  }
  
  if (allowed.length === 0) {
    return `Report is in terminal state: ${from}`;
  }
  
  return `Cannot transition from ${from} to ${to}. Allowed: ${allowed.join(', ')}`;
}
