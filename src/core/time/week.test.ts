import { describe, expect, it } from 'vitest';
import { formatWeekLabel, getNextWeekPeriodFromStart, getWeekPeriod } from '@/src/core/time/week';

describe('week helpers (KST monday start)', () => {
  it('returns monday 00:00 KST start and next monday end for sunday evening UTC', () => {
    const date = new Date('2026-02-22T14:59:00.000Z'); // KST 2026-02-22 23:59 (Sun)
    const period = getWeekPeriod(date);

    expect(period.start.toISOString()).toBe('2026-02-15T15:00:00.000Z'); // KST Mon 00:00
    expect(period.end.toISOString()).toBe('2026-02-22T15:00:00.000Z'); // next KST Mon 00:00
  });

  it('stays in same week for monday 00:00 KST edge', () => {
    const date = new Date('2026-02-22T15:00:00.000Z'); // KST 2026-02-23 00:00 (Mon)
    const period = getWeekPeriod(date);

    expect(period.start.toISOString()).toBe('2026-02-22T15:00:00.000Z');
    expect(period.end.toISOString()).toBe('2026-03-01T15:00:00.000Z');
    expect(formatWeekLabel(period.start)).toBe('2026.02.23 ~ 2026.03.01');
  });

  it('computes next week from start by exact 7 days', () => {
    const currentStart = new Date('2026-02-22T15:00:00.000Z');
    const next = getNextWeekPeriodFromStart(currentStart);

    expect(next.start.toISOString()).toBe('2026-03-01T15:00:00.000Z');
    expect(next.end.toISOString()).toBe('2026-03-08T15:00:00.000Z');
  });
});
