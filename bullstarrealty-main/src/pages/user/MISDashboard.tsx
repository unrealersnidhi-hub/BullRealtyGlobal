import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import {
  Loader2,
  ClipboardList,
  FileSpreadsheet,
  Users,
  PhoneCall,
  TrendingUp,
  Flame,
  ThermometerSun,
  Snowflake,
  UserCog,
  Download,
  List,
  LayoutGrid,
  Target,
  BarChart3,
  ClipboardCheck,
} from "lucide-react";
import { format } from "date-fns";
import { type LeadStatus } from "@/components/leads/LeadStatusBadge";
import { LeadDetailDialog } from "@/components/leads/LeadDetailDialog";
import { DashboardStatsCard } from "@/components/admin/DashboardStatsCard";
import { MISReportsDashboard } from "@/components/admin/MISReportsDashboard";
import { CallStatsCard } from "@/components/leads/CallStatsCard";
import { LeadFunnel } from "@/components/leads/LeadFunnel";
import { TeamLeadAssignment } from "@/components/leads/TeamLeadAssignment";
import { UnifiedDashboardLayout } from "@/components/admin/UnifiedDashboardLayout";
import { ProfileSettings } from "@/components/profile/ProfileSettings";
import { LeadsTable } from "@/components/admin/LeadsTable";
import { LeadSearchFilters } from "@/components/leads/LeadSearchFilters";
import { LeadBulkActions } from "@/components/leads/LeadBulkActions";
import { LeadPipelineView } from "@/components/leads/LeadPipelineView";
import { ManualLeadForm } from "@/components/admin/ManualLeadForm";
import { cn } from "@/lib/utils";
import { useSessionManagement } from "@/hooks/useSessionManagement";
import { LeadImportButton } from "@/components/leads/LeadImportButton";
import { SalesTargetBoard } from "@/components/admin/SalesTargetBoard";
import { PerformanceBoard } from "@/components/admin/PerformanceBoard";
import { GeofencedAttendancePanel } from "@/components/attendance/GeofencedAttendancePanel";
import { EnterpriseTabNav } from "@/components/dashboard/EnterpriseTabNav";

interface Lead {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  interest: string | null;
  message: string | null;
  source: string | null;
  status: LeadStatus;
  created_at: string;
  assigned_to: string | null;
  assigned_at: string | null;
  country: 'dubai' | 'india' | null;
}

interface TeamMember {
  id: string;
  email: string;
  fullName: string | null;
  roles: string[];
  country: 'dubai' | 'india' | null;
}

type CountryCode = 'dubai' | 'india';

