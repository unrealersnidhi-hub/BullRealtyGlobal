-- Create team_members table
CREATE TABLE public.team_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  role TEXT NOT NULL,
  description TEXT,
  phone TEXT,
  email TEXT,
  linkedin TEXT,
  photo_url TEXT,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;

-- Public can view active team members
CREATE POLICY "Anyone can view active team members"
ON public.team_members
FOR SELECT
USING (is_active = true);

-- Admins can manage team members
CREATE POLICY "Admins can manage team members"
ON public.team_members
FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- Create trigger for updated_at
CREATE TRIGGER update_team_members_updated_at
BEFORE UPDATE ON public.team_members
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage bucket for team photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('team-photos', 'team-photos', true);

-- Storage policies for team photos
CREATE POLICY "Anyone can view team photos"
ON storage.objects FOR SELECT
USING (bucket_id = 'team-photos');

CREATE POLICY "Admins can upload team photos"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'team-photos' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update team photos"
ON storage.objects FOR UPDATE
USING (bucket_id = 'team-photos' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete team photos"
ON storage.objects FOR DELETE
USING (bucket_id = 'team-photos' AND public.has_role(auth.uid(), 'admin'));

-- Insert initial team members
INSERT INTO public.team_members (name, role, description, phone, email, display_order) VALUES
('Maneesh Srivastava', 'Founder & CEO', 'With over 15 years of experience in India real estate, Maneesh leads our vision of excellence.', '+971 545304304', 'maneesh@bullstarrealty.ae', 1),
('Sherry Goyal', 'Associate Partner', 'Sherry Goyal 10+ years of luxury property expertise, specializing in Palm Jumeirah and Downtown.', '+971 545304304', 'sherry@bullstarrealty.ae', 2),
('Vaibhav Jalan', 'Managing Director', 'Vaibhav Jalan helps investors maximize ROI with strategic insights into Dubai''s property market.', '+971 545304304', 'vaibhav@bullstarrealty.ae', 3),
('Shivendra Pratap', 'Sr.Property Consultant', 'Shivendra Pratap ensures every property under our care is maintained to the highest standards.', '+971 545304304', 'shivendra@bullstarrealty.ae', 4);