import type { StateCreator } from 'zustand';
import { nowIso } from '@/src/core/time/week';
import { createId } from '@/src/state/helpers';
import { AppStore, CarryActionsSlice } from '@/src/state/types';

export const createCarryActionsSlice: StateCreator<AppStore, [], [], CarryActionsSlice> = (set) => ({
  carryActions: {},
  createCarryAction: ({ reviewId, fromTaskId, action, toTaskIds, note }) => {
    const id = createId();

    set((state) => ({
      carryActions: {
        ...state.carryActions,
        [id]: {
          id,
          reviewId,
          fromTaskId,
          action,
          toTaskIds,
          note,
          createdAt: nowIso(),
        },
      },
    }));

    return id;
  },
  pruneCarryActionsByTaskIds: (taskIds) => {
    const taskIdSet = new Set(taskIds);
    set((state) => ({
      carryActions: Object.fromEntries(
        Object.entries(state.carryActions)
          .filter(([, action]) => !taskIdSet.has(action.fromTaskId))
          .map(([id, action]) => [
            id,
            {
              ...action,
              toTaskIds: action.toTaskIds.filter((taskId) => !taskIdSet.has(taskId)),
            },
          ]),
      ),
    }));
  },
  pruneCarryActionsByReviewIds: (reviewIds) => {
    const reviewIdSet = new Set(reviewIds);
    set((state) => ({
      carryActions: Object.fromEntries(
        Object.entries(state.carryActions).filter(([, action]) => !reviewIdSet.has(action.reviewId)),
      ),
    }));
  },
});
