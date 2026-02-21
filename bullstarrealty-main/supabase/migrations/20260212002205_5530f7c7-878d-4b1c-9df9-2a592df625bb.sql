
-- Allow MIS users to update leads (same branch)
CREATE POLICY "MIS can update leads in their country"
ON public.leads
FOR UPDATE
USING (
  has_role(auth.uid(), 'mis'::app_role)
)
WITH CHECK (
  has_role(auth.uid(), 'mis'::app_role)
);

-- Allow MIS users to delete leads
CREATE POLICY "MIS can delete leads in their country"
ON public.leads
FOR DELETE
USING (
  has_role(auth.uid(), 'mis'::app_role)
);
