import { supabase } from '@/src/lib/supabaseClient';
import { SyncRows } from '@/src/sync/syncTypes';

const TABLES = {
  goals: 'goals',
  weeklyPlans: 'weekly_plans',
  tasks: 'tasks',
  reviews: 'reviews',
  carryActions: 'carry_actions',
} as const;

type TableName = (typeof TABLES)[keyof typeof TABLES];

function tableKeyToName(key: keyof SyncRows): TableName {
  return TABLES[key];
}

async function reconcileTable<T extends { user_id: string; id: string }>(
  table: TableName,
  userId: string,
  rows: T[],
): Promise<void> {
  if (rows.length > 0) {
    const { error } = await supabase.from(table).upsert(rows, { onConflict: 'user_id,id' });
    if (error) {
      throw error;
    }
  }

  const { data: existingRows, error: selectError } = await supabase
    .from(table)
    .select('id')
    .eq('user_id', userId);
  if (selectError) {
    throw selectError;
  }

  const localIds = new Set(rows.map((row) => row.id));
  const remoteIds = (existingRows ?? []).map((row) => String(row.id));
  const deleteIds = remoteIds.filter((id) => !localIds.has(id));

  if (deleteIds.length > 0) {
    const { error: deleteError } = await supabase
      .from(table)
      .delete()
      .eq('user_id', userId)
      .in('id', deleteIds);
    if (deleteError) {
      throw deleteError;
    }
  }
}

export async function pushRowsToSupabase(userId: string, rows: SyncRows): Promise<void> {
  await reconcileTable(TABLES.goals, userId, rows.goals);
  await reconcileTable(TABLES.weeklyPlans, userId, rows.weeklyPlans);
  await reconcileTable(TABLES.tasks, userId, rows.tasks);
  await reconcileTable(TABLES.reviews, userId, rows.reviews);
  await reconcileTable(TABLES.carryActions, userId, rows.carryActions);
}

async function selectRows<T>(table: TableName, userId: string): Promise<T[]> {
  const { data, error } = await supabase
    .from(table)
    .select('*')
    .eq('user_id', userId);

  if (error) {
    throw error;
  }

  return (data ?? []) as T[];
}

export async function pullRowsFromSupabase(userId: string): Promise<SyncRows> {
  const [goals, weeklyPlans, tasks, reviews, carryActions] = await Promise.all([
    selectRows<SyncRows['goals'][number]>(tableKeyToName('goals'), userId),
    selectRows<SyncRows['weeklyPlans'][number]>(tableKeyToName('weeklyPlans'), userId),
    selectRows<SyncRows['tasks'][number]>(tableKeyToName('tasks'), userId),
    selectRows<SyncRows['reviews'][number]>(tableKeyToName('reviews'), userId),
    selectRows<SyncRows['carryActions'][number]>(tableKeyToName('carryActions'), userId),
  ]);

  return {
    goals,
    weeklyPlans,
    tasks,
    reviews,
    carryActions,
  };
}
