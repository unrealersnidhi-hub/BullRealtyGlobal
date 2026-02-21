-- Create blog categories table
CREATE TABLE public.blog_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create blogs table
CREATE TABLE public.blogs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  excerpt TEXT,
  content TEXT NOT NULL,
  featured_image TEXT,
  category_id UUID REFERENCES public.blog_categories(id) ON DELETE SET NULL,
  author_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  published_at TIMESTAMP WITH TIME ZONE,
  meta_title TEXT,
  meta_description TEXT,
  tags TEXT[] DEFAULT '{}',
  view_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.blog_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blogs ENABLE ROW LEVEL SECURITY;

-- Blog categories policies (public read, admin write)
CREATE POLICY "Anyone can view blog categories"
ON public.blog_categories FOR SELECT
USING (true);

CREATE POLICY "Admins can manage blog categories"
ON public.blog_categories FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- Blogs policies
CREATE POLICY "Anyone can view published blogs"
ON public.blogs FOR SELECT
USING (status = 'published' OR author_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage all blogs"
ON public.blogs FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Blog writers can create blogs"
ON public.blogs FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'blog_writer') OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Blog writers can update own blogs"
ON public.blogs FOR UPDATE
USING (author_id = auth.uid() AND public.has_role(auth.uid(), 'blog_writer'));

CREATE POLICY "Blog writers can delete own blogs"
ON public.blogs FOR DELETE
USING (author_id = auth.uid() AND public.has_role(auth.uid(), 'blog_writer'));

-- Create trigger for updated_at
CREATE TRIGGER update_blogs_updated_at
BEFORE UPDATE ON public.blogs
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage bucket for blog images
INSERT INTO storage.buckets (id, name, public)
VALUES ('blog-images', 'blog-images', true);

-- Storage policies for blog images
CREATE POLICY "Anyone can view blog images"
ON storage.objects FOR SELECT
USING (bucket_id = 'blog-images');

CREATE POLICY "Writers can upload blog images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'blog-images' AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'blog_writer')));

CREATE POLICY "Writers can update own blog images"
ON storage.objects FOR UPDATE
USING (bucket_id = 'blog-images' AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'blog_writer')));

CREATE POLICY "Admins can delete blog images"
ON storage.objects FOR DELETE
USING (bucket_id = 'blog-images' AND public.has_role(auth.uid(), 'admin'));

-- Insert default categories
INSERT INTO public.blog_categories (name, slug, description) VALUES
('Market Insights', 'market-insights', 'Latest trends and analysis of Dubai real estate market'),
('Investment Tips', 'investment-tips', 'Expert advice for property investors'),
('Lifestyle', 'lifestyle', 'Living in Dubai and UAE lifestyle content'),
('Property News', 'property-news', 'Breaking news in real estate'),
('Guides', 'guides', 'How-to guides for buyers and sellers');