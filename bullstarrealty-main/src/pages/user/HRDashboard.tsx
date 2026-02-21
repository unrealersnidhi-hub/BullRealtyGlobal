import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Loader2, Users, Calendar, ClipboardCheck, Star, UserCog } from "lucide-react";
import { UnifiedDashboardLayout } from "@/components/admin/UnifiedDashboardLayout";
import { DashboardStatsCard } from "@/components/admin/DashboardStatsCard";
import { EmployeeDirectory } from "@/components/hr/EmployeeDirectory";
import { LeaveManagement } from "@/components/hr/LeaveManagement";
import { AttendanceManagement } from "@/components/hr/AttendanceManagement";
import { PerformanceReviews } from "@/components/hr/PerformanceReviews";
import { ProfileSettings } from "@/components/profile/ProfileSettings";
import { cn } from "@/lib/utils";
import { useSessionManagement } from "@/hooks/useSessionManagement";
import { LeadImportButton } from "@/components/leads/LeadImportButton";
import { GeofencedAttendancePanel } from "@/components/attendance/GeofencedAttendancePanel";
import { EnterpriseTabNav } from "@/components/dashboard/EnterpriseTabNav";
type CountryCode = 'dubai' | 'india';

const HRDashboard = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<{ email?: string; id?: string; country?: CountryCode | null } | null>(null);
  const [userRoles, setUserRoles] = useState<string[]>([]);
  const [stats, setStats] = useState({
    totalEmployees: 0,
    activeEmployees: 0,
    pendingLeaves: 0,
    presentToday: 0,
  });
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const activeTab = searchParams.get("tab") || "employees";
  const { startSessionMonitoring, stopSessionMonitoring } = useSessionManagement();

  useEffect(() => {
    checkAuth();
    startSessionMonitoring();
    
    return () => {
      stopSessionMonitoring();
    };
  }, [startSessionMonitoring, stopSessionMonitoring]);

  const checkAuth = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        navigate("/admin");
        return;
      }

      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", session.user.id);

      const userRoleList = roles?.map((r) => r.role) || [];
      setUserRoles(userRoleList);

      if (!userRoleList.includes("hr") && !userRoleList.includes("admin") && !userRoleList.includes("super_admin")) {
        toast.error("Access denied. HR role required.");
        navigate("/admin");
        return;
      }

      // Get profile info with country
      const { data: profile } = await supabase
        .from("profiles")
        .select("country")
        .eq("user_id", session.user.id)
        .maybeSingle();

      setUser({ 
        email: session.user.email, 
        id: session.user.id,
        country: profile?.country || null,
      });
      await fetchStats();
    } catch (error) {
      console.error("Auth error:", error);
      navigate("/admin");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      // Fetch employee stats
      const { data: employees } = await supabase
        .from("employees")
        .select("id, employment_status");

      const totalEmployees = employees?.length || 0;
      const activeEmployees = employees?.filter((e) => e.employment_status === "active").length || 0;

      // Fetch pending leave requests
      const { data: leaves } = await supabase
        .from("leave_requests")
        .select("id")
        .eq("status", "pending");

      const pendingLeaves = leaves?.length || 0;

      // Fetch today's attendance
      const today = new Date().toISOString().split("T")[0];
      const { data: attendance } = await supabase
        .from("attendance")
        .select("id")
        .eq("date", today)
        .eq("status", "present");

      const presentToday = attendance?.length || 0;

      setStats({
        totalEmployees,
        activeEmployees,
        pendingLeaves,
        presentToday,
      });
    } catch (error) {
      console.error("Error fetching stats:", error);
    }
  };

  const tabs = [
    { value: "employees", label: "Employees", icon: Users },
    { value: "leave", label: "Leave", icon: Calendar },
    { value: "attendance", label: "Attendance", icon: ClipboardCheck },
    { value: "performance", label: "Performance", icon: Star },
    { value: "profile", label: "My Profile", icon: UserCog },
  ];

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-[hsl(var(--gold))] mx-auto" />
          <p className="mt-4 text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <UnifiedDashboardLayout userEmail={user?.email} userRoles={userRoles} userCountry={user?.country}>
      {/* Welcome Section */}
      <div className="mb-6 md:mb-8">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
          HR Dashboard<span className="text-[hsl(var(--gold))]">.</span>
        </h1>
        <p className="text-muted-foreground mt-1">
          Manage employees, attendance, leaves, and performance reviews
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-6 md:mb-8">
        <DashboardStatsCard
          label="Total Employees"
          value={stats.totalEmployees}
          icon={Users}
        />
        <DashboardStatsCard
          label="Active Employees"
          value={stats.activeEmployees}
          icon={Users}
          color="text-emerald-500"
        />
        <DashboardStatsCard
          label="Pending Leaves"
          value={stats.pendingLeaves}
          icon={Calendar}
          color="text-amber-500"
        />
        <DashboardStatsCard
          label="Present Today"
          value={stats.presentToday}
          icon={ClipboardCheck}
          color="text-blue-500"
        />
      </div>

      <EnterpriseTabNav activeTab={activeTab} basePath="/hr/dashboard" tabs={tabs} />

      {/* Tab Content */}
      <Tabs value={activeTab}>
        <TabsContent value="employees" className="mt-0">
          <EmployeeDirectory />
        </TabsContent>
        <TabsContent value="leave" className="mt-0">
          <LeaveManagement />
        </TabsContent>
        <TabsContent value="attendance" className="mt-0">
          <div className="space-y-6">
            <GeofencedAttendancePanel />
            <AttendanceManagement />
          </div>
        </TabsContent>
        <TabsContent value="performance" className="mt-0">
          <PerformanceReviews />
        </TabsContent>
        <TabsContent value="profile" className="mt-0">
          <ProfileSettings />
        </TabsContent>
      </Tabs>
    </UnifiedDashboardLayout>
  );
};

export default HRDashboard;
