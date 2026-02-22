# INBOX SPEC (FINAL)

## Purpose
Inbox is a staging area for unclassified tasks. It stores tasks not yet assigned to a user goal and supports moving them into goal weekly plans.

## Data Rules
- System goal is required: `Inbox Goal` with `systemType="inbox"`.
- Inbox task invariant: `task.goalId === INBOX_GOAL_ID`.
- Quick Add creates tasks in this week's Inbox WeeklyPlan (`periodStart` = this week start).
- Inbox WeeklyPlan is hidden from Plan/Review/Goals hub lists by default.
- Inbox tasks are only shown on Inbox tab.

## Required Actions
1. Quick Add
- One-line input creates a new task in this week's Inbox WeeklyPlan.
- New task status is `todo`.

2. Assign
- Input: `taskId` + selected destination `goalId` + selected destination `weekStart`.
- Destination plan is created or reused via `ensureGoalWeeklyPlan(weekStart, weekEnd, goalId)`.
- Task is moved by reassigning entity fields:
  - `task.planId = destinationPlanId`
  - `task.goalId = goalId`
- Reassign is not clone/copy.

3. Delete
- Soft delete only in Inbox list (`deletedAt=now`) with Undo toast (10s).
- If deleted task exists in plan `top3TaskIds`, it is removed automatically.

## Trash Modal
- List all tasks with `deletedAt != null`.
- Restore: `deletedAt = null`.
- Hard Delete: remove task entity permanently.

## Edge Cases
- Assign to same plan/goal is a no-op.
- Assign to inbox goal from inbox list is blocked in UI.
- Assign with missing `taskId` or destination `goalId` is blocked.
- If destination week is invalid, fallback to current week.
- Archived goals are not valid assignment targets.
- Deleted tasks are excluded from assign list and carry candidate list.

## Non-goals (STEP 1)
- PC responsive redesign.
- Remote DB sync.
- Google login/auth integration.
