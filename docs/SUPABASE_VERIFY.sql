-- STEP3 verification queries (run after SUPABASE_SCHEMA.sql)

-- 1) Required tables exist
select table_name
from information_schema.tables
where table_schema = 'public'
  and table_name in ('goals', 'weekly_plans', 'tasks', 'reviews', 'carry_actions')
order by table_name;

-- 2) RLS enabled for all tables
select c.relname as table_name, c.relrowsecurity as rls_enabled
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname in ('goals', 'weekly_plans', 'tasks', 'reviews', 'carry_actions')
order by c.relname;

-- 3) Policies exist (expect 4 per table: select/insert/update/delete)
select tablename as table_name, count(*) as policy_count
from pg_policies
where schemaname = 'public'
  and tablename in ('goals', 'weekly_plans', 'tasks', 'reviews', 'carry_actions')
group by tablename
order by tablename;

-- 4) Required unique constraints
select conname, conrelid::regclass as table_name
from pg_constraint
where conname in (
  'weekly_plans_user_goal_week_uk',
  'reviews_user_plan_uk',
  'carry_actions_user_review_from_task_uk'
)
order by conname;

-- 5) Soft delete column check
select table_name, column_name, data_type
from information_schema.columns
where table_schema = 'public'
  and table_name = 'tasks'
  and column_name = 'deleted_at';

-- 6) Trigger/function check for updated_at auto update
select trigger_name, event_object_table
from information_schema.triggers
where trigger_schema = 'public'
  and trigger_name in (
    'goals_set_updated_at',
    'weekly_plans_set_updated_at',
    'tasks_set_updated_at',
    'reviews_set_updated_at',
    'carry_actions_set_updated_at'
)
order by trigger_name;
