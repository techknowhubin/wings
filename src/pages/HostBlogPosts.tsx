import { useEffect, useMemo, useState } from "react";
import {
  Check, Eye, EyeOff, Globe, Pencil, Plus, RefreshCw, Trash2, X,
  BookOpen, FileText, ImageIcon, Tag, Columns2, PanelRight,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/useAuth";
import { useCreateBlogPost, useDeleteBlogPost, useIsAdmin, useUpdateBlogPost, useBlogPosts } from "@/hooks/useListings";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import BlogBlockEditor from "@/components/blog/BlogBlockEditor";
import { BlogBlockRenderer, BlogTableOfContents } from "@/components/blog/BlogBlockRenderer";
import { createEmptyBlock, isBlockContent, parseBlocks } from "@/components/blog/types";
import type { ContentBlock } from "@/components/blog/types";

const CATEGORIES = [
  "Travel Tips", "Destination Guide", "Adventure", "Culture",
  "Food & Cuisine", "Homestay Stories", "Sustainable Travel", "Hidden Gems",
];

function generateSlug(title: string) {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

interface BlogForm {
  title: string;
  slug: string;
  excerpt: string;
  featured_image: string;
  status: "draft" | "published";
  category: string;
  tags: string;
}

const emptyForm: BlogForm = {
  title: "",
  slug: "",
  excerpt: "",
  featured_image: "",
  status: "draft",
  category: "",
  tags: "",
};

export default function HostBlogPosts() {
  const { user } = useAuth();
  const { data: isAdminUser = false } = useIsAdmin(user?.id);
  const { data: posts = [], isLoading, refetch } = useBlogPosts(!!user && isAdminUser);
  const createPost = useCreateBlogPost();
  const updatePost = useUpdateBlogPost();
  const deletePost = useDeleteBlogPost();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<BlogForm>(emptyForm);
  const [blocks, setBlocks] = useState<ContentBlock[]>([createEmptyBlock("paragraph")]);
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);
  const [filter, setFilter] = useState<"all" | "published" | "draft">("all");
  const [editorTab, setEditorTab] = useState<"editor" | "preview">("editor");

  // Auto-generate slug from title
  useEffect(() => {
    if (!slugManuallyEdited && form.title) {
      setForm((p) => ({ ...p, slug: generateSlug(form.title) }));
    }
  }, [form.title, slugManuallyEdited]);

  if (!isAdminUser) {
    return (
      <div className="flex items-center justify-center h-48">
        <p className="text-muted-foreground text-sm">You do not have access to this module.</p>
      </div>
    );
  }

  const resetForm = () => {
    setEditingId(null);
    setShowForm(false);
    setSlugManuallyEdited(false);
    setForm(emptyForm);
    setBlocks([createEmptyBlock("paragraph")]);
    setEditorTab("editor");
  };

  const handleSave = async () => {
    if (!user) return;
    if (!form.title.trim() || !form.slug.trim()) {
      toast.error("Title and slug are required.");
      return;
    }

    // Validate blocks have some content
    const hasContent = blocks.some((b) => {
      if (b.type === "paragraph") return !!b.text.trim();
      if (b.type === "heading") return !!b.text.trim();
      if (b.type === "image") return !!b.url.trim();
      if (b.type === "quote") return !!b.text.trim();
      if (b.type === "list") return b.items.some((i) => i.trim());
      if (b.type === "callout") return !!b.text.trim();
      if (b.type === "listing_embed") return !!b.listing_id;
      if (b.type === "divider") return true;
      return false;
    });

    if (!hasContent) {
      toast.error("Add some content to your blog post.");
      return;
    }

    try {
      const tagsArray = form.tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);

      // Calculate reading time (~200 words per minute)
      const wordCount = blocks.reduce((acc, b) => {
        if ("text" in b && b.text) acc += b.text.split(/\s+/).length;
        if (b.type === "list") acc += b.items.join(" ").split(/\s+/).length;
        return acc;
      }, 0);
      const readingTime = Math.max(1, Math.ceil(wordCount / 200));

      const payload = {
        author_id: user.id,
        title: form.title.trim(),
        slug: form.slug.trim(),
        excerpt: form.excerpt.trim() || null,
        content: JSON.stringify(blocks),
        featured_image: form.featured_image.trim() || null,
        status: form.status,
        category_id: null,
        tags: tagsArray.length > 0 ? tagsArray : null,
        published_at: form.status === "published" ? new Date().toISOString() : null,
        reading_time: readingTime,
      };

      if (editingId) {
        await updatePost.mutateAsync({ postId: editingId, payload });
        toast.success("Blog post updated successfully.");
      } else {
        await createPost.mutateAsync(payload as any);
        toast.success("Blog post created successfully.");
      }
      resetForm();
    } catch (error: any) {
      toast.error(error?.message || "Failed to save blog post.");
    }
  };

  const handleEdit = (post: any) => {
    setEditingId(post.id);
    setSlugManuallyEdited(true);
    setForm({
      title: post.title ?? "",
      slug: post.slug ?? "",
      excerpt: post.excerpt ?? "",
      featured_image: post.featured_image ?? "",
      status: post.status ?? "draft",
      category: post.category ?? "",
      tags: Array.isArray(post.tags) ? post.tags.join(", ") : "",
    });

    // Parse content into blocks
    if (post.content && isBlockContent(post.content)) {
      setBlocks(parseBlocks(post.content));
    } else {
      // Legacy: wrap raw text/HTML in a single paragraph block
      setBlocks([
        {
          ...createEmptyBlock("paragraph"),
          text: post.content || "",
        } as ContentBlock,
      ]);
    }

    setShowForm(true);
    setEditorTab("editor");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = async () => {
    if (!deleteTargetId) return;
    try {
      await deletePost.mutateAsync(deleteTargetId);
      toast.success("Blog post deleted.");
    } catch (error: any) {
      toast.error(error?.message || "Failed to delete post.");
    } finally {
      setDeleteTargetId(null);
    }
  };

  const filteredPosts = (posts as any[]).filter((p) => {
    if (filter === "all") return true;
    return p.status === filter;
  });

  const isSaving = createPost.isPending || updatePost.isPending;

  // Stats
  const wordCount = blocks.reduce((acc, b) => {
    if ("text" in b && b.text) acc += b.text.split(/\s+/).filter(Boolean).length;
    if (b.type === "list") acc += b.items.join(" ").split(/\s+/).filter(Boolean).length;
    return acc;
  }, 0);
  const readingTime = Math.max(1, Math.ceil(wordCount / 200));
  const blockCount = blocks.length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-foreground flex items-center gap-2">
            <BookOpen className="h-7 w-7 text-primary" />
            Blog Posts
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Create, edit and manage all Xplorwing blog content.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button size="sm" onClick={() => { resetForm(); setShowForm(true); }}>
            <Plus className="h-4 w-4 mr-2" />
            New Post
          </Button>
        </div>
      </div>

      {/* Create / Edit Form */}
      {showForm && (
        <Card className="border-primary/30 shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <FileText className="h-5 w-5" />
              {editingId ? "Edit Blog Post" : "Create New Blog Post"}
            </CardTitle>
            <div className="flex items-center gap-2">
              {/* Stats */}
              <div className="hidden md:flex items-center gap-3 text-xs text-muted-foreground mr-2">
                <span>{wordCount} words</span>
                <span>·</span>
                <span>~{readingTime} min read</span>
                <span>·</span>
                <span>{blockCount} blocks</span>
              </div>
              <Button variant="ghost" size="icon" onClick={resetForm}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Title + Slug */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Title <span className="text-destructive">*</span></Label>
                <Input
                  placeholder="e.g. Top 10 Hidden Gems in Coorg"
                  value={form.title}
                  onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="flex items-center justify-between">
                  Slug <span className="text-destructive">*</span>
                  {!slugManuallyEdited && (
                    <span className="text-xs text-muted-foreground font-normal">Auto-generated</span>
                  )}
                </Label>
                <Input
                  placeholder="top-10-hidden-gems-coorg"
                  value={form.slug}
                  onChange={(e) => {
                    setSlugManuallyEdited(true);
                    setForm((p) => ({ ...p, slug: e.target.value }));
                  }}
                />
              </div>
            </div>

            {/* Category + Status */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Category</Label>
                <select
                  className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                  value={form.category}
                  onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))}
                >
                  <option value="">Select a category</option>
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label>Status</Label>
                <div className="flex gap-2 mt-1">
                  <Button
                    type="button"
                    variant={form.status === "draft" ? "default" : "outline"}
                    size="sm"
                    className="flex-1"
                    onClick={() => setForm((p) => ({ ...p, status: "draft" }))}
                  >
                    <EyeOff className="h-3.5 w-3.5 mr-1.5" />
                    Draft
                  </Button>
                  <Button
                    type="button"
                    variant={form.status === "published" ? "default" : "outline"}
                    size="sm"
                    className="flex-1"
                    onClick={() => setForm((p) => ({ ...p, status: "published" }))}
                  >
                    <Globe className="h-3.5 w-3.5 mr-1.5" />
                    Published
                  </Button>
                </div>
              </div>
            </div>

            {/* Featured Image */}
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5">
                <ImageIcon className="h-3.5 w-3.5" />
                Featured Image URL
              </Label>
              <Input
                placeholder="https://images.unsplash.com/..."
                value={form.featured_image}
                onChange={(e) => setForm((p) => ({ ...p, featured_image: e.target.value }))}
              />
              {form.featured_image && (
                <div className="mt-2 rounded-lg overflow-hidden h-36 border border-border">
                  <img
                    src={form.featured_image}
                    alt="Preview"
                    className="w-full h-full object-cover"
                    onError={(e) => (e.currentTarget.style.display = "none")}
                  />
                </div>
              )}
            </div>

            {/* Excerpt */}
            <div className="space-y-1.5">
              <Label>Excerpt / Short Description</Label>
              <Textarea
                rows={2}
                placeholder="A short summary shown on listing cards..."
                value={form.excerpt}
                onChange={(e) => setForm((p) => ({ ...p, excerpt: e.target.value }))}
              />
            </div>

            {/* Content — Block Editor with Preview */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label>Content <span className="text-destructive">*</span></Label>
                <Tabs value={editorTab} onValueChange={(v) => setEditorTab(v as any)}>
                  <TabsList className="h-8">
                    <TabsTrigger value="editor" className="text-xs h-6 px-3 gap-1.5">
                      <Pencil className="h-3 w-3" />
                      Editor
                    </TabsTrigger>
                    <TabsTrigger value="preview" className="text-xs h-6 px-3 gap-1.5">
                      <Eye className="h-3 w-3" />
                      Preview
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>

              {editorTab === "editor" ? (
                <div className="rounded-xl border border-border bg-background p-4 md:px-12 min-h-[400px]">
                  <BlogBlockEditor blocks={blocks} onChange={setBlocks} />
                </div>
              ) : (
                <div className="rounded-xl border border-border bg-background p-6 md:px-12 min-h-[400px]">
                  <div className="max-w-3xl mx-auto">
                    {form.title && (
                      <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-6">
                        {form.title}
                      </h1>
                    )}
                    <BlogTableOfContents blocks={blocks} />
                    <BlogBlockRenderer blocks={blocks} />
                  </div>
                </div>
              )}
            </div>

            {/* Tags */}
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5">
                <Tag className="h-3.5 w-3.5" />
                Tags (comma separated)
              </Label>
              <Input
                placeholder="coorg, adventure, homestay, karnataka"
                value={form.tags}
                onChange={(e) => setForm((p) => ({ ...p, tags: e.target.value }))}
              />
              {form.tags && (
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {form.tags.split(",").filter(Boolean).map((tag) => (
                    <Badge key={tag} variant="secondary" className="text-xs">
                      {tag.trim()}
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            {/* SEO Preview */}
            {form.title && (
              <div className="rounded-lg border border-border p-4 bg-muted/10">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2 font-bold">
                  SEO Preview
                </p>
                <p className="text-primary text-sm font-medium truncate">
                  {form.title} — Xplorwing Blog
                </p>
                <p className="text-xs text-emerald-700 dark:text-emerald-400 truncate">
                  xplorwing.com/blog/{form.slug}
                </p>
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                  {form.excerpt || "No excerpt provided. Add a short description for better SEO."}
                </p>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2 pt-2 border-t border-border">
              <Button onClick={handleSave} disabled={isSaving} className="min-w-[140px]">
                {isSaving ? (
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                ) : editingId ? (
                  <Check className="h-4 w-4 mr-2" />
                ) : (
                  <Plus className="h-4 w-4 mr-2" />
                )}
                {isSaving ? "Saving..." : editingId ? "Update Post" : "Publish Post"}
              </Button>
              <Button variant="outline" onClick={resetForm}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Posts List */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-base">
            {isLoading ? "Loading..." : `${filteredPosts.length} Post${filteredPosts.length !== 1 ? "s" : ""}`}
          </CardTitle>
          <div className="flex gap-1">
            {(["all", "published", "draft"] as const).map((f) => (
              <Button
                key={f}
                size="sm"
                variant={filter === f ? "default" : "ghost"}
                className="capitalize text-xs h-7"
                onClick={() => setFilter(f)}
              >
                {f}
              </Button>
            ))}
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {isLoading && (
            <p className="text-sm text-muted-foreground py-4 text-center">Loading posts...</p>
          )}
          {!isLoading && filteredPosts.length === 0 && (
            <div className="text-center py-10">
              <BookOpen className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No {filter !== "all" ? filter : ""} posts found.</p>
              <Button size="sm" className="mt-3" onClick={() => { resetForm(); setShowForm(true); }}>
                <Plus className="h-4 w-4 mr-2" />
                Create your first post
              </Button>
            </div>
          )}
          {filteredPosts.map((post: any) => {
            const isBlock = post.content && isBlockContent(post.content);
            const blockList = isBlock ? parseBlocks(post.content) : [];
            const embedCount = blockList.filter((b) => b.type === "listing_embed").length;

            return (
              <div
                key={post.id}
                className="rounded-xl border border-border p-4 flex items-start gap-4 hover:bg-muted/30 transition-colors"
              >
                {/* Thumbnail */}
                {post.featured_image ? (
                  <img
                    src={post.featured_image}
                    alt={post.title}
                    className="w-16 h-16 object-cover rounded-lg flex-shrink-0 border border-border"
                    onError={(e) => (e.currentTarget.style.display = "none")}
                  />
                ) : (
                  <div className="w-16 h-16 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                    <BookOpen className="h-6 w-6 text-muted-foreground/50" />
                  </div>
                )}

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-foreground truncate">{post.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">
                    /blog/{post.slug}
                  </p>
                  {post.excerpt && (
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{post.excerpt}</p>
                  )}
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    <Badge
                      variant={post.status === "published" ? "default" : "secondary"}
                      className="text-[10px] px-2 py-0"
                    >
                      {post.status === "published" ? (
                        <><Globe className="h-2.5 w-2.5 mr-1" />Published</>
                      ) : (
                        <><EyeOff className="h-2.5 w-2.5 mr-1" />Draft</>
                      )}
                    </Badge>
                    {isBlock && (
                      <Badge variant="outline" className="text-[10px] px-2 py-0">
                        {blockList.length} blocks
                      </Badge>
                    )}
                    {embedCount > 0 && (
                      <Badge variant="outline" className="text-[10px] px-2 py-0 text-primary">
                        {embedCount} listing{embedCount > 1 ? "s" : ""}
                      </Badge>
                    )}
                    {Array.isArray(post.tags) && post.tags.slice(0, 2).map((tag: string) => (
                      <Badge key={tag} variant="outline" className="text-[10px] px-2 py-0">{tag}</Badge>
                    ))}
                    <span className="text-[10px] text-muted-foreground ml-auto">
                      {new Date(post.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-1.5 flex-shrink-0">
                  <Button
                    size="icon"
                    variant="outline"
                    className="h-8 w-8"
                    onClick={() => handleEdit(post)}
                    title="Edit"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    size="icon"
                    variant="outline"
                    className="h-8 w-8 text-destructive hover:bg-destructive/10 hover:border-destructive/50"
                    onClick={() => setDeleteTargetId(post.id)}
                    title="Delete"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteTargetId} onOpenChange={(open) => !open && setDeleteTargetId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Blog Post?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The blog post will be permanently removed from the platform.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
