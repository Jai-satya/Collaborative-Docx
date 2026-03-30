-- Map short download codes to documents
create table if not exists public.document_download_codes (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.documents(id) on delete cascade,
  code text not null unique,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  expires_at timestamptz
);

create unique index if not exists idx_document_download_codes_document_id
  on public.document_download_codes(document_id);
create index if not exists idx_document_download_codes_code
  on public.document_download_codes(code);

alter table public.document_download_codes enable row level security;

create policy "Owners can view their download codes"
on public.document_download_codes
for select
using (
  auth.uid() = created_by
);

create policy "Owners can create download codes"
on public.document_download_codes
for insert
with check (
  auth.uid() = created_by
);

create policy "Owners can update their download codes"
on public.document_download_codes
for update
using (
  auth.uid() = created_by
)
with check (
  auth.uid() = created_by
);

create policy "Anyone can resolve active download codes"
on public.document_download_codes
for select
using (
  expires_at is null or expires_at > now()
);

-- Allow reading documents that are mapped by an active code.
create policy "Anyone can view documents with active download code"
on public.documents
for select
using (
  exists (
    select 1
    from public.document_download_codes c
    where c.document_id = documents.id
      and (c.expires_at is null or c.expires_at > now())
  )
);
