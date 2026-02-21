import { useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, User, ArrowLeft, Clock, Share2 } from "lucide-react";
import { format } from "date-fns";
import ReactMarkdown from "react-markdown";

interface Blog {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  content: string;
  featured_image: string | null;
  published_at: string | null;
  meta_title: string | null;
  meta_description: string | null;
  tags: string[];
  view_count: number;
  category?: { name: string; slug: string } | null;
}

const BlogPost = () => {
  const { slug } = useParams<{ slug: string }>();

  const { data: blog, isLoading, error } = useQuery({
    queryKey: ["blog-post", slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("blogs")
        .select(`
          *,
          category:blog_categories(name, slug)
        `)
        .eq("slug", slug)
        .eq("status", "published")
        .single();

      if (error) throw error;
      return data as Omit<Blog, 'author'>;
    },
    enabled: !!slug,
  });

  // Increment view count
  useEffect(() => {
    if (blog?.id) {
      supabase
        .from("blogs")
        .update({ view_count: (blog.view_count || 0) + 1 })
        .eq("id", blog.id)
        .then(() => {});
    }
  }, [blog?.id]);

  // Update document title
  useEffect(() => {
    if (blog) {
      document.title = blog.meta_title || blog.title;
    }
    return () => {
      document.title = "Bull Star Realty";
    };
  }, [blog]);

  const handleShare = async () => {
    if (navigator.share) {
      await navigator.share({
        title: blog?.title,
        text: blog?.excerpt || "",
        url: window.location.href,
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
    }
  };

  const estimateReadTime = (content: string) => {
    const wordsPerMinute = 200;
    const words = content.split(/\s+/).length;
    return Math.ceil(words / wordsPerMinute);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="pt-24 pb-16">
          <div className="max-w-4xl mx-auto px-4">
            <div className="animate-pulse">
              <div className="h-8 bg-muted rounded w-3/4 mb-4" />
              <div className="h-4 bg-muted rounded w-1/2 mb-8" />
              <div className="aspect-video bg-muted rounded-2xl mb-8" />
              <div className="space-y-4">
                <div className="h-4 bg-muted rounded" />
                <div className="h-4 bg-muted rounded" />
                <div className="h-4 bg-muted rounded w-3/4" />
              </div>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (error || !blog) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="pt-24 pb-16">
          <div className="max-w-4xl mx-auto px-4 text-center">
            <h1 className="text-3xl font-bold mb-4">Blog Post Not Found</h1>
            <p className="text-muted-foreground mb-8">
              The blog post you're looking for doesn't exist or has been removed.
            </p>
            <Button asChild>
              <Link to="/blog">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Blog
              </Link>
            </Button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="pt-24 pb-16">
        <article className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Back Link */}
          <Link
            to="/blog"
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-gold transition-colors mb-8"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Blog
          </Link>

          {/* Header */}
          <header className="mb-8">
            <div className="flex flex-wrap items-center gap-4 mb-4">
              {blog.category && (
                <Badge className="bg-gold text-charcoal">{blog.category.name}</Badge>
              )}
              <span className="text-sm text-muted-foreground flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                {blog.published_at && format(new Date(blog.published_at), "MMMM d, yyyy")}
              </span>
              <span className="text-sm text-muted-foreground flex items-center gap-1">
                <Clock className="w-4 h-4" />
                {estimateReadTime(blog.content)} min read
              </span>
            </div>

            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4">
              {blog.title}
            </h1>

            {blog.excerpt && (
              <p className="text-xl text-muted-foreground">{blog.excerpt}</p>
            )}

            <div className="flex items-center justify-between mt-6 pt-6 border-t border-border">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gold/20 flex items-center justify-center">
                  <User className="w-5 h-5 text-gold" />
                </div>
                <div>
                  <p className="font-medium">Bull Star Realty</p>
                  <p className="text-sm text-muted-foreground">Author</p>
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={handleShare}>
                <Share2 className="w-4 h-4 mr-2" />
                Share
              </Button>
            </div>
          </header>

          {/* Featured Image */}
          {blog.featured_image && (
            <div className="aspect-video rounded-2xl overflow-hidden mb-8">
              <img
                src={blog.featured_image}
                alt={blog.title}
                className="w-full h-full object-cover"
              />
            </div>
          )}

          {/* Content */}
          <div className="prose prose-lg dark:prose-invert max-w-none">
            <ReactMarkdown
              components={{
                h1: ({ children }) => (
                  <h1 className="text-3xl font-bold mt-8 mb-4">{children}</h1>
                ),
                h2: ({ children }) => (
                  <h2 className="text-2xl font-bold mt-8 mb-4">{children}</h2>
                ),
                h3: ({ children }) => (
                  <h3 className="text-xl font-bold mt-6 mb-3">{children}</h3>
                ),
                p: ({ children }) => (
                  <p className="text-foreground/90 leading-relaxed mb-4">{children}</p>
                ),
                ul: ({ children }) => (
                  <ul className="list-disc list-inside space-y-2 mb-4">{children}</ul>
                ),
                ol: ({ children }) => (
                  <ol className="list-decimal list-inside space-y-2 mb-4">{children}</ol>
                ),
                blockquote: ({ children }) => (
                  <blockquote className="border-l-4 border-gold pl-4 italic my-6">
                    {children}
                  </blockquote>
                ),
                a: ({ href, children }) => (
                  <a
                    href={href}
                    className="text-gold hover:underline"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {children}
                  </a>
                ),
              }}
            >
              {blog.content}
            </ReactMarkdown>
          </div>

          {/* Tags */}
          {blog.tags && blog.tags.length > 0 && (
            <div className="mt-8 pt-8 border-t border-border">
              <h4 className="font-medium mb-3">Tags</h4>
              <div className="flex flex-wrap gap-2">
                {blog.tags.map((tag) => (
                  <Badge key={tag} variant="secondary">
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </article>
      </main>

      <Footer />
    </div>
  );
};

export default BlogPost;
