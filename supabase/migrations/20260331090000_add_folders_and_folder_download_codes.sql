-- Add folder organization and folder-level download codes

create table if not exists public.folders (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.folders enable row level security;

create policy "Users can view their own folders"
on public.folders
for select
using (auth.uid() = created_by);

create policy "Users can create folders"
on public.folders
for insert
with check (auth.uid() = created_by);

create policy "Users can update their own folders"
on public.folders
for update
using (auth.uid() = created_by)
with check (auth.uid() = created_by);

create policy "Users can delete their own folders"
on public.folders
for delete
using (auth.uid() = created_by);

create trigger update_folders_updated_at
before update on public.folders
for each row execute function public.update_updated_at_column();

alter table public.documents
  add column if not exists folder_id uuid references public.folders(id) on delete set null;

create index if not exists idx_documents_folder_id on public.documents(folder_id);

create table if not exists public.folder_download_codes (
  id uuid primary key default gen_random_uuid(),
  folder_id uuid not null references public.folders(id) on delete cascade,
  code text not null unique,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '24 hours')
);

create unique index if not exists idx_folder_download_codes_folder_id
  on public.folder_download_codes(folder_id);
create index if not exists idx_folder_download_codes_code
  on public.folder_download_codes(code);

alter table public.folder_download_codes enable row level security;

create policy "Owners can view their folder download codes"
on public.folder_download_codes
for select
using (auth.uid() = created_by);

create policy "Owners can create folder download codes"
on public.folder_download_codes
for insert
with check (auth.uid() = created_by);

create policy "Owners can update folder download codes"
on public.folder_download_codes
for update
using (auth.uid() = created_by)
with check (auth.uid() = created_by);

create policy "Anyone can resolve active folder download codes"
on public.folder_download_codes
for select
using (expires_at > now());

create policy "Anyone can view folders with active folder download code"
on public.folders
for select
using (
  exists (
    select 1
    from public.folder_download_codes c
    where c.folder_id = folders.id
      and c.expires_at > now()
  )
);

create policy "Anyone can view documents with active folder download code"
on public.documents
for select
using (
  exists (
    select 1
    from public.folder_download_codes c
    where c.folder_id = documents.folder_id
      and c.expires_at > now()
  )
);
