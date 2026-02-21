-- Add foreign key relationship from blogs.author_id to profiles.user_id
ALTER TABLE public.blogs
ADD CONSTRAINT blogs_author_id_fkey 
FOREIGN KEY (author_id) REFERENCES public.profiles(user_id) ON DELETE CASCADE;