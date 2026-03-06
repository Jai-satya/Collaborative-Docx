import { memo } from "react";
import { Button } from "@/components/ui/button";
import { Keyboard, X } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface KeyboardShortcutsProps {
  onClose: () => void;
}

const isMac = typeof navigator !== "undefined" && /Mac/.test(navigator.userAgent);
const mod = isMac ? "⌘" : "Ctrl";

const shortcuts = [
  {
    group: "Text Formatting",
    items: [
      { keys: `${mod}+B`, label: "Bold" },
      { keys: `${mod}+I`, label: "Italic" },
      { keys: `${mod}+U`, label: "Underline" },
      { keys: `${mod}+Shift+X`, label: "Strikethrough" },
      { keys: `${mod}+E`, label: "Inline Code" },
      { keys: `${mod}+Shift+H`, label: "Highlight" },
    ],
  },
  {
    group: "Blocks & Structure",
    items: [
      { keys: "# + Space", label: "Heading 1" },
      { keys: "## + Space", label: "Heading 2" },
      { keys: "### + Space", label: "Heading 3" },
      { keys: "- + Space", label: "Bullet List" },
      { keys: "1. + Space", label: "Numbered List" },
      { keys: "[] + Space", label: "Task List" },
      { keys: "> + Space", label: "Blockquote" },
      { keys: "``` + Space", label: "Code Block" },
      { keys: "--- ", label: "Horizontal Rule" },
    ],
  },
  {
    group: "Navigation & Editing",
    items: [
      { keys: `${mod}+Z`, label: "Undo" },
      { keys: `${mod}+Shift+Z`, label: "Redo" },
      { keys: `${mod}+A`, label: "Select All" },
      { keys: `${mod}+C`, label: "Copy" },
      { keys: `${mod}+V`, label: "Paste" },
      { keys: `${mod}+X`, label: "Cut" },
      { keys: "Tab", label: "Indent List" },
      { keys: "Shift+Tab", label: "Outdent List" },
      { keys: "Enter", label: "New Paragraph" },
      { keys: "Shift+Enter", label: "Line Break" },
    ],
  },
  {
    group: "App Features",
    items: [
      { keys: `${mod}+K`, label: "Command Palette" },
      { keys: `${mod}+Shift+H`, label: "Find & Replace" },
      { keys: `${mod}+Shift+F`, label: "Focus Mode" },
      { keys: `${mod}+Shift+T`, label: "Typewriter Mode" },
      { keys: "Escape", label: "Exit Zen Mode" },
    ],
  },
  {
    group: "Markdown Shortcuts",
    items: [
      { keys: '**text**', label: "Bold (while typing)" },
      { keys: '*text*', label: "Italic (while typing)" },
      { keys: '~~text~~', label: "Strikethrough (while typing)" },
      { keys: '`code`', label: "Inline Code (while typing)" },
      { keys: '(c)', label: "© copyright" },
      { keys: '(r)', label: "® registered" },
      { keys: '(tm)', label: "™ trademark" },
      { keys: '--', label: "— em dash" },
      { keys: '1/2', label: "½ fraction" },
      { keys: '!=', label: "≠ not equal" },
    ],
  },
];

const KeyboardShortcuts = memo(({ onClose }: KeyboardShortcutsProps) => {
  return (
    <div className="border border-border/50 rounded-lg bg-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Keyboard className="h-4 w-4 text-primary" />
          <h3 className="font-ui text-sm font-semibold">Shortcuts</h3>
        </div>
        <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={onClose}>
          <X className="h-3 w-3" />
        </Button>
      </div>
      <ScrollArea className="max-h-[500px]">
        <div className="space-y-4 pr-2">
          {shortcuts.map(({ group, items }) => (
            <div key={group}>
              <h4 className="text-[10px] font-ui font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                {group}
              </h4>
              <div className="space-y-1">
                {items.map(({ keys, label }) => (
                  <div key={keys + label} className="flex items-center justify-between py-0.5">
                    <span className="text-xs font-ui text-foreground">{label}</span>
                    <kbd className="text-[10px] font-mono bg-muted px-1.5 py-0.5 rounded border border-border/50 text-muted-foreground whitespace-nowrap">
                      {keys}
                    </kbd>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
});

KeyboardShortcuts.displayName = "KeyboardShortcuts";

export default KeyboardShortcuts;
