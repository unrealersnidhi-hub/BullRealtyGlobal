
-- Table: lead_assignees - Support multiple team members on a single lead
CREATE TABLE public.lead_assignees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  assigned_by uuid,
  assigned_at timestamp with time zone NOT NULL DEFAULT now(),
  role text DEFAULT 'member',
  UNIQUE(lead_id, user_id)
);

ALTER TABLE public.lead_assignees ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Block anonymous access to lead_assignees" ON public.lead_assignees FOR ALL USING (false) WITH CHECK (false);

CREATE POLICY "Authenticated users can view lead_assignees" ON public.lead_assignees FOR SELECT
USING (
  has_role(auth.uid(), 'super_admin'::app_role) OR
  has_role(auth.uid(), 'admin'::app_role) OR
  has_role(auth.uid(), 'manager'::app_role) OR
  has_role(auth.uid(), 'mis'::app_role) OR
  has_role(auth.uid(), 'telesales'::app_role) OR
  user_id = auth.uid()
);

CREATE POLICY "Admins can manage lead_assignees" ON public.lead_assignees FOR ALL
USING (
  has_role(auth.uid(), 'super_admin'::app_role) OR
  has_role(auth.uid(), 'admin'::app_role) OR
  has_role(auth.uid(), 'mis'::app_role) OR
  has_role(auth.uid(), 'telesales'::app_role) OR
  has_role(auth.uid(), 'manager'::app_role)
)
WITH CHECK (
  has_role(auth.uid(), 'super_admin'::app_role) OR
  has_role(auth.uid(), 'admin'::app_role) OR
  has_role(auth.uid(), 'mis'::app_role) OR
  has_role(auth.uid(), 'telesales'::app_role) OR
  has_role(auth.uid(), 'manager'::app_role)
);

-- Table: lead_interest_tags - Custom interest/status tags per lead
CREATE TABLE public.lead_interest_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  tag text NOT NULL,
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.lead_interest_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Block anonymous lead_interest_tags" ON public.lead_interest_tags FOR ALL USING (false) WITH CHECK (false);

CREATE POLICY "Authenticated can view lead_interest_tags" ON public.lead_interest_tags FOR SELECT
USING (
  has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role) OR
  has_role(auth.uid(), 'manager'::app_role) OR has_role(auth.uid(), 'mis'::app_role) OR
  has_role(auth.uid(), 'telesales'::app_role) OR
  EXISTS (SELECT 1 FROM leads WHERE leads.id = lead_interest_tags.lead_id AND leads.assigned_to = auth.uid())
);

CREATE POLICY "Staff can manage lead_interest_tags" ON public.lead_interest_tags FOR ALL
USING (
  has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role) OR
  has_role(auth.uid(), 'manager'::app_role) OR has_role(auth.uid(), 'mis'::app_role) OR
  has_role(auth.uid(), 'telesales'::app_role) OR
  EXISTS (SELECT 1 FROM leads WHERE leads.id = lead_interest_tags.lead_id AND leads.assigned_to = auth.uid())
)
WITH CHECK (
  has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role) OR
  has_role(auth.uid(), 'manager'::app_role) OR has_role(auth.uid(), 'mis'::app_role) OR
  has_role(auth.uid(), 'telesales'::app_role) OR
  EXISTS (SELECT 1 FROM leads WHERE leads.id = lead_interest_tags.lead_id AND leads.assigned_to = auth.uid())
);

-- Table: meetings - Meeting scheduling for follow-ups
CREATE TABLE public.meetings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  follow_up_id uuid REFERENCES public.follow_ups(id) ON DELETE SET NULL,
  title text NOT NULL,
  description text,
  scheduled_at timestamp with time zone NOT NULL,
  duration_minutes integer DEFAULT 30,
  location text,
  meeting_type text DEFAULT 'in_person',
  status text DEFAULT 'scheduled',
  created_by uuid NOT NULL,
  notify_customer boolean DEFAULT true,
  notify_admin boolean DEFAULT true,
  customer_notified_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.meetings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Block anonymous meetings" ON public.meetings FOR ALL USING (false) WITH CHECK (false);

CREATE POLICY "Staff can view meetings" ON public.meetings FOR SELECT
USING (
  has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role) OR
  has_role(auth.uid(), 'manager'::app_role) OR has_role(auth.uid(), 'mis'::app_role) OR
  has_role(auth.uid(), 'telesales'::app_role) OR
  created_by = auth.uid() OR
  EXISTS (SELECT 1 FROM leads WHERE leads.id = meetings.lead_id AND leads.assigned_to = auth.uid())
);

CREATE POLICY "Staff can manage meetings" ON public.meetings FOR ALL
USING (
  has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role) OR
  has_role(auth.uid(), 'manager'::app_role) OR has_role(auth.uid(), 'mis'::app_role) OR
  has_role(auth.uid(), 'telesales'::app_role) OR
  created_by = auth.uid() OR
  EXISTS (SELECT 1 FROM leads WHERE leads.id = meetings.lead_id AND leads.assigned_to = auth.uid())
)
WITH CHECK (
  has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role) OR
  has_role(auth.uid(), 'manager'::app_role) OR has_role(auth.uid(), 'mis'::app_role) OR
  has_role(auth.uid(), 'telesales'::app_role) OR
  created_by = auth.uid() OR
  EXISTS (SELECT 1 FROM leads WHERE leads.id = meetings.lead_id AND leads.assigned_to = auth.uid())
);

-- Add follow-up stage column
ALTER TABLE public.follow_ups ADD COLUMN IF NOT EXISTS stage text DEFAULT 'pending';
ALTER TABLE public.follow_ups ADD COLUMN IF NOT EXISTS follow_up_type text DEFAULT 'call_back';

-- Enable realtime for meetings
ALTER PUBLICATION supabase_realtime ADD TABLE public.meetings;
ALTER PUBLICATION supabase_realtime ADD TABLE public.lead_assignees;
