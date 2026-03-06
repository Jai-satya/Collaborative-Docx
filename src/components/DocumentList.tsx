import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { format } from "date-fns";
import { motion } from "framer-motion";
import { FileText, Clock } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

type DocumentRow = Tables<"documents">;

const DocumentList = () => {
  const navigate = useNavigate();

  const { data: documents, isLoading } = useQuery({
    queryKey: ["documents"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("documents")
        .select("*")
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

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
          No documents yet.
        </p>
        <p className="font-ui text-sm text-muted-foreground/60 mt-1">
          Create your first document to get started.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {documents.map((doc: DocumentRow, i: number) => (
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
            onClick={() => navigate(`/documents/${doc.id}`)}
          >
            <CardHeader className="pb-4">
              <div className="flex items-start justify-between">
                <FileText className="h-4 w-4 text-primary/60 mt-0.5 shrink-0" />
                <span
                  className={`text-xs font-ui px-2 py-0.5 rounded-full ${
                    doc.status === "draft"
                      ? "bg-muted text-muted-foreground"
                      : "bg-accent text-accent-foreground"
                  }`}
                >
                  {doc.status || "draft"}
                </span>
              </div>
              <CardTitle className="font-display text-lg font-semibold mt-2 group-hover:text-primary transition-colors">
                {doc.title}
              </CardTitle>
              <CardDescription className="font-ui text-xs flex items-center gap-1.5 text-muted-foreground">
                <Clock className="h-3 w-3" />
                {format(new Date(doc.updated_at), "MMM d, yyyy · h:mm a")}
              </CardDescription>
            </CardHeader>
          </Card>
        </motion.div>
      ))}
    </div>
  );
};

export default DocumentList;
