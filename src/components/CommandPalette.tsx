import { useState, useEffect, useCallback, useMemo } from "react";
import { Editor } from "@tiptap/react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  CheckSquare,
  Quote,
  Code,
  Minus,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Highlighter,
  Superscript,
  Subscript,
  Undo,
  Redo,
  CaseLower,
  CaseUpper,
  Type,
  RemoveFormatting,
  Copy,
  Scissors,
  Clipboard,
  Focus,
  Maximize2,
} from "lucide-react";

interface CommandPaletteProps {
  editor: Editor;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onToggleFocusMode: () => void;
  onToggleTypewriterMode: () => void;
  onToggleZenMode: () => void;
}

interface CommandAction {
  id: string;
  label: string;
  icon: React.ReactNode;
  shortcut?: string;
  action: () => void;
  group: string;
}

const CommandPalette = ({
  editor,
  open,
  onOpenChange,
  onToggleFocusMode,
  onToggleTypewriterMode,
  onToggleZenMode,
}: CommandPaletteProps) => {
  const actions: CommandAction[] = useMemo(
    () => [
      // Formatting
      {
        id: "bold",
        label: "Bold",
        icon: <Bold className="h-4 w-4" />,
        shortcut: "⌘B",
        action: () => editor.chain().focus().toggleBold().run(),
        group: "Formatting",
      },
      {
        id: "italic",
        label: "Italic",
        icon: <Italic className="h-4 w-4" />,
        shortcut: "⌘I",
        action: () => editor.chain().focus().toggleItalic().run(),
        group: "Formatting",
      },
      {
        id: "underline",
        label: "Underline",
        icon: <Underline className="h-4 w-4" />,
        shortcut: "⌘U",
        action: () => editor.chain().focus().toggleUnderline().run(),
        group: "Formatting",
      },
      {
        id: "strike",
        label: "Strikethrough",
        icon: <Strikethrough className="h-4 w-4" />,
        action: () => editor.chain().focus().toggleStrike().run(),
        group: "Formatting",
      },
      {
        id: "highlight",
        label: "Highlight",
        icon: <Highlighter className="h-4 w-4" />,
        action: () => editor.chain().focus().toggleHighlight().run(),
        group: "Formatting",
      },
      {
        id: "superscript",
        label: "Superscript",
        icon: <Superscript className="h-4 w-4" />,
        action: () => editor.chain().focus().toggleSuperscript().run(),
        group: "Formatting",
      },
      {
        id: "subscript",
        label: "Subscript",
        icon: <Subscript className="h-4 w-4" />,
        action: () => editor.chain().focus().toggleSubscript().run(),
        group: "Formatting",
      },
      {
        id: "clear-format",
        label: "Clear Formatting",
        icon: <RemoveFormatting className="h-4 w-4" />,
        action: () => editor.chain().focus().clearNodes().unsetAllMarks().run(),
        group: "Formatting",
      },

      // Headings & Blocks
      {
        id: "h1",
        label: "Heading 1",
        icon: <Heading1 className="h-4 w-4" />,
        action: () => editor.chain().focus().toggleHeading({ level: 1 }).run(),
        group: "Blocks",
      },
      {
        id: "h2",
        label: "Heading 2",
        icon: <Heading2 className="h-4 w-4" />,
        action: () => editor.chain().focus().toggleHeading({ level: 2 }).run(),
        group: "Blocks",
      },
      {
        id: "h3",
        label: "Heading 3",
        icon: <Heading3 className="h-4 w-4" />,
        action: () => editor.chain().focus().toggleHeading({ level: 3 }).run(),
        group: "Blocks",
      },
      {
        id: "bullet",
        label: "Bullet List",
        icon: <List className="h-4 w-4" />,
        action: () => editor.chain().focus().toggleBulletList().run(),
        group: "Blocks",
      },
      {
        id: "ordered",
        label: "Numbered List",
        icon: <ListOrdered className="h-4 w-4" />,
        action: () => editor.chain().focus().toggleOrderedList().run(),
        group: "Blocks",
      },
      {
        id: "task",
        label: "Task List",
        icon: <CheckSquare className="h-4 w-4" />,
        action: () => editor.chain().focus().toggleTaskList().run(),
        group: "Blocks",
      },
      {
        id: "blockquote",
        label: "Quote",
        icon: <Quote className="h-4 w-4" />,
        action: () => editor.chain().focus().toggleBlockquote().run(),
        group: "Blocks",
      },
      {
        id: "code",
        label: "Code Block",
        icon: <Code className="h-4 w-4" />,
        action: () => editor.chain().focus().toggleCodeBlock().run(),
        group: "Blocks",
      },
      {
        id: "divider",
        label: "Horizontal Rule",
        icon: <Minus className="h-4 w-4" />,
        action: () => editor.chain().focus().setHorizontalRule().run(),
        group: "Blocks",
      },

      // Alignment
      {
        id: "align-left",
        label: "Align Left",
        icon: <AlignLeft className="h-4 w-4" />,
        action: () => editor.chain().focus().setTextAlign("left").run(),
        group: "Alignment",
      },
      {
        id: "align-center",
        label: "Align Center",
        icon: <AlignCenter className="h-4 w-4" />,
        action: () => editor.chain().focus().setTextAlign("center").run(),
        group: "Alignment",
      },
      {
        id: "align-right",
        label: "Align Right",
        icon: <AlignRight className="h-4 w-4" />,
        action: () => editor.chain().focus().setTextAlign("right").run(),
        group: "Alignment",
      },

      // Text Transform
      {
        id: "uppercase",
        label: "UPPERCASE",
        icon: <CaseUpper className="h-4 w-4" />,
        action: () => transformText("upper"),
        group: "Transform",
      },
      {
        id: "lowercase",
        label: "lowercase",
        icon: <CaseLower className="h-4 w-4" />,
        action: () => transformText("lower"),
        group: "Transform",
      },
      {
        id: "titlecase",
        label: "Title Case",
        icon: <Type className="h-4 w-4" />,
        action: () => transformText("title"),
        group: "Transform",
      },
      {
        id: "sentencecase",
        label: "Sentence case",
        icon: <Type className="h-4 w-4" />,
        action: () => transformText("sentence"),
        group: "Transform",
      },

      // Modes
      {
        id: "focus-mode",
        label: "Toggle Focus Mode",
        icon: <Focus className="h-4 w-4" />,
        shortcut: "⌘⇧F",
        action: onToggleFocusMode,
        group: "Modes",
      },
      {
        id: "typewriter-mode",
        label: "Toggle Typewriter Mode",
        icon: <AlignCenter className="h-4 w-4" />,
        shortcut: "⌘⇧T",
        action: onToggleTypewriterMode,
        group: "Modes",
      },
      {
        id: "zen-mode",
        label: "Toggle Zen Mode",
        icon: <Maximize2 className="h-4 w-4" />,
        shortcut: "⌘⇧Z",
        action: onToggleZenMode,
        group: "Modes",
      },

      // History
      {
        id: "undo",
        label: "Undo",
        icon: <Undo className="h-4 w-4" />,
        shortcut: "⌘Z",
        action: () => editor.chain().focus().undo().run(),
        group: "History",
      },
      {
        id: "redo",
        label: "Redo",
        icon: <Redo className="h-4 w-4" />,
        shortcut: "⌘⇧Z",
        action: () => editor.chain().focus().redo().run(),
        group: "History",
      },
    ],
    [editor, onToggleFocusMode, onToggleTypewriterMode, onToggleZenMode],
  );

  const transformText = useCallback(
    (type: "upper" | "lower" | "title" | "sentence") => {
      const { from, to } = editor.state.selection;
      const text = editor.state.doc.textBetween(from, to);
      if (!text) return;

      let transformed: string;
      switch (type) {
        case "upper":
          transformed = text.toUpperCase();
          break;
        case "lower":
          transformed = text.toLowerCase();
          break;
        case "title":
          transformed = text.replace(
            /\w\S*/g,
            (t) => t.charAt(0).toUpperCase() + t.slice(1).toLowerCase(),
          );
          break;
        case "sentence":
          transformed =
            text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
          break;
      }
      editor.chain().focus().insertContentAt({ from, to }, transformed).run();
    },
    [editor],
  );

  const groups = useMemo(() => {
    const grouped = new Map<string, CommandAction[]>();
    for (const action of actions) {
      const list = grouped.get(action.group) || [];
      list.push(action);
      grouped.set(action.group, list);
    }
    return grouped;
  }, [actions]);

  const handleSelect = useCallback(
    (actionId: string) => {
      const action = actions.find((a) => a.id === actionId);
      if (action) {
        action.action();
        onOpenChange(false);
      }
    },
    [actions, onOpenChange],
  );

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder="Type a command or search..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        {Array.from(groups.entries()).map(([group, items], gi) => (
          <div key={group}>
            {gi > 0 && <CommandSeparator />}
            <CommandGroup heading={group}>
              {items.map((item) => (
                <CommandItem
                  key={item.id}
                  value={item.id}
                  onSelect={handleSelect}
                >
                  {item.icon}
                  <span className="ml-2">{item.label}</span>
                  {item.shortcut && (
                    <span className="ml-auto text-xs text-muted-foreground">
                      {item.shortcut}
                    </span>
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          </div>
        ))}
      </CommandList>
    </CommandDialog>
  );
};

export default CommandPalette;
