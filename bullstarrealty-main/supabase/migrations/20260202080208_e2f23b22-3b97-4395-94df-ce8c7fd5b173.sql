-- Create integration sources enum
CREATE TYPE public.integration_source AS ENUM (
  '99acres',
  'magicbricks',
  'housing',
  'proptiger',
  'bayut',
  'property_finder',
  'dubizzle',
  'facebook',
  'instagram',
  'google_ads',
  'linkedin',
  'custom'
);

-- Create API keys table for external integrations
CREATE TABLE public.api_keys (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  api_key TEXT NOT NULL UNIQUE,
  source integration_source NOT NULL DEFAULT 'custom',
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_used_at TIMESTAMP WITH TIME ZONE,
  request_count INTEGER NOT NULL DEFAULT 0,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE
);

-- Create webhooks table
CREATE TABLE public.webhooks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  webhook_token TEXT NOT NULL UNIQUE,
  source integration_source NOT NULL DEFAULT 'custom',
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_triggered_at TIMESTAMP WITH TIME ZONE,
  trigger_count INTEGER NOT NULL DEFAULT 0,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create integration logs table for tracking all incoming requests
CREATE TABLE public.integration_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  integration_type TEXT NOT NULL CHECK (integration_type IN ('api_key', 'webhook')),
  integration_id UUID NOT NULL,
  source integration_source NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('success', 'failed', 'pending')),
  request_payload JSONB,
  response_payload JSONB,
  error_message TEXT,
  lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
  ip_address TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.integration_logs ENABLE ROW LEVEL SECURITY;

-- API Keys policies - Admin only
CREATE POLICY "Admins can manage API keys"
ON public.api_keys
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Webhooks policies - Admin only
CREATE POLICY "Admins can manage webhooks"
ON public.webhooks
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Integration logs policies - Admin only view
CREATE POLICY "Admins can view integration logs"
ON public.integration_logs
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Service role can insert logs (for edge functions)
CREATE POLICY "Service can insert integration logs"
ON public.integration_logs
FOR INSERT
WITH CHECK (true);

-- Function to generate secure API key
CREATE OR REPLACE FUNCTION public.generate_api_key()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  key TEXT;
BEGIN
  key := 'bsr_' || encode(gen_random_bytes(24), 'hex');
  RETURN key;
END;
$$;

-- Function to generate webhook token
CREATE OR REPLACE FUNCTION public.generate_webhook_token()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  token TEXT;
BEGIN
  token := 'wh_' || encode(gen_random_bytes(16), 'hex');
  RETURN token;
END;
$$;

-- Create indexes for better query performance
CREATE INDEX idx_api_keys_api_key ON public.api_keys(api_key);
CREATE INDEX idx_api_keys_is_active ON public.api_keys(is_active);
CREATE INDEX idx_webhooks_webhook_token ON public.webhooks(webhook_token);
CREATE INDEX idx_webhooks_is_active ON public.webhooks(is_active);
CREATE INDEX idx_integration_logs_created_at ON public.integration_logs(created_at DESC);
CREATE INDEX idx_integration_logs_integration_id ON public.integration_logs(integration_id);