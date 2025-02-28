
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
import { 
  Popover, 
  PopoverContent, 
  PopoverTrigger 
} from "@/components/ui/popover";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Share, Copy, Check } from "lucide-react";

interface Presence {
  user: {
    id: string;
    name: string;
    avatar?: string;
  };
  lastActive: string;
  cursor?: { x: number; y: number };
}

interface DocumentShare {
  id: string;
  document_id: string;
  share_token: string;
  permission_level: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

const Document = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [activeUsers, setActiveUsers] = useState<Presence[]>([]);
  const [shareLink, setShareLink] = useState("");
  const [sharePermission, setSharePermission] = useState("view");
  const [copied, setCopied] = useState(false);

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

  const createShareLink = useMutation({
    mutationFn: async (permission: string) => {
      // First, check if there's an existing share
      const { data: existingShare, error: fetchError } = await supabase
        .from('document_shares')
        .select('*')
        .eq('document_id', id)
        .single();
      
      // Generate a unique share token if needed
      const shareToken = existingShare?.share_token || crypto.randomUUID();
      
      if (existingShare) {
        // Update existing share
        const { error } = await supabase
          .from('document_shares')
          .update({ 
            permission_level: permission,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingShare.id);
        
        if (error) throw error;
        
        return {
          token: existingShare.share_token,
          url: `${window.location.origin}/shared/${existingShare.share_token}`
        };
      } else {
        // Create new share
        const userId = (await supabase.auth.getUser()).data.user?.id;
        
        const { data, error } = await supabase
          .from('document_shares')
          .insert({
            document_id: id,
            share_token: shareToken,
            permission_level: permission,
            created_by: userId
          })
          .select('*')
          .single();
        
        if (error) throw error;
        
        return {
          token: data.share_token,
          url: `${window.location.origin}/shared/${data.share_token}`
        };
      }
    },
    onSuccess: (result) => {
      setShareLink(result.url);
      toast({
        title: "Share link created",
        description: "The document can now be shared with others",
      });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to create share link",
      });
    },
  });

  const handleGenerateShareLink = () => {
    createShareLink.mutate(sharePermission);
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({
      title: "Link copied",
      description: "Share link copied to clipboard",
    });
  };

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
          
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="gap-2">
                <Share className="h-4 w-4" />
                Share
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80">
              <div className="space-y-4">
                <h4 className="font-medium">Share this document</h4>
                
                <div className="space-y-2">
                  <h5 className="text-sm font-medium">Permission</h5>
                  <RadioGroup 
                    value={sharePermission} 
                    onValueChange={setSharePermission}
                    className="flex flex-col space-y-1"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="view" id="r1" />
                      <Label htmlFor="r1">View only</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="edit" id="r2" />
                      <Label htmlFor="r2">Can edit</Label>
                    </div>
                  </RadioGroup>
                </div>
                
                {shareLink ? (
                  <div className="flex items-center gap-2">
                    <Input value={shareLink} readOnly className="flex-1" />
                    <Button 
                      size="icon" 
                      variant="outline" 
                      onClick={handleCopyLink}
                      className="flex-shrink-0"
                    >
                      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                ) : (
                  <Button 
                    onClick={handleGenerateShareLink}
                    disabled={createShareLink.isPending}
                  >
                    {createShareLink.isPending ? "Generating..." : "Generate link"}
                  </Button>
                )}
              </div>
            </PopoverContent>
          </Popover>
          
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
