import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  BookOpen, Check, ChevronDown, Clock, Copy, Eye, EyeOff, FileText,
  Globe, Pencil, Plus, RefreshCw, Search, Tag, Trash2, X, ImageIcon,
  BarChart2, CalendarClock, Archive, AlertCircle, Layers, Settings2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useAuth } from "@/hooks/useAuth";
import { useCreateBlogPost, useDeleteBlogPost, useIsAdmin, useUpdateBlogPost, useBlogPosts } from "@/hooks/useListings";
import { toast } from "sonner";
import RichTextEditor from "@/components/blog/RichTextEditor";
import FeaturedImageUpload from "@/components/blog/FeaturedImageUpload";

// ─── Constants ────────────────────────────────────────────────────────────────
const CATEGORIES = [
  "Travel Tips", "Destination Guide", "Adventure", "Culture",
  "Food & Cuisine", "Homestay Stories", "Sustainable Travel", "Hidden Gems",
];

function generateSlug(title: string) {
  return title.toLowerCase().trim()
    .replace(/[^\w\s-]/g, "").replace(/[\s_-]+/g, "-").replace(/^-+|-+$/g, "");
}

function readingTime(html: string) {
  const text = html.replace(/<[^>]+>/g, " ");
  const words = text.split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 200));
}

function seoScore(form: BlogForm): { score: number; issues: string[] } {
  const issues: string[] = [];
  if (!form.title || form.title.length < 30) issues.push("Title is too short (aim for 30–60 chars)");
  if (form.title.length > 60) issues.push("Title is too long (keep under 60 chars)");
  if (!form.metaDesc) issues.push("Missing meta description");
  if (form.metaDesc && form.metaDesc.length < 100) issues.push("Meta description is too short (aim for 120–160)");
  if (form.metaDesc && form.metaDesc.length > 160) issues.push("Meta description is too long (keep under 160)");
  if (!form.featured_image) issues.push("Missing featured image");
  if (!form.tags) issues.push("Add tags for better discoverability");
  if (!form.excerpt) issues.push("Add an excerpt/short description");
  const score = Math.max(0, 100 - issues.length * 14);
  return { score, issues };
}

// ─── Types ────────────────────────────────────────────────────────────────────
interface BlogForm {
  title: string;
  slug: string;
  excerpt: string;
  featured_image: string;
  status: "draft" | "published" | "scheduled" | "archived";
  category: string;
  tags: string;
  author_name: string;
  metaTitle: string;
  metaDesc: string;
  metaKeywords: string;
  scheduledAt: string;
}

const emptyForm: BlogForm = {
  title: "", slug: "", excerpt: "", featured_image: "",
  status: "draft", category: "", tags: "", author_name: "",
  metaTitle: "", metaDesc: "", metaKeywords: "", scheduledAt: "",
};

const STATUS_CONFIG = {
  published: { label: "Published", icon: Globe, color: "bg-green-100 text-green-700 border-green-200" },
  draft:     { label: "Draft",     icon: EyeOff, color: "bg-amber-100 text-amber-700 border-amber-200" },
  scheduled: { label: "Scheduled", icon: CalendarClock, color: "bg-blue-100 text-blue-700 border-blue-200" },
  archived:  { label: "Archived",  icon: Archive, color: "bg-gray-100 text-gray-500 border-gray-200" },
} as const;

// ─── SEO Score Ring ───────────────────────────────────────────────────────────
function SeoScoreRing({ score }: { score: number }) {
  const color = score >= 70 ? '#16a34a' : score >= 40 ? '#d97706' : '#dc2626';
  const r = 20; const c = 2 * Math.PI * r;
  return (
    <svg width="52" height="52" viewBox="0 0 52 52">
      <circle cx="26" cy="26" r={r} fill="none" stroke="#e5e7eb" strokeWidth="4" />
      <circle cx="26" cy="26" r={r} fill="none" stroke={color} strokeWidth="4"
        strokeDasharray={c} strokeDashoffset={c * (1 - score / 100)}
        strokeLinecap="round" transform="rotate(-90 26 26)" style={{ transition: 'stroke-dashoffset 0.5s' }} />
      <text x="26" y="30" textAnchor="middle" fontSize="11" fontWeight="bold" fill={color}>{score}</text>
    </svg>
  );
}

