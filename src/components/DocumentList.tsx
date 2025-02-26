
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { format } from "date-fns";

const DocumentList = () => {
  const navigate = useNavigate();
  
  const { data: documents, isLoading } = useQuery({
    queryKey: ['documents'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .order('updated_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });

  if (isLoading) {
    return <div>Loading documents...</div>;
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {documents?.map((doc) => (
        <Card
          key={doc.id}
          className="cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => navigate(`/documents/${doc.id}`)}
        >
          <CardHeader>
            <CardTitle>{doc.title}</CardTitle>
            <CardDescription>
              Last updated: {format(new Date(doc.updated_at), 'PPP')}
            </CardDescription>
          </CardHeader>
        </Card>
      ))}
    </div>
  );
};

export default DocumentList;
