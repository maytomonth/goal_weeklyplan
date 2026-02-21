# QA MVP2 (PRD_v2)

검증일: 2026-02-21

## 실행 환경
- `npm run typecheck` 통과
- `npm test` 통과
- `npm run web -- --port 8082`로 Expo Web 번들 완료 확인

## 수동 검증 시나리오 (최소 7개)
1. 주차 네비게이션 (Plan/Review 공통)
- 절차: Plan/Review에서 `←`, `→`, `이번 주` 클릭
- 기대: 주차 라벨(`YYYY.MM.DD ~ YYYY.MM.DD`) 및 해당 주 리스트 즉시 갱신
- 결과: 통과

2. Plan Hub 빈 상태 및 목표 플랜 추가
- 절차: 해당 주 플랜 0개 상태에서 `+ 목표 플랜 추가` 클릭 → Goal 선택
- 기대: `ensureGoalWeeklyPlan(periodStart, goalId)`로 생성/기존 플랜 열기
- 결과: 통과

3. Goal Picker 검색/최근 사용
- 절차: Goal 검색어 입력, 최근 사용한 목표 섹션 확인
- 기대: 제목 기준 필터링, 최근 목표 최대 5개 우선 표시
- 결과: 통과

4. Plan Detail Task/Top3 편집
- 절차: Task 추가, 체크 토글, 웹 Up/Down 정렬, Top3 4개 선택 시도
- 기대: CRUD/정렬 동작, Top3 3개 초과 시 토스트/차단
- 결과: 통과

5. Review Hub 상태 배지
- 절차: 리뷰 없음/리뷰 있음/미완료 존재 상태를 각각 만들고 카드 확인
- 기대: `리뷰 시작`, `리뷰 완료`, `Carry 필요` 배지 규칙 반영
- 결과: 통과

6. Carry Inbox 결정 검증
- 절차: Split/Rescope 선택 후 빈 입력으로 저장 시도
- 기대: 에러 표시 및 저장 차단, `일괄 Carry`로 미선택 일괄 지정 가능
- 결과: 통과

7. 다음 주 동일 목표 플랜 생성/이동
- 절차: Review 상세에서 `다음 주 이 목표 플랜 열기` 클릭
- 기대: carryService가 `(nextPeriodStart, sameGoalId)` 기준으로 next plan 생성/조회 후 이동
- 결과: 통과

8. Goals 상세 히스토리
- 절차: Goal 카드 열기 → 최근 플랜 섹션 확인 → `열기`
- 기대: 최근 8주 row(주차/완료율/리뷰요약) 표시, 클릭 시 Plan 상세 이동
- 결과: 통과

9. v1 -> v2 마이그레이션
- 절차: schemaVersion < 2 상태에서 앱 시작
- 기대: 1회 마이그레이션 수행, goalId 없는 task는 Inbox goal/plan으로 재매핑
- 결과: 통과

## 비고
- `npm run web` 기본 포트(8081)가 이미 사용 중이면 `npm run web -- --port 8082`로 검증.
