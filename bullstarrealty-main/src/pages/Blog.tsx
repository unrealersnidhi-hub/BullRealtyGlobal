import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Badge } from "@/components/ui/badge";
import { Calendar, User, ArrowRight, Clock } from "lucide-react";
import { format } from "date-fns";

interface Blog {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  featured_image: string | null;
  published_at: string | null;
  tags: string[];
  category?: { name: string; slug: string } | null;
}

const Blog = () => {
  const { data: blogs = [], isLoading } = useQuery({
    queryKey: ["public-blogs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("blogs")
        .select(`
          id, title, slug, excerpt, featured_image, published_at, tags,
          category:blog_categories(name, slug)
        `)
        .eq("status", "published")
        .order("published_at", { ascending: false });

      if (error) throw error;
      return data as (Omit<Blog, 'author'> & { category?: { name: string; slug: string } | null })[];
    },
  });

  const { data: categories = [] } = useQuery({
    queryKey: ["blog-categories-public"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("blog_categories")
        .select("*")
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  const featuredBlog = blogs[0];
  const otherBlogs = blogs.slice(1);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="pt-24 pb-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="text-center mb-12">
            <span className="text-sm font-medium text-gold uppercase tracking-wider">Our Blog</span>
            <h1 className="text-4xl md:text-5xl font-bold mt-4 mb-4">
              Insights & Updates
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Stay informed with the latest real estate news, market trends, and expert advice from Bull Star Realty.
            </p>
          </div>

          {/* Categories */}
          <div className="flex flex-wrap justify-center gap-2 mb-12">
            <Badge variant="outline" className="cursor-pointer hover:bg-gold hover:text-charcoal transition-colors">
              All Posts
            </Badge>
            {categories.map((cat) => (
              <Badge
                key={cat.id}
                variant="outline"
                className="cursor-pointer hover:bg-gold hover:text-charcoal transition-colors"
              >
                {cat.name}
              </Badge>
            ))}
          </div>

          {isLoading ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {[1, 2, 3].map((i) => (
                <div key={i} className="animate-pulse">
                  <div className="bg-muted h-48 rounded-2xl mb-4" />
                  <div className="h-6 bg-muted rounded w-3/4 mb-2" />
                  <div className="h-4 bg-muted rounded w-1/2" />
                </div>
              ))}
            </div>
          ) : blogs.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-muted-foreground text-lg">No blog posts published yet.</p>
            </div>
          ) : (
            <>
              {/* Featured Post */}
              {featuredBlog && (
                <Link
                  to={`/blog/${featuredBlog.slug}`}
                  className="block mb-12 group"
                >
                  <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-charcoal to-charcoal-light">
                    <div className="grid lg:grid-cols-2 gap-8">
                      <div className="aspect-[4/3] lg:aspect-auto">
                        {featuredBlog.featured_image ? (
                          <img
                            src={featuredBlog.featured_image}
                            alt={featuredBlog.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          />
                        ) : (
                          <div className="w-full h-full min-h-[300px] bg-gradient-to-br from-gold/20 to-gold/5" />
                        )}
                      </div>
                      <div className="p-8 lg:py-12 flex flex-col justify-center">
                        <div className="flex items-center gap-4 mb-4">
                          {featuredBlog.category && (
                            <Badge className="bg-gold text-charcoal">
                              {featuredBlog.category.name}
                            </Badge>
                          )}
                          <span className="text-sm text-muted-foreground flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            {featuredBlog.published_at &&
                              format(new Date(featuredBlog.published_at), "MMM d, yyyy")}
                          </span>
                        </div>
                        <h2 className="text-2xl lg:text-3xl font-bold mb-4 group-hover:text-gold transition-colors">
                          {featuredBlog.title}
                        </h2>
                        {featuredBlog.excerpt && (
                          <p className="text-muted-foreground mb-6 line-clamp-3">
                            {featuredBlog.excerpt}
                          </p>
                        )}
                        <div className="flex items-center justify-end">
                          <span className="flex items-center gap-2 text-gold group-hover:gap-3 transition-all">
                            Read More <ArrowRight className="w-4 h-4" />
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              )}

              {/* Other Posts Grid */}
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                {otherBlogs.map((blog) => (
                  <Link
                    key={blog.id}
                    to={`/blog/${blog.slug}`}
                    className="group bg-card rounded-2xl overflow-hidden border border-border hover:border-gold/50 transition-all hover:shadow-xl"
                  >
                    <div className="aspect-[16/10] overflow-hidden">
                      {blog.featured_image ? (
                        <img
                          src={blog.featured_image}
                          alt={blog.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-gold/20 to-gold/5" />
                      )}
                    </div>
                    <div className="p-6">
                      <div className="flex items-center gap-3 mb-3">
                        {blog.category && (
                          <Badge variant="secondary" className="text-xs">
                            {blog.category.name}
                          </Badge>
                        )}
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {blog.published_at &&
                            format(new Date(blog.published_at), "MMM d")}
                        </span>
                      </div>
                      <h3 className="font-semibold text-lg mb-2 line-clamp-2 group-hover:text-gold transition-colors">
                        {blog.title}
                      </h3>
                      {blog.excerpt && (
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {blog.excerpt}
                        </p>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            </>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Blog;
