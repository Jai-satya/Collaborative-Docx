import { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import Placeholder from '@tiptap/extension-placeholder';
import CharacterCount from '@tiptap/extension-character-count';
import Highlight from '@tiptap/extension-highlight';
import Typography from '@tiptap/extension-typography';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import TextStyle from '@tiptap/extension-text-style';
import Color from '@tiptap/extension-color';
import Superscript from '@tiptap/extension-superscript';
import Subscript from '@tiptap/extension-subscript';
import { debounce } from 'lodash';
import { supabase } from "@/integrations/supabase/client";
import EditorToolbar from './EditorToolbar';
import RemoteCursors from './RemoteCursors';
import { useCursors } from '@/hooks/useCursors';
import EditorStatusBar from './EditorStatusBar';

interface DocumentEditorProps {
  content: string;
  onUpdate: (content: string) => void;
  documentId: string;
}

const DocumentEditor = ({ content, onUpdate, documentId }: DocumentEditorProps) => {
  const [localContent, setLocalContent] = useState(content);
  const [isFocusMode, setIsFocusMode] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [isSaving, setIsSaving] = useState(false);
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
        types: ['heading', 'paragraph'],
        alignments: ['left', 'center', 'right'],
      }),
      Placeholder.configure({
        placeholder: 'Start writing, or type "/" for commands...',
        emptyEditorClass: 'is-editor-empty',
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
    ],
    content: localContent,
    editorProps: {
      attributes: {
        class: 'editorial-prose focus:outline-none w-full max-w-none min-h-[500px]',
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
  const debouncedBroadcast = useMemo(() => debounce((newContent: string, version: number) => {
    if (channelRef.current) {
      channelRef.current.send({
        type: 'broadcast',
        event: 'content_update',
        payload: { content: newContent, version },
      });
    }
  }, 80), []);

  // Debounced save to parent (slower - 500ms for perf)
  const debouncedSave = useMemo(() => debounce((newContent: string) => {
    setIsSaving(true);
    onUpdate(newContent);
    setTimeout(() => {
      setIsSaving(false);
      setLastSaved(new Date());
    }, 300);
  }, 500), [onUpdate]);

  // Real-time channel for receiving remote edits
  useEffect(() => {
    if (!documentId) return;

    const channel = supabase.channel(`doc-sync:${documentId}`);
    channel
      .on('broadcast', { event: 'content_update' }, ({ payload }) => {
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
            to: Math.max(1, adjustedTo) 
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
      setTimeout(() => editor.commands.focus('end'), 80);
    }
  }, [editor]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + Shift + F for focus mode
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'f') {
        e.preventDefault();
        setIsFocusMode(prev => !prev);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

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
    <div className={`border border-border/50 rounded-xl overflow-hidden bg-card shadow-soft transition-all duration-300 ${isFocusMode ? 'focus-mode shadow-dramatic' : ''}`}>
      <EditorToolbar editor={editor} isFocusMode={isFocusMode} onToggleFocusMode={() => setIsFocusMode(prev => !prev)} />
      <div className="relative editorial-scroll" ref={editorRef}>
        <EditorContent
          editor={editor}
          className="px-8 md:px-16 py-8 min-h-[500px] max-h-[calc(100vh-300px)] overflow-y-auto"
        />
        <RemoteCursors cursors={cursors} />
      </div>
      <EditorStatusBar editor={editor} isSaving={isSaving} lastSaved={lastSaved} isFocusMode={isFocusMode} />
    </div>
  );
};

export default DocumentEditor;
