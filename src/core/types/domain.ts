export type ID = string;
export type ISODateTime = string;

export type GoalDueType = 'none' | 'date';
export type GoalStatus = 'active' | 'archived';
export type GoalSystemType = 'inbox';

export interface Goal {
  id: ID;
  title: string;
  description?: string;
  dueType: GoalDueType;
  dueDate?: string;
  status: GoalStatus;
  systemType?: GoalSystemType;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
}

export interface Plan {
  id: ID;
  type: 'week';
  periodStart: ISODateTime;
  periodEnd: ISODateTime;
  goalId: ID;
  note: string;
  top3TaskIds: ID[];
  createdFromPlanId?: ID;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
}

export type TaskStatus = 'todo' | 'done' | 'dropped';

export interface Task {
  id: ID;
  planId: ID;
  // Must always match the parent weekly plan's goalId.
  goalId: ID;
  title: string;
  status: TaskStatus;
  order: number;
  carryFromTaskId?: ID;
  splitParentTaskId?: ID;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
  deletedAt?: ISODateTime | null;
  completedAt?: ISODateTime;
  note?: string;
}

export interface Review {
  id: ID;
  planId: ID;
  summaryNote: string;
  completionRate: number;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
}

export type CarryActionType = 'carry' | 'split' | 'drop' | 'rescope';

export interface CarryAction {
  id: ID;
  reviewId: ID;
  fromTaskId: ID;
  action: CarryActionType;
  toTaskIds: ID[];
  note?: string;
  createdAt: ISODateTime;
}

export interface CarryDecisionDraft {
  action?: CarryActionType;
  splitTitles: string[];
  rescopeTitle: string;
  note: string;
}
