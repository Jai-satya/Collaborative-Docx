import { useEffect, useState, useRef } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Button } from "@/components/ui/button";
import { Bold, Italic, List, ListOrdered, Users, Sparkles, Mic, MicOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { debounce } from 'lodash';
import { useToast } from "@/components/ui/use-toast";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

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
  timestamp?: number;
  selection?: { from: number; to: number } | null;
}

const colors = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', 
  '#FFEEAD', '#D4A5A5', '#9B59B6', '#3498DB'
];

const DocumentEditor = ({ content, onUpdate, documentId }: DocumentEditorProps) => {
  const [localContent, setLocalContent] = useState(content);
  const [cursors, setCursors] = useState<CursorPosition[]>([]);
  const [activeUsers, setActiveUsers] = useState<string[]>([]);
  const { toast } = useToast();
  const [userColor, setUserColor] = useState('');
  const editorRef = useRef<HTMLDivElement>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [aiSuggesting, setAiSuggesting] = useState(false);
  
  const editor = useEditor({
    extensions: [StarterKit],
    content: localContent,
    onUpdate: ({ editor }) => {
      const newContent = editor.getHTML();
      setLocalContent(newContent);
      debouncedUpdate(newContent);
    }
  });

  const debouncedUpdate = debounce((newContent: string) => {
    onUpdate(newContent);
    if (channel) {
      channel.send({
        type: 'broadcast',
        event: 'content_update',
        payload: { content: newContent },
      });
    }
  }, 1000);

  const handleCursorMove = debounce(async (event: MouseEvent) => {
    try {
      const userResponse = await supabase.auth.getUser();
      const user = userResponse.data.user;
      if (!user || !channel || !editorRef.current) return;

      // Initialize user color if not already set
      if (!userColor) {
        const newColor = colors[Math.floor(Math.random() * colors.length)];
        setUserColor(newColor);
      }

      const rect = editorRef.current.getBoundingClientRect();
      const position = {
        top: event.clientY - rect.top,
        left: event.clientX - rect.left,
      };

      // Get current selection if any
      let selection = null;
      if (editor && editor.state.selection) {
        const { from, to } = editor.state.selection;
        if (from !== to) {
          selection = { from, to };
        }
      }

      channel.send({
        type: 'broadcast',
        event: 'cursor_move',
        payload: {
          userId: user.id,
          username: user.email?.split('@')[0] || 'Anonymous',
          position,
          color: userColor || colors[Math.floor(Math.random() * colors.length)],
          timestamp: Date.now(),
          selection,
        },
      });
    } catch (error) {
      console.error("Error tracking cursor:", error);
    }
  }, 50);

  const [channel, setChannel] = useState<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    if (!documentId) return;

    const newChannel = supabase.channel(`document:${documentId}`);

    newChannel
      .on('broadcast', { event: 'content_update' }, ({ payload }) => {
        if (payload.content !== localContent) {
          setLocalContent(payload.content);
          if (editor) {
            editor.commands.setContent(payload.content);
          }
        }
      })
      .on('broadcast', { event: 'cursor_move' }, ({ payload }) => {
        setCursors(prev => {
          setActiveUsers(current => {
            if (!current.includes(payload.userId)) {
              return [...current, payload.userId];
            }
            return current;
          });
          
          const filtered = prev.filter(c => c.userId !== payload.userId);
          return [...filtered, { ...payload, timestamp: Date.now() }];
        });
      })
      .subscribe();

    setChannel(newChannel);

    if (editorRef.current) {
      editorRef.current.addEventListener('mousemove', handleCursorMove);
    }

    return () => {
      newChannel.unsubscribe();
      if (editorRef.current) {
        editorRef.current.removeEventListener('mousemove', handleCursorMove);
      }
    };
  }, [documentId, editor, localContent, handleCursorMove]);

  useEffect(() => {
    if (content !== localContent && editor) {
      setLocalContent(content);
      editor.commands.setContent(content);
    }
  }, [content, editor]);

  useEffect(() => {
    const cleanup = setInterval(() => {
      setCursors(prev => prev.filter(c => 
        c.timestamp && Date.now() - c.timestamp < 5000
      ));
      
      setActiveUsers(current => {
        const activeIds = cursors
          .filter(c => c.timestamp && Date.now() - c.timestamp < 30000)
          .map(c => c.userId);
        return current.filter(id => activeIds.includes(id));
      });
    }, 5000);

    return () => clearInterval(cleanup);
  }, [cursors]);

  useEffect(() => {
    if (!userColor) {
      setUserColor(colors[Math.floor(Math.random() * colors.length)]);
    }
  }, [userColor]);

  const suggestCompletion = async () => {
    if (!editor) return;
    
    try {
      setAiSuggesting(true);
      
      const currentContent = editor.getText();
      if (currentContent.length < 10) {
        toast({
          title: "Not enough content",
          description: "Please write a bit more before requesting AI suggestions.",
          variant: "destructive"
        });
        setAiSuggesting(false);
        return;
      }
      
      const response = await fetch(`${window.location.origin}/api/suggest-completion`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          content: currentContent,
          documentId
        }),
      });
      
      if (!response.ok) {
        throw new Error("Failed to get AI suggestions");
      }
      
      const { suggestion } = await response.json();
      
      if (suggestion && editor) {
        editor.commands.insertContent(suggestion);
        toast({
          title: "AI Suggestion Added",
          description: "Content has been added based on your text.",
        });
      }
    } catch (error) {
      console.error("Error getting AI suggestions:", error);
      toast({
        title: "Error",
        description: "Failed to get AI suggestions. Please try again.",
        variant: "destructive"
      });
    } finally {
      setAiSuggesting(false);
    }
  };

  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [audioChunks, setAudioChunks] = useState<Blob[]>([]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          setAudioChunks(prev => [...prev, event.data]);
        }
      };
      
      recorder.onstop = async () => {
        if (audioChunks.length === 0) return;
        
        const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
        const reader = new FileReader();
        
        reader.onloadend = async () => {
          const base64Audio = reader.result?.toString().split(',')[1];
          
          if (base64Audio) {
            try {
              toast({
                title: "Processing audio...",
                description: "Converting your speech to text...",
              });
              
              const response = await fetch(`${window.location.origin}/api/speech-to-text`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({ audio: base64Audio }),
              });
              
              if (!response.ok) {
                throw new Error("Failed to transcribe audio");
              }
              
              const { text } = await response.json();
              
              if (text && editor) {
                editor.commands.insertContent(text);
                toast({
                  title: "Transcription Complete",
                  description: "Your speech has been added to the document.",
                });
              }
            } catch (error) {
              console.error("Error transcribing audio:", error);
              toast({
                title: "Error",
                description: "Failed to transcribe audio. Please try again.",
                variant: "destructive"
              });
            }
          }
          
          setAudioChunks([]);
        };
        
        reader.readAsDataURL(audioBlob);
      };
      
      recorder.start();
      setMediaRecorder(recorder);
      setIsRecording(true);
      
      toast({
        title: "Recording started",
        description: "Speak clearly into your microphone.",
      });
    } catch (error) {
      console.error("Error starting recording:", error);
      toast({
        title: "Error",
        description: "Could not access microphone. Please check permissions.",
        variant: "destructive"
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorder && isRecording) {
      mediaRecorder.stop();
      setIsRecording(false);
      
      mediaRecorder.stream.getTracks().forEach(track => track.stop());
    }
  };

  if (!editor) {
    return null;
  }

  return (
    <div className="border rounded-lg overflow-hidden relative">
      <div className="border-b bg-gray-50 p-2 flex gap-2 items-center justify-between">
        <div className="flex gap-2">
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
        
        <div className="flex items-center gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button 
                variant="outline" 
                size="sm" 
                className="flex items-center gap-1"
                disabled={aiSuggesting}
                onClick={(e) => e.preventDefault()}
              >
                <Sparkles className="h-4 w-4" />
                <span>AI assist</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-4">
              <div className="space-y-4">
                <h4 className="font-medium">AI Writing Assistant</h4>
                <p className="text-sm text-muted-foreground">
                  Get suggestions based on your current content to help you write more effectively.
                </p>
                <Button 
                  className="w-full" 
                  onClick={suggestCompletion}
                  disabled={aiSuggesting}
                >
                  {aiSuggesting ? "Generating..." : "Generate suggestions"}
                </Button>
              </div>
            </PopoverContent>
          </Popover>
          
          <Button
            variant={isRecording ? "destructive" : "outline"}
            size="sm"
            className="flex items-center gap-1"
            onClick={isRecording ? stopRecording : startRecording}
          >
            {isRecording ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
            <span>{isRecording ? "Stop" : "Voice"}</span>
          </Button>
        
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-1 bg-gray-100 px-2 py-1 rounded-md text-sm">
                  <Users className="h-3 w-3" />
                  <span>{activeUsers.length} active</span>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-xs">Users currently viewing this document</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>
      <div className="relative" ref={editorRef}>
        <EditorContent editor={editor} className="p-4 min-h-[200px] prose max-w-none" />
        
        {cursors.map((cursor) => (
          <div
            key={cursor.userId}
            className="absolute pointer-events-none z-10 transition-all duration-200 ease-in-out"
            style={{
              top: cursor.position.top,
              left: cursor.position.left,
              transform: 'translate(-50%, -50%)',
            }}
          >
            <div className="flex flex-col items-center">
              <div
                className="w-3 h-3 rounded-full animate-pulse"
                style={{ backgroundColor: cursor.color }}
              />
              <div
                className="px-2 py-1 rounded text-xs text-white mt-1 whitespace-nowrap"
                style={{ backgroundColor: cursor.color }}
              >
                {cursor.username}
              </div>
            </div>
          </div>
        ))}
        
        {cursors
          .filter(cursor => cursor.selection && cursor.userId !== supabase.auth.getUser()?.data?.user?.id)
          .map((cursor) => {
            if (!cursor.selection || !editor) return null;
            
            return (
              <div 
                key={`selection-${cursor.userId}`}
                className="absolute bottom-2 right-2 px-2 py-1 rounded-full text-xs bg-opacity-80 z-20"
                style={{ backgroundColor: cursor.color }}
              >
                {cursor.username} is selecting text
              </div>
            );
          })}
      </div>
    </div>
  );
};

export default DocumentEditor;
