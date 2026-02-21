import { StateCreator } from 'zustand';
import { nowIso } from '@/src/core/time/week';
import { createId } from '@/src/state/helpers';
import { AppStore, ReviewsSlice } from '@/src/state/types';

export const createReviewsSlice: StateCreator<AppStore, [], [], ReviewsSlice> = (set, get) => ({
  reviews: {},
  ensureReview: (planId) => {
    const existing = Object.values(get().reviews).find((review) => review.planId === planId);
    if (existing) {
      return existing.id;
    }

    const id = createId();
    const timestamp = nowIso();

    set((state) => ({
      reviews: {
        ...state.reviews,
        [id]: {
          id,
          planId,
          summaryNote: '',
          completionRate: 0,
          createdAt: timestamp,
          updatedAt: timestamp,
        },
      },
    }));

    return id;
  },
  setReviewNote: (planId, note) => {
    const reviewId = get().ensureReview(planId);

    set((state) => ({
      reviews: {
        ...state.reviews,
        [reviewId]: {
          ...state.reviews[reviewId],
          summaryNote: note,
          updatedAt: nowIso(),
        },
      },
    }));
  },
  setReviewCompletionRate: (planId, completionRate) => {
    const reviewId = get().ensureReview(planId);

    set((state) => ({
      reviews: {
        ...state.reviews,
        [reviewId]: {
          ...state.reviews[reviewId],
          completionRate,
          updatedAt: nowIso(),
        },
      },
    }));
  },
});
