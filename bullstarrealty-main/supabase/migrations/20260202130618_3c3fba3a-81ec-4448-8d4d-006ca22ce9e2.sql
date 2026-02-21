-- Create notification_settings table for configuring email/WhatsApp notifications
CREATE TABLE public.notification_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  setting_key TEXT NOT NULL UNIQUE,
  setting_value JSONB NOT NULL DEFAULT '{}',
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.notification_settings ENABLE ROW LEVEL SECURITY;

-- Create RLS policy - only admins can view and manage
CREATE POLICY "Admins can manage notification settings" 
ON public.notification_settings 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_notification_settings_updated_at
BEFORE UPDATE ON public.notification_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default notification settings
INSERT INTO public.notification_settings (setting_key, setting_value, description) VALUES
('email_notifications', '{"enabled": true, "from_email": "notifications@bullstarrealty.ae", "from_name": "Bull Star Realty CRM"}', 'Email notification configuration'),
('notification_recipients', '{"admin_emails": [], "manager_emails": [], "notify_on_new_lead": true, "notify_on_assignment": true, "notify_on_status_change": true, "notify_on_note_added": false, "notify_on_followup": true}', 'Notification recipient settings'),
('whatsapp_notifications', '{"enabled": false, "api_key": "", "phone_id": "", "notify_on_new_lead": false, "notify_on_assignment": false}', 'WhatsApp notification configuration (for future use)'),
('email_capture', '{"enabled": false, "outlook_client_id": "", "outlook_tenant_id": "", "imap_enabled": false, "imap_host": "", "imap_port": 993}', 'Email capture from Outlook/IMAP (for future use)');