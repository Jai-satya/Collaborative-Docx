
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from "date-fns";

interface VersionHistoryProps {
  documentId: string;
  onRestore: (content: string) => void;
}

const VersionHistory = ({ documentId, onRestore }: VersionHistoryProps) => {
  const { data: versions, isLoading } = useQuery({
    queryKey: ['versions', documentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('document_versions')
        .select('*')
        .eq('document_id', documentId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });

  if (isLoading) {
    return <div>Loading versions...</div>;
  }

  return (
    <div className="border rounded-lg p-4">
      <h3 className="text-lg font-semibold mb-4">Version History</h3>
      <ScrollArea className="h-[300px]">
        <div className="space-y-4">
          {versions?.map((version) => (
            <div key={version.id} className="flex items-center justify-between p-2 hover:bg-gray-50 rounded">
              <div>
                <p className="font-medium">Version {version.version_number}</p>
                <p className="text-sm text-gray-500">
                  {format(new Date(version.created_at), 'PPpp')}
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onRestore(version.content)}
              >
                Restore
              </Button>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
};

export default VersionHistory;
