
import { useEffect, useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Button } from "@/components/ui/button";
import { Bold, Italic, List, ListOrdered } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { debounce } from 'lodash';
import { useToast } from "@/components/ui/use-toast";

interface DocumentEditorProps {
  content: string;
  onUpdate: (content: string) => void;
  documentId: string;
}

interface CursorPosition {
  userId: string;
  username: string;
  position: { top: number; left: number };
  color: string;
}

const colors = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', 
  '#FFEEAD', '#D4A5A5', '#9B59B6', '#3498DB'
];

const DocumentEditor = ({ content, onUpdate, documentId }: DocumentEditorProps) => {
  const [localContent, setLocalContent] = useState(content);
  const [cursors, setCursors] = useState<CursorPosition[]>([]);
  const { toast } = useToast();
  
  const editor = useEditor({
    extensions: [StarterKit],
    content: localContent,
    onUpdate: ({ editor }) => {
      const newContent = editor.getHTML();
      setLocalContent(newContent);
      debouncedUpdate(newContent);
    },
    onCreate: ({ editor }) => {
      editor.view.dom.addEventListener('mousemove', handleCursorMove);
    },
    onDestroy: ({ editor }) => {
      editor.view.dom.removeEventListener('mousemove', handleCursorMove);
    },
  });

  const debouncedUpdate = debounce((newContent: string) => {
    onUpdate(newContent);
    channel?.send({
      type: 'broadcast',
      event: 'content_update',
      payload: { content: newContent },
    });
  }, 1000);

  const handleCursorMove = debounce(async (event: MouseEvent) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !channel) return;

    const rect = (event.target as HTMLElement).getBoundingClientRect();
    const position = {
      top: event.clientY - rect.top,
      left: event.clientX - rect.left,
    };

    channel.send({
      type: 'broadcast',
      event: 'cursor_move',
      payload: {
        userId: user.id,
        username: user.email?.split('@')[0] || 'Anonymous',
        position,
        color: colors[Math.floor(Math.random() * colors.length)],
      },
    });
  }, 50);

  const [channel, setChannel] = useState<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    if (!documentId) return;

    const newChannel = supabase.channel(`document:${documentId}`);

    newChannel
      .on('broadcast', { event: 'content_update' }, ({ payload }) => {
        if (payload.content !== localContent) {
          setLocalContent(payload.content);
          editor?.commands.setContent(payload.content);
        }
      })
      .on('broadcast', { event: 'cursor_move' }, ({ payload }) => {
        setCursors(prev => {
          const filtered = prev.filter(c => c.userId !== payload.userId);
          return [...filtered, payload as CursorPosition];
        });
      })
      .subscribe();

    setChannel(newChannel);

    return () => {
      newChannel.unsubscribe();
    };
  }, [documentId]);

  useEffect(() => {
    if (content !== localContent) {
      setLocalContent(content);
      editor?.commands.setContent(content);
    }
  }, [content]);

  useEffect(() => {
    const cleanup = setInterval(() => {
      setCursors(prev => prev.filter(c => 
        Date.now() - new Date(c.timestamp || 0).getTime() < 5000
      ));
    }, 5000);

    return () => clearInterval(cleanup);
  }, []);

  if (!editor) {
    return null;
  }

  return (
    <div className="border rounded-lg overflow-hidden relative">
      <div className="border-b bg-gray-50 p-2 flex gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={editor.isActive('bold') ? 'bg-gray-200' : ''}
        >
          <Bold className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={editor.isActive('italic') ? 'bg-gray-200' : ''}
        >
          <Italic className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={editor.isActive('bulletList') ? 'bg-gray-200' : ''}
        >
          <List className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={editor.isActive('orderedList') ? 'bg-gray-200' : ''}
        >
          <ListOrdered className="h-4 w-4" />
        </Button>
      </div>
      <div className="relative">
        <EditorContent editor={editor} className="p-4 min-h-[200px] prose max-w-none" />
        {cursors.map((cursor, index) => (
          <div
            key={cursor.userId}
            className="absolute pointer-events-none"
            style={{
              top: cursor.position.top,
              left: cursor.position.left,
              transform: 'translate(-50%, -50%)',
            }}
          >
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: cursor.color }}
            />
            <div
              className="px-2 py-1 rounded text-xs text-white mt-1"
              style={{ backgroundColor: cursor.color }}
            >
              {cursor.username}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default DocumentEditor;
