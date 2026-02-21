-- Add explicit anonymous access denial policies for all sensitive tables
-- This provides defense-in-depth security even though RLS implicitly denies non-matching roles

-- Profiles: Block anonymous access
CREATE POLICY "Block anonymous access to profiles"
ON public.profiles
FOR SELECT
TO anon
USING (false);

-- Leads: Block anonymous SELECT (INSERT is allowed for lead capture)
CREATE POLICY "Block anonymous read access to leads"
ON public.leads
FOR SELECT
TO anon
USING (false);

-- API Keys: Block anonymous access
CREATE POLICY "Block anonymous access to api_keys"
ON public.api_keys
FOR SELECT
TO anon
USING (false);

-- Webhooks: Block anonymous access
CREATE POLICY "Block anonymous access to webhooks"
ON public.webhooks
FOR SELECT
TO anon
USING (false);

-- Subscribers: Block anonymous SELECT (INSERT allowed for subscription)
CREATE POLICY "Block anonymous read access to subscribers"
ON public.subscribers
FOR SELECT
TO anon
USING (false);

-- Integration Logs: Block anonymous access
CREATE POLICY "Block anonymous access to integration_logs"
ON public.integration_logs
FOR ALL
TO anon
USING (false)
WITH CHECK (false);

-- Documents: Block anonymous access
CREATE POLICY "Block anonymous access to documents"
ON public.documents
FOR ALL
TO anon
USING (false)
WITH CHECK (false);

-- Quotations: Block anonymous access
CREATE POLICY "Block anonymous access to quotations"
ON public.quotations
FOR ALL
TO anon
USING (false)
WITH CHECK (false);

-- Reports: Block anonymous access
CREATE POLICY "Block anonymous access to reports"
ON public.reports
FOR ALL
TO anon
USING (false)
WITH CHECK (false);

-- User Roles: Block anonymous access
CREATE POLICY "Block anonymous access to user_roles"
ON public.user_roles
FOR ALL
TO anon
USING (false)
WITH CHECK (false);

-- Follow-ups: Block anonymous access
CREATE POLICY "Block anonymous access to follow_ups"
ON public.follow_ups
FOR ALL
TO anon
USING (false)
WITH CHECK (false);

-- Lead Notes: Block anonymous access
CREATE POLICY "Block anonymous access to lead_notes"
ON public.lead_notes
FOR ALL
TO anon
USING (false)
WITH CHECK (false);

-- Lead Activities: Block anonymous access
CREATE POLICY "Block anonymous access to lead_activities"
ON public.lead_activities
FOR ALL
TO anon
USING (false)
WITH CHECK (false);

-- Notification Settings: Block anonymous access
CREATE POLICY "Block anonymous access to notification_settings"
ON public.notification_settings
FOR ALL
TO anon
USING (false)
WITH CHECK (false);

-- Blog categories and blogs already have proper public read access for published content
-- so we don't add restrictive policies there