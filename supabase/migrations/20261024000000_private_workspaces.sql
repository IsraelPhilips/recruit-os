create table public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  is_legacy boolean not null default false,
  created_at timestamptz not null default now()
);
create unique index workspaces_one_legacy_idx on public.workspaces(is_legacy) where is_legacy;

create table public.workspace_members (
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'owner' check (role in ('owner','member')),
  created_at timestamptz not null default now(),
  primary key (workspace_id,user_id),
  unique(user_id)
);

insert into public.workspaces(name,is_legacy) values ('RecruitOS existing workspace',true);
alter table public.jobs add column workspace_id uuid references public.workspaces(id);
update public.jobs set workspace_id=(select id from public.workspaces where is_legacy);
alter table public.jobs alter column workspace_id set not null;
create index jobs_workspace_idx on public.jobs(workspace_id,created_at desc);

alter table public.workspaces enable row level security;
alter table public.workspace_members enable row level security;
revoke all on public.workspaces,public.workspace_members from anon,authenticated;
grant all on public.workspaces,public.workspace_members to service_role;

create or replace function public.ensure_recruitos_workspace(p_user_id uuid,p_claim_legacy boolean,p_name text)
returns uuid
language plpgsql
security invoker
set search_path = public, auth
as $$
declare
  result_id uuid;
begin
  if current_user <> 'service_role' then
    raise exception 'service role required';
  end if;
  perform pg_advisory_xact_lock(hashtextextended(p_user_id::text,0));
  select workspace_id into result_id from public.workspace_members where user_id=p_user_id;
  if result_id is not null then return result_id; end if;

  if p_claim_legacy then
    select id into result_id from public.workspaces where is_legacy for update;
    if result_id is not null and not exists(select 1 from public.workspace_members where workspace_id=result_id) then
      insert into public.workspace_members(workspace_id,user_id,role) values(result_id,p_user_id,'owner')
      on conflict(user_id) do nothing;
      select workspace_id into result_id from public.workspace_members where user_id=p_user_id;
      if result_id is not null then return result_id; end if;
    end if;
  end if;

  insert into public.workspaces(name) values (left(coalesce(nullif(trim(p_name),''),'My RecruitOS workspace'),120)) returning id into result_id;
  insert into public.workspace_members(workspace_id,user_id,role) values(result_id,p_user_id,'owner')
  on conflict(user_id) do update set workspace_id=excluded.workspace_id
  returning workspace_id into result_id;
  return result_id;
end;
$$;
revoke all on function public.ensure_recruitos_workspace(uuid,boolean,text) from public,anon,authenticated;
grant execute on function public.ensure_recruitos_workspace(uuid,boolean,text) to service_role;
