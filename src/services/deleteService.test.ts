import { describe, expect, it } from 'vitest';
import { Plan, Review, Task } from '@/src/core/types/domain';
import { hardDeleteGoal } from '@/src/services/goalService';
import { deleteWeeklyPlan } from '@/src/services/planService';
import { hardDeleteTask, softDeleteTask, undoSoftDeleteTask } from '@/src/services/taskService';
import { makeTestStore } from '@/src/services/test-utils/makeTestStore';
import { selectDeletedTasks, selectTasksByPlan } from '@/src/state/selectors/planSelectors';

function makeSeed() {
  const planA: Plan = {
    id: 'plan_a',
    type: 'week',
    periodStart: '2026-03-01T15:00:00.000Z',
    periodEnd: '2026-03-08T15:00:00.000Z',
    goalId: 'goal_a',
    note: '',
    top3TaskIds: ['task_a1'],
    createdAt: '2026-03-01T15:00:00.000Z',
    updatedAt: '2026-03-01T15:00:00.000Z',
  };

  const planB: Plan = {
    id: 'plan_b',
    type: 'week',
    periodStart: '2026-03-08T15:00:00.000Z',
    periodEnd: '2026-03-15T15:00:00.000Z',
    goalId: 'goal_b',
    note: '',
    top3TaskIds: [],
    createdAt: '2026-03-08T15:00:00.000Z',
    updatedAt: '2026-03-08T15:00:00.000Z',
  };

  const taskA1: Task = {
    id: 'task_a1',
    planId: 'plan_a',
    goalId: 'goal_a',
    title: 'Task A1',
    status: 'todo',
    order: 0,
    createdAt: planA.createdAt,
    updatedAt: planA.updatedAt,
    deletedAt: null,
  };

  const taskA2: Task = {
    id: 'task_a2',
    planId: 'plan_a',
    goalId: 'goal_a',
    title: 'Task A2',
    status: 'todo',
    order: 1,
    createdAt: planA.createdAt,
    updatedAt: planA.updatedAt,
    deletedAt: null,
  };

  const taskB1: Task = {
    id: 'task_b1',
    planId: 'plan_b',
    goalId: 'goal_b',
    title: 'Task B1',
    status: 'todo',
    order: 0,
    createdAt: planB.createdAt,
    updatedAt: planB.updatedAt,
    deletedAt: null,
  };

  const reviewA: Review = {
    id: 'review_a',
    planId: 'plan_a',
    summaryNote: '',
    completionRate: 0,
    createdAt: planA.createdAt,
    updatedAt: planA.updatedAt,
  };

  return { planA, planB, taskA1, taskA2, taskB1, reviewA };
}

describe('deletion services', () => {
  it('soft delete hides task from default selectors and removes Top3', () => {
    const { planA, taskA1 } = makeSeed();
    const store = makeTestStore({ plans: [planA], tasks: [taskA1] });

    softDeleteTask(store, taskA1.id);

    expect(selectTasksByPlan(store, planA.id)).toHaveLength(0);
    expect(selectDeletedTasks(store, planA.id).map((task) => task.id)).toEqual([taskA1.id]);
    expect(store.plans[planA.id].top3TaskIds).toEqual([]);
  });

  it('undo soft delete restores deleted task visibility', () => {
    const { planA, taskA1 } = makeSeed();
    const store = makeTestStore({ plans: [planA], tasks: [taskA1] });

    softDeleteTask(store, taskA1.id);
    undoSoftDeleteTask(store, taskA1.id);

    expect(selectTasksByPlan(store, planA.id)).toHaveLength(1);
    expect(selectDeletedTasks(store, planA.id)).toHaveLength(0);
  });

  it('hard delete task removes entity and carry references', () => {
    const { planA, taskA1, taskA2 } = makeSeed();
    const store = makeTestStore({ plans: [planA], tasks: [taskA1, taskA2] });

    const reviewId = store.ensureReview(planA.id);
    store.createCarryAction({
      reviewId,
      fromTaskId: taskA1.id,
      action: 'carry',
      toTaskIds: [taskA2.id],
    });

    hardDeleteTask(store, taskA1.id);

    expect(store.tasks[taskA1.id]).toBeUndefined();
    expect(Object.values(store.carryActions)).toHaveLength(0);
    expect(store.plans[planA.id].top3TaskIds).toEqual([]);
  });

  it('deleteWeeklyPlan cascades tasks, review and carry actions', () => {
    const { planA, planB, taskA1, taskA2, taskB1 } = makeSeed();
    const store = makeTestStore({ plans: [planA, planB], tasks: [taskA1, taskA2, taskB1] });

    const reviewId = store.ensureReview(planA.id);
    store.createCarryAction({
      reviewId,
      fromTaskId: taskA1.id,
      action: 'split',
      toTaskIds: [taskA2.id],
    });

    deleteWeeklyPlan(store, planA.id);

    expect(store.plans[planA.id]).toBeUndefined();
    expect(store.tasks[taskA1.id]).toBeUndefined();
    expect(store.tasks[taskA2.id]).toBeUndefined();
    expect(store.tasks[taskB1.id]).toBeDefined();
    expect(Object.values(store.reviews).some((review) => review.planId === planA.id)).toBe(false);
    expect(Object.values(store.carryActions)).toHaveLength(0);
  });

  it('hardDeleteGoal cascades all linked plans and descendants', () => {
    const { planA, planB, taskA1, taskB1 } = makeSeed();
    const store = makeTestStore({ plans: [planA, planB], tasks: [taskA1, taskB1] });

    store.goals.goal_a = {
      id: 'goal_a',
      title: 'A',
      dueType: 'none',
      status: 'active',
      createdAt: planA.createdAt,
      updatedAt: planA.updatedAt,
    };
    store.goals.goal_b = {
      id: 'goal_b',
      title: 'B',
      dueType: 'none',
      status: 'active',
      createdAt: planB.createdAt,
      updatedAt: planB.updatedAt,
    };

    hardDeleteGoal(store, 'goal_a');

    expect(store.goals.goal_a).toBeUndefined();
    expect(store.plans.plan_a).toBeUndefined();
    expect(store.tasks.task_a1).toBeUndefined();
    expect(store.goals.goal_b).toBeDefined();
    expect(store.plans.plan_b).toBeDefined();
    expect(store.tasks.task_b1).toBeDefined();
  });
});
