import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Clock, RotateCcw, Eye, X, Trash2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { snapshotVersion } from "@/utils/version-utils";
import type { Tables } from "@/integrations/supabase/types";

type VersionRow = Tables<"document_versions">;

interface VersionHistoryProps {
  documentId: string;
  currentContent: string;
  onRestore: (content: string) => void;
  onClose: () => void;
}

const VersionHistory = ({
  documentId,
  currentContent,
  onRestore,
  onClose,
}: VersionHistoryProps) => {
  const [previewId, setPreviewId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data: versions = [], isLoading } = useQuery({
    queryKey: ["document_versions", documentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("document_versions")
        .select("*")
        .eq("document_id", documentId)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data as VersionRow[];
    },
    enabled: !!documentId,
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("document_versions")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["document_versions", documentId],
      });
    },
  });

  const handleRestore = async (version: VersionRow) => {
    await snapshotVersion(documentId, currentContent);
    queryClient.invalidateQueries({
      queryKey: ["document_versions", documentId],
    });
    onRestore(version.content);
  };

  const handleDelete = (id: string) => {
    deleteMutation.mutate(id);
    if (previewId === id) setPreviewId(null);
  };

  const previewVersion = versions.find((v) => v.id === previewId);

  return (
    <div className="bg-card border border-border/50 rounded-xl p-4 shadow-soft">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-display text-sm font-semibold flex items-center gap-2">
          <Clock className="h-4 w-4 text-primary" />
          Version History
        </h3>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 text-muted-foreground"
            onClick={onClose}
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-6">
          <div className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : versions.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-6">
          No versions saved yet. Versions are created automatically when you
          save.
        </p>
      ) : (
        <>
          <p className="text-xs text-muted-foreground mb-2">
            {versions.length} version{versions.length !== 1 ? "s" : ""} saved
          </p>
          <ScrollArea className="max-h-[400px]">
            <div className="space-y-1.5">
              {versions.map((version) => (
                <div
                  key={version.id}
                  className={`group rounded-lg border p-2.5 transition-colors cursor-pointer ${
                    previewId === version.id
                      ? "border-primary/50 bg-primary/5"
                      : "border-border/30 hover:border-border"
                  }`}
                  onClick={() =>
                    setPreviewId(previewId === version.id ? null : version.id)
                  }
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium">
                      {formatDistanceToNow(new Date(version.created_at), {
                        addSuffix: true,
                      })}
                    </span>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-5 w-5 p-0 text-muted-foreground hover:text-primary"
                        onClick={(e) => {
                          e.stopPropagation();
                          setPreviewId(
                            previewId === version.id ? null : version.id,
                          );
                        }}
                        title="Preview"
                      >
                        <Eye className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-5 w-5 p-0 text-muted-foreground hover:text-primary"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRestore(version);
                        }}
                        title="Restore this version"
                      >
                        <RotateCcw className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-5 w-5 p-0 text-muted-foreground hover:text-destructive"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(version.id);
                        }}
                        title="Delete"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  <div className="flex gap-3 mt-1 text-[10px] text-muted-foreground">
                    <span>{version.word_count} words</span>
                    <span>{version.char_count} chars</span>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>

          {/* Preview pane */}
          {previewVersion && (
            <div className="mt-3 border border-border/50 rounded-lg overflow-hidden">
              <div className="flex items-center justify-between bg-muted/50 px-3 py-1.5">
                <span className="text-[10px] font-medium text-muted-foreground">
                  Preview
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-6 text-[10px] px-2 gap-1"
                  onClick={() => handleRestore(previewVersion)}
                >
                  <RotateCcw className="h-2.5 w-2.5" />
                  Restore
                </Button>
              </div>
              <div
                className="p-3 text-xs max-h-[200px] overflow-y-auto editorial-prose"
                dangerouslySetInnerHTML={{ __html: previewVersion.content }}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default VersionHistory;
