-- Create user_sessions table to track active sessions
CREATE TABLE public.user_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_token text NOT NULL UNIQUE,
  ip_address text,
  user_agent text,
  device_info text,
  country text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  last_activity_at timestamp with time zone NOT NULL DEFAULT now(),
  expires_at timestamp with time zone NOT NULL DEFAULT (now() + interval '24 hours'),
  logged_out_at timestamp with time zone,
  logged_out_by uuid,
  logout_reason text
);

-- Create index for faster lookups
CREATE INDEX idx_user_sessions_user_id ON public.user_sessions(user_id);
CREATE INDEX idx_user_sessions_active ON public.user_sessions(is_active) WHERE is_active = true;
CREATE INDEX idx_user_sessions_token ON public.user_sessions(session_token);

-- Enable RLS
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;

-- Block anonymous access
CREATE POLICY "Block anonymous access to user_sessions"
ON public.user_sessions
FOR SELECT
TO anon
USING (false);

-- Users can view their own sessions
CREATE POLICY "Users can view own sessions"
ON public.user_sessions
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Users can insert their own sessions
CREATE POLICY "Users can insert own sessions"
ON public.user_sessions
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Users can update their own sessions
CREATE POLICY "Users can update own sessions"
ON public.user_sessions
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

-- Admins can view all sessions
CREATE POLICY "Admins can view all sessions"
ON public.user_sessions
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'super_admin'::app_role)
);

-- Admins can update all sessions (for force logout)
CREATE POLICY "Admins can update all sessions"
ON public.user_sessions
FOR UPDATE
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'super_admin'::app_role)
);

-- Admins can delete sessions
CREATE POLICY "Admins can delete sessions"
ON public.user_sessions
FOR DELETE
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'super_admin'::app_role)
);

-- Function to invalidate all existing sessions for a user (SSO enforcement)
CREATE OR REPLACE FUNCTION public.invalidate_user_sessions(p_user_id uuid, p_exclude_token text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.user_sessions
  SET 
    is_active = false,
    logged_out_at = now(),
    logout_reason = 'new_session_login'
  WHERE user_id = p_user_id 
    AND is_active = true
    AND (p_exclude_token IS NULL OR session_token != p_exclude_token);
END;
$$;

-- Function to check if user has active session
CREATE OR REPLACE FUNCTION public.check_session_valid(p_session_token text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_valid boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM public.user_sessions
    WHERE session_token = p_session_token
      AND is_active = true
      AND expires_at > now()
  ) INTO v_is_valid;
  
  -- Update last activity if valid
  IF v_is_valid THEN
    UPDATE public.user_sessions
    SET last_activity_at = now()
    WHERE session_token = p_session_token;
  END IF;
  
  RETURN v_is_valid;
END;
$$;

-- Function for admin to force logout a user
CREATE OR REPLACE FUNCTION public.admin_force_logout(p_user_id uuid, p_admin_id uuid, p_reason text DEFAULT 'admin_force_logout')
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.user_sessions
  SET 
    is_active = false,
    logged_out_at = now(),
    logged_out_by = p_admin_id,
    logout_reason = p_reason
  WHERE user_id = p_user_id AND is_active = true;
END;
$$;