-- Add assigned_at column to leads table for tracking assignment timestamp
ALTER TABLE public.leads ADD COLUMN assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Create lead_activities table for comprehensive activity tracking
CREATE TABLE public.lead_activities (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  user_id UUID DEFAULT NULL,
  activity_type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT DEFAULT NULL,
  old_value TEXT DEFAULT NULL,
  new_value TEXT DEFAULT NULL,
  metadata JSONB DEFAULT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for faster lookups
CREATE INDEX idx_lead_activities_lead_id ON public.lead_activities(lead_id);
CREATE INDEX idx_lead_activities_created_at ON public.lead_activities(created_at DESC);
CREATE INDEX idx_lead_activities_type ON public.lead_activities(activity_type);

-- Enable RLS on lead_activities
ALTER TABLE public.lead_activities ENABLE ROW LEVEL SECURITY;

-- RLS Policies for lead_activities
-- Admins can manage all activities
CREATE POLICY "Admins can manage all activities"
ON public.lead_activities
FOR ALL
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Users can view activities for leads assigned to them
CREATE POLICY "Users can view activities for assigned leads"
ON public.lead_activities
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.leads
    WHERE leads.id = lead_activities.lead_id
    AND leads.assigned_to = auth.uid()
  )
);

-- Users can insert activities for leads assigned to them
CREATE POLICY "Users can insert activities for assigned leads"
ON public.lead_activities
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.leads
    WHERE leads.id = lead_activities.lead_id
    AND leads.assigned_to = auth.uid()
  )
);

-- Create function to automatically log lead creation
CREATE OR REPLACE FUNCTION public.log_lead_created()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.lead_activities (lead_id, activity_type, title, description, new_value)
  VALUES (
    NEW.id,
    'created',
    'Lead Created',
    'New lead captured from ' || COALESCE(NEW.source, 'website'),
    NEW.full_name
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for lead creation
CREATE TRIGGER trigger_lead_created
AFTER INSERT ON public.leads
FOR EACH ROW
EXECUTE FUNCTION public.log_lead_created();

-- Create function to automatically log lead status changes
CREATE OR REPLACE FUNCTION public.log_lead_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.lead_activities (lead_id, user_id, activity_type, title, old_value, new_value)
    VALUES (
      NEW.id,
      auth.uid(),
      'status_changed',
      'Status Updated',
      OLD.status::TEXT,
      NEW.status::TEXT
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for status changes
CREATE TRIGGER trigger_lead_status_change
AFTER UPDATE ON public.leads
FOR EACH ROW
WHEN (OLD.status IS DISTINCT FROM NEW.status)
EXECUTE FUNCTION public.log_lead_status_change();

-- Create function to automatically log lead assignment changes and set assigned_at
CREATE OR REPLACE FUNCTION public.log_lead_assignment_change()
RETURNS TRIGGER AS $$
DECLARE
  old_assignee_name TEXT;
  new_assignee_name TEXT;
BEGIN
  IF OLD.assigned_to IS DISTINCT FROM NEW.assigned_to THEN
    -- Get old assignee name
    IF OLD.assigned_to IS NOT NULL THEN
      SELECT COALESCE(full_name, email) INTO old_assignee_name
      FROM public.profiles WHERE user_id = OLD.assigned_to;
    END IF;
    
    -- Get new assignee name
    IF NEW.assigned_to IS NOT NULL THEN
      SELECT COALESCE(full_name, email) INTO new_assignee_name
      FROM public.profiles WHERE user_id = NEW.assigned_to;
      
      -- Set assigned_at timestamp when first assigned or reassigned
      NEW.assigned_at := now();
    ELSE
      -- Clear assigned_at when unassigned
      NEW.assigned_at := NULL;
    END IF;
    
    INSERT INTO public.lead_activities (lead_id, user_id, activity_type, title, old_value, new_value)
    VALUES (
      NEW.id,
      auth.uid(),
      'assigned',
      CASE 
        WHEN OLD.assigned_to IS NULL THEN 'Lead Assigned'
        WHEN NEW.assigned_to IS NULL THEN 'Lead Unassigned'
        ELSE 'Lead Reassigned'
      END,
      old_assignee_name,
      new_assignee_name
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for assignment changes (BEFORE to allow modifying assigned_at)
CREATE TRIGGER trigger_lead_assignment_change
BEFORE UPDATE ON public.leads
FOR EACH ROW
WHEN (OLD.assigned_to IS DISTINCT FROM NEW.assigned_to)
EXECUTE FUNCTION public.log_lead_assignment_change();

-- Create function to log note additions
CREATE OR REPLACE FUNCTION public.log_note_added()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.lead_activities (lead_id, user_id, activity_type, title, description)
  VALUES (
    NEW.lead_id,
    NEW.user_id,
    'note_added',
    'Note Added',
    LEFT(NEW.content, 100) || CASE WHEN LENGTH(NEW.content) > 100 THEN '...' ELSE '' END
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for note additions
CREATE TRIGGER trigger_note_added
AFTER INSERT ON public.lead_notes
FOR EACH ROW
EXECUTE FUNCTION public.log_note_added();

-- Create function to log follow-up creation
CREATE OR REPLACE FUNCTION public.log_followup_created()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.lead_activities (lead_id, user_id, activity_type, title, description, metadata)
  VALUES (
    NEW.lead_id,
    NEW.user_id,
    'followup_scheduled',
    'Follow-up Scheduled',
    NEW.title,
    jsonb_build_object('scheduled_at', NEW.scheduled_at)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for follow-up creation
CREATE TRIGGER trigger_followup_created
AFTER INSERT ON public.follow_ups
FOR EACH ROW
EXECUTE FUNCTION public.log_followup_created();

-- Create function to log follow-up completion
CREATE OR REPLACE FUNCTION public.log_followup_completed()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.completed = FALSE AND NEW.completed = TRUE THEN
    INSERT INTO public.lead_activities (lead_id, user_id, activity_type, title, description)
    VALUES (
      NEW.lead_id,
      auth.uid(),
      'followup_completed',
      'Follow-up Completed',
      NEW.title
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for follow-up completion
CREATE TRIGGER trigger_followup_completed
AFTER UPDATE ON public.follow_ups
FOR EACH ROW
WHEN (OLD.completed = FALSE AND NEW.completed = TRUE)
EXECUTE FUNCTION public.log_followup_completed();