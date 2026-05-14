import { useState } from "react";
import {
  Plus, Trash2, ChevronUp, ChevronDown, GripVertical,
  Type, Heading2, Heading3, ImageIcon, Quote, List, Minus,
  MessageSquare, LayoutGrid, Bold, Italic, Link as LinkIcon,
  Info, Lightbulb, AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import ListingEmbedPicker from "./ListingEmbedPicker";
import type {
  ContentBlock,
  BlockType,
  CalloutVariant,
  ListBlock as ListBlockType,
  ListingEmbedBlock,
} from "./types";
import { createEmptyBlock } from "./types";

// ── Block type menu ──────────────────────────────────────────────────────────

const BLOCK_OPTIONS: { type: BlockType; label: string; icon: any; desc: string }[] = [
  { type: "paragraph", label: "Paragraph", icon: Type, desc: "Plain text block" },
  { type: "heading", label: "Heading", icon: Heading2, desc: "Section heading" },
  { type: "image", label: "Image", icon: ImageIcon, desc: "Full-width image" },
  { type: "quote", label: "Quote", icon: Quote, desc: "Blockquote" },
  { type: "list", label: "List", icon: List, desc: "Bullet or numbered list" },
  { type: "callout", label: "Callout", icon: MessageSquare, desc: "Info, tip, or warning" },
  { type: "divider", label: "Divider", icon: Minus, desc: "Section separator" },
  { type: "listing_embed", label: "Listing Embed", icon: LayoutGrid, desc: "Promote a travel listing" },
];

// ── Main Editor ──────────────────────────────────────────────────────────────

interface BlogBlockEditorProps {
  blocks: ContentBlock[];
  onChange: (blocks: ContentBlock[]) => void;
}

export default function BlogBlockEditor({ blocks, onChange }: BlogBlockEditorProps) {
  const [addMenuIndex, setAddMenuIndex] = useState<number | null>(null);

  const updateBlock = (index: number, updated: Partial<ContentBlock>) => {
    const next = [...blocks];
    next[index] = { ...next[index], ...updated } as ContentBlock;
    onChange(next);
  };

  const removeBlock = (index: number) => {
    const next = blocks.filter((_, i) => i !== index);
    onChange(next.length > 0 ? next : [createEmptyBlock("paragraph")]);
  };

  const moveBlock = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= blocks.length) return;
    const next = [...blocks];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  };

  const insertBlock = (type: BlockType, afterIndex: number) => {
    const newBlock = createEmptyBlock(type);
    const next = [...blocks];
    next.splice(afterIndex + 1, 0, newBlock);
    onChange(next);
    setAddMenuIndex(null);
  };

  return (
    <div className="space-y-0">
      {blocks.map((block, index) => (
        <div key={block.id}>
          {/* Block */}
          <div className="group relative rounded-xl border border-transparent hover:border-border transition-colors">
            {/* Block controls (left gutter) */}
            <div className="absolute -left-10 top-2 hidden group-hover:flex flex-col gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => moveBlock(index, -1)}
                disabled={index === 0}
                title="Move up"
              >
                <ChevronUp className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => moveBlock(index, 1)}
                disabled={index === blocks.length - 1}
                title="Move down"
              >
                <ChevronDown className="h-3.5 w-3.5" />
              </Button>
            </div>

            {/* Delete button (right side) */}
            <div className="absolute -right-9 top-2 hidden group-hover:flex opacity-0 group-hover:opacity-100 transition-opacity">
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-destructive hover:bg-destructive/10"
                onClick={() => removeBlock(index)}
                title="Delete block"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>

            {/* Block content */}
            <div className="px-2 py-1.5">
              <BlockEditor
                block={block}
                onChange={(updated) => updateBlock(index, updated)}
              />
            </div>
          </div>

          {/* Add block button between blocks */}
          <div className="flex items-center justify-center py-1 group/add">
            <Popover
              open={addMenuIndex === index}
              onOpenChange={(open) => setAddMenuIndex(open ? index : null)}
            >
              <PopoverTrigger asChild>
                <button className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors opacity-0 group-hover/add:opacity-100 focus:opacity-100">
                  <div className="h-px w-16 bg-border" />
                  <Plus className="h-5 w-5 rounded-full border border-dashed border-current p-0.5" />
                  <div className="h-px w-16 bg-border" />
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-72 p-2" align="center">
                <div className="grid grid-cols-2 gap-1">
                  {BLOCK_OPTIONS.map((opt) => (
                    <button
                      key={opt.type}
                      onClick={() => insertBlock(opt.type, index)}
                      className="flex items-center gap-2.5 p-2.5 rounded-lg text-left hover:bg-muted transition-colors"
                    >
                      <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <opt.icon className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-foreground">{opt.label}</p>
                        <p className="text-[10px] text-muted-foreground leading-tight">{opt.desc}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Individual block editors ─────────────────────────────────────────────────

function BlockEditor({
  block,
  onChange,
}: {
  block: ContentBlock;
  onChange: (updated: Partial<ContentBlock>) => void;
}) {
  switch (block.type) {
    case "paragraph":
      return <ParagraphEditor text={block.text} onChange={(text) => onChange({ text })} />;
    case "heading":
      return (
        <HeadingEditor
          text={block.text}
          level={block.level}
          onChange={(updates) => onChange(updates)}
        />
      );
    case "image":
      return (
        <ImageEditor
          url={block.url}
          alt={block.alt}
          caption={block.caption}
          onChange={(updates) => onChange(updates)}
        />
      );
    case "quote":
      return (
        <QuoteEditor
          text={block.text}
          attribution={block.attribution}
          onChange={(updates) => onChange(updates)}
        />
      );
    case "list":
      return (
        <ListEditor
          style={block.style}
          items={block.items}
          onChange={(updates) => onChange(updates)}
        />
      );
    case "divider":
      return <DividerEditor />;
    case "callout":
      return (
        <CalloutEditor
          variant={block.variant}
          text={block.text}
          onChange={(updates) => onChange(updates)}
        />
      );
    case "listing_embed":
      return (
        <ListingEmbedEditor
          block={block}
          onChange={(updates) => onChange(updates)}
        />
      );
    default:
      return null;
  }
}

// ── Paragraph ────────────────────────────────────────────────────────────────

function ParagraphEditor({ text, onChange }: { text: string; onChange: (t: string) => void }) {
  return (
    <Textarea
      value={text}
      onChange={(e) => onChange(e.target.value)}
      placeholder="Write your paragraph here..."
      rows={3}
      className="border-0 shadow-none resize-none focus-visible:ring-0 text-base p-0 min-h-0"
    />
  );
}

// ── Heading ──────────────────────────────────────────────────────────────────

function HeadingEditor({
  text,
  level,
  onChange,
}: {
  text: string;
  level: 2 | 3;
  onChange: (u: { text?: string; level?: 2 | 3 }) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => onChange({ level: level === 2 ? 3 : 2 })}
        className="flex-shrink-0 h-8 px-2 rounded-md bg-muted text-xs font-bold text-muted-foreground hover:bg-muted/80 transition-colors"
        title="Toggle heading level"
      >
        H{level}
      </button>
      <Input
        value={text}
        onChange={(e) => onChange({ text: e.target.value })}
        placeholder={`Heading ${level}...`}
        className={`border-0 shadow-none focus-visible:ring-0 font-bold p-0 ${
          level === 2 ? "text-2xl" : "text-xl"
        }`}
      />
    </div>
  );
}

// ── Image ────────────────────────────────────────────────────────────────────

function ImageEditor({
  url,
  alt,
  caption,
  onChange,
}: {
  url: string;
  alt: string;
  caption?: string;
  onChange: (u: { url?: string; alt?: string; caption?: string }) => void;
}) {
  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Input
          value={url}
          onChange={(e) => onChange({ url: e.target.value })}
          placeholder="Image URL..."
          className="flex-1 h-8 text-sm"
        />
        <Input
          value={alt}
          onChange={(e) => onChange({ alt: e.target.value })}
          placeholder="Alt text..."
          className="w-40 h-8 text-sm"
        />
      </div>
      <Input
        value={caption || ""}
        onChange={(e) => onChange({ caption: e.target.value })}
        placeholder="Caption (optional)..."
        className="h-8 text-sm"
      />
      {url && (
        <div className="rounded-lg overflow-hidden border border-border max-h-48">
          <img
            src={url}
            alt={alt}
            className="w-full h-full object-cover"
            onError={(e) => (e.currentTarget.style.display = "none")}
          />
        </div>
      )}
    </div>
  );
}

// ── Quote ────────────────────────────────────────────────────────────────────

function QuoteEditor({
  text,
  attribution,
  onChange,
}: {
  text: string;
  attribution?: string;
  onChange: (u: { text?: string; attribution?: string }) => void;
}) {
  return (
    <div className="border-l-4 border-primary/30 pl-4 space-y-2">
      <Textarea
        value={text}
        onChange={(e) => onChange({ text: e.target.value })}
        placeholder="Enter your quote..."
        rows={2}
        className="border-0 shadow-none resize-none focus-visible:ring-0 text-base italic p-0 min-h-0"
      />
      <Input
        value={attribution || ""}
        onChange={(e) => onChange({ attribution: e.target.value })}
        placeholder="Attribution (optional)..."
        className="border-0 shadow-none focus-visible:ring-0 text-sm p-0 h-6 text-muted-foreground"
      />
    </div>
  );
}

// ── List ─────────────────────────────────────────────────────────────────────

function ListEditor({
  style,
  items,
  onChange,
}: {
  style: "bullet" | "numbered";
  items: string[];
  onChange: (u: { style?: "bullet" | "numbered"; items?: string[] }) => void;
}) {
  const updateItem = (index: number, value: string) => {
    const next = [...items];
    next[index] = value;
    onChange({ items: next });
  };

  const addItem = () => onChange({ items: [...items, ""] });

  const removeItem = (index: number) => {
    if (items.length <= 1) return;
    onChange({ items: items.filter((_, i) => i !== index) });
  };

  return (
    <div className="space-y-2">
      <button
        onClick={() => onChange({ style: style === "bullet" ? "numbered" : "bullet" })}
        className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded bg-muted/50"
      >
        {style === "bullet" ? "• Bullet" : "1. Numbered"} — click to toggle
      </button>
      <div className="space-y-1.5 pl-1">
        {items.map((item, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className="text-muted-foreground text-sm w-5 text-right flex-shrink-0">
              {style === "numbered" ? `${i + 1}.` : "•"}
            </span>
            <Input
              value={item}
              onChange={(e) => updateItem(i, e.target.value)}
              placeholder="List item..."
              className="flex-1 h-8 text-sm border-0 shadow-none focus-visible:ring-0 p-0"
            />
            {items.length > 1 && (
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-muted-foreground hover:text-destructive"
                onClick={() => removeItem(i)}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            )}
          </div>
        ))}
      </div>
      <Button
        variant="ghost"
        size="sm"
        className="text-xs h-7 text-muted-foreground"
        onClick={addItem}
      >
        <Plus className="h-3 w-3 mr-1" /> Add item
      </Button>
    </div>
  );
}

// ── Divider ──────────────────────────────────────────────────────────────────

function DividerEditor() {
  return (
    <div className="flex items-center justify-center py-3">
      <div className="flex items-center gap-2">
        <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/30" />
        <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/30" />
        <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/30" />
      </div>
    </div>
  );
}

// ── Callout ──────────────────────────────────────────────────────────────────

const CALLOUT_VARIANTS: { value: CalloutVariant; label: string; icon: any; color: string }[] = [
  { value: "info", label: "Info", icon: Info, color: "text-blue-500" },
  { value: "tip", label: "Tip", icon: Lightbulb, color: "text-emerald-500" },
  { value: "warning", label: "Warning", icon: AlertTriangle, color: "text-amber-500" },
];

function CalloutEditor({
  variant,
  text,
  onChange,
}: {
  variant: CalloutVariant;
  text: string;
  onChange: (u: { variant?: CalloutVariant; text?: string }) => void;
}) {
  const current = CALLOUT_VARIANTS.find((v) => v.value === variant)!;

  return (
    <div className="flex items-start gap-3 rounded-lg bg-muted/30 p-3">
      <Popover>
        <PopoverTrigger asChild>
          <button className={`mt-0.5 flex-shrink-0 ${current.color}`} title="Change callout type">
            <current.icon className="h-5 w-5" />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-36 p-1.5" align="start">
          {CALLOUT_VARIANTS.map((v) => (
            <button
              key={v.value}
              onClick={() => onChange({ variant: v.value })}
              className={`w-full flex items-center gap-2 p-2 rounded-md text-xs hover:bg-muted transition-colors ${
                variant === v.value ? "bg-muted font-bold" : ""
              }`}
            >
              <v.icon className={`h-4 w-4 ${v.color}`} />
              {v.label}
            </button>
          ))}
        </PopoverContent>
      </Popover>
      <Textarea
        value={text}
        onChange={(e) => onChange({ text: e.target.value })}
        placeholder={`${current.label} callout text...`}
        rows={2}
        className="flex-1 border-0 shadow-none resize-none focus-visible:ring-0 text-sm p-0 min-h-0 bg-transparent"
      />
    </div>
  );
}

// ── Listing Embed ────────────────────────────────────────────────────────────

function ListingEmbedEditor({
  block,
  onChange,
}: {
  block: ListingEmbedBlock;
  onChange: (u: Partial<ListingEmbedBlock>) => void;
}) {
  const [showPicker, setShowPicker] = useState(!block.listing_id);

  if (showPicker || !block.listing_id) {
    return (
      <ListingEmbedPicker
        onSelect={(data) => {
          onChange({
            listing_type: data.listing_type,
            listing_id: data.listing_id,
            snapshot: data.snapshot,
          });
          setShowPicker(false);
        }}
        onCancel={() => setShowPicker(false)}
      />
    );
  }

  // Show selected listing preview
  const snap = block.snapshot;
  return (
    <div className="flex items-center gap-3 rounded-lg border border-border p-3 bg-muted/20">
      {snap?.image && (
        <img
          src={snap.image}
          alt={snap.title}
          className="w-14 h-14 rounded-lg object-cover flex-shrink-0"
        />
      )}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-foreground truncate">{snap?.title || "Listing"}</p>
        <p className="text-xs text-muted-foreground">{snap?.location}</p>
        <p className="text-xs font-bold mt-0.5">{snap?.price}</p>
      </div>
      <div className="flex-shrink-0 flex gap-1">
        <Button
          variant="outline"
          size="sm"
          className="h-7 text-xs"
          onClick={() => setShowPicker(true)}
        >
          Change
        </Button>
      </div>
    </div>
  );
}
