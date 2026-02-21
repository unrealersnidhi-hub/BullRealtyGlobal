import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  Loader2,
  Mail,
  Phone,
  Calendar,
  ClipboardList,
  Eye,
  Flame,
  Snowflake,
  ThermometerSun,
  Users,
  Filter,
  Globe,
  MessageCircle,
  Bot,
  FolderOpen,
  CheckCircle,
  XCircle,
  Clock,
  FileText,
  UserPlus,
  Trash2,
  Download,
  FileSpreadsheet,
  MapPin,
  UserCog,
  ClipboardCheck,
} from "lucide-react";
import { format } from "date-fns";
import { LeadStatusBadge, type LeadStatus } from "@/components/leads/LeadStatusBadge";
import { LeadDetailDialog } from "@/components/leads/LeadDetailDialog";
import { FollowUpCalendar } from "@/components/leads/FollowUpCalendar";
import { useLeadNotifications } from "@/hooks/useLeadNotifications";
import { DashboardStatsCard } from "@/components/admin/DashboardStatsCard";
import { MISReportsDashboard } from "@/components/admin/MISReportsDashboard";
import { CallStatsCard } from "@/components/leads/CallStatsCard";
import { LocationToggle } from "@/components/location/LocationToggle";
import { LiveLocationTracker } from "@/components/admin/LiveLocationTracker";
import { UnifiedDashboardLayout } from "@/components/admin/UnifiedDashboardLayout";
import { ProfileSettings } from "@/components/profile/ProfileSettings";
import { useSessionManagement } from "@/hooks/useSessionManagement";
import { LeadImportButton } from "@/components/leads/LeadImportButton";
import { cn } from "@/lib/utils";
import { SalesTargetBoard } from "@/components/admin/SalesTargetBoard";
import { PerformanceBoard } from "@/components/admin/PerformanceBoard";
import { TeamAvailabilityToggle } from "@/components/admin/TeamAvailabilityToggle";
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
  createdAt: string;
  lastSignIn: string | null;
  country: 'dubai' | 'india' | null;
}

interface Document {
  id: string;
  title: string;
  file_name: string;
  file_url: string;
  file_type: string | null;
  status: string | null;
  category: string | null;
  uploaded_by: string;
  created_at: string;
  lead_id: string | null;
}

type CountryCode = 'dubai' | 'india';

