import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { motion } from "framer-motion";
import { FileText, Clock, Search, Trash2, RotateCcw } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

type DocumentRow = Tables<"documents">;

const DocumentList = ({
  showTrash = false,
  folderFilter = "all",
}: {
  showTrash?: boolean;
  folderFilter?: string;
}) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTag, setSelectedTag] = useState("all");

  const { data: documents, isLoading } = useQuery({
    queryKey: ["documents", showTrash, folderFilter],
    queryFn: async () => {
      const query = supabase
        .from("documents")
        .select("*")
        .order("updated_at", { ascending: false });

      if (showTrash) {
        query.not("deleted_at", "is", null);
      } else {
        query.is("deleted_at", null);
      }

      if (folderFilter === "__unfiled__") {
        query.is("folder_id", null);
      } else if (folderFilter !== "all") {
        query.eq("folder_id", folderFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  const softDeleteDocument = useMutation({
    mutationFn: async (documentId: string) => {
      const { error } = await supabase
        .from("documents")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", documentId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents"] });
    },
  });

  const restoreDocument = useMutation({
    mutationFn: async (documentId: string) => {
      const { error } = await supabase
        .from("documents")
        .update({ deleted_at: null })
        .eq("id", documentId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents"] });
    },
  });

  const availableTags = useMemo(() => {
    const tags = (documents || []).flatMap(
      (doc) => (doc.tags || []) as string[],
    );
    return ["all", ...Array.from(new Set(tags))];
  }, [documents]);

  const filteredDocuments = useMemo(() => {
    const normalized = searchQuery.trim().toLowerCase();
    return (documents || []).filter((doc) => {
      const matchesSearch =
        !normalized ||
        doc.title.toLowerCase().includes(normalized) ||
        (doc.content || "").toLowerCase().includes(normalized);

      const docTags = (doc.tags || []) as string[];
      const matchesTag = selectedTag === "all" || docTags.includes(selectedTag);

      return matchesSearch && matchesTag;
    });
  }, [documents, searchQuery, selectedTag]);

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-32 rounded-xl bg-muted animate-pulse-subtle"
          />
        ))}
      </div>
    );
  }

  if (!documents?.length) {
    return (
      <div className="text-center py-20">
        <FileText className="h-12 w-12 text-muted-foreground/40 mx-auto mb-4" />
        <p className="font-body text-lg text-muted-foreground">
          {showTrash ? "Trash is empty." : "No documents yet."}
        </p>
        {!showTrash && (
          <p className="font-ui text-sm text-muted-foreground/60 mt-1">
            Create your first document to get started.
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row gap-3 md:items-center">
        <div className="relative flex-1">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search title or content..."
            className="pl-9"
          />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {availableTags.map((tag) => (
            <Button
              key={tag}
              size="sm"
              variant={selectedTag === tag ? "default" : "outline"}
              className="rounded-full"
              onClick={() => setSelectedTag(tag)}
            >
              {tag}
            </Button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredDocuments.map((doc: DocumentRow, i: number) => (
          <motion.div
            key={doc.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: 0.3,
              delay: i * 0.05,
              ease: [0.22, 1, 0.36, 1],
            }}
          >
            <Card
              className="cursor-pointer group border-border/50 hover:border-primary/30 hover:shadow-elevated transition-all duration-300 bg-card"
              onClick={() => {
                if (!showTrash) navigate(`/documents/${doc.id}`);
              }}
            >
              <CardHeader className="pb-4">
                <div className="flex items-start justify-between">
                  <FileText className="h-4 w-4 text-primary/60 mt-0.5 shrink-0" />
                  <div className="flex items-center gap-1">
                    <span
                      className={`text-xs font-ui px-2 py-0.5 rounded-full ${
                        doc.status === "draft"
                          ? "bg-muted text-muted-foreground"
                          : "bg-accent text-accent-foreground"
                      }`}
                    >
                      {doc.status || "draft"}
                    </span>
                    {showTrash ? (
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        onClick={(e) => {
                          e.stopPropagation();
                          restoreDocument.mutate(doc.id);
                        }}
                        aria-label="Restore document"
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                      </Button>
                    ) : (
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-muted-foreground hover:text-destructive"
                        onClick={(e) => {
                          e.stopPropagation();
                          softDeleteDocument.mutate(doc.id);
                        }}
                        aria-label="Move to trash"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
                <CardTitle className="font-display text-lg font-semibold mt-2 group-hover:text-primary transition-colors">
                  {doc.title}
                </CardTitle>
                {!!doc.tags?.length && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {doc.tags.map((tag) => (
                      <span
                        key={`${doc.id}-${tag}`}
                        className="text-[10px] font-ui px-2 py-0.5 rounded-full bg-muted text-muted-foreground"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
                <CardDescription className="font-ui text-xs flex items-center gap-1.5 text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  {format(new Date(doc.updated_at), "MMM d, yyyy · h:mm a")}
                </CardDescription>
              </CardHeader>
            </Card>
          </motion.div>
        ))}
      </div>

      {!filteredDocuments.length && (
        <p className="text-sm text-muted-foreground text-center py-8">
          No documents match your filters.
        </p>
      )}
    </div>
  );
};

export default DocumentList;
