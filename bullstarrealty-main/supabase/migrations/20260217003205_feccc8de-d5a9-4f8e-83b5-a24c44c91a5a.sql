CREATE OR REPLACE FUNCTION public.generate_quote_number()
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  new_number TEXT;
  year_month TEXT;
  seq_num INTEGER;
BEGIN
  year_month := to_char(now(), 'YYMM');
  SELECT COALESCE(MAX(CAST(SUBSTRING(quote_number FROM 10) AS INTEGER)), 0) + 1
  INTO seq_num
  FROM quotations
  WHERE quote_number LIKE 'BSR-' || year_month || '-%';
  
  new_number := 'BSR-' || year_month || '-' || LPAD(seq_num::TEXT, 4, '0');
  RETURN new_number;
END;
$function$;