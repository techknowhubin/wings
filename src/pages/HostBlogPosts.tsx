import { useMemo, useState } from "react";
import { Check, Pencil, Plus, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/useAuth";
import { useCreateBlogPost, useDeleteBlogPost, useIsAdmin, useUpdateBlogPost, useBlogPosts } from "@/hooks/useListings";
import { toast } from "sonner";

export default function HostBlogPosts() {
  const { user } = useAuth();
  const { data: isAdminUser = false } = useIsAdmin(user?.id);
  const { data: posts = [], isLoading } = useBlogPosts(!!user && isAdminUser);
  const createPost = useCreateBlogPost();
  const updatePost = useUpdateBlogPost();
  const deletePost = useDeleteBlogPost();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: "",
    slug: "",
    excerpt: "",
    content: "",
    featured_image: "",
    status: "draft",
  });

  const buttonText = useMemo(() => (editingId ? "Update Post" : "Create Post"), [editingId]);

  if (!isAdminUser) {
    return <p className="text-sm text-muted-foreground">You do not have access to this module.</p>;
  }

  const resetForm = () => {
    setEditingId(null);
    setForm({ title: "", slug: "", excerpt: "", content: "", featured_image: "", status: "draft" });
  };

  const handleSave = async () => {
    if (!user) return;
    if (!form.title.trim() || !form.slug.trim() || !form.content.trim()) {
      toast.error("Title, slug and content are required.");
      return;
    }
    try {
      const payload = {
        author_id: user.id,
        title: form.title.trim(),
        slug: form.slug.trim(),
        excerpt: form.excerpt.trim() || null,
        content: form.content.trim(),
        featured_image: form.featured_image.trim() || null,
        status: form.status,
        published_at: form.status === "published" ? new Date().toISOString() : null,
      };
      if (editingId) {
        await updatePost.mutateAsync({ postId: editingId, payload });
      } else {
        await createPost.mutateAsync(payload as any);
      }
      toast.success(editingId ? "Blog post updated." : "Blog post created.");
      resetForm();
    } catch (error: any) {
      toast.error(error?.message || "Failed to save blog post.");
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold text-foreground">Blog Posts</h1>
        <p className="text-muted-foreground mt-1">Create and manage marketplace blog content.</p>
      </div>

      <Card>
        <CardHeader><CardTitle>{editingId ? "Edit Blog Post" : "Create Blog Post"}</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><Label>Title</Label><Input value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} /></div>
            <div><Label>Slug</Label><Input value={form.slug} onChange={(e) => setForm((p) => ({ ...p, slug: e.target.value }))} /></div>
          </div>
          <div><Label>Excerpt</Label><Textarea rows={2} value={form.excerpt} onChange={(e) => setForm((p) => ({ ...p, excerpt: e.target.value }))} /></div>
          <div><Label>Featured Image URL</Label><Input value={form.featured_image} onChange={(e) => setForm((p) => ({ ...p, featured_image: e.target.value }))} /></div>
          <div><Label>Content</Label><Textarea rows={8} value={form.content} onChange={(e) => setForm((p) => ({ ...p, content: e.target.value }))} /></div>
          <div><Label>Status</Label><Input value={form.status} onChange={(e) => setForm((p) => ({ ...p, status: e.target.value }))} placeholder="draft or published" /></div>
          <div className="flex gap-2">
            <Button onClick={handleSave}>
              {editingId ? <Check className="h-4 w-4 mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
              {buttonText}
            </Button>
            {editingId ? <Button variant="outline" onClick={resetForm}>Cancel</Button> : null}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Existing Posts</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {isLoading ? <p className="text-sm text-muted-foreground">Loading posts...</p> : null}
          {!isLoading && posts.length === 0 ? <p className="text-sm text-muted-foreground">No posts yet.</p> : null}
          {(posts as any[]).map((post) => (
            <div key={post.id} className="rounded-lg border border-border p-3 flex items-center justify-between gap-3">
              <div>
                <p className="font-semibold">{post.title}</p>
                <p className="text-xs text-muted-foreground">/{post.slug} | {post.status || "draft"}</p>
              </div>
              <div className="flex gap-2">
                <Button size="icon" variant="outline" onClick={() => {
                  setEditingId(post.id);
                  setForm({
                    title: post.title ?? "",
                    slug: post.slug ?? "",
                    excerpt: post.excerpt ?? "",
                    content: post.content ?? "",
                    featured_image: post.featured_image ?? "",
                    status: post.status ?? "draft",
                  });
                }}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button size="icon" variant="outline" onClick={() => deletePost.mutate(post.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
