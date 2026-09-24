-- Diet Design 초기 스키마 (Supabase 연결 단계에서 적용)
-- packages/core/src/types.ts 의 타입과 1:1로 대응한다.

create type user_role as enum ('client', 'coach');

-- 로그인 사용자 1명 = 1행. 고객은 담당 코치를 가진다.
create table profiles (
  id uuid primary key references auth.users on delete cascade,
  role user_role not null default 'client',
  name text not null default '',
  coach_id uuid references profiles (id),
  period_tracking boolean not null default true,
  period_expected_date date,
  -- 내 운동 루틴: [{id, name, kind, method, amount}] (packages/core Exercise)
  routine jsonb not null default '[]',
  -- 건강정보(민감정보) 수집 별도 동의 시각
  sensitive_data_consented_at timestamptz,
  created_at timestamptz not null default now()
);

-- 하루 기록 (아침 체크 + 제출 상태)
create table daily_logs (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references profiles (id) on delete cascade,
  date date not null,
  sleep_start time,
  sleep_end time,
  weight_kg numeric(5, 1),
  waist_cm numeric(5, 1),
  bowel_count smallint check (bowel_count >= 0),
  -- "안 먹었어요"로 확인한 끼니
  skipped_meals text[] not null default '{}' check (skipped_meals <@ array['breakfast', 'lunch', 'dinner']),
  -- 운동: {items: Exercise[], rest?: boolean} (packages/core DailyExercise)
  exercise jsonb,
  -- 고객이 "지금 보내기"를 누른 시각. 없으면 다음 날 오전 9시(고객 현지)에 자동으로 보낸 것으로 본다
  submitted_at timestamptz,
  updated_at timestamptz not null default now(),
  unique (client_id, date)
);

create table meals (
  id uuid primary key default gen_random_uuid(),
  log_id uuid not null references daily_logs (id) on delete cascade,
  time time not null,
  description text not null default '',
  fullness smallint check (fullness between 1 and 10),
  -- storage 버킷 meal-photos 안의 경로들
  photo_paths text[] not null default '{}',
  created_at timestamptz not null default now()
);

-- 3단계: AI 초안 → 코치 검토 → 고객에게 전송
create table feedback (
  id uuid primary key default gen_random_uuid(),
  log_id uuid not null references daily_logs (id) on delete cascade,
  author text not null check (author in ('ai', 'coach')),
  content text not null,
  status text not null default 'draft' check (status in ('draft', 'sent')),
  sent_at timestamptz,
  created_at timestamptz not null default now()
);

-- ── 접근 권한: 고객은 자기 기록만, 코치는 담당 고객 기록만 ──
alter table profiles enable row level security;
alter table daily_logs enable row level security;
alter table meals enable row level security;
alter table feedback enable row level security;

create function can_access_client(target uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select target = auth.uid()
      or exists (select 1 from profiles p where p.id = target and p.coach_id = auth.uid());
$$;

create policy "본인 또는 담당 코치가 프로필 조회" on profiles
  for select using (can_access_client(id));
create policy "본인 프로필 수정" on profiles
  for update using (id = auth.uid());
-- 역할(role)과 담당 코치(coach_id)는 본인이 바꿀 수 없다 (코치가 관리자 화면에서 지정)
revoke update on profiles from authenticated;
grant update (name, period_tracking, period_expected_date, routine, sensitive_data_consented_at) on profiles to authenticated;

-- 가입하면 고객 프로필을 자동으로 만든다
create function handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, name) values (new.id, coalesce(new.raw_user_meta_data ->> 'name', ''));
  return new;
end;
$$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function handle_new_user();

create policy "기록 조회" on daily_logs
  for select using (can_access_client(client_id));
create policy "고객 본인 기록 작성" on daily_logs
  for all using (client_id = auth.uid()) with check (client_id = auth.uid());

create policy "식사 조회" on meals
  for select using (exists (select 1 from daily_logs l where l.id = log_id and can_access_client(l.client_id)));
create policy "고객 본인 식사 작성" on meals
  for all using (exists (select 1 from daily_logs l where l.id = log_id and l.client_id = auth.uid()))
  with check (exists (select 1 from daily_logs l where l.id = log_id and l.client_id = auth.uid()));

-- 고객은 전송된 피드백만 보고, 코치는 초안까지 보고 작성한다
create policy "피드백 조회" on feedback
  for select using (exists (
    select 1 from daily_logs l join profiles p on p.id = l.client_id
    where l.id = log_id and (p.coach_id = auth.uid() or (l.client_id = auth.uid() and status = 'sent'))
  ));
create policy "코치 피드백 작성" on feedback
  for all using (exists (
    select 1 from daily_logs l join profiles p on p.id = l.client_id
    where l.id = log_id and p.coach_id = auth.uid()
  ));

-- 음식 사진: 비공개 버킷, 경로 첫 폴더가 고객 id
insert into storage.buckets (id, name, public) values ('meal-photos', 'meal-photos', false);

create policy "사진 조회" on storage.objects
  for select using (bucket_id = 'meal-photos' and can_access_client(((storage.foldername(name))[1])::uuid));
create policy "고객 본인 사진 업로드" on storage.objects
  for insert with check (bucket_id = 'meal-photos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "고객 본인 사진 삭제" on storage.objects
  for delete using (bucket_id = 'meal-photos' and (storage.foldername(name))[1] = auth.uid()::text);
