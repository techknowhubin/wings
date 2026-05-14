import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Star, Info, Lightbulb, AlertTriangle, Heart } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { resolveListingCardImage } from "@/lib/listing-images";
import type {
  ContentBlock,
  ListingEmbedBlock,
  CalloutVariant,
} from "./types";

// ── Listing embed card (fetches live data) ───────────────────────────────────

function EmbedCard({ block }: { block: ListingEmbedBlock }) {
  const [listing, setListing] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const tableMap: Record<string, string> = {
        stay: "stays",
        bike: "bikes",
        car: "cars",
        hotel: "hotels",
        resort: "resorts",
        experience: "experiences",
      };
      const table = tableMap[block.listing_type];
      if (!table || !block.listing_id) {
        setLoading(false);
        return;
      }
      const { data } = await supabase
        .from(table as any)
        .select("*")
        .eq("id", block.listing_id)
        .maybeSingle();
      if (!cancelled) {
        setListing(data);
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [block.listing_id, block.listing_type]);

  const detailPath = (() => {
    switch (block.listing_type) {
      case "bike": return `/bikes/${block.listing_id}`;
      case "car": return `/cars/${block.listing_id}`;
      case "experience": return `/experiences/${block.listing_id}`;
      case "hotel": return `/hotels/${block.listing_id}`;
      case "resort": return `/resorts/${block.listing_id}`;
      default: return `/stays/${block.listing_id}`;
    }
  })();

  const priceLabel = (() => {
    switch (block.listing_type) {
      case "bike":
      case "car":
        return "/ day";
      case "experience":
        return "/ person";
      default:
        return "/ night";
    }
  })();

  if (loading) {
    return (
      <div className="my-8 rounded-2xl border border-border bg-muted/20 p-6 animate-pulse">
        <div className="flex gap-5">
          <div className="w-32 h-24 rounded-xl bg-muted flex-shrink-0" />
          <div className="flex-1 space-y-3">
            <div className="h-5 bg-muted rounded w-2/3" />
            <div className="h-4 bg-muted rounded w-1/3" />
            <div className="h-4 bg-muted rounded w-1/4" />
          </div>
        </div>
      </div>
    );
  }

  // Fallback to snapshot if listing deleted
  const data = listing || block.snapshot;
  if (!data) {
    return (
      <div className="my-8 rounded-2xl border border-dashed border-border bg-muted/10 p-6 text-center text-muted-foreground text-sm">
        This listing is no longer available.
      </div>
    );
  }

  const image = listing
    ? resolveListingCardImage(listing.images, block.listing_type)
    : data.image;
  const title = listing?.title || data.title;
  const location = listing?.location || data.location || "";
  const price = listing
    ? `₹${listing.price_per_night || listing.price_per_day || listing.price_per_person || 0}`
    : data.price;
  const rating = listing?.rating || data.rating || 0;

  return (
    <Link to={detailPath} className="block my-8 group">
      <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden transition-all duration-300 hover:shadow-lg hover:border-primary/30 hover:-translate-y-0.5">
        <div className="flex flex-col sm:flex-row">
          {/* Image */}
          <div className="relative w-full sm:w-48 h-40 sm:h-auto flex-shrink-0 overflow-hidden">
            <img
              src={image}
              alt={title}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
            />
            <div className="absolute top-3 left-3">
              <span className="bg-primary text-primary-foreground px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider">
                {block.listing_type}
              </span>
            </div>
          </div>
          {/* Details */}
          <div className="flex-1 p-5 flex flex-col justify-center">
            <h4 className="text-lg font-bold text-foreground group-hover:text-primary transition-colors line-clamp-1">
              {title}
            </h4>
            <p className="text-sm text-muted-foreground mt-1">{location}</p>
            <div className="flex items-center gap-4 mt-3">
              <span className="text-base font-bold text-foreground">
                {price}
                <span className="text-xs font-normal text-muted-foreground ml-1">
                  {priceLabel}
                </span>
              </span>
              {Number(rating) > 0 && (
                <span className="flex items-center gap-1 text-sm">
                  <Star className="h-3.5 w-3.5 fill-primary-text text-primary-text" />
                  <span className="font-medium">{rating}</span>
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}

// ── Callout icon helper ──────────────────────────────────────────────────────

function CalloutIcon({ variant }: { variant: CalloutVariant }) {
  switch (variant) {
    case "tip":
      return <Lightbulb className="h-5 w-5 flex-shrink-0" />;
    case "warning":
      return <AlertTriangle className="h-5 w-5 flex-shrink-0" />;
    default:
      return <Info className="h-5 w-5 flex-shrink-0" />;
  }
}

const calloutStyles: Record<CalloutVariant, string> = {
  info: "bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800 text-blue-900 dark:text-blue-200",
  tip: "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200",
  warning: "bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200",
};

// ── Main block renderer ──────────────────────────────────────────────────────

export function BlogBlockRenderer({ blocks }: { blocks: ContentBlock[] }) {
  return (
    <div className="space-y-1">
      {blocks.map((block) => (
        <RenderBlock key={block.id} block={block} />
      ))}
    </div>
  );
}

function RenderBlock({ block }: { block: ContentBlock }) {
  switch (block.type) {
    case "paragraph":
      return (
        <p
          className="text-base md:text-lg leading-relaxed text-muted-foreground"
          dangerouslySetInnerHTML={{ __html: block.text }}
        />
      );

    case "heading":
      if (block.level === 2) {
        return (
          <h2
            id={block.text.toLowerCase().replace(/[^a-z0-9]+/g, "-")}
            className="text-2xl md:text-3xl font-bold text-foreground mt-10 mb-4 scroll-mt-24"
          >
            {block.text}
          </h2>
        );
      }
      return (
        <h3
          id={block.text.toLowerCase().replace(/[^a-z0-9]+/g, "-")}
          className="text-xl md:text-2xl font-semibold text-foreground mt-8 mb-3 scroll-mt-24"
        >
          {block.text}
        </h3>
      );

    case "image":
      return (
        <figure className="my-8">
          <div className="rounded-2xl overflow-hidden shadow-lg">
            <img
              src={block.url}
              alt={block.alt}
              className="w-full h-auto"
              loading="lazy"
            />
          </div>
          {block.caption && (
            <figcaption className="text-center text-sm text-muted-foreground mt-3 italic">
              {block.caption}
            </figcaption>
          )}
        </figure>
      );

    case "quote":
      return (
        <blockquote className="my-8 border-l-4 border-primary pl-6 py-2">
          <p className="text-lg md:text-xl italic text-foreground/80 leading-relaxed">
            "{block.text}"
          </p>
          {block.attribution && (
            <footer className="mt-3 text-sm font-medium text-muted-foreground">
              — {block.attribution}
            </footer>
          )}
        </blockquote>
      );

    case "list": {
      const Tag = block.style === "numbered" ? "ol" : "ul";
      return (
        <Tag
          className={`my-4 space-y-2 pl-6 ${
            block.style === "numbered"
              ? "list-decimal"
              : "list-disc"
          } text-base md:text-lg text-muted-foreground`}
        >
          {block.items.map((item, i) => (
            <li key={i} className="leading-relaxed pl-1">
              <span dangerouslySetInnerHTML={{ __html: item }} />
            </li>
          ))}
        </Tag>
      );
    }

    case "divider":
      return (
        <div className="my-10 flex items-center justify-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-primary/40" />
          <span className="h-1.5 w-1.5 rounded-full bg-primary/40" />
          <span className="h-1.5 w-1.5 rounded-full bg-primary/40" />
        </div>
      );

    case "callout":
      return (
        <div
          className={`my-6 flex items-start gap-3 rounded-xl border p-4 ${calloutStyles[block.variant]}`}
        >
          <CalloutIcon variant={block.variant} />
          <p
            className="text-sm leading-relaxed flex-1"
            dangerouslySetInnerHTML={{ __html: block.text }}
          />
        </div>
      );

    case "listing_embed":
      return <EmbedCard block={block} />;

    default:
      return null;
  }
}

// ── Table of Contents generator ──────────────────────────────────────────────

export function BlogTableOfContents({ blocks }: { blocks: ContentBlock[] }) {
  const headings = blocks.filter(
    (b): b is ContentBlock & { type: "heading"; text: string; level: 2 | 3 } =>
      b.type === "heading" && !!(b as any).text
  );

  if (headings.length < 2) return null;

  return (
    <nav className="rounded-xl border border-border bg-muted/20 p-5 mb-10">
      <h4 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-3">
        Table of Contents
      </h4>
      <ul className="space-y-1.5">
        {headings.map((h) => {
          const anchor = h.text.toLowerCase().replace(/[^a-z0-9]+/g, "-");
          return (
            <li
              key={h.id}
              className={h.level === 3 ? "pl-4" : ""}
            >
              <a
                href={`#${anchor}`}
                className="text-sm text-muted-foreground hover:text-primary transition-colors"
              >
                {h.text}
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
