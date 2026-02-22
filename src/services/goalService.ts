import { ID } from '@/src/core/types/domain';
import { AppStore } from '@/src/state/types';

export function archiveGoal(store: AppStore, goalId: ID): void {
  store.archiveGoal(goalId);
}

export function hardDeleteGoal(store: AppStore, goalId: ID): void {
  store.hardDeleteGoal(goalId);
}
