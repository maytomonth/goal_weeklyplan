import { AppStore } from '@/src/state/types';

export function selectPlanByPeriod(state: AppStore, periodStartIso: string) {
  return Object.values(state.plans).find((plan) => plan.type === 'week' && plan.periodStart === periodStartIso) ?? null;
}

export function selectPlanByPeriodAndGoal(state: AppStore, periodStartIso: string, goalId: string) {
  return (
    Object.values(state.plans).find(
      (plan) => plan.type === 'week' && plan.periodStart === periodStartIso && plan.goalId === goalId,
    ) ?? null
  );
}

export function selectPlansByPeriod(state: AppStore, periodStartIso: string) {
  return Object.values(state.plans)
    .filter((plan) => plan.type === 'week' && plan.periodStart === periodStartIso)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export function selectWeeklyPlansForWeek(state: AppStore, periodStartIso: string) {
  return selectPlansByPeriod(state, periodStartIso);
}

export function selectTasksByPlan(state: AppStore, planId: string) {
  return Object.values(state.tasks)
    .filter((task) => task.planId === planId)
    .sort((a, b) => a.order - b.order);
}

export function selectIncompleteTasks(state: AppStore, planId: string) {
  return selectTasksByPlan(state, planId).filter((task) => task.status === 'todo');
}
