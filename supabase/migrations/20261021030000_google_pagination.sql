alter table public.google_forms add column sync_page_token text;
alter table public.google_forms add column sync_filter text;
alter table public.google_forms add column sync_newest_at timestamptz;
