import { appStorage } from '@/src/state/storage';
import { useAppStore } from '@/src/state/store';
import { pushRowsToSupabase, pullRowsFromSupabase } from '@/src/services/repo/supabaseRepo';
import { buildSyncRows, rowsToSyncPayload } from '@/src/sync/supabaseMappers';

const LOCAL_OWNER_KEY = 'goalplan-plus-local-owner';
const DEBOUNCE_MS = 1200;

let isApplyingRemote = false;
let syncTimer: ReturnType<typeof setTimeout> | null = null;
let unsubscribeStore: (() => void) | null = null;
let syncUserId: string | null = null;
let lastFingerprint = '';

function maxUpdatedAt(entries: Array<{ updatedAt: string }>): string {
  if (entries.length === 0) return '';
  return entries.reduce((latest, item) => (item.updatedAt > latest ? item.updatedAt : latest), '');
}

function fingerprintState(): string {
  const state = useAppStore.getState();
  return [
    Object.keys(state.goals).length,
    maxUpdatedAt(Object.values(state.goals)),
    Object.keys(state.plans).length,
    maxUpdatedAt(Object.values(state.plans)),
    Object.keys(state.tasks).length,
    maxUpdatedAt(Object.values(state.tasks)),
    Object.keys(state.reviews).length,
    maxUpdatedAt(Object.values(state.reviews)),
    Object.keys(state.carryActions).length,
    maxUpdatedAt(Object.values(state.carryActions).map((item) => ({ updatedAt: item.createdAt }))),
  ].join('|');
}

function hasLocalDomainData(): boolean {
  const state = useAppStore.getState();
  const nonSystemGoalCount = Object.values(state.goals).filter((goal) => goal.systemType !== 'inbox').length;
  return (
    nonSystemGoalCount > 0 ||
    Object.keys(state.plans).length > 0 ||
    Object.keys(state.tasks).length > 0 ||
    Object.keys(state.reviews).length > 0 ||
    Object.keys(state.carryActions).length > 0
  );
}

function payloadIsEmpty(payload: ReturnType<typeof rowsToSyncPayload>): boolean {
  return (
    payload.goals.length === 0 &&
    payload.plans.length === 0 &&
    payload.tasks.length === 0 &&
    payload.reviews.length === 0 &&
    payload.carryActions.length === 0
  );
}

function toDictionary<T extends { id: string }>(items: T[]): Record<string, T> {
  return Object.fromEntries(items.map((item) => [item.id, item]));
}

function resetDomainState(): void {
  useAppStore.setState((state) => ({
    ...state,
    goals: {},
    plans: {},
    tasks: {},
    reviews: {},
    carryActions: {},
    carryDraftByPlan: {},
    appliedCarryByPlanId: {},
    recentGoalIds: [],
    selectedPlanId: null,
    selectedWeekStartIso: null,
  }));
}

function schedulePush(): void {
  if (!syncUserId) {
    return;
  }
  const userId = syncUserId;
  if (syncTimer) {
    clearTimeout(syncTimer);
  }
  syncTimer = setTimeout(() => {
    void pushAll(userId).catch((error) => {
      console.warn('[sync] pushAll failed', error);
    });
  }, DEBOUNCE_MS);
}

async function getLocalOwner(): Promise<string | null> {
  return appStorage.getItem(LOCAL_OWNER_KEY);
}

async function setLocalOwner(userId: string): Promise<void> {
  await appStorage.setItem(LOCAL_OWNER_KEY, userId);
}

export async function pushAll(userId: string): Promise<void> {
  if (isApplyingRemote) {
    return;
  }

  const state = useAppStore.getState();
  const rows = buildSyncRows(userId, state);
  await pushRowsToSupabase(userId, rows);
  lastFingerprint = fingerprintState();
}

export async function pullAll(userId: string): Promise<void> {
  const rows = await pullRowsFromSupabase(userId);
  const payload = rowsToSyncPayload(rows);

  isApplyingRemote = true;
  try {
    useAppStore.setState((state) => ({
      ...state,
      goals: toDictionary(payload.goals),
      plans: toDictionary(payload.plans),
      tasks: toDictionary(payload.tasks),
      reviews: toDictionary(payload.reviews),
      carryActions: toDictionary(payload.carryActions),
      carryDraftByPlan: {},
      appliedCarryByPlanId: {},
    }));

    const store = useAppStore.getState();
    store.ensureInboxGoal();
    lastFingerprint = fingerprintState();
  } finally {
    isApplyingRemote = false;
  }

  if (payloadIsEmpty(payload)) {
    // Ensure at least system inbox goal exists for first-time users.
    useAppStore.getState().ensureInboxGoal();
  }
}

export function stopSyncOnChange(): void {
  if (syncTimer) {
    clearTimeout(syncTimer);
    syncTimer = null;
  }
  if (unsubscribeStore) {
    unsubscribeStore();
    unsubscribeStore = null;
  }
  syncUserId = null;
}

export function syncOnChange(userId: string): void {
  stopSyncOnChange();
  syncUserId = userId;
  lastFingerprint = fingerprintState();

  unsubscribeStore = useAppStore.subscribe(() => {
    if (isApplyingRemote || !syncUserId) {
      return;
    }

    const nextFingerprint = fingerprintState();
    if (nextFingerprint === lastFingerprint) {
      return;
    }

    lastFingerprint = nextFingerprint;
    schedulePush();
  });
}

export async function syncOnLogin(userId: string): Promise<void> {
  const localOwner = await getLocalOwner();
  if (localOwner && localOwner !== userId) {
    isApplyingRemote = true;
    try {
      resetDomainState();
      useAppStore.getState().ensureInboxGoal();
    } finally {
      isApplyingRemote = false;
    }
  }

  const localHasData = hasLocalDomainData();

  if (!localHasData) {
    await pullAll(userId);
  } else {
    await pushAll(userId);
  }

  await setLocalOwner(userId);
  syncOnChange(userId);
}
