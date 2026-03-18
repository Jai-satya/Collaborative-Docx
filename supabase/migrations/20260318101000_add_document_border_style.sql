alter table public.documents
add column if not exists document_border_style text not null default 'none';

alter table public.documents
add constraint documents_document_border_style_check
check (document_border_style in ('none', 'thin', 'medium', 'thick', 'accent'));
