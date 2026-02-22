import { describe, expect, it } from 'vitest';
import { Goal, Plan, Task } from '@/src/core/types/domain';
import { getNextWeekPeriodFromStart } from '@/src/core/time/week';
import { makeTestStore } from '@/src/services/test-utils/makeTestStore';
import { selectInboxTasks, selectWeeklyPlansForWeek } from '@/src/state/selectors/planSelectors';

const START = '2026-02-22T15:00:00.000Z';
const END = getNextWeekPeriodFromStart(new Date(START)).end.toISOString();

function makePlan(id: string, goalId: string, createdAt: string): Plan {
  return {
    id,
    type: 'week',
    periodStart: START,
    periodEnd: END,
    goalId,
    note: '',
    top3TaskIds: [],
    createdAt,
    updatedAt: createdAt,
  };
}

function makeTask(id: string, planId: string, goalId: string, deletedAt: string | null = null): Task {
  return {
    id,
    planId,
    goalId,
    title: id,
    status: 'todo',
    order: 0,
    createdAt: START,
    updatedAt: START,
    deletedAt,
  };
}

describe('plan selectors - inbox filtering', () => {
  it('excludes inbox goal plans by default in weekly hub lists', () => {
    const store = makeTestStore({
      plans: [
        makePlan('plan_normal', 'goal_a', '2026-02-22T15:00:01.000Z'),
        makePlan('plan_inbox', 'system_inbox_goal', '2026-02-22T15:00:02.000Z'),
      ],
    });

    const inboxGoal: Goal = {
      id: 'system_inbox_goal',
      title: 'Inbox',
      dueType: 'none',
      status: 'active',
      systemType: 'inbox',
      createdAt: START,
      updatedAt: START,
    };
    const normalGoal: Goal = {
      id: 'goal_a',
      title: '일반 목표',
      dueType: 'none',
      status: 'active',
      createdAt: START,
      updatedAt: START,
    };
    store.goals[inboxGoal.id] = inboxGoal;
    store.goals[normalGoal.id] = normalGoal;

    const defaultList = selectWeeklyPlansForWeek(store, START);
    const includedList = selectWeeklyPlansForWeek(store, START, { includeSystemInbox: true });

    expect(defaultList.map((plan) => plan.id)).toEqual(['plan_normal']);
    expect(includedList.map((plan) => plan.id)).toEqual(['plan_normal', 'plan_inbox']);
  });

  it('selectInboxTasks returns only non-deleted inbox goal tasks', () => {
    const store = makeTestStore({
      plans: [makePlan('plan_inbox', 'system_inbox_goal', START), makePlan('plan_goal', 'goal_a', START)],
      tasks: [
        makeTask('task_inbox_live', 'plan_inbox', 'system_inbox_goal'),
        makeTask('task_inbox_deleted', 'plan_inbox', 'system_inbox_goal', '2026-02-23T00:00:00.000Z'),
        makeTask('task_goal', 'plan_goal', 'goal_a'),
      ],
    });

    store.goals.system_inbox_goal = {
      id: 'system_inbox_goal',
      title: 'Inbox',
      dueType: 'none',
      status: 'active',
      systemType: 'inbox',
      createdAt: START,
      updatedAt: START,
    };
    store.goals.goal_a = {
      id: 'goal_a',
      title: '일반 목표',
      dueType: 'none',
      status: 'active',
      createdAt: START,
      updatedAt: START,
    };

    expect(selectInboxTasks(store).map((task) => task.id)).toEqual(['task_inbox_live']);
  });
});
