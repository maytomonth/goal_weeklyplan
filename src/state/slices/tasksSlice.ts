import { StateCreator } from 'zustand';
import { nowIso } from '@/src/core/time/week';
import { createId } from '@/src/state/helpers';
import { AppStore, TasksSlice } from '@/src/state/types';

export const createTasksSlice: StateCreator<AppStore, [], [], TasksSlice> = (set, get) => ({
  tasks: {},
  addTask: ({ planId, title, goalId, carryFromTaskId, splitParentTaskId }) => {
    const id = createId();
    const timestamp = nowIso();
    const order = Object.values(get().tasks).filter((task) => task.planId === planId).length;

    set((state) => ({
      tasks: {
        ...state.tasks,
        [id]: {
          id,
          planId,
          goalId,
          title: title.trim(),
          status: 'todo',
          order,
          carryFromTaskId,
          splitParentTaskId,
          createdAt: timestamp,
          updatedAt: timestamp,
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

      return {
        tasks: {
          ...state.tasks,
          [taskId]: {
            ...task,
            ...patch,
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
});
