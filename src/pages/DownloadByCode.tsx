import { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Download, ArrowLeft } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import SEO from "@/components/SEO";

type DownloadFormat = "pdf" | "docx" | "md" | "txt";

type PdfLine = {
  text: string;
  font: "F1" | "F2" | "F3";
  size: number;
  indent: number;
  gapAfter: number;
};

function htmlToMarkdown(html: string): string {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  const out: string[] = [];

  const normalizeInline = (text: string) => text.replace(/\s+/g, " ").trim();

  Array.from(doc.body.children).forEach((el) => {
    const tag = el.tagName.toLowerCase();
    const text = normalizeInline(el.textContent || "");
    if (!text && tag !== "hr") return;

    if (tag === "h1") {
      out.push(`# ${text}`, "");
      return;
    }
    if (tag === "h2") {
      out.push(`## ${text}`, "");
      return;
    }
    if (tag === "h3" || tag === "h4") {
      out.push(`### ${text}`, "");
      return;
    }
    if (tag === "blockquote") {
      out.push(`> ${text}`, "");
      return;
    }
    if (tag === "pre") {
      out.push("```", ...(el.textContent || "").split(/\r?\n/), "```", "");
      return;
    }
    if (tag === "ul") {
      Array.from(el.querySelectorAll(":scope > li")).forEach((li) => {
        out.push(`- ${normalizeInline(li.textContent || "")}`);
      });
      out.push("");
      return;
    }
    if (tag === "ol") {
      Array.from(el.querySelectorAll(":scope > li")).forEach((li, idx) => {
        out.push(`${idx + 1}. ${normalizeInline(li.textContent || "")}`);
      });
      out.push("");
      return;
    }
    if (tag === "hr") {
      out.push("---", "");
      return;
    }

    out.push(text, "");
  });

  return out
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function extractReadableLines(html: string): string[] {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  const lines: string[] = [];

  const pushLine = (value: string, prefix = "") => {
    const text = value.replace(/\s+/g, " ").trim();
    if (text) lines.push(`${prefix}${text}`);
  };

  const pushElement = (el: Element) => {
    const tag = el.tagName.toLowerCase();

    if (tag === "pre") {
      const code = (el.textContent || "").replace(/\r\n/g, "\n");
      code.split("\n").forEach((line) => pushLine(line));
      lines.push("");
      return;
    }

    if (tag === "ul") {
      Array.from(el.querySelectorAll(":scope > li")).forEach((li) => {
        pushLine(li.textContent || "", "- ");
      });
      lines.push("");
      return;
    }

    if (tag === "ol") {
      Array.from(el.querySelectorAll(":scope > li")).forEach((li, idx) => {
        pushLine(li.textContent || "", `${idx + 1}. `);
      });
      lines.push("");
      return;
    }

    if (tag === "blockquote") {
      pushLine(el.textContent || "", "> ");
      lines.push("");
      return;
    }

    pushLine(el.textContent || "");
    if (["h1", "h2", "h3", "h4", "h5", "h6", "p", "div"].includes(tag)) {
      lines.push("");
    }
  };

  const bodyChildren = Array.from(doc.body.children);
  if (bodyChildren.length > 0) {
    bodyChildren.forEach(pushElement);
  } else {
    pushLine(doc.body.textContent || "");
  }

  while (lines.length > 0 && lines[lines.length - 1] === "") lines.pop();
  return lines;
}

function htmlToPlainText(html: string): string {
  return extractReadableLines(html)
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function safeFileName(name: string) {
  return (name || "document")
    .replace(/[^a-zA-Z0-9-_ ]/g, "")
    .replace(/\s+/g, "-")
    .toLowerCase();
}

function downloadBlob(
  content: string | ArrayBuffer | Uint8Array,
  filename: string,
  mimeType: string,
) {
  const normalizedContent: string | ArrayBuffer =
    content instanceof Uint8Array ? Uint8Array.from(content).buffer : content;
  const blob = new Blob([normalizedContent], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

const crc32Table = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i += 1) {
    let c = i;
    for (let j = 0; j < 8; j += 1) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[i] = c >>> 0;
  }
  return table;
})();

function crc32(input: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < input.length; i += 1) {
    c = crc32Table[(c ^ input[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function u16(n: number): Uint8Array {
  return new Uint8Array([n & 0xff, (n >>> 8) & 0xff]);
}

function u32(n: number): Uint8Array {
  return new Uint8Array([
    n & 0xff,
    (n >>> 8) & 0xff,
    (n >>> 16) & 0xff,
    (n >>> 24) & 0xff,
  ]);
}

function concatBytes(...parts: Uint8Array[]): Uint8Array {
  const size = parts.reduce((sum, p) => sum + p.length, 0);
  const out = new Uint8Array(size);
  let offset = 0;
  parts.forEach((part) => {
    out.set(part, offset);
    offset += part.length;
  });
  return out;
}

function createZip(
  files: Array<{ name: string; data: Uint8Array }>,
): Uint8Array {
  const localHeaders: Uint8Array[] = [];
  const centralHeaders: Uint8Array[] = [];
  let localOffset = 0;

  files.forEach((file) => {
    const nameBytes = new TextEncoder().encode(file.name);
    const data = file.data;
    const checksum = crc32(data);

    const localHeader = concatBytes(
      u32(0x04034b50),
      u16(20),
      u16(0),
      u16(0),
      u16(0),
      u16(0),
      u32(checksum),
      u32(data.length),
      u32(data.length),
      u16(nameBytes.length),
      u16(0),
      nameBytes,
      data,
    );
    localHeaders.push(localHeader);

    const centralHeader = concatBytes(
      u32(0x02014b50),
      u16(20),
      u16(20),
      u16(0),
      u16(0),
      u16(0),
      u16(0),
      u32(checksum),
      u32(data.length),
      u32(data.length),
      u16(nameBytes.length),
      u16(0),
      u16(0),
      u16(0),
      u16(0),
      u32(0),
      u32(localOffset),
      nameBytes,
    );
    centralHeaders.push(centralHeader);

    localOffset += localHeader.length;
  });

  const localChunk = concatBytes(...localHeaders);
  const centralChunk = concatBytes(...centralHeaders);

  const endRecord = concatBytes(
    u32(0x06054b50),
    u16(0),
    u16(0),
    u16(files.length),
    u16(files.length),
    u32(centralChunk.length),
    u32(localChunk.length),
    u16(0),
  );

  return concatBytes(localChunk, centralChunk, endRecord);
}

function xmlEscape(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function buildDocxFromHtml(html: string): Uint8Array {
  const lines = extractReadableLines(html).filter(
    (line) => line.trim().length > 0,
  );
  const paragraphs = (lines.length > 0 ? lines : [""])
    .map(
      (line) =>
        `<w:p><w:r><w:t xml:space="preserve">${xmlEscape(line)}</w:t></w:r></w:p>`,
    )
    .join("");

  const contentTypes = `<?xml version="1.0" encoding="UTF-8"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`;

  const rootRels = `<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`;

  const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    ${paragraphs}
    <w:sectPr>
      <w:pgSz w:w="11906" w:h="16838"/>
      <w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="708" w:footer="708" w:gutter="0"/>
    </w:sectPr>
  </w:body>
</w:document>`;

  const encoder = new TextEncoder();
  return createZip([
    { name: "[Content_Types].xml", data: encoder.encode(contentTypes) },
    { name: "_rels/.rels", data: encoder.encode(rootRels) },
    { name: "word/document.xml", data: encoder.encode(documentXml) },
  ]);
}

function parseHtmlForPdf(html: string): PdfLine[] {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  const lines: PdfLine[] = [];

  const pushWrapped = (
    text: string,
    font: PdfLine["font"],
    size: number,
    indent = 0,
    gapAfter = 6,
  ) => {
    const cleaned = text.replace(/\s+/g, " ").trim();
    if (!cleaned) {
      lines.push({ text: "", font, size, indent, gapAfter });
      return;
    }

    const maxChars = Math.max(25, Math.floor((95 - indent) / (size * 0.5)));
    let start = 0;
    while (start < cleaned.length) {
      let end = Math.min(cleaned.length, start + maxChars);
      if (end < cleaned.length) {
        const splitAt = cleaned.lastIndexOf(" ", end);
        if (splitAt > start + 6) end = splitAt;
      }
      lines.push({
        text: cleaned.slice(start, end),
        font,
        size,
        indent,
        gapAfter: 0,
      });
      start = end + 1;
    }
    lines[lines.length - 1].gapAfter = gapAfter;
  };

  const bodyChildren = Array.from(doc.body.children);
  const elements = bodyChildren.length > 0 ? bodyChildren : [doc.body];

  elements.forEach((el) => {
    const tag = el.tagName.toLowerCase();

    if (tag === "h1") {
      pushWrapped(el.textContent || "", "F2", 20, 0, 10);
      return;
    }
    if (tag === "h2") {
      pushWrapped(el.textContent || "", "F2", 16, 0, 8);
      return;
    }
    if (tag === "h3" || tag === "h4") {
      pushWrapped(el.textContent || "", "F2", 14, 0, 6);
      return;
    }
    if (tag === "blockquote") {
      pushWrapped(`> ${el.textContent || ""}`, "F1", 11, 10, 6);
      return;
    }
    if (tag === "pre") {
      (el.textContent || "").split(/\r?\n/).forEach((line) => {
        pushWrapped(line, "F3", 10, 8, 0);
      });
      lines.push({ text: "", font: "F1", size: 11, indent: 0, gapAfter: 6 });
      return;
    }
    if (tag === "ul") {
      Array.from(el.querySelectorAll(":scope > li")).forEach((li) => {
        pushWrapped(`- ${li.textContent || ""}`, "F1", 11, 8, 2);
      });
      lines.push({ text: "", font: "F1", size: 11, indent: 0, gapAfter: 4 });
      return;
    }
    if (tag === "ol") {
      Array.from(el.querySelectorAll(":scope > li")).forEach((li, idx) => {
        pushWrapped(`${idx + 1}. ${li.textContent || ""}`, "F1", 11, 8, 2);
      });
      lines.push({ text: "", font: "F1", size: 11, indent: 0, gapAfter: 4 });
      return;
    }

    pushWrapped(el.textContent || "", "F1", 11, 0, 6);
  });

  if (lines.length === 0) {
    pushWrapped(doc.body.textContent || "", "F1", 11, 0, 6);
  }

  return lines;
}

function buildSimplePdf(html: string): Uint8Array {
  const escapePdfText = (value: string) =>
    value
      .replace(/\\/g, "\\\\")
      .replace(/\(/g, "\\(")
      .replace(/\)/g, "\\)")
      .replace(/\r?\n/g, " ");

  const allLines = parseHtmlForPdf(html);
  const top = 790;
  const bottom = 50;
  const left = 50;

  const pages: PdfLine[][] = [];
  let page: PdfLine[] = [];
  let y = top;

  allLines.forEach((line) => {
    const consume = line.size + line.gapAfter;
    if (y - consume < bottom && page.length > 0) {
      pages.push(page);
      page = [];
      y = top;
    }
    page.push(line);
    y -= consume;
  });

  if (page.length === 0)
    page.push({ text: "", font: "F1", size: 11, indent: 0, gapAfter: 0 });
  pages.push(page);

  const objects: string[] = [];
  objects[1] = "<< /Type /Catalog /Pages 2 0 R >>";

  const pageObjectIds: number[] = [];
  const contentObjectIds: number[] = [];
  let nextId = 6;

  pages.forEach(() => {
    pageObjectIds.push(nextId);
    contentObjectIds.push(nextId + 1);
    nextId += 2;
  });

  objects[2] = `<< /Type /Pages /Count ${pages.length} /Kids [${pageObjectIds
    .map((id) => `${id} 0 R`)
    .join(" ")}] >>`;
  objects[3] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>";
  objects[4] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>";
  objects[5] = "<< /Type /Font /Subtype /Type1 /BaseFont /Courier >>";

  pages.forEach((pageLines, idx) => {
    const pageId = pageObjectIds[idx];
    const contentId = contentObjectIds[idx];

    let lineY = top;
    const chunks: string[] = ["BT"];

    pageLines.forEach((line) => {
      chunks.push(`/${line.font} ${line.size} Tf`);
      chunks.push(`1 0 0 1 ${left + line.indent} ${lineY} Tm`);
      chunks.push(`(${escapePdfText(line.text)}) Tj`);
      lineY -= line.size + line.gapAfter;
    });

    chunks.push("ET");
    const stream = chunks.join("\n");

    objects[contentId] =
      `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`;
    objects[pageId] =
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 3 0 R /F2 4 0 R /F3 5 0 R >> >> /Contents ${contentId} 0 R >>`;
  });

  let pdf = "%PDF-1.4\n";
  const offsets: number[] = [];

  for (let i = 1; i < objects.length; i += 1) {
    if (!objects[i]) continue;
    offsets[i] = pdf.length;
    pdf += `${i} 0 obj\n${objects[i]}\nendobj\n`;
  }

  const xrefStart = pdf.length;
  pdf += `xref\n0 ${objects.length}\n`;
  pdf += "0000000000 65535 f \n";

  for (let i = 1; i < objects.length; i += 1) {
    const offset = offsets[i] || 0;
    pdf += `${offset.toString().padStart(10, "0")} 00000 n \n`;
  }

  pdf += `trailer\n<< /Size ${objects.length} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;
  return new TextEncoder().encode(pdf);
}

const DownloadByCode = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [code, setCode] = useState(
    (searchParams.get("code") || "").toUpperCase(),
  );
  const [loading, setLoading] = useState(false);
  const [docTitle, setDocTitle] = useState<string | null>(null);
  const [docContent, setDocContent] = useState<string | null>(null);
  const [selectedFormat, setSelectedFormat] = useState<DownloadFormat>("pdf");

  const canDownload = useMemo(
    () => !!docTitle && !!docContent,
    [docTitle, docContent],
  );

  const resolveCode = async () => {
    if (!code.trim()) return;

    setLoading(true);

    const { data: codeRow, error: codeError } = await supabase
      .from("document_download_codes")
      .select("document_id")
      .eq("code", code.trim().toUpperCase())
      .maybeSingle();

    if (codeError || !codeRow) {
      setLoading(false);
      toast({
        variant: "destructive",
        title: "Invalid code",
        description: "No document found for this code.",
      });
      return;
    }

    const { data: document, error: docError } = await supabase
      .from("documents")
      .select("title, content")
      .eq("id", codeRow.document_id)
      .maybeSingle();

    setLoading(false);

    if (docError || !document) {
      toast({
        variant: "destructive",
        title: "Document unavailable",
        description: "This code exists, but the document cannot be downloaded.",
      });
      return;
    }

    setDocTitle(document.title || "document");
    setDocContent(document.content || "");
  };

  const downloadDocument = () => {
    if (!canDownload) return;

    const title = safeFileName(docTitle || "document");
    const html = docContent || "";

    if (selectedFormat === "md") {
      downloadBlob(
        `\uFEFF${htmlToMarkdown(html)}`,
        `${title}.md`,
        "text/markdown;charset=utf-8",
      );
      return;
    }

    if (selectedFormat === "txt") {
      downloadBlob(
        `\uFEFF${htmlToPlainText(html)}`,
        `${title}.txt`,
        "text/plain;charset=utf-8",
      );
      return;
    }

    if (selectedFormat === "docx") {
      const docxBytes = buildDocxFromHtml(html);
      downloadBlob(
        docxBytes,
        `${title}.docx`,
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      );
      return;
    }

    const pdfBytes = buildSimplePdf(html);
    downloadBlob(pdfBytes, `${title}.pdf`, "application/pdf");
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <SEO
        title="Download Document by Code"
        description="Enter a short document code to download a shared document quickly."
        canonical="/download"
      />
      <Card className="w-full max-w-lg shadow-float border-border/60">
        <CardHeader className="space-y-2">
          <Button
            variant="ghost"
            size="sm"
            className="w-fit -ml-2 text-muted-foreground"
            onClick={() => navigate("/")}
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back
          </Button>
          <CardTitle className="font-display text-2xl">
            Download by Code
          </CardTitle>
          <p className="text-sm font-ui text-muted-foreground">
            Enter the 6-character code generated from the document page.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2">
            <Input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="ABC123"
              maxLength={8}
              className="font-ui tracking-widest uppercase"
            />
            <Button onClick={resolveCode} disabled={loading || !code.trim()}>
              {loading ? "Checking..." : "Get"}
            </Button>
          </div>

          {docTitle && (
            <div className="rounded-lg border border-border p-3 bg-muted/30">
              <p className="text-xs font-ui text-muted-foreground mb-1">
                Document found
              </p>
              <p className="font-ui font-medium text-foreground">{docTitle}</p>
            </div>
          )}

          <div className="space-y-2">
            <label className="text-xs font-ui text-muted-foreground">
              Select format
            </label>
            <select
              value={selectedFormat}
              onChange={(e) =>
                setSelectedFormat(e.target.value as DownloadFormat)
              }
              className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-ui"
            >
              <option value="pdf">.pdf</option>
              <option value="docx">.docx</option>
              <option value="md">.md</option>
              <option value="txt">.txt</option>
            </select>
          </div>

          <Button
            onClick={downloadDocument}
            disabled={!canDownload}
            className="w-full rounded-full font-ui"
          >
            <Download className="h-4 w-4 mr-2" />
            Download {selectedFormat.toUpperCase()}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default DownloadByCode;
