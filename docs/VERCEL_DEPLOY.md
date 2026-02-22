# Vercel 배포 가이드 (Expo Web + SPA Rewrite)

## 1) 빌드 설정
Vercel 프로젝트 Build & Output Settings:

- Framework Preset: `Other`
- Build Command: `npm run build:web`
- Output Directory: `dist`

`package.json`에 아래 스크립트를 사용합니다.
- `build:web`: `expo export --platform web`

## 2) SPA 딥링크 404 방지
Expo Router 웹은 클라이언트 라우팅을 사용하므로, 새로고침/직접 URL 진입 시 정적 파일만 찾으면 404가 납니다.

`vercel.json` rewrite로 모든 앱 경로를 `index.html`로 보내야 합니다.

예외 처리:
- 정적 에셋(`assets/*`)
- 파비콘 등 파일 요청

## 3) 환경변수
Vercel Project Settings -> Environment Variables:

- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- `EXPO_PUBLIC_SITE_URL`

프로덕션/프리뷰에 모두 반영 후 재배포합니다.

## 4) 운영 확인 체크리스트
1. 루트 접속: `/`
2. 딥링크 접속: `/plan`, `/review`, `/goals`, `/inbox`
3. 동적 딥링크 접속: `/plan/:planId`, `/review/:planId`, `/goals/:goalId`
4. 모달 경로 직접 접속: `/goal-picker`, `/assign-goal`, `/carry-inbox`, `/trash`
5. 새로고침 후 404 없이 화면 복원 확인

## 5) 문제 발생 시
- 404 발생: `vercel.json` rewrite 누락/오타 확인
- 로그인 실패: Supabase Site URL/Redirect URLs 확인
- env 미반영: 재배포 후 런타임 변수 확인
