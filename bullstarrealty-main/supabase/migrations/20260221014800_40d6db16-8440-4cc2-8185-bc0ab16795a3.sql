
-- Geofence locations for attendance check-in
CREATE TABLE public.geofence_locations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  latitude NUMERIC NOT NULL,
  longitude NUMERIC NOT NULL,
  radius_meters INTEGER NOT NULL DEFAULT 50,
  is_active BOOLEAN NOT NULL DEFAULT true,
  country country_code NULL,
  created_by UUID NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.geofence_locations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage geofence locations"
  ON public.geofence_locations FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'hr'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'hr'::app_role));

CREATE POLICY "All authenticated can view geofence locations"
  ON public.geofence_locations FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Block anonymous geofence_locations"
  ON public.geofence_locations FOR SELECT
  USING (false);

-- Weekly offs table
CREATE TABLE public.weekly_offs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_by UUID NULL,
  UNIQUE(user_id, day_of_week)
);

ALTER TABLE public.weekly_offs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage weekly offs"
  ON public.weekly_offs FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role) OR has_role(auth.uid(), 'hr'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role) OR has_role(auth.uid(), 'hr'::app_role));

CREATE POLICY "Users can view own weekly offs"
  ON public.weekly_offs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Block anonymous weekly_offs"
  ON public.weekly_offs FOR SELECT
  USING (false);

-- Add geofence check-in fields to attendance
ALTER TABLE public.attendance 
  ADD COLUMN IF NOT EXISTS check_in_latitude NUMERIC NULL,
  ADD COLUMN IF NOT EXISTS check_in_longitude NUMERIC NULL,
  ADD COLUMN IF NOT EXISTS geofence_verified BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS check_in_method TEXT DEFAULT 'manual';

-- Add phone field to profiles for MCube click-to-call
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS phone TEXT NULL;
