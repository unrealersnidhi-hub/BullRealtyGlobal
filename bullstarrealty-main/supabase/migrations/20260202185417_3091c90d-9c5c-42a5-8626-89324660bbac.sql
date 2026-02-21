-- Add policy for managers to view all documents for approval
DROP POLICY IF EXISTS "Managers can view all documents" ON public.documents;
CREATE POLICY "Managers can view all documents"
ON public.documents
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'manager'::app_role) OR 
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'super_admin'::app_role)
);

-- Add policy for managers to update documents (approve/reject)
DROP POLICY IF EXISTS "Managers can update document status" ON public.documents;
CREATE POLICY "Managers can update document status"
ON public.documents
FOR UPDATE
TO authenticated
USING (
  has_role(auth.uid(), 'manager'::app_role) OR 
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'super_admin'::app_role)
);