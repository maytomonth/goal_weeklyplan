import type { StateCreator } from 'zustand';
import { nowIso } from '@/src/core/time/week';
import { createId } from '@/src/state/helpers';
import { AppStore, GoalsSlice } from '@/src/state/types';

export const INBOX_GOAL_TITLE = 'Inbox';
export const INBOX_GOAL_ID = 'system_inbox_goal';

export const createGoalsSlice: StateCreator<AppStore, [], [], GoalsSlice> = (set, get) => ({
  goals: {},
  ensureInboxGoal: () => {
    const existingById = get().goals[INBOX_GOAL_ID];
    if (existingById) {
      if (existingById.systemType === 'inbox') {
        return existingById.id;
      }

      set((state) => ({
        goals: {
          ...state.goals,
          [existingById.id]: {
            ...existingById,
            title: INBOX_GOAL_TITLE,
            status: 'active',
            systemType: 'inbox',
            updatedAt: nowIso(),
          },
        },
      }));
      return existingById.id;
    }

    const existing = Object.values(get().goals).find(
      (goal) => goal.systemType === 'inbox' || goal.title === INBOX_GOAL_TITLE,
    );
    if (existing) {
      if (existing.systemType !== 'inbox') {
        set((state) => ({
          goals: {
            ...state.goals,
            [existing.id]: {
              ...existing,
              status: 'active',
              systemType: 'inbox',
              updatedAt: nowIso(),
            },
          },
        }));
      }
      return existing.id;
    }

    const timestamp = nowIso();
    set((state) => ({
      goals: {
        ...state.goals,
        [INBOX_GOAL_ID]: {
          id: INBOX_GOAL_ID,
          title: INBOX_GOAL_TITLE,
          description: 'Unassigned staging tasks',
          dueType: 'none',
          status: 'active',
          systemType: 'inbox',
          createdAt: timestamp,
          updatedAt: timestamp,
        },
      },
    }));

    return INBOX_GOAL_ID;
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
          systemType: undefined,
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
      if (!goal || goal.systemType === 'inbox') {
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
    if (goalId === INBOX_GOAL_ID) {
      return;
    }
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
