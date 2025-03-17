
import React, { memo } from 'react';
import { CursorPosition } from '@/utils/cursor-utils';

interface RemoteCursorsProps {
  cursors: CursorPosition[];
}

// Use memo to prevent unnecessary re-renders
const RemoteCursor = memo(({ cursor }: { cursor: CursorPosition }) => {
  return (
    <div
      className="absolute pointer-events-none will-change-transform"
      style={{
        top: cursor.position.top,
        left: cursor.position.left,
        transform: 'translate(-50%, -50%)',
        zIndex: 50,
        transition: 'top 0.08s ease, left 0.08s ease', // Faster cursor transitions
      }}
    >
      <div
        className="w-3 h-3 rounded-full"
        style={{ backgroundColor: cursor.color }}
      />
      <div
        className="px-2 py-1 rounded text-xs text-white mt-1"
        style={{ 
          backgroundColor: cursor.color,
          whiteSpace: 'nowrap',
          maxWidth: '150px',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          opacity: 0.8,
        }}
      >
        {cursor.username}
      </div>
    </div>
  );
});

RemoteCursor.displayName = 'RemoteCursor';

const RemoteCursors: React.FC<RemoteCursorsProps> = ({ cursors }) => {
  // Don't render more than a reasonable number of cursors to maintain performance
  const visibleCursors = cursors.slice(0, 10); 
  
  return (
    <>
      {visibleCursors.map((cursor) => (
        <RemoteCursor key={cursor.userId} cursor={cursor} />
      ))}
    </>
  );
};

export default memo(RemoteCursors);
