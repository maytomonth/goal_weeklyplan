# Supabase 설정 가이드 (STEP3)

## 1) 프로젝트 환경변수 확인
Vercel/로컬 모두 아래 공개 변수만 사용합니다.

- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- `EXPO_PUBLIC_SITE_URL`

주의: `service_role` 키는 절대 클라이언트에 넣지 않습니다.

## 2) SQL 스키마 적용
1. Supabase Dashboard -> SQL Editor 이동
2. `docs/SUPABASE_SCHEMA.sql` 전체를 붙여넣기
3. `Run` 실행
4. Table Editor에서 아래 테이블 생성 확인
   - `goals`
   - `weekly_plans`
   - `tasks`
   - `reviews`
   - `carry_actions`

## 3) RLS 적용 확인
각 테이블에서 RLS가 활성화되어야 합니다.

확인 방법:
1. Table Editor -> 각 테이블 선택
2. `RLS enabled` 상태 확인
3. Policies 탭에서 select/insert/update/delete 정책 4개 확인

정책 기준은 모두 동일합니다.
- `auth.uid() = user_id`

## 4) Authentication 설정 (Email/Password)
1. Authentication -> Providers -> Email 활성화
2. 개인용 빠른 테스트 목적이면 `Confirm email` OFF 권장
   - OFF: 회원가입 직후 바로 로그인 가능
   - ON: 메일 인증 후 로그인 가능

## 5) Redirect URL 확인
Authentication -> URL Configuration에서 아래 URL이 등록되어 있어야 합니다.

- Site URL: 운영 도메인 (예: `https://goalplan-plus.vercel.app`)
- Redirect URLs:
  - 운영 URL
  - 로컬 URL (예: `http://localhost:8082`)

## 6) 동작 체크
1. 회원가입
2. 로그아웃
3. 다시 로그인
4. 데이터가 사용자 계정 기준으로 유지되는지 확인
5. 다른 계정 로그인 시 기존 계정 데이터가 보이지 않는지 확인
