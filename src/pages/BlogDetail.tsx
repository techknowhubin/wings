import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Marquee from "@/components/Marquee";
import { motion } from "framer-motion";
import { Calendar, User, BookOpen, ArrowLeft, Tag, Clock, Share2 } from "lucide-react";
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { BlogBlockRenderer, BlogTableOfContents } from "@/components/blog/BlogBlockRenderer";
import { isBlockContent, parseBlocks } from "@/components/blog/types";
import type { ContentBlock } from "@/components/blog/types";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

/**
 * Converts plain-text content (newlines) into HTML paragraphs.
 * If the content already contains HTML tags, it is returned as-is.
 */
function formatContent(raw: string): string {
  if (!raw) return "";
  // If it already has HTML tags, trust it
  if (/<[a-z][\s\S]*>/i.test(raw)) return raw;
  // Split on one or more blank lines → separate paragraphs
  return raw
    .split(/\n{2,}/)
    .map((para) =>
      `<p>${para
        .split(/\n/)
        .map((line) => line.trim())
        .filter(Boolean)
        .join("<br/>")}</p>`
    )
    .join("\n");
}

const BlogDetail = () => {
  const { slug } = useParams();

  const { data: post, isLoading, isError } = useQuery({
    queryKey: ["blog-post", slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("blog_posts")
        .select("id, title, content, excerpt, featured_image, published_at, slug, tags, status, reading_time")
        .eq("slug", slug!)
        .maybeSingle();

      if (error) {
        console.error("[BlogDetail] Supabase error:", error.message);
        throw error;
      }

      return data || null;
    },
    enabled: !!slug,
  });

  // Fetch related posts
  const { data: relatedPosts = [] } = useQuery({
    queryKey: ["related-posts", post?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("blog_posts")
        .select("id, title, slug, featured_image, published_at, tags")
        .eq("status", "published")
        .neq("id", post!.id)
        .order("published_at", { ascending: false })
        .limit(3);
      return data || [];
    },
    enabled: !!post?.id,
  });

  const handleShare = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title: post?.title, url });
      } catch {}
    } else {
      await navigator.clipboard.writeText(url);
      toast.success("Link copied to clipboard!");
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-4 py-24 animate-pulse">
          <div className="h-8 bg-muted rounded w-3/4 mb-6 mx-auto" />
          <div className="h-96 bg-muted rounded-3xl mb-12" />
          <div className="max-w-3xl mx-auto space-y-4">
            <div className="h-4 bg-muted rounded w-full" />
            <div className="h-4 bg-muted rounded w-full" />
            <div className="h-4 bg-muted rounded w-2/3" />
          </div>
        </div>
      </div>
    );
  }

  if (isError || !post) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Header />
        <div className="flex-grow flex flex-col items-center justify-center py-24">
          <BookOpen className="h-16 w-16 text-muted-foreground opacity-20 mb-4" />
          <h2 className="text-2xl font-bold mb-4">Post Not Found</h2>
          <Link to="/blog" className="text-primary hover:underline flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" /> Back to Blog
          </Link>
        </div>
        <Footer />
      </div>
    );
  }

  const categoryTag = Array.isArray(post.tags) && post.tags.length > 0 ? post.tags[0] : "Travel";
  const allTags: string[] = Array.isArray(post.tags) ? post.tags : [];
  const isBlock = isBlockContent(post.content);
  const blocks: ContentBlock[] = isBlock ? parseBlocks(post.content) : [];

  // Calculate reading time
  const readingTime = post.reading_time || (() => {
    if (isBlock) {
      const words = blocks.reduce((acc, b) => {
        if ("text" in b && b.text) acc += b.text.split(/\s+/).length;
        if (b.type === "list") acc += b.items.join(" ").split(/\s+/).length;
        return acc;
      }, 0);
      return Math.max(1, Math.ceil(words / 200));
    }
    return Math.max(1, Math.ceil((post.content || "").split(/\s+/).length / 200));
  })();

  return (
    <div className="min-h-screen bg-background">
      <Marquee />
      <Header />

      <article className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto">
          {/* Back Button */}
          <Link to="/blog" className="inline-flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors mb-8">
            <ArrowLeft className="h-4 w-4" /> Back to Blog
          </Link>

          {/* Title & Metadata */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mb-12"
          >
            <span className="bg-primary/10 text-primary px-4 py-1.5 rounded-full text-sm font-semibold mb-6 inline-block">
              {categoryTag}
            </span>
            <h1 className="text-4xl md:text-6xl font-bold text-foreground mb-8 leading-tight">
              {post.title}
            </h1>
            <div className="flex flex-wrap items-center gap-6 text-muted-foreground border-b border-border pb-8">
              <div className="flex items-center gap-2">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="h-5 w-5 text-primary" />
                </div>
                <span className="font-medium">Xplorwing Team</span>
              </div>
              {post.published_at && (
                <div className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  <span>{format(new Date(post.published_at), "MMMM d, yyyy")}</span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                <span>{readingTime} min read</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="ml-auto rounded-full"
                onClick={handleShare}
              >
                <Share2 className="h-4 w-4 mr-1.5" />
                Share
              </Button>
            </div>
            {allTags.length > 1 && (
              <div className="flex items-center gap-2 flex-wrap mt-4">
                <Tag className="h-4 w-4 text-muted-foreground" />
                {allTags.slice(1).map((tag: string) => (
                  <span key={tag} className="bg-muted text-muted-foreground px-2.5 py-0.5 rounded-full text-xs font-medium">
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </motion.div>

          {/* Featured Image */}
          {post.featured_image && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.7 }}
              className="relative h-[400px] md:h-[600px] rounded-3xl overflow-hidden mb-16 shadow-2xl"
            >
              <img
                src={post.featured_image}
                alt={post.title}
                className="w-full h-full object-cover"
              />
            </motion.div>
          )}

          {/* Content */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="max-w-3xl mx-auto"
          >
            {isBlock ? (
              <>
                <BlogTableOfContents blocks={blocks} />
                <BlogBlockRenderer blocks={blocks} />
              </>
            ) : (
              <div
                className="prose prose-lg dark:prose-invert max-w-none text-left
                  prose-headings:font-bold prose-headings:text-foreground 
                  prose-p:text-muted-foreground prose-p:leading-relaxed
                  prose-img:rounded-3xl prose-a:text-primary hover:prose-a:underline"
                dangerouslySetInnerHTML={{ __html: formatContent(post.content || post.excerpt || "") }}
              />
            )}
          </motion.div>

          {/* Related Posts */}
          {relatedPosts.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              viewport={{ once: true }}
              className="max-w-3xl mx-auto mt-20 pt-10 border-t border-border"
            >
              <h3 className="text-2xl font-bold text-foreground mb-6">More from Xplorwing</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {relatedPosts.map((related: any) => (
                  <Link
                    key={related.id}
                    to={`/blog/${related.slug}`}
                    className="group block"
                  >
                    <div className="rounded-2xl overflow-hidden border border-border hover:border-primary/30 transition-colors">
                      <div className="h-32 overflow-hidden bg-muted">
                        {related.featured_image ? (
                          <img
                            src={related.featured_image}
                            alt={related.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <BookOpen className="h-8 w-8 text-muted-foreground/30" />
                          </div>
                        )}
                      </div>
                      <div className="p-4">
                        <h4 className="text-sm font-bold text-foreground group-hover:text-primary transition-colors line-clamp-2">
                          {related.title}
                        </h4>
                        {related.published_at && (
                          <p className="text-xs text-muted-foreground mt-1.5">
                            {format(new Date(related.published_at), "MMM d, yyyy")}
                          </p>
                        )}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </motion.div>
          )}
        </div>
      </article>

      <Footer />
    </div>
  );
};

export default BlogDetail;
