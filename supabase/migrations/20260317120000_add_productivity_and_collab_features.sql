-- Add additive fields for tags and soft delete
ALTER TABLE public.documents
ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;

CREATE INDEX IF NOT EXISTS idx_documents_deleted_at ON public.documents(deleted_at);
CREATE INDEX IF NOT EXISTS idx_documents_tags_gin ON public.documents USING gin(tags);

-- Extend comments for threaded replies and resolve state
ALTER TABLE public.comments
ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES public.comments(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS is_resolved BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_comments_parent_id ON public.comments(parent_id);
CREATE INDEX IF NOT EXISTS idx_comments_is_resolved ON public.comments(is_resolved);

-- Allow comment updates for resolving threads by owners and collaborators with edit access
DROP POLICY IF EXISTS "Users can update comments on shared documents" ON public.comments;
CREATE POLICY "Users can update comments on shared documents"
ON public.comments
FOR UPDATE
USING (
  auth.uid() = created_by
  OR EXISTS (
    SELECT 1
    FROM public.documents d
    WHERE d.id = comments.document_id
      AND d.created_by = auth.uid()
  )
  OR EXISTS (
    SELECT 1
    FROM public.document_shares s
    WHERE s.document_id = comments.document_id
      AND s.permission_level = 'edit'
  )
)
WITH CHECK (
  auth.uid() = created_by
  OR EXISTS (
    SELECT 1
    FROM public.documents d
    WHERE d.id = comments.document_id
      AND d.created_by = auth.uid()
  )
  OR EXISTS (
    SELECT 1
    FROM public.document_shares s
    WHERE s.document_id = comments.document_id
      AND s.permission_level = 'edit'
  )
);
