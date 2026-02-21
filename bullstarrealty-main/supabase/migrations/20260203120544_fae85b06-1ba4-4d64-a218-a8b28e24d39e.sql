-- Add RLS policies for rate_limits table
-- This table is used by backend functions for rate limiting, not directly by users

-- Allow service role and authenticated users to read rate limits (for checking)
CREATE POLICY "Service can read rate limits"
ON public.rate_limits
FOR SELECT
TO authenticated
USING (true);

-- Allow service role to insert/update rate limits (via database functions)
CREATE POLICY "Service can insert rate limits"
ON public.rate_limits
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Service can update rate limits"
ON public.rate_limits
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- Allow cleanup of old rate limits
CREATE POLICY "Service can delete rate limits"
ON public.rate_limits
FOR DELETE
TO authenticated
USING (true);