import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { MessageCircle, Send } from "lucide-react";
import { format } from "date-fns";

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
    },
    onError: () => {
      toast({ variant: "destructive", title: "Error", description: "Failed to add comment" });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newComment.trim()) addComment.mutate(newComment);
  };

  return (
    <div className="space-y-4">
      <h3 className="font-display text-lg font-semibold flex items-center gap-2 text-foreground">
        <MessageCircle className="h-4 w-4 text-primary" />
        Comments
        {comments?.length ? (
          <span className="text-xs font-ui text-muted-foreground bg-muted px-2 py-0.5 rounded-full">{comments.length}</span>
        ) : null}
      </h3>

      <form onSubmit={handleSubmit} className="flex gap-2">
        <div className="flex-1 relative">
          <textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Add a comment..."
            rows={1}
            className="w-full px-3 py-2 text-sm font-ui bg-muted/50 border border-border/50 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-primary/30 transition-all placeholder:text-muted-foreground"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                if (newComment.trim()) addComment.mutate(newComment);
              }
            }}
          />
        </div>
        <Button type="submit" size="icon" disabled={addComment.isPending || !newComment.trim()} className="rounded-lg shrink-0">
          <Send className="h-4 w-4" />
        </Button>
      </form>

      <div className="space-y-3 max-h-[400px] overflow-y-auto editorial-scroll">
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2].map(i => <div key={i} className="h-16 bg-muted rounded-lg animate-pulse-subtle" />)}
          </div>
        ) : comments?.length ? (
          comments.map((comment) => (
            <div key={comment.id} className="p-3 bg-muted/40 border border-border/30 rounded-lg group">
              <p className="text-xs font-ui text-muted-foreground mb-1">
                {format(new Date(comment.created_at), 'MMM d · h:mm a')}
              </p>
              <p className="text-sm font-body text-foreground leading-relaxed">{comment.content}</p>
            </div>
          ))
        ) : (
          <p className="text-sm font-ui text-muted-foreground/60 text-center py-6">No comments yet</p>
        )}
      </div>
    </div>
  );
};

export default Comments;
