
-- Create rate_limits table for persistent rate limiting
CREATE TABLE IF NOT EXISTS public.rate_limits (
  identifier TEXT NOT NULL,
  endpoint TEXT NOT NULL,
  request_count INTEGER NOT NULL DEFAULT 1,
  window_start TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  PRIMARY KEY (identifier, endpoint)
);

-- Enable RLS on rate_limits table
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

-- No SELECT/UPDATE/DELETE policies for regular users - only the function can access it
-- The function uses SECURITY DEFINER so it bypasses RLS

-- Create the check_rate_limit function
CREATE OR REPLACE FUNCTION public.check_rate_limit(
  p_identifier TEXT,
  p_endpoint TEXT,
  p_max_requests INTEGER DEFAULT 15,
  p_window_seconds INTEGER DEFAULT 60
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER;
  v_window_start TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Get current rate limit record
  SELECT request_count, window_start INTO v_count, v_window_start
  FROM rate_limits
  WHERE identifier = p_identifier AND endpoint = p_endpoint;

  -- If no record or window expired, reset
  IF v_count IS NULL OR now() - v_window_start > (p_window_seconds || ' seconds')::INTERVAL THEN
    INSERT INTO rate_limits (identifier, endpoint, request_count, window_start)
    VALUES (p_identifier, p_endpoint, 1, now())
    ON CONFLICT (identifier, endpoint) DO UPDATE
    SET request_count = 1, window_start = now();
    RETURN TRUE;
  END IF;

  -- Check if limit exceeded
  IF v_count >= p_max_requests THEN
    RETURN FALSE;
  END IF;

  -- Increment counter
  UPDATE rate_limits
  SET request_count = request_count + 1
  WHERE identifier = p_identifier AND endpoint = p_endpoint;
  
  RETURN TRUE;
END;
$$;

-- Grant execute permission to anon and authenticated roles
GRANT EXECUTE ON FUNCTION public.check_rate_limit TO anon;
GRANT EXECUTE ON FUNCTION public.check_rate_limit TO authenticated;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_rate_limits_lookup ON public.rate_limits (identifier, endpoint);

-- Create cleanup function to remove old rate limit records (optional maintenance)
CREATE OR REPLACE FUNCTION public.cleanup_old_rate_limits()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM rate_limits WHERE window_start < now() - INTERVAL '1 hour';
END;
$$;
