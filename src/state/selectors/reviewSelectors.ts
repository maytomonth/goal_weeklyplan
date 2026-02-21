import { CarryDecisionDraft } from '@/src/core/types/domain';
import { AppStore } from '@/src/state/types';
import { selectTasksByPlan } from '@/src/state/selectors/planSelectors';

export function selectCompletionRate(state: AppStore, planId: string): number {
  const tasks = selectTasksByPlan(state, planId).filter((task) => task.status !== 'dropped');
  if (tasks.length === 0) {
    return 0;
  }

  const doneCount = tasks.filter((task) => task.status === 'done').length;
  return doneCount / tasks.length;
}

export function selectReviewByPlan(state: AppStore, planId: string) {
  return Object.values(state.reviews).find((review) => review.planId === planId) ?? null;
}

export function selectCarryDraft(state: AppStore, planId: string): Record<string, CarryDecisionDraft> {
  return state.carryDraftByPlan[planId] ?? {};
}

export function selectCarryReady(state: AppStore, planId: string): boolean {
  const incomplete = selectTasksByPlan(state, planId).filter((task) => task.status === 'todo');
  if (incomplete.length === 0) {
    return true;
  }

  const draft = selectCarryDraft(state, planId);
  return incomplete.every((task) => {
    const decision = draft[task.id];
    if (!decision?.action) {
      return false;
    }

    if (decision.action === 'rescope') {
      return decision.rescopeTitle.trim().length > 0;
    }

    if (decision.action === 'split') {
      return decision.splitTitles.filter((title) => title.trim().length > 0).length > 0;
    }

    return true;
  });
}
