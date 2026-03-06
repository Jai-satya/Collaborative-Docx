
import { useEffect, useState, useRef, useMemo } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import Placeholder from '@tiptap/extension-placeholder';
import { debounce } from 'lodash';
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import EditorToolbar from './EditorToolbar';
import RemoteCursors from './RemoteCursors';
import { useCursors } from '@/hooks/useCursors';

interface DocumentEditorProps {
  content: string;
  onUpdate: (content: string) => void;
  documentId: string;
}

const DocumentEditor = ({ content, onUpdate, documentId }: DocumentEditorProps) => {
  const [localContent, setLocalContent] = useState(content);
  const { toast } = useToast();
  const [channel, setChannel] = useState<ReturnType<typeof supabase.channel> | null>(null);
  const editorRef = useRef<HTMLDivElement>(null);
  
  // Optimize editor configuration with useMemo to prevent re-creation
  const editorConfig = useMemo(() => ({
    extensions: [
      StarterKit.configure({
        history: {
          depth: 100,
          newGroupDelay: 300, // Reduced delay for more responsive undo/redo
        },
      }),
      Underline,
      TextAlign.configure({
        types: ['heading', 'paragraph'],
        alignments: ['left', 'center', 'right'],
        defaultAlignment: 'left',
      }),
      Placeholder.configure({
        placeholder: 'Start writing your document here...',
        emptyEditorClass: 'is-editor-empty',
      }),
    ],
    content: localContent,
    editorProps: {
      attributes: {
        class: 'prose prose-sm sm:prose lg:prose-lg xl:prose-xl focus:outline-none w-full max-w-none',
      },
      // Optimize editor input handling
      handleDOMEvents: {
        keydown: (_view, event) => {
          // Prevent default browser handling for some keys to improve performance
          if (event.key === 'Tab') {
            return true;
          }
          return false;
        },
      },
    },
  }), [localContent]);
  
  const editor = useEditor({
    ...editorConfig,
    onUpdate: ({ editor }) => {
      const newContent = editor.getHTML();
      setLocalContent(newContent);
      debouncedUpdate(newContent);
    },
  });

  const { cursors } = useCursors(documentId, editorRef);

  // Create optimized debounced update function - move outside component render to preserve reference
  const debouncedUpdate = useMemo(() => debounce((newContent: string) => {
    onUpdate(newContent);
    if (channel) {
      channel.send({
        type: 'broadcast',
        event: 'content_update',
        payload: { content: newContent },
      });
    }
  }, 100), [channel, onUpdate]); // Lower debounce time for more responsive updates

  useEffect(() => {
    if (!documentId) return;

    const newChannel = supabase.channel(`document:${documentId}`);

    newChannel
      .on('broadcast', { event: 'content_update' }, ({ payload }) => {
        if (payload.content !== localContent) {
          setLocalContent(payload.content);
          if (editor) {
            // Store cursor position
            const { from, to } = editor.state.selection;
            
            // Update content without triggering onUpdate
            editor.commands.setContent(payload.content, false);
            
            // Try to restore cursor position if possible
            try {
              editor.commands.setTextSelection({ from, to });
            } catch (e) {
              // If position is no longer valid, just let it be
            }
          }
        }
      })
      .subscribe();

    setChannel(newChannel);

    return () => {
      debouncedUpdate.cancel(); // Cancel any pending debounced updates
      newChannel.unsubscribe();
    };
  }, [documentId, editor, localContent, debouncedUpdate]);

  useEffect(() => {
    if (content !== localContent) {
      setLocalContent(content);
      if (editor) {
        editor.commands.setContent(content);
      }
    }
  }, [content, editor, localContent]);

  // Focus the editor when it loads with a shorter timeout
  useEffect(() => {
    if (editor) {
      setTimeout(() => {
        editor.commands.focus('end');
      }, 50);
    }
  }, [editor]);

  if (!editor) {
    return <div className="border rounded-lg p-4">Loading editor...</div>;
  }

  return (
    <div className="border rounded-lg overflow-hidden relative">
      <EditorToolbar editor={editor} />
      <div className="relative" ref={editorRef}>
        <EditorContent 
          editor={editor} 
          className="p-4 min-h-[400px] prose max-w-none outline-none focus:outline-none overflow-auto" 
        />
        <RemoteCursors cursors={cursors} />
      </div>
    </div>
  );
};

export default DocumentEditor;
