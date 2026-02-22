import { CarryAction, Goal, Plan, Review, Task } from '@/src/core/types/domain';

export interface GoalRow {
  user_id: string;
  id: string;
  title: string;
  description: string | null;
  due_type: Goal['dueType'];
  due_date: string | null;
  status: Goal['status'];
  system_type: Goal['systemType'] | null;
  created_at: string;
  updated_at: string;
}

export interface WeeklyPlanRow {
  user_id: string;
  id: string;
  type: Plan['type'];
  period_start: string;
  period_end: string;
  goal_id: string;
  note: string;
  top3_task_ids: string[];
  created_from_plan_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface TaskRow {
  user_id: string;
  id: string;
  plan_id: string;
  goal_id: string;
  title: string;
  status: Task['status'];
  order: number;
  carry_from_task_id: string | null;
  split_parent_task_id: string | null;
  note: string | null;
  completed_at: string | null;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ReviewRow {
  user_id: string;
  id: string;
  plan_id: string;
  summary_note: string;
  completion_rate: number;
  created_at: string;
  updated_at: string;
}

export interface CarryActionRow {
  user_id: string;
  id: string;
  review_id: string;
  from_task_id: string;
  action: CarryAction['action'];
  to_task_ids: string[];
  note: string | null;
  created_at: string;
  updated_at: string;
}

export interface SyncRows {
  goals: GoalRow[];
  weeklyPlans: WeeklyPlanRow[];
  tasks: TaskRow[];
  reviews: ReviewRow[];
  carryActions: CarryActionRow[];
}

export interface SyncPayload {
  goals: Goal[];
  plans: Plan[];
  tasks: Task[];
  reviews: Review[];
  carryActions: CarryAction[];
}
