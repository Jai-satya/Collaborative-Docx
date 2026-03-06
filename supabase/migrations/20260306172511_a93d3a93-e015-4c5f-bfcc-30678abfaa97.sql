
-- Create documents table
CREATE TABLE public.documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL DEFAULT 'Untitled Document',
  content TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  parent_id UUID REFERENCES public.documents(id),
  is_template BOOLEAN DEFAULT false,
  status TEXT DEFAULT 'draft'
);

ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own documents" ON public.documents FOR SELECT USING (auth.uid() = created_by);
CREATE POLICY "Users can create documents" ON public.documents FOR INSERT WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Users can update their own documents" ON public.documents FOR UPDATE USING (auth.uid() = created_by);
CREATE POLICY "Users can delete their own documents" ON public.documents FOR DELETE USING (auth.uid() = created_by);

-- Create comments table
CREATE TABLE public.comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_by UUID REFERENCES auth.users(id) DEFAULT auth.uid(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view comments on their documents" ON public.comments FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.documents WHERE documents.id = comments.document_id AND documents.created_by = auth.uid())
  OR created_by = auth.uid()
);
CREATE POLICY "Authenticated users can add comments" ON public.comments FOR INSERT WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Users can delete their own comments" ON public.comments FOR DELETE USING (auth.uid() = created_by);

-- Create document_shares table
CREATE TABLE public.document_shares (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  share_token TEXT NOT NULL UNIQUE,
  permission_level TEXT NOT NULL DEFAULT 'view',
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  is_password_protected BOOLEAN DEFAULT false,
  password_hash TEXT
);

ALTER TABLE public.document_shares ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own shares" ON public.document_shares FOR SELECT USING (created_by = auth.uid());
CREATE POLICY "Anyone can view shares by token" ON public.document_shares FOR SELECT USING (true);
CREATE POLICY "Users can create shares" ON public.document_shares FOR INSERT WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Users can update their own shares" ON public.document_shares FOR UPDATE USING (auth.uid() = created_by);

-- Allow shared document access
CREATE POLICY "Users can view shared documents" ON public.documents FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.document_shares WHERE document_shares.document_id = documents.id)
);

CREATE POLICY "Users can update shared documents with edit permission" ON public.documents FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.document_shares WHERE document_shares.document_id = documents.id AND document_shares.permission_level = 'edit')
);

-- Allow comments on shared documents
CREATE POLICY "Users can view comments on shared documents" ON public.comments FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.document_shares WHERE document_shares.document_id = comments.document_id)
);

CREATE POLICY "Users can comment on shared documents" ON public.comments FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.document_shares WHERE document_shares.document_id = comments.document_id AND document_shares.permission_level = 'edit')
);

-- Timestamp trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_documents_updated_at BEFORE UPDATE ON public.documents FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_document_shares_updated_at BEFORE UPDATE ON public.document_shares FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
