create table public.evidence_revisions (
  id uuid primary key default gen_random_uuid(),
  evidence_id uuid not null references public.evidence_items(id) on delete cascade,
  application_id uuid not null references public.applications(id) on delete cascade,
  author_id uuid not null,
  previous_status text not null,
  previous_excerpt text,
  revised_status text not null,
  revised_excerpt text,
  note text,
  created_at timestamptz not null default now()
);
create index evidence_revisions_application_idx on public.evidence_revisions(application_id,created_at desc);
alter table public.evidence_revisions enable row level security;
revoke all on public.evidence_revisions from anon, authenticated;
grant all on public.evidence_revisions to service_role;

create function public.apply_evidence_correction(
  p_evidence_id uuid,p_application_id uuid,p_author_id uuid,p_status text,p_excerpt text,p_location text,p_mark text,p_note text
) returns void language plpgsql security definer set search_path=public as $$
declare prior public.evidence_items%rowtype;
begin
  select * into prior from public.evidence_items where id=p_evidence_id and application_id=p_application_id for update;
  if not found then raise exception 'Evidence unavailable'; end if;
  if p_status is distinct from prior.status or p_excerpt is distinct from prior.excerpt then
    insert into public.evidence_revisions(evidence_id,application_id,author_id,previous_status,previous_excerpt,revised_status,revised_excerpt,note)
    values(p_evidence_id,p_application_id,p_author_id,prior.status,prior.excerpt,p_status,p_excerpt,p_note);
  end if;
  update public.evidence_items set status=p_status,excerpt=p_excerpt,location=p_location,review_mark=p_mark,reviewer_note=p_note
  where id=p_evidence_id and application_id=p_application_id;
end $$;
revoke all on function public.apply_evidence_correction(uuid,uuid,uuid,text,text,text,text,text) from public,anon,authenticated;
grant execute on function public.apply_evidence_correction(uuid,uuid,uuid,text,text,text,text,text) to service_role;
