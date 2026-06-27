# TOBio 로그인·기록 설정 (Supabase, from scratch)

이 React 앱(microbe-ai-landing)의 로그인/회원가입과 "내 기록"은 **Supabase**가 처리합니다.
백엔드(Express/Render)와 기존 6개 엔드포인트는 **건드리지 않습니다**.

> ⚠️ 이 저장소에는 Supabase/DB가 **없습니다.** 아래 절차로 **새 프로젝트를 처음부터** 만들어야 합니다.

---

## 0. 환경변수 (프론트, `VITE_` 만)

`microbe-ai-landing/.env` 파일을 만들어 채우세요 (`.env`는 커밋 금지, 이미 .gitignore 처리됨).

```
VITE_SUPABASE_URL=https://<프로젝트>.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=<publishable(anon) 키>
```

- 값이 없으면 로그인/기록만 비활성화되고 추천·살포는 그대로 동작합니다(로그인은 선택).
- ⚠️ `service_role` 같은 **비밀키는 절대 프론트/커밋 금지.** 이 앱은 publishable(anon) 키만 씁니다.

---

## 1. Supabase 프로젝트 생성
1. https://supabase.com → New project (지역은 가까운 곳, 예: Northeast Asia).
2. 생성 후 **Project Settings → API** 에서 **Project URL** 과 **anon/publishable key** 복사 → 위 `.env`에.

## 2. 테이블 + RLS (SQL Editor에 그대로 실행)

```sql
-- 영농 기록 (추천/살포 결과 저장)
create table if not exists public.records (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  kind       text not null check (kind in ('recommend','spray')),
  title      text,
  crop       text,
  summary    text,
  payload    jsonb,
  created_at timestamptz not null default now()
);

-- 본인 것만 보이도록 RLS
alter table public.records enable row level security;

create policy "records_select_own" on public.records
  for select using (user_id = auth.uid());
create policy "records_insert_own" on public.records
  for insert with check (user_id = auth.uid());
create policy "records_update_own" on public.records
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "records_delete_own" on public.records
  for delete using (user_id = auth.uid());

create index if not exists records_user_created_idx
  on public.records (user_id, created_at desc);
```

- `user_id` 기본값이 `auth.uid()` 이므로 프론트는 `user_id`를 **보내지 않습니다**. 실수로 남의 id를 넣어도 `with check`가 DB에서 거부합니다.

## 3. 인증 옵션
- **Authentication → Providers → Email** 켜기(기본 켜짐).
- **이메일 인증(Confirm email)**:
  - **켜두면(권장, 보안)**: 회원가입 후 확인 메일의 링크를 눌러야 로그인됩니다. 앱은 "확인 메일을 보냈어요" 안내를 표시합니다.
  - **끄면(데모 편의)**: 가입 즉시 로그인됩니다. Authentication → Providers → Email → "Confirm email" 토글로 조정.
- **Authentication → URL Configuration**:
  - **Site URL** 과 **Redirect URLs** 에 GitHub Pages 주소 추가
    (예: `https://minseok09011.github.io/Microbe_recommend_website/`). 로컬 개발용 `http://localhost:5173` 도 추가.

---

## 4. 동작 방식 (per-user 분리 원리)
1. 로그인하면 Supabase 세션(JWT)이 브라우저(localStorage)에 저장되고 새로고침에도 유지됩니다.
2. `records` 조회/저장 시 JWT의 `auth.uid()` 로 RLS가 **본인 행만** 허용합니다.
3. 그래서 `select * from records` 를 해도 DB가 본인 것만 돌려줍니다(프론트 필터 의존 X).

## 5. 비밀키 주의
- 프론트엔 publishable(anon) 키만. `service_role` 키는 절대 프론트/깃 금지.
- 이 범위에선 service_role 키가 **필요 없습니다**(회원가입도 클라이언트 `signUp`으로 처리).
