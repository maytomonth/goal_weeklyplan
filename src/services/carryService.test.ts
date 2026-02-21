import { describe, expect, it } from 'vitest';
import { applyCarryActionsAndEnsureNextPlan } from '@/src/services/carryService';
import { Plan, Task } from '@/src/core/types/domain';
import { makeTestStore } from '@/src/services/test-utils/makeTestStore';

function makeWeeklySeed(): { plan: Plan; tasks: Task[] } {
  const plan: Plan = {
    id: 'plan_current',
    type: 'week',
    periodStart: '2026-02-22T15:00:00.000Z',
    periodEnd: '2026-03-01T15:00:00.000Z',
    goalId: 'goal_a',
    note: '',
    top3TaskIds: [],
    createdAt: '2026-02-22T15:00:00.000Z',
    updatedAt: '2026-02-22T15:00:00.000Z',
  };

  const tasks: Task[] = [
    {
      id: 't_carry',
      planId: plan.id,
      goalId: 'goal_a',
      title: 'carry me',
      status: 'todo',
      order: 0,
      createdAt: plan.createdAt,
      updatedAt: plan.updatedAt,
    },
    {
      id: 't_drop',
      planId: plan.id,
      goalId: 'goal_a',
      title: 'drop me',
      status: 'todo',
      order: 1,
      createdAt: plan.createdAt,
      updatedAt: plan.updatedAt,
    },
    {
      id: 't_rescope',
      planId: plan.id,
      goalId: 'goal_a',
      title: 'big scope',
      status: 'todo',
      order: 2,
      createdAt: plan.createdAt,
      updatedAt: plan.updatedAt,
    },
    {
      id: 't_split',
      planId: plan.id,
      goalId: 'goal_a',
      title: 'split scope',
      status: 'todo',
      order: 3,
      createdAt: plan.createdAt,
      updatedAt: plan.updatedAt,
    },
    {
      id: 't_done',
      planId: plan.id,
      goalId: 'goal_a',
      title: 'already done',
      status: 'done',
      order: 4,
      createdAt: plan.createdAt,
      updatedAt: plan.updatedAt,
    },
  ];

  return { plan, tasks };
}

