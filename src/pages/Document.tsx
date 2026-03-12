import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import DocumentEditor from "@/components/DocumentEditor";
import Comments from "@/components/Comments";
import DocumentShareDialog from "@/components/DocumentShareDialog";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ArrowLeft, Save, Check } from "lucide-react";
import { snapshotVersion } from "@/utils/version-utils";
import SEO from "@/components/SEO";
import { motion } from "framer-motion";
import type { Tables } from "@/integrations/supabase/types";

interface Presence {
  user: { id: string; name: string; avatar?: string };
  lastActive: string;
  cursor?: { x: number; y: number };
}

type DocumentRow = Tables<"documents">;

interface PresencePayload {
  user: Presence["user"];
  cursor?: Presence["cursor"];
}

const Document = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [activeUsers, setActiveUsers] = useState<Presence[]>([]);
  const [saved, setSaved] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);

  // Wait for auth session to restore before doing anything
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate("/auth");
      } else {
        setSessionReady(true);
      }
    });
  }, [navigate]);

  const {
    data: document,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["document", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("documents")
        .select("*")
        .eq("id", id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id && sessionReady,
    retry: 1,
  });

  useEffect(() => {
    if (document) {
      const typedDocument = document as DocumentRow;
      setTitle(typedDocument.title);
      setContent(typedDocument.content || "");
    }
  }, [document]);

  // Real-time document subscription
  useEffect(() => {
    const channel = supabase
      .channel(`document:${id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "documents",
          filter: `id=eq.${id}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["document", id] });
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [id, queryClient]);

  // Presence channel
  useEffect(() => {
    let presenceChannel: ReturnType<typeof supabase.channel>;
    const setupPresence = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      presenceChannel = supabase.channel(`presence:${id}`, {
        config: { presence: { key: user.id } },
      });
      presenceChannel
        .on("presence", { event: "sync" }, () => {
          const state = presenceChannel.presenceState();
          const users = Object.values(state)
            .flat()
            .map((presence) => {
              const payload = presence as PresencePayload;
              return {
                user: payload.user,
                lastActive: new Date().toISOString(),
                cursor: payload.cursor,
              };
            });
          setActiveUsers(users);
        })
        .subscribe(async (status) => {
          if (status === "SUBSCRIBED") {
            await presenceChannel.track({
              user: {
                id: user.id,
                name: user.email?.split("@")[0] || "Anonymous",
                avatar: user.user_metadata?.avatar_url,
              },
            });
          }
        });
    };
    setupPresence();
    return () => {
      if (presenceChannel!) supabase.removeChannel(presenceChannel);
    };
  }, [id]);

  const updateDocument = useMutation({
    mutationFn: async ({
      title,
      content,
    }: {
      title: string;
      content: string;
    }) => {
      const { error } = await supabase
        .from("documents")
        .update({ title, content, updated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["document", id] });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to save document",
      });
    },
  });

  const handleSave = () => {
    updateDocument.mutate({ title, content });
    if (id) snapshotVersion(id, content);
  };

  // Ctrl+S to save manually
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        handleSave();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [title, content]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="font-ui text-sm text-muted-foreground">
            Loading document...
          </p>
        </div>
      </div>
    );
  }

  if (isError || (!isLoading && !document)) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center max-w-md">
          <h1 className="font-display text-4xl font-bold mb-3">
            Document not found
          </h1>
          <p className="font-body text-muted-foreground mb-6">
            This document may have been deleted, or you don't have permission to
            view it.
          </p>
          <Button
            onClick={() => navigate("/dashboard")}
            className="rounded-full"
          >
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title={title || "Untitled Document"}
        description={`Editing "${title || "Untitled Document"}" — collaborative document editor.`}
        noindex
      />
      {/* Top bar */}
      <header className="border-b border-border/50 bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 md:px-6 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => navigate("/dashboard")}
              className="text-muted-foreground hover:text-foreground transition-colors shrink-0"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Untitled Document"
              className="font-display text-lg font-semibold bg-transparent border-none outline-none text-foreground placeholder:text-muted-foreground/50 w-full min-w-0 tracking-tight"
            />
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {/* Active users */}
            {activeUsers.length > 0 && (
              <div className="flex -space-x-1.5 mr-1">
                {activeUsers.slice(0, 4).map((presence) => (
                  <Avatar
                    key={presence.user.id}
                    className="h-7 w-7 border-2 border-background"
                  >
                    <AvatarImage src={presence.user.avatar} />
                    <AvatarFallback className="text-[10px] font-ui bg-primary text-primary-foreground">
                      {presence.user.name[0]?.toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                ))}
                {activeUsers.length > 4 && (
                  <div className="h-7 w-7 rounded-full bg-muted border-2 border-background flex items-center justify-center text-[10px] font-ui text-muted-foreground">
                    +{activeUsers.length - 4}
                  </div>
                )}
              </div>
            )}

            <DocumentShareDialog documentId={id!} />

            <Button
              onClick={handleSave}
              disabled={updateDocument.isPending}
              size="sm"
              className="font-ui text-sm rounded-full gap-1.5 shadow-soft"
            >
              {saved ? (
                <Check className="h-3.5 w-3.5" />
              ) : (
                <Save className="h-3.5 w-3.5" />
              )}
              {updateDocument.isPending
                ? "Saving..."
                : saved
                  ? "Saved"
                  : "Save"}
            </Button>
          </div>
        </div>
      </header>

      {/* Content */}
      <motion.main
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="container mx-auto px-4 md:px-6 py-8"
      >
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-8 max-w-6xl mx-auto">
          <div>
            <DocumentEditor
              content={content}
              onUpdate={setContent}
              documentId={id!}
            />
          </div>
          <aside className="hidden lg:block">
            <div className="sticky top-20">
              <Comments documentId={id!} />
            </div>
          </aside>
        </div>
      </motion.main>
    </div>
  );
};

export default Document;
