import { useState, useEffect, useCallback } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { CursorPosition, CURSOR_COLORS, createCursorTracker } from "@/utils/cursor-utils";

export const useCursors = (documentId: string, editorDomRef: React.RefObject<HTMLDivElement>) => {
  const [cursors, setCursors] = useState<CursorPosition[]>([]);
  const [userColor, setUserColor] = useState('');
  const [channel, setChannel] = useState<ReturnType<typeof supabase.channel> | null>(null);

  // Initialize user color - stored in localStorage to keep it consistent
  useEffect(() => {
    const storedColor = localStorage.getItem(`cursor-color-${documentId}`);
    if (storedColor) {
      setUserColor(storedColor);
    } else {
      const newColor = CURSOR_COLORS[Math.floor(Math.random() * CURSOR_COLORS.length)];
      localStorage.setItem(`cursor-color-${documentId}`, newColor);
      setUserColor(newColor);
    }
  }, [documentId]);

  // Memoized cursor update function to prevent re-renders
  const updateCursors = useCallback((payload: CursorPosition) => {
    setCursors(prev => {
      const filtered = prev.filter(c => c.userId !== payload.userId);
      return [...filtered, { ...payload, timestamp: Date.now() }];
    });
  }, []);

  // Set up the cursor movement handler
  useEffect(() => {
    if (!documentId || !editorDomRef.current || !channel) return;

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
        updateCursors(payload);
      })
      .subscribe();

    setChannel(newChannel);

    return () => {
      newChannel.unsubscribe();
    };
  }, [documentId, updateCursors]);

  // Clean up stale cursor positions
  useEffect(() => {
    const cleanup = setInterval(() => {
      setCursors(prev => prev.filter(c => 
        c.timestamp && Date.now() - c.timestamp < 5000
      ));
    }, 2000); // Less frequent cleanup

    return () => clearInterval(cleanup);
  }, []);

  return { channel, cursors, userColor };
};
