import { nowIso } from '@/src/core/time/week';
import {
  AppStore,
  CarryActionsById,
  GoalsById,
  PlansById,
  ReviewsById,
  TasksById,
} from '@/src/state/types';
import { CarryActionType, ID, Plan, Task } from '@/src/core/types/domain';

let seq = 0;
function nextId(prefix: string): ID {
  seq += 1;
  return `${prefix}_${seq}`;
}

interface Seed {
  plans?: Plan[];
  tasks?: Task[];
}

export function makeTestStore(seed: Seed = {}): AppStore {
  const plans: PlansById = Object.fromEntries((seed.plans ?? []).map((plan) => [plan.id, plan]));
  const tasks: TasksById = Object.fromEntries((seed.tasks ?? []).map((task) => [task.id, task]));
  const reviews: ReviewsById = {};
  const carryActions: CarryActionsById = {};
  const goals: GoalsById = {};
  const carryDraftByPlan: AppStore['carryDraftByPlan'] = {};

  const store: AppStore = {
    goals,
    plans,
    tasks,
    reviews,
    carryActions,
    carryDraftByPlan,
    selectedWeekStartIso: null,
    selectedPlanId: null,
    carryInboxOpen: false,
    appliedCarryByPlanId: {},

    ensureInboxGoal: () => {
      const existing = Object.values(store.goals).find((goal) => goal.title === 'Inbox' && goal.status === 'active');
      if (existing) return existing.id;
      const id = nextId('goal');
      const ts = nowIso();
      store.goals[id] = {
        id,
        title: 'Inbox',
        description: 'Legacy and unlinked tasks',
        dueType: 'none',
        status: 'active',
        createdAt: ts,
        updatedAt: ts,
      };
      return id;
    },
    createGoal: ({ title, description, dueType = 'none', dueDate }) => {
      const id = nextId('goal');
      const ts = nowIso();
      store.goals[id] = { id, title, description, dueType, dueDate, status: 'active', createdAt: ts, updatedAt: ts };
      return id;
    },
    editGoal: (goalId, patch) => {
      const goal = store.goals[goalId];
      if (!goal) return;
      store.goals[goalId] = { ...goal, ...patch, updatedAt: nowIso() };
    },
    archiveGoal: (goalId) => {
      const goal = store.goals[goalId];
      if (!goal) return;
      store.goals[goalId] = { ...goal, status: 'archived', updatedAt: nowIso() };
    },

    ensureWeekPlan: (periodStartIso, periodEndIso, goalId, sourcePlanId) => {
      const resolvedGoalId = goalId ?? store.ensureInboxGoal();
      const existing = Object.values(store.plans).find(
        (plan) => plan.type === 'week' && plan.periodStart === periodStartIso && plan.goalId === resolvedGoalId,
      );
      if (existing) return existing.id;
      const id = nextId('plan');
      const ts = nowIso();
      store.plans[id] = {
        id,
        type: 'week',
        periodStart: periodStartIso,
        periodEnd: periodEndIso,
        goalId: resolvedGoalId,
        note: '',
        top3TaskIds: [],
        createdFromPlanId: sourcePlanId,
        createdAt: ts,
        updatedAt: ts,
      };
      return id;
    },
    updatePlanNote: (planId, note) => {
      const plan = store.plans[planId];
      if (!plan) return;
      store.plans[planId] = { ...plan, note, updatedAt: nowIso() };
    },
    toggleTop3: (planId, taskId) => {
      const plan = store.plans[planId];
      if (!plan) return { ok: false, reason: 'Plan not found' };
      const has = plan.top3TaskIds.includes(taskId);
      if (!has && plan.top3TaskIds.length >= 3) return { ok: false, reason: 'Top3 limit exceeded' };
      store.plans[planId] = {
        ...plan,
        top3TaskIds: has ? plan.top3TaskIds.filter((id) => id !== taskId) : [...plan.top3TaskIds, taskId],
        updatedAt: nowIso(),
      };
      return { ok: true };
    },
    setSelectedWeekStart: (periodStartIso) => {
      store.selectedWeekStartIso = periodStartIso;
    },

    addTask: ({ planId, title, goalId, carryFromTaskId, splitParentTaskId }) => {
      const plan = store.plans[planId];
      if (!plan) {
        throw new Error(`Plan not found for task creation: ${planId}`);
      }
      const id = nextId('task');
      const order = Object.values(store.tasks).filter((task) => task.planId === planId).length;
      const ts = nowIso();
      store.tasks[id] = {
        id,
        planId,
        title,
        goalId: goalId ?? plan.goalId,
        status: 'todo',
        order,
        carryFromTaskId,
        splitParentTaskId,
        createdAt: ts,
        updatedAt: ts,
      };
      return id;
    },
    updateTask: (taskId, patch) => {
      const task = store.tasks[taskId];
      if (!task) return;
      store.tasks[taskId] = { ...task, ...patch, updatedAt: nowIso() };
    },
    toggleTaskDone: (taskId) => {
      const task = store.tasks[taskId];
      if (!task || task.status === 'dropped') return;
      const next = task.status === 'done' ? 'todo' : 'done';
      store.tasks[taskId] = { ...task, status: next, updatedAt: nowIso() };
    },
    reorderTask: (planId, orderedTaskIds) => {
      orderedTaskIds.forEach((taskId, index) => {
        const task = store.tasks[taskId];
        if (task && task.planId === planId) {
          store.tasks[taskId] = { ...task, order: index, updatedAt: nowIso() };
        }
      });
    },

    ensureReview: (planId) => {
      const existing = Object.values(store.reviews).find((review) => review.planId === planId);
      if (existing) return existing.id;
      const id = nextId('review');
      const ts = nowIso();
      store.reviews[id] = { id, planId, summaryNote: '', completionRate: 0, createdAt: ts, updatedAt: ts };
      return id;
    },
    setReviewNote: (planId, note) => {
      const reviewId = store.ensureReview(planId);
      store.reviews[reviewId] = { ...store.reviews[reviewId], summaryNote: note, updatedAt: nowIso() };
    },
    setReviewCompletionRate: (planId, completionRate) => {
      const reviewId = store.ensureReview(planId);
      store.reviews[reviewId] = { ...store.reviews[reviewId], completionRate, updatedAt: nowIso() };
    },

    createCarryAction: ({ reviewId, fromTaskId, action, toTaskIds, note }) => {
      const id = nextId('carry');
      store.carryActions[id] = { id, reviewId, fromTaskId, action, toTaskIds, note, createdAt: nowIso() };
      return id;
    },

    setCarryDecision: (planId, taskId, action) => {
      const current = store.carryDraftByPlan[planId]?.[taskId] ?? {
        action: undefined,
        splitTitles: [],
        rescopeTitle: '',
        note: '',
      };
      store.carryDraftByPlan[planId] = {
        ...(store.carryDraftByPlan[planId] ?? {}),
        [taskId]: { ...current, action },
      };
    },
    setDropNote: (planId, taskId, note) => {
      const current = store.carryDraftByPlan[planId]?.[taskId] ?? {
        action: undefined,
        splitTitles: [],
        rescopeTitle: '',
        note: '',
      };
      store.carryDraftByPlan[planId] = {
        ...(store.carryDraftByPlan[planId] ?? {}),
        [taskId]: { ...current, note },
      };
    },
    setRescopeTitle: (planId, taskId, title) => {
      const current = store.carryDraftByPlan[planId]?.[taskId] ?? {
        action: undefined,
        splitTitles: [],
        rescopeTitle: '',
        note: '',
      };
      store.carryDraftByPlan[planId] = {
        ...(store.carryDraftByPlan[planId] ?? {}),
        [taskId]: { ...current, rescopeTitle: title },
      };
    },
    setSplitChildren: (planId, taskId, titles) => {
      const current = store.carryDraftByPlan[planId]?.[taskId] ?? {
        action: undefined,
        splitTitles: [],
        rescopeTitle: '',
        note: '',
      };
      store.carryDraftByPlan[planId] = {
        ...(store.carryDraftByPlan[planId] ?? {}),
        [taskId]: { ...current, splitTitles: titles },
      };
    },
    bulkCarryUndecided: (planId, taskIds) => {
      const next = { ...(store.carryDraftByPlan[planId] ?? {}) };
      taskIds.forEach((taskId) => {
        const current = next[taskId] ?? { action: undefined, splitTitles: [], rescopeTitle: '', note: '' };
        if (!current.action) {
          next[taskId] = { ...current, action: 'carry' };
        }
      });
      store.carryDraftByPlan[planId] = next;
    },
    clearCarryDraftForPlan: (planId) => {
      delete store.carryDraftByPlan[planId];
    },

    setSelectedPlanId: (planId) => {
      store.selectedPlanId = planId;
    },
    setCarryInboxOpen: (open) => {
      store.carryInboxOpen = open;
    },
    markCarryApplied: (planId) => {
      store.appliedCarryByPlanId[planId] = true;
    },
  };

  return store;
}
