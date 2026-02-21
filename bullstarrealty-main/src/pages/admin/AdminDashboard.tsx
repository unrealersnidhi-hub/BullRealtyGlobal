import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { TabsContent, Tabs } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  Loader2,
  Download,
  ClipboardList,
  Flame,
  Snowflake,
  ThermometerSun,
  Users,
  UserCheck,
  Mail,
  TrendingUp,
  LayoutGrid,
  List,
} from "lucide-react";
import { format } from "date-fns";
import { type LeadStatus } from "@/components/leads/LeadStatusBadge";
import { LeadDetailDialog } from "@/components/leads/LeadDetailDialog";
import { FollowUpCalendar } from "@/components/leads/FollowUpCalendar";
import { LeadFunnel } from "@/components/leads/LeadFunnel";
import { LeadSearchFilters } from "@/components/leads/LeadSearchFilters";
import { LeadBulkActions } from "@/components/leads/LeadBulkActions";
import { LeadPipelineView } from "@/components/leads/LeadPipelineView";
import { IntegrationsPanel } from "@/components/admin/IntegrationsPanel";
import { NotificationSettingsPanel } from "@/components/admin/NotificationSettingsPanel";
import { EmailNotificationRulesPanel } from "@/components/admin/EmailNotificationRulesPanel";
import { AutomatedReportSchedules } from "@/components/admin/AutomatedReportSchedules";
import { AnalyticsSettingsPanel } from "@/components/admin/AnalyticsSettingsPanel";
import { DocumentCenter } from "@/components/admin/DocumentCenter";
import QuotationGenerator from "@/components/admin/QuotationGenerator";
import { ReportsDashboard } from "@/components/admin/ReportsDashboard";
import { MISReportsDashboard } from "@/components/admin/MISReportsDashboard";
import { CallStatsCard } from "@/components/leads/CallStatsCard";
import { ManualLeadForm } from "@/components/admin/ManualLeadForm";
import { useLeadNotifications } from "@/hooks/useLeadNotifications";
import { UnifiedDashboardLayout } from "@/components/admin/UnifiedDashboardLayout";
import { DashboardStatsCard } from "@/components/admin/DashboardStatsCard";
import { LeadsTable } from "@/components/admin/LeadsTable";
import { TeamMembersTable } from "@/components/admin/TeamMembersTable";
import { TabNavigation } from "@/components/admin/TabNavigation";
import { ProfileRequestsPanel } from "@/components/admin/ProfileRequestsPanel";
import { LiveLocationTracker } from "@/components/admin/LiveLocationTracker";
import { LocationHistory } from "@/components/admin/LocationHistory";
import { SessionManagement } from "@/components/admin/SessionManagement";
import { useSessionManagement } from "@/hooks/useSessionManagement";
import { LeadImportButton } from "@/components/leads/LeadImportButton";
import { AutoAssignLeads } from "@/components/leads/AutoAssignLeads";
import { EmployeeDirectory } from "@/components/hr/EmployeeDirectory";
import { LeaveManagement } from "@/components/hr/LeaveManagement";
import { AttendanceManagement } from "@/components/hr/AttendanceManagement";
import { PerformanceReviews } from "@/components/hr/PerformanceReviews";
import { ProfileSettings } from "@/components/profile/ProfileSettings";
import { MCubeCallTracker } from "@/components/admin/MCubeCallTracker";
import { SalesTargetBoard } from "@/components/admin/SalesTargetBoard";
import { PerformanceBoard } from "@/components/admin/PerformanceBoard";
import { TeamAvailabilityToggle } from "@/components/admin/TeamAvailabilityToggle";
import { WeeklyOffSchedule } from "@/components/admin/WeeklyOffSchedule";
import { GeofenceManager } from "@/components/admin/GeofenceManager";
import { CommandCentre } from "@/components/admin/CommandCentre";
import { ExecutiveDashboard } from "@/components/admin/ExecutiveDashboard";
import { GeofencedAttendancePanel } from "@/components/attendance/GeofencedAttendancePanel";

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
  createdAt: string;
  lastSignIn: string | null;
  country: 'dubai' | 'india' | null;
}

