const DISPLAY_LOCALE = 'en-ZA';

export function getCurrentDate() {
  return new Date();
}

export function getCurrentTimeZone() {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
}

export function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function isSameDay(left: Date, right: Date) {
  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
  );
}

export function dateKey(date: Date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0')
  ].join('-');
}

export function isToday(value?: string | Date | null) {
  if (!value) return false;
  const date = typeof value === 'string' ? new Date(value) : value;
  return isSameDay(date, getCurrentDate());
}

export function isOverdue(value?: string | Date | null) {
  if (!value) return false;
  const date = typeof value === 'string' ? new Date(value) : value;
  return startOfDay(date).getTime() < startOfDay(getCurrentDate()).getTime();
}

export function formatDayLabel(date: Date) {
  return new Intl.DateTimeFormat(DISPLAY_LOCALE, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    timeZone: getCurrentTimeZone()
  }).format(date);
}

export function formatDateTimeLabel(date: Date) {
  return new Intl.DateTimeFormat(DISPLAY_LOCALE, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: getCurrentTimeZone()
  }).format(date).replace(',', '');
}

export function formatMonthLabel(date: Date) {
  return new Intl.DateTimeFormat(DISPLAY_LOCALE, {
    month: 'long',
    year: 'numeric',
    timeZone: getCurrentTimeZone()
  }).format(date);
}
