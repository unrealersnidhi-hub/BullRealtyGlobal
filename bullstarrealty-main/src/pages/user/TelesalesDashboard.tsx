import { useEffect, useState, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  Loader2,
  Phone,
  Calendar,
  ClipboardList,
  Eye,
  Flame,
  Snowflake,
  ThermometerSun,
  UserPlus,
  PhoneCall,
  Users,
  TrendingUp,
  Send,
  UserCog,
  Search,
  X,
  Filter,
  Activity,
  Clock,
  ClipboardCheck,
} from "lucide-react";
import { format } from "date-fns";
import { LeadStatusBadge, type LeadStatus } from "@/components/leads/LeadStatusBadge";
import { LeadDetailDialog } from "@/components/leads/LeadDetailDialog";
import { FollowUpCalendar } from "@/components/leads/FollowUpCalendar";
import { CallStatsCard } from "@/components/leads/CallStatsCard";
import { TeamLeadAssignment } from "@/components/leads/TeamLeadAssignment";
import { DashboardStatsCard } from "@/components/admin/DashboardStatsCard";
import { UnifiedDashboardLayout } from "@/components/admin/UnifiedDashboardLayout";
import { ProfileSettings } from "@/components/profile/ProfileSettings";
import { PendingTasksWidget } from "@/components/dashboard/PendingTasksWidget";
import { RecentActivityWidget } from "@/components/dashboard/RecentActivityWidget";
import { useSessionManagement } from "@/hooks/useSessionManagement";
import { LeadImportButton } from "@/components/leads/LeadImportButton";
import { cn } from "@/lib/utils";
import { SalesTargetBoard } from "@/components/admin/SalesTargetBoard";
import { PerformanceBoard } from "@/components/admin/PerformanceBoard";
import { CommandCentre } from "@/components/admin/CommandCentre";
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

