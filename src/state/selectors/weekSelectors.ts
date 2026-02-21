import { getWeekPeriod } from '@/src/core/time/week';
import { AppStore } from '@/src/state/types';

export function selectCurrentWeekPeriod(state: AppStore): { startIso: string; endIso: string } {
  const selected = state.selectedWeekStartIso ? new Date(state.selectedWeekStartIso) : new Date();
  const period = getWeekPeriod(selected);
  return {
    startIso: period.start.toISOString(),
    endIso: period.end.toISOString(),
  };
}
