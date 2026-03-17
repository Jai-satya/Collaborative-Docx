import mammoth from "mammoth/mammoth.browser";
import { marked } from "marked";

export interface ImportedDocument {
  title: string;
  content: string;
}

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");

const textToParagraphHtml = (text: string) => {
  const normalized = text.replace(/\r\n/g, "\n");
  const blocks = normalized
    .split(/\n{2,}/g)
    .map((part) => part.trim())
    .filter(Boolean);

  if (!blocks.length) {
    return "<p></p>";
  }

  return blocks
    .map((block) => {
      const withBreaks = escapeHtml(block).replace(/\n/g, "<br />");
      return `<p>${withBreaks}</p>`;
    })
    .join("");
};

const sanitizeHtml = (html: string) => {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");

  const blockedSelectors = [
    "script",
    "style",
    "iframe",
    "object",
    "embed",
    "link",
    "meta",
  ];

  blockedSelectors.forEach((selector) => {
    doc.querySelectorAll(selector).forEach((node) => node.remove());
  });

  doc.querySelectorAll("*").forEach((element) => {
    [...element.attributes].forEach((attribute) => {
      const name = attribute.name.toLowerCase();
      const value = attribute.value.trim().toLowerCase();

      if (name.startsWith("on")) {
        element.removeAttribute(attribute.name);
      }

      if (
        (name === "href" || name === "src") &&
        value.startsWith("javascript:")
      ) {
        element.removeAttribute(attribute.name);
      }
    });
  });

  return doc.body.innerHTML || "<p></p>";
};

const hasHtmlStructure = (html: string) =>
  /<(h[1-6]|p|ul|ol|li|table|blockquote|pre|code|img|a|strong|em|hr|div|section|article)\b/i.test(
    html,
  );

const looksLikeMarkdown = (text: string) => {
  const lines = text.split(/\r?\n/).map((line) => line.trim());

  return lines.some(
    (line) =>
      /^#{1,6}\s+/.test(line) ||
      /^[-*+]\s+/.test(line) ||
      /^\d+\.\s+/.test(line) ||
      /^```/.test(line) ||
      /^>\s+/.test(line) ||
      /\[[^\]]+\]\([^\)]+\)/.test(line) ||
      /\*\*[^*]+\*\*/.test(line) ||
      /`[^`]+`/.test(line),
  );
};

const markdownToHtml = async (markdownText: string) => {
  const rendered = await marked.parse(markdownText, {
    gfm: true,
    breaks: true,
  });
  return sanitizeHtml(rendered);
};

const extractTitleFromFileName = (fileName: string) =>
  fileName.replace(/\.[^/.]+$/, "").trim() || "Imported Document";

const parseRtf = (rtf: string) => {
  // Basic RTF text extraction to keep import lightweight in-browser.
  const withoutGroups = rtf.replace(/\{\\[^{}]*\}/g, "");
  const withLineBreaks = withoutGroups
    .replace(/\\par[d]?/g, "\n")
    .replace(/\\tab/g, "\t");
  const plain = withLineBreaks
    .replace(/\\'[0-9a-fA-F]{2}/g, "")
    .replace(/\\[a-zA-Z]+-?\d* ?/g, "")
    .replace(/[{}]/g, "")
    .trim();

  return textToParagraphHtml(plain);
};

export const importDocumentFile = async (
  file: File,
): Promise<ImportedDocument> => {
  const fileName = file.name;
  const title = extractTitleFromFileName(fileName);
  const extension = fileName.split(".").pop()?.toLowerCase() || "";

  if (!extension) {
    throw new Error(
      "Unsupported file type. Please upload a valid document file.",
    );
  }

  if (extension === "doc") {
    throw new Error(
      "Legacy .doc files are not supported. Please save as .docx and upload again.",
    );
  }

  if (extension === "docx") {
    const buffer = await file.arrayBuffer();
    const result = await mammoth.convertToHtml({ arrayBuffer: buffer });
    const safeHtml = sanitizeHtml(result.value);
    return { title, content: safeHtml };
  }

  if (["txt", "md", "markdown"].includes(extension)) {
    const text = await file.text();

    if (["md", "markdown"].includes(extension) || looksLikeMarkdown(text)) {
      return { title, content: await markdownToHtml(text) };
    }

    return { title, content: textToParagraphHtml(text) };
  }

  if (["html", "htm"].includes(extension)) {
    const html = await file.text();
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");
    const textContent = doc.body.textContent?.trim() || "";

    if (looksLikeMarkdown(textContent) && !hasHtmlStructure(html)) {
      return { title, content: await markdownToHtml(textContent) };
    }

    return { title, content: sanitizeHtml(html) };
  }

  if (extension === "rtf") {
    const rtf = await file.text();
    return { title, content: parseRtf(rtf) };
  }

  throw new Error(
    "Unsupported format. Use .docx, .txt, .md, .html, or .rtf files.",
  );
};
