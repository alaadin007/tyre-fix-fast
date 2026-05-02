-- Extensions for scheduled fan-out
create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Jobs: enrich for dispatch
alter table public.jobs add column if not exists lat numeric;
alter table public.jobs add column if not exists lng numeric;
alter table public.jobs add column if not exists region text;
alter table public.jobs add column if not exists severity text;
alter table public.jobs add column if not exists is_duplicate boolean not null default false;
alter table public.jobs add column if not exists dispatch_phase int not null default 0;
alter table public.jobs add column if not exists dispatch_deadline timestamptz;
alter table public.jobs add column if not exists broadcast_count int not null default 0;

-- Quotes from technicians
create table if not exists public.quotes (
  id uuid primary key default gen_random_uuid(),
  job_id uuid references public.jobs(id) on delete cascade,
  technician_id uuid references public.technicians(id) on delete set null,
  price_gbp numeric,
  eta_minutes int,
  raw_message text,
  status text not null default 'pending', -- pending | accepted | lost | paid
  confidence text,
  created_at timestamptz not null default now()
);
alter table public.quotes enable row level security;
create policy "Anyone can view quotes" on public.quotes for select using (true);
create policy "Anyone can insert quotes" on public.quotes for insert with check (true);
create policy "Anyone can update quotes" on public.quotes for update using (true);

-- Reviews
create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  job_id uuid references public.jobs(id) on delete cascade,
  technician_id uuid references public.technicians(id) on delete set null,
  score int not null,
  comment text,
  created_at timestamptz not null default now()
);
alter table public.reviews enable row level security;
create policy "Anyone can view reviews" on public.reviews for select using (true);
create policy "Anyone can insert reviews" on public.reviews for insert with check (true);

-- Scheduled tasks (driven by pg_cron sweep)
create table if not exists public.scheduled_tasks (
  id uuid primary key default gen_random_uuid(),
  kind text not null, -- 'review_request' | 'dispatch_widen' | 'silence_check'
  payload jsonb not null default '{}'::jsonb,
  run_at timestamptz not null,
  done boolean not null default false,
  created_at timestamptz not null default now()
);
alter table public.scheduled_tasks enable row level security;
create policy "Anyone can view scheduled_tasks" on public.scheduled_tasks for select using (true);
create policy "Anyone can insert scheduled_tasks" on public.scheduled_tasks for insert with check (true);
create policy "Anyone can update scheduled_tasks" on public.scheduled_tasks for update using (true);
create index if not exists scheduled_tasks_run_at_idx on public.scheduled_tasks (run_at) where done = false;

-- Ops alerts (Co-Pilot inbox)
create table if not exists public.ops_alerts (
  id uuid primary key default gen_random_uuid(),
  level text not null default 'info', -- info | warn | critical
  title text not null,
  body text,
  job_id uuid references public.jobs(id) on delete set null,
  read boolean not null default false,
  created_at timestamptz not null default now()
);
alter table public.ops_alerts enable row level security;
create policy "Anyone can view ops_alerts" on public.ops_alerts for select using (true);
create policy "Anyone can insert ops_alerts" on public.ops_alerts for insert with check (true);
create policy "Anyone can update ops_alerts" on public.ops_alerts for update using (true);

-- Index helpers
create index if not exists jobs_dispatch_deadline_idx on public.jobs (dispatch_deadline) where status in ('intake_complete','broadcasting');
create index if not exists quotes_job_idx on public.quotes (job_id);

-- Seed default settings if missing
insert into public.app_settings (key, value)
values ('auto_dispatch', 'false'::jsonb)
on conflict do nothing;