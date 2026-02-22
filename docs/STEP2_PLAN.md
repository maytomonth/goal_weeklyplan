# STEP2 Plan (Responsive UI + NativeWind + Reusables)

## 목표
- 기능/데이터/로직 변경 없이 UI와 레이아웃만 리팩터링
- NativeWind + Reusables 기반 다크모드 톤 통일
- PC(>=1024)에서 Sidebar + 패널 레이아웃 적용
- 모바일/태블릿(<1024)에서 기존 탭/스택 흐름 유지

## 변경 대상 파일(예정)

### 문서
- `docs/UI_STYLE_GUIDE.md` (신규)
- `docs/RESPONSIVE_LAYOUT.md` (신규)
- `docs/QA_UI_STEP2.md` (신규)
- `docs/STEP2_PLAN.md` (본 문서)

### 설정/스타일
- `package.json`
- `babel.config.js`
- `tailwind.config.js` (신규)
- `metro.config.js` (신규)
- `global.css` (신규)
- `nativewind-env.d.ts` (신규)
- `tsconfig.json` (include 보강 필요 시)

### Reusables (core)
- `src/ui/components/button.tsx` (신규)
- `src/ui/components/input.tsx` (신규)
- `src/ui/components/card.tsx` (신규)
- `src/ui/components/surface.tsx` (신규)
- `src/ui/components/label.tsx` (신규)
- `src/ui/components/empty-state.tsx` (신규)
- `src/ui/components/index.ts` (신규)
- `src/ui/lib/cn.ts` (신규)

### Responsive Shell
- `src/ui/layout/ResponsiveShell.tsx` (신규)
- `src/ui/layout/SidebarNav.tsx` (신규)
- `src/ui/layout/useBreakpoint.ts` (신규)
- `src/state/slices/uiSlice.ts` (sidebar collapsed state)
- `src/state/types.ts` (sidebar state type)

### 라우트 UI 리팩터
- `app/(tabs)/_layout.tsx` (PC에서 tab bar 숨김)
- `app/(tabs)/plan/index.tsx`
- `app/(tabs)/plan/[planId].tsx`
- `app/(tabs)/review/index.tsx`
- `app/(tabs)/review/[planId].tsx`
- `app/(tabs)/goals/index.tsx`
- `app/(tabs)/goals/[goalId].tsx`
- `app/(tabs)/inbox/index.tsx`
- 모달 스타일 톤 정리:
  - `app/(modals)/goal-picker.tsx`
  - `app/(modals)/carry-inbox.tsx`
  - `app/(modals)/assign-goal.tsx`
  - `app/(modals)/trash.tsx`

## 구현 순서
1. 문서/디자인 토큰 정의
2. NativeWind 설치/설정
3. Reusables 핵심 컴포넌트 도입
4. ResponsiveShell/SidebarNav 구현 + 탭바 PC 숨김
5. Plan PC 3패널 적용
6. Review/Goals/Inbox PC 2패널 적용 + QA 문서

## 커밋 계획 (6개)
1. `docs(ui): add style guide and responsive layout spec`
2. `chore(ui): setup nativewind dark tokens and global styles`
3. `feat(ui): add reusable dark components`
4. `feat(layout): add responsive shell and desktop sidebar nav`
5. `feat(plan-ui): apply desktop 3-panel plan layout`
6. `feat(workspace-ui): apply desktop review/goals/inbox panels and add qa doc`

## 검증
- 각 커밋 후 `npm run typecheck && npm test`
- 마지막 단계에서 `npm run web -- --port 8082`로 PC 레이아웃 수동 확인
