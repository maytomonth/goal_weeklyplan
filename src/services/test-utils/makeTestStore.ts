import { nowIso } from '@/src/core/time/week';
import { INBOX_GOAL_ID, INBOX_GOAL_TITLE } from '@/src/state/slices/goalsSlice';
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
    desktopSidebarCollapsed: false,
    appliedCarryByPlanId: {},
    schemaVersion: 3,
    recentGoalIds: [],

    ensureInboxGoal: () => {
      const existing = Object.values(store.goals).find(
        (goal) => goal.systemType === 'inbox' || goal.title === INBOX_GOAL_TITLE,
      );
      if (existing) return existing.id;
      const ts = nowIso();
      store.goals[INBOX_GOAL_ID] = {
        id: INBOX_GOAL_ID,
        title: INBOX_GOAL_TITLE,
        description: 'Unassigned staging tasks',
        dueType: 'none',
        status: 'active',
        systemType: 'inbox',
        createdAt: ts,
        updatedAt: ts,
      };
      return INBOX_GOAL_ID;
    },
    createGoal: ({ title, description, dueType = 'none', dueDate }) => {
      const id = nextId('goal');
      const ts = nowIso();
      store.goals[id] = {
        id,
        title,
        description,
        dueType,
        dueDate,
        status: 'active',
        systemType: undefined,
        createdAt: ts,
        updatedAt: ts,
      };
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
    hardDeleteGoal: (goalId) => {
      Object.values(store.plans)
        .filter((plan) => plan.goalId === goalId)
        .forEach((plan) => store.deleteWeeklyPlan(plan.id));
      delete store.goals[goalId];
      store.recentGoalIds = store.recentGoalIds.filter((id) => id !== goalId);
    },

    ensureGoalWeeklyPlan: (periodStartIso, periodEndIso, goalId, sourcePlanId) => {
      const resolvedGoalId = goalId;
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
    getWeekPlan: (periodStartIso, goalId) =>
      Object.values(store.plans).find(
        (plan) => plan.type === 'week' && plan.periodStart === periodStartIso && plan.goalId === goalId,
      ) ?? null,
    ensureWeekPlan: (periodStartIso, periodEndIso, goalId, sourcePlanId) => {
      const resolvedGoalId = goalId ?? store.ensureInboxGoal();
      return store.ensureGoalWeeklyPlan(periodStartIso, periodEndIso, resolvedGoalId, sourcePlanId);
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
    removeTaskFromTop3: (planId, taskId) => {
      const plan = store.plans[planId];
      if (!plan) return;
      store.plans[planId] = {
        ...plan,
        top3TaskIds: plan.top3TaskIds.filter((id) => id !== taskId),
        updatedAt: nowIso(),
      };
    },
    deleteWeeklyPlan: (planId) => {
      const planTaskIds = Object.values(store.tasks)
        .filter((task) => task.planId === planId)
        .map((task) => task.id);
      planTaskIds.forEach((taskId) => delete store.tasks[taskId]);

      const reviewIds = Object.values(store.reviews)
        .filter((review) => review.planId === planId)
        .map((review) => review.id);
      reviewIds.forEach((reviewId) => delete store.reviews[reviewId]);

      const reviewIdSet = new Set(reviewIds);
      const taskIdSet = new Set(planTaskIds);
      Object.entries(store.carryActions).forEach(([actionId, action]) => {
        if (reviewIdSet.has(action.reviewId) || taskIdSet.has(action.fromTaskId)) {
          delete store.carryActions[actionId];
          return;
        }
        store.carryActions[actionId] = {
          ...action,
          toTaskIds: action.toTaskIds.filter((taskId) => !taskIdSet.has(taskId)),
        };
      });

      delete store.carryDraftByPlan[planId];
      delete store.appliedCarryByPlanId[planId];
      if (store.selectedPlanId === planId) {
        store.selectedPlanId = null;
      }
      delete store.plans[planId];
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
        deletedAt: null,
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
    reassignTask: (taskId, destinationPlanId, destinationGoalId) => {
      const task = store.tasks[taskId];
      const destinationPlan = store.plans[destinationPlanId];
      if (!task || !destinationPlan || task.deletedAt) return;

      const nextGoalId = destinationGoalId ?? destinationPlan.goalId;
      if (nextGoalId !== destinationPlan.goalId) return;
      if (task.planId === destinationPlanId && task.goalId === nextGoalId) return;

      store.removeTaskFromTop3(task.planId, taskId);
      const destinationOrder = Object.values(store.tasks).filter(
        (entry) => entry.planId === destinationPlanId && !entry.deletedAt,
      ).length;

      const sourceDraft = store.carryDraftByPlan[task.planId];
      if (sourceDraft?.[taskId]) {
        delete sourceDraft[taskId];
        if (Object.keys(sourceDraft).length === 0) {
          delete store.carryDraftByPlan[task.planId];
        }
      }

      store.tasks[taskId] = {
        ...task,
        planId: destinationPlanId,
        goalId: nextGoalId,
        order: destinationOrder,
        updatedAt: nowIso(),
      };
    },
    softDeleteTask: (taskId) => {
      const task = store.tasks[taskId];
      if (!task || task.deletedAt) return;
      store.tasks[taskId] = { ...task, deletedAt: nowIso(), updatedAt: nowIso() };
      store.removeTaskFromTop3(task.planId, taskId);
    },
    undoSoftDeleteTask: (taskId) => {
      const task = store.tasks[taskId];
      if (!task) return;
      store.tasks[taskId] = { ...task, deletedAt: null, updatedAt: nowIso() };
    },
    hardDeleteTask: (taskId) => {
      const task = store.tasks[taskId];
      if (!task) return;
      store.removeTaskFromTop3(task.planId, taskId);
      delete store.tasks[taskId];

      Object.entries(store.carryActions).forEach(([actionId, action]) => {
        if (action.fromTaskId === taskId) {
          delete store.carryActions[actionId];
          return;
        }
        store.carryActions[actionId] = {
          ...action,
          toTaskIds: action.toTaskIds.filter((id) => id !== taskId),
        };
      });

      const draft = store.carryDraftByPlan[task.planId];
      if (draft?.[taskId]) {
        delete draft[taskId];
        if (Object.keys(draft).length === 0) {
          delete store.carryDraftByPlan[task.planId];
        }
      }
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
    pruneCarryActionsByTaskIds: (taskIds) => {
      const taskIdSet = new Set(taskIds);
      Object.entries(store.carryActions).forEach(([actionId, action]) => {
        if (taskIdSet.has(action.fromTaskId)) {
          delete store.carryActions[actionId];
          return;
        }
        store.carryActions[actionId] = {
          ...action,
          toTaskIds: action.toTaskIds.filter((id) => !taskIdSet.has(id)),
        };
      });
    },
    pruneCarryActionsByReviewIds: (reviewIds) => {
      const reviewIdSet = new Set(reviewIds);
      Object.entries(store.carryActions).forEach(([actionId, action]) => {
        if (reviewIdSet.has(action.reviewId)) {
          delete store.carryActions[actionId];
        }
      });
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
    clearCarryDraftForTask: (planId, taskId) => {
      const byPlan = store.carryDraftByPlan[planId];
      if (!byPlan || !byPlan[taskId]) return;
      delete byPlan[taskId];
      if (Object.keys(byPlan).length === 0) {
        delete store.carryDraftByPlan[planId];
      }
    },

    setSelectedPlanId: (planId) => {
      store.selectedPlanId = planId;
    },
    setDesktopSidebarCollapsed: (collapsed) => {
      store.desktopSidebarCollapsed = collapsed;
    },
    toggleDesktopSidebar: () => {
      store.desktopSidebarCollapsed = !store.desktopSidebarCollapsed;
    },
    setCarryInboxOpen: (open) => {
      store.carryInboxOpen = open;
    },
    markCarryApplied: (planId) => {
      store.appliedCarryByPlanId[planId] = true;
    },
    setSchemaVersion: (version) => {
      store.schemaVersion = version;
    },
    pushRecentGoal: (goalId) => {
      store.recentGoalIds = [goalId, ...store.recentGoalIds.filter((id) => id !== goalId)].slice(0, 10);
    },
  };

  return store;
}
