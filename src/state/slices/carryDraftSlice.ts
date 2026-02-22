import type { StateCreator } from 'zustand';
import { AppStore, CarryDraftSlice } from '@/src/state/types';

function ensureDraft(state: AppStore, planId: string, taskId: string) {
  const byPlan = state.carryDraftByPlan[planId] ?? {};
  const existing = byPlan[taskId] ?? { action: undefined, splitTitles: [], rescopeTitle: '', note: '' };
  return { byPlan, existing };
}

export const createCarryDraftSlice: StateCreator<AppStore, [], [], CarryDraftSlice> = (set) => ({
  carryDraftByPlan: {},
  setCarryDecision: (planId, taskId, action) => {
    set((state) => {
      const { byPlan, existing } = ensureDraft(state, planId, taskId);
      return {
        carryDraftByPlan: {
          ...state.carryDraftByPlan,
          [planId]: {
            ...byPlan,
            [taskId]: {
              ...existing,
              action,
            },
          },
        },
      };
    });
  },
  setDropNote: (planId, taskId, note) => {
    set((state) => {
      const { byPlan, existing } = ensureDraft(state, planId, taskId);
      return {
        carryDraftByPlan: {
          ...state.carryDraftByPlan,
          [planId]: {
            ...byPlan,
            [taskId]: {
              ...existing,
              note,
            },
          },
        },
      };
    });
  },
  setRescopeTitle: (planId, taskId, title) => {
    set((state) => {
      const { byPlan, existing } = ensureDraft(state, planId, taskId);
      return {
        carryDraftByPlan: {
          ...state.carryDraftByPlan,
          [planId]: {
            ...byPlan,
            [taskId]: {
              ...existing,
              rescopeTitle: title,
            },
          },
        },
      };
    });
  },
  setSplitChildren: (planId, taskId, titles) => {
    set((state) => {
      const { byPlan, existing } = ensureDraft(state, planId, taskId);
      return {
        carryDraftByPlan: {
          ...state.carryDraftByPlan,
          [planId]: {
            ...byPlan,
            [taskId]: {
              ...existing,
              splitTitles: titles,
            },
          },
        },
      };
    });
  },
  bulkCarryUndecided: (planId, taskIds) => {
    set((state) => {
      const byPlan = state.carryDraftByPlan[planId] ?? {};
      const next = { ...byPlan };

      taskIds.forEach((taskId) => {
        const current = next[taskId] ?? { action: undefined, splitTitles: [], rescopeTitle: '', note: '' };
        if (!current.action) {
          next[taskId] = { ...current, action: 'carry' };
        }
      });

      return {
        carryDraftByPlan: {
          ...state.carryDraftByPlan,
          [planId]: next,
        },
      };
    });
  },
  clearCarryDraftForPlan: (planId) => {
    set((state) => {
      const next = { ...state.carryDraftByPlan };
      delete next[planId];
      return { carryDraftByPlan: next };
    });
  },
  clearCarryDraftForTask: (planId, taskId) => {
    set((state) => {
      const byPlan = state.carryDraftByPlan[planId];
      if (!byPlan || !byPlan[taskId]) {
        return state;
      }

      const nextByPlan = { ...byPlan };
      delete nextByPlan[taskId];

      const next = { ...state.carryDraftByPlan };
      if (Object.keys(nextByPlan).length === 0) {
        delete next[planId];
      } else {
        next[planId] = nextByPlan;
      }

      return { carryDraftByPlan: next };
    });
  },
});
