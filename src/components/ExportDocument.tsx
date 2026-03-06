import { memo, useCallback, useState } from "react";
import { Editor } from "@tiptap/react";
import { Button } from "@/components/ui/button";
import {
  Download,
  X,
  FileText,
  Code2,
  FileCode,
  FileJson,
  Copy,
  Check,
} from "lucide-react";

interface ExportDocumentProps {
  editor: Editor;
  documentTitle?: string;
  onClose: () => void;
}

function htmlToMarkdown(html: string): string {
  let md = html;
  // Headings
  md = md.replace(/<h1[^>]*>(.*?)<\/h1>/gi, "# $1\n\n");
  md = md.replace(/<h2[^>]*>(.*?)<\/h2>/gi, "## $1\n\n");
  md = md.replace(/<h3[^>]*>(.*?)<\/h3>/gi, "### $1\n\n");
  md = md.replace(/<h4[^>]*>(.*?)<\/h4>/gi, "#### $1\n\n");
  // Bold, italic, underline
  md = md.replace(/<strong[^>]*>(.*?)<\/strong>/gi, "**$1**");
  md = md.replace(/<em[^>]*>(.*?)<\/em>/gi, "*$1*");
  md = md.replace(/<u[^>]*>(.*?)<\/u>/gi, "$1");
  md = md.replace(/<s[^>]*>(.*?)<\/s>/gi, "~~$1~~");
  // Code blocks
  md = md.replace(/<pre[^>]*><code[^>]*>(.*?)<\/code><\/pre>/gis, "```\n$1\n```\n\n");
  md = md.replace(/<code[^>]*>(.*?)<\/code>/gi, "`$1`");
  // Links
  md = md.replace(/<a[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/gi, "[$2]($1)");
  // Images
  md = md.replace(/<img[^>]*src="([^"]*)"[^>]*alt="([^"]*)"[^>]*\/?>/gi, "![$2]($1)");
  // Lists
  md = md.replace(/<ul[^>]*>/gi, "\n");
  md = md.replace(/<\/ul>/gi, "\n");
  md = md.replace(/<ol[^>]*>/gi, "\n");
  md = md.replace(/<\/ol>/gi, "\n");
  md = md.replace(/<li[^>]*>(.*?)<\/li>/gi, "- $1\n");
  // Blockquote
  md = md.replace(/<blockquote[^>]*>(.*?)<\/blockquote>/gis, "> $1\n\n");
  // Horizontal rule
  md = md.replace(/<hr[^>]*\/?>/gi, "---\n\n");
  // Paragraphs & breaks
  md = md.replace(/<br[^>]*\/?>/gi, "\n");
  md = md.replace(/<p[^>]*>(.*?)<\/p>/gi, "$1\n\n");
  // Strip remaining HTML
  md = md.replace(/<[^>]+>/g, "");
  // Decode entities
  md = md.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&nbsp;/g, " ");
  // Clean excess newlines
  md = md.replace(/\n{3,}/g, "\n\n").trim();
  return md;
}

function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

const ExportDocument = memo(
  ({ editor, documentTitle = "document", onClose }: ExportDocumentProps) => {
    const [copiedFormat, setCopiedFormat] = useState<string | null>(null);

    const safeName = documentTitle.replace(/[^a-zA-Z0-9-_ ]/g, "").trim() || "document";

    const getContent = useCallback(
      (format: "html" | "markdown" | "text" | "json") => {
        switch (format) {
          case "html":
            return editor.getHTML();
          case "markdown":
            return htmlToMarkdown(editor.getHTML());
          case "text":
            return editor.state.doc.textContent;
          case "json":
            return JSON.stringify(editor.getJSON(), null, 2);
        }
      },
      [editor],
    );

    const handleCopy = useCallback(
      async (format: "html" | "markdown" | "text" | "json") => {
        const content = getContent(format);
        await navigator.clipboard.writeText(content);
        setCopiedFormat(format);
        setTimeout(() => setCopiedFormat(null), 2000);
      },
      [getContent],
    );

    const handleDownload = useCallback(
      (format: "html" | "markdown" | "text" | "json") => {
        const content = getContent(format);
        const extensions: Record<string, string> = {
          html: ".html",
          markdown: ".md",
          text: ".txt",
          json: ".json",
        };
        const mimeTypes: Record<string, string> = {
          html: "text/html",
          markdown: "text/markdown",
          text: "text/plain",
          json: "application/json",
        };
        downloadFile(content, `${safeName}${extensions[format]}`, mimeTypes[format]);
      },
      [getContent, safeName],
    );

    const formats = [
      { id: "html" as const, label: "HTML", icon: <Code2 className="h-4 w-4" />, desc: "Web-ready format" },
      { id: "markdown" as const, label: "Markdown", icon: <FileCode className="h-4 w-4" />, desc: "GitHub, blogs, docs" },
      { id: "text" as const, label: "Plain Text", icon: <FileText className="h-4 w-4" />, desc: "Universal text format" },
      { id: "json" as const, label: "JSON", icon: <FileJson className="h-4 w-4" />, desc: "Structured data format" },
    ];

    return (
      <div className="border border-border/50 rounded-lg bg-card p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Download className="h-4 w-4 text-primary" />
            <h3 className="font-ui text-sm font-semibold">Export</h3>
          </div>
          <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={onClose}>
            <X className="h-3 w-3" />
          </Button>
        </div>

        <div className="space-y-2">
          {formats.map(({ id, label, icon, desc }) => (
            <div key={id} className="flex items-center gap-2 p-2 rounded-md hover:bg-muted/50 transition-colors group">
              <div className="text-muted-foreground">{icon}</div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-ui font-medium text-foreground">{label}</div>
                <div className="text-[10px] font-ui text-muted-foreground">{desc}</div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0"
                onClick={() => handleCopy(id)}
              >
                {copiedFormat === id ? (
                  <Check className="h-3 w-3 text-green-600" />
                ) : (
                  <Copy className="h-3 w-3" />
                )}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0"
                onClick={() => handleDownload(id)}
              >
                <Download className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>
      </div>
    );
  },
);

ExportDocument.displayName = "ExportDocument";

export default ExportDocument;
