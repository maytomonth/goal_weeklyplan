import { ID } from '@/src/core/types/domain';
import { AppStore } from '@/src/state/types';

export function deleteWeeklyPlan(store: AppStore, planId: ID): void {
  store.deleteWeeklyPlan(planId);
}
