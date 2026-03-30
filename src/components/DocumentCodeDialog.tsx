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
import { BadgeCheck, Copy, Download, KeyRound, RefreshCw } from "lucide-react";

interface DocumentCodeDialogProps {
  documentId: string;
  content: string;
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

const DocumentCodeDialog = ({
  documentId,
  content,
}: DocumentCodeDialogProps) => {
  const { toast } = useToast();
  const [code, setCode] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const loadExistingCode = async () => {
      const nowIso = new Date().toISOString();
      const { data } = await supabase
        .from("document_download_codes")
        .select("code")
        .eq("document_id", documentId)
        .gt("expires_at", nowIso)
        .maybeSingle();

      if (data?.code) setCode(data.code);
    };

    loadExistingCode();
  }, [documentId]);

  const generateCode = useMutation({
    mutationFn: async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) throw new Error("Please sign in first");

      let latestError: Error | null = null;
      for (let attempt = 0; attempt < 5; attempt += 1) {
        const seed = `${user.id}:${documentId}:${content.length}:${Date.now()}:${crypto.randomUUID()}`;
        const nextCode = await createShortCode(seed, 6);

        const { data, error } = await supabase
          .from("document_download_codes")
          .upsert(
            {
              document_id: documentId,
              code: nextCode,
              created_by: user.id,
              expires_at: new Date(
                Date.now() + 24 * 60 * 60 * 1000,
              ).toISOString(),
            },
            { onConflict: "document_id" },
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
      toast({ title: "Download code ready", description: `Code: ${nextCode}` });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Could not generate code",
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
        <Button
          variant="outline"
          size="sm"
          className="font-ui text-sm rounded-full gap-1.5"
        >
          <KeyRound className="h-3.5 w-3.5" />
          Generate Code
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="end">
        <div className="space-y-3">
          <h4 className="font-display text-base font-semibold">
            Download Code
          </h4>
          <p className="text-xs font-ui text-muted-foreground">
            Share this 6-character code to download this document from any
            device.
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
                window.open(`${window.location.origin}/download`, "_blank")
              }
              className="rounded-full"
            >
              <Download className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default DocumentCodeDialog;
