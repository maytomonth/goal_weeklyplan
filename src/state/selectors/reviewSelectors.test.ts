import { describe, expect, it } from 'vitest';
import { Plan, Task } from '@/src/core/types/domain';
import { makeTestStore } from '@/src/services/test-utils/makeTestStore';
import { selectCompletionRate } from '@/src/state/selectors/reviewSelectors';

function makePlan(): Plan {
  return {
    id: 'plan_rate',
    type: 'week',
    periodStart: '2026-02-22T15:00:00.000Z',
    periodEnd: '2026-03-01T15:00:00.000Z',
    goalId: 'goal_a',
    note: '',
    top3TaskIds: [],
    createdAt: '2026-02-22T15:00:00.000Z',
    updatedAt: '2026-02-22T15:00:00.000Z',
  };
}

function makeTask(id: string, status: Task['status']): Task {
  return {
    id,
    planId: 'plan_rate',
    goalId: 'goal_a',
    title: id,
    status,
    order: 0,
    createdAt: '2026-02-22T15:00:00.000Z',
    updatedAt: '2026-02-22T15:00:00.000Z',
    deletedAt: null,
  };
}

describe('selectCompletionRate', () => {
  it('returns 0 when there are no tasks', () => {
    const store = makeTestStore({ plans: [makePlan()], tasks: [] });
    expect(selectCompletionRate(store, 'plan_rate')).toBe(0);
  });

  it('excludes dropped tasks from denominator', () => {
    const store = makeTestStore({
      plans: [makePlan()],
      tasks: [makeTask('done_1', 'done'), makeTask('todo_1', 'todo'), makeTask('drop_1', 'dropped')],
    });

    // dropped 제외 => done 1 / (done 1 + todo 1) = 0.5
    expect(selectCompletionRate(store, 'plan_rate')).toBe(0.5);
  });

  it('returns 0 when all tasks are dropped', () => {
    const store = makeTestStore({ plans: [makePlan()], tasks: [makeTask('drop_1', 'dropped')] });
    expect(selectCompletionRate(store, 'plan_rate')).toBe(0);
  });

  it('calculates done/todo ratio accurately', () => {
    const store = makeTestStore({
      plans: [makePlan()],
      tasks: [
        makeTask('done_1', 'done'),
        makeTask('done_2', 'done'),
        makeTask('todo_1', 'todo'),
        makeTask('todo_2', 'todo'),
      ],
    });

    expect(selectCompletionRate(store, 'plan_rate')).toBe(0.5);
  });
});
