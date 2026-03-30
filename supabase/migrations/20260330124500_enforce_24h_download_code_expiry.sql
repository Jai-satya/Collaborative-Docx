-- Enforce 24h expiry for download codes
update public.document_download_codes
set expires_at = now() + interval '24 hours'
where expires_at is null;

alter table public.document_download_codes
  alter column expires_at set default (now() + interval '24 hours');

alter table public.document_download_codes
  alter column expires_at set not null;

-- Replace active-code policies to use strict 24h expiry checks
drop policy if exists "Anyone can resolve active download codes" on public.document_download_codes;
create policy "Anyone can resolve active download codes"
on public.document_download_codes
for select
using (expires_at > now());

drop policy if exists "Anyone can view documents with active download code" on public.documents;
create policy "Anyone can view documents with active download code"
on public.documents
for select
using (
  exists (
    select 1
    from public.document_download_codes c
    where c.document_id = documents.id
      and c.expires_at > now()
  )
);
