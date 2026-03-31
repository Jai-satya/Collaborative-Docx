import { useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import {
  BadgeCheck,
  Copy,
  Download,
  FolderArchive,
  RefreshCw,
} from "lucide-react";

interface FolderCodeDialogProps {
  folderId: string;
}

const toBase36Code = (bytes: Uint8Array, length = 6) => {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "";

  for (let i = 0; i < bytes.length && code.length < length; i += 1) {
    code += alphabet[bytes[i] % alphabet.length];
  }

  return code;
};

const createShortCode = async (seed: string, length = 6) => {
  const data = new TextEncoder().encode(seed);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return toBase36Code(new Uint8Array(digest), length);
};

const FolderCodeDialog = ({ folderId }: FolderCodeDialogProps) => {
  const { toast } = useToast();
  const [code, setCode] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const loadExistingCode = async () => {
      const nowIso = new Date().toISOString();
      const { data } = await supabase
        .from("folder_download_codes")
        .select("code")
        .eq("folder_id", folderId)
        .gt("expires_at", nowIso)
        .maybeSingle();

      if (data?.code) setCode(data.code);
    };

    loadExistingCode();
  }, [folderId]);

  const generateCode = useMutation({
    mutationFn: async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) throw new Error("Please sign in first");

      let latestError: Error | null = null;
      for (let attempt = 0; attempt < 5; attempt += 1) {
        const seed = `${user.id}:${folderId}:${Date.now()}:${crypto.randomUUID()}`;
        const nextCode = await createShortCode(seed, 6);

        const { data, error } = await supabase
          .from("folder_download_codes")
          .upsert(
            {
              folder_id: folderId,
              code: nextCode,
              created_by: user.id,
              expires_at: new Date(
                Date.now() + 24 * 60 * 60 * 1000,
              ).toISOString(),
            },
            { onConflict: "folder_id" },
          )
          .select("code")
          .single();

        if (!error) return data.code;

        if (!error.message.toLowerCase().includes("duplicate")) {
          throw error;
        }

        latestError = error;
      }

      throw latestError || new Error("Could not generate a unique code");
    },
    onSuccess: (nextCode) => {
      setCode(nextCode);
      toast({ title: "Folder code ready", description: `Code: ${nextCode}` });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Could not generate folder code",
        description: error.message,
      });
    },
  });

  const copyCode = async () => {
    if (!code) return;
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="rounded-full gap-1.5">
          <FolderArchive className="h-3.5 w-3.5" /> Folder Code
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="end">
        <div className="space-y-3">
          <h4 className="font-display text-base font-semibold">
            Folder Download Code
          </h4>
          <p className="text-xs font-ui text-muted-foreground">
            Share this code so others can browse and download documents from
            this folder.
          </p>

          <div className="flex items-center gap-2">
            <Input
              value={code}
              readOnly
              placeholder="No code yet"
              className="font-ui text-sm"
            />
            <Button
              size="icon"
              variant="outline"
              onClick={copyCode}
              disabled={!code}
              className="shrink-0"
              title="Copy code"
            >
              {copied ? (
                <BadgeCheck className="h-4 w-4" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <Button
              onClick={() => generateCode.mutate()}
              disabled={generateCode.isPending}
              className="flex-1 rounded-full font-ui"
            >
              {generateCode.isPending ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                "Generate / Refresh"
              )}
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() =>
                window.open(
                  `${window.location.origin}/download-folder`,
                  "_blank",
                )
              }
              className="rounded-full"
              title="Open folder download page"
            >
              <Download className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default FolderCodeDialog;
