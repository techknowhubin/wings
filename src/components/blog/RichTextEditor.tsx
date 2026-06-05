import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import TextAlign from '@tiptap/extension-text-align';
import Color from '@tiptap/extension-color';
import { TextStyle } from '@tiptap/extension-text-style';
import Highlight from '@tiptap/extension-highlight';
import Underline from '@tiptap/extension-underline';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import { Table } from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';
import CharacterCount from '@tiptap/extension-character-count';
import { useCallback, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  Bold, Italic, Underline as UnderlineIcon, Strikethrough, Code,
  List, ListOrdered, ListChecks, Quote, Minus, Link as LinkIcon,
  AlignLeft, AlignCenter, AlignRight, AlignJustify,
  Heading1, Heading2, Heading3, ImageIcon, Table as TableIcon,
  Highlighter, Undo, Redo, Type, Pilcrow, Upload, Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Popover, PopoverContent, PopoverTrigger,
} from '@/components/ui/popover';
import { Input } from '@/components/ui/input';

interface RichTextEditorProps {
  content: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minHeight?: number;
}

// ─── Toolbar Button ───────────────────────────────────────────────────────────
function ToolBtn({
  onClick, active, disabled, title, children,
}: {
  onClick: () => void; active?: boolean; disabled?: boolean; title: string; children: React.ReactNode;
}) {
  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            onMouseDown={(e) => { e.preventDefault(); onClick(); }}
            disabled={disabled}
            className={`h-7 w-7 rounded flex items-center justify-center text-sm transition-colors
              ${active ? 'bg-[#013220] text-white' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}
              ${disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
          >
            {children}
          </button>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="text-xs">{title}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

function Divider() {
  return <div className="w-px h-5 bg-border mx-0.5 flex-shrink-0" />;
}

export default function RichTextEditor({ content, onChange, placeholder, minHeight = 400 }: RichTextEditorProps) {
  const [uploadingImage, setUploadingImage] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [linkOpen, setLinkOpen] = useState(false);
  const [colorOpen, setColorOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3, 4, 5, 6] },
        codeBlock: { HTMLAttributes: { class: 'bg-muted rounded-lg p-4 text-sm font-mono overflow-x-auto' } },
        blockquote: { HTMLAttributes: { class: 'border-l-4 border-primary/40 pl-4 italic text-muted-foreground' } },
        bulletList: { HTMLAttributes: { class: 'list-disc pl-6 space-y-1' } },
        orderedList: { HTMLAttributes: { class: 'list-decimal pl-6 space-y-1' } },
      }),
      Image.configure({ HTMLAttributes: { class: 'rounded-xl max-w-full my-4 mx-auto block' }, allowBase64: false }),
      Link.configure({ openOnClick: false, HTMLAttributes: { class: 'text-primary underline underline-offset-2 cursor-pointer' }, autolink: true }),
      Placeholder.configure({ placeholder: placeholder ?? 'Start writing your blog post...' }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      TextStyle,
      Color,
      Highlight.configure({ multicolor: true }),
      Underline,
      TaskList,
      TaskItem.configure({ nested: true }),
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
      CharacterCount,
    ],
    content,
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none focus:outline-none px-6 py-4',
        style: `min-height: ${minHeight}px`,
      },
    },
  });

  const uploadImage = useCallback(async (file: File) => {
    if (!file.type.startsWith('image/')) { toast.error('Only image files allowed.'); return; }
    if (file.size > 10 * 1024 * 1024) { toast.error('Image must be under 10MB.'); return; }
    setUploadingImage(true);
    try {
      const ext = file.name.split('.').pop() ?? 'jpg';
      const path = `blog/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error: upErr } = await supabase.storage.from('blog-images').upload(path, file, { upsert: false });
      if (upErr) throw upErr;
      const { data: { publicUrl } } = supabase.storage.from('blog-images').getPublicUrl(path);
      editor?.chain().focus().setImage({ src: publicUrl, alt: file.name.replace(/\.[^.]+$/, '') }).run();
      toast.success('Image uploaded!');
    } catch (e: any) {
      toast.error(e?.message ?? 'Image upload failed.');
    } finally {
      setUploadingImage(false);
    }
  }, [editor]);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) void uploadImage(file);
    e.target.value = '';
  };

  const handlePasteOrDrop = useCallback((e: React.ClipboardEvent | React.DragEvent) => {
    const items = 'clipboardData' in e ? e.clipboardData?.items : (e as React.DragEvent).dataTransfer?.items;
    if (!items) return;
    for (const item of Array.from(items)) {
      if (item.kind === 'file' && item.type.startsWith('image/')) {
        const file = item.getAsFile();
        if (file) { void uploadImage(file); e.preventDefault(); }
      }
    }
  }, [uploadImage]);

  const setLink = () => {
    if (!linkUrl) { editor?.chain().focus().extendMarkRange('link').unsetLink().run(); return; }
    const url = linkUrl.startsWith('http') ? linkUrl : `https://${linkUrl}`;
    editor?.chain().focus().extendMarkRange('link').setLink({ href: url, target: '_blank' }).run();
    setLinkUrl(''); setLinkOpen(false);
  };

  const HIGHLIGHT_COLORS = ['#FEF08A', '#BBF7D0', '#BAE6FD', '#FCA5A5', '#DDD6FE', '#FED7AA'];
  const TEXT_COLORS = ['#013220', '#1e40af', '#dc2626', '#d97706', '#059669', '#7c3aed', '#111827', '#6b7280'];

  if (!editor) return null;

  const wc = editor.storage.characterCount?.words() ?? 0;
  const cc = editor.storage.characterCount?.characters() ?? 0;
  const rt = Math.max(1, Math.ceil(wc / 200));

  return (
    <div className="rounded-xl border border-border bg-background overflow-hidden flex flex-col">
      {/* Toolbar */}
      <div className="border-b border-border bg-muted/30 px-3 py-2 flex flex-wrap items-center gap-0.5 sticky top-0 z-10">
        {/* Undo / Redo */}
        <ToolBtn onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()} title="Undo (Ctrl+Z)">
          <Undo className="h-3.5 w-3.5" />
        </ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()} title="Redo (Ctrl+Y)">
          <Redo className="h-3.5 w-3.5" />
        </ToolBtn>
        <Divider />

        {/* Headings */}
        <ToolBtn onClick={() => editor.chain().focus().setParagraph().run()} active={editor.isActive('paragraph')} title="Paragraph">
          <Pilcrow className="h-3.5 w-3.5" />
        </ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} active={editor.isActive('heading', { level: 1 })} title="Heading 1">
          <span className="text-[10px] font-black">H1</span>
        </ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive('heading', { level: 2 })} title="Heading 2">
          <span className="text-[10px] font-black">H2</span>
        </ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} active={editor.isActive('heading', { level: 3 })} title="Heading 3">
          <span className="text-[10px] font-black">H3</span>
        </ToolBtn>
        <Divider />

        {/* Text Formatting */}
        <ToolBtn onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive('bold')} title="Bold (Ctrl+B)">
          <Bold className="h-3.5 w-3.5" />
        </ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive('italic')} title="Italic (Ctrl+I)">
          <Italic className="h-3.5 w-3.5" />
        </ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive('underline')} title="Underline (Ctrl+U)">
          <UnderlineIcon className="h-3.5 w-3.5" />
        </ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().toggleStrike().run()} active={editor.isActive('strike')} title="Strikethrough">
          <Strikethrough className="h-3.5 w-3.5" />
        </ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().toggleCode().run()} active={editor.isActive('code')} title="Inline Code">
          <Code className="h-3.5 w-3.5" />
        </ToolBtn>
        <Divider />

        {/* Highlight */}
        <Popover open={colorOpen} onOpenChange={setColorOpen}>
          <PopoverTrigger asChild>
            <button
              type="button"
              className={`h-7 w-7 rounded flex items-center justify-center text-sm transition-colors
                ${editor.isActive('highlight') ? 'bg-[#013220] text-white' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}
              title="Highlight / Color"
            >
              <Highlighter className="h-3.5 w-3.5" />
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-56 p-3 space-y-3" align="start">
            <div>
              <p className="text-[10px] font-bold text-muted-foreground uppercase mb-1.5">Highlight</p>
              <div className="flex gap-1.5 flex-wrap">
                {HIGHLIGHT_COLORS.map((c) => (
                  <button key={c} type="button" style={{ background: c }}
                    onClick={() => { editor.chain().focus().toggleHighlight({ color: c }).run(); setColorOpen(false); }}
                    className="w-6 h-6 rounded border border-border hover:scale-110 transition-transform"
                  />
                ))}
                <button type="button" onClick={() => { editor.chain().focus().unsetHighlight().run(); setColorOpen(false); }}
                  className="w-6 h-6 rounded border border-border bg-background text-[9px] font-bold text-muted-foreground hover:bg-muted">X</button>
              </div>
            </div>
            <div>
              <p className="text-[10px] font-bold text-muted-foreground uppercase mb-1.5">Text Color</p>
              <div className="flex gap-1.5 flex-wrap">
                {TEXT_COLORS.map((c) => (
                  <button key={c} type="button" style={{ background: c }}
                    onClick={() => { editor.chain().focus().setColor(c).run(); setColorOpen(false); }}
                    className="w-6 h-6 rounded border border-border hover:scale-110 transition-transform"
                  />
                ))}
                <button type="button" onClick={() => { editor.chain().focus().unsetColor().run(); setColorOpen(false); }}
                  className="w-6 h-6 rounded border border-border bg-background text-[9px] font-bold text-muted-foreground hover:bg-muted">X</button>
              </div>
            </div>
          </PopoverContent>
        </Popover>
        <Divider />

        {/* Lists */}
        <ToolBtn onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive('bulletList')} title="Bullet List">
          <List className="h-3.5 w-3.5" />
        </ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive('orderedList')} title="Numbered List">
          <ListOrdered className="h-3.5 w-3.5" />
        </ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().toggleTaskList().run()} active={editor.isActive('taskList')} title="Checklist">
          <ListChecks className="h-3.5 w-3.5" />
        </ToolBtn>
        <Divider />

        {/* Blocks */}
        <ToolBtn onClick={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive('blockquote')} title="Quote">
          <Quote className="h-3.5 w-3.5" />
        </ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().toggleCodeBlock().run()} active={editor.isActive('codeBlock')} title="Code Block">
          <Code className="h-3.5 w-3.5" />
        </ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().setHorizontalRule().run()} title="Horizontal Rule">
          <Minus className="h-3.5 w-3.5" />
        </ToolBtn>
        <Divider />

        {/* Alignment */}
        <ToolBtn onClick={() => editor.chain().focus().setTextAlign('left').run()} active={editor.isActive({ textAlign: 'left' })} title="Align Left">
          <AlignLeft className="h-3.5 w-3.5" />
        </ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().setTextAlign('center').run()} active={editor.isActive({ textAlign: 'center' })} title="Align Center">
          <AlignCenter className="h-3.5 w-3.5" />
        </ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().setTextAlign('right').run()} active={editor.isActive({ textAlign: 'right' })} title="Align Right">
          <AlignRight className="h-3.5 w-3.5" />
        </ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().setTextAlign('justify').run()} active={editor.isActive({ textAlign: 'justify' })} title="Justify">
          <AlignJustify className="h-3.5 w-3.5" />
        </ToolBtn>
        <Divider />

        {/* Link */}
        <Popover open={linkOpen} onOpenChange={setLinkOpen}>
          <PopoverTrigger asChild>
            <button
              type="button"
              className={`h-7 w-7 rounded flex items-center justify-center transition-colors
                ${editor.isActive('link') ? 'bg-[#013220] text-white' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}
              title="Insert Link"
            >
              <LinkIcon className="h-3.5 w-3.5" />
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-72 p-3" align="start">
            <p className="text-xs font-semibold mb-2">Insert Link</p>
            <div className="flex gap-2">
              <Input
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                placeholder="https://example.com"
                className="h-8 text-sm"
                onKeyDown={(e) => e.key === 'Enter' && setLink()}
              />
              <Button size="sm" className="h-8 shrink-0" onClick={setLink}>Set</Button>
            </div>
            {editor.isActive('link') && (
              <button type="button" onClick={() => { editor.chain().focus().unsetLink().run(); setLinkOpen(false); }}
                className="text-xs text-red-500 mt-2 hover:underline">Remove link</button>
            )}
          </PopoverContent>
        </Popover>

        {/* Table */}
        <ToolBtn
          onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}
          title="Insert Table"
        >
          <TableIcon className="h-3.5 w-3.5" />
        </ToolBtn>
        <Divider />

        {/* Image Upload */}
        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileInput} />
        <ToolBtn onClick={() => fileInputRef.current?.click()} disabled={uploadingImage} title="Upload Image">
          {uploadingImage ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
        </ToolBtn>
        <ToolBtn
          onClick={() => {
            const url = window.prompt('Image URL:');
            if (url) editor.chain().focus().setImage({ src: url }).run();
          }}
          title="Image from URL"
        >
          <ImageIcon className="h-3.5 w-3.5" />
        </ToolBtn>
      </div>

      {/* Editor Area */}
      <div
        className="flex-1 overflow-y-auto"
        onPaste={handlePasteOrDrop}
        onDrop={(e) => { handlePasteOrDrop(e); e.preventDefault(); }}
        onDragOver={(e) => e.preventDefault()}
      >
        <EditorContent editor={editor} />
      </div>

      {/* Footer stats */}
      <div className="border-t border-border bg-muted/20 px-4 py-1.5 flex items-center gap-4 text-[10px] text-muted-foreground">
        <span>{wc} words</span>
        <span>{cc} characters</span>
        <span>~{rt} min read</span>
        <span className="ml-auto text-[9px]">Tip: Drag & drop images · Ctrl+Z to undo · Select text for quick formatting</span>
      </div>
    </div>
  );
}
