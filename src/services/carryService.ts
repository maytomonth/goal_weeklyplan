import { getNextWeekPeriodFromStart } from '@/src/core/time/week';
import { CarryActionType, ID } from '@/src/core/types/domain';
import { selectCompletionRate } from '@/src/state/selectors/reviewSelectors';
import { AppStore } from '@/src/state/types';

interface ApplyOptions {
  defaultUndecidedToCarry?: boolean;
}

function existingDecisionExists(state: AppStore, reviewId: ID, fromTaskId: ID): boolean {
  return Object.values(state.carryActions).some(
    (entry) => entry.reviewId === reviewId && entry.fromTaskId === fromTaskId,
  );
}

export function applyCarryActionsAndEnsureNextPlan(
  store: AppStore,
  planId: ID,
  options: ApplyOptions = { defaultUndecidedToCarry: true },
): ID {
  const plan = store.plans[planId];
  if (!plan) {
    throw new Error('Plan not found');
  }
  const sourceGoalId = plan.goalId;
  const nextPeriod = getNextWeekPeriodFromStart(new Date(plan.periodStart));
  const nextStartIso = nextPeriod.start.toISOString();
  const nextEndIso = nextPeriod.end.toISOString();

  if (store.appliedCarryByPlanId[planId]) {
    return store.ensureGoalWeeklyPlan(nextStartIso, nextEndIso, sourceGoalId, planId);
  }

  const nextPlanId = store.ensureGoalWeeklyPlan(nextStartIso, nextEndIso, sourceGoalId, planId);
  const reviewId = store.ensureReview(planId);
  // getState() snapshot passed into service can be stale after set();
  // rely on selector-like API that reads current store instead.
  const nextPlan = store.getWeekPlan(nextStartIso, sourceGoalId);
  const nextGoalId = nextPlan?.goalId ?? sourceGoalId;

  const todos = Object.values(store.tasks)
    .filter((task) => task.planId === planId && task.goalId === sourceGoalId)
    .filter((task) => !task.deletedAt)
    .filter((task) => task.status === 'todo')
    .sort((a, b) => a.order - b.order);

  const draftByTask = store.carryDraftByPlan[planId] ?? {};

  for (const task of todos) {
    if (existingDecisionExists(store, reviewId, task.id)) {
      continue;
    }

    const decision = draftByTask[task.id];
    let action: CarryActionType | undefined = decision?.action;
    if (!action && options.defaultUndecidedToCarry) {
      action = 'carry';
    }

    if (!action) {
      throw new Error(`Carry decision missing for task: ${task.id}`);
    }

    let toTaskIds: ID[] = [];

    if (action === 'carry') {
      const nextTaskId = store.addTask({
        planId: nextPlanId,
        title: task.title,
        goalId: nextGoalId,
        carryFromTaskId: task.id,
      });
      toTaskIds = [nextTaskId];
    }

    if (action === 'drop') {
      store.updateTask(task.id, { status: 'dropped' });
      toTaskIds = [];
    }

    if (action === 'rescope') {
      const title = (decision?.rescopeTitle ?? '').trim();
      if (!title) {
        throw new Error(`Rescope requires title for task: ${task.id}`);
      }

      store.updateTask(task.id, { status: 'dropped' });
      const nextTaskId = store.addTask({
        planId: nextPlanId,
        title,
        goalId: nextGoalId,
        carryFromTaskId: task.id,
      });
      toTaskIds = [nextTaskId];
    }

    if (action === 'split') {
      const splitTitles = (decision?.splitTitles ?? []).map((title) => title.trim()).filter(Boolean);
      if (splitTitles.length === 0) {
        throw new Error(`Split requires at least one child task for task: ${task.id}`);
      }

      store.updateTask(task.id, { status: 'dropped' });
      toTaskIds = splitTitles.map((title) =>
        store.addTask({
          planId: nextPlanId,
          title,
          goalId: nextGoalId,
          carryFromTaskId: task.id,
          splitParentTaskId: task.id,
        }),
      );
    }

    store.createCarryAction({
      reviewId,
      fromTaskId: task.id,
      action,
      toTaskIds,
      note: decision?.note,
    });
  }

  const completionRate = selectCompletionRate(store, planId);
  store.setReviewCompletionRate(planId, completionRate);
  store.markCarryApplied(planId);
  store.clearCarryDraftForPlan(planId);

  return nextPlanId;
}