const MISDashboard = () => {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<{ email?: string; fullName?: string; id?: string; country?: CountryCode | null } | null>(null);
  const [userRoles, setUserRoles] = useState<string[]>([]);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [isLeadDialogOpen, setIsLeadDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [assigneeFilter, setAssigneeFilter] = useState("all");
  const [countryFilter, setCountryFilter] = useState("all");
  const [selectedLeadIds, setSelectedLeadIds] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<"table" | "pipeline">("table");
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const activeTab = searchParams.get("tab") || "leads";
  const { startSessionMonitoring, stopSessionMonitoring } = useSessionManagement();

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        navigate("/admin");
        return;
      }

      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", session.user.id);

      const userRoleList = roles?.map(r => r.role) || [];
      setUserRoles(userRoleList);

      // Redirect based on role priority
      if (userRoleList.includes("super_admin") || userRoleList.includes("admin")) {
        navigate("/admin/dashboard");
        return;
      }

      if (userRoleList.includes("manager")) {
        navigate("/manager/dashboard");
        return;
      }

      if (!userRoleList.includes("mis")) {
        if (userRoleList.includes("telesales")) {
          navigate("/telesales/dashboard");
          return;
        }
        if (userRoleList.includes("user")) {
          navigate("/user/dashboard");
          return;
        }
        if (userRoleList.includes("blog_writer")) {
          navigate("/admin/blog");
          return;
        }
        await supabase.auth.signOut();
        toast.error("Access denied. No valid role assigned.");
        navigate("/admin");
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, country")
        .eq("user_id", session.user.id)
        .maybeSingle();

      setUser({
        email: session.user.email,
        fullName: profile?.full_name || undefined,
        id: session.user.id,
        country: profile?.country || null,
      });

      // Start SSO session monitoring
      startSessionMonitoring();

      fetchLeads();
      fetchTeamMembers();
    };

    checkAuth();
    
    return () => {
      stopSessionMonitoring();
    };
  }, [navigate, startSessionMonitoring, stopSessionMonitoring]);

  const fetchLeads = async () => {
    try {
      const { data, error } = await supabase
        .from("leads")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setLeads((data as Lead[]) || []);
    } catch (error) {
      console.error("Error fetching leads:", error);
      toast.error("Failed to load leads");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchTeamMembers = async () => {
    try {
      const response = await supabase.functions.invoke("list-team-members");
      if (response.error) throw new Error(response.error.message);
      setTeamMembers(response.data?.users || []);
    } catch (error: any) {
      console.error("Error fetching team members:", error);
    }
  };

  const handleLeadUpdate = (updatedLead: Lead) => {
    setLeads(leads.map((l) => (l.id === updatedLead.id ? updatedLead : l)));
    setSelectedLead(updatedLead);
  };

  const handleLeadClick = (leadId: string) => {
    const lead = leads.find((l) => l.id === leadId);
    if (lead) {
      setSelectedLead(lead);
      setIsLeadDialogOpen(true);
    }
  };

  const handleAssignLead = async (leadId: string, assignedTo: string | null) => {
    try {
      const { error } = await supabase.from("leads").update({ assigned_to: assignedTo }).eq("id", leadId);
      if (error) throw error;
      setLeads(leads.map((l) => l.id === leadId ? { ...l, assigned_to: assignedTo } : l));
      toast.success(assignedTo ? "Lead assigned" : "Lead unassigned");
    } catch (error) {
      console.error("Error assigning lead:", error);
      toast.error("Failed to assign lead");
    }
  };

  // Filtered leads
  const filteredLeads = leads.filter((l) => {
    const sourceMatch = sourceFilter === "all" || (l.source || "website") === sourceFilter;
    const countryMatch = countryFilter === "all" || l.country === countryFilter || (!l.country && countryFilter === "none");
    const statusMatch = statusFilter === "all" || l.status === statusFilter;
    const assigneeMatch = assigneeFilter === "all" ||
      (assigneeFilter === "unassigned" ? !l.assigned_to : l.assigned_to === assigneeFilter);
    const searchMatch = !searchQuery ||
      l.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (l.phone || "").toLowerCase().includes(searchQuery.toLowerCase());
    return sourceMatch && countryMatch && statusMatch && assigneeMatch && searchMatch;
  });

  const hasActiveFilters = searchQuery !== "" || statusFilter !== "all" || sourceFilter !== "all" || assigneeFilter !== "all" || countryFilter !== "all";
  const clearAllFilters = () => { setSearchQuery(""); setStatusFilter("all"); setSourceFilter("all"); setAssigneeFilter("all"); setCountryFilter("all"); };
  const uniqueSources = [...new Set(leads.map((l) => l.source || "website"))];

  const exportLeadsToCSV = () => {
    if (leads.length === 0) { toast.error("No leads to export"); return; }
    const headers = ["Name", "Email", "Phone", "Interest", "Status", "Source", "Country", "Date"];
    const csvRows = [
      headers.join(","),
      ...filteredLeads.map((lead) => [
        `"${lead.full_name}"`, `"${lead.email}"`, `"${lead.phone || ""}"`,
        `"${lead.interest || ""}"`, `"${lead.status}"`, `"${lead.source || "website"}"`,
        `"${lead.country || ""}"`, `"${format(new Date(lead.created_at), "yyyy-MM-dd")}"`,
      ].join(",")),
    ];
    const blob = new Blob([csvRows.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url; link.download = `leads_${format(new Date(), "yyyy-MM-dd")}.csv`;
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success(`Exported ${filteredLeads.length} leads`);
  };

  // Calculate stats
  const hotLeads = leads.filter((l) => l.status === "hot").length;
  const warmLeads = leads.filter((l) => l.status === "warm").length;
  const coldLeads = leads.filter((l) => l.status === "cold").length;
  const convertedLeads = leads.filter((l) => l.status === "converted").length;

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

  const tabs = [
    { value: "leads", label: "Leads", icon: ClipboardList },
    { value: "reports", label: "Reports", icon: FileSpreadsheet },
    { value: "team", label: "Sales Team", icon: Users },
    { value: "calls", label: "Call Stats", icon: PhoneCall },
    { value: "funnel", label: "Lead Funnel", icon: TrendingUp },
    { value: "targets", label: "Targets", icon: Target },
    { value: "performance", label: "Performance", icon: BarChart3 },
    { value: "attendance", label: "Attendance", icon: ClipboardCheck },
    { value: "profile", label: "My Profile", icon: UserCog },
  ];

  return (
    <UnifiedDashboardLayout userEmail={user?.email} userRoles={userRoles} userCountry={user?.country}>
      {/* Welcome Section */}
      <div className="mb-6 md:mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
            MIS Dashboard<span className="text-[hsl(var(--gold))]">.</span>
          </h1>
          <p className="text-muted-foreground mt-1">
            Reports, analytics, and lead management
          </p>
        </div>
        <LeadImportButton onImportComplete={fetchLeads} />
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 md:gap-4 mb-6 md:mb-8">
        <DashboardStatsCard label="Total Leads" value={leads.length} icon={ClipboardList} />
        <DashboardStatsCard label="Team Members" value={teamMembers.length} icon={Users} />
        <DashboardStatsCard label="Hot" value={hotLeads} icon={Flame} color="text-red-500" />
        <DashboardStatsCard label="Warm" value={warmLeads} icon={ThermometerSun} color="text-orange-500" />
        <DashboardStatsCard label="Cold" value={coldLeads} icon={Snowflake} color="text-blue-500" />
        <DashboardStatsCard label="Converted" value={convertedLeads} icon={TrendingUp} color="text-emerald-500" />
      </div>

      <EnterpriseTabNav activeTab={activeTab} basePath="/mis/dashboard" tabs={tabs} />

      {/* Tab Content */}
      <Tabs value={activeTab}>
        {/* Leads Tab */}
        <TabsContent value="leads" className="mt-0 space-y-4">
          <Card className="border-border/50 overflow-hidden">
            <div className="p-4 md:p-6 border-b border-border/50 bg-gradient-to-r from-card to-card/80">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <ClipboardList className="w-5 h-5 text-[hsl(var(--gold))]" />
                  Lead Management
                  <span className="text-sm font-normal text-muted-foreground ml-2">
                    {filteredLeads.length} of {leads.length}
                  </span>
                </h2>
                <div className="flex flex-wrap items-center gap-3">
                  <ManualLeadForm onLeadCreated={fetchLeads} teamMembers={teamMembers} />
                  <LeadImportButton onImportComplete={fetchLeads} />
                  <div className="flex items-center border rounded-lg overflow-hidden">
                    <Button variant={viewMode === "table" ? "default" : "ghost"} size="sm" className="h-8 rounded-none" onClick={() => setViewMode("table")}>
                      <List className="w-4 h-4" />
                    </Button>
                    <Button variant={viewMode === "pipeline" ? "default" : "ghost"} size="sm" className="h-8 rounded-none" onClick={() => setViewMode("pipeline")}>
                      <LayoutGrid className="w-4 h-4" />
                    </Button>
                  </div>
                  <Button variant="outline" onClick={exportLeadsToCSV} disabled={leads.length === 0} className="h-9">
                    <Download className="w-4 h-4 mr-2" />
                    <span className="hidden sm:inline">Export</span>
                  </Button>
                </div>
              </div>
            </div>
            <div className="p-4 md:p-6 space-y-4">
              <LeadSearchFilters
                searchQuery={searchQuery} onSearchChange={setSearchQuery}
                statusFilter={statusFilter} onStatusChange={setStatusFilter}
                sourceFilter={sourceFilter} onSourceChange={setSourceFilter}
                assigneeFilter={assigneeFilter} onAssigneeChange={setAssigneeFilter}
                countryFilter={countryFilter} onCountryChange={setCountryFilter}
                teamMembers={teamMembers} sources={uniqueSources}
                hasActiveFilters={hasActiveFilters} onClearAll={clearAllFilters}
              />
              <LeadBulkActions
                selectedIds={selectedLeadIds}
                teamMembers={teamMembers}
                onClearSelection={() => setSelectedLeadIds([])}
                onActionComplete={fetchLeads}
              />
              {viewMode === "table" ? (
                <LeadsTable
                  leads={filteredLeads}
                  teamMembers={teamMembers}
                  onAssignLead={handleAssignLead}
                  onViewLead={(lead) => { setSelectedLead(lead as Lead); setIsLeadDialogOpen(true); }}
                  selectedIds={selectedLeadIds}
                  onSelectionChange={setSelectedLeadIds}
                />
              ) : (
                <LeadPipelineView
                  leads={filteredLeads}
                  teamMembers={teamMembers}
                  onViewLead={(lead) => { setSelectedLead(lead as Lead); setIsLeadDialogOpen(true); }}
                />
              )}
            </div>
          </Card>
        </TabsContent>

        {/* Reports Tab */}
        <TabsContent value="reports" className="mt-0">
          <MISReportsDashboard />
        </TabsContent>

        {/* Team Tab */}
        <TabsContent value="team" className="mt-0">
          <TeamLeadAssignment
            leads={leads}
            teamMembers={teamMembers}
            onLeadUpdate={handleLeadUpdate}
            onLeadClick={handleLeadClick}
          />
        </TabsContent>

        {/* Calls Tab */}
        <TabsContent value="calls" className="mt-0">
          <CallStatsCard showAllUsers={true} />
        </TabsContent>

        {/* Funnel Tab */}
        <TabsContent value="funnel" className="mt-0">
          <LeadFunnel leads={leads} />
        </TabsContent>

        {/* Targets Tab */}
        <TabsContent value="targets" className="mt-0">
          <SalesTargetBoard teamMembers={teamMembers} />
        </TabsContent>

        {/* Performance Tab */}
        <TabsContent value="performance" className="mt-0">
          <PerformanceBoard teamMembers={teamMembers} />
        </TabsContent>

        {/* Attendance Tab */}
        <TabsContent value="attendance" className="mt-0">
          <GeofencedAttendancePanel />
        </TabsContent>

        {/* Profile Tab */}
        <TabsContent value="profile" className="mt-0">
          <ProfileSettings />
        </TabsContent>
      </Tabs>

      {/* Lead Detail Dialog */}
      <LeadDetailDialog
        lead={selectedLead}
        open={isLeadDialogOpen}
        onOpenChange={setIsLeadDialogOpen}
        onLeadUpdate={handleLeadUpdate}
        teamMembers={teamMembers}
        isAdmin={true}
      />
    </UnifiedDashboardLayout>
  );
};

export default MISDashboard;
