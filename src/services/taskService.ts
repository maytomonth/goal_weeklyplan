import { ID } from '@/src/core/types/domain';
import { AppStore } from '@/src/state/types';

export function softDeleteTask(store: AppStore, taskId: ID): void {
  store.softDeleteTask(taskId);
}

export function undoSoftDeleteTask(store: AppStore, taskId: ID): void {
  store.undoSoftDeleteTask(taskId);
}

export function hardDeleteTask(store: AppStore, taskId: ID): void {
  store.hardDeleteTask(taskId);
}