describe('applyCarryActionsAndEnsureNextPlan', () => {
  it('applies carry/drop/rescope/split and updates review completion', () => {
    const { plan, tasks } = makeWeeklySeed();
    const store = makeTestStore({ plans: [plan], tasks });

    store.setCarryDecision(plan.id, 't_carry', 'carry');
    store.setCarryDecision(plan.id, 't_drop', 'drop');
    store.setCarryDecision(plan.id, 't_rescope', 'rescope');
    store.setRescopeTitle(plan.id, 't_rescope', 'small scope');
    store.setCarryDecision(plan.id, 't_split', 'split');
    store.setSplitChildren(plan.id, 't_split', ['part A', 'part B']);

    const nextPlanId = applyCarryActionsAndEnsureNextPlan(store, plan.id);

    expect(nextPlanId).not.toBe(plan.id);
    const nextTasks = Object.values(store.tasks).filter((task) => task.planId === nextPlanId);

    expect(nextTasks.map((task) => task.title)).toEqual(
      expect.arrayContaining(['carry me', 'small scope', 'part A', 'part B']),
    );

    expect(store.tasks.t_drop.status).toBe('dropped');
    expect(store.tasks.t_rescope.status).toBe('dropped');
    expect(store.tasks.t_split.status).toBe('dropped');

    const review = Object.values(store.reviews).find((entry) => entry.planId === plan.id);
    expect(review).toBeTruthy();
    expect(review?.completionRate).toBe(0.5); // dropped 제외시 done 1 / (done 1 + todo(carry) 1)

    const actions = Object.values(store.carryActions);
    expect(actions).toHaveLength(4);
    expect(store.appliedCarryByPlanId[plan.id]).toBe(true);
    expect(store.carryDraftByPlan[plan.id]).toBeUndefined();
  });

  it('defaults undecided todo tasks to carry when option enabled', () => {
    const { plan, tasks } = makeWeeklySeed();
    const store = makeTestStore({ plans: [plan], tasks: [tasks[0]] });

    const nextPlanId = applyCarryActionsAndEnsureNextPlan(store, plan.id, {
      defaultUndecidedToCarry: true,
    });

    const nextTasks = Object.values(store.tasks).filter((task) => task.planId === nextPlanId);
    expect(nextTasks).toHaveLength(1);
    expect(nextTasks[0].carryFromTaskId).toBe('t_carry');
  });

  it('throws if undecided todo exists and defaultUndecidedToCarry is false', () => {
    const { plan, tasks } = makeWeeklySeed();
    const store = makeTestStore({ plans: [plan], tasks: [tasks[0]] });

    expect(() =>
      applyCarryActionsAndEnsureNextPlan(store, plan.id, {
        defaultUndecidedToCarry: false,
      }),
    ).toThrowError('Carry decision missing for task: t_carry');
  });

  it('is idempotent after applied mark and does not duplicate carry tasks', () => {
    const { plan, tasks } = makeWeeklySeed();
    const store = makeTestStore({ plans: [plan], tasks: [tasks[0]] });

    store.setCarryDecision(plan.id, 't_carry', 'carry');
    const firstNextPlanId = applyCarryActionsAndEnsureNextPlan(store, plan.id);

    const firstCount = Object.values(store.tasks).filter((task) => task.planId === firstNextPlanId).length;
    const secondNextPlanId = applyCarryActionsAndEnsureNextPlan(store, plan.id);
    const secondCount = Object.values(store.tasks).filter((task) => task.planId === secondNextPlanId).length;

    expect(secondNextPlanId).toBe(firstNextPlanId);
    expect(firstCount).toBe(1);
    expect(secondCount).toBe(1);
  });

  it('validates rescope/split input before apply', () => {
    const { plan, tasks } = makeWeeklySeed();

    const rescopeStore = makeTestStore({ plans: [plan], tasks: [tasks[2]] });
    rescopeStore.setCarryDecision(plan.id, 't_rescope', 'rescope');
    expect(() => applyCarryActionsAndEnsureNextPlan(rescopeStore, plan.id)).toThrowError(
      'Rescope requires title for task: t_rescope',
    );

    const splitStore = makeTestStore({ plans: [plan], tasks: [tasks[3]] });
    splitStore.setCarryDecision(plan.id, 't_split', 'split');
    splitStore.setSplitChildren(plan.id, 't_split', ['   ', '']);
    expect(() => applyCarryActionsAndEnsureNextPlan(splitStore, plan.id)).toThrowError(
      'Split requires at least one child task for task: t_split',
    );
  });

  it('creates/uses next weekly plan only for the same goalId', () => {
    const { plan, tasks } = makeWeeklySeed();
    const nextPeriodStart = '2026-03-01T15:00:00.000Z';
    const nextPeriodEnd = '2026-03-08T15:00:00.000Z';

    const otherGoalNextPlan: Plan = {
      id: 'plan_other_goal_next',
      type: 'week',
      periodStart: nextPeriodStart,
      periodEnd: nextPeriodEnd,
      goalId: 'goal_b',
      note: '',
      top3TaskIds: [],
      createdAt: nextPeriodStart,
      updatedAt: nextPeriodStart,
    };

    const store = makeTestStore({ plans: [plan, otherGoalNextPlan], tasks: [tasks[0]] });
    store.setCarryDecision(plan.id, 't_carry', 'carry');

    const nextPlanId = applyCarryActionsAndEnsureNextPlan(store, plan.id);
    expect(nextPlanId).not.toBe(otherGoalNextPlan.id);

    const nextPlan = store.plans[nextPlanId];
    expect(nextPlan.goalId).toBe(plan.goalId);

    const carriedTask = Object.values(store.tasks).find((task) => task.planId === nextPlanId);
    expect(carriedTask?.goalId).toBe(plan.goalId);
  });
});
