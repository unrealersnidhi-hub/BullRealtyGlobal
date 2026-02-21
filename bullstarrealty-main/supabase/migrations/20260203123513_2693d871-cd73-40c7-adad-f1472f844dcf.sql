-- Fix team_members security: Hide sensitive contact info from public access
-- Currently the "Anyone can view active team members" policy exposes email and phone to public

-- Drop existing permissive policy
DROP POLICY IF EXISTS "Anyone can view active team members" ON public.team_members;

-- Create a new restrictive policy that only allows public to see non-sensitive fields
-- by creating a view or using row-level column access isn't directly supported, 
-- so we'll restrict public SELECT to authenticated users only for the full record
-- and create a separate approach for the public website

-- For authenticated users, they can see all active team members
CREATE POLICY "Authenticated users can view active team members"
ON public.team_members
FOR SELECT
TO authenticated
USING (is_active = true);

-- For anonymous (public) access, we'll deny direct table access
-- The public team section should use a secure edge function instead
-- that returns only name, role, photo_url, description, linkedin (no email/phone)

-- Add policy that denies anonymous access entirely
CREATE POLICY "Deny anonymous access to team members"
ON public.team_members
FOR SELECT
TO anon
USING (false);