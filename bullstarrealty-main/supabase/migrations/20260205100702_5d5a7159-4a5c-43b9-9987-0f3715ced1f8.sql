-- Create user_locations table for live location tracking
CREATE TABLE public.user_locations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  latitude NUMERIC(10, 8) NOT NULL,
  longitude NUMERIC(11, 8) NOT NULL,
  accuracy NUMERIC,
  recorded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for faster queries
CREATE INDEX idx_user_locations_user_id ON public.user_locations(user_id);
CREATE INDEX idx_user_locations_recorded_at ON public.user_locations(recorded_at DESC);

-- Enable RLS
ALTER TABLE public.user_locations ENABLE ROW LEVEL SECURITY;

-- Block anonymous access
CREATE POLICY "Block anonymous access to user_locations"
ON public.user_locations FOR SELECT
TO anon
USING (false);

-- Users can insert their own location
CREATE POLICY "Users can insert own location"
ON public.user_locations FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Users can view their own location history
CREATE POLICY "Users can view own locations"
ON public.user_locations FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Admins and managers can view all locations
CREATE POLICY "Admins can view all locations"
ON public.user_locations FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'super_admin'::app_role) OR 
  has_role(auth.uid(), 'manager'::app_role)
);

-- Enable realtime for location updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_locations;