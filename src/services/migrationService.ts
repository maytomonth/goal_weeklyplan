import { nowIso } from '@/src/core/time/week';
import { ID } from '@/src/core/types/domain';
import { AppStore } from '@/src/state/types';

export const MVP2_SCHEMA_VERSION = 2;

function resolveTaskGoalId(store: AppStore, task: AppStore['tasks'][string], fallbackGoalId: ID): ID {
  if (task.goalId) return task.goalId;
  return fallbackGoalId;
}

export function runMvp2Migration(store: AppStore) {
  if (store.schemaVersion >= MVP2_SCHEMA_VERSION) {
    return;
  }

  const inboxGoalId = store.ensureInboxGoal();
  const plans = Object.values(store.plans);

  plans.forEach((plan) => {
    const periodStart = plan.periodStart;
    const periodEnd = plan.periodEnd;
    const baseGoalId = plan.goalId ?? inboxGoalId;

    const planTasks = Object.values(store.tasks).filter((task) => task.planId === plan.id);
    const groupedByGoal = new Map<ID, typeof planTasks>();

    for (const task of planTasks) {
      // PRD v2: goalId 없는 task는 Inbox goal로 강제 이관
      const resolvedGoalId = resolveTaskGoalId(store, task, inboxGoalId);
      const bucket = groupedByGoal.get(resolvedGoalId) ?? [];
      bucket.push(task);
      groupedByGoal.set(resolvedGoalId, bucket);
    }

    if (groupedByGoal.size === 0) {
      groupedByGoal.set(baseGoalId, []);
    }

    const orderedGoalIds = [...groupedByGoal.keys()];
    const primaryGoalId = orderedGoalIds[0] ?? inboxGoalId;

    if (plan.goalId !== primaryGoalId) {
      store.plans[plan.id] = {
        ...plan,
        goalId: primaryGoalId,
        updatedAt: nowIso(),
      };
    }

    const primaryTasks = groupedByGoal.get(primaryGoalId) ?? [];
    primaryTasks.forEach((task) => {
      if (task.goalId !== primaryGoalId) {
        store.updateTask(task.id, { goalId: primaryGoalId });
      }
    });

    const nonPrimaryGoalIds = orderedGoalIds.filter((goalId) => goalId !== primaryGoalId);
    for (const goalId of nonPrimaryGoalIds) {
      const nextPlanId = store.ensureWeekPlan(periodStart, periodEnd, goalId, plan.id);
      const bucket = groupedByGoal.get(goalId) ?? [];
      bucket.forEach((task) => {
        store.tasks[task.id] = {
          ...task,
          planId: nextPlanId,
          goalId,
          updatedAt: nowIso(),
        };
      });
    }
  });

  for (const task of Object.values(store.tasks)) {
    const plan = store.plans[task.planId];
    if (!plan) {
      continue;
    }

    if (task.goalId !== plan.goalId) {
      store.tasks[task.id] = {
        ...task,
        goalId: plan.goalId,
        updatedAt: nowIso(),
      };
    }
  }

  store.setSchemaVersion(MVP2_SCHEMA_VERSION);
}
