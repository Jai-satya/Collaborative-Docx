
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

    // Get the element that was moused over
    const targetElement = event.target as HTMLElement;
    const rect = targetElement.getBoundingClientRect();
    
    // Calculate relative position within the editor
    const position = {
      top: event.clientY - rect.top,
      left: event.clientX - rect.left,
    };

    // Only send position update if it's significantly different from last one
    // This helps reduce network traffic
    const presenceState = channel.presenceState();
    
    // Check if there's presence data for this user
    const userPresence = presenceState[user.id];
    
    // In Supabase Realtime, the state we track becomes available in the presence state
    // The previous implementation was incorrect - we need to check the state we tracked
    let lastPosition = undefined;
    
    // Safely check if the user has previous position data
    if (userPresence && Array.isArray(userPresence) && userPresence.length > 0) {
      // The state we track with channel.track() becomes available here
      // Extract cursor position from the appropriate property
      const presenceData = userPresence[0] as any; // Type as any for now to access properties
      if (presenceData && typeof presenceData === 'object') {
        // Try to get position from where we track it
        lastPosition = presenceData.position;
      }
    }

    const hasMovedSignificantly = !lastPosition || 
      Math.abs(lastPosition.top - position.top) > 5 || 
      Math.abs(lastPosition.left - position.left) > 5;

    if (hasMovedSignificantly) {
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
    }
  }, 25); // Reduced to 25ms for smoother cursor movement
};
