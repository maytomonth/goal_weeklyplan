import type { StateCreator } from 'zustand';
import { AppStore, UiSlice } from '@/src/state/types';

export const createUiSlice: StateCreator<AppStore, [], [], UiSlice> = (set) => ({
  selectedWeekStartIso: null,
  selectedPlanId: null,
  carryInboxOpen: false,
  desktopSidebarCollapsed: false,
  appliedCarryByPlanId: {},
  schemaVersion: 1,
  recentGoalIds: [],
  setSelectedPlanId: (planId) => set({ selectedPlanId: planId }),
  setCarryInboxOpen: (open) => set({ carryInboxOpen: open }),
  setDesktopSidebarCollapsed: (collapsed) => set({ desktopSidebarCollapsed: collapsed }),
  toggleDesktopSidebar: () =>
    set((state) => ({
      desktopSidebarCollapsed: !state.desktopSidebarCollapsed,
    })),
  markCarryApplied: (planId) =>
    set((state) => ({
      appliedCarryByPlanId: {
        ...state.appliedCarryByPlanId,
        [planId]: true,
      },
    })),
  setSchemaVersion: (version) => set({ schemaVersion: version }),
  pushRecentGoal: (goalId) =>
    set((state) => {
      const deduped = [goalId, ...state.recentGoalIds.filter((id) => id !== goalId)];
      return { recentGoalIds: deduped.slice(0, 10) };
    }),
});
