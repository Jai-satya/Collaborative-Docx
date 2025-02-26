
import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import DocumentEditor from "@/components/DocumentEditor";
import Comments from "@/components/Comments";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface Presence {
  user: {
    id: string;
    name: string;
    avatar?: string;
  };
  lastActive: string;
  cursor?: { x: number; y: number };
}

const Document = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [activeUsers, setActiveUsers] = useState<Presence[]>([]);

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

  // Set up real-time document subscription
  useEffect(() => {
    const channel = supabase
      .channel(`document:${id}`)
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

  // Set up presence channel for collaborative features
  useEffect(() => {
    let presenceChannel: ReturnType<typeof supabase.channel>;

    const setupPresence = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      presenceChannel = supabase.channel(`presence:${id}`, {
        config: {
          presence: {
            key: user.id,
          },
        },
      });

      presenceChannel
        .on('presence', { event: 'sync' }, () => {
          const state = presenceChannel.presenceState();
          const users = Object.values(state).flat().map((p: any) => ({
            user: p.user,
            lastActive: new Date().toISOString(),
            cursor: p.cursor,
          }));
          setActiveUsers(users);
        })
        .subscribe(async (status) => {
          if (status === 'SUBSCRIBED') {
            await presenceChannel.track({
              user: {
                id: user.id,
                name: user.email?.split('@')[0] || 'Anonymous',
                avatar: user.user_metadata?.avatar_url,
              },
            });
          }
        });
    };

    setupPresence();

    return () => {
      if (presenceChannel) {
        supabase.removeChannel(presenceChannel);
      }
    };
  }, [id]);

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
        <div className="flex items-center gap-4">
          <div className="flex -space-x-2">
            {activeUsers.map((presence) => (
              <div key={presence.user.id} className="relative">
                <Avatar className="border-2 border-white">
                  <AvatarImage src={presence.user.avatar} />
                  <AvatarFallback>{presence.user.name[0].toUpperCase()}</AvatarFallback>
                </Avatar>
                <span className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white" />
              </div>
            ))}
          </div>
          <Button onClick={() => navigate("/dashboard")}>Back</Button>
          <Button onClick={handleSave} disabled={updateDocument.isPending}>
            {updateDocument.isPending ? "Saving..." : "Save"}
          </Button>
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <DocumentEditor 
            content={content} 
            onUpdate={setContent}
            documentId={id!}
          />
        </div>
        <div>
          <Comments documentId={id!} />
        </div>
      </div>
    </div>
  );
};

export default Document;
