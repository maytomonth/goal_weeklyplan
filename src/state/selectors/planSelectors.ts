import { AppStore } from '@/src/state/types';

function isSystemInboxGoal(state: AppStore, goalId: string): boolean {
  return state.goals[goalId]?.systemType === 'inbox';
}

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
    .filter((plan) => !isSystemInboxGoal(state, plan.goalId))
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export function selectWeeklyPlansForWeek(
  state: AppStore,
  periodStartIso: string,
  options?: { includeSystemInbox?: boolean },
) {
  if (options?.includeSystemInbox) {
    return Object.values(state.plans)
      .filter((plan) => plan.type === 'week' && plan.periodStart === periodStartIso)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }
  return selectPlansByPeriod(state, periodStartIso);
}

export function selectTasksByPlan(state: AppStore, planId: string) {
  return Object.values(state.tasks)
    .filter((task) => task.planId === planId && !task.deletedAt)
    .sort((a, b) => a.order - b.order);
}

export function selectActiveTasksForPlan(state: AppStore, planId: string) {
  return selectTasksByPlan(state, planId).filter((task) => task.status !== 'dropped');
}

export function selectDeletedTasks(state: AppStore, planId?: string) {
  return Object.values(state.tasks)
    .filter((task) => (planId ? task.planId === planId : true))
    .filter((task) => Boolean(task.deletedAt))
    .sort((a, b) => (b.deletedAt ?? '').localeCompare(a.deletedAt ?? ''));
}

export function selectIncompleteTasks(state: AppStore, planId: string) {
  return selectTasksByPlan(state, planId).filter((task) => task.status === 'todo');
}

export function selectInboxTasks(state: AppStore) {
  const inboxGoal = Object.values(state.goals).find((goal) => goal.systemType === 'inbox');
  if (!inboxGoal) {
    return [];
  }

  return Object.values(state.tasks)
    .filter((task) => task.goalId === inboxGoal.id)
    .filter((task) => !task.deletedAt)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}
