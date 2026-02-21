# IMPLEMENTATION PLAN

## Sprint 1 - Core Layer
Goal: domain model, time/week rules, store foundation, carry service.

Deliverables:
- `src/core/types/domain.ts`
- `src/core/time/week.ts`
- `src/state/storage.ts`
- `src/state/slices/*`
- `src/state/selectors/*`
- `src/state/store.ts`
- `src/services/carryService.ts`

Acceptance:
- Types mirror PRD entities exactly.
- KST Monday-start week helper validated with deterministic dates.
- Store actions cover required CRUD and review/carry draft actions.
- Carry apply routine creates next week plan and handles carry/split/drop/rescope.

## Sprint 2 - Plan Screen
Goal: operational weekly planning UI.

Deliverables:
- `app/(tabs)/plan.tsx`
- Plan feature components for note, task list CRUD, top3 controls, goal linking.

Acceptance:
- Plan can be ensured for selected week.
- Note autosaves.
- Task create/edit/toggle/reorder supported.
- Top3 max 3 enforced.
- Goal linking supported.

## Sprint 3 - Review + Carry Inbox
Goal: close weekly loop and auto-create next plan.

Deliverables:
- `app/(tabs)/review.tsx`
- `app/(modals)/carry-inbox.tsx`
- review feature components and carry decision forms.

Acceptance:
- Completion metrics are shown (done/todo/dropped/rate).
- Carry Inbox includes carry/split/drop/rescope.
- Bulk carry supported.
- Apply creates/opens next week plan without duplicate apply.

## Sprint 4 - Goals + App Wiring
Goal: goal management and final route/app wiring.

Deliverables:
- `app/(tabs)/goals.tsx`
- goal create/edit/archive UI
- root layouts and tab/modal navigation integration
- project configs (`package.json`, tsconfig, babel, metro, app.json)

Acceptance:
- goals list/detail/edit/archive flows work.
- tabs and modal routes are reachable on web/mobile.
- project is in runnable shape once dependencies are installed.

## Commit Strategy
1. `docs: add architecture and implementation plan`
2. `core: add domain models week helpers and zustand store`
3. `core: add carry apply service and review selectors`
4. `ui(plan): implement weekly plan screen`
5. `ui(review): implement review and carry inbox modal`
6. `ui(goals): implement goals management and finalize routing`
