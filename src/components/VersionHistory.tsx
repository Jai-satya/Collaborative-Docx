
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Clock } from "lucide-react";

interface VersionHistoryProps {
  documentId: string;
  onVersionSelect: (content: string) => void;
}

// This component is disabled until we set up document_versions table
const VersionHistory = ({ documentId, onVersionSelect }: VersionHistoryProps) => {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold flex items-center gap-2">
        <Clock className="h-4 w-4" />
        Version History
      </h3>
      <div className="bg-gray-50 p-4 rounded-lg text-center">
        <p>Version history feature is coming soon.</p>
      </div>
    </div>
  );
};

export default VersionHistory;
