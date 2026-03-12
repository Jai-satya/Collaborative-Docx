import { useEffect, useState, useRef, useMemo, useCallback } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import Placeholder from "@tiptap/extension-placeholder";
import CharacterCount from "@tiptap/extension-character-count";
import Highlight from "@tiptap/extension-highlight";
import Typography from "@tiptap/extension-typography";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import { TextStyle } from "@tiptap/extension-text-style";
import Color from "@tiptap/extension-color";
import Superscript from "@tiptap/extension-superscript";
import Subscript from "@tiptap/extension-subscript";
import FocusExtension from "@tiptap/extension-focus";
import { debounce } from "lodash";
import { supabase } from "@/integrations/supabase/client";
import EditorToolbar from "./EditorToolbar";
import RemoteCursors from "./RemoteCursors";
import { useCursors } from "@/hooks/useCursors";
import Link from "@tiptap/extension-link";
import Table from "@tiptap/extension-table";
import TableRow from "@tiptap/extension-table-row";
import TableCell from "@tiptap/extension-table-cell";
import TableHeader from "@tiptap/extension-table-header";
import EditorStatusBar from "./EditorStatusBar";
import FindReplace from "./FindReplace";
import WritingGoals from "./WritingGoals";
import DocumentOutline from "./DocumentOutline";
import ExportDocument from "./ExportDocument";
import KeyboardShortcuts from "./KeyboardShortcuts";
import WordFrequency from "./WordFrequency";
import VersionHistory from "./VersionHistory";

interface DocumentEditorProps {
  content: string;
  onUpdate: (content: string) => void;
  documentId: string;
}

