-- Allow inserting user roles during signup (only for own user_id)
CREATE POLICY "Users can insert own admin role on signup"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);