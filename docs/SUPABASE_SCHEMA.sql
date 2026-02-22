-- GoalPlan Plus STEP3 schema (Supabase Postgres)
-- Run this in Supabase SQL Editor.

begin;

create extension if not exists "pgcrypto";

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.goals (
  user_id uuid not null,
  id text not null,
  title text not null,
  description text,
  due_type text not null default 'none' check (due_type in ('none', 'date')),
  due_date date,
  status text not null default 'active' check (status in ('active', 'archived')),
  system_type text check (system_type in ('inbox')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);

create table if not exists public.weekly_plans (
  user_id uuid not null,
  id text not null,
  type text not null default 'week' check (type in ('week')),
  period_start timestamptz not null,
  period_end timestamptz not null,
  goal_id text not null,
  note text not null default '',
  top3_task_ids text[] not null default '{}',
  created_from_plan_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, id),
  constraint weekly_plans_user_goal_fk foreign key (user_id, goal_id)
    references public.goals (user_id, id) on delete cascade,
  constraint weekly_plans_user_goal_week_uk unique (user_id, period_start, goal_id)
);

create table if not exists public.tasks (
  user_id uuid not null,
  id text not null,
  plan_id text not null,
  goal_id text not null,
  title text not null,
  status text not null default 'todo' check (status in ('todo', 'done', 'dropped')),
  "order" integer not null default 0,
  carry_from_task_id text,
  split_parent_task_id text,
  note text,
  completed_at timestamptz,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, id),
  constraint tasks_user_plan_fk foreign key (user_id, plan_id)
    references public.weekly_plans (user_id, id) on delete cascade,
  constraint tasks_user_goal_fk foreign key (user_id, goal_id)
    references public.goals (user_id, id) on delete cascade
);

create table if not exists public.reviews (
  user_id uuid not null,
  id text not null,
  plan_id text not null,
  summary_note text not null default '',
  completion_rate double precision not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, id),
  constraint reviews_user_plan_fk foreign key (user_id, plan_id)
    references public.weekly_plans (user_id, id) on delete cascade,
  constraint reviews_user_plan_uk unique (user_id, plan_id)
);

create table if not exists public.carry_actions (
  user_id uuid not null,
  id text not null,
  review_id text not null,
  from_task_id text not null,
  action text not null check (action in ('carry', 'split', 'drop', 'rescope')),
  to_task_ids text[] not null default '{}',
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, id),
  constraint carry_actions_user_review_fk foreign key (user_id, review_id)
    references public.reviews (user_id, id) on delete cascade,
  constraint carry_actions_user_from_task_fk foreign key (user_id, from_task_id)
    references public.tasks (user_id, id) on delete cascade,
  constraint carry_actions_user_review_from_task_uk unique (user_id, review_id, from_task_id)
);

create index if not exists goals_user_updated_idx on public.goals (user_id, updated_at desc);
create index if not exists weekly_plans_user_updated_idx on public.weekly_plans (user_id, updated_at desc);
create index if not exists tasks_user_plan_order_idx on public.tasks (user_id, plan_id, "order");
create index if not exists tasks_user_deleted_idx on public.tasks (user_id, deleted_at);
create index if not exists tasks_user_updated_idx on public.tasks (user_id, updated_at desc);
create index if not exists reviews_user_updated_idx on public.reviews (user_id, updated_at desc);
create index if not exists carry_actions_user_updated_idx on public.carry_actions (user_id, updated_at desc);

create or replace trigger goals_set_updated_at
before update on public.goals
for each row execute function public.set_updated_at();

create or replace trigger weekly_plans_set_updated_at
before update on public.weekly_plans
for each row execute function public.set_updated_at();

create or replace trigger tasks_set_updated_at
before update on public.tasks
for each row execute function public.set_updated_at();

create or replace trigger reviews_set_updated_at
before update on public.reviews
for each row execute function public.set_updated_at();

create or replace trigger carry_actions_set_updated_at
before update on public.carry_actions
for each row execute function public.set_updated_at();

alter table public.goals enable row level security;
alter table public.weekly_plans enable row level security;
alter table public.tasks enable row level security;
alter table public.reviews enable row level security;
alter table public.carry_actions enable row level security;

create policy if not exists goals_owner_select on public.goals
for select using (auth.uid() = user_id);
create policy if not exists goals_owner_insert on public.goals
for insert with check (auth.uid() = user_id);
create policy if not exists goals_owner_update on public.goals
for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy if not exists goals_owner_delete on public.goals
for delete using (auth.uid() = user_id);

create policy if not exists weekly_plans_owner_select on public.weekly_plans
for select using (auth.uid() = user_id);
create policy if not exists weekly_plans_owner_insert on public.weekly_plans
for insert with check (auth.uid() = user_id);
create policy if not exists weekly_plans_owner_update on public.weekly_plans
for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy if not exists weekly_plans_owner_delete on public.weekly_plans
for delete using (auth.uid() = user_id);

create policy if not exists tasks_owner_select on public.tasks
for select using (auth.uid() = user_id);
create policy if not exists tasks_owner_insert on public.tasks
for insert with check (auth.uid() = user_id);
create policy if not exists tasks_owner_update on public.tasks
for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy if not exists tasks_owner_delete on public.tasks
for delete using (auth.uid() = user_id);

create policy if not exists reviews_owner_select on public.reviews
for select using (auth.uid() = user_id);
create policy if not exists reviews_owner_insert on public.reviews
for insert with check (auth.uid() = user_id);
create policy if not exists reviews_owner_update on public.reviews
for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy if not exists reviews_owner_delete on public.reviews
for delete using (auth.uid() = user_id);

create policy if not exists carry_actions_owner_select on public.carry_actions
for select using (auth.uid() = user_id);
create policy if not exists carry_actions_owner_insert on public.carry_actions
for insert with check (auth.uid() = user_id);
create policy if not exists carry_actions_owner_update on public.carry_actions
for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy if not exists carry_actions_owner_delete on public.carry_actions
for delete using (auth.uid() = user_id);

commit;
