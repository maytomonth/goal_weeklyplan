# QA_SMOKE_SCRIPT

목표: 10분 내 핵심 회귀 확인 (최소 15단계)

## 사전 조건
- 앱 실행: `npm run web -- --non-interactive --port 8082`
- 초기 데이터가 비어있지 않아도 수행 가능

## 스모크 절차
1. 목표 탭에서 목표 A 생성
   - Expected: 목록에 목표 A 표시
2. 목표 탭에서 목표 B 생성
   - Expected: 목록에 목표 B 표시
3. 계획 탭에서 이번 주 목표 A 플랜 생성
   - Expected: 플랜 카드 생성
4. 목표 A 플랜에 할 일 3개 추가
   - Expected: 할 일 3개 렌더
5. 할 일 2개를 상위 3으로 지정
   - Expected: 상위 3 영역에 2개 표시
6. 할 일 1개 완료 처리
   - Expected: 완료율/지표 반영
7. 계획 탭에서 이번 주 목표 B 플랜 생성
   - Expected: B 플랜 카드 생성
8. 목표 B 플랜에 할 일 2개 추가
   - Expected: 할 일 2개 렌더
9. 리뷰 탭에서 목표 A 플랜 선택
   - Expected: 리뷰 상세 표시
10. Carry Inbox에서 carry/split/drop/rescope 각각 지정
    - Expected: 각 항목 상태 반영
11. 다음 주 플랜 생성/이동 버튼 실행
    - Expected: 다음 주 동일 목표 플랜으로 이동
12. 다음 주 목표 A 플랜에서 carry/rescope/split 결과 확인
    - Expected: 이월/재정의/분할 할 일 생성
13. 계획 탭 할 일 soft delete 후 되돌리기 실행
    - Expected: 삭제 취소되어 목록 복구
14. 다시 soft delete 후 trash 모달에서 restore 확인
    - Expected: 복원 시 목록 재노출
15. trash 모달에서 hard delete 확인
    - Expected: 영구 삭제 후 복구 불가
16. 인박스 탭 quick add로 할 일 추가
    - Expected: 인박스 목록 최상단 표시
17. 인박스 할 일을 목표+다음 주로 assign
    - Expected: 인박스에서 사라지고 대상 플랜에 생성
18. PC 모드에서 사이드바 토글(확장/축소)
    - Expected: 토글 상태 유지
19. 계획/리뷰/목표 허브에서 Inbox goal 제외 확인
    - Expected: 시스템 인박스 목표/플랜 기본 미노출

## 실패 시 우선 점검
- 주차 계산/KST 변환 (`src/core/time/week.ts`)
- carry 반영 (`src/services/carryService.ts`)
- 인박스 배정 (`src/services/taskService.ts`)
- soft delete/복구 (`src/services/taskService.ts`, `app/(modals)/trash.tsx`)
