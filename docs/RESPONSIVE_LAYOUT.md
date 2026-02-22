# Responsive Layout Spec (STEP2)

## Breakpoint
- Desktop mode: `width >= 1024`
- Mobile/Tablet mode: `width < 1024`

## Navigation Behavior
- Desktop:
  - Hide bottom tab bar
  - Show left `SidebarNav` (expanded/collapsed)
  - Sidebar state persisted locally
- Mobile/Tablet:
  - Keep existing Tabs + Stack flow

## SidebarNav
- Expanded width: ~220
- Collapsed width: 64~72
- Items: Plan / Review / Goals / Inbox
- Active state: current route-based highlight
- Toggle: icon button at sidebar top

## Desktop Panel Layout

### Plan (3-panel)
- Left: week nav + plan list + add action
- Center: selected plan detail (note/tasks)
- Right: top3 + metrics + quick actions

### Review (2-panel)
- Left: week nav + review list
- Center: selected review detail
- Carry handling: modal (`/carry-inbox`)

### Goals (2-panel)
- Left: goals list (+create)
- Center: selected goal detail/history

### Inbox (2-panel)
- Left: quick add + inbox task list
- Center: selected task context/help panel
- Assign handling: modal (`/assign-goal`)

## Route Constraint
- Route paths remain unchanged:
  - `/plan/index`, `/plan/[planId]`
  - `/review/index`, `/review/[planId]`
  - `/goals/index`, `/goals/[goalId]`
  - `/inbox/index`
- Modals unchanged:
  - `/goal-picker`, `/carry-inbox`, `/assign-goal`, `/trash`

## Interaction Rule
- Desktop: list click updates center detail (split-view behavior)
- URL should keep `planId/goalId` when available
