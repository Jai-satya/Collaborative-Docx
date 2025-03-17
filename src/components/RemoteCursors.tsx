
import React from 'react';
import { CursorPosition } from '@/utils/cursor-utils';

interface RemoteCursorsProps {
  cursors: CursorPosition[];
}

const RemoteCursors: React.FC<RemoteCursorsProps> = ({ cursors }) => {
  return (
    <>
      {cursors.map((cursor) => (
        <div
          key={cursor.userId}
          className="absolute pointer-events-none"
          style={{
            top: cursor.position.top,
            left: cursor.position.left,
            transform: 'translate(-50%, -50%)',
            zIndex: 50,
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
              textOverflow: 'ellipsis'
            }}
          >
            {cursor.username}
          </div>
        </div>
      ))}
    </>
  );
};

export default RemoteCursors;
