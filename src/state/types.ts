import {
  CarryAction,
  CarryDecisionDraft,
  Goal,
  Plan,
  Review,
  Task,
  ID,
  CarryActionType,
} from '@/src/core/types/domain';

export type GoalsById = Record<ID, Goal>;
export type PlansById = Record<ID, Plan>;
export type TasksById = Record<ID, Task>;
export type ReviewsById = Record<ID, Review>;
export type CarryActionsById = Record<ID, CarryAction>;
export type CarryDraftByPlan = Record<ID, Record<ID, CarryDecisionDraft>>;

export interface GoalsSlice {
  goals: GoalsById;
  createGoal: (input: {
    title: string;
    description?: string;
    dueType?: Goal['dueType'];
    dueDate?: string;
  }) => ID;
  editGoal: (goalId: ID, patch: Partial<Pick<Goal, 'title' | 'description' | 'dueType' | 'dueDate'>>) => void;
  archiveGoal: (goalId: ID) => void;
}

export interface PlansSlice {
  plans: PlansById;
  ensureWeekPlan: (periodStartIso: string, periodEndIso: string, sourcePlanId?: ID) => ID;
  updatePlanNote: (planId: ID, note: string) => void;
  toggleTop3: (planId: ID, taskId: ID) => { ok: boolean; reason?: string };
  setSelectedWeekStart: (periodStartIso: string) => void;
}

export interface TasksSlice {
  tasks: TasksById;
  addTask: (input: {
    planId: ID;
    title: string;
    goalId?: ID;
    carryFromTaskId?: ID;
    splitParentTaskId?: ID;
  }) => ID;
  updateTask: (taskId: ID, patch: Partial<Pick<Task, 'title' | 'goalId' | 'status' | 'note'>>) => void;
  toggleTaskDone: (taskId: ID) => void;
  reorderTask: (planId: ID, orderedTaskIds: ID[]) => void;
}

export interface ReviewsSlice {
  reviews: ReviewsById;
  ensureReview: (planId: ID) => ID;
  setReviewNote: (planId: ID, note: string) => void;
  setReviewCompletionRate: (planId: ID, completionRate: number) => void;
}

export interface CarryActionsSlice {
  carryActions: CarryActionsById;
  createCarryAction: (input: {
    reviewId: ID;
    fromTaskId: ID;
    action: CarryActionType;
    toTaskIds: ID[];
    note?: string;
  }) => ID;
}

export interface CarryDraftSlice {
  carryDraftByPlan: CarryDraftByPlan;
  setCarryDecision: (planId: ID, taskId: ID, action: CarryActionType) => void;
  setDropNote: (planId: ID, taskId: ID, note: string) => void;
  setRescopeTitle: (planId: ID, taskId: ID, title: string) => void;
  setSplitChildren: (planId: ID, taskId: ID, titles: string[]) => void;
  bulkCarryUndecided: (planId: ID, taskIds: ID[]) => void;
  clearCarryDraftForPlan: (planId: ID) => void;
}

export interface UiSlice {
  selectedWeekStartIso: string | null;
  selectedPlanId: ID | null;
  carryInboxOpen: boolean;
  appliedCarryByPlanId: Record<ID, boolean>;
  setSelectedPlanId: (planId: ID | null) => void;
  setCarryInboxOpen: (open: boolean) => void;
  markCarryApplied: (planId: ID) => void;
}

export type AppStore = GoalsSlice &
  PlansSlice &
  TasksSlice &
  ReviewsSlice &
  CarryActionsSlice &
  CarryDraftSlice &
  UiSlice;
