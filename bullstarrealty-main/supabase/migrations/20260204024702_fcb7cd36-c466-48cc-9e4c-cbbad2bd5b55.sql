-- Create table for analytics integrations
CREATE TABLE public.analytics_integrations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  provider TEXT NOT NULL,
  tracking_id TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID NOT NULL
);

-- Enable RLS
ALTER TABLE public.analytics_integrations ENABLE ROW LEVEL SECURITY;

-- Admins can manage analytics integrations
CREATE POLICY "Admins can manage analytics integrations"
ON public.analytics_integrations
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Block anonymous access
CREATE POLICY "Block anonymous access to analytics_integrations"
ON public.analytics_integrations
FOR SELECT
USING (false);

-- Allow public read for active integrations (needed for script injection)
CREATE POLICY "Anyone can read active analytics integrations"
ON public.analytics_integrations
FOR SELECT
USING (is_active = true);

-- Add trigger for updated_at
CREATE TRIGGER update_analytics_integrations_updated_at
BEFORE UPDATE ON public.analytics_integrations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();