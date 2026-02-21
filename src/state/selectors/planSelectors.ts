import { AppStore } from '@/src/state/types';

export function selectPlanByPeriod(state: AppStore, periodStartIso: string) {
  return Object.values(state.plans).find((plan) => plan.type === 'week' && plan.periodStart === periodStartIso) ?? null;
}

export function selectTasksByPlan(state: AppStore, planId: string) {
  return Object.values(state.tasks)
    .filter((task) => task.planId === planId)
    .sort((a, b) => a.order - b.order);
}

export function selectIncompleteTasks(state: AppStore, planId: string) {
  return selectTasksByPlan(state, planId).filter((task) => task.status === 'todo');
}
