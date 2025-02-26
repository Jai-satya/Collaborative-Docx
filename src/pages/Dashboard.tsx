
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import DocumentList from "@/components/DocumentList";
import { Plus } from "lucide-react";

const Dashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
      }
    };
    
    checkUser();
  }, [navigate]);

  const createDocument = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase
        .from('documents')
        .insert([{ title: 'Untitled Document' }])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      navigate(`/documents/${data.id}`);
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to create document",
      });
    },
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto py-8 px-4">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold">Your Documents</h1>
          <Button onClick={() => createDocument.mutate()} disabled={createDocument.isPending}>
            <Plus className="h-4 w-4 mr-2" />
            New Document
          </Button>
        </div>
        <DocumentList />
      </div>
    </div>
  );
};

export default Dashboard;
