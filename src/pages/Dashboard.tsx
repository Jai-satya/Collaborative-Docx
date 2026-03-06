import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import DocumentList from "@/components/DocumentList";
import { Plus, LogOut, FileText } from "lucide-react";
import { motion } from "framer-motion";
import type { Tables } from "@/integrations/supabase/types";

type DocumentRow = Tables<"documents">;

const Dashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [userName, setUserName] = useState("");

  useEffect(() => {
    const checkUser = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
      } else {
        setUserName(
          session.user.user_metadata?.full_name ||
            session.user.email?.split("@")[0] ||
            "Writer",
        );
      }
    };
    checkUser();
  }, [navigate]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  const createDocument = useMutation({
    mutationFn: async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");
      const { data, error } = await supabase
        .from("documents")
        .insert([{ title: "Untitled Document", created_by: user.id }])
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data: DocumentRow) => {
      navigate(`/documents/${data.id}`);
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to create document",
      });
    },
  });

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/50 bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="font-display text-xl font-bold tracking-tight text-foreground">
              Collaborative-Docx
            </h1>
            <span className="text-border">|</span>
            <span className="font-ui text-sm text-muted-foreground">
              Welcome, {userName}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <Button
              onClick={() => createDocument.mutate()}
              disabled={createDocument.isPending}
              className="font-ui text-sm rounded-full shadow-soft hover:shadow-elevated transition-all"
            >
              <Plus className="h-4 w-4 mr-2" />
              New Document
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleSignOut}
              className="text-muted-foreground hover:text-foreground"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="container mx-auto px-6 py-10">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="flex items-center gap-3 mb-8">
            <FileText className="h-5 w-5 text-primary" />
            <h2 className="font-display text-2xl font-semibold text-foreground">
              Your Documents
            </h2>
          </div>
          <DocumentList />
        </motion.div>
      </main>
    </div>
  );
};

export default Dashboard;
