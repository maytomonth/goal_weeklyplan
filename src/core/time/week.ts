const DAY_MS = 24 * 60 * 60 * 1000;
const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

export interface WeekPeriod {
  start: Date;
  end: Date;
}

function toKstShifted(date: Date): Date {
  return new Date(date.getTime() + KST_OFFSET_MS);
}

function fromKstShifted(shifted: Date): Date {
  return new Date(shifted.getTime() - KST_OFFSET_MS);
}

function kstDateParts(date: Date): { year: number; month: number; day: number } {
  const shifted = toKstShifted(date);
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth(),
    day: shifted.getUTCDate(),
  };
}

export function getWeekPeriod(date: Date): WeekPeriod {
  const shifted = toKstShifted(date);
  const dayOfWeek = shifted.getUTCDay();
  const daysFromMonday = (dayOfWeek + 6) % 7;

  const midnightShiftedMs = Date.UTC(
    shifted.getUTCFullYear(),
    shifted.getUTCMonth(),
    shifted.getUTCDate(),
    0,
    0,
    0,
    0,
  );

  const startShiftedMs = midnightShiftedMs - daysFromMonday * DAY_MS;
  const endShiftedMs = startShiftedMs + 7 * DAY_MS;

  return {
    start: fromKstShifted(new Date(startShiftedMs)),
    end: fromKstShifted(new Date(endShiftedMs)),
  };
}

export function getNextWeekPeriodFromStart(periodStart: Date): WeekPeriod {
  const nextStart = new Date(periodStart.getTime() + 7 * DAY_MS);
  const nextEnd = new Date(nextStart.getTime() + 7 * DAY_MS);
  return { start: nextStart, end: nextEnd };
}

export function formatWeekLabel(periodStart: Date): string {
  const startParts = kstDateParts(periodStart);
  const endInclusive = new Date(periodStart.getTime() + 6 * DAY_MS);
  const endParts = kstDateParts(endInclusive);

  const left = `${startParts.year}.${String(startParts.month + 1).padStart(2, '0')}.${String(startParts.day).padStart(2, '0')}`;
  const right = `${endParts.year}.${String(endParts.month + 1).padStart(2, '0')}.${String(endParts.day).padStart(2, '0')}`;
  return `${left} ~ ${right}`;
}

export function toIso(date: Date): string {
  return date.toISOString();
}

export function nowIso(): string {
  return new Date().toISOString();
}
