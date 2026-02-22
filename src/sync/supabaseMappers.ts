import { CarryAction, Goal, Plan, Review, Task } from '@/src/core/types/domain';
import { AppStore } from '@/src/state/types';
import { CarryActionRow, GoalRow, ReviewRow, SyncPayload, SyncRows, TaskRow, WeeklyPlanRow } from '@/src/sync/syncTypes';

export function buildSyncRows(userId: string, store: AppStore): SyncRows {
  const goals = Object.values(store.goals).map<GoalRow>((goal) => ({
    user_id: userId,
    id: goal.id,
    title: goal.title,
    description: goal.description ?? null,
    due_type: goal.dueType,
    due_date: goal.dueDate ?? null,
    status: goal.status,
    system_type: goal.systemType ?? null,
    created_at: goal.createdAt,
    updated_at: goal.updatedAt,
  }));

  const weeklyPlans = Object.values(store.plans).map<WeeklyPlanRow>((plan) => ({
    user_id: userId,
    id: plan.id,
    type: plan.type,
    period_start: plan.periodStart,
    period_end: plan.periodEnd,
    goal_id: plan.goalId,
    note: plan.note,
    top3_task_ids: plan.top3TaskIds,
    created_from_plan_id: plan.createdFromPlanId ?? null,
    created_at: plan.createdAt,
    updated_at: plan.updatedAt,
  }));

  const tasks = Object.values(store.tasks).map<TaskRow>((task) => ({
    user_id: userId,
    id: task.id,
    plan_id: task.planId,
    goal_id: task.goalId,
    title: task.title,
    status: task.status,
    order: task.order,
    carry_from_task_id: task.carryFromTaskId ?? null,
    split_parent_task_id: task.splitParentTaskId ?? null,
    note: task.note ?? null,
    completed_at: task.completedAt ?? null,
    deleted_at: task.deletedAt ?? null,
    created_at: task.createdAt,
    updated_at: task.updatedAt,
  }));

  const reviews = Object.values(store.reviews).map<ReviewRow>((review) => ({
    user_id: userId,
    id: review.id,
    plan_id: review.planId,
    summary_note: review.summaryNote,
    completion_rate: review.completionRate,
    created_at: review.createdAt,
    updated_at: review.updatedAt,
  }));

  const carryActions = Object.values(store.carryActions).map<CarryActionRow>((action) => ({
    user_id: userId,
    id: action.id,
    review_id: action.reviewId,
    from_task_id: action.fromTaskId,
    action: action.action,
    to_task_ids: action.toTaskIds,
    note: action.note ?? null,
    created_at: action.createdAt,
    updated_at: action.createdAt,
  }));

  return { goals, weeklyPlans, tasks, reviews, carryActions };
}

export function rowsToSyncPayload(rows: SyncRows): SyncPayload {
  const goals = rows.goals.map<Goal>((goal) => ({
    id: goal.id,
    title: goal.title,
    description: goal.description ?? undefined,
    dueType: goal.due_type,
    dueDate: goal.due_date ?? undefined,
    status: goal.status,
    systemType: goal.system_type ?? undefined,
    createdAt: goal.created_at,
    updatedAt: goal.updated_at,
  }));

  const plans = rows.weeklyPlans.map<Plan>((plan) => ({
    id: plan.id,
    type: plan.type,
    periodStart: plan.period_start,
    periodEnd: plan.period_end,
    goalId: plan.goal_id,
    note: plan.note,
    top3TaskIds: plan.top3_task_ids,
    createdFromPlanId: plan.created_from_plan_id ?? undefined,
    createdAt: plan.created_at,
    updatedAt: plan.updated_at,
  }));

  const tasks = rows.tasks.map<Task>((task) => ({
    id: task.id,
    planId: task.plan_id,
    goalId: task.goal_id,
    title: task.title,
    status: task.status,
    order: task.order,
    carryFromTaskId: task.carry_from_task_id ?? undefined,
    splitParentTaskId: task.split_parent_task_id ?? undefined,
    note: task.note ?? undefined,
    completedAt: task.completed_at ?? undefined,
    deletedAt: task.deleted_at,
    createdAt: task.created_at,
    updatedAt: task.updated_at,
  }));

  const reviews = rows.reviews.map<Review>((review) => ({
    id: review.id,
    planId: review.plan_id,
    summaryNote: review.summary_note,
    completionRate: review.completion_rate,
    createdAt: review.created_at,
    updatedAt: review.updated_at,
  }));

  const carryActions = rows.carryActions.map<CarryAction>((action) => ({
    id: action.id,
    reviewId: action.review_id,
    fromTaskId: action.from_task_id,
    action: action.action,
    toTaskIds: action.to_task_ids,
    note: action.note ?? undefined,
    createdAt: action.created_at,
  }));

  return { goals, plans, tasks, reviews, carryActions };
}
