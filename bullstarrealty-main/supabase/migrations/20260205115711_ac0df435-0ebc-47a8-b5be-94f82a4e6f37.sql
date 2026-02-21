-- Add currency column to quotations table
ALTER TABLE public.quotations 
ADD COLUMN currency text NOT NULL DEFAULT 'AED';

-- Add a check constraint to ensure valid currencies
ALTER TABLE public.quotations 
ADD CONSTRAINT quotations_currency_check 
CHECK (currency IN ('AED', 'INR'));

-- Update comment for clarity
COMMENT ON COLUMN public.quotations.currency IS 'Currency for the quotation: AED for Dubai, INR for India';