const DocumentEditor = ({
  content,
  onUpdate,
  documentId,
}: DocumentEditorProps) => {
  const [localContent, setLocalContent] = useState(content);
  const [isFocusMode, setIsFocusMode] = useState(false);
  const [isTypewriterMode, setIsTypewriterMode] = useState(false);
  const [isZenMode, setIsZenMode] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showFindReplace, setShowFindReplace] = useState(false);
  const [showWritingGoals, setShowWritingGoals] = useState(false);
  const [showOutline, setShowOutline] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [showWordFrequency, setShowWordFrequency] = useState(false);
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const editorRef = useRef<HTMLDivElement>(null);
  const isRemoteUpdateRef = useRef(false);
  const pendingContentRef = useRef<string | null>(null);
  const versionRef = useRef(0);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        history: { depth: 200, newGroupDelay: 250 },
      }),
      Underline,
      TextAlign.configure({
        types: ["heading", "paragraph"],
        alignments: ["left", "center", "right"],
      }),
      Placeholder.configure({
        placeholder: 'Start writing, or type "/" for commands...',
        emptyEditorClass: "is-editor-empty",
      }),
      CharacterCount,
      Highlight.configure({ multicolor: true }),
      Typography,
      TaskList,
      TaskItem.configure({ nested: true }),
      TextStyle,
      Color,
      Superscript,
      Subscript,
      FocusExtension.configure({
        className: "has-focus",
        mode: "all",
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class:
            "text-primary underline decoration-primary/40 hover:decoration-primary cursor-pointer",
        },
      }),
      Table.configure({ resizable: true }),
      TableRow,
      TableCell,
      TableHeader,
    ],
    content: localContent,
    editorProps: {
      attributes: {
        class:
          "editorial-prose focus:outline-none w-full max-w-none min-h-[500px]",
      },
    },
    onUpdate: ({ editor }) => {
      if (isRemoteUpdateRef.current) return;
      const newContent = editor.getHTML();
      setLocalContent(newContent);
      versionRef.current += 1;
      debouncedBroadcast(newContent, versionRef.current);
      debouncedSave(newContent);
    },
  });

  const { cursors } = useCursors(documentId, editorRef);

  // Debounced broadcast for real-time sync (fast - 80ms)
  const debouncedBroadcast = useMemo(
    () =>
      debounce((newContent: string, version: number) => {
        if (channelRef.current) {
          channelRef.current.send({
            type: "broadcast",
            event: "content_update",
            payload: { content: newContent, version },
          });
        }
      }, 80),
    [],
  );

  // Debounced save to parent (slower - 500ms for perf)
  const debouncedSave = useMemo(
    () =>
      debounce((newContent: string) => {
        setIsSaving(true);
        onUpdate(newContent);
        setTimeout(() => {
          setIsSaving(false);
          setLastSaved(new Date());
        }, 300);
      }, 500),
    [onUpdate],
  );

  // Real-time channel for receiving remote edits
  useEffect(() => {
    if (!documentId) return;

    const channel = supabase.channel(`doc-sync:${documentId}`);
    channel
      .on("broadcast", { event: "content_update" }, ({ payload }) => {
        if (!editor) return;

        // Conflict resolution: only apply if remote version is newer
        // and content actually differs
        if (payload.content === editor.getHTML()) return;

        isRemoteUpdateRef.current = true;

        // Store selection to restore after update
        const { from, to } = editor.state.selection;
        const docLength = editor.state.doc.content.size;

        editor.commands.setContent(payload.content, false);

        // Restore cursor proportionally if doc size changed
        const newDocLength = editor.state.doc.content.size;
        try {
          const adjustedFrom = Math.min(from, newDocLength - 1);
          const adjustedTo = Math.min(to, newDocLength - 1);
          editor.commands.setTextSelection({
            from: Math.max(1, adjustedFrom),
            to: Math.max(1, adjustedTo),
          });
        } catch {
          // Position no longer valid
        }

        isRemoteUpdateRef.current = false;
      })
      .subscribe();

    channelRef.current = channel;

    return () => {
      debouncedBroadcast.cancel();
      debouncedSave.cancel();
      channel.unsubscribe();
      channelRef.current = null;
    };
  }, [documentId, editor, debouncedBroadcast, debouncedSave]);

  // Sync from parent content prop (initial load / external save)
  useEffect(() => {
    if (content !== localContent && editor && !editor.isFocused) {
      setLocalContent(content);
      isRemoteUpdateRef.current = true;
      editor.commands.setContent(content, false);
      isRemoteUpdateRef.current = false;
    }
  }, [content]);

  // Auto-focus
  useEffect(() => {
    if (editor) {
      setTimeout(() => editor.commands.focus("end"), 80);
    }
  }, [editor]);

  // Typewriter mode: keep cursor line centered
  useEffect(() => {
    if (!editor || !isTypewriterMode) return;
    const handler = () => {
      const { node } = editor.view.domAtPos(editor.state.selection.from);
      const el = node instanceof HTMLElement ? node : node.parentElement;
      el?.scrollIntoView({ behavior: "smooth", block: "center" });
    };
    editor.on("selectionUpdate", handler);
    return () => {
      editor.off("selectionUpdate", handler);
    };
  }, [editor, isTypewriterMode]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      // Cmd/Ctrl + Shift + F for focus mode
      if (mod && e.shiftKey && e.key === "f") {
        e.preventDefault();
        setIsFocusMode((prev) => !prev);
      }
      // Cmd/Ctrl + Shift + H for find & replace
      if (mod && e.shiftKey && e.key === "h") {
        e.preventDefault();
        setShowFindReplace((prev) => !prev);
      }
      // Cmd/Ctrl + Shift + T for typewriter mode
      if (mod && e.shiftKey && e.key === "t") {
        e.preventDefault();
        setIsTypewriterMode((prev) => !prev);
      }
      // Escape to exit zen mode
      if (e.key === "Escape" && isZenMode) {
        setIsZenMode(false);
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isZenMode]);

  if (!editor) {
    return (
      <div className="border border-border/50 rounded-xl p-8 bg-card animate-pulse-subtle">
        <div className="h-4 bg-muted rounded w-3/4 mb-3" />
        <div className="h-4 bg-muted rounded w-1/2 mb-3" />
        <div className="h-4 bg-muted rounded w-2/3" />
      </div>
    );
  }

  return (
    <div
      className={`flex gap-4 ${isZenMode ? "fixed inset-0 z-50 bg-background p-8" : ""}`}
    >
      {/* Side panels (left) */}
      {(showOutline || showWritingGoals) && (
        <div className="hidden lg:flex flex-col gap-4 w-64 shrink-0">
          {showOutline && (
            <DocumentOutline
              editor={editor}
              onClose={() => setShowOutline(false)}
            />
          )}
          {showWritingGoals && (
            <WritingGoals
              editor={editor}
              onClose={() => setShowWritingGoals(false)}
            />
          )}
        </div>
      )}

      {/* Main editor */}
      <div
        className={`flex-1 border border-border/50 rounded-xl overflow-hidden bg-card shadow-soft transition-all duration-300 ${isFocusMode ? "focus-mode shadow-dramatic" : ""} ${isTypewriterMode ? "typewriter-mode" : ""}`}
      >
        <EditorToolbar
          editor={editor}
          isFocusMode={isFocusMode}
          isTypewriterMode={isTypewriterMode}
          isZenMode={isZenMode}
          onToggleFocusMode={() => setIsFocusMode((prev) => !prev)}
          onToggleTypewriterMode={() => setIsTypewriterMode((prev) => !prev)}
          onToggleZenMode={() => setIsZenMode((prev) => !prev)}
          onOpenFindReplace={() => setShowFindReplace((prev) => !prev)}
          onToggleOutline={() => setShowOutline((prev) => !prev)}
          onToggleWritingGoals={() => setShowWritingGoals((prev) => !prev)}
          onToggleExport={() => setShowExport((prev) => !prev)}
          onToggleWordFrequency={() => setShowWordFrequency((prev) => !prev)}
          onToggleVersionHistory={() => setShowVersionHistory((prev) => !prev)}
        />

        {/* Find & Replace bar */}
        {showFindReplace && (
          <div className="px-4 pt-2">
            <FindReplace
              editor={editor}
              onClose={() => setShowFindReplace(false)}
            />
          </div>
        )}

        <div className="relative editorial-scroll" ref={editorRef}>
          <EditorContent
            editor={editor}
            className="px-8 md:px-16 py-8 min-h-[500px] max-h-[calc(100vh-300px)] overflow-y-auto"
          />
          <RemoteCursors cursors={cursors} />
        </div>
        <EditorStatusBar
          editor={editor}
          isSaving={isSaving}
          lastSaved={lastSaved}
          isFocusMode={isFocusMode}
          isTypewriterMode={isTypewriterMode}
          onToggleShortcuts={() => setShowShortcuts((prev) => !prev)}
        />
      </div>

      {/* Side panel (right) */}
      {(showExport ||
        showShortcuts ||
        showWordFrequency ||
        showVersionHistory) && (
        <div className="hidden lg:flex flex-col gap-4 w-64 shrink-0">
          {showExport && (
            <ExportDocument
              editor={editor}
              onClose={() => setShowExport(false)}
            />
          )}
          {showWordFrequency && (
            <WordFrequency
              editor={editor}
              onClose={() => setShowWordFrequency(false)}
            />
          )}
          {showShortcuts && (
            <KeyboardShortcuts onClose={() => setShowShortcuts(false)} />
          )}
          {showVersionHistory && (
            <VersionHistory
              documentId={documentId}
              currentContent={editor.getHTML()}
              onRestore={(content) => {
                editor.commands.setContent(content, true);
                setLocalContent(content);
                onUpdate(content);
              }}
              onClose={() => setShowVersionHistory(false)}
            />
          )}
        </div>
      )}
    </div>
  );
};

export default DocumentEditor;
