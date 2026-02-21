-- Create lead status enum
CREATE TYPE public.lead_status AS ENUM ('new', 'warm', 'cold', 'hot', 'not_interested', 'converted');

-- Add status column to leads table
ALTER TABLE public.leads ADD COLUMN status public.lead_status NOT NULL DEFAULT 'new';

-- Create follow_ups table for calendar/follow-up tracking
CREATE TABLE public.follow_ups (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  completed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create lead_notes table for remarks/notes
CREATE TABLE public.lead_notes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on new tables
ALTER TABLE public.follow_ups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_notes ENABLE ROW LEVEL SECURITY;

-- RLS policies for follow_ups
CREATE POLICY "Admins can manage all follow_ups"
ON public.follow_ups
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can manage follow_ups for assigned leads"
ON public.follow_ups
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.leads 
    WHERE leads.id = follow_ups.lead_id 
    AND leads.assigned_to = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.leads 
    WHERE leads.id = follow_ups.lead_id 
    AND leads.assigned_to = auth.uid()
  )
);

-- RLS policies for lead_notes
CREATE POLICY "Admins can manage all lead_notes"
ON public.lead_notes
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can manage notes for assigned leads"
ON public.lead_notes
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.leads 
    WHERE leads.id = lead_notes.lead_id 
    AND leads.assigned_to = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.leads 
    WHERE leads.id = lead_notes.lead_id 
    AND leads.assigned_to = auth.uid()
  )
);

-- Triggers for updated_at
CREATE TRIGGER update_follow_ups_updated_at
BEFORE UPDATE ON public.follow_ups
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_lead_notes_updated_at
BEFORE UPDATE ON public.lead_notes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();