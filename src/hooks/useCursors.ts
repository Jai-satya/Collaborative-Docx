
import { useState, useEffect } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { CursorPosition, CURSOR_COLORS, createCursorTracker } from "@/utils/cursor-utils";

export const useCursors = (documentId: string, editorDomRef: React.RefObject<HTMLDivElement>) => {
  const [cursors, setCursors] = useState<CursorPosition[]>([]);
  const [userColor, setUserColor] = useState('');
  const [channel, setChannel] = useState<ReturnType<typeof supabase.channel> | null>(null);

  // Initialize user color
  useEffect(() => {
    if (!userColor) {
      setUserColor(CURSOR_COLORS[Math.floor(Math.random() * CURSOR_COLORS.length)]);
    }
  }, [userColor]);

  // Set up the cursor movement handler
  useEffect(() => {
    if (!documentId || !editorDomRef.current) return;

    const cursorTracker = createCursorTracker(channel, userColor);
    
    const editorDom = editorDomRef.current;
    editorDom.addEventListener('mousemove', cursorTracker);
    
    return () => {
      editorDom.removeEventListener('mousemove', cursorTracker);
    };
  }, [documentId, channel, userColor, editorDomRef]);

  // Supabase channel setup
  useEffect(() => {
    if (!documentId) return;

    const newChannel = supabase.channel(`document:${documentId}`);

    newChannel
      .on('broadcast', { event: 'cursor_move' }, ({ payload }) => {
        setCursors(prev => {
          const filtered = prev.filter(c => c.userId !== payload.userId);
          return [...filtered, { ...payload, timestamp: Date.now() }];
        });
      })
      .subscribe();

    setChannel(newChannel);

    return () => {
      newChannel.unsubscribe();
    };
  }, [documentId]);

  // Clean up stale cursor positions
  useEffect(() => {
    const cleanup = setInterval(() => {
      setCursors(prev => prev.filter(c => 
        c.timestamp && Date.now() - c.timestamp < 5000
      ));
    }, 5000);

    return () => clearInterval(cleanup);
  }, []);

  return { channel, cursors, userColor };
};
