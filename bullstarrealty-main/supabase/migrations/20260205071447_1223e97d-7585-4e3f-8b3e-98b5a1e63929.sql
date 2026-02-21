-- Create call outcome enum
CREATE TYPE public.call_outcome AS ENUM (
  'answered',
  'not_answered',
  'busy',
  'voicemail',
  'wrong_number',
  'callback_scheduled',
  'not_reachable',
  'call_dropped'
);

-- Create call_logs table for tracking all calls made by team members
CREATE TABLE public.call_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID REFERENCES public.leads(id) ON DELETE CASCADE NOT NULL,
  user_id UUID NOT NULL,
  outcome public.call_outcome NOT NULL,
  duration_seconds INTEGER DEFAULT 0,
  notes TEXT,
  callback_scheduled_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for faster queries
CREATE INDEX idx_call_logs_user_id ON public.call_logs(user_id);
CREATE INDEX idx_call_logs_lead_id ON public.call_logs(lead_id);
CREATE INDEX idx_call_logs_created_at ON public.call_logs(created_at);
CREATE INDEX idx_call_logs_user_date ON public.call_logs(user_id, created_at);

-- Enable RLS
ALTER TABLE public.call_logs ENABLE ROW LEVEL SECURITY;

-- Block anonymous access
CREATE POLICY "Block anonymous access to call_logs"
ON public.call_logs FOR ALL
USING (false)
WITH CHECK (false);

-- Users can create call logs for leads assigned to them
CREATE POLICY "Users can insert call logs for assigned leads"
ON public.call_logs FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.leads 
    WHERE leads.id = call_logs.lead_id 
    AND leads.assigned_to = auth.uid()
  )
  AND user_id = auth.uid()
);

-- Users can view their own call logs
CREATE POLICY "Users can view own call logs"
ON public.call_logs FOR SELECT
USING (user_id = auth.uid());

-- Managers can view all call logs
CREATE POLICY "Managers can view all call logs"
ON public.call_logs FOR SELECT
USING (
  has_role(auth.uid(), 'manager'::app_role) OR
  has_role(auth.uid(), 'admin'::app_role) OR
  has_role(auth.uid(), 'super_admin'::app_role)
);

-- Admins can manage all call logs
CREATE POLICY "Admins can manage all call logs"
ON public.call_logs FOR ALL
USING (
  has_role(auth.uid(), 'admin'::app_role) OR
  has_role(auth.uid(), 'super_admin'::app_role)
)
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) OR
  has_role(auth.uid(), 'super_admin'::app_role)
);

-- Create trigger to log call activity
CREATE OR REPLACE FUNCTION public.log_call_made()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.lead_activities (
    lead_id, 
    user_id, 
    activity_type, 
    title, 
    description,
    metadata
  )
  VALUES (
    NEW.lead_id,
    NEW.user_id,
    'call_made',
    'Call Made',
    'Call outcome: ' || NEW.outcome::TEXT || CASE WHEN NEW.notes IS NOT NULL THEN ' - ' || LEFT(NEW.notes, 100) ELSE '' END,
    jsonb_build_object(
      'outcome', NEW.outcome::TEXT,
      'duration_seconds', NEW.duration_seconds,
      'callback_scheduled_at', NEW.callback_scheduled_at
    )
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_call_log_created
AFTER INSERT ON public.call_logs
FOR EACH ROW
EXECUTE FUNCTION public.log_call_made();

-- Add MIS role to app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'mis';