// ─── Blog Card (List view) ────────────────────────────────────────────────────
function BlogCard({ post, onEdit, onDelete, onClone, onToggleStatus }: {
  post: any; onEdit: () => void; onDelete: () => void;
  onClone: () => void; onToggleStatus: (s: string) => void;
}) {
  const cfg = STATUS_CONFIG[post.status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.draft;
  const Icon = cfg.icon;
  return (
    <div className="group rounded-2xl border border-border bg-card hover:shadow-md transition-all duration-200 overflow-hidden flex">
      {/* Thumbnail */}
      <div className="w-32 sm:w-44 shrink-0 relative overflow-hidden bg-muted">
        {post.featured_image ? (
          <img src={post.featured_image} alt={post.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            onError={(e) => (e.currentTarget.style.display = "none")} />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <BookOpen className="h-8 w-8 text-muted-foreground/30" />
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 p-4 min-w-0 flex flex-col justify-between">
        <div>
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="font-bold text-foreground line-clamp-1 text-sm">{post.title}</p>
              <p className="text-[10px] text-muted-foreground font-mono mt-0.5">/blog/{post.slug}</p>
            </div>
            <Badge variant="outline" className={`text-[10px] shrink-0 flex items-center gap-1 ${cfg.color}`}>
              <Icon className="h-2.5 w-2.5" />{cfg.label}
            </Badge>
          </div>
          {post.excerpt && <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2">{post.excerpt}</p>}
          <div className="flex flex-wrap gap-1.5 mt-2">
            {post.category && <Badge variant="secondary" className="text-[10px]">{post.category}</Badge>}
            {Array.isArray(post.tags) && post.tags.slice(0, 3).map((t: string) => (
              <Badge key={t} variant="outline" className="text-[10px]">{t}</Badge>
            ))}
            {post.reading_time && (
              <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                <Clock className="h-2.5 w-2.5" />{post.reading_time}m read
              </span>
            )}
            {post.views_count > 0 && (
              <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                <Eye className="h-2.5 w-2.5" />{post.views_count}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center justify-between mt-3 pt-2 border-t border-border/50">
          <span className="text-[10px] text-muted-foreground">
            {new Date(post.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
          </span>
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button size="sm" variant="ghost" className="h-6 text-[10px] px-2 gap-1" onClick={onEdit}>
              <Pencil className="h-3 w-3" />Edit
            </Button>
            <Button size="sm" variant="ghost" className="h-6 text-[10px] px-2 gap-1" onClick={onClone}>
              <Copy className="h-3 w-3" />Clone
            </Button>
            <Button size="sm" variant="ghost" className="h-6 text-[10px] px-2 gap-1"
              onClick={() => onToggleStatus(post.status === "published" ? "draft" : "published")}>
              {post.status === "published" ? <EyeOff className="h-3 w-3" /> : <Globe className="h-3 w-3" />}
              {post.status === "published" ? "Unpublish" : "Publish"}
            </Button>
            <Button size="sm" variant="ghost" className="h-6 text-[10px] px-2 gap-1 text-red-500 hover:bg-red-50" onClick={onDelete}>
              <Trash2 className="h-3 w-3" />Delete
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main CMS ─────────────────────────────────────────────────────────────────
export default function HostBlogPosts() {
  const { user } = useAuth();
  const { data: isAdminUser = false } = useIsAdmin(user?.id);
  const { data: posts = [], isLoading, refetch } = useBlogPosts(!!user && isAdminUser);
  const createPost = useCreateBlogPost();
  const updatePost = useUpdateBlogPost();
  const deletePost = useDeleteBlogPost();

  const [showEditor, setShowEditor] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [form, setForm] = useState<BlogForm>(emptyForm);
  const [content, setContent] = useState("");
  const [slugManual, setSlugManual] = useState(false);
  const [activeTab, setActiveTab] = useState<"content" | "meta" | "seo" | "settings">("content");
  const [previewMode, setPreviewMode] = useState(false);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "published" | "draft" | "scheduled" | "archived">("all");
  const [filterCategory, setFilterCategory] = useState("all");
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "views">("newest");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [hasUnsaved, setHasUnsaved] = useState(false);

  // Auto slug from title
  useEffect(() => {
    if (!slugManual && form.title) setForm((p) => ({ ...p, slug: generateSlug(form.title) }));
  }, [form.title, slugManual]);

  // Unsaved changes tracker
  useEffect(() => { if (showEditor) setHasUnsaved(true); }, [form, content]);

  // Auto-save draft every 30 seconds
  const autoSaveRef = useRef<NodeJS.Timeout>();
  useEffect(() => {
    if (!showEditor || !editingId) return;
    clearTimeout(autoSaveRef.current);
    autoSaveRef.current = setTimeout(async () => {
      if (!editingId || !user) return;
      try {
        await updatePost.mutateAsync({ postId: editingId, payload: { title: form.title, slug: form.slug, excerpt: form.excerpt || null, content, featured_image: form.featured_image || null, status: form.status, tags: form.tags.split(",").map((t) => t.trim()).filter(Boolean), reading_time: readingTime(content) } });
        toast.info("Auto-saved", { duration: 1500 });
      } catch { /* silent */ }
    }, 30_000);
    return () => clearTimeout(autoSaveRef.current);
  }, [form, content, editingId]);

  if (!isAdminUser) return (
    <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
      You do not have access to this module.
    </div>
  );

  const seo = seoScore(form);
  const rt = readingTime(content);

  const filteredPosts = useMemo(() => {
    let list = posts as any[];
    if (filterStatus !== "all") list = list.filter((p) => p.status === filterStatus);
    if (filterCategory !== "all") list = list.filter((p) => p.category === filterCategory);
    if (search) list = list.filter((p) =>
      p.title?.toLowerCase().includes(search.toLowerCase()) ||
      p.slug?.toLowerCase().includes(search.toLowerCase()) ||
      (Array.isArray(p.tags) && p.tags.some((t: string) => t.toLowerCase().includes(search.toLowerCase())))
    );
    if (sortBy === "oldest") list = [...list].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    else if (sortBy === "views") list = [...list].sort((a, b) => (b.views_count ?? 0) - (a.views_count ?? 0));
    return list;
  }, [posts, filterStatus, filterCategory, search, sortBy]);

  const stats = useMemo(() => ({
    total: (posts as any[]).length,
    published: (posts as any[]).filter((p) => p.status === "published").length,
    draft: (posts as any[]).filter((p) => p.status === "draft").length,
    views: (posts as any[]).reduce((s, p) => s + (p.views_count ?? 0), 0),
  }), [posts]);

  const resetEditor = () => {
    setEditingId(null); setShowEditor(false); setForm(emptyForm); setContent("");
    setSlugManual(false); setActiveTab("content"); setPreviewMode(false); setHasUnsaved(false);
  };

  const handleSave = async (status?: BlogForm["status"]) => {
    if (!user) return;
    const finalStatus = status ?? form.status;
    if (!form.title.trim()) return toast.error("Title is required.");
    if (!form.slug.trim()) return toast.error("Slug is required.");
    if (!content || content === "<p></p>") return toast.error("Add some content.");

    const payload = {
      author_id: user.id,
      title: form.title.trim(),
      slug: form.slug.trim(),
      excerpt: form.excerpt.trim() || null,
      content,
      featured_image: form.featured_image.trim() || null,
      status: finalStatus,
      category_id: null,
      tags: form.tags.split(",").map((t) => t.trim()).filter(Boolean),
      published_at: finalStatus === "published" ? new Date().toISOString() : (finalStatus === "scheduled" && form.scheduledAt ? new Date(form.scheduledAt).toISOString() : null),
      reading_time: rt,
    };

    try {
      if (editingId) {
        await updatePost.mutateAsync({ postId: editingId, payload });
        toast.success("Post updated!");
      } else {
        await createPost.mutateAsync(payload as any);
        toast.success(finalStatus === "published" ? "Post published!" : "Draft saved!");
      }
      resetEditor(); setHasUnsaved(false);
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to save.");
    }
  };

  const handleEdit = (post: any) => {
    setEditingId(post.id); setSlugManual(true);
    setForm({ title: post.title ?? "", slug: post.slug ?? "", excerpt: post.excerpt ?? "", featured_image: post.featured_image ?? "", status: post.status ?? "draft", category: post.category ?? "", tags: Array.isArray(post.tags) ? post.tags.join(", ") : "", author_name: post.author_name ?? "", metaTitle: post.meta_title ?? "", metaDesc: post.meta_description ?? "", metaKeywords: post.meta_keywords ?? "", scheduledAt: "" });
    setContent(typeof post.content === "string" ? post.content : "");
    setShowEditor(true); setActiveTab("content"); setPreviewMode(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleClone = async (post: any) => {
    if (!user) return;
    try {
      await createPost.mutateAsync({
        author_id: user.id, title: `${post.title} (Copy)`,
        slug: `${post.slug}-copy-${Date.now()}`, excerpt: post.excerpt ?? null,
        content: post.content, featured_image: post.featured_image ?? null,
        status: "draft", tags: post.tags ?? null, reading_time: post.reading_time,
      } as any);
      toast.success("Post cloned as draft.");
      refetch();
    } catch (e: any) { toast.error(e?.message ?? "Failed to clone."); }
  };

  const handleToggleStatus = async (post: any, status: string) => {
    try {
      await updatePost.mutateAsync({ postId: post.id, payload: { status, published_at: status === "published" ? new Date().toISOString() : null } });
      toast.success(`Post ${status === "published" ? "published" : "unpublished"}.`);
      refetch();
    } catch (e: any) { toast.error(e?.message ?? "Failed."); }
  };

  const handleBulkDelete = async () => {
    for (const id of selectedIds) {
      try { await deletePost.mutateAsync(id); } catch { /* continue */ }
    }
    setSelectedIds(new Set()); toast.success(`Deleted ${selectedIds.size} posts.`); refetch();
  };

  const isSaving = createPost.isPending || updatePost.isPending;

  // ─── Editor View ─────────────────────────────────────────────────────────────
  if (showEditor) {
    return (
      <div className="space-y-0 pb-20">
        {/* Editor Header */}
        <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-sm border-b border-border px-6 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <Button variant="ghost" size="sm" className="shrink-0 h-8" onClick={() => {
              if (hasUnsaved && !confirm("You have unsaved changes. Leave anyway?")) return;
              resetEditor();
            }}>
              <X className="h-4 w-4 mr-1" /> Close
            </Button>
            <div className="h-4 w-px bg-border shrink-0" />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground truncate max-w-xs">
                {form.title || "Untitled Post"}
              </p>
              <p className="text-[10px] text-muted-foreground">~{rt} min read</p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Tab switcher */}
            <div className="hidden md:flex items-center gap-0.5 bg-muted rounded-lg p-0.5">
              {(["content", "meta", "seo", "settings"] as const).map((t) => (
                <button key={t} type="button" onClick={() => setActiveTab(t)}
                  className={`px-3 py-1 rounded-md text-xs font-medium capitalize transition-colors
                    ${activeTab === t ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
                  {t}
                </button>
              ))}
            </div>
            <Button variant="outline" size="sm" className="h-8" onClick={() => setPreviewMode(!previewMode)}>
              {previewMode ? <Pencil className="h-3.5 w-3.5 mr-1.5" /> : <Eye className="h-3.5 w-3.5 mr-1.5" />}
              {previewMode ? "Edit" : "Preview"}
            </Button>
            <Button variant="outline" size="sm" className="h-8" disabled={isSaving} onClick={() => handleSave("draft")}>
              <EyeOff className="h-3.5 w-3.5 mr-1.5" />Save Draft
            </Button>
            <Button size="sm" className="h-8 bg-[#013220] hover:bg-[#013220]/90 text-white" disabled={isSaving} onClick={() => handleSave("published")}>
              {isSaving ? <RefreshCw className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Globe className="h-3.5 w-3.5 mr-1.5" />}
              {isSaving ? "Saving…" : editingId ? "Update" : "Publish"}
            </Button>
          </div>
        </div>

        <div className="max-w-5xl mx-auto px-4 py-6">
          {previewMode ? (
            // ─── Preview ─────────────────────────────────────────────────────
            <article className="max-w-3xl mx-auto">
              {form.featured_image && (
                <div className="rounded-2xl overflow-hidden mb-8 h-72">
                  <img src={form.featured_image} alt={form.title} className="w-full h-full object-cover" />
                </div>
              )}
              <div className="flex items-center gap-2 mb-4">
                {form.category && <Badge variant="secondary">{form.category}</Badge>}
                <span className="text-xs text-muted-foreground">{rt} min read</span>
              </div>
              <h1 className="text-4xl font-bold text-foreground mb-4 leading-tight">{form.title || "Untitled"}</h1>
              {form.excerpt && <p className="text-lg text-muted-foreground mb-8 leading-relaxed">{form.excerpt}</p>}
              <div className="prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: content }} />
            </article>
          ) : (
            // ─── Tabs ─────────────────────────────────────────────────────────
            <div className="space-y-6">
              {/* Mobile tabs */}
              <div className="flex gap-1 p-1 bg-muted rounded-lg md:hidden">
                {(["content", "meta", "seo", "settings"] as const).map((t) => (
                  <button key={t} type="button" onClick={() => setActiveTab(t)}
                    className={`flex-1 py-1.5 rounded-md text-xs font-medium capitalize transition-colors
                      ${activeTab === t ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground'}`}>
                    {t}
                  </button>
                ))}
              </div>

              {/* CONTENT TAB */}
              {activeTab === "content" && (
                <div className="space-y-5">
                  {/* Title */}
                  <div>
                    <Input
                      value={form.title}
                      onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                      placeholder="Post title…"
                      className="text-2xl font-bold border-0 border-b border-border rounded-none px-0 h-12 shadow-none focus-visible:ring-0 bg-transparent"
                    />
                  </div>

                  {/* Slug */}
                  <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/40 rounded-lg px-3 py-2">
                    <span className="shrink-0">xplorwing.com/blog/</span>
                    <input
                      value={form.slug}
                      onChange={(e) => { setSlugManual(true); setForm((p) => ({ ...p, slug: e.target.value })); }}
                      className="flex-1 bg-transparent text-foreground outline-none font-mono text-xs min-w-0"
                      placeholder="post-slug"
                    />
                    {!slugManual && <span className="text-primary text-[10px] shrink-0">auto</span>}
                  </div>

                  {/* Featured Image */}
                  <div className="space-y-2">
                    <Label className="flex items-center gap-1.5 text-sm font-semibold">
                      <ImageIcon className="h-3.5 w-3.5" />Featured Image
                    </Label>
                    <FeaturedImageUpload value={form.featured_image} onChange={(url) => setForm((p) => ({ ...p, featured_image: url }))} />
                  </div>

                  {/* Rich Text Editor */}
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold">Content <span className="text-destructive">*</span></Label>
                    <RichTextEditor
                      content={content}
                      onChange={setContent}
                      placeholder="Start writing your amazing blog post…"
                      minHeight={500}
                    />
                  </div>

                  {/* Excerpt */}
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold">Excerpt</Label>
                    <Textarea
                      value={form.excerpt}
                      onChange={(e) => setForm((p) => ({ ...p, excerpt: e.target.value }))}
                      placeholder="A short summary shown on listing cards and search results…"
                      rows={3}
                      className="resize-none"
                    />
                    <p className="text-[10px] text-muted-foreground">{form.excerpt.length} chars · Aim for 120–160</p>
                  </div>

                  {/* Tags */}
                  <div className="space-y-2">
                    <Label className="flex items-center gap-1.5 text-sm font-semibold">
                      <Tag className="h-3.5 w-3.5" />Tags
                    </Label>
                    <Input value={form.tags} onChange={(e) => setForm((p) => ({ ...p, tags: e.target.value }))} placeholder="coorg, adventure, homestay" />
                    {form.tags && (
                      <div className="flex flex-wrap gap-1.5">
                        {form.tags.split(",").filter(Boolean).map((t) => (
                          <Badge key={t} variant="secondary" className="text-xs">{t.trim()}</Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* META TAB */}
              {activeTab === "meta" && (
                <div className="space-y-5">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Category</Label>
                      <Select value={form.category} onValueChange={(v) => setForm((p) => ({ ...p, category: v }))}>
                        <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                        <SelectContent>
                          {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Author Name</Label>
                      <Input value={form.author_name} onChange={(e) => setForm((p) => ({ ...p, author_name: e.target.value }))} placeholder="Xplorwing Team" />
                    </div>
                  </div>

                  {/* Status & Schedule */}
                  <div className="space-y-2">
                    <Label>Publishing Status</Label>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                      {(["draft", "published", "scheduled", "archived"] as const).map((s) => {
                        const c = STATUS_CONFIG[s];
                        const I = c.icon;
                        return (
                          <button key={s} type="button" onClick={() => setForm((p) => ({ ...p, status: s }))}
                            className={`flex items-center gap-2 p-3 rounded-xl border-2 text-left transition-all text-sm
                              ${form.status === s ? 'border-[#013220] bg-[#013220]/5' : 'border-border hover:border-[#013220]/30'}`}>
                            <I className="h-4 w-4 shrink-0" />
                            <span className="font-medium capitalize">{c.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {form.status === "scheduled" && (
                    <div className="space-y-2">
                      <Label>Schedule Date & Time</Label>
                      <Input type="datetime-local" value={form.scheduledAt} onChange={(e) => setForm((p) => ({ ...p, scheduledAt: e.target.value }))} />
                    </div>
                  )}
                </div>
              )}

              {/* SEO TAB */}
              {activeTab === "seo" && (
                <div className="space-y-5">
                  {/* SEO Score */}
                  <div className="flex items-center gap-4 p-4 rounded-xl bg-muted/30 border border-border">
                    <SeoScoreRing score={seo.score} />
                    <div>
                      <p className="font-semibold text-sm">SEO Score: {seo.score}/100</p>
                      <p className="text-xs text-muted-foreground">
                        {seo.score >= 70 ? "Good — ready to publish" : seo.score >= 40 ? "Fair — can be improved" : "Needs attention"}
                      </p>
                    </div>
                  </div>

                  {seo.issues.length > 0 && (
                    <div className="space-y-1.5">
                      {seo.issues.map((issue, i) => (
                        <div key={i} className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 rounded-lg px-3 py-2">
                          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                          {issue}
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>SEO Title</Label>
                      <span className={`text-[10px] ${form.metaTitle.length > 60 ? 'text-red-500' : 'text-muted-foreground'}`}>
                        {form.metaTitle.length}/60
                      </span>
                    </div>
                    <Input value={form.metaTitle} onChange={(e) => setForm((p) => ({ ...p, metaTitle: e.target.value }))}
                      placeholder={form.title ? `${form.title} — Xplorwing Blog` : "SEO title…"} />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Meta Description</Label>
                      <span className={`text-[10px] ${form.metaDesc.length > 160 ? 'text-red-500' : 'text-muted-foreground'}`}>
                        {form.metaDesc.length}/160
                      </span>
                    </div>
                    <Textarea value={form.metaDesc} onChange={(e) => setForm((p) => ({ ...p, metaDesc: e.target.value }))}
                      placeholder="Brief description for search engines…" rows={3} className="resize-none" />
                  </div>

                  <div className="space-y-2">
                    <Label>Keywords (comma separated)</Label>
                    <Input value={form.metaKeywords} onChange={(e) => setForm((p) => ({ ...p, metaKeywords: e.target.value }))}
                      placeholder="travel, adventure, coorg, homestay" />
                  </div>

                  {/* Google Preview */}
                  <div className="rounded-xl border border-border p-4 bg-white dark:bg-card space-y-1">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold mb-2">Google Preview</p>
                    <p className="text-[#1a0dab] dark:text-blue-400 text-sm font-medium truncate">
                      {form.metaTitle || form.title || "Post Title"} — Xplorwing Blog
                    </p>
                    <p className="text-[#006621] dark:text-emerald-400 text-xs truncate">
                      xplorwing.com › blog › {form.slug || "post-slug"}
                    </p>
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {form.metaDesc || form.excerpt || "No description provided."}
                    </p>
                  </div>
                </div>
              )}

              {/* SETTINGS TAB */}
              {activeTab === "settings" && (
                <div className="space-y-4">
                  <div className="p-4 rounded-xl border border-border bg-muted/20 space-y-3">
                    <p className="text-sm font-semibold">Quick Actions</p>
                    <div className="flex gap-2 flex-wrap">
                      <Button variant="outline" size="sm" onClick={() => handleSave("draft")}>
                        <EyeOff className="h-3.5 w-3.5 mr-1.5" />Save as Draft
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => handleSave("archived")}>
                        <Archive className="h-3.5 w-3.5 mr-1.5" />Archive
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ─── List View ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-foreground flex items-center gap-2">
            <BookOpen className="h-7 w-7 text-[#013220]" />Blog CMS
          </h1>
          <p className="text-muted-foreground text-sm mt-0.5">Create and manage all Xplorwing blog content.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-1.5" />Refresh
          </Button>
          <Button size="sm" className="bg-[#013220] hover:bg-[#013220]/90 text-white" onClick={() => { resetEditor(); setShowEditor(true); }}>
            <Plus className="h-4 w-4 mr-1.5" />New Post
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Posts", value: stats.total, icon: FileText, color: "text-blue-600 bg-blue-50" },
          { label: "Published", value: stats.published, icon: Globe, color: "text-green-600 bg-green-50" },
          { label: "Drafts", value: stats.draft, icon: EyeOff, color: "text-amber-600 bg-amber-50" },
          { label: "Total Views", value: stats.views.toLocaleString(), icon: BarChart2, color: "text-purple-600 bg-purple-50" },
        ].map((s) => (
          <Card key={s.label} className="rounded-2xl border-0 shadow-sm">
            <CardContent className="p-4 flex items-center gap-3">
              <div className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 ${s.color}`}>
                <s.icon className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{s.label}</p>
                <p className="text-xl font-bold text-foreground">{s.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9 h-9" placeholder="Search posts…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>

        <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v as any)}>
          <SelectTrigger className="w-32 h-9"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="published">Published</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="scheduled">Scheduled</SelectItem>
            <SelectItem value="archived">Archived</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger className="w-40 h-9"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select value={sortBy} onValueChange={(v) => setSortBy(v as any)}>
          <SelectTrigger className="w-32 h-9"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">Newest First</SelectItem>
            <SelectItem value="oldest">Oldest First</SelectItem>
            <SelectItem value="views">Most Views</SelectItem>
          </SelectContent>
        </Select>

        {selectedIds.size > 0 && (
          <Button variant="destructive" size="sm" className="h-9" onClick={handleBulkDelete}>
            <Trash2 className="h-3.5 w-3.5 mr-1.5" />Delete {selectedIds.size}
          </Button>
        )}
      </div>

      {/* Posts Grid */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-32 rounded-2xl" />)}
        </div>
      ) : filteredPosts.length === 0 ? (
        <div className="text-center py-16 border-2 border-dashed border-border rounded-2xl">
          <BookOpen className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground mb-4">
            {search || filterStatus !== "all" ? "No posts match your filters." : "No posts yet."}
          </p>
          <Button size="sm" className="bg-[#013220] hover:bg-[#013220]/90 text-white"
            onClick={() => { resetEditor(); setShowEditor(true); }}>
            <Plus className="h-4 w-4 mr-1.5" />Create your first post
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredPosts.map((post: any) => (
            <BlogCard
              key={post.id}
              post={post}
              onEdit={() => handleEdit(post)}
              onDelete={() => setDeleteTargetId(post.id)}
              onClone={() => handleClone(post)}
              onToggleStatus={(s) => handleToggleStatus(post, s)}
            />
          ))}
        </div>
      )}

      {/* Delete Dialog */}
      <AlertDialog open={!!deleteTargetId} onOpenChange={(o) => !o && setDeleteTargetId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Blog Post?</AlertDialogTitle>
            <AlertDialogDescription>This cannot be undone. The post will be permanently removed.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={async () => {
                if (!deleteTargetId) return;
                try { await deletePost.mutateAsync(deleteTargetId); toast.success("Deleted."); } catch (e: any) { toast.error(e?.message); }
                setDeleteTargetId(null);
              }}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
