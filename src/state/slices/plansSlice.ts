import type { StateCreator } from 'zustand';
import { nowIso } from '@/src/core/time/week';
import { createId } from '@/src/state/helpers';
import { AppStore, PlansSlice } from '@/src/state/types';

export const createPlansSlice: StateCreator<AppStore, [], [], PlansSlice> = (set, get) => ({
  plans: {},
  ensureGoalWeeklyPlan: (periodStartIso, periodEndIso, goalId, sourcePlanId) => {
    const resolvedGoalId = goalId;
    const existing = Object.values(get().plans).find(
      (plan) =>
        plan.type === 'week' &&
        plan.periodStart === periodStartIso &&
        plan.goalId === resolvedGoalId,
    );

    if (existing) {
      return existing.id;
    }

    const id = createId();
    const timestamp = nowIso();

    set((state) => ({
      plans: {
        ...state.plans,
        [id]: {
          id,
          type: 'week',
          periodStart: periodStartIso,
          periodEnd: periodEndIso,
          goalId: resolvedGoalId,
          note: '',
          top3TaskIds: [],
          createdFromPlanId: sourcePlanId,
          createdAt: timestamp,
          updatedAt: timestamp,
        },
      },
      selectedWeekStartIso: state.selectedWeekStartIso ?? periodStartIso,
      selectedPlanId: state.selectedPlanId ?? id,
    }));

    return id;
  },
  getWeekPlan: (periodStartIso, goalId) =>
    Object.values(get().plans).find(
      (plan) => plan.type === 'week' && plan.periodStart === periodStartIso && plan.goalId === goalId,
    ) ?? null,
  ensureWeekPlan: (periodStartIso, periodEndIso, goalId, sourcePlanId) => {
    const resolvedGoalId = goalId ?? get().ensureInboxGoal();
    return get().ensureGoalWeeklyPlan(periodStartIso, periodEndIso, resolvedGoalId, sourcePlanId);
  },
  updatePlanNote: (planId, note) => {
    set((state) => {
      const plan = state.plans[planId];
      if (!plan) {
        return state;
      }

      return {
        plans: {
          ...state.plans,
          [planId]: {
            ...plan,
            note,
            updatedAt: nowIso(),
          },
        },
      };
    });
  },
  toggleTop3: (planId, taskId) => {
    const plan = get().plans[planId];
    if (!plan) {
      return { ok: false, reason: 'Plan not found' };
    }

    const exists = plan.top3TaskIds.includes(taskId);
    if (!exists && plan.top3TaskIds.length >= 3) {
      return { ok: false, reason: 'Top3 limit exceeded' };
    }

    set((state) => {
      const current = state.plans[planId];
      if (!current) {
        return state;
      }

      const nextTop3 = exists
        ? current.top3TaskIds.filter((id) => id !== taskId)
        : [...current.top3TaskIds, taskId];

      return {
        plans: {
          ...state.plans,
          [planId]: {
            ...current,
            top3TaskIds: nextTop3,
            updatedAt: nowIso(),
          },
        },
      };
    });

    return { ok: true };
  },
  setSelectedWeekStart: (periodStartIso) => {
    set({ selectedWeekStartIso: periodStartIso });
  },
});
