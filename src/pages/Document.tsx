
import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import DocumentEditor from "@/components/DocumentEditor";
import Comments from "@/components/Comments";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const Document = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");

  const { data: document, isLoading } = useQuery({
    queryKey: ['document', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  useEffect(() => {
    if (document) {
      setTitle(document.title);
      setContent(document.content || '');
    }
  }, [document]);

  // Set up real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel('document_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'documents',
          filter: `id=eq.${id}`,
        },
        (payload) => {
          queryClient.invalidateQueries({ queryKey: ['document', id] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id, queryClient]);

  const updateDocument = useMutation({
    mutationFn: async ({ title, content }: { title: string; content: string }) => {
      const { error } = await supabase
        .from('documents')
        .update({ title, content, updated_at: new Date().toISOString() })
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['document', id] });
      toast({
        title: "Success",
        description: "Document saved successfully",
      });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to save document",
      });
    },
  });

  const handleSave = () => {
    updateDocument.mutate({ title, content });
  };

  if (isLoading) {
    return <div>Loading document...</div>;
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8 flex items-center justify-between">
        <div className="flex-1 mr-4">
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Document Title"
            className="text-2xl font-bold"
          />
        </div>
        <div className="flex gap-2">
          <Button onClick={() => navigate("/dashboard")}>Back</Button>
          <Button onClick={handleSave} disabled={updateDocument.isPending}>
            {updateDocument.isPending ? "Saving..." : "Save"}
          </Button>
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <DocumentEditor content={content} onUpdate={setContent} />
        </div>
        <div>
          <Comments documentId={id!} />
        </div>
      </div>
    </div>
  );
};

export default Document;
