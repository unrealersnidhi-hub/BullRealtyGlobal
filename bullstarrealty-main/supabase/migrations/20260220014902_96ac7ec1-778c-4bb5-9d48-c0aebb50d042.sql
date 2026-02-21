
-- Create OTP verification table
CREATE TABLE public.otp_verifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  otp_code TEXT NOT NULL,
  email TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '5 minutes'),
  verified BOOLEAN NOT NULL DEFAULT false,
  attempts INTEGER NOT NULL DEFAULT 0
);

-- Enable RLS
ALTER TABLE public.otp_verifications ENABLE ROW LEVEL SECURITY;

-- Only service role can manage OTPs (edge function uses service role)
CREATE POLICY "Block direct access to otp_verifications"
ON public.otp_verifications
FOR ALL
USING (false)
WITH CHECK (false);

-- Cleanup function for expired OTPs
CREATE OR REPLACE FUNCTION public.cleanup_expired_otps()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  DELETE FROM public.otp_verifications WHERE expires_at < now();
END;
$$;
