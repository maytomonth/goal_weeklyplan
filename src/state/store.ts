import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { appStorage } from '@/src/state/storage';
import { createGoalsSlice } from '@/src/state/slices/goalsSlice';
import { createPlansSlice } from '@/src/state/slices/plansSlice';
import { createTasksSlice } from '@/src/state/slices/tasksSlice';
import { createReviewsSlice } from '@/src/state/slices/reviewsSlice';
import { createCarryActionsSlice } from '@/src/state/slices/carryActionsSlice';
import { createCarryDraftSlice } from '@/src/state/slices/carryDraftSlice';
import { createUiSlice } from '@/src/state/slices/uiSlice';
import { AppStore } from '@/src/state/types';

export const useAppStore = create<AppStore>()(
  persist(
    (...args) => ({
      ...createGoalsSlice(...args),
      ...createPlansSlice(...args),
      ...createTasksSlice(...args),
      ...createReviewsSlice(...args),
      ...createCarryActionsSlice(...args),
      ...createCarryDraftSlice(...args),
      ...createUiSlice(...args),
    }),
    {
      name: 'goal-tracker-mvp1-store',
      storage: createJSONStorage(() => appStorage),
      version: 1,
    },
  ),
);
