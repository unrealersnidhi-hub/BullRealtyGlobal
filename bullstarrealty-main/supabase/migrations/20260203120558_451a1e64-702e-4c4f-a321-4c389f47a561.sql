-- Drop the overly permissive policies
DROP POLICY IF EXISTS "Service can read rate limits" ON public.rate_limits;
DROP POLICY IF EXISTS "Service can insert rate limits" ON public.rate_limits;
DROP POLICY IF EXISTS "Service can update rate limits" ON public.rate_limits;
DROP POLICY IF EXISTS "Service can delete rate limits" ON public.rate_limits;

-- The rate_limits table is managed exclusively by the check_rate_limit() and cleanup_old_rate_limits() 
-- database functions which run with SECURITY DEFINER and bypass RLS entirely.
-- No user should ever directly access this table - all access goes through the functions.
-- We only need a minimal policy to prevent the "no policies" warning while keeping the table secure.

-- Create a restrictive policy that denies all direct access
-- (Service role and SECURITY DEFINER functions bypass RLS)
CREATE POLICY "Deny direct user access to rate_limits"
ON public.rate_limits
FOR ALL
TO authenticated
USING (false)
WITH CHECK (false);