const TelesalesDashboard = () => {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<{ email?: string; fullName?: string; id?: string; country?: CountryCode | null } | null>(null);
  const [userRoles, setUserRoles] = useState<string[]>([]);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [isLeadDialogOpen, setIsLeadDialogOpen] = useState(false);
  const [isCreateLeadOpen, setIsCreateLeadOpen] = useState(false);
  const [isCreatingLead, setIsCreatingLead] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [assigneeFilter, setAssigneeFilter] = useState("all");
  const [newLead, setNewLead] = useState({
    full_name: "",
    email: "",
    phone: "",
    interest: "",
    message: "",
    assigned_to: "",
  });
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const activeTab = searchParams.get("tab") || "command";
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

      if (userRoleList.includes("mis")) {
        navigate("/mis/dashboard");
        return;
      }

      if (userRoleList.includes("hr")) {
        navigate("/hr/dashboard");
        return;
      }

      if (!userRoleList.includes("telesales")) {
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
      // Show ALL team members
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

  const handleCreateLead = async () => {
    if (!newLead.full_name || !newLead.email || !newLead.phone) {
      toast.error("Name, email, and phone are required");
      return;
    }

    setIsCreatingLead(true);
    try {
      const { data, error } = await supabase
        .from("leads")
        .insert({
          full_name: newLead.full_name,
          email: newLead.email,
          phone: newLead.phone,
          interest: newLead.interest || null,
          message: newLead.message || null,
          source: "telesales",
          assigned_to: newLead.assigned_to || null,
        })
        .select()
        .single();

      if (error) throw error;

      toast.success("Lead created successfully");
      setLeads([data as Lead, ...leads]);
      setIsCreateLeadOpen(false);
      setNewLead({
        full_name: "",
        email: "",
        phone: "",
        interest: "",
        message: "",
        assigned_to: "",
      });
    } catch (error) {
      console.error("Error creating lead:", error);
      toast.error("Failed to create lead");
    } finally {
      setIsCreatingLead(false);
    }
  };

  const handleAssignLead = async (leadId: string, assignedTo: string | null) => {
    try {
      const { error } = await supabase
        .from("leads")
        .update({ assigned_to: assignedTo })
        .eq("id", leadId);

      if (error) throw error;

      setLeads(leads.map((l) =>
        l.id === leadId ? { ...l, assigned_to: assignedTo } : l
      ));

      const assignedMember = teamMembers.find((m) => m.id === assignedTo);
      if (assignedTo) {
        toast.success(`Lead assigned to ${assignedMember?.fullName || assignedMember?.email}`);
      } else {
        toast.success("Lead unassigned");
      }
    } catch (error) {
      console.error("Error assigning lead:", error);
      toast.error("Failed to assign lead");
    }
  };

  // Calculate stats
  const hotLeads = leads.filter((l) => l.status === "hot").length;
  const warmLeads = leads.filter((l) => l.status === "warm").length;
  const coldLeads = leads.filter((l) => l.status === "cold").length;
  const unassignedLeads = leads.filter((l) => !l.assigned_to).length;
  const convertedLeads = leads.filter((l) => l.status === "converted").length;

  const filteredLeads = useMemo(() => {
    return leads.filter((lead) => {
      const matchesSearch = !searchQuery || 
        lead.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        lead.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (lead.phone && lead.phone.includes(searchQuery)) ||
        (lead.interest && lead.interest.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesStatus = statusFilter === "all" || lead.status === statusFilter;
      const matchesAssignee = assigneeFilter === "all" || 
        (assigneeFilter === "unassigned" ? !lead.assigned_to : lead.assigned_to === assigneeFilter);
      return matchesSearch && matchesStatus && matchesAssignee;
    });
  }, [leads, searchQuery, statusFilter, assigneeFilter]);

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
    { value: "command", label: "Command Centre", icon: Activity },
    { value: "overview", label: "Overview", icon: Clock },
    { value: "leads", label: "All Leads", icon: ClipboardList },
    { value: "team", label: "Sales Team", icon: Users },
    { value: "calls", label: "Call Log", icon: PhoneCall },
    { value: "calendar", label: "Follow-ups", icon: Calendar },
    { value: "targets", label: "Targets", icon: TrendingUp },
    { value: "performance", label: "Performance", icon: Activity },
    { value: "attendance", label: "Attendance", icon: ClipboardCheck },
    { value: "profile", label: "My Profile", icon: UserCog },
  ];

  return (
    <UnifiedDashboardLayout userEmail={user?.email} userRoles={userRoles} userCountry={user?.country}>
      {/* Welcome Section */}
      <div className="mb-6 md:mb-8">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
          Telesales Dashboard<span className="text-[hsl(var(--gold))]">.</span>
        </h1>
        <p className="text-muted-foreground mt-1">
          Create leads, log calls, and assign to sales team
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 md:gap-4 mb-6 md:mb-8">
        <DashboardStatsCard label="Total Leads" value={leads.length} icon={ClipboardList} />
        <DashboardStatsCard label="Unassigned" value={unassignedLeads} icon={Users} color="text-amber-500" />
        <DashboardStatsCard label="Hot" value={hotLeads} icon={Flame} color="text-red-500" />
        <DashboardStatsCard label="Warm" value={warmLeads} icon={ThermometerSun} color="text-orange-500" />
        <DashboardStatsCard label="Cold" value={coldLeads} icon={Snowflake} color="text-blue-500" />
        <DashboardStatsCard label="Converted" value={convertedLeads} icon={TrendingUp} color="text-emerald-500" />
      </div>

      <EnterpriseTabNav activeTab={activeTab} basePath="/telesales/dashboard" tabs={tabs} />

      {/* Tab Content */}
      <Tabs value={activeTab}>
        {/* Command Centre Tab */}
        <TabsContent value="command" className="mt-0">
          <CommandCentre userId={user?.id} />
        </TabsContent>

        {/* Overview Tab */}
        <TabsContent value="overview" className="mt-0">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <PendingTasksWidget onLeadClick={handleLeadClick} />
            <RecentActivityWidget onLeadClick={handleLeadClick} />
          </div>
        </TabsContent>

        {/* Leads Tab */}
        <TabsContent value="leads" className="mt-0">
          {/* Search and Filters */}
          <div className="bg-card rounded-xl border border-border/50 p-4 mb-4 space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, email, phone, or interest..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-10"
              />
              {searchQuery && (
                <Button variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7" onClick={() => setSearchQuery("")}>
                  <X className="w-3.5 h-3.5" />
                </Button>
              )}
            </div>
            <div className="flex flex-wrap gap-2 items-center">
              <Filter className="w-4 h-4 text-muted-foreground shrink-0" />
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[120px] h-8 text-xs">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="new">New</SelectItem>
                  <SelectItem value="warm">Warm</SelectItem>
                  <SelectItem value="hot">Hot</SelectItem>
                  <SelectItem value="cold">Cold</SelectItem>
                  <SelectItem value="not_interested">Not Interested</SelectItem>
                  <SelectItem value="converted">Converted</SelectItem>
                </SelectContent>
              </Select>
              <Select value={assigneeFilter} onValueChange={setAssigneeFilter}>
                <SelectTrigger className="w-[140px] h-8 text-xs">
                  <SelectValue placeholder="Assignee" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Assignees</SelectItem>
                  <SelectItem value="unassigned">Unassigned</SelectItem>
                  {teamMembers.map((m) => (
                    <SelectItem key={m.id} value={m.id}>{m.fullName || m.email}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {(searchQuery || statusFilter !== "all" || assigneeFilter !== "all") && (
                <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => { setSearchQuery(""); setStatusFilter("all"); setAssigneeFilter("all"); }}>
                  <X className="w-3.5 h-3.5 mr-1" /> Clear
                </Button>
              )}
            </div>
          </div>
          <div className="bg-card rounded-xl border border-border/50 overflow-hidden">
            <div className="p-6 border-b border-border/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <ClipboardList className="w-5 h-5 text-[hsl(var(--gold))]" />
                  All Leads
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Create leads, log calls, and assign to sales team
                </p>
              </div>
              <div className="flex items-center gap-2">
                <LeadImportButton onImportComplete={fetchLeads} />
              <Dialog open={isCreateLeadOpen} onOpenChange={setIsCreateLeadOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-[hsl(var(--gold))] text-[hsl(var(--charcoal))] hover:bg-[hsl(var(--gold))]/90">
                    <UserPlus className="w-4 h-4 mr-2" />
                    Create Lead
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>Create New Lead</DialogTitle>
                    <DialogDescription>
                      Add a new lead from your telecalling
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Full Name *</Label>
                      <Input
                        id="name"
                        placeholder="John Doe"
                        value={newLead.full_name}
                        onChange={(e) => setNewLead({ ...newLead, full_name: e.target.value })}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="email">Email *</Label>
                        <Input
                          id="email"
                          type="email"
                          placeholder="john@example.com"
                          value={newLead.email}
                          onChange={(e) => setNewLead({ ...newLead, email: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="phone">Phone *</Label>
                        <Input
                          id="phone"
                          type="tel"
                          placeholder="+971 50 123 4567"
                          value={newLead.phone}
                          onChange={(e) => setNewLead({ ...newLead, phone: e.target.value })}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="interest">Interest</Label>
                      <Input
                        id="interest"
                        placeholder="e.g. Villa in Dubai Marina"
                        value={newLead.interest}
                        onChange={(e) => setNewLead({ ...newLead, interest: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="assignTo">Assign To (optional)</Label>
                      <Select
                        value={newLead.assigned_to || "unassigned"}
                        onValueChange={(value) => setNewLead({ ...newLead, assigned_to: value === "unassigned" ? "" : value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select salesperson" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="unassigned">Unassigned</SelectItem>
                          {teamMembers.map((member) => (
                            <SelectItem key={member.id} value={member.id}>
                              {member.fullName || member.email}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="message">Notes</Label>
                      <Textarea
                        id="message"
                        placeholder="Initial conversation notes..."
                        value={newLead.message}
                        onChange={(e) => setNewLead({ ...newLead, message: e.target.value })}
                        rows={3}
                      />
                    </div>
                    <Button
                      className="w-full bg-[hsl(var(--gold))] text-[hsl(var(--charcoal))] hover:bg-[hsl(var(--gold))]/90"
                      onClick={handleCreateLead}
                      disabled={isCreatingLead}
                    >
                      {isCreatingLead ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Creating...
                        </>
                      ) : (
                        <>
                          <Send className="w-4 h-4 mr-2" />
                          Create Lead
                        </>
                      )}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
              </div>
            </div>

            {leads.length === 0 ? (
              <div className="p-12 text-center">
                <Phone className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No leads yet</h3>
                <p className="text-muted-foreground">
                  Create your first lead from a telecalling session
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Assigned To</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="w-[60px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredLeads.map((lead) => (
                      <TableRow key={lead.id} className="cursor-pointer hover:bg-muted/50">
                        <TableCell>
                          <div>
                            <div className="font-medium">{lead.full_name}</div>
                            {lead.interest && (
                              <div className="text-xs text-muted-foreground">{lead.interest}</div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <a href={`mailto:${lead.email}`} className="text-[hsl(var(--gold))] hover:underline" onClick={(e) => e.stopPropagation()}>
                              {lead.email}
                            </a>
                            {lead.phone && (
                              <div>
                                <a href={`tel:${lead.phone}`} className="hover:text-[hsl(var(--gold))]" onClick={(e) => e.stopPropagation()}>
                                  {lead.phone}
                                </a>
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <LeadStatusBadge status={lead.status} />
                        </TableCell>
                        <TableCell>
                          <Select
                            value={lead.assigned_to || "unassigned"}
                            onValueChange={(value) => handleAssignLead(lead.id, value === "unassigned" ? null : value)}
                          >
                            <SelectTrigger className="w-[140px] h-8 text-xs">
                              <SelectValue placeholder="Assign..." />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="unassigned">Unassigned</SelectItem>
                              {teamMembers.map((member) => (
                                <SelectItem key={member.id} value={member.id}>
                                  {member.fullName || member.email}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {format(new Date(lead.created_at), "MMM d, yyyy")}
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="icon" onClick={() => { setSelectedLead(lead); setIsLeadDialogOpen(true); }}>
                            <Eye className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
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
          <div className="space-y-6">
            <CallStatsCard userId={user?.id} />
          </div>
        </TabsContent>

        {/* Calendar Tab */}
        <TabsContent value="calendar" className="mt-0">
          <FollowUpCalendar onLeadClick={handleLeadClick} />
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
        isAdmin={false}
      />
    </UnifiedDashboardLayout>
  );
};

export default TelesalesDashboard;