interface MeetingMetric {
  id: string;
  lead_id: string;
  meeting_type: string | null;
  status: string | null;
}

interface ActivityMetric {
  id: string;
  lead_id: string;
  activity_type: string;
  title: string;
  description: string | null;
}

interface FollowUpMetric {
  id: string;
  lead_id: string;
  completed: boolean;
}

const AdminDashboard = () => {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [meetings, setMeetings] = useState<MeetingMetric[]>([]);
  const [leadActivities, setLeadActivities] = useState<ActivityMetric[]>([]);
  const [followUpMetrics, setFollowUpMetrics] = useState<FollowUpMetric[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingTeam, setIsLoadingTeam] = useState(false);
  const [user, setUser] = useState<{ email?: string; id?: string; country?: 'dubai' | 'india' | null } | null>(null);
  const [userRoles, setUserRoles] = useState<string[]>([]);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [isLeadDialogOpen, setIsLeadDialogOpen] = useState(false);
  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const [countryFilter, setCountryFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [assigneeFilter, setAssigneeFilter] = useState("all");
  const [interestTagFilter, setInterestTagFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");
  const [bucketFilter, setBucketFilter] = useState("all");
  const [selectedLeadIds, setSelectedLeadIds] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<"table" | "pipeline">("table");
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const activeTab = searchParams.get("tab") || "leads";
  const { notifyLeadAssigned } = useLeadNotifications();
  const { startSessionMonitoring, stopSessionMonitoring, endSession } = useSessionManagement();

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

      const userRoleList = roles?.map((r) => r.role) || [];

      if (!userRoleList.includes("admin") && !userRoleList.includes("super_admin")) {
        if (userRoleList.includes("mis")) {
          navigate("/mis/dashboard");
        } else if (userRoleList.includes("telesales")) {
          navigate("/telesales/dashboard");
        } else if (userRoleList.includes("manager")) {
          navigate("/manager/dashboard");
        } else if (userRoleList.includes("blog_writer")) {
          navigate("/admin/blog");
        } else if (userRoleList.includes("user")) {
          navigate("/user/dashboard");
        } else {
          await supabase.auth.signOut();
          toast.error("Access denied. No valid role assigned.");
          navigate("/admin");
        }
        return;
      }

      // Get user's country from profile
      const { data: profile } = await supabase
        .from("profiles")
        .select("country")
        .eq("user_id", session.user.id)
        .maybeSingle();

      setUser({ 
        email: session.user.email, 
        id: session.user.id,
        country: profile?.country || null
      });
      setUserRoles(userRoleList);
      
      // Start SSO session monitoring
      startSessionMonitoring();
      
      fetchLeads();
      fetchTeamMembers();
    };

    checkAuth();
    
    // Cleanup session monitoring on unmount
    return () => {
      stopSessionMonitoring();
    };
  }, [navigate]);

  useEffect(() => {
    if (activeTab !== "leads") return;

    const statusParam = searchParams.get("status");
    const assigneeParam = searchParams.get("assignee");
    const sourceParam = searchParams.get("source");
    const queryParam = searchParams.get("q");
    const dateParam = searchParams.get("date");
    const bucketParam = searchParams.get("bucket");

    setStatusFilter(statusParam || "all");
    setAssigneeFilter(assigneeParam || "all");
    setSourceFilter(sourceParam || "all");
    setSearchQuery(queryParam || "");
    setDateFilter(dateParam || "all");
    setBucketFilter(bucketParam || "all");
    setCountryFilter("all");
    setInterestTagFilter("all");
  }, [searchParams, activeTab]);

  const fetchLeads = async () => {
    try {
      const [leadsRes, meetingsRes, activitiesRes, followUpsRes] = await Promise.all([
        supabase.from("leads").select("*").order("created_at", { ascending: false }),
        supabase.from("meetings").select("id, lead_id, meeting_type, status"),
        supabase.from("lead_activities").select("id, lead_id, activity_type, title, description"),
        supabase.from("follow_ups").select("id, lead_id, completed"),
      ]);

      if (leadsRes.error) throw leadsRes.error;
      if (meetingsRes.error) throw meetingsRes.error;
      if (activitiesRes.error) throw activitiesRes.error;
      if (followUpsRes.error) throw followUpsRes.error;

      setLeads((leadsRes.data as Lead[]) || []);
      setMeetings((meetingsRes.data as MeetingMetric[]) || []);
      setLeadActivities((activitiesRes.data as ActivityMetric[]) || []);
      setFollowUpMetrics((followUpsRes.data as FollowUpMetric[]) || []);
    } catch (error) {
      console.error("Error fetching leads:", error);
      toast.error("Failed to load leads");
    } finally {
      setIsLoading(false);
    }
  };

  const includesAny = (text: string | null | undefined, values: string[]) => {
    const source = (text || "").toLowerCase();
    return values.some((v) => source.includes(v));
  };

  const navigateLeadsWithFilters = (filters?: { status?: string; bucket?: string }) => {
    const params = new URLSearchParams({ tab: "leads" });
    if (filters?.status) params.set("status", filters.status);
    if (filters?.bucket) params.set("bucket", filters.bucket);
    navigate(`/admin/dashboard?${params.toString()}`);
  };

  const fetchTeamMembers = async () => {
    setIsLoadingTeam(true);
    try {
      const response = await supabase.functions.invoke("list-team-members");

      if (response.error) throw new Error(response.error.message);
      if (response.data?.error) throw new Error(response.data.error);

      setTeamMembers(response.data?.users || []);
    } catch (error: any) {
      console.error("Error fetching team members:", error);
      toast.error("Failed to load team members");
    } finally {
      setIsLoadingTeam(false);
    }
  };

  const sanitizeCSVCell = (value: string): string => {
    let sanitized = value.replace(/"/g, '""');
    if (/^[=+\-@\t\r]/.test(sanitized)) {
      sanitized = "'" + sanitized;
    }
    return `"${sanitized}"`;
  };

  const exportLeadsToCSV = async () => {
    if (leads.length === 0) {
      toast.error("No leads to export");
      return;
    }

    toast.info("Preparing export with activities...");

    // Fetch all activities, notes, call logs, and follow-ups for all leads
    const leadIds = leads.map(l => l.id);
    
    const [activitiesRes, notesRes, callLogsRes, followUpsRes] = await Promise.all([
      supabase.from("lead_activities").select("lead_id, activity_type, title, description, old_value, new_value, created_at").in("lead_id", leadIds).order("created_at", { ascending: true }),
      supabase.from("lead_notes").select("lead_id, content, created_at").in("lead_id", leadIds).order("created_at", { ascending: true }),
      supabase.from("call_logs").select("lead_id, outcome, duration_seconds, notes, created_at, user_id").in("lead_id", leadIds).order("created_at", { ascending: true }),
      supabase.from("follow_ups").select("lead_id, title, scheduled_at, completed, completed_at, user_id").in("lead_id", leadIds).order("created_at", { ascending: true }),
    ]);

    const activities = activitiesRes.data || [];
    const notes = notesRes.data || [];
    const callLogs = callLogsRes.data || [];
    const followUps = followUpsRes.data || [];

    const headers = [
      "Name", "Email", "Phone", "Interest", "Status", "Message", "Source", "Country",
      "Assigned To", "Captured Date", "Assigned Date",
      "Activities Summary", "Notes", "Call Logs", "Follow-ups"
    ];
    
    const csvRows = [
      headers.join(","),
      ...leads.map((lead) => {
        const assignedMember = teamMembers.find((m) => m.id === lead.assigned_to);
        
        // Compile activities for this lead
        const leadActivities = activities
          .filter(a => a.lead_id === lead.id)
          .map(a => `[${format(new Date(a.created_at), "yyyy-MM-dd HH:mm")}] ${a.title}${a.description ? ': ' + a.description : ''}${a.old_value && a.new_value ? ` (${a.old_value} -> ${a.new_value})` : ''}`)
          .join(" | ");

        const leadNotes = notes
          .filter(n => n.lead_id === lead.id)
          .map(n => `[${format(new Date(n.created_at), "yyyy-MM-dd HH:mm")}] ${n.content}`)
          .join(" | ");

        const leadCalls = callLogs
          .filter(c => c.lead_id === lead.id)
          .map(c => {
            const caller = teamMembers.find(m => m.id === c.user_id);
            return `[${format(new Date(c.created_at), "yyyy-MM-dd HH:mm")}] ${c.outcome} (${c.duration_seconds || 0}s) by ${caller?.fullName || caller?.email || 'Unknown'}${c.notes ? ' - ' + c.notes : ''}`;
          })
          .join(" | ");

        const leadFollowUps = followUps
          .filter(f => f.lead_id === lead.id)
          .map(f => {
            const assignee = teamMembers.find(m => m.id === f.user_id);
            return `${f.title} scheduled ${format(new Date(f.scheduled_at), "yyyy-MM-dd HH:mm")} ${f.completed ? 'âœ“ Done' : 'â³ Pending'} by ${assignee?.fullName || assignee?.email || 'Unknown'}`;
          })
          .join(" | ");

        return [
          sanitizeCSVCell(lead.full_name),
          sanitizeCSVCell(lead.email),
          sanitizeCSVCell(lead.phone || ""),
          sanitizeCSVCell(lead.interest || ""),
          sanitizeCSVCell(lead.status || "new"),
          sanitizeCSVCell((lead.message || "").replace(/\n/g, " ")),
          sanitizeCSVCell(lead.source || "website"),
          sanitizeCSVCell(lead.country || ""),
          sanitizeCSVCell(assignedMember?.fullName || assignedMember?.email || ""),
          sanitizeCSVCell(format(new Date(lead.created_at), "yyyy-MM-dd HH:mm:ss")),
          sanitizeCSVCell(lead.assigned_at ? format(new Date(lead.assigned_at), "yyyy-MM-dd HH:mm:ss") : ""),
          sanitizeCSVCell(leadActivities || "No activities"),
          sanitizeCSVCell(leadNotes || "No notes"),
          sanitizeCSVCell(leadCalls || "No calls"),
          sanitizeCSVCell(leadFollowUps || "No follow-ups"),
        ].join(",");
      }),
    ];

    const csvContent = csvRows.join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `leads_with_activities_${format(new Date(), "yyyy-MM-dd")}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast.success(`Exported ${leads.length} leads with full activity data`);
  };

  const handleAssignLead = async (leadId: string, assignedTo: string | null) => {
    try {
      const { error } = await supabase
        .from("leads")
        .update({ assigned_to: assignedTo })
        .eq("id", leadId);

      if (error) throw error;

      const lead = leads.find((l) => l.id === leadId);
      setLeads(leads.map((l) => l.id === leadId ? { ...l, assigned_to: assignedTo } : l));

      const assignedMember = teamMembers.find((m) => m.id === assignedTo);
      if (assignedTo && lead) {
        toast.success(`Lead assigned to ${assignedMember?.fullName || assignedMember?.email}`);

        notifyLeadAssigned(
          lead.id,
          lead.full_name,
          lead.email,
          assignedTo,
          lead.phone || undefined,
          lead.source || undefined,
          lead.interest || undefined
        );
      } else {
        toast.success("Lead unassigned");
      }
    } catch (error) {
      console.error("Error assigning lead:", error);
      toast.error("Failed to assign lead");
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

  // Filtered leads
  const visitLeadIds = new Set(
    meetings
      .filter((m) => includesAny(m.meeting_type, ["site", "visit"]))
      .map((m) => m.lead_id)
      .filter(Boolean)
  );
  const visitPendingLeadIds = new Set(
    meetings
      .filter((m) => includesAny(m.meeting_type, ["site", "visit"]) && !includesAny(m.status, ["confirm", "done", "complete"]))
      .map((m) => m.lead_id)
      .filter(Boolean)
  );
  const visitConfirmedLeadIds = new Set(
    meetings
      .filter((m) => includesAny(m.meeting_type, ["site", "visit"]) && includesAny(m.status, ["confirm", "done", "complete"]))
      .map((m) => m.lead_id)
      .filter(Boolean)
  );
  const obmLeadIds = new Set(
    leadActivities
      .filter((a) => includesAny(`${a.activity_type} ${a.title} ${a.description || ""}`, ["obm"]))
      .map((a) => a.lead_id)
      .filter(Boolean)
  );
  const pendingTaskLeadIds = new Set(
    followUpMetrics
      .filter((f) => !f.completed)
      .map((f) => f.lead_id)
      .filter(Boolean)
  );
  const pendingMeetingLeadIds = new Set(
    meetings
      .filter((m) => !includesAny(m.status, ["confirm", "done", "complete", "cancel"]))
      .map((m) => m.lead_id)
      .filter(Boolean)
  );

  const filteredLeads = leads.filter((l) => {
    const sourceMatch = sourceFilter === "all" || (l.source || "website") === sourceFilter;
    const countryMatch = countryFilter === "all" || l.country === countryFilter || (!l.country && countryFilter === "none");
    const statusMatch = statusFilter === "all" || l.status === statusFilter;
    const assigneeMatch = assigneeFilter === "all" || 
      (assigneeFilter === "unassigned" ? !l.assigned_to : l.assigned_to === assigneeFilter);
    const searchMatch = !searchQuery || 
      l.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (l.phone || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (l.interest || "").toLowerCase().includes(searchQuery.toLowerCase());
    
    // Date filter
    let dateMatch = true;
    if (dateFilter !== "all") {
      const now = new Date();
      const created = new Date(l.created_at);
      if (dateFilter === "today") {
        dateMatch = created.toDateString() === now.toDateString();
      } else if (dateFilter === "week") {
        const weekAgo = new Date(now); weekAgo.setDate(now.getDate() - 7);
        dateMatch = created >= weekAgo;
      } else if (dateFilter === "month") {
        dateMatch = created.getMonth() === now.getMonth() && created.getFullYear() === now.getFullYear();
      } else if (dateFilter === "quarter") {
        const qStart = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
        dateMatch = created >= qStart;
      }
    }

    let bucketMatch = true;
    if (bucketFilter === "visit_all") bucketMatch = visitLeadIds.has(l.id);
    if (bucketFilter === "pending_tasks") bucketMatch = pendingTaskLeadIds.has(l.id);
    if (bucketFilter === "pending_meetings") bucketMatch = pendingMeetingLeadIds.has(l.id);
    if (bucketFilter === "visit_pending") bucketMatch = visitPendingLeadIds.has(l.id);
    if (bucketFilter === "visit_confirmed") bucketMatch = visitConfirmedLeadIds.has(l.id);
    if (bucketFilter === "obm") bucketMatch = obmLeadIds.has(l.id);

    return sourceMatch && countryMatch && statusMatch && assigneeMatch && searchMatch && dateMatch && bucketMatch;
  });

  const hasActiveFilters = searchQuery !== "" || statusFilter !== "all" || 
    sourceFilter !== "all" || assigneeFilter !== "all" || countryFilter !== "all" || interestTagFilter !== "all" || dateFilter !== "all" || bucketFilter !== "all";

  const clearAllFilters = () => {
    setSearchQuery("");
    setStatusFilter("all");
    setSourceFilter("all");
    setAssigneeFilter("all");
    setCountryFilter("all");
    setInterestTagFilter("all");
    setDateFilter("all");
    setBucketFilter("all");
  };

  const uniqueSources = [...new Set(leads.map((l) => l.source || "website"))];
  const hotLeads = leads.filter((l) => l.status === "hot").length;
  const warmLeads = leads.filter((l) => l.status === "warm").length;
  const coldLeads = leads.filter((l) => l.status === "cold").length;
  const unassignedLeads = leads.filter((l) => !l.assigned_to).length;
  const convertedLeads = leads.filter((l) => l.status === "converted").length;
  const visitMeetings = meetings.filter((m) => includesAny(m.meeting_type, ["site", "visit"]));
  const visitPendingCount = visitMeetings.filter((m) => !includesAny(m.status, ["confirm", "done", "complete"])).length;
  const visitConfirmedCount = visitMeetings.filter((m) => includesAny(m.status, ["confirm", "done", "complete"])).length;
  const obmCount = leadActivities.filter((a) => includesAny(`${a.activity_type} ${a.title} ${a.description || ""}`, ["obm"])).length;

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
          Welcome back<span className="text-[hsl(var(--gold))]">!</span>
        </h1>
        <p className="text-muted-foreground mt-1">
          Here's what's happening with your leads today
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 md:gap-4 mb-6 md:mb-8">
        <DashboardStatsCard
          label="Total Leads"
          value={leads.length}
          icon={ClipboardList}
          action={() => navigateLeadsWithFilters()}
        />
        <DashboardStatsCard
          label="Unassigned"
          value={unassignedLeads}
          icon={Mail}
          action={() => navigate("/admin/dashboard?tab=leads&assignee=unassigned")}
        />
        <DashboardStatsCard
          label="Hot Leads"
          value={hotLeads}
          icon={Flame}
          color="text-red-500"
          action={() => navigateLeadsWithFilters({ status: "hot" })}
        />
        <DashboardStatsCard
          label="Warm Leads"
          value={warmLeads}
          icon={ThermometerSun}
          color="text-orange-500"
          action={() => navigateLeadsWithFilters({ status: "warm" })}
        />
        <DashboardStatsCard
          label="Converted"
          value={convertedLeads}
          icon={TrendingUp}
          color="text-emerald-500"
          action={() => navigateLeadsWithFilters({ status: "converted" })}
        />
        <DashboardStatsCard
          label="Team Members"
          value={teamMembers.length}
          icon={Users}
          action={() => navigate("/admin/dashboard?tab=team")}
        />
      </div>

      {/* Tab Navigation */}
      <TabNavigation activeTab={activeTab} className="mb-6" />

      {/* Tab Content */}
      <Tabs value={activeTab} className="space-y-6">
        <TabsContent value="executive" className="mt-0">
          <ExecutiveDashboard />
        </TabsContent>

        {/* Leads Tab */}
        <TabsContent value="leads" className="mt-0 space-y-4">
          {/* Header with actions */}
          <Card className="border-border/50 overflow-hidden">
            <div className="p-4 md:p-6 border-b border-border/50 bg-gradient-to-r from-card to-card/80">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold flex items-center gap-2">
                    <ClipboardList className="w-5 h-5 text-[hsl(var(--gold))]" />
                    Lead Management
                    <span className="text-sm font-normal text-muted-foreground ml-2">
                      {filteredLeads.length} of {leads.length}
                    </span>
                  </h2>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <ManualLeadForm onLeadCreated={fetchLeads} teamMembers={teamMembers} />
                  <LeadImportButton onImportComplete={fetchLeads} />
                  <AutoAssignLeads
                    unassignedLeadIds={leads.filter(l => !l.assigned_to).map(l => l.id)}
                    teamMembers={teamMembers}
                    onAssignComplete={fetchLeads}
                  />
                  <div className="flex items-center border rounded-lg overflow-hidden">
                    <Button
                      variant={viewMode === "table" ? "default" : "ghost"}
                      size="sm"
                      className="h-8 rounded-none"
                      onClick={() => setViewMode("table")}
                    >
                      <List className="w-4 h-4" />
                    </Button>
                    <Button
                      variant={viewMode === "pipeline" ? "default" : "ghost"}
                      size="sm"
                      className="h-8 rounded-none"
                      onClick={() => setViewMode("pipeline")}
                    >
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
              <Card className="border-border/60 bg-muted/20">
                <CardContent className="p-4 md:p-5">
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="text-sm font-semibold tracking-wide uppercase text-muted-foreground">Visitors Lead Snapshot</h3>
                    <span className="text-xs text-muted-foreground">Quick board</span>
                  </div>
                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                    <button type="button" onClick={() => navigateLeadsWithFilters({ bucket: "visit_pending" })} className="rounded-md border border-border bg-background p-3 text-left transition-colors hover:border-[hsl(var(--gold))]/60">
                      <p className="text-xs uppercase text-muted-foreground">Visit Pending</p>
                      <p className="text-2xl font-semibold">{visitPendingCount}</p>
                    </button>
                    <button type="button" onClick={() => navigateLeadsWithFilters({ bucket: "visit_confirmed" })} className="rounded-md border border-border bg-background p-3 text-left transition-colors hover:border-[hsl(var(--gold))]/60">
                      <p className="text-xs uppercase text-muted-foreground">Visit Confirmed</p>
                      <p className="text-2xl font-semibold">{visitConfirmedCount}</p>
                    </button>
                    <button type="button" onClick={() => navigateLeadsWithFilters({ bucket: "obm" })} className="rounded-md border border-border bg-background p-3 text-left transition-colors hover:border-[hsl(var(--gold))]/60">
                      <p className="text-xs uppercase text-muted-foreground">OBM</p>
                      <p className="text-2xl font-semibold">{obmCount}</p>
                    </button>
                    <button type="button" onClick={() => navigateLeadsWithFilters({ status: "cold" })} className="rounded-md border border-border bg-background p-3 text-left transition-colors hover:border-[hsl(var(--gold))]/60">
                      <p className="text-xs uppercase text-muted-foreground">Cold Leads</p>
                      <p className="text-2xl font-semibold text-blue-500">{coldLeads}</p>
                    </button>
                    <button type="button" onClick={() => navigateLeadsWithFilters({ status: "warm" })} className="rounded-md border border-border bg-background p-3 text-left transition-colors hover:border-[hsl(var(--gold))]/60">
                      <p className="text-xs uppercase text-muted-foreground">Warm Leads</p>
                      <p className="text-2xl font-semibold text-orange-500">{warmLeads}</p>
                    </button>
                    <button type="button" onClick={() => navigateLeadsWithFilters({ status: "hot" })} className="rounded-md border border-border bg-background p-3 text-left transition-colors hover:border-[hsl(var(--gold))]/60">
                      <p className="text-xs uppercase text-muted-foreground">Hot Leads</p>
                      <p className="text-2xl font-semibold text-red-500">{hotLeads}</p>
                    </button>
                  </div>
                </CardContent>
              </Card>

              {/* Search & Filters */}
              <LeadSearchFilters
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                statusFilter={statusFilter}
                onStatusChange={setStatusFilter}
                sourceFilter={sourceFilter}
                onSourceChange={setSourceFilter}
                assigneeFilter={assigneeFilter}
                onAssigneeChange={setAssigneeFilter}
                countryFilter={countryFilter}
                onCountryChange={setCountryFilter}
                interestTagFilter={interestTagFilter}
                onInterestTagChange={setInterestTagFilter}
                dateFilter={dateFilter}
                onDateFilterChange={setDateFilter}
                teamMembers={teamMembers}
                sources={uniqueSources}
                onClearAll={clearAllFilters}
                hasActiveFilters={hasActiveFilters}
              />

              {/* Bulk Actions */}
              <LeadBulkActions
                selectedIds={selectedLeadIds}
                teamMembers={teamMembers}
                onClearSelection={() => setSelectedLeadIds([])}
                onActionComplete={fetchLeads}
              />

              {/* View Mode */}
              {viewMode === "pipeline" ? (
                <LeadPipelineView
                  leads={filteredLeads}
                  teamMembers={teamMembers}
                  onViewLead={(lead) => {
                    setSelectedLead(lead as Lead);
                    setIsLeadDialogOpen(true);
                  }}
                />
              ) : (
                <LeadsTable
                  leads={filteredLeads}
                  teamMembers={teamMembers}
                  onAssignLead={handleAssignLead}
                  onViewLead={(lead) => {
                    setSelectedLead(lead as Lead);
                    setIsLeadDialogOpen(true);
                  }}
                  selectedIds={selectedLeadIds}
                  onSelectionChange={setSelectedLeadIds}
                />
              )}
            </div>
          </Card>
        </TabsContent>

        {/* Funnel Tab */}
        <TabsContent value="funnel" className="mt-0">
          <LeadFunnel leads={leads} />
        </TabsContent>

        {/* Calendar Tab */}
        <TabsContent value="calendar" className="mt-0">
          <FollowUpCalendar onLeadClick={handleLeadClick} />
        </TabsContent>

        {/* Team Tab */}
        <TabsContent value="team" className="mt-0">
          <div className="space-y-6">
            <TeamAvailabilityToggle teamMembers={teamMembers} />
            <WeeklyOffSchedule teamMembers={teamMembers} />
            <TeamMembersTable
              teamMembers={teamMembers}
              currentUserId={user?.id}
              onRefresh={fetchTeamMembers}
              isLoading={isLoadingTeam}
            />
          </div>
        </TabsContent>

        {/* Location Tab */}
        <TabsContent value="location" className="mt-0">
          <div className="space-y-6">
            <LiveLocationTracker />
            <LocationHistory />
          </div>
        </TabsContent>

        {/* Integrations Tab */}
        <TabsContent value="integrations" className="mt-0">
          <IntegrationsPanel />
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="mt-0">
          <Card className="border-border/50 p-6">
            <AnalyticsSettingsPanel />
          </Card>
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications" className="mt-0 space-y-6">
          <NotificationSettingsPanel />
          <EmailNotificationRulesPanel />
          <AutomatedReportSchedules />
        </TabsContent>

        {/* Documents Tab */}
        <TabsContent value="documents" className="mt-0">
          <DocumentCenter />
        </TabsContent>

        {/* Quotations Tab */}
        <TabsContent value="quotations" className="mt-0">
          <QuotationGenerator />
        </TabsContent>

        {/* Reports Tab */}
        <TabsContent value="reports" className="mt-0">
        <div className="space-y-6">
          <CallStatsCard showAllUsers={true} />
          <MISReportsDashboard />
          <ReportsDashboard />
        </div>
        </TabsContent>

        {/* Calling Tab - MCube Integration */}
        <TabsContent value="calling" className="mt-0">
          <MCubeCallTracker />
        </TabsContent>

        {/* Targets Tab */}
        <TabsContent value="targets" className="mt-0">
          <SalesTargetBoard teamMembers={teamMembers} isAdmin={true} />
        </TabsContent>

        {/* Performance Tab */}
        <TabsContent value="performance" className="mt-0">
          <PerformanceBoard teamMembers={teamMembers} />
        </TabsContent>

         {/* Requests Tab */}
         <TabsContent value="requests" className="mt-0">
           <ProfileRequestsPanel />
         </TabsContent>

        {/* Sessions Tab - SSO Management */}
        <TabsContent value="sessions" className="mt-0">
          {user?.id && <SessionManagement currentUserId={user.id} />}
        </TabsContent>

        {/* HR Tabs */}
        <TabsContent value="employees" className="mt-0">
          <EmployeeDirectory />
        </TabsContent>
        <TabsContent value="leave" className="mt-0">
          <LeaveManagement />
        </TabsContent>
        <TabsContent value="attendance" className="mt-0">
          <div className="space-y-6">
            <GeofencedAttendancePanel />
            <GeofenceManager />
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

export default AdminDashboard;



