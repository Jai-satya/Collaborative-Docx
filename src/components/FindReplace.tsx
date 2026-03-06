import { useState, useCallback, useEffect, memo, useRef } from "react";
import { Editor } from "@tiptap/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  X,
  ChevronDown,
  ChevronUp,
  Replace,
  ReplaceAll,
  CaseSensitive,
  Regex,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface FindReplaceProps {
  editor: Editor;
  onClose: () => void;
}

interface Match {
  from: number;
  to: number;
}

const FindReplace = memo(({ editor, onClose }: FindReplaceProps) => {
  const [findText, setFindText] = useState("");
  const [replaceText, setReplaceText] = useState("");
  const [showReplace, setShowReplace] = useState(false);
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [useRegex, setUseRegex] = useState(false);
  const [matches, setMatches] = useState<Match[]>([]);
  const [currentMatch, setCurrentMatch] = useState(-1);
  const findInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    findInputRef.current?.focus();
  }, []);

  const findMatches = useCallback(() => {
    if (!findText) {
      setMatches([]);
      setCurrentMatch(-1);
      // Clear any existing decorations
      return;
    }

    const doc = editor.state.doc;
    const text = doc.textContent;
    const found: Match[] = [];

    try {
      let searchText: RegExp;
      if (useRegex) {
        searchText = new RegExp(findText, caseSensitive ? "g" : "gi");
      } else {
        const escaped = findText.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        searchText = new RegExp(escaped, caseSensitive ? "g" : "gi");
      }

      let match: RegExpExecArray | null;
      while ((match = searchText.exec(text)) !== null) {
        // Convert text offset to ProseMirror position
        let textOffset = 0;
        doc.descendants((node, nodePos) => {
          if (node.isText && textOffset <= match!.index) {
            const nodeText = node.text || "";
            const start = match!.index - textOffset;
            if (start >= 0 && start < nodeText.length) {
              found.push({
                from: nodePos + start,
                to: nodePos + start + match![0].length,
              });
            }
            textOffset += nodeText.length;
          } else if (node.isBlock && !node.isTextblock) {
            // Skip
          } else if (!node.isText) {
            textOffset += node.textContent.length;
          }
        });

        if (searchText.lastIndex === match.index) break; // prevent infinite loops
      }
    } catch {
      // Invalid regex
      setMatches([]);
      setCurrentMatch(-1);
      return;
    }

    // Deduplicate
    const unique = found.filter(
      (m, i, arr) => i === 0 || m.from !== arr[i - 1].from,
    );

    setMatches(unique);
    setCurrentMatch(unique.length > 0 ? 0 : -1);

    // Highlight first match
    if (unique.length > 0) {
      editor.commands.setTextSelection({
        from: unique[0].from,
        to: unique[0].to,
      });
      scrollToSelection();
    }
  }, [findText, caseSensitive, useRegex, editor]);

  useEffect(() => {
    const timer = setTimeout(findMatches, 200);
    return () => clearTimeout(timer);
  }, [findMatches]);

  const scrollToSelection = useCallback(() => {
    const { node } = editor.view.domAtPos(editor.state.selection.from);
    const el = node instanceof HTMLElement ? node : node.parentElement;
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [editor]);

  const goToMatch = useCallback(
    (index: number) => {
      if (matches.length === 0) return;
      const wrappedIndex =
        ((index % matches.length) + matches.length) % matches.length;
      setCurrentMatch(wrappedIndex);
      const m = matches[wrappedIndex];
      editor.commands.setTextSelection({ from: m.from, to: m.to });
      scrollToSelection();
    },
    [matches, editor, scrollToSelection],
  );

  const handleReplace = useCallback(() => {
    if (currentMatch < 0 || matches.length === 0) return;
    const m = matches[currentMatch];
    editor
      .chain()
      .focus()
      .insertContentAt({ from: m.from, to: m.to }, replaceText)
      .run();
    // Re-search after replacement
    setTimeout(findMatches, 50);
  }, [currentMatch, matches, replaceText, editor, findMatches]);

  const handleReplaceAll = useCallback(() => {
    if (matches.length === 0) return;
    // Replace from end to start to preserve positions
    const sorted = [...matches].sort((a, b) => b.from - a.from);
    let chain = editor.chain().focus();
    for (const m of sorted) {
      chain = chain.insertContentAt({ from: m.from, to: m.to }, replaceText);
    }
    chain.run();
    setTimeout(findMatches, 50);
  }, [matches, replaceText, editor, findMatches]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        e.preventDefault();
        goToMatch(currentMatch + (e.shiftKey ? -1 : 1));
      }
      if (e.key === "Escape") {
        onClose();
      }
    },
    [goToMatch, currentMatch, onClose],
  );

  return (
    <div className="border border-border/50 rounded-lg bg-card shadow-elevated p-3 space-y-2 animate-fade-in">
      {/* Find row */}
      <div className="flex items-center gap-1.5">
        <Input
          ref={findInputRef}
          value={findText}
          onChange={(e) => setFindText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Find..."
          className="h-7 text-xs font-ui flex-1"
        />
        <TooltipProvider delayDuration={300}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className={`h-7 w-7 p-0 ${caseSensitive ? "bg-accent text-accent-foreground" : ""}`}
                onClick={() => setCaseSensitive(!caseSensitive)}
              >
                <CaseSensitive className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-xs z-[100]">
              Match Case
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className={`h-7 w-7 p-0 ${useRegex ? "bg-accent text-accent-foreground" : ""}`}
                onClick={() => setUseRegex(!useRegex)}
              >
                <Regex className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-xs z-[100]">
              Regex
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        <span className="text-[10px] font-ui text-muted-foreground whitespace-nowrap min-w-[50px] text-center">
          {matches.length > 0
            ? `${currentMatch + 1}/${matches.length}`
            : "No results"}
        </span>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0"
          onClick={() => goToMatch(currentMatch - 1)}
          disabled={matches.length === 0}
        >
          <ChevronUp className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0"
          onClick={() => goToMatch(currentMatch + 1)}
          disabled={matches.length === 0}
        >
          <ChevronDown className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0"
          onClick={() => setShowReplace(!showReplace)}
        >
          <Replace className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0"
          onClick={onClose}
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* Replace row */}
      {showReplace && (
        <div className="flex items-center gap-1.5">
          <Input
            value={replaceText}
            onChange={(e) => setReplaceText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") onClose();
            }}
            placeholder="Replace..."
            className="h-7 text-xs font-ui flex-1"
          />
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs font-ui px-2"
            onClick={handleReplace}
            disabled={matches.length === 0}
          >
            Replace
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs font-ui px-2"
            onClick={handleReplaceAll}
            disabled={matches.length === 0}
          >
            All
          </Button>
        </div>
      )}
    </div>
  );
});

FindReplace.displayName = "FindReplace";

export default FindReplace;
