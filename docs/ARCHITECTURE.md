# ARCHITECTURE

## Overview
MVP1 is a single Expo + expo-router codebase for web and mobile. The source of truth is local persisted Zustand state with a storage adapter:
- Web: localForage
- Native: AsyncStorage

Flow loop:
1. Plan this week.
2. Review week completion and unresolved tasks.
3. Resolve Carry Inbox (carry/split/drop/rescope).
4. Apply decisions and auto-create/open next week plan.

## Folder Structure
```
app/
  _layout.tsx
  (tabs)/
    _layout.tsx
    plan.tsx
    goals.tsx
    review.tsx
  (modals)/
    _layout.tsx
    carry-inbox.tsx
src/
  core/
    types/domain.ts
    time/week.ts
  state/
    storage.ts
    store.ts
    slices/
      goalsSlice.ts
      plansSlice.ts
      tasksSlice.ts
      reviewsSlice.ts
      carryDraftSlice.ts
      uiSlice.ts
    selectors/
      weekSelectors.ts
      planSelectors.ts
      reviewSelectors.ts
  services/
    carryService.ts
  features/
    plan/
    review/
    goals/
  components/
```

## Routing
- `/plan` -> `app/(tabs)/plan.tsx`
- `/goals` -> `app/(tabs)/goals.tsx`
- `/review` -> `app/(tabs)/review.tsx`
- `/carry-inbox` modal -> `app/(modals)/carry-inbox.tsx`

Route group behavior:
- `(tabs)` hosts Plan / Goals / Review.
- `(modals)` hosts Carry Inbox as modal screen.

## State Architecture
Single Zustand store split by domain slices:
- `goals`: create/edit/archive goals.
- `plans`: ensure week plan, update note/top3.
- `tasks`: CRUD for weekly tasks, ordering, status, goal linking.
- `reviews`: ensure review per plan, summary + completion rate.
- `carryDraft`: per-plan temporary decisions in Review/Cover Inbox.
- `ui`: selected week, selected plan, modal/open state helpers.

Selectors:
- current week period (KST monday start)
- plan by period
- tasks by plan (ordered)
- incomplete tasks (todo)
- completion rate (exclude dropped)
- carry draft completeness

## Service Layer
`src/services/carryService.ts` contains the critical transaction-like routine:
- `applyCarryActionsAndEnsureNextPlan(planId)`

It performs:
1. Ensure source review and next week plan exist.
2. Resolve defaults (undecided -> carry if requested by apply mode).
3. Apply decisions:
   - carry: clone to next week with lineage
   - split: drop original + create children
   - drop: mark original dropped
   - rescope: drop original + create one scoped task
4. Prevent duplicate re-apply with draft/application guards.
5. Set `createdFromPlanId` on next plan.
6. Recompute completion for source review.

## Persistence
`src/state/storage.ts` provides a unified adapter for `zustand/persist`.
- Web uses localForage async methods.
- Native uses AsyncStorage async methods.

Persisted keys:
- entities + ui state, excluding ephemeral derived values.

## Week/Time Rules
Implemented in `src/core/time/week.ts`:
- timezone fixed to `Asia/Seoul`
- week starts Monday 00:00:00 KST
- period end is next Monday exclusive
- formatter outputs `YYYY.MM.DD ~ YYYY.MM.DD`

## Implementation Constraints
- Plan period immutable.
- Carry is always clone+link, not move.
- Plan screen cannot drop tasks.
- Next-week generation happens from Review only.
