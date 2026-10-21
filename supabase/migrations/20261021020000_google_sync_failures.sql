create table public.google_sync_failures (
  id uuid primary key default gen_random_uuid(), form_id text not null, response_id text not null,
  error_message text not null, retry_count integer not null default 1,
  last_attempt_at timestamptz not null default now(), resolved_at timestamptz,
  unique(form_id,response_id)
);
create index google_sync_failures_open_idx on public.google_sync_failures(last_attempt_at) where resolved_at is null;
alter table public.google_sync_failures enable row level security;
revoke all on public.google_sync_failures from anon, authenticated;
grant all on public.google_sync_failures to service_role;
