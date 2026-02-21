-- Create documents table for property documents
CREATE TABLE public.documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_type TEXT,
  file_size INTEGER,
  category TEXT DEFAULT 'property',
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'archived')),
  uploaded_by UUID NOT NULL,
  assigned_to UUID,
  lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
  approval_requested_from UUID,
  approval_notes TEXT,
  approved_by UUID,
  approved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create quotations table
CREATE TABLE public.quotations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_number TEXT NOT NULL UNIQUE,
  lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
  created_by UUID NOT NULL,
  property_name TEXT NOT NULL,
  property_type TEXT,
  property_location TEXT,
  unit_details TEXT,
  base_price DECIMAL(15, 2) NOT NULL,
  additional_costs JSONB DEFAULT '[]'::jsonb,
  discounts JSONB DEFAULT '[]'::jsonb,
  total_amount DECIMAL(15, 2) NOT NULL,
  payment_plan JSONB,
  terms_and_conditions TEXT,
  validity_days INTEGER DEFAULT 30,
  valid_until DATE,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'accepted', 'rejected', 'expired')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create reports table to store generated reports
CREATE TABLE public.reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_type TEXT NOT NULL,
  report_name TEXT NOT NULL,
  report_data JSONB NOT NULL,
  date_range_start DATE,
  date_range_end DATE,
  generated_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

-- Documents policies
CREATE POLICY "Admins can manage all documents" ON public.documents
FOR ALL USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view assigned documents" ON public.documents
FOR SELECT USING (assigned_to = auth.uid() OR uploaded_by = auth.uid());

CREATE POLICY "Users can upload documents" ON public.documents
FOR INSERT WITH CHECK (auth.uid() = uploaded_by);

CREATE POLICY "Users can update own pending documents" ON public.documents
FOR UPDATE USING (uploaded_by = auth.uid() AND status = 'pending');

-- Quotations policies
CREATE POLICY "Admins can manage all quotations" ON public.quotations
FOR ALL USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view quotations they created" ON public.quotations
FOR SELECT USING (created_by = auth.uid());

CREATE POLICY "Users can create quotations" ON public.quotations
FOR INSERT WITH CHECK (auth.uid() = created_by);

-- Reports policies
CREATE POLICY "Admins can manage all reports" ON public.reports
FOR ALL USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view reports they generated" ON public.reports
FOR SELECT USING (generated_by = auth.uid());

-- Create storage bucket for documents
INSERT INTO storage.buckets (id, name, public) VALUES ('documents', 'documents', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for documents bucket
CREATE POLICY "Authenticated users can upload documents" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'documents' AND auth.role() = 'authenticated');

CREATE POLICY "Users can view their documents" ON storage.objects
FOR SELECT USING (
  bucket_id = 'documents' AND (
    auth.uid()::text = (storage.foldername(name))[1] OR
    has_role(auth.uid(), 'admin'::app_role)
  )
);

CREATE POLICY "Admins can manage all documents in storage" ON storage.objects
FOR ALL USING (bucket_id = 'documents' AND has_role(auth.uid(), 'admin'::app_role));

-- Create function to generate quote number
CREATE OR REPLACE FUNCTION public.generate_quote_number()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_number TEXT;
  year_month TEXT;
  seq_num INTEGER;
BEGIN
  year_month := to_char(now(), 'YYMM');
  SELECT COALESCE(MAX(CAST(SUBSTRING(quote_number FROM 8) AS INTEGER)), 0) + 1
  INTO seq_num
  FROM quotations
  WHERE quote_number LIKE 'BSR-' || year_month || '-%';
  
  new_number := 'BSR-' || year_month || '-' || LPAD(seq_num::TEXT, 4, '0');
  RETURN new_number;
END;
$$;

-- Create triggers for updated_at
CREATE TRIGGER update_documents_updated_at
BEFORE UPDATE ON public.documents
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_quotations_updated_at
BEFORE UPDATE ON public.quotations
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();