import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Marquee from "@/components/Marquee";
import { motion } from "framer-motion";
import { Calendar, User, BookOpen, ArrowLeft, Tag } from "lucide-react";
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

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
        .select("id, title, content, excerpt, featured_image, published_at, slug, tags, status")
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
              {allTags.length > 1 && (
                <div className="flex items-center gap-2 flex-wrap">
                  <Tag className="h-4 w-4" />
                  {allTags.slice(1).map((tag: string) => (
                    <span key={tag} className="bg-muted text-muted-foreground px-2 py-0.5 rounded text-xs">
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
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
            <div
              className="prose prose-lg dark:prose-invert max-w-none text-left
                prose-headings:font-bold prose-headings:text-foreground 
                prose-p:text-muted-foreground prose-p:leading-relaxed
                prose-img:rounded-3xl prose-a:text-primary hover:prose-a:underline"
              dangerouslySetInnerHTML={{ __html: formatContent(post.content || post.excerpt || "") }}
            />
          </motion.div>
        </div>
      </article>

      <Footer />
    </div>
  );
};

export default BlogDetail;
