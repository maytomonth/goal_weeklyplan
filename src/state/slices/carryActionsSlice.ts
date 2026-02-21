import { StateCreator } from 'zustand';
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
});
