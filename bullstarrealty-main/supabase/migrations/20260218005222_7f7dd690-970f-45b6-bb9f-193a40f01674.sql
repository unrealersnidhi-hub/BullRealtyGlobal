
-- Create table to store MCube call records (inbound & outbound)
CREATE TABLE public.mcube_call_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  call_id TEXT NOT NULL UNIQUE,
  direction TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  agent_phone TEXT,
  agent_name TEXT,
  customer_phone TEXT,
  did_number TEXT,
  dial_status TEXT,
  recording_url TEXT,
  start_time TIMESTAMP WITH TIME ZONE,
  end_time TIMESTAMP WITH TIME ZONE,
  answered_time TEXT,
  disconnected_by TEXT,
  group_name TEXT,
  duration_seconds INTEGER DEFAULT 0,
  matched_lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
  matched_user_id UUID,
  ref_id TEXT,
  raw_payload JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.mcube_call_records ENABLE ROW LEVEL SECURITY;

-- Admins/managers can view all records
CREATE POLICY "Admins and managers can view all mcube records"
ON public.mcube_call_records FOR SELECT
USING (
  has_role(auth.uid(), 'super_admin'::app_role) OR
  has_role(auth.uid(), 'admin'::app_role) OR
  has_role(auth.uid(), 'manager'::app_role) OR
  has_role(auth.uid(), 'mis'::app_role)
);

-- Users can view their own matched records
CREATE POLICY "Users can view own mcube records"
ON public.mcube_call_records FOR SELECT
USING (matched_user_id = auth.uid());

-- Block anonymous
CREATE POLICY "Block anonymous mcube_call_records"
ON public.mcube_call_records FOR SELECT
USING (false);

-- Allow service role insert (via edge function)
CREATE POLICY "Service role can insert mcube records"
ON public.mcube_call_records FOR INSERT
WITH CHECK (true);

-- Index for performance
CREATE INDEX idx_mcube_call_records_agent_phone ON public.mcube_call_records(agent_phone);
CREATE INDEX idx_mcube_call_records_customer_phone ON public.mcube_call_records(customer_phone);
CREATE INDEX idx_mcube_call_records_start_time ON public.mcube_call_records(start_time);
CREATE INDEX idx_mcube_call_records_matched_user_id ON public.mcube_call_records(matched_user_id);
