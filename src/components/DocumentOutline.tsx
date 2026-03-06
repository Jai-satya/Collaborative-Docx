import { useState, useEffect, memo, useCallback } from "react";
import { Editor } from "@tiptap/react";
import { List, ChevronDown, ChevronRight, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface OutlineHeading {
  id: string;
  level: number;
  text: string;
  pos: number;
}

interface DocumentOutlineProps {
  editor: Editor;
  onClose: () => void;
}

const DocumentOutline = memo(({ editor, onClose }: DocumentOutlineProps) => {
  const [headings, setHeadings] = useState<OutlineHeading[]>([]);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  const extractHeadings = useCallback(() => {
    const items: OutlineHeading[] = [];
    editor.state.doc.descendants((node, pos) => {
      if (node.type.name === "heading") {
        items.push({
          id: `heading-${pos}`,
          level: node.attrs.level,
          text: node.textContent || "Untitled",
          pos,
        });
      }
    });
    setHeadings(items);
  }, [editor]);

  useEffect(() => {
    extractHeadings();
    // Re-extract on editor changes
    const handler = () => extractHeadings();
    editor.on("update", handler);
    return () => {
      editor.off("update", handler);
    };
  }, [editor, extractHeadings]);

  const scrollToHeading = useCallback(
    (pos: number) => {
      editor
        .chain()
        .focus()
        .setTextSelection(pos + 1)
        .run();
      // Scroll the heading into view
      const element = editor.view.domAtPos(pos + 1);
      if (element?.node) {
        const el =
          element.node instanceof HTMLElement
            ? element.node
            : element.node.parentElement;
        el?.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    },
    [editor],
  );

  const toggleCollapse = useCallback((id: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  // Determine which headings are visible (not collapsed by a parent)
  const visibleHeadings = headings.filter((heading, i) => {
    for (let j = i - 1; j >= 0; j--) {
      if (headings[j].level < heading.level && collapsed.has(headings[j].id)) {
        return false;
      }
    }
    return true;
  });

  const hasChildren = (index: number): boolean => {
    const heading = headings[index];
    const realIdx = headings.indexOf(heading);
    for (let j = realIdx + 1; j < headings.length; j++) {
      if (headings[j].level <= heading.level) break;
      if (headings[j].level > heading.level) return true;
    }
    return false;
  };

  if (headings.length === 0) {
    return (
      <div className="border border-border/50 rounded-lg bg-card p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <List className="h-4 w-4 text-primary" />
            <h3 className="font-ui text-sm font-semibold">Outline</h3>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
            onClick={onClose}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
        <p className="text-xs font-ui text-muted-foreground">
          Add headings to your document to generate an outline.
        </p>
      </div>
    );
  }

  return (
    <div className="border border-border/50 rounded-lg bg-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <List className="h-4 w-4 text-primary" />
          <h3 className="font-ui text-sm font-semibold">Outline</h3>
          <span className="text-[10px] font-ui text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">
            {headings.length}
          </span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0"
          onClick={onClose}
        >
          <X className="h-3 w-3" />
        </Button>
      </div>
      <nav className="space-y-0.5 max-h-[400px] overflow-y-auto">
        {visibleHeadings.map((heading) => {
          const realIndex = headings.indexOf(heading);
          const hasKids = hasChildren(realIndex);
          const isCollapsed = collapsed.has(heading.id);

          return (
            <div
              key={heading.id}
              className="flex items-center gap-1 group"
              style={{ paddingLeft: `${(heading.level - 1) * 12}px` }}
            >
              {hasKids ? (
                <button
                  onClick={() => toggleCollapse(heading.id)}
                  className="h-4 w-4 flex items-center justify-center text-muted-foreground hover:text-foreground shrink-0"
                >
                  {isCollapsed ? (
                    <ChevronRight className="h-3 w-3" />
                  ) : (
                    <ChevronDown className="h-3 w-3" />
                  )}
                </button>
              ) : (
                <span className="h-4 w-4 flex items-center justify-center shrink-0">
                  <span className="h-1 w-1 rounded-full bg-muted-foreground/40" />
                </span>
              )}
              <button
                onClick={() => scrollToHeading(heading.pos)}
                className={`text-left text-xs font-ui truncate py-1 px-1 rounded hover:bg-muted transition-colors w-full ${
                  heading.level === 1
                    ? "font-semibold text-foreground"
                    : heading.level === 2
                      ? "font-medium text-foreground/90"
                      : "text-muted-foreground"
                }`}
                title={heading.text}
              >
                {heading.text}
              </button>
            </div>
          );
        })}
      </nav>
    </div>
  );
});

DocumentOutline.displayName = "DocumentOutline";

export default DocumentOutline;
