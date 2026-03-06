import React, { useCallback, memo } from 'react';
import { Editor } from '@tiptap/react';
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Separator } from "@/components/ui/separator";
import {
  Bold, Italic, Underline, Strikethrough,
  List, ListOrdered, Quote, Code, Undo, Redo,
  Heading1, Heading2, Heading3, AlignLeft, AlignCenter, AlignRight,
  Highlighter, CheckSquare, Superscript, Subscript, Focus, Minus,
  Type
} from "lucide-react";

interface EditorToolbarProps {
  editor: Editor | null;
  isFocusMode: boolean;
  onToggleFocusMode: () => void;
}

const ToolbarButton = memo(({ icon, title, action, isActive, disabled, shortcut }: {
  icon: React.ReactNode;
  title: string;
  action: () => void;
  isActive: boolean;
  disabled?: boolean;
  shortcut?: string;
}) => (
  <TooltipProvider delayDuration={400}>
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          onClick={action}
          disabled={disabled}
          className={`h-8 w-8 p-0 rounded-md transition-colors ${
            isActive 
              ? 'bg-accent text-accent-foreground' 
              : 'text-muted-foreground hover:text-foreground hover:bg-muted'
          }`}
        >
          {icon}
        </Button>
      </TooltipTrigger>
      <TooltipContent className="font-ui text-xs">
        {title}{shortcut && <span className="ml-1.5 text-muted-foreground">{shortcut}</span>}
      </TooltipContent>
    </Tooltip>
  </TooltipProvider>
));

ToolbarButton.displayName = 'ToolbarButton';

const EditorToolbar: React.FC<EditorToolbarProps> = ({ editor, isFocusMode, onToggleFocusMode }) => {
  if (!editor) return null;

  const groups = [
    // Text formatting
    [
      { icon: <Bold className="h-3.5 w-3.5" />, title: "Bold", action: () => editor.chain().focus().toggleBold().run(), isActive: editor.isActive('bold'), shortcut: "⌘B" },
      { icon: <Italic className="h-3.5 w-3.5" />, title: "Italic", action: () => editor.chain().focus().toggleItalic().run(), isActive: editor.isActive('italic'), shortcut: "⌘I" },
      { icon: <Underline className="h-3.5 w-3.5" />, title: "Underline", action: () => editor.chain().focus().toggleUnderline().run(), isActive: editor.isActive('underline'), shortcut: "⌘U" },
      { icon: <Strikethrough className="h-3.5 w-3.5" />, title: "Strikethrough", action: () => editor.chain().focus().toggleStrike().run(), isActive: editor.isActive('strike') },
      { icon: <Highlighter className="h-3.5 w-3.5" />, title: "Highlight", action: () => editor.chain().focus().toggleHighlight().run(), isActive: editor.isActive('highlight') },
    ],
    // Headings
    [
      { icon: <Heading1 className="h-3.5 w-3.5" />, title: "Heading 1", action: () => editor.chain().focus().toggleHeading({ level: 1 }).run(), isActive: editor.isActive('heading', { level: 1 }) },
      { icon: <Heading2 className="h-3.5 w-3.5" />, title: "Heading 2", action: () => editor.chain().focus().toggleHeading({ level: 2 }).run(), isActive: editor.isActive('heading', { level: 2 }) },
      { icon: <Heading3 className="h-3.5 w-3.5" />, title: "Heading 3", action: () => editor.chain().focus().toggleHeading({ level: 3 }).run(), isActive: editor.isActive('heading', { level: 3 }) },
    ],
    // Blocks
    [
      { icon: <List className="h-3.5 w-3.5" />, title: "Bullet List", action: () => editor.chain().focus().toggleBulletList().run(), isActive: editor.isActive('bulletList') },
      { icon: <ListOrdered className="h-3.5 w-3.5" />, title: "Ordered List", action: () => editor.chain().focus().toggleOrderedList().run(), isActive: editor.isActive('orderedList') },
      { icon: <CheckSquare className="h-3.5 w-3.5" />, title: "Task List", action: () => editor.chain().focus().toggleTaskList().run(), isActive: editor.isActive('taskList') },
      { icon: <Quote className="h-3.5 w-3.5" />, title: "Quote", action: () => editor.chain().focus().toggleBlockquote().run(), isActive: editor.isActive('blockquote') },
      { icon: <Code className="h-3.5 w-3.5" />, title: "Code Block", action: () => editor.chain().focus().toggleCodeBlock().run(), isActive: editor.isActive('codeBlock') },
      { icon: <Minus className="h-3.5 w-3.5" />, title: "Divider", action: () => editor.chain().focus().setHorizontalRule().run(), isActive: false },
    ],
    // Alignment
    [
      { icon: <AlignLeft className="h-3.5 w-3.5" />, title: "Left", action: () => editor.chain().focus().setTextAlign('left').run(), isActive: editor.isActive({ textAlign: 'left' }) },
      { icon: <AlignCenter className="h-3.5 w-3.5" />, title: "Center", action: () => editor.chain().focus().setTextAlign('center').run(), isActive: editor.isActive({ textAlign: 'center' }) },
      { icon: <AlignRight className="h-3.5 w-3.5" />, title: "Right", action: () => editor.chain().focus().setTextAlign('right').run(), isActive: editor.isActive({ textAlign: 'right' }) },
    ],
    // Super/Sub
    [
      { icon: <Superscript className="h-3.5 w-3.5" />, title: "Superscript", action: () => editor.chain().focus().toggleSuperscript().run(), isActive: editor.isActive('superscript') },
      { icon: <Subscript className="h-3.5 w-3.5" />, title: "Subscript", action: () => editor.chain().focus().toggleSubscript().run(), isActive: editor.isActive('subscript') },
    ],
    // History + Focus
    [
      { icon: <Undo className="h-3.5 w-3.5" />, title: "Undo", action: () => editor.chain().focus().undo().run(), isActive: false, disabled: !editor.can().undo(), shortcut: "⌘Z" },
      { icon: <Redo className="h-3.5 w-3.5" />, title: "Redo", action: () => editor.chain().focus().redo().run(), isActive: false, disabled: !editor.can().redo(), shortcut: "⌘⇧Z" },
      { icon: <Focus className="h-3.5 w-3.5" />, title: "Focus Mode", action: onToggleFocusMode, isActive: isFocusMode, shortcut: "⌘⇧F" },
    ],
  ];

  return (
    <div className="border-b border-border/50 bg-card/80 backdrop-blur-sm px-3 py-1.5 sticky top-0 z-10">
      <div className="flex flex-wrap items-center gap-0.5">
        {groups.map((group, gi) => (
          <React.Fragment key={gi}>
            {gi > 0 && <Separator orientation="vertical" className="h-5 mx-1" />}
            <div className="flex items-center gap-0.5">
              {group.map((item, ii) => (
                <ToolbarButton key={ii} {...item} isActive={!!item.isActive} />
              ))}
            </div>
          </React.Fragment>
        ))}
      </div>
    </div>
  );
};

export default memo(EditorToolbar);
