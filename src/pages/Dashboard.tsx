import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import DocumentList from "@/components/DocumentList";
import { Upload, Plus, LogOut, FileText, Trash2 } from "lucide-react";
import { motion } from "framer-motion";
import type { Tables } from "@/integrations/supabase/types";
import SEO from "@/components/SEO";
import { importDocumentFile } from "@/utils/document-import";

type DocumentRow = Tables<"documents">;

const Dashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [userName, setUserName] = useState("");
  const [viewMode, setViewMode] = useState<"active" | "trash">("active");
  const uploadInputRef = useRef<HTMLInputElement>(null);

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

  const uploadDocument = useMutation({
    mutationFn: async (file: File) => {
      const imported = await importDocumentFile(file);

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      const { data, error } = await supabase
        .from("documents")
        .insert([
          {
            title: imported.title,
            content: imported.content,
            created_by: user.id,
          },
        ])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data: DocumentRow) => {
      toast({
        title: "Document imported",
        description: "Your file is ready for editing.",
      });
      navigate(`/documents/${data.id}`);
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to import document",
      });
    },
  });

  const handleUploadClick = () => {
    uploadInputRef.current?.click();
  };

  const handleFileSelected = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;
    uploadDocument.mutate(file);
    event.target.value = "";
  };

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="Dashboard"
        description="Manage your documents, create new ones, and collaborate with your team in real-time."
        canonical="/dashboard"
        noindex
      />
      {/* Header */}
      <header className="border-b border-border/50 bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <h1 className="font-display text-lg sm:text-xl font-bold tracking-tight text-foreground shrink-0">
              Collaborative Docx
            </h1>
            <span className="text-border hidden sm:inline">|</span>
            <span className="font-ui text-sm text-muted-foreground hidden sm:inline truncate">
              Welcome, {userName}
            </span>
          </div>
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <input
              ref={uploadInputRef}
              type="file"
              className="hidden"
              accept=".docx,.doc,.txt,.md,.markdown,.html,.htm,.rtf"
              onChange={handleFileSelected}
            />
            <Button
              onClick={() => createDocument.mutate()}
              disabled={createDocument.isPending}
              className="font-ui text-sm rounded-full shadow-soft hover:shadow-elevated transition-all"
            >
              <Plus className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">New Document</span>
            </Button>
            <Button
              onClick={handleUploadClick}
              disabled={uploadDocument.isPending}
              className="font-ui text-sm rounded-full shadow-soft hover:shadow-elevated transition-all"
            >
              <Upload className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">
                {uploadDocument.isPending ? "Importing..." : "Upload Document"}
              </span>
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
      <main className="container mx-auto px-4 sm:px-6 py-6 sm:py-10">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="flex items-center justify-between gap-3 mb-6">
            <FileText className="h-5 w-5 text-primary" />
            <h2 className="font-display text-2xl font-semibold text-foreground">
              {viewMode === "active" ? "Your Documents" : "Trash"}
            </h2>
            <div className="ml-auto flex items-center gap-2">
              <Button
                size="sm"
                variant={viewMode === "active" ? "default" : "outline"}
                className="rounded-full"
                onClick={() => setViewMode("active")}
              >
                <FileText className="h-3.5 w-3.5 mr-1" /> Active
              </Button>
              <Button
                size="sm"
                variant={viewMode === "trash" ? "default" : "outline"}
                className="rounded-full"
                onClick={() => setViewMode("trash")}
              >
                <Trash2 className="h-3.5 w-3.5 mr-1" /> Trash
              </Button>
            </div>
          </div>
          <DocumentList showTrash={viewMode === "trash"} />
        </motion.div>
      </main>
    </div>
  );
};

export default Dashboard;
