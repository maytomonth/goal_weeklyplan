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

10. Task Soft Delete + Undo(10초)
- 절차: Plan Detail에서 Task 삭제 클릭 후 토스트의 `Undo` 클릭
- 기대: 즉시 목록에서 사라졌다가 Undo 시 복원됨(`deletedAt=null`)
- 결과: 통과

11. Soft Delete 시 Top3 정합성
- 절차: Top3로 지정된 Task를 삭제
- 기대: 해당 task id가 plan.top3TaskIds에서 자동 제거되어 Top3 미리보기에서 사라짐
- 결과: 통과

12. 휴지통 복원/영구삭제
- 절차: Plan Hub에서 휴지통 진입 → 삭제된 task 복원/영구삭제
- 기대: 복원 시 일반 목록 재노출, 영구삭제 시 엔티티 완전 제거(복구 불가)
- 결과: 통과

13. WeeklyPlan 영구삭제 cascade
- 절차: Plan Detail에서 `이 주간플랜 삭제` 실행
- 기대: 해당 plan과 연결된 Task/Review/CarryAction이 함께 삭제되고 허브 목록에서 제거됨
- 결과: 통과

14. Goal Archive
- 절차: Goal Detail에서 Archive 실행
- 기대: Goal 상태가 archived로 변경되고 Active 목록에서 제거됨
- 결과: 통과

15. Goal Hard Delete cascade (2단계 확인)
- 절차: Goal Detail에서 영구 삭제 모달 오픈 → 체크박스 체크 후 삭제 확정
- 기대: Goal + 연결 WeeklyPlan/Task/Review/CarryAction cascade 삭제, 최근 goal 목록에서도 제거
- 결과: 통과

## 비고
- `npm run web` 기본 포트(8081)가 이미 사용 중이면 `npm run web -- --port 8082`로 검증.
