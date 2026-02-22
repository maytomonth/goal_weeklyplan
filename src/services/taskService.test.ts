import { describe, expect, it } from 'vitest';
import { getNextWeekPeriodFromStart, getWeekPeriod } from '@/src/core/time/week';
import { assignTaskToGoalWeek, quickAddInboxTask } from '@/src/services/taskService';
import { makeTestStore } from '@/src/services/test-utils/makeTestStore';
import { selectInboxTasks } from '@/src/state/selectors/planSelectors';

const BASE_NOW = new Date('2026-02-22T15:00:00.000Z'); // KST 2026-02-23 월요일 00:00

function weekIso(date: Date): string {
  return getWeekPeriod(date).start.toISOString();
}

describe('taskService inbox assign flow', () => {
  it('quickAddInboxTask creates inbox task in current week inbox plan', () => {
    const store = makeTestStore();

    const currentWeekStart = weekIso(BASE_NOW);
    const taskId = quickAddInboxTask(store, '인박스 할 일', currentWeekStart);

    const task = store.tasks[taskId];
    const inboxGoalId = store.ensureInboxGoal();
    const nextWeek = getNextWeekPeriodFromStart(new Date(currentWeekStart));
    const inboxPlan = store.getWeekPlan(currentWeekStart, inboxGoalId);

    expect(task).toBeDefined();
    expect(task.goalId).toBe(inboxGoalId);
    expect(inboxPlan).toBeTruthy();
    expect(inboxPlan?.periodEnd).toBe(nextWeek.end.toISOString());
    expect(selectInboxTasks(store).map((entry) => entry.id)).toContain(taskId);
  });

  it('assignTaskToGoalWeek reassigns task and ensures destination plan', () => {
    const store = makeTestStore();
    const inboxGoalId = store.ensureInboxGoal();
    const goalId = store.createGoal({ title: '운동 목표' });

    const thisWeekStart = weekIso(BASE_NOW);
    const nextWeekStart = weekIso(new Date('2026-03-01T15:00:00.000Z'));

    const inboxTaskId = quickAddInboxTask(store, '인박스에서 이동할 항목', thisWeekStart);
    const destinationPlanId = assignTaskToGoalWeek(store, inboxTaskId, goalId, nextWeekStart);

    const moved = store.tasks[inboxTaskId];
    const destinationPlan = store.plans[destinationPlanId];

    expect(destinationPlan).toBeDefined();
    expect(destinationPlan.goalId).toBe(goalId);
    expect(destinationPlan.periodStart).toBe(nextWeekStart);

    expect(moved.planId).toBe(destinationPlanId);
    expect(moved.goalId).toBe(goalId);

    // 인박스 리스트에서 제거
    const inboxTaskIds = selectInboxTasks(store).map((entry) => entry.id);
    expect(inboxTaskIds).not.toContain(inboxTaskId);

    // 인박스 goal 자체는 유지
    expect(store.goals[inboxGoalId]).toBeDefined();
  });

  it('reuses existing destination plan for same weekStart + goalId (weekly unique)', () => {
    const store = makeTestStore();
    const goalId = store.createGoal({ title: '독서 목표' });

    const weekStart = weekIso(BASE_NOW);
    const weekEnd = getNextWeekPeriodFromStart(new Date(weekStart)).end.toISOString();
    const existingPlanId = store.ensureGoalWeeklyPlan(weekStart, weekEnd, goalId);

    const taskId = quickAddInboxTask(store, '중복 생성 방지 확인', weekStart);
    const destinationPlanId = assignTaskToGoalWeek(store, taskId, goalId, weekStart);

    expect(destinationPlanId).toBe(existingPlanId);
    expect(store.tasks[taskId].planId).toBe(existingPlanId);
  });
});
