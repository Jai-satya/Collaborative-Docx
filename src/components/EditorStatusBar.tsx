import { memo, useEffect, useState } from "react";
import { Editor } from "@tiptap/react";
import {
  Cloud,
  CloudOff,
  Clock,
  Eye,
  AlignCenter,
  Keyboard,
  Wifi,
  WifiOff,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import PomodoroTimer from "./PomodoroTimer";

interface EditorStatusBarProps {
  editor: Editor;
  isSaving: boolean;
  lastSaved: Date | null;
  isFocusMode: boolean;
  isTypewriterMode: boolean;
  onToggleShortcuts: () => void;
}

const EditorStatusBar = memo(
  ({
    editor,
    isSaving,
    lastSaved,
    isFocusMode,
    isTypewriterMode,
    onToggleShortcuts,
  }: EditorStatusBarProps) => {
    const [isOnline, setIsOnline] = useState(navigator.onLine);

    useEffect(() => {
      const handleOnline = () => setIsOnline(true);
      const handleOffline = () => setIsOnline(false);
      window.addEventListener("online", handleOnline);
      window.addEventListener("offline", handleOffline);
      return () => {
        window.removeEventListener("online", handleOnline);
        window.removeEventListener("offline", handleOffline);
      };
    }, []);

    const chars = editor.storage.characterCount?.characters() ?? 0;
    const words = editor.storage.characterCount?.words() ?? 0;
    const readingTime = Math.max(1, Math.ceil(words / 238));

    return (
      <div className="border-t border-border/50 bg-card/60 px-3 sm:px-4 py-1.5 sm:py-2 flex items-center justify-between text-xs font-ui text-muted-foreground gap-2">
        <div className="flex items-center gap-2 sm:gap-4">
          <span>{words.toLocaleString()} words</span>
          <span className="hidden sm:inline">
            {chars.toLocaleString()} characters
          </span>
          <span className="hidden sm:flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {readingTime} min read
          </span>
        </div>
        <div className="flex items-center gap-2 sm:gap-4">
          <span className="hidden md:inline-flex">
            <PomodoroTimer />
          </span>
          <Button
            variant="ghost"
            size="sm"
            className="hidden sm:inline-flex h-6 px-2 gap-1 text-xs text-muted-foreground hover:text-foreground"
            onClick={onToggleShortcuts}
          >
            <Keyboard className="h-3 w-3" />
            Shortcuts
          </Button>
          {isTypewriterMode && (
            <span className="hidden sm:flex items-center gap-1 text-primary">
              <AlignCenter className="h-3 w-3" />
              Typewriter
            </span>
          )}
          {isFocusMode && (
            <span className="hidden sm:flex items-center gap-1 text-primary">
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
          <span
            className={`hidden sm:flex items-center gap-1 ${isOnline ? "text-emerald-600" : "text-amber-600"}`}
          >
            {isOnline ? (
              <>
                <Wifi className="h-3 w-3" /> Online
              </>
            ) : (
              <>
                <WifiOff className="h-3 w-3" /> Offline
              </>
            )}
          </span>
        </div>
      </div>
    );
  },
);

EditorStatusBar.displayName = "EditorStatusBar";

export default EditorStatusBar;
