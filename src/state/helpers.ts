import { ID } from '@/src/core/types/domain';

export function createId(): ID {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  const random = Math.random().toString(36).slice(2, 10);
  return `id_${Date.now()}_${random}`;
}
