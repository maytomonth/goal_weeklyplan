import { StateCreator } from 'zustand';
import { nowIso } from '@/src/core/time/week';
import { createId } from '@/src/state/helpers';
import { AppStore, GoalsSlice } from '@/src/state/types';

export const createGoalsSlice: StateCreator<AppStore, [], [], GoalsSlice> = (set) => ({
  goals: {},
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
});
