-- 1. Add database constraints for leads table
ALTER TABLE public.leads
ADD CONSTRAINT leads_full_name_length 
  CHECK (length(full_name) >= 2 AND length(full_name) <= 100),
ADD CONSTRAINT leads_email_length 
  CHECK (length(email) >= 5 AND length(email) <= 255),
ADD CONSTRAINT leads_email_format
  CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
ADD CONSTRAINT leads_phone_length 
  CHECK (phone IS NULL OR length(phone) <= 30),
ADD CONSTRAINT leads_interest_length 
  CHECK (interest IS NULL OR length(interest) <= 100),
ADD CONSTRAINT leads_message_length 
  CHECK (message IS NULL OR length(message) <= 1000),
ADD CONSTRAINT leads_source_length
  CHECK (source IS NULL OR length(source) <= 50);

-- 2. Add database constraints for subscribers table
ALTER TABLE public.subscribers
ADD CONSTRAINT subscribers_email_length 
  CHECK (length(email) >= 5 AND length(email) <= 255),
ADD CONSTRAINT subscribers_email_format
  CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');

-- 3. Add INSERT policy for profiles table (defense in depth)
CREATE POLICY "Users can insert own profile"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- 4. Make handle_new_user trigger idempotent to prevent conflicts
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, full_name)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name')
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 5. Add unique constraint on profiles.user_id if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'profiles_user_id_key'
  ) THEN
    ALTER TABLE public.profiles ADD CONSTRAINT profiles_user_id_key UNIQUE (user_id);
  END IF;
END $$;