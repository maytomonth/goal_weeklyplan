import type { StateCreator } from 'zustand';
import { nowIso } from '@/src/core/time/week';
import { createId } from '@/src/state/helpers';
import { AppStore, TasksSlice } from '@/src/state/types';

export const createTasksSlice: StateCreator<AppStore, [], [], TasksSlice> = (set, get) => ({
  tasks: {},
  addTask: ({ planId, title, goalId, carryFromTaskId, splitParentTaskId }) => {
    const plan = get().plans[planId];
    if (!plan) {
      throw new Error(`Plan not found for task creation: ${planId}`);
    }

    const id = createId();
    const timestamp = nowIso();
    const order = Object.values(get().tasks).filter((task) => task.planId === planId).length;
    const resolvedGoalId = goalId ?? plan.goalId;

    set((state) => ({
      tasks: {
        ...state.tasks,
        [id]: {
          id,
          planId,
          goalId: resolvedGoalId,
          title: title.trim(),
          status: 'todo',
          order,
          carryFromTaskId,
          splitParentTaskId,
          createdAt: timestamp,
          updatedAt: timestamp,
          deletedAt: null,
        },
      },
    }));

    return id;
  },
  updateTask: (taskId, patch) => {
    set((state) => {
      const task = state.tasks[taskId];
      if (!task) {
        return state;
      }
      const plan = state.plans[task.planId];
      const enforcedGoalId = plan?.goalId ?? task.goalId;

      return {
        tasks: {
          ...state.tasks,
          [taskId]: {
            ...task,
            ...patch,
            goalId: enforcedGoalId,
            updatedAt: nowIso(),
            completedAt:
              patch.status === 'done' ? nowIso() : patch.status === 'todo' ? undefined : task.completedAt,
          },
        },
      };
    });
  },
  toggleTaskDone: (taskId) => {
    set((state) => {
      const task = state.tasks[taskId];
      if (!task || task.status === 'dropped') {
        return state;
      }
      if (task.deletedAt) {
        return state;
      }

      const nextStatus = task.status === 'done' ? 'todo' : 'done';
      const timestamp = nowIso();

      return {
        tasks: {
          ...state.tasks,
          [taskId]: {
            ...task,
            status: nextStatus,
            completedAt: nextStatus === 'done' ? timestamp : undefined,
            updatedAt: timestamp,
          },
        },
      };
    });
  },
  reorderTask: (planId, orderedTaskIds) => {
    set((state) => {
      const updates = { ...state.tasks };
      orderedTaskIds.forEach((taskId, index) => {
        const task = updates[taskId];
        if (task && task.planId === planId) {
          updates[taskId] = {
            ...task,
            order: index,
            updatedAt: nowIso(),
          };
        }
      });

      return { tasks: updates };
    });
  },
  softDeleteTask: (taskId) => {
    set((state) => {
      const task = state.tasks[taskId];
      if (!task || task.deletedAt) {
        return state;
      }

      const plan = state.plans[task.planId];
      const nextPlans = plan
        ? {
            ...state.plans,
            [plan.id]: {
              ...plan,
              top3TaskIds: plan.top3TaskIds.filter((id) => id !== taskId),
              updatedAt: nowIso(),
            },
          }
        : state.plans;

      return {
        tasks: {
          ...state.tasks,
          [taskId]: {
            ...task,
            deletedAt: nowIso(),
            updatedAt: nowIso(),
          },
        },
        plans: nextPlans,
      };
    });
  },
  undoSoftDeleteTask: (taskId) => {
    set((state) => {
      const task = state.tasks[taskId];
      if (!task || !task.deletedAt) {
        return state;
      }

      return {
        tasks: {
          ...state.tasks,
          [taskId]: {
            ...task,
            deletedAt: null,
            updatedAt: nowIso(),
          },
        },
      };
    });
  },
  hardDeleteTask: (taskId) => {
    set((state) => {
      const task = state.tasks[taskId];
      if (!task) {
        return state;
      }

      const nextTasks = { ...state.tasks };
      delete nextTasks[taskId];

      const nextPlans = { ...state.plans };
      const plan = state.plans[task.planId];
      if (plan) {
        nextPlans[task.planId] = {
          ...plan,
          top3TaskIds: plan.top3TaskIds.filter((id) => id !== taskId),
          updatedAt: nowIso(),
        };
      }

      const nextCarryActions = Object.entries(state.carryActions).reduce<typeof state.carryActions>(
        (acc, [id, action]) => {
          if (action.fromTaskId === taskId) {
            return acc;
          }
          acc[id] = {
            ...action,
            toTaskIds: action.toTaskIds.filter((id) => id !== taskId),
          };
          return acc;
        },
        {},
      );

      const carryDraftByPlan = { ...state.carryDraftByPlan };
      const planDraft = carryDraftByPlan[task.planId];
      if (planDraft?.[taskId]) {
        const nextDraft = { ...planDraft };
        delete nextDraft[taskId];
        if (Object.keys(nextDraft).length === 0) {
          delete carryDraftByPlan[task.planId];
        } else {
          carryDraftByPlan[task.planId] = nextDraft;
        }
      }

      return {
        tasks: nextTasks,
        plans: nextPlans,
        carryActions: nextCarryActions,
        carryDraftByPlan,
      };
    });
  },
});
