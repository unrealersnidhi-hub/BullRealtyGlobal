-- Create profile update requests table
CREATE TABLE public.profile_update_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  field_name TEXT NOT NULL,
  old_value TEXT,
  new_value TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by UUID,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  review_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create notifications table
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'info' CHECK (type IN ('info', 'success', 'warning', 'error', 'request')),
  link TEXT,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create employees table for HR
CREATE TABLE public.employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE,
  employee_code TEXT UNIQUE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  department TEXT,
  designation TEXT,
  date_of_joining DATE,
  date_of_birth DATE,
  address TEXT,
  emergency_contact TEXT,
  salary NUMERIC,
  employment_status TEXT DEFAULT 'active' CHECK (employment_status IN ('active', 'on_leave', 'terminated', 'probation')),
  country public.country_code,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create leave types
CREATE TYPE public.leave_type AS ENUM ('annual', 'sick', 'casual', 'maternity', 'paternity', 'unpaid', 'other');

-- Create leave requests table
CREATE TABLE public.leave_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID REFERENCES public.employees(id) ON DELETE CASCADE NOT NULL,
  leave_type public.leave_type NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
  approved_by UUID,
  approved_at TIMESTAMP WITH TIME ZONE,
  approval_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create attendance table
CREATE TABLE public.attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID REFERENCES public.employees(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL,
  check_in TIMESTAMP WITH TIME ZONE,
  check_out TIMESTAMP WITH TIME ZONE,
  status TEXT DEFAULT 'present' CHECK (status IN ('present', 'absent', 'half_day', 'on_leave', 'holiday', 'weekend')),
  work_hours NUMERIC,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(employee_id, date)
);

-- Create performance reviews table
CREATE TABLE public.performance_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID REFERENCES public.employees(id) ON DELETE CASCADE NOT NULL,
  reviewer_id UUID NOT NULL,
  review_period_start DATE NOT NULL,
  review_period_end DATE NOT NULL,
  overall_rating INTEGER CHECK (overall_rating >= 1 AND overall_rating <= 5),
  goals_achieved TEXT,
  areas_of_improvement TEXT,
  strengths TEXT,
  comments TEXT,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'acknowledged')),
  acknowledged_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all new tables
ALTER TABLE public.profile_update_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leave_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.performance_reviews ENABLE ROW LEVEL SECURITY;

-- Profile update requests policies
CREATE POLICY "Users can view own requests" ON public.profile_update_requests
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own requests" ON public.profile_update_requests
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all requests" ON public.profile_update_requests
  FOR SELECT USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Admins can update requests" ON public.profile_update_requests
  FOR UPDATE USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Block anonymous profile_update_requests" ON public.profile_update_requests
  FOR SELECT USING (false);

-- Notifications policies
CREATE POLICY "Users can view own notifications" ON public.notifications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications" ON public.notifications
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Authenticated users can insert notifications" ON public.notifications
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can manage all notifications" ON public.notifications
  FOR ALL USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin'))
  WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Block anonymous notifications" ON public.notifications
  FOR SELECT USING (false);

-- Employees policies
CREATE POLICY "HR and admins can manage employees" ON public.employees
  FOR ALL USING (has_role(auth.uid(), 'hr') OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin'))
  WITH CHECK (has_role(auth.uid(), 'hr') OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Users can view own employee record" ON public.employees
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Managers can view team employees" ON public.employees
  FOR SELECT USING (has_role(auth.uid(), 'manager'));

CREATE POLICY "Block anonymous employees" ON public.employees
  FOR SELECT USING (false);

-- Leave requests policies
CREATE POLICY "Employees can create own leave requests" ON public.leave_requests
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.employees WHERE id = leave_requests.employee_id AND user_id = auth.uid())
  );

CREATE POLICY "Employees can view own leave requests" ON public.leave_requests
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.employees WHERE id = leave_requests.employee_id AND user_id = auth.uid())
    OR has_role(auth.uid(), 'hr')
    OR has_role(auth.uid(), 'admin')
    OR has_role(auth.uid(), 'super_admin')
    OR has_role(auth.uid(), 'manager')
  );

CREATE POLICY "HR and admins can manage leave requests" ON public.leave_requests
  FOR ALL USING (has_role(auth.uid(), 'hr') OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin'))
  WITH CHECK (has_role(auth.uid(), 'hr') OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Block anonymous leave_requests" ON public.leave_requests
  FOR SELECT USING (false);

-- Attendance policies
CREATE POLICY "Employees can view own attendance" ON public.attendance
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.employees WHERE id = attendance.employee_id AND user_id = auth.uid())
  );

CREATE POLICY "HR and admins can manage attendance" ON public.attendance
  FOR ALL USING (has_role(auth.uid(), 'hr') OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin'))
  WITH CHECK (has_role(auth.uid(), 'hr') OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Managers can view team attendance" ON public.attendance
  FOR SELECT USING (has_role(auth.uid(), 'manager'));

CREATE POLICY "Block anonymous attendance" ON public.attendance
  FOR SELECT USING (false);

-- Performance reviews policies
CREATE POLICY "Employees can view own reviews" ON public.performance_reviews
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.employees WHERE id = performance_reviews.employee_id AND user_id = auth.uid())
  );

CREATE POLICY "HR and admins can manage reviews" ON public.performance_reviews
  FOR ALL USING (has_role(auth.uid(), 'hr') OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin'))
  WITH CHECK (has_role(auth.uid(), 'hr') OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Managers can manage reviews" ON public.performance_reviews
  FOR ALL USING (has_role(auth.uid(), 'manager'))
  WITH CHECK (has_role(auth.uid(), 'manager'));

CREATE POLICY "Block anonymous performance_reviews" ON public.performance_reviews
  FOR SELECT USING (false);

-- Enable realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- Create function to auto-generate employee code
CREATE OR REPLACE FUNCTION public.generate_employee_code()
RETURNS TRIGGER AS $$
DECLARE
  new_code TEXT;
  year_suffix TEXT;
  seq_num INTEGER;
BEGIN
  year_suffix := to_char(now(), 'YY');
  SELECT COALESCE(MAX(CAST(SUBSTRING(employee_code FROM 5) AS INTEGER)), 0) + 1
  INTO seq_num
  FROM employees
  WHERE employee_code LIKE 'EMP' || year_suffix || '%';
  
  new_code := 'EMP' || year_suffix || LPAD(seq_num::TEXT, 4, '0');
  NEW.employee_code := new_code;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER set_employee_code
  BEFORE INSERT ON public.employees
  FOR EACH ROW
  WHEN (NEW.employee_code IS NULL OR NEW.employee_code = '')
  EXECUTE FUNCTION public.generate_employee_code();

-- Triggers for updated_at
CREATE TRIGGER update_profile_update_requests_updated_at
  BEFORE UPDATE ON public.profile_update_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_employees_updated_at
  BEFORE UPDATE ON public.employees
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_leave_requests_updated_at
  BEFORE UPDATE ON public.leave_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_performance_reviews_updated_at
  BEFORE UPDATE ON public.performance_reviews
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();