import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { CursorPosition, CURSOR_COLORS, createCursorTracker } from "@/utils/cursor-utils";

export const useCursors = (documentId: string, editorDomRef: React.RefObject<HTMLDivElement>) => {
  const [cursors, setCursors] = useState<CursorPosition[]>([]);
  const [userColor, setUserColor] = useState('');
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const cursorTrackerRef = useRef<ReturnType<typeof createCursorTracker>>();

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
      // Optimize update by only updating the specific cursor
      const filtered = prev.filter(c => c.userId !== payload.userId);
      return [...filtered, { ...payload, timestamp: Date.now() }];
    });
  }, []);

  // Set up the cursor movement handler with useRef to preserve references
  useEffect(() => {
    if (!documentId || !editorDomRef.current || !channelRef.current) return;
    
    // Create the cursor tracker only if needed
    if (!cursorTrackerRef.current) {
      cursorTrackerRef.current = createCursorTracker(channelRef.current, userColor);
    }
    
    const editorDom = editorDomRef.current;
    const trackerFn = cursorTrackerRef.current;
    
    if (trackerFn) {
      editorDom.addEventListener('mousemove', trackerFn);
    }
    
    return () => {
      if (trackerFn) {
        editorDom.removeEventListener('mousemove', trackerFn);
      }
    };
  }, [documentId, userColor, editorDomRef, channelRef.current]);

  // Supabase channel setup - use useRef to avoid unnecessary re-subscriptions
  useEffect(() => {
    if (!documentId) return;

    const newChannel = supabase.channel(`document:${documentId}`);

    newChannel
      .on('broadcast', { event: 'cursor_move' }, ({ payload }) => {
        updateCursors(payload);
      })
      .subscribe();

    channelRef.current = newChannel;

    return () => {
      newChannel.unsubscribe();
      channelRef.current = null;
    };
  }, [documentId, updateCursors]);

  // Clean up stale cursor positions with useRef for timer identity
  useEffect(() => {
    const cleanupTimerId = setInterval(() => {
      setCursors(prev => {
        const now = Date.now();
        // Only run filter if there are cursors with timestamps to check
        if (prev.some(c => c.timestamp)) {
          return prev.filter(c => c.timestamp && now - c.timestamp < 5000);
        }
        return prev;
      });
    }, 2000); // Less frequent cleanup

    return () => clearInterval(cleanupTimerId);
  }, []);

  return { channel: channelRef.current, cursors, userColor };
};
