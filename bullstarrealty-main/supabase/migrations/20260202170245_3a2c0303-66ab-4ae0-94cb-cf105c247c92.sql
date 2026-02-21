-- Create country enum
CREATE TYPE public.country_code AS ENUM ('dubai', 'india');

-- Add country to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS country country_code DEFAULT NULL;

-- Add country to leads table (auto-set when assigned)
ALTER TABLE public.leads 
ADD COLUMN IF NOT EXISTS country country_code DEFAULT NULL;