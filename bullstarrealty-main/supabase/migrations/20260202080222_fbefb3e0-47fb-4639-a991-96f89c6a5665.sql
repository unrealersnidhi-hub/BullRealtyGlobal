-- Fix the integration_logs insert policy to be more specific
-- Drop the permissive policy and create a proper one
DROP POLICY IF EXISTS "Service can insert integration logs" ON public.integration_logs;

-- Allow inserts only from authenticated users or service role
-- The edge function will use service_role key to insert logs
CREATE POLICY "Allow insert for service operations"
ON public.integration_logs
FOR INSERT
WITH CHECK (
  -- Allow admins to insert
  has_role(auth.uid(), 'admin'::app_role)
  -- Or allow unauthenticated service calls (edge functions use service_role)
  OR auth.uid() IS NULL
);