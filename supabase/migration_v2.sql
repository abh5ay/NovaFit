-- =============================================
-- novaFit Schema v2 — Run in Supabase SQL Editor
-- =============================================
-- First run the original schema.sql, then this migration:

-- Add gamification + sync columns to profiles
alter table profiles
  add column if not exists current_level   int     default 1,
  add column if not exists streak_days     int     default 0,
  add column if not exists last_active_date date,
  add column if not exists physique_progress float  default 0,   -- 0.0 to 1.0
  add column if not exists physique_start_weight float,
  add column if not exists physique_target_weight float,
  add column if not exists schedule_config jsonb   default '{}',
  add column if not exists meal_plan       jsonb   default '{}',
  add column if not exists workout_plan    jsonb   default '{}',
  add column if not exists pantry_items    jsonb   default '[]',
  add column if not exists notification_token text,
  add column if not exists notifications_enabled bool default true;

-- Level checkins table (one row per day completed)
create table if not exists level_checkins (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references profiles(id) on delete cascade not null,
  date        date default current_date not null,
  level       int  not null,
  tasks_done  int  default 0,
  tasks_total int  default 0,
  notes       text,
  created_at  timestamptz default now(),
  unique(user_id, date)
);

alter table level_checkins enable row level security;
create policy "own checkins" on level_checkins for all using (auth.uid() = user_id);
create index level_checkins_user on level_checkins(user_id, date desc);
