-- Drop and recreate the API key generation function to use extensions.gen_random_bytes
CREATE OR REPLACE FUNCTION public.generate_api_key()
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  key TEXT;
BEGIN
  key := 'bsr_' || encode(extensions.gen_random_bytes(24), 'hex');
  RETURN key;
END;
$function$;

-- Drop and recreate the webhook token generation function
CREATE OR REPLACE FUNCTION public.generate_webhook_token()
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  token TEXT;
BEGIN
  token := 'wh_' || encode(extensions.gen_random_bytes(16), 'hex');
  RETURN token;
END;
$function$;