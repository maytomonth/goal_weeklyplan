# UI Style Guide (STEP2)

## Theme
- Mode: dark only
- Visual direction: iOS dark system-like, low-contrast surfaces, minimal shadow

## Color Tokens
- `bg`: `#0b0b0f` (app background)
- `surface`: `#121319` (primary card/panel)
- `surface-2`: `#1a1c24` (raised/interactive surface)
- `border`: `#2a2d36` (subtle separator)
- `text`: `#f2f4f8` (primary)
- `text-muted`: `#9aa1ae` (secondary)
- `accent`: `#0a84ff` (iOS system blue)
- `accent-pressed`: `#006fe6`
- `danger`: `#ff453a`
- `success`: `#30d158`

## Typography
- Base size: 15
- Line-height: 1.45
- Heading weights: 600/700 only
- Body weights: 400/500

## Spacing
- 4pt scale (`4,8,12,16,20,24`)
- Screen horizontal padding: `16`
- Panel gap (desktop): `12`

## Radius
- Card: 14
- Input/Button: 10
- Chip: full rounded

## Border / Shadow
- Use border-first separation (`border` token)
- Avoid heavy elevation shadows
- Optional subtle shadow on web hover only

## Focus / Pressed
- Focus ring: accent border + 1px outer glow
- Pressed state: slightly darker surface or accent-pressed
- Hover (web): +4~6% brightness only

## Component Rules
- Surface/Card: same dark family, slight contrast step
- Buttons:
  - Primary: accent background + near-white text
  - Secondary/Ghost: transparent + border
  - Danger: danger tint background + danger text
- Input/TextArea: surface-2 background, border token, muted placeholder

## Accessibility
- Ensure text vs background has strong contrast in dark mode
- Secondary text must remain readable on surface cards
