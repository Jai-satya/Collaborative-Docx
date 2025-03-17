
import { useEffect, useState, useRef } from 'react';
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
  
  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      Placeholder.configure({
        placeholder: 'Start writing your document here...',
      }),
    ],
    content: localContent,
    onUpdate: ({ editor }) => {
      const newContent = editor.getHTML();
      setLocalContent(newContent);
      debouncedUpdate(newContent);
    },
  });

  const { cursors } = useCursors(documentId, editorRef);

  const debouncedUpdate = debounce((newContent: string) => {
    onUpdate(newContent);
    if (channel) {
      channel.send({
        type: 'broadcast',
        event: 'content_update',
        payload: { content: newContent },
      });
    }
  }, 500); // Reduced debounce time for better responsiveness

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
            
            // Update content
            editor.commands.setContent(payload.content);
            
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
      newChannel.unsubscribe();
    };
  }, [documentId, editor, localContent]);

  useEffect(() => {
    if (content !== localContent) {
      setLocalContent(content);
      if (editor) {
        editor.commands.setContent(content);
      }
    }
  }, [content, editor]);

  if (!editor) {
    return <div className="border rounded-lg p-4">Loading editor...</div>;
  }

  return (
    <div className="border rounded-lg overflow-hidden relative">
      <EditorToolbar editor={editor} />
      <div className="relative" ref={editorRef}>
        <EditorContent 
          editor={editor} 
          className="p-4 min-h-[300px] prose max-w-none outline-none focus:outline-none"
        />
        <RemoteCursors cursors={cursors} />
      </div>
    </div>
  );
};

export default DocumentEditor;
