import type { StateCreator } from 'zustand';
import { nowIso } from '@/src/core/time/week';
import { createId } from '@/src/state/helpers';
import { AppStore, GoalsSlice } from '@/src/state/types';

export const INBOX_GOAL_TITLE = 'Inbox';

export const createGoalsSlice: StateCreator<AppStore, [], [], GoalsSlice> = (set, get) => ({
  goals: {},
  ensureInboxGoal: () => {
    const existing = Object.values(get().goals).find(
      (goal) => goal.title === INBOX_GOAL_TITLE && goal.status === 'active',
    );
    if (existing) {
      return existing.id;
    }

    const id = createId();
    const timestamp = nowIso();
    set((state) => ({
      goals: {
        ...state.goals,
        [id]: {
          id,
          title: INBOX_GOAL_TITLE,
          description: 'Legacy and unlinked tasks',
          dueType: 'none',
          status: 'active',
          createdAt: timestamp,
          updatedAt: timestamp,
        },
      },
    }));

    return id;
  },
  createGoal: ({ title, description, dueType = 'none', dueDate }) => {
    const id = createId();
    const timestamp = nowIso();

    set((state) => ({
      goals: {
        ...state.goals,
        [id]: {
          id,
          title: title.trim(),
          description,
          dueType,
          dueDate,
          status: 'active',
          createdAt: timestamp,
          updatedAt: timestamp,
        },
      },
    }));

    return id;
  },
  editGoal: (goalId, patch) => {
    set((state) => {
      const goal = state.goals[goalId];
      if (!goal) {
        return state;
      }

      return {
        goals: {
          ...state.goals,
          [goalId]: {
            ...goal,
            ...patch,
            updatedAt: nowIso(),
          },
        },
      };
    });
  },
  archiveGoal: (goalId) => {
    set((state) => {
      const goal = state.goals[goalId];
      if (!goal) {
        return state;
      }

      return {
        goals: {
          ...state.goals,
          [goalId]: {
            ...goal,
            status: 'archived',
            updatedAt: nowIso(),
          },
        },
      };
    });
  },
  hardDeleteGoal: (goalId) => {
    const planIds = Object.values(get().plans)
      .filter((plan) => plan.goalId === goalId)
      .map((plan) => plan.id);

    planIds.forEach((planId) => get().deleteWeeklyPlan(planId));

    set((state) => {
      if (!state.goals[goalId]) {
        return state;
      }
      const nextGoals = { ...state.goals };
      delete nextGoals[goalId];

      const nextRecentGoalIds = state.recentGoalIds.filter((id) => id !== goalId);
      return {
        goals: nextGoals,
        recentGoalIds: nextRecentGoalIds,
      };
    });
  },
});
