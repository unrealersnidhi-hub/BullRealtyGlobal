import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Upload, X, Save, Send, Eye } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface Blog {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  content: string;
  featured_image: string | null;
  category_id: string | null;
  author_id: string;
  status: string;
  published_at: string | null;
  meta_title: string | null;
  meta_description: string | null;
  tags: string[];
}

interface BlogCategory {
  id: string;
  name: string;
  slug: string;
}

interface BlogEditorProps {
  blog?: Blog | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

const BlogEditor = ({ blog, open, onOpenChange, onSuccess }: BlogEditorProps) => {
  const queryClient = useQueryClient();
  const [uploading, setUploading] = useState(false);
  const [tagInput, setTagInput] = useState("");
  const [formData, setFormData] = useState({
    title: "",
    slug: "",
    excerpt: "",
    content: "",
    featured_image: "",
    category_id: "",
    meta_title: "",
    meta_description: "",
    tags: [] as string[],
  });

  const { data: categories = [] } = useQuery({
    queryKey: ["blog-categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("blog_categories")
        .select("*")
        .order("name");
      if (error) throw error;
      return data as BlogCategory[];
    },
  });

  useEffect(() => {
    if (blog) {
      setFormData({
        title: blog.title,
        slug: blog.slug,
        excerpt: blog.excerpt || "",
        content: blog.content,
        featured_image: blog.featured_image || "",
        category_id: blog.category_id || "",
        meta_title: blog.meta_title || "",
        meta_description: blog.meta_description || "",
        tags: blog.tags || [],
      });
    } else {
      setFormData({
        title: "",
        slug: "",
        excerpt: "",
        content: "",
        featured_image: "",
        category_id: "",
        meta_title: "",
        meta_description: "",
        tags: [],
      });
    }
  }, [blog, open]);

  const generateSlug = (title: string) => {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)+/g, "");
  };

  const saveMutation = useMutation({
    mutationFn: async ({ status }: { status: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const blogData = {
        title: formData.title,
        slug: formData.slug || generateSlug(formData.title),
        excerpt: formData.excerpt || null,
        content: formData.content,
        featured_image: formData.featured_image || null,
        category_id: formData.category_id || null,
        meta_title: formData.meta_title || null,
        meta_description: formData.meta_description || null,
        tags: formData.tags,
        status,
        published_at: status === "published" ? new Date().toISOString() : null,
        author_id: blog?.author_id || user.id,
      };

      if (blog) {
        const { error } = await supabase
          .from("blogs")
          .update(blogData)
          .eq("id", blog.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("blogs").insert(blogData);
        if (error) throw error;
      }
    },
    onSuccess: (_, { status }) => {
      queryClient.invalidateQueries({ queryKey: ["blogs"] });
      toast.success(status === "published" ? "Blog published!" : "Blog saved as draft");
      onOpenChange(false);
      onSuccess?.();
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to save blog");
    },
  });

  const handleImageUpload = async (file: File) => {
    setUploading(true);
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("blog-images")
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("blog-images")
        .getPublicUrl(fileName);

      setFormData({ ...formData, featured_image: publicUrl });
      toast.success("Image uploaded");
    } catch (error: any) {
      toast.error("Failed to upload image: " + error.message);
    } finally {
      setUploading(false);
    }
  };

  const addTag = () => {
    if (tagInput.trim() && !formData.tags.includes(tagInput.trim())) {
      setFormData({ ...formData, tags: [...formData.tags, tagInput.trim()] });
      setTagInput("");
    }
  };

  const removeTag = (tag: string) => {
    setFormData({ ...formData, tags: formData.tags.filter((t) => t !== tag) });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{blog ? "Edit Blog Post" : "Create New Blog Post"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Title & Slug */}
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => {
                  setFormData({
                    ...formData,
                    title: e.target.value,
                    slug: formData.slug || generateSlug(e.target.value),
                  });
                }}
                placeholder="Enter blog title"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="slug">URL Slug</Label>
              <Input
                id="slug"
                value={formData.slug}
                onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                placeholder="blog-post-url"
              />
            </div>
          </div>

          {/* Featured Image */}
          <div className="space-y-2">
            <Label>Featured Image</Label>
            {formData.featured_image ? (
              <div className="relative w-full h-48 rounded-lg overflow-hidden bg-muted">
                <img
                  src={formData.featured_image}
                  alt="Featured"
                  className="w-full h-full object-cover"
                />
                <Button
                  variant="destructive"
                  size="icon"
                  className="absolute top-2 right-2"
                  onClick={() => setFormData({ ...formData, featured_image: "" })}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-border rounded-lg cursor-pointer hover:bg-accent/50 transition-colors">
                <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                <span className="text-sm text-muted-foreground">
                  {uploading ? "Uploading..." : "Click to upload featured image"}
                </span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleImageUpload(file);
                  }}
                  disabled={uploading}
                />
              </label>
            )}
          </div>

          {/* Category */}
          <div className="space-y-2">
            <Label>Category</Label>
            <Select
              value={formData.category_id}
              onValueChange={(value) => setFormData({ ...formData, category_id: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Excerpt */}
          <div className="space-y-2">
            <Label htmlFor="excerpt">Excerpt</Label>
            <Textarea
              id="excerpt"
              value={formData.excerpt}
              onChange={(e) => setFormData({ ...formData, excerpt: e.target.value })}
              placeholder="Brief description for previews and SEO"
              rows={2}
            />
          </div>

          {/* Content */}
          <div className="space-y-2">
            <Label htmlFor="content">Content *</Label>
            <Textarea
              id="content"
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              placeholder="Write your blog content here... (Markdown supported)"
              rows={12}
              className="font-mono text-sm"
            />
          </div>

          {/* Tags */}
          <div className="space-y-2">
            <Label>Tags</Label>
            <div className="flex gap-2">
              <Input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                placeholder="Add a tag"
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addTag())}
              />
              <Button type="button" variant="outline" onClick={addTag}>
                Add
              </Button>
            </div>
            {formData.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {formData.tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="gap-1">
                    {tag}
                    <X
                      className="h-3 w-3 cursor-pointer"
                      onClick={() => removeTag(tag)}
                    />
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* SEO */}
          <div className="border-t border-border pt-4">
            <h4 className="font-medium mb-4">SEO Settings</h4>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="meta_title">Meta Title</Label>
                <Input
                  id="meta_title"
                  value={formData.meta_title}
                  onChange={(e) => setFormData({ ...formData, meta_title: e.target.value })}
                  placeholder="SEO title (defaults to blog title)"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="meta_description">Meta Description</Label>
                <Textarea
                  id="meta_description"
                  value={formData.meta_description}
                  onChange={(e) => setFormData({ ...formData, meta_description: e.target.value })}
                  placeholder="SEO description (defaults to excerpt)"
                  rows={2}
                />
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-border">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              variant="outline"
              onClick={() => saveMutation.mutate({ status: "draft" })}
              disabled={saveMutation.isPending || !formData.title || !formData.content}
            >
              <Save className="h-4 w-4 mr-2" />
              Save Draft
            </Button>
            <Button
              onClick={() => saveMutation.mutate({ status: "published" })}
              disabled={saveMutation.isPending || !formData.title || !formData.content}
              className="bg-gold text-charcoal hover:bg-gold-light"
            >
              <Send className="h-4 w-4 mr-2" />
              Publish
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BlogEditor;
