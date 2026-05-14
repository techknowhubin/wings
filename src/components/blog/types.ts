// ── Block-based blog content system types ────────────────────────────────────

export type BlockType =
  | "paragraph"
  | "heading"
  | "image"
  | "quote"
  | "list"
  | "divider"
  | "callout"
  | "listing_embed";

export interface BaseBlock {
  id: string;
  type: BlockType;
}

export interface ParagraphBlock extends BaseBlock {
  type: "paragraph";
  text: string; // supports inline HTML (bold, italic, links)
}

export interface HeadingBlock extends BaseBlock {
  type: "heading";
  text: string;
  level: 2 | 3;
}

export interface ImageBlock extends BaseBlock {
  type: "image";
  url: string;
  alt: string;
  caption?: string;
}

export interface QuoteBlock extends BaseBlock {
  type: "quote";
  text: string;
  attribution?: string;
}

export interface ListBlock extends BaseBlock {
  type: "list";
  style: "bullet" | "numbered";
  items: string[];
}

export interface DividerBlock extends BaseBlock {
  type: "divider";
}

export type CalloutVariant = "info" | "tip" | "warning";

export interface CalloutBlock extends BaseBlock {
  type: "callout";
  variant: CalloutVariant;
  text: string;
}

export type ListingEmbedType = "stay" | "bike" | "car" | "hotel" | "resort" | "experience";

export interface ListingEmbedBlock extends BaseBlock {
  type: "listing_embed";
  listing_type: ListingEmbedType;
  listing_id: string;
  // Snapshot at embed time (fallback if listing deleted)
  snapshot?: {
    title: string;
    image: string;
    price: string;
    location: string;
    rating: number;
  };
}

export type ContentBlock =
  | ParagraphBlock
  | HeadingBlock
  | ImageBlock
  | QuoteBlock
  | ListBlock
  | DividerBlock
  | CalloutBlock
  | ListingEmbedBlock;

// ── Helpers ──────────────────────────────────────────────────────────────────

let _counter = 0;
export function createBlockId(): string {
  return `blk_${Date.now()}_${++_counter}`;
}

export function createEmptyBlock(type: BlockType): ContentBlock {
  const id = createBlockId();
  switch (type) {
    case "paragraph":
      return { id, type, text: "" };
    case "heading":
      return { id, type, text: "", level: 2 };
    case "image":
      return { id, type, url: "", alt: "" };
    case "quote":
      return { id, type, text: "" };
    case "list":
      return { id, type, style: "bullet", items: [""] };
    case "divider":
      return { id, type };
    case "callout":
      return { id, type, variant: "info", text: "" };
    case "listing_embed":
      return { id, type, listing_type: "stay", listing_id: "" };
  }
}

/**
 * Detect whether `content` string is new JSON-block format or legacy HTML/text.
 */
export function isBlockContent(content: string): boolean {
  if (!content) return false;
  const trimmed = content.trim();
  if (!trimmed.startsWith("[")) return false;
  try {
    const parsed = JSON.parse(trimmed);
    return Array.isArray(parsed) && parsed.length > 0 && typeof parsed[0]?.type === "string";
  } catch {
    return false;
  }
}

export function parseBlocks(content: string): ContentBlock[] {
  try {
    return JSON.parse(content);
  } catch {
    return [];
  }
}
