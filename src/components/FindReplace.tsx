import { useState, useCallback, useEffect, memo, useRef } from "react";
import { Editor } from "@tiptap/react";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
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

interface TextSegment {
  start: number;
  end: number;
  pos: number;
  text: string;
}

const findHighlightPluginKey = new PluginKey("findHighlightPlugin");

const FindReplace = memo(({ editor, onClose }: FindReplaceProps) => {
  const [findText, setFindText] = useState("");
  const [replaceText, setReplaceText] = useState("");
  const [showReplace, setShowReplace] = useState(false);
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [useRegex, setUseRegex] = useState(false);
  const [matches, setMatches] = useState<Match[]>([]);
  const [currentMatch, setCurrentMatch] = useState(-1);
  const findInputRef = useRef<HTMLInputElement>(null);

  const applyHighlights = useCallback(
    (allMatches: Match[], activeIndex: number) => {
      const existing = findHighlightPluginKey.get(editor.state);
      if (!existing) return;

      const decorations = allMatches.flatMap((match, index) => {
        const list = [
          Decoration.inline(match.from, match.to, {
            class: "find-match",
          }),
        ];

        if (index === activeIndex) {
          list.push(
            Decoration.inline(match.from, match.to, {
              class: "find-match find-match-active",
            }),
          );
        }

        return list;
      });

      const transaction = editor.state.tr.setMeta(findHighlightPluginKey, {
        decorations,
      });
      editor.view.dispatch(transaction);
    },
    [editor],
  );

  const clearHighlights = useCallback(() => {
    const existing = findHighlightPluginKey.get(editor.state);
    if (!existing) return;

    const transaction = editor.state.tr.setMeta(findHighlightPluginKey, {
      decorations: [],
    });
    editor.view.dispatch(transaction);
  }, [editor]);

  useEffect(() => {
    if (findHighlightPluginKey.get(editor.state)) return;

    editor.registerPlugin(
      new Plugin({
        key: findHighlightPluginKey,
        state: {
          init: () => DecorationSet.empty,
          apply(tr, old) {
            const meta = tr.getMeta(findHighlightPluginKey);
            if (meta?.decorations) {
              return DecorationSet.create(tr.doc, meta.decorations);
            }
            return old.map(tr.mapping, tr.doc);
          },
        },
        props: {
          decorations(state) {
            return this.getState(state);
          },
        },
      }),
    );

    return () => {
      clearHighlights();
      editor.unregisterPlugin(findHighlightPluginKey);
    };
  }, [editor, clearHighlights]);

  useEffect(() => {
    findInputRef.current?.focus();
  }, []);

  const scrollToSelection = useCallback(() => {
    const { node } = editor.view.domAtPos(editor.state.selection.from);
    const el = node instanceof HTMLElement ? node : node.parentElement;
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [editor]);

  const buildTextSegments = useCallback(() => {
    const segments: TextSegment[] = [];
    let offset = 0;

    editor.state.doc.descendants((node, pos) => {
      if (!node.isText) return;
      const text = node.text || "";
      if (!text.length) return;

      segments.push({
        start: offset,
        end: offset + text.length,
        pos,
        text,
      });
      offset += text.length;
    });

    return segments;
  }, [editor]);

  const findMatches = useCallback(() => {
    if (!findText) {
      setMatches([]);
      setCurrentMatch(-1);
      clearHighlights();
      return;
    }

    const text = editor.state.doc.textContent;
    const found: Match[] = [];
    const segments = buildTextSegments();

    const toDocPos = (textOffset: number) => {
      const segment = segments.find(
        (current) => textOffset >= current.start && textOffset < current.end,
      );
      if (!segment) return null;
      return segment.pos + (textOffset - segment.start);
    };

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
        const start = toDocPos(match.index);
        const end = toDocPos(match.index + match[0].length - 1);
        if (start !== null && end !== null) {
          found.push({ from: start, to: end + 1 });
        }

        if (searchText.lastIndex === match.index) break; // prevent infinite loops
      }
    } catch {
      // Invalid regex
      setMatches([]);
      setCurrentMatch(-1);
      clearHighlights();
      return;
    }

    // Deduplicate
    const unique = found.filter(
      (m, i, arr) => i === 0 || m.from !== arr[i - 1].from,
    );

    setMatches(unique);
    setCurrentMatch(unique.length > 0 ? 0 : -1);
    applyHighlights(unique, unique.length > 0 ? 0 : -1);

    // Highlight first match
    if (unique.length > 0) {
      editor.commands.setTextSelection({
        from: unique[0].from,
        to: unique[0].to,
      });
      scrollToSelection();
    }
  }, [
    findText,
    caseSensitive,
    useRegex,
    editor,
    buildTextSegments,
    scrollToSelection,
    applyHighlights,
    clearHighlights,
  ]);

  useEffect(() => {
    const timer = setTimeout(findMatches, 200);
    return () => clearTimeout(timer);
  }, [findMatches]);

  const goToMatch = useCallback(
    (index: number) => {
      if (matches.length === 0) return;
      const wrappedIndex =
        ((index % matches.length) + matches.length) % matches.length;
      setCurrentMatch(wrappedIndex);
      const m = matches[wrappedIndex];
      applyHighlights(matches, wrappedIndex);
      editor.commands.setTextSelection({ from: m.from, to: m.to });
      scrollToSelection();
    },
    [matches, editor, scrollToSelection, applyHighlights],
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
        clearHighlights();
        onClose();
      }
    },
    [goToMatch, currentMatch, onClose, clearHighlights],
  );

  useEffect(() => {
    return () => {
      clearHighlights();
    };
  }, [clearHighlights]);

  return (
    <div className="border border-border/50 rounded-lg bg-card shadow-elevated p-2 sm:p-3 space-y-2 animate-fade-in">
      {/* Find row */}
      <div className="flex items-center gap-1 sm:gap-1.5 flex-wrap sm:flex-nowrap">
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
        <span className="text-[10px] font-ui text-muted-foreground whitespace-nowrap min-w-[40px] sm:min-w-[50px] text-center">
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
          onClick={() => {
            clearHighlights();
            onClose();
          }}
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* Replace row */}
      {showReplace && (
        <div className="flex items-center gap-1 sm:gap-1.5 flex-wrap sm:flex-nowrap">
          <Input
            value={replaceText}
            onChange={(e) => setReplaceText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                clearHighlights();
                onClose();
              }
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
