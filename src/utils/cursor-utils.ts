
import { debounce } from 'lodash';
import { supabase } from "@/integrations/supabase/client";

export const CURSOR_COLORS = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', 
  '#FFEEAD', '#D4A5A5', '#9B59B6', '#3498DB'
];

export interface CursorPosition {
  userId: string;
  username: string;
  position: { top: number; left: number };
  color: string;
  timestamp?: number;
}

export const createCursorTracker = (channel: ReturnType<typeof supabase.channel> | null, userColor: string) => {
  return debounce(async (event: MouseEvent) => {
    if (!channel) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

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
        color: userColor,
        timestamp: Date.now(),
      },
    });
  }, 50);
};