const ManagerDashboard = () => {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingTeam, setIsLoadingTeam] = useState(false);
  const [isLoadingDocs, setIsLoadingDocs] = useState(false);
  const [user, setUser] = useState<{ email?: string; fullName?: string; id?: string; country?: CountryCode | null } | null>(null);
  const [userRoles, setUserRoles] = useState<string[]>([]);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [isLeadDialogOpen, setIsLeadDialogOpen] = useState(false);
  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const [isCreateUserOpen, setIsCreateUserOpen] = useState(false);
  const [isCreatingUser, setIsCreatingUser] = useState(false);
  const [deleteUserId, setDeleteUserId] = useState<string | null>(null);
  const [isDeletingUser, setIsDeletingUser] = useState(false);
  const [newUserForm, setNewUserForm] = useState({
    email: "",
    password: "",
    fullName: "",
    country: "dubai" as CountryCode,
  });
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const activeTab = searchParams.get("tab") || "command";
  const { notifyLeadAssigned } = useLeadNotifications();
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

      // Verify manager or admin role
      if (!userRoleList.includes("manager") && !userRoleList.includes("admin") && !userRoleList.includes("super_admin")) {
        if (userRoleList.includes("mis")) {
          navigate("/mis/dashboard");
        } else if (userRoleList.includes("telesales")) {
          navigate("/telesales/dashboard");
        } else if (userRoleList.includes("hr")) {
          navigate("/hr/dashboard");
        } else if (userRoleList.includes("user")) {
          navigate("/user/dashboard");
        } else if (userRoleList.includes("blog_writer")) {
          navigate("/admin/blog");
        } else {
          await supabase.auth.signOut();
          toast.error("Access denied. No valid role assigned.");
          navigate("/admin");
        }
        return;
      }

      // Get profile info
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
      fetchDocuments();
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
    setIsLoadingTeam(true);
    try {
      const response = await supabase.functions.invoke("list-team-members");
      if (response.error) throw new Error(response.error.message);
      if (response.data?.error) throw new Error(response.data.error);

      // Show ALL team members
      setTeamMembers(response.data?.users || []);
    } catch (error: any) {
      console.error("Error fetching team members:", error);
      toast.error("Failed to load team members");
    } finally {
      setIsLoadingTeam(false);
    }
  };

  const fetchDocuments = async () => {
    setIsLoadingDocs(true);
    try {
      const { data, error } = await supabase
        .from("documents")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setDocuments(data || []);
    } catch (error) {
      console.error("Error fetching documents:", error);
    } finally {
      setIsLoadingDocs(false);
    }
  };

  const handleAssignLead = async (leadId: string, assignedTo: string | null) => {
    try {
      const { error } = await supabase
        .from("leads")
        .update({ assigned_to: assignedTo })
        .eq("id", leadId);

      if (error) throw error;

      const lead = leads.find((l) => l.id === leadId);
      setLeads(
        leads.map((l) =>
          l.id === leadId ? { ...l, assigned_to: assignedTo } : l
        )
      );

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

  const handleDocumentAction = async (docId: string, action: 'approved' | 'rejected') => {
    try {
      const { error } = await supabase
        .from("documents")
        .update({ 
          status: action,
          approved_by: user?.id,
          approved_at: new Date().toISOString(),
        })
        .eq("id", docId);

      if (error) throw error;

      setDocuments(documents.map(d => 
        d.id === docId ? { ...d, status: action } : d
      ));
      toast.success(`Document ${action}`);
    } catch (error) {
      console.error("Error updating document:", error);
      toast.error("Failed to update document status");
    }
  };

  const handleViewDocument = async (doc: Document) => {
    try {
      const storagePath = extractStoragePath(doc.file_url);
      const { data, error } = await supabase.storage
        .from("documents")
        .createSignedUrl(storagePath, 3600);
      if (error) throw error;
      window.open(data.signedUrl, '_blank');
    } catch (error) {
      console.error("Error viewing document:", error);
      toast.error("Failed to open document. Please try again.");
    }
  };

  const extractStoragePath = (fileUrl: string): string => {
    const urlParts = fileUrl.split('/documents/');
    if (urlParts.length > 1) {
      return urlParts[1];
    }
    return fileUrl;
  };

  const handleCreateUser = async () => {
    if (!newUserForm.email || !newUserForm.password) {
      toast.error("Email and password are required");
      return;
    }

    if (newUserForm.password.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }

    setIsCreatingUser(true);
    try {
      const response = await supabase.functions.invoke("create-team-user", {
        body: {
          email: newUserForm.email,
          password: newUserForm.password,
          fullName: newUserForm.fullName,
          role: "user",
          country: user?.country || newUserForm.country,
        },
      });

      if (response.error) throw new Error(response.error.message);
      if (response.data?.error) throw new Error(response.data.error);

      toast.success(`Sales team member ${newUserForm.email} created successfully`);
      setIsCreateUserOpen(false);
      setNewUserForm({ email: "", password: "", fullName: "", country: "dubai" });
      fetchTeamMembers();
    } catch (error: any) {
      console.error("Error creating user:", error);
      toast.error(error.message || "Failed to create user");
    } finally {
      setIsCreatingUser(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!deleteUserId) return;

    setIsDeletingUser(true);
    try {
      const response = await supabase.functions.invoke("delete-team-member", {
        body: { userId: deleteUserId },
      });

      if (response.error) throw new Error(response.error.message);
      if (response.data?.error) throw new Error(response.data.error);

      toast.success("Team member deleted successfully");
      setDeleteUserId(null);
      fetchTeamMembers();
    } catch (error: any) {
      console.error("Error deleting user:", error);
      toast.error(error.message || "Failed to delete user");
    } finally {
      setIsDeletingUser(false);
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

  // Calculate stats
  const filteredLeads = leads.filter((l) => {
    return sourceFilter === "all" || (l.source || "website") === sourceFilter;
  });
  const uniqueSources = [...new Set(leads.map((l) => l.source || "website"))];
  const hotLeads = leads.filter((l) => l.status === "hot").length;
  const warmLeads = leads.filter((l) => l.status === "warm").length;
  const coldLeads = leads.filter((l) => l.status === "cold").length;
  const pendingDocs = documents.filter(d => d.status === 'pending').length;
  const unassignedLeads = leads.filter(l => !l.assigned_to).length;
  const salesUsers = teamMembers.filter(m => m.roles.includes("user"));

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
    { value: "command", label: "Command Centre", icon: ClipboardList },
    { value: "leads", label: "Leads", icon: ClipboardList },
    { value: "calendar", label: "Follow-ups", icon: Calendar },
    { value: "team", label: "Sales Team", icon: Users },
    { value: "documents", label: "Documents", icon: FolderOpen, badge: pendingDocs > 0 ? pendingDocs : undefined },
    { value: "reports", label: "MIS Reports", icon: FileSpreadsheet },
    { value: "targets", label: "Targets", icon: ClipboardList },
    { value: "performance", label: "Performance", icon: Users },
    { value: "attendance", label: "Attendance", icon: ClipboardCheck },
    { value: "location", label: "Location", icon: MapPin },
    { value: "profile", label: "My Profile", icon: UserCog },
  ];

  return (
    <UnifiedDashboardLayout userEmail={user?.email} userRoles={userRoles} userCountry={user?.country}>
      {/* Welcome Section */}
      <div className="mb-6 md:mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
            Manager Dashboard<span className="text-[hsl(var(--gold))]">.</span>
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage your team, assign leads, and track performance
          </p>
        </div>
        <LeadImportButton onImportComplete={fetchLeads} />
      </div>

      {/* Location Sharing */}
      <div className="mb-6">
        <LocationToggle userId={user?.id} />
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 md:gap-4 mb-6 md:mb-8">
        <DashboardStatsCard label="Total Leads" value={leads.length} icon={ClipboardList} />
        <DashboardStatsCard label="Unassigned" value={unassignedLeads} icon={Mail} color="text-amber-500" />
        <DashboardStatsCard label="Hot" value={hotLeads} icon={Flame} color="text-red-500" />
        <DashboardStatsCard label="Warm" value={warmLeads} icon={ThermometerSun} color="text-orange-500" />
        <DashboardStatsCard label="Cold" value={coldLeads} icon={Snowflake} color="text-blue-500" />
        <DashboardStatsCard label="Pending Docs" value={pendingDocs} icon={FolderOpen} color="text-amber-500" />
      </div>

      <EnterpriseTabNav activeTab={activeTab} basePath="/manager/dashboard" tabs={tabs} />

      {/* Tab Content */}
      <Tabs value={activeTab}>
        {/* Command Centre */}
        <TabsContent value="command" className="mt-0">
          <CommandCentre showAll={true} />
        </TabsContent>

        {/* Leads Tab */}
        <TabsContent value="leads" className="mt-0">
          <div className="bg-card rounded-xl border border-border/50 overflow-hidden">
            <div className="p-6 border-b border-border/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold">All Leads</h2>
                <p className="text-sm text-muted-foreground">
                  Assign leads to your sales team members ({unassignedLeads} unassigned)
                </p>
              </div>
              <Select value={sourceFilter} onValueChange={setSourceFilter}>
                <SelectTrigger className="w-[140px]">
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Filter by source" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sources</SelectItem>
                  {uniqueSources.map((source) => (
                    <SelectItem key={source} value={source}>
                      <span className="capitalize">{source.replace("-", " ")}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {filteredLeads.length === 0 ? (
              <div className="p-12 text-center">
                <Mail className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No leads yet</h3>
                <p className="text-muted-foreground">
                  Leads will appear here when visitors submit forms.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Source</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Assigned To</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="w-[60px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredLeads.map((lead) => (
                      <TableRow key={lead.id} className="cursor-pointer hover:bg-muted/50">
                        <TableCell className="font-medium">{lead.full_name}</TableCell>
                        <TableCell>
                          <a href={`mailto:${lead.email}`} className="text-[hsl(var(--gold))] hover:underline" onClick={(e) => e.stopPropagation()}>
                            {lead.email}
                          </a>
                        </TableCell>
                        <TableCell>
                          {lead.phone ? (
                            <a href={`tel:${lead.phone}`} className="hover:text-[hsl(var(--gold))]" onClick={(e) => e.stopPropagation()}>
                              {lead.phone}
                            </a>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5">
                            {lead.source === "whatsapp" && <MessageCircle className="w-3.5 h-3.5 text-[#25D366]" />}
                            {lead.source === "ai-chatbot" && <Bot className="w-3.5 h-3.5 text-[hsl(var(--gold))]" />}
                            {(lead.source === "website" || !lead.source) && <Globe className="w-3.5 h-3.5 text-muted-foreground" />}
                            <span className="text-xs capitalize">{(lead.source || "website").replace("-", " ")}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <LeadStatusBadge status={lead.status} />
                        </TableCell>
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <Select
                            value={lead.assigned_to || "unassigned"}
                            onValueChange={(value) => handleAssignLead(lead.id, value === "unassigned" ? null : value)}
                          >
                            <SelectTrigger className="w-[140px] h-8">
                              <SelectValue placeholder="Assign..." />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="unassigned">
                                <span className="text-muted-foreground">Unassigned</span>
                              </SelectItem>
                              {salesUsers.map((member) => (
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

        {/* Calendar Tab */}
        <TabsContent value="calendar" className="mt-0">
          <FollowUpCalendar onLeadClick={handleLeadClick} />
        </TabsContent>

        {/* Team Tab */}
        <TabsContent value="team" className="mt-0">
          <div className="bg-card rounded-xl border border-border/50 overflow-hidden">
            <div className="p-6 border-b border-border/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold">Sales Team</h2>
                <p className="text-sm text-muted-foreground">
                  Manage your team members and their assigned leads
                </p>
              </div>
              <Dialog open={isCreateUserOpen} onOpenChange={setIsCreateUserOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-[hsl(var(--gold))] hover:bg-[hsl(var(--gold-light))] text-[hsl(var(--charcoal))]">
                    <UserPlus className="w-4 h-4 mr-2" />
                    Add Team Member
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add Sales Team Member</DialogTitle>
                    <DialogDescription>
                      Create a new sales team member who can manage assigned leads
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label>Full Name</Label>
                      <Input
                        value={newUserForm.fullName}
                        onChange={(e) => setNewUserForm({ ...newUserForm, fullName: e.target.value })}
                        placeholder="John Doe"
                      />
                    </div>
                    <div>
                      <Label>Email *</Label>
                      <Input
                        type="email"
                        value={newUserForm.email}
                        onChange={(e) => setNewUserForm({ ...newUserForm, email: e.target.value })}
                        placeholder="john@example.com"
                      />
                    </div>
                    <div>
                      <Label>Password *</Label>
                      <Input
                        type="password"
                        value={newUserForm.password}
                        onChange={(e) => setNewUserForm({ ...newUserForm, password: e.target.value })}
                        placeholder="Minimum 8 characters"
                      />
                    </div>
                    <Button
                      className="w-full bg-[hsl(var(--gold))] text-[hsl(var(--charcoal))] hover:bg-[hsl(var(--gold))]/90"
                      onClick={handleCreateUser}
                      disabled={isCreatingUser}
                    >
                      {isCreatingUser ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                      Create Team Member
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {isLoadingTeam ? (
              <div className="p-8 text-center">
                <Loader2 className="w-6 h-6 animate-spin mx-auto" />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Leads</TableHead>
                    <TableHead>Country</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {teamMembers.map((member) => {
                    const memberLeads = leads.filter(l => l.assigned_to === member.id).length;
                    return (
                      <TableRow key={member.id}>
                        <TableCell className="font-medium">{member.fullName || "—"}</TableCell>
                        <TableCell>{member.email}</TableCell>
                        <TableCell>
                          <Badge variant="secondary">{memberLeads} leads</Badge>
                        </TableCell>
                        <TableCell>
                          {member.country === "dubai" && "🇦🇪 Dubai"}
                          {member.country === "india" && "🇮🇳 India"}
                          {!member.country && "—"}
                        </TableCell>
                        <TableCell>
                          {member.id !== user?.id && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-destructive"
                              onClick={() => setDeleteUserId(member.id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </div>
        </TabsContent>

        {/* Documents Tab */}
        <TabsContent value="documents" className="mt-0">
          <div className="bg-card rounded-xl border border-border/50 overflow-hidden">
            <div className="p-6 border-b border-border/50">
              <h2 className="text-lg font-semibold">Document Approvals</h2>
              <p className="text-sm text-muted-foreground">
                Review and approve documents submitted by your team
              </p>
            </div>

            {isLoadingDocs ? (
              <div className="p-8 text-center">
                <Loader2 className="w-6 h-6 animate-spin mx-auto" />
              </div>
            ) : documents.length === 0 ? (
              <div className="p-12 text-center">
                <FolderOpen className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No documents yet</h3>
                <p className="text-muted-foreground">
                  Documents submitted by your team will appear here
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>File</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {documents.map((doc) => (
                    <TableRow key={doc.id}>
                      <TableCell className="font-medium">{doc.title}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{doc.file_name}</TableCell>
                      <TableCell>
                        <span className={cn(
                          "px-2 py-1 rounded-full text-xs font-medium inline-flex items-center gap-1",
                          doc.status === 'approved' && "bg-emerald-500/10 text-emerald-500",
                          doc.status === 'pending' && "bg-amber-500/10 text-amber-500",
                          doc.status === 'rejected' && "bg-red-500/10 text-red-500"
                        )}>
                          {doc.status === 'approved' && <CheckCircle className="w-3 h-3" />}
                          {doc.status === 'pending' && <Clock className="w-3 h-3" />}
                          {doc.status === 'rejected' && <XCircle className="w-3 h-3" />}
                          {doc.status || 'pending'}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {format(new Date(doc.created_at), "MMM d, yyyy")}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button variant="ghost" size="sm" onClick={() => handleViewDocument(doc)}>
                            <Eye className="w-4 h-4" />
                          </Button>
                          {doc.status === 'pending' && (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-emerald-500"
                                onClick={() => handleDocumentAction(doc.id, 'approved')}
                              >
                                <CheckCircle className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-red-500"
                                onClick={() => handleDocumentAction(doc.id, 'rejected')}
                              >
                                <XCircle className="w-4 h-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </TabsContent>

        {/* Reports Tab */}
        <TabsContent value="reports" className="mt-0">
          <MISReportsDashboard />
        </TabsContent>

        {/* Location Tab */}
        <TabsContent value="location" className="mt-0">
          <LiveLocationTracker />
        </TabsContent>

        {/* Targets Tab */}
        <TabsContent value="targets" className="mt-0">
          <SalesTargetBoard teamMembers={teamMembers} isAdmin={true} />
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

      {/* Delete User Confirmation */}
      <AlertDialog open={!!deleteUserId} onOpenChange={(open) => !open && setDeleteUserId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Team Member?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The team member will be removed from the system.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteUser}
              disabled={isDeletingUser}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeletingUser ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </UnifiedDashboardLayout>
  );
};

export default ManagerDashboard;
