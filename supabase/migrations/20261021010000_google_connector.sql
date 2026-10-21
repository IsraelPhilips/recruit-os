create table public.google_connections (
  id uuid primary key default gen_random_uuid(), recruiter_id uuid not null unique,
  refresh_token_ciphertext text not null, google_subject text,
  connected_at timestamptz not null default now(), token_error text
);
create table public.google_forms (
  id uuid primary key default gen_random_uuid(), connection_id uuid not null references public.google_connections(id) on delete cascade,
  form_id text not null unique, form_title text not null, job_id uuid not null references public.jobs(id),
  field_mapping jsonb not null, watch_id text, watch_expires_at timestamptz,
  last_response_at timestamptz, last_sync_at timestamptz, sync_error text,
  created_at timestamptz not null default now()
);
create index google_forms_renew_idx on public.google_forms(watch_expires_at);
alter table public.google_connections enable row level security;
alter table public.google_forms enable row level security;
revoke all on public.google_connections, public.google_forms from anon, authenticated;
grant all on public.google_connections, public.google_forms to service_role;
