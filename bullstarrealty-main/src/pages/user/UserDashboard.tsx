import { useEffect, useState, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  Calculator,
  FolderOpen,
  FileText,
  Upload,
  PhoneCall,
  UserCog,
  Search,
  X,
  Filter,
  Activity,
  Clock,
  TrendingUp,
  ClipboardCheck,
} from "lucide-react";
import { format } from "date-fns";
import { LeadStatusBadge, type LeadStatus } from "@/components/leads/LeadStatusBadge";
import { LeadDetailDialog } from "@/components/leads/LeadDetailDialog";
import { FollowUpCalendar } from "@/components/leads/FollowUpCalendar";
import { CallStatsCard } from "@/components/leads/CallStatsCard";
import { QuotationGenerator } from "@/components/admin/QuotationGenerator";
import { DashboardStatsCard } from "@/components/admin/DashboardStatsCard";
import { LocationToggle } from "@/components/location/LocationToggle";
import { UnifiedDashboardLayout } from "@/components/admin/UnifiedDashboardLayout";
import { ProfileSettings } from "@/components/profile/ProfileSettings";
import { PendingTasksWidget } from "@/components/dashboard/PendingTasksWidget";
import { RecentActivityWidget } from "@/components/dashboard/RecentActivityWidget";
import { cn } from "@/lib/utils";
import { useSessionManagement } from "@/hooks/useSessionManagement";
import { LeadImportButton } from "@/components/leads/LeadImportButton";
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

type CountryCode = 'dubai' | 'india';

