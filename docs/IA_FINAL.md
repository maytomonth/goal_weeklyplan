# IA FINAL (STEP 1)

## Final Route Map (Expo Router)

### Tabs (4)
- `/(tabs)/plan/index`
- `/(tabs)/plan/[planId]`
- `/(tabs)/review/index`
- `/(tabs)/review/[planId]`
- `/(tabs)/goals/index`
- `/(tabs)/goals/[goalId]`
- `/(tabs)/inbox/index`

### Modals
- `/(modals)/goal-picker`
- `/(modals)/carry-inbox?planId=...`
- `/(modals)/assign-goal?taskId=...`
- `/(modals)/trash`

## Header Actions by Screen

| Route | Header Left | Header Center | Header Right | Primary CTA |
|---|---|---|---|---|
| `/(tabs)/plan/index` | none | WeekNav | `+ Goal Plan`, `Trash` | open goal picker |
| `/(tabs)/plan/[planId]` | Back | Plan title + week label | `Review` | add/edit/reorder tasks |
| `/(tabs)/review/index` | none | WeekNav | none | open review detail |
| `/(tabs)/review/[planId]` | Back | Goal + week label | `Carry Inbox` | apply carry and open next week |
| `/(tabs)/goals/index` | none | Goals | `+ Goal` | create/edit/archive goals |
| `/(tabs)/goals/[goalId]` | Back | Goal title | `Archive`, `Delete` | open weekly plan history item |
| `/(tabs)/inbox/index` | none | Inbox | `Trash` | quick add / assign / delete |
| `/(modals)/goal-picker` | Close | Goal Picker | none | select goal and open plan |
| `/(modals)/carry-inbox` | Close | Carry Inbox | `Bulk Carry` | save decisions |
| `/(modals)/assign-goal` | Close | Assign Goal | none | reassign to selected goal/week |
| `/(modals)/trash` | Close | Trash | none | restore / hard delete |

## Navigation Rules
- Hub (`index`) routes do not edit the full entity body.
- Detail (`[id]`) routes own editing actions.
- `carry-inbox` modal must always receive `planId`.
- `assign-goal` modal must always receive `taskId`.
- Plan/Review/Goals hub lists must exclude system inbox goal plan by default.
