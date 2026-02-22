import { ID } from '@/src/core/types/domain';
import { getNextWeekPeriodFromStart, getWeekPeriod } from '@/src/core/time/week';
import { AppStore } from '@/src/state/types';

function safeWeekStart(weekStartIso?: string): Date {
  if (!weekStartIso) {
    return getWeekPeriod(new Date()).start;
  }

  const parsed = new Date(weekStartIso);
  if (Number.isNaN(parsed.getTime())) {
    return getWeekPeriod(new Date()).start;
  }
  return getWeekPeriod(parsed).start;
}

export function quickAddInboxTask(store: AppStore, title: string, weekStartIso?: string): ID {
  const inboxGoalId = store.ensureInboxGoal();
  const weekStart = safeWeekStart(weekStartIso);
  const weekPeriod = getNextWeekPeriodFromStart(weekStart);
  const planId = store.ensureGoalWeeklyPlan(
    weekStart.toISOString(),
    weekPeriod.end.toISOString(),
    inboxGoalId,
  );
  return store.addTask({
    planId,
    title,
    goalId: inboxGoalId,
  });
}

export function assignTaskToGoalWeek(
  store: AppStore,
  taskId: ID,
  goalId: ID,
  weekStartIso?: string,
): ID {
  const weekStart = safeWeekStart(weekStartIso);
  const weekPeriod = getNextWeekPeriodFromStart(weekStart);
  const destinationPlanId = store.ensureGoalWeeklyPlan(
    weekStart.toISOString(),
    weekPeriod.end.toISOString(),
    goalId,
  );
  store.reassignTask(taskId, destinationPlanId, goalId);
  return destinationPlanId;
}

export function softDeleteTask(store: AppStore, taskId: ID): void {
  store.softDeleteTask(taskId);
}

export function undoSoftDeleteTask(store: AppStore, taskId: ID): void {
  store.undoSoftDeleteTask(taskId);
}

export function hardDeleteTask(store: AppStore, taskId: ID): void {
  store.hardDeleteTask(taskId);
}
