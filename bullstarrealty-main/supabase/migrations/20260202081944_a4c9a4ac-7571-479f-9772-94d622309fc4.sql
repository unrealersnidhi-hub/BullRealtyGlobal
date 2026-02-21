-- Add blog_writer role to app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'blog_writer';