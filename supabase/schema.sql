-- =============================================
-- novaFit — Supabase Schema
-- Run this in your Supabase SQL Editor
-- =============================================

-- Enable UUID extension
create extension if not exists "pgcrypto";

-- ─────────────────────────────────────────────
-- PROFILES
-- ─────────────────────────────────────────────
create table if not exists profiles (
  id              uuid primary key references auth.users on delete cascade,
  full_name       text,
  age             int check (age between 10 and 100),
  gender          text check (gender in ('male', 'female')),
  height_cm       int check (height_cm between 100 and 250),
  weight_kg       float check (weight_kg between 20 and 500),
  goal            text check (goal in ('lose', 'maintain', 'gain')),
  activity        text check (activity in ('sedentary', 'light', 'moderate', 'active')),
  body_fat_pct    float,
  target_physique text check (target_physique in ('lean', 'athletic', 'bulk')),
  dietary_restrictions text default 'none',
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

-- Auto-update updated_at
create or replace function update_updated_at()
returns trigger as $$
begin new.updated_at = now(); return new; end;
$$ language plpgsql;

create trigger profiles_updated_at
  before update on profiles
  for each row execute function update_updated_at();

-- ─────────────────────────────────────────────
-- FOOD LOGS
-- ─────────────────────────────────────────────
create table if not exists food_logs (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references profiles(id) on delete cascade not null,
  date        date default current_date,
  meal_type   text check (meal_type in ('breakfast', 'lunch', 'dinner', 'snack')),
  food_name   text not null,
  serving_size text default '100g',
  calories    int check (calories >= 0),
  protein     float default 0,
  carbs       float default 0,
  fat         float default 0,
  image_url   text,
  confidence  text check (confidence in ('high', 'medium', 'low')),
  ai_provider text,
  created_at  timestamptz default now()
);

create index food_logs_user_date on food_logs(user_id, date);

-- ─────────────────────────────────────────────
-- WORKOUT LOGS
-- ─────────────────────────────────────────────
create table if not exists workout_logs (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references profiles(id) on delete cascade not null,
  date        date default current_date,
  exercise    text not null,
  sets        int,
  reps        text,
  weight_kg   float,
  duration_sec int,
  completed   bool default false,
  notes       text,
  created_at  timestamptz default now()
);

create index workout_logs_user_date on workout_logs(user_id, date);

-- ─────────────────────────────────────────────
-- MEAL PLANS (AI Generated, cached)
-- ─────────────────────────────────────────────
create table if not exists meal_plans (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references profiles(id) on delete cascade not null,
  plan_json   jsonb not null,
  calories    int,
  ai_provider text,
  created_at  timestamptz default now()
);

-- Get most recent plan quickly
create index meal_plans_user_created on meal_plans(user_id, created_at desc);

-- ─────────────────────────────────────────────
-- WORKOUT PLANS (AI Generated, cached)
-- ─────────────────────────────────────────────
create table if not exists workout_plans (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid references profiles(id) on delete cascade not null,
  plan_json      jsonb not null,
  days_per_week  int,
  target_physique text,
  ai_provider    text,
  created_at     timestamptz default now()
);

create index workout_plans_user_created on workout_plans(user_id, created_at desc);

-- ─────────────────────────────────────────────
-- BODY SCANS
-- ─────────────────────────────────────────────
create table if not exists body_scans (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid references profiles(id) on delete cascade not null,
  estimated_bf_pct float,
  bf_range         text,
  body_type        text,
  transformation_plan jsonb,
  photo_url        text,
  ai_provider      text,
  scanned_at       timestamptz default now()
);

create index body_scans_user on body_scans(user_id, scanned_at desc);

-- ─────────────────────────────────────────────
-- ROW LEVEL SECURITY (RLS)
-- ─────────────────────────────────────────────
alter table profiles       enable row level security;
alter table food_logs      enable row level security;
alter table workout_logs   enable row level security;
alter table meal_plans     enable row level security;
alter table workout_plans  enable row level security;
alter table body_scans     enable row level security;

-- Policies: users can only access their own data
create policy "own profile"  on profiles      for all using (auth.uid() = id);
create policy "own food"     on food_logs     for all using (auth.uid() = user_id);
create policy "own workout"  on workout_logs  for all using (auth.uid() = user_id);
create policy "own meals"    on meal_plans    for all using (auth.uid() = user_id);
create policy "own wplans"   on workout_plans for all using (auth.uid() = user_id);
create policy "own scans"    on body_scans    for all using (auth.uid() = user_id);

-- Auto-create profile on signup
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into profiles (id, full_name)
  values (new.id, new.raw_user_meta_data->>'full_name');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();
