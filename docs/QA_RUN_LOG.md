# QA_RUN_LOG

## 기록 템플릿
- 날짜:
- 브랜치:
- 실행자:
- 환경(Node/npm/OS):

### 자동 테스트
- 명령:
- 결과:
- 실패 시 로그 요약:

### 수동 QA (모바일)
- 해상도:
- 시나리오:
- 결과(PASS/FAIL):
- 비고:

### 수동 QA (PC)
- 해상도:
- 시나리오:
- 결과(PASS/FAIL):
- 비고:

### 이슈 목록
- ID:
- 증상:
- 재현 단계:
- 조치:
- 상태:

---

## 실행 로그 (2026-02-22)
- 날짜: 2026-02-22
- 브랜치: `main` (working tree 기준)
- 실행자: Codex
- 환경: Node 22.x / npm / macOS

### 자동 테스트
1. `npm run typecheck`
   - 결과: PASS
   - 로그 요약: `tsc --noEmit` 오류 없음
2. `npm run test:run`
   - 결과: PASS
   - 로그 요약: 6 files, 24 tests passed
3. `npm run test:coverage`
   - 결과: PASS
   - 로그 요약:
     - 6 files, 24 tests passed
     - 전체 커버리지(Statements): 59.16%
     - `carryService.ts`: 95%+
     - `taskService.ts`: 89%+

### 수동 QA (모바일)
- 해상도: <1024
- 시나리오: `docs/QA_SMOKE_SCRIPT.md` 1~19 단계
- 결과: ENV 제약으로 실화면 조작은 미완료
- 비고: 개발 서버 기동/라우트 구조/테스트 기반 사전 검증 완료, 최종 시각 검증은 사용자 확인 필요

### 수동 QA (PC)
- 해상도: >=1024
- 시나리오: Sidebar 토글/패널 레이아웃/모달 동작
- 결과: ENV 제약으로 실화면 조작은 미완료
- 비고: 웹 빌드/번들 성공 로그 확인 (`http://localhost:8083`), 최종 시각 검증은 사용자 확인 필요

### 실행 결과 요약 표
- `npm run typecheck`: PASS
- `npm run test:run`: PASS (24 passed)
- `npm run test:coverage`: PASS (24 passed, coverage report 생성)
- `npm run web -- --non-interactive --port 8082`: 포트 충돌 후 8083으로 기동 성공, 웹 번들 완료 로그 확인
