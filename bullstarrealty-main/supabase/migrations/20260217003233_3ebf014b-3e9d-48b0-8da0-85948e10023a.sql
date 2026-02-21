-- Fix notification_settings RLS to include super_admin
DROP POLICY IF EXISTS "Admins can manage notification settings" ON notification_settings;
CREATE POLICY "Admins can manage notification settings" ON notification_settings
FOR ALL USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

-- Create email notification rules table
CREATE TABLE IF NOT EXISTS public.email_notification_rules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  event_type TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  send_to_assignee BOOLEAN NOT NULL DEFAULT true,
  send_to_admin BOOLEAN NOT NULL DEFAULT true,
  cc_emails TEXT[] NOT NULL DEFAULT '{}',
  email_subject_template TEXT,
  priority TEXT NOT NULL DEFAULT 'normal',
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.email_notification_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Block anonymous email_notification_rules" ON email_notification_rules
FOR ALL TO anon USING (false) WITH CHECK (false);

CREATE POLICY "Admins can manage email_notification_rules" ON email_notification_rules
FOR ALL USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Staff can view email_notification_rules" ON email_notification_rules
FOR SELECT USING (
  has_role(auth.uid(), 'manager'::app_role) OR 
  has_role(auth.uid(), 'mis'::app_role) OR 
  has_role(auth.uid(), 'telesales'::app_role)
);

-- Create automated report schedule table
CREATE TABLE IF NOT EXISTS public.automated_report_schedules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  report_type TEXT NOT NULL DEFAULT 'mis_summary',
  frequency TEXT NOT NULL DEFAULT 'daily',
  send_time TEXT NOT NULL DEFAULT '19:00',
  is_active BOOLEAN NOT NULL DEFAULT true,
  recipient_emails TEXT[] NOT NULL DEFAULT '{}',
  cc_emails TEXT[] NOT NULL DEFAULT '{}',
  include_call_stats BOOLEAN NOT NULL DEFAULT true,
  include_lead_stats BOOLEAN NOT NULL DEFAULT true,
  include_performance BOOLEAN NOT NULL DEFAULT true,
  include_conversion BOOLEAN NOT NULL DEFAULT true,
  created_by UUID NOT NULL,
  last_sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.automated_report_schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Block anonymous automated_report_schedules" ON automated_report_schedules
FOR ALL TO anon USING (false) WITH CHECK (false);

CREATE POLICY "Admins can manage automated_report_schedules" ON automated_report_schedules
FOR ALL USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "MIS can view automated_report_schedules" ON automated_report_schedules
FOR SELECT USING (has_role(auth.uid(), 'mis'::app_role) OR has_role(auth.uid(), 'manager'::app_role));