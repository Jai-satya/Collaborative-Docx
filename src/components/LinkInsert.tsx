import { useState, useCallback, useEffect, memo } from "react";
import { Editor } from "@tiptap/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Link2, Unlink, ExternalLink, Check } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface LinkInsertProps {
  editor: Editor;
}

const LinkInsert = memo(({ editor }: LinkInsertProps) => {
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState("");

  const isActive = editor.isActive("link");

  useEffect(() => {
    if (open && isActive) {
      const href = editor.getAttributes("link").href || "";
      setUrl(href);
    } else if (open) {
      setUrl("");
    }
  }, [open, isActive, editor]);

  const handleSetLink = useCallback(() => {
    if (!url.trim()) {
      editor.chain().focus().unsetLink().run();
      setOpen(false);
      return;
    }

    // Basic URL validation — add protocol if missing
    let finalUrl = url.trim();
    if (!/^https?:\/\//i.test(finalUrl) && !finalUrl.startsWith("mailto:")) {
      finalUrl = "https://" + finalUrl;
    }

    editor
      .chain()
      .focus()
      .extendMarkRange("link")
      .setLink({ href: finalUrl, target: "_blank" })
      .run();
    setOpen(false);
  }, [editor, url]);

  const handleUnlink = useCallback(() => {
    editor.chain().focus().unsetLink().run();
    setOpen(false);
  }, [editor]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={`h-8 w-8 p-0 rounded-md transition-colors ${
            isActive
              ? "bg-accent text-accent-foreground"
              : "text-muted-foreground hover:text-foreground hover:bg-muted"
          }`}
        >
          <Link2 className="h-3.5 w-3.5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-3" align="start" side="bottom">
        <div className="space-y-2">
          <div className="text-xs font-ui font-medium text-foreground">
            {isActive ? "Edit Link" : "Insert Link"}
          </div>
          <div className="flex gap-1.5">
            <Input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com"
              className="h-8 text-xs font-ui flex-1"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleSetLink();
                }
                if (e.key === "Escape") setOpen(false);
              }}
              autoFocus
            />
            <Button size="sm" className="h-8 w-8 p-0" onClick={handleSetLink}>
              <Check className="h-3.5 w-3.5" />
            </Button>
          </div>
          {isActive && (
            <div className="flex gap-1.5 pt-1 border-t border-border/50">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs font-ui flex-1"
                onClick={() => {
                  const href = editor.getAttributes("link").href;
                  if (href) window.open(href, "_blank", "noopener,noreferrer");
                }}
              >
                <ExternalLink className="h-3 w-3 mr-1" />
                Open
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs font-ui flex-1 text-destructive hover:text-destructive"
                onClick={handleUnlink}
              >
                <Unlink className="h-3 w-3 mr-1" />
                Remove
              </Button>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
});

LinkInsert.displayName = "LinkInsert";

export default LinkInsert;
