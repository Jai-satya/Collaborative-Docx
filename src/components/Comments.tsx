
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";

interface Comment {
  id: string;
  content: string;
  created_at: string;
  created_by: string;
  document_id: string;
}

const Comments = ({ documentId }: { documentId: string }) => {
  const [newComment, setNewComment] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: comments, isLoading } = useQuery({
    queryKey: ['comments', documentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('comments')
        .select('*')
        .eq('document_id', documentId)
        .order('created_at', { ascending: true });
      
      if (error) throw error;
      return data as Comment[];
    },
  });

  const addComment = useMutation({
    mutationFn: async (content: string) => {
      const { error } = await supabase
        .from('comments')
        .insert([{ content, document_id: documentId }]);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments', documentId] });
      setNewComment("");
      toast({
        title: "Success",
        description: "Comment added successfully",
      });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to add comment",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newComment.trim()) {
      addComment.mutate(newComment);
    }
  };

  if (isLoading) {
    return <div>Loading comments...</div>;
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Comments</h3>
      <form onSubmit={handleSubmit} className="flex gap-2">
        <Input
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder="Add a comment..."
        />
        <Button type="submit" disabled={addComment.isPending}>
          {addComment.isPending ? "Adding..." : "Add"}
        </Button>
      </form>
      <div className="space-y-4">
        {comments?.map((comment) => (
          <div key={comment.id} className="p-3 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600">
              {new Date(comment.created_at).toLocaleDateString()}
            </p>
            <p className="mt-1">{comment.content}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Comments;
