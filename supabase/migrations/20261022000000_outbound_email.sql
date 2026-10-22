create table public.gmail_connections (
  recruiter_id uuid primary key,
  email text not null,
  refresh_token_ciphertext text not null,
  connected_at timestamptz not null default now(),
  token_error text
);

create table public.outbound_messages (
  id uuid primary key,
  application_id uuid not null references public.applications(id) on delete cascade,
  author_id uuid not null,
  approver_id uuid,
  message_type text not null check (message_type in ('acknowledgment','clarification','update','rejection')),
  human_outcome text check (human_outcome in ('reject','continue','hold')),
  recipient text not null,
  sender text,
  subject text not null,
  body text not null,
  status text not null default 'draft' check (status in ('draft','sending','sent','failed','uncertain')),
  draft_source text not null default 'template' check (draft_source in ('template','reviewer')),
  approved_at timestamptz,
  send_started_at timestamptz,
  sent_at timestamptz,
  gmail_message_id text,
  error_category text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (message_type <> 'rejection' or human_outcome = 'reject')
);
create index outbound_messages_application_idx on public.outbound_messages(application_id,created_at desc);
alter table public.gmail_connections enable row level security;
alter table public.outbound_messages enable row level security;
revoke all on public.gmail_connections, public.outbound_messages from anon, authenticated;
grant all on public.gmail_connections, public.outbound_messages to service_role;
