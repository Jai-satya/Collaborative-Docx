import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Share, Copy, Check, Lock } from "lucide-react";
import { hashPassword } from "@/utils/password-utils";

interface DocumentShareDialogProps {
  documentId: string;
}

const DocumentShareDialog = ({ documentId }: DocumentShareDialogProps) => {
  const { toast } = useToast();
  const [shareLink, setShareLink] = useState("");
  const [sharePermission, setSharePermission] = useState("view");
  const [isPasswordProtected, setIsPasswordProtected] = useState(false);
  const [sharePassword, setSharePassword] = useState("");
  const [copied, setCopied] = useState(false);

  const createShareLink = useMutation({
    mutationFn: async ({ permission, isPasswordProtected, password }: {
      permission: string;
      isPasswordProtected: boolean;
      password?: string;
    }) => {
      const { data: existingShare } = await supabase
        .from('document_shares')
        .select('*')
        .eq('document_id', documentId)
        .single();

      const shareToken = (existingShare as any)?.share_token || crypto.randomUUID();

      let passwordHash = null;
      if (isPasswordProtected && password) {
        passwordHash = await hashPassword(password);
      }

      if (existingShare) {
        const { error } = await supabase
          .from('document_shares')
          .update({
            permission_level: permission,
            is_password_protected: isPasswordProtected,
            password_hash: passwordHash,
            updated_at: new Date().toISOString()
          })
          .eq('id', (existingShare as any).id);
        if (error) throw error;
        return { url: `${window.location.origin}/shared/${(existingShare as any).share_token}` };
      } else {
        const userId = (await supabase.auth.getUser()).data.user?.id;
        const { data, error } = await supabase
          .from('document_shares')
          .insert({
            document_id: documentId,
            share_token: shareToken,
            permission_level: permission,
            is_password_protected: isPasswordProtected,
            password_hash: passwordHash,
            created_by: userId
          })
          .select('*')
          .single();
        if (error) throw error;
        return { url: `${window.location.origin}/shared/${(data as any).share_token}` };
      }
    },
    onSuccess: (result) => {
      setShareLink(result.url);
      toast({ title: "Share link created" });
    },
    onError: () => {
      toast({ variant: "destructive", title: "Error", description: "Failed to create share link" });
    },
  });

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="font-ui text-sm rounded-full gap-1.5">
          <Share className="h-3.5 w-3.5" />
          Share
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="end">
        <div className="space-y-4">
          <h4 className="font-display text-base font-semibold">Share document</h4>

          <div className="space-y-2">
            <Label className="font-ui text-xs text-muted-foreground uppercase tracking-wider">Permission</Label>
            <RadioGroup value={sharePermission} onValueChange={setSharePermission} className="flex flex-col space-y-1">
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="view" id="r1" />
                <Label htmlFor="r1" className="font-ui text-sm">View only</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="edit" id="r2" />
                <Label htmlFor="r2" className="font-ui text-sm">Can edit</Label>
              </div>
            </RadioGroup>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="password-protection"
              checked={isPasswordProtected}
              onCheckedChange={(checked) => setIsPasswordProtected(checked === true)}
            />
            <Label htmlFor="password-protection" className="flex items-center font-ui text-sm">
              <Lock className="h-3.5 w-3.5 mr-1.5" />
              Password protect
            </Label>
          </div>

          {isPasswordProtected && (
            <Input
              type="password"
              value={sharePassword}
              onChange={(e) => setSharePassword(e.target.value)}
              placeholder="Enter password"
              className="font-ui text-sm"
            />
          )}

          {shareLink ? (
            <div className="flex items-center gap-2">
              <Input value={shareLink} readOnly className="flex-1 font-ui text-xs" />
              <Button size="icon" variant="outline" onClick={handleCopyLink} className="shrink-0">
                {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              </Button>
            </div>
          ) : (
            <Button
              onClick={() => createShareLink.mutate({
                permission: sharePermission,
                isPasswordProtected,
                password: isPasswordProtected ? sharePassword : undefined
              })}
              disabled={createShareLink.isPending || (isPasswordProtected && !sharePassword)}
              className="w-full font-ui text-sm rounded-full"
            >
              {createShareLink.isPending ? "Generating..." : "Generate link"}
            </Button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default DocumentShareDialog;
