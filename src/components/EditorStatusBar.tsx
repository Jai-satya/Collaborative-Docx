import { memo } from 'react';
import { Editor } from '@tiptap/react';
import { Cloud, CloudOff, Clock, Eye } from 'lucide-react';

interface EditorStatusBarProps {
  editor: Editor;
  isSaving: boolean;
  lastSaved: Date | null;
  isFocusMode: boolean;
}

const EditorStatusBar = memo(({ editor, isSaving, lastSaved, isFocusMode }: EditorStatusBarProps) => {
  const chars = editor.storage.characterCount?.characters() ?? 0;
  const words = editor.storage.characterCount?.words() ?? 0;
  const readingTime = Math.max(1, Math.ceil(words / 238));

  return (
    <div className="border-t border-border/50 bg-card/60 px-4 py-2 flex items-center justify-between text-xs font-ui text-muted-foreground">
      <div className="flex items-center gap-4">
        <span>{words.toLocaleString()} words</span>
        <span>{chars.toLocaleString()} characters</span>
        <span className="flex items-center gap-1">
          <Clock className="h-3 w-3" />
          {readingTime} min read
        </span>
      </div>
      <div className="flex items-center gap-4">
        {isFocusMode && (
          <span className="flex items-center gap-1 text-primary">
            <Eye className="h-3 w-3" />
            Focus
          </span>
        )}
        <span className="flex items-center gap-1">
          {isSaving ? (
            <>
              <Cloud className="h-3 w-3 animate-pulse-subtle" />
              Saving...
            </>
          ) : lastSaved ? (
            <>
              <Cloud className="h-3 w-3 text-success" />
              Saved
            </>
          ) : (
            <>
              <CloudOff className="h-3 w-3" />
              Not saved
            </>
          )}
        </span>
      </div>
    </div>
  );
});

EditorStatusBar.displayName = 'EditorStatusBar';

export default EditorStatusBar;
