import type { StateCreator } from 'zustand';
import { AppStore, UiSlice } from '@/src/state/types';

export const createUiSlice: StateCreator<AppStore, [], [], UiSlice> = (set) => ({
  selectedWeekStartIso: null,
  selectedPlanId: null,
  carryInboxOpen: false,
  appliedCarryByPlanId: {},
  setSelectedPlanId: (planId) => set({ selectedPlanId: planId }),
  setCarryInboxOpen: (open) => set({ carryInboxOpen: open }),
  markCarryApplied: (planId) =>
    set((state) => ({
      appliedCarryByPlanId: {
        ...state.appliedCarryByPlanId,
        [planId]: true,
      },
    })),
});
