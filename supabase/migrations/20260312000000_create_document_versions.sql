-- Create document_versions table for version history
CREATE TABLE public.document_versions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  word_count INTEGER NOT NULL DEFAULT 0,
  char_count INTEGER NOT NULL DEFAULT 0,
  created_by UUID REFERENCES auth.users(id) DEFAULT auth.uid(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.document_versions ENABLE ROW LEVEL SECURITY;

-- Users can view versions of their own documents
CREATE POLICY "Users can view versions of their documents" ON public.document_versions
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.documents WHERE documents.id = document_versions.document_id AND documents.created_by = auth.uid())
    OR created_by = auth.uid()
  );

-- Users can view versions of shared documents
CREATE POLICY "Users can view versions of shared documents" ON public.document_versions
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.document_shares WHERE document_shares.document_id = document_versions.document_id)
  );

-- Authenticated users can insert versions
CREATE POLICY "Users can create versions" ON public.document_versions
  FOR INSERT WITH CHECK (auth.uid() = created_by);

-- Users can delete versions they created
CREATE POLICY "Users can delete their own versions" ON public.document_versions
  FOR DELETE USING (created_by = auth.uid());

-- Index for fast lookups by document
CREATE INDEX idx_document_versions_document_id ON public.document_versions(document_id, created_at DESC);
