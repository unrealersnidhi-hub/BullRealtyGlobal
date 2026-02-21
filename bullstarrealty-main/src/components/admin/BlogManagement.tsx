import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Eye, Search, FileText } from "lucide-react";
import { format } from "date-fns";
import BlogEditor from "./BlogEditor";

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
  view_count: number;
  created_at: string;
  updated_at: string;
  category?: { name: string } | null;
  author?: { full_name: string | null; email: string | null } | null;
}

interface BlogManagementProps {
  isAdmin: boolean;
  userId: string;
}

const BlogManagement = ({ isAdmin, userId }: BlogManagementProps) => {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingBlog, setEditingBlog] = useState<Blog | null>(null);
  const [deletingBlogId, setDeletingBlogId] = useState<string | null>(null);

  const { data: blogs = [], isLoading } = useQuery({
    queryKey: ["blogs", statusFilter],
    queryFn: async () => {
      let query = supabase
        .from("blogs")
        .select(`
          *,
          category:blog_categories(name)
        `)
        .order("created_at", { ascending: false });

      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }

      // Non-admin users can only see their own blogs
      if (!isAdmin) {
        query = query.eq("author_id", userId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Blog[];
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("blogs").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["blogs"] });
      toast.success("Blog deleted successfully");
      setDeletingBlogId(null);
    },
    onError: (error: any) => {
      toast.error("Failed to delete blog: " + error.message);
    },
  });

  const filteredBlogs = blogs.filter((blog) =>
    blog.title.toLowerCase().includes(search.toLowerCase())
  );

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "published":
        return <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Published</Badge>;
      case "draft":
        return <Badge variant="secondary">Draft</Badge>;
      case "archived":
        return <Badge variant="outline" className="text-muted-foreground">Archived</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const openEditor = (blog?: Blog) => {
    setEditingBlog(blog || null);
    setIsEditorOpen(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-2 border-gold border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Blog Posts</h2>
          <p className="text-muted-foreground">
            {isAdmin ? "Manage all blog posts" : "Manage your blog posts"}
          </p>
        </div>
        <Button onClick={() => openEditor()} className="bg-gold text-charcoal hover:bg-gold-light">
          <Plus className="w-4 h-4 mr-2" />
          New Post
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search blogs..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="published">Published</SelectItem>
            <SelectItem value="archived">Archived</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      {filteredBlogs.length === 0 ? (
        <div className="text-center py-12 bg-card rounded-xl border border-border">
          <FileText className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">No blog posts yet</h3>
          <p className="text-muted-foreground mb-4">
            Create your first blog post to get started
          </p>
          <Button onClick={() => openEditor()}>
            <Plus className="w-4 h-4 mr-2" />
            Create Post
          </Button>
        </div>
      ) : (
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Author</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Views</TableHead>
                <TableHead>Updated</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredBlogs.map((blog) => (
                <TableRow key={blog.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      {blog.featured_image ? (
                        <img
                          src={blog.featured_image}
                          alt={blog.title}
                          className="w-12 h-12 rounded-lg object-cover"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center">
                          <FileText className="w-5 h-5 text-muted-foreground" />
                        </div>
                      )}
                      <div>
                        <p className="font-medium truncate max-w-[200px]">{blog.title}</p>
                        <p className="text-xs text-muted-foreground">/{blog.slug}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    {blog.category?.name || <span className="text-muted-foreground">—</span>}
                  </TableCell>
                  <TableCell>
                    <span className="text-sm">
                      {blog.author?.full_name || blog.author?.email || "Unknown"}
                    </span>
                  </TableCell>
                  <TableCell>{getStatusBadge(blog.status)}</TableCell>
                  <TableCell>{blog.view_count}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {format(new Date(blog.updated_at), "MMM d, yyyy")}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      {blog.status === "published" && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => window.open(`/blog/${blog.slug}`, "_blank")}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                      )}
                      <Button variant="ghost" size="icon" onClick={() => openEditor(blog)}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive"
                        onClick={() => setDeletingBlogId(blog.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Editor Dialog */}
      <BlogEditor
        blog={editingBlog}
        open={isEditorOpen}
        onOpenChange={setIsEditorOpen}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletingBlogId} onOpenChange={() => setDeletingBlogId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Blog Post</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this blog post? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingBlogId && deleteMutation.mutate(deletingBlogId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default BlogManagement;
