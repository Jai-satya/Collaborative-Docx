
import React from 'react';
import { Editor } from '@tiptap/react';
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { 
  Bold, Italic, Underline, Strikethrough, 
  List, ListOrdered, Quote, Code, Undo, Redo,
  Heading1, Heading2, AlignLeft, AlignCenter, AlignRight
} from "lucide-react";

interface EditorToolbarProps {
  editor: Editor | null;
}

type ToolbarItem = {
  icon: React.ReactNode;
  title: string;
  action: () => void;
  isActive: () => boolean;
};

const EditorToolbar: React.FC<EditorToolbarProps> = ({ editor }) => {
  if (!editor) {
    return null;
  }

  const formatItems: ToolbarItem[] = [
    {
      icon: <Bold className="h-4 w-4" />,
      title: "Bold",
      action: () => editor.chain().focus().toggleBold().run(),
      isActive: () => editor.isActive('bold'),
    },
    {
      icon: <Italic className="h-4 w-4" />,
      title: "Italic",
      action: () => editor.chain().focus().toggleItalic().run(),
      isActive: () => editor.isActive('italic'),
    },
    {
      icon: <Underline className="h-4 w-4" />,
      title: "Underline",
      action: () => editor.chain().focus().toggleUnderline().run(),
      isActive: () => editor.isActive('underline'),
    },
    {
      icon: <Strikethrough className="h-4 w-4" />,
      title: "Strikethrough",
      action: () => editor.chain().focus().toggleStrike().run(),
      isActive: () => editor.isActive('strike'),
    },
  ];

  const headingItems: ToolbarItem[] = [
    {
      icon: <Heading1 className="h-4 w-4" />,
      title: "Heading 1",
      action: () => editor.chain().focus().toggleHeading({ level: 1 }).run(),
      isActive: () => editor.isActive('heading', { level: 1 }),
    },
    {
      icon: <Heading2 className="h-4 w-4" />,
      title: "Heading 2",
      action: () => editor.chain().focus().toggleHeading({ level: 2 }).run(),
      isActive: () => editor.isActive('heading', { level: 2 }),
    },
  ];

  const listItems: ToolbarItem[] = [
    {
      icon: <List className="h-4 w-4" />,
      title: "Bullet List",
      action: () => editor.chain().focus().toggleBulletList().run(),
      isActive: () => editor.isActive('bulletList'),
    },
    {
      icon: <ListOrdered className="h-4 w-4" />,
      title: "Ordered List",
      action: () => editor.chain().focus().toggleOrderedList().run(),
      isActive: () => editor.isActive('orderedList'),
    },
    {
      icon: <Quote className="h-4 w-4" />,
      title: "Quote",
      action: () => editor.chain().focus().toggleBlockquote().run(),
      isActive: () => editor.isActive('blockquote'),
    },
    {
      icon: <Code className="h-4 w-4" />,
      title: "Code Block",
      action: () => editor.chain().focus().toggleCodeBlock().run(),
      isActive: () => editor.isActive('codeBlock'),
    },
  ];

  const alignmentItems: ToolbarItem[] = [
    {
      icon: <AlignLeft className="h-4 w-4" />,
      title: "Align Left",
      action: () => editor.chain().focus().setTextAlign('left').run(),
      isActive: () => editor.isActive({ textAlign: 'left' }),
    },
    {
      icon: <AlignCenter className="h-4 w-4" />,
      title: "Align Center",
      action: () => editor.chain().focus().setTextAlign('center').run(),
      isActive: () => editor.isActive({ textAlign: 'center' }),
    },
    {
      icon: <AlignRight className="h-4 w-4" />,
      title: "Align Right",
      action: () => editor.chain().focus().setTextAlign('right').run(),
      isActive: () => editor.isActive({ textAlign: 'right' }),
    },
  ];

  const historyItems: ToolbarItem[] = [
    {
      icon: <Undo className="h-4 w-4" />,
      title: "Undo",
      action: () => editor.chain().focus().undo().run(),
      isActive: () => false,
    },
    {
      icon: <Redo className="h-4 w-4" />,
      title: "Redo",
      action: () => editor.chain().focus().redo().run(),
      isActive: () => false,
    },
  ];

  const renderToolbarItems = (items: ToolbarItem[]) => {
    return items.map((item, index) => (
      <TooltipProvider key={index} delayDuration={300}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              onClick={item.action}
              className={item.isActive() ? 'bg-gray-200' : ''}
              disabled={item.title.includes('Undo') ? !editor.can().undo() : item.title.includes('Redo') ? !editor.can().redo() : false}
            >
              {item.icon}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>{item.title}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    ));
  };

  return (
    <div className="border-b bg-gray-50 p-2 sticky top-0 z-10 overflow-x-auto whitespace-nowrap">
      <div className="flex flex-wrap gap-1 justify-start items-center">
        <div className="flex gap-1">
          {renderToolbarItems(formatItems)}
        </div>
        
        <div className="h-6 border-r mx-1"></div>
        
        <div className="flex gap-1">
          {renderToolbarItems(headingItems)}
        </div>
        
        <div className="h-6 border-r mx-1"></div>
        
        <div className="flex gap-1">
          {renderToolbarItems(listItems)}
        </div>
        
        <div className="h-6 border-r mx-1"></div>
        
        <div className="flex gap-1">
          {renderToolbarItems(alignmentItems)}
        </div>
        
        <div className="h-6 border-r mx-1"></div>
        
        <div className="flex gap-1">
          {renderToolbarItems(historyItems)}
        </div>
      </div>
    </div>
  );
};

export default EditorToolbar;