const UserDashboard = () => {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<{ email?: string; fullName?: string; id?: string; country?: CountryCode | null } | null>(null);
  const [userRoles, setUserRoles] = useState<string[]>([]);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [isLeadDialogOpen, setIsLeadDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
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

      // Check user roles
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

      if (userRoleList.includes("telesales")) {
        navigate("/telesales/dashboard");
        return;
      }

      if (userRoleList.includes("hr")) {
        navigate("/hr/dashboard");
        return;
      }

      if (userRoleList.includes("blog_writer") && !userRoleList.includes("user")) {
        navigate("/admin/blog");
        return;
      }

      // Must have user role to access this dashboard
      if (!userRoleList.includes("user")) {
        await supabase.auth.signOut();
        toast.error("Access denied. No valid role assigned. Please contact your administrator.");
        navigate("/admin");
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
    };

    checkAuth();
    
    return () => {
      stopSessionMonitoring();
    };
  }, [navigate, startSessionMonitoring, stopSessionMonitoring]);

  const fetchLeads = async () => {
    try {
      // RLS policy will automatically filter to only show assigned leads
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
  const hotLeads = leads.filter((l) => l.status === "hot").length;
  const warmLeads = leads.filter((l) => l.status === "warm").length;
  const coldLeads = leads.filter((l) => l.status === "cold").length;

  const filteredLeads = useMemo(() => {
    return leads.filter((lead) => {
      const matchesSearch = !searchQuery ||
        lead.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        lead.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (lead.phone && lead.phone.includes(searchQuery)) ||
        (lead.interest && lead.interest.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesStatus = statusFilter === "all" || lead.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [leads, searchQuery, statusFilter]);

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
    { value: "leads", label: "My Leads", icon: ClipboardList },
    { value: "calls", label: "Call Log", icon: PhoneCall },
    { value: "calendar", label: "Follow-ups", icon: Calendar },
    { value: "targets", label: "Targets", icon: TrendingUp },
    { value: "quotations", label: "Quotations", icon: Calculator },
    { value: "documents", label: "Documents", icon: FolderOpen },
    { value: "attendance", label: "Attendance", icon: ClipboardCheck },
    { value: "profile", label: "My Profile", icon: UserCog },
  ];

  return (
    <UnifiedDashboardLayout userEmail={user?.email} userRoles={userRoles} userCountry={user?.country}>
      {/* Welcome Section */}
      <div className="mb-6 md:mb-8">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
          Welcome{user?.fullName ? `, ${user.fullName}` : ""}<span className="text-[hsl(var(--gold))]">!</span>
        </h1>
        <p className="text-muted-foreground mt-1">
          Manage your leads, follow-ups, and quotations
        </p>
      </div>

      {/* Location Sharing */}
      <div className="mb-6">
        <LocationToggle userId={user?.id} />
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 md:gap-4 mb-6 md:mb-8">
        <DashboardStatsCard label="My Leads" value={leads.length} icon={ClipboardList} />
        <DashboardStatsCard label="Hot" value={hotLeads} icon={Flame} color="text-red-500" />
        <DashboardStatsCard label="Warm" value={warmLeads} icon={ThermometerSun} color="text-orange-500" />
        <DashboardStatsCard label="Cold" value={coldLeads} icon={Snowflake} color="text-blue-500" />
        <DashboardStatsCard label="With Contact" value={leads.filter((l) => l.phone).length} icon={Phone} />
      </div>

      <EnterpriseTabNav activeTab={activeTab} basePath="/user/dashboard" tabs={tabs} />

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
              <Input placeholder="Search by name, email, phone, or interest..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9 h-10" />
              {searchQuery && (
                <Button variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7" onClick={() => setSearchQuery("")}>
                  <X className="w-3.5 h-3.5" />
                </Button>
              )}
            </div>
            <div className="flex flex-wrap gap-2 items-center">
              <Filter className="w-4 h-4 text-muted-foreground shrink-0" />
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[120px] h-8 text-xs"><SelectValue placeholder="Status" /></SelectTrigger>
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
              {(searchQuery || statusFilter !== "all") && (
                <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => { setSearchQuery(""); setStatusFilter("all"); }}>
                  <X className="w-3.5 h-3.5 mr-1" /> Clear
                </Button>
              )}
            </div>
          </div>

          <div className="bg-card rounded-xl border border-border/50 overflow-hidden">
            <div className="p-6 border-b border-border/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold">My Assigned Leads</h2>
                <p className="text-sm text-muted-foreground">
                  Click on a lead to add notes, schedule follow-ups, and update status
                </p>
              </div>
              <LeadImportButton onImportComplete={fetchLeads} />
            </div>

            {filteredLeads.length === 0 ? (
              <div className="p-12 text-center">
                <Mail className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">{searchQuery || statusFilter !== "all" ? "No matching leads" : "No leads assigned yet"}</h3>
                <p className="text-muted-foreground">
                  {searchQuery || statusFilter !== "all" ? "Try adjusting your search or filters." : "Leads will appear here when they are assigned to you by your manager."}
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
                      <TableHead>Status</TableHead>
                      <TableHead>Interest</TableHead>
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
                          <LeadStatusBadge status={lead.status} />
                        </TableCell>
                        <TableCell>
                          {lead.interest ? (
                            <span className="px-2 py-1 rounded-full bg-accent-soft text-xs font-medium capitalize">
                              {lead.interest}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
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

        {/* Calls Tab */}
        <TabsContent value="calls" className="mt-0">
          <div className="space-y-6">
            <CallStatsCard userId={user?.id} />
            <div className="bg-card rounded-xl border border-border/50 p-6">
              <h2 className="text-lg font-semibold mb-4">Quick Call Access</h2>
              <p className="text-sm text-muted-foreground mb-4">
                Click on a lead to log calls. Your daily stats are shown above.
              </p>
              <div className="grid gap-3">
                {leads.filter(l => l.phone).slice(0, 8).map((lead) => (
                  <div
                    key={lead.id}
                    className="flex items-center justify-between p-3 rounded-lg border border-border/50 hover:bg-muted/50 cursor-pointer transition-colors"
                    onClick={() => {
                      setSelectedLead(lead);
                      setIsLeadDialogOpen(true);
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-muted">
                        <Phone className="w-4 h-4 text-muted-foreground" />
                      </div>
                      <div>
                        <div className="font-medium">{lead.full_name}</div>
                        <div className="text-sm text-muted-foreground">{lead.phone}</div>
                      </div>
                    </div>
                    <LeadStatusBadge status={lead.status} />
                  </div>
                ))}
                {leads.filter(l => l.phone).length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <Phone className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p>No leads with phone numbers assigned yet</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Calendar Tab */}
        <TabsContent value="calendar" className="mt-0">
          <FollowUpCalendar onLeadClick={handleLeadClick} />
        </TabsContent>

        {/* Targets Tab */}
        <TabsContent value="targets" className="mt-0">
          <SalesTargetBoard teamMembers={user?.id ? [{ id: user.id, email: user.email || '', fullName: user.fullName || null, roles: userRoles }] : []} />
        </TabsContent>

        {/* Quotations Tab */}
        <TabsContent value="quotations" className="mt-0">
          <QuotationGenerator />
        </TabsContent>

        {/* Documents Tab */}
        <TabsContent value="documents" className="mt-0">
          <SalesDocumentUpload userId={user?.id} leads={leads} />
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
        isAdmin={false}
      />
    </UnifiedDashboardLayout>
  );
};

// Document Upload Component for Sales
const SalesDocumentUpload = ({ userId, leads }: { userId?: string; leads: Lead[] }) => {
  const [documents, setDocuments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [title, setTitle] = useState("");
  const [selectedLeadId, setSelectedLeadId] = useState<string>("");
  const [file, setFile] = useState<File | null>(null);

  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
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
      setIsLoading(false);
    }
  };

  const handleUpload = async () => {
    if (!file || !title || !userId) {
      toast.error("Please fill in all fields");
      return;
    }

    setIsUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const storagePath = `${userId}/${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from("documents")
        .upload(storagePath, file);

      if (uploadError) throw uploadError;

      const { error: insertError } = await supabase
        .from("documents")
        .insert({
          title,
          file_name: file.name,
          file_url: storagePath,
          file_type: file.type,
          file_size: file.size,
          uploaded_by: userId,
          lead_id: selectedLeadId || null,
          status: 'pending',
        });

      if (insertError) throw insertError;

      toast.success("Document uploaded and sent for approval");
      setTitle("");
      setFile(null);
      setSelectedLeadId("");
      fetchDocuments();
    } catch (error) {
      console.error("Error uploading document:", error);
      toast.error("Failed to upload document");
    } finally {
      setIsUploading(false);
    }
  };

  const getStoragePath = (fileUrl: string): string => {
    if (fileUrl.includes('/documents/')) {
      const parts = fileUrl.split('/documents/');
      return parts[parts.length - 1];
    }
    return fileUrl;
  };

  const handleViewDocument = async (doc: any) => {
    try {
      const storagePath = getStoragePath(doc.file_url);
      
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

  return (
    <div className="space-y-6">
      {/* Upload Form */}
      <div className="bg-card rounded-xl border border-border/50 p-6">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Upload className="w-5 h-5 text-[hsl(var(--gold))]" />
          Upload Document
        </h2>
        <div className="grid gap-4 md:grid-cols-4">
          <div>
            <label className="text-sm font-medium mb-1 block">Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Document title"
              className="w-full px-3 py-2 rounded-lg border border-border/50 bg-background"
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Lead (optional)</label>
            <select
              value={selectedLeadId}
              onChange={(e) => setSelectedLeadId(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-border/50 bg-background"
            >
              <option value="">Select lead</option>
              {leads.map((lead) => (
                <option key={lead.id} value={lead.id}>
                  {lead.full_name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">File</label>
            <input
              type="file"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="w-full px-3 py-2 rounded-lg border border-border/50 bg-background text-sm"
            />
          </div>
          <div className="flex items-end">
            <Button
              onClick={handleUpload}
              disabled={isUploading || !file || !title}
              className="w-full bg-[hsl(var(--gold))] text-[hsl(var(--charcoal))] hover:bg-[hsl(var(--gold))]/90"
            >
              {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Upload"}
            </Button>
          </div>
        </div>
      </div>

      {/* Documents List */}
      <div className="bg-card rounded-xl border border-border/50 overflow-hidden">
        <div className="p-6 border-b border-border/50">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <FileText className="w-5 h-5 text-[hsl(var(--gold))]" />
            My Documents
          </h2>
        </div>
        {isLoading ? (
          <div className="p-8 text-center">
            <Loader2 className="w-6 h-6 animate-spin mx-auto" />
          </div>
        ) : documents.length === 0 ? (
          <div className="p-12 text-center">
            <FolderOpen className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No documents yet</h3>
            <p className="text-muted-foreground">Upload your first document above</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>File</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {documents.map((doc) => (
                <TableRow key={doc.id}>
                  <TableCell className="font-medium">{doc.title}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{doc.file_name}</TableCell>
                  <TableCell>
                    <span className={cn(
                      "px-2 py-1 rounded-full text-xs font-medium",
                      doc.status === 'approved' && "bg-emerald-500/10 text-emerald-500",
                      doc.status === 'pending' && "bg-amber-500/10 text-amber-500",
                      doc.status === 'rejected' && "bg-red-500/10 text-red-500"
                    )}>
                      {doc.status || 'pending'}
                    </span>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {format(new Date(doc.created_at), "MMM d, yyyy")}
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm" onClick={() => handleViewDocument(doc)}>
                      <Eye className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
};

export default UserDashboard;
