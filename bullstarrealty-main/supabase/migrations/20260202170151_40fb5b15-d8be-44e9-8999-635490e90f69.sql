-- Add super_admin role to the app_role enum (must be in separate transaction)
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'super_admin';