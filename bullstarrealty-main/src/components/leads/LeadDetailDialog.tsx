import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { LeadStatusBadge, type LeadStatus } from "./LeadStatusBadge";
import { LeadActivityTimeline } from "./LeadActivityTimeline";
import { LeadAssignmentHistory } from "./LeadAssignmentHistory";
import { CallLogForm } from "./CallLogForm";
import { CallLogHistory } from "./CallLogHistory";
import { LeadEditForm } from "./LeadEditForm";
import { LeadCountryTransfer } from "./LeadCountryTransfer";
import { MultiAssigneeSelector } from "./MultiAssigneeSelector";
import { LeadInterestTags } from "./LeadInterestTags";
import { MeetingScheduler } from "./MeetingScheduler";
import { LeadAccountDetails } from "./LeadAccountDetails";
import { ClickToCallButton } from "./ClickToCallButton";
import { FollowUpCompleteDialog } from "./FollowUpCompleteDialog";
import { useLeadNotifications } from "@/hooks/useLeadNotifications";
import { toast } from "sonner";
import { format, differenceInDays } from "date-fns";
import { cn } from "@/lib/utils";
import {
  ArrowLeftRight, CalendarIcon, Clock, Edit, Globe, Info, Loader2,
  Mail, MessageSquare, Phone, PhoneCall, Plus, Send, Tag, Trash2,
  User, UserCheck, Activity, Briefcase, CalendarCheck, Users,
} from "lucide-react";

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
  country?: "dubai" | "india" | null;
}

interface FollowUp {
  id: string;
  lead_id: string;
  user_id: string;
  scheduled_at: string;
  title: string;
  description: string | null;
  completed: boolean;
  completed_at: string | null;
  created_at: string;
  stage?: string;
  follow_up_type?: string;
}

interface LeadNote {
  id: string;
  lead_id: string;
  user_id: string;
  content: string;
  created_at: string;
}

interface UserProfile {
  user_id: string;
  full_name: string | null;
  email: string | null;
}

interface LeadDetailDialogProps {
  lead: Lead | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onLeadUpdate: (lead: Lead) => void;
  teamMembers?: { id: string; email: string; fullName: string | null; roles?: string[] }[];
  isAdmin?: boolean;
}

export const LeadDetailDialog = ({
  lead, open, onOpenChange, onLeadUpdate, teamMembers = [], isAdmin = false,
}: LeadDetailDialogProps) => {
  const [followUps, setFollowUps] = useState<FollowUp[]>([]);
  const [notes, setNotes] = useState<LeadNote[]>([]);
  const [userProfiles, setUserProfiles] = useState<Record<string, UserProfile>>({});
  const [isLoadingFollowUps, setIsLoadingFollowUps] = useState(false);
  const [isLoadingNotes, setIsLoadingNotes] = useState(false);
  const [newNote, setNewNote] = useState("");
  const [isSavingNote, setIsSavingNote] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [callLogCount, setCallLogCount] = useState(0);
  const [noteCount, setNoteCount] = useState(0);
  const [followUpCount, setFollowUpCount] = useState(0);
  const [isEditMode, setIsEditMode] = useState(false);
  const [canEdit, setCanEdit] = useState(false);
  const [showFollowUpForm, setShowFollowUpForm] = useState(false);
  const [showMeetingScheduler, setShowMeetingScheduler] = useState(false);
  const [followUpTitle, setFollowUpTitle] = useState("");
  const [followUpDescription, setFollowUpDescription] = useState("");
  const [followUpDate, setFollowUpDate] = useState<Date | undefined>(undefined);
  const [followUpTime, setFollowUpTime] = useState("09:00");
  const [followUpType, setFollowUpType] = useState("call_back");
  const [followUpStage, setFollowUpStage] = useState("scheduled");
  const [followUpRemarks, setFollowUpRemarks] = useState("");
  const [isSavingFollowUp, setIsSavingFollowUp] = useState(false);
  const [activeTab, setActiveTab] = useState("activity");
  const [completingFollowUp, setCompletingFollowUp] = useState<FollowUp | null>(null);

  const { notifyStatusChanged, notifyNoteAdded, notifyFollowupScheduled, notifyFollowupCompleted } = useLeadNotifications();

  useEffect(() => {
    if (lead && open) {
      fetchFollowUps();
      fetchNotes();
      fetchCounts();
      checkEditPermission();
      setIsEditMode(false);
      setShowMeetingScheduler(false);
      setShowFollowUpForm(false);
      setActiveTab("activity");
    }
  }, [lead?.id, open]);

  const checkEditPermission = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setCanEdit(false); return; }
      const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", session.user.id);
      const roleList = roles?.map(r => r.role) || [];
      setCanEdit(
        roleList.includes("admin") || roleList.includes("super_admin") ||
        roleList.includes("manager") || roleList.includes("mis") || isAdmin
      );
    } catch { setCanEdit(false); }
  };

  const fetchCounts = async () => {
    if (!lead) return;
    try {
      const [callRes, noteRes, fuRes] = await Promise.all([
        supabase.from("call_logs").select("id", { count: "exact", head: true }).eq("lead_id", lead.id),
        supabase.from("lead_notes").select("id", { count: "exact", head: true }).eq("lead_id", lead.id),
        supabase.from("follow_ups").select("id", { count: "exact", head: true }).eq("lead_id", lead.id).eq("completed", false),
      ]);
      setCallLogCount(callRes.count || 0);
      setNoteCount(noteRes.count || 0);
      setFollowUpCount(fuRes.count || 0);
    } catch (e) { console.error("Error fetching counts:", e); }
  };

  const fetchUserProfiles = async (userIds: string[]) => {
    const uniqueIds = [...new Set(userIds.filter(Boolean))];
    if (uniqueIds.length === 0) return;
    const { data: profiles } = await supabase.from("profiles").select("user_id, full_name, email").in("user_id", uniqueIds);
    if (profiles) {
      const profileMap: Record<string, UserProfile> = { ...userProfiles };
      profiles.forEach(p => { profileMap[p.user_id] = p; });
      setUserProfiles(profileMap);
    }
  };

  const getUserName = (userId: string) => {
    const profile = userProfiles[userId];
    return profile?.full_name || profile?.email || "Unknown";
  };

  const fetchFollowUps = async () => {
    if (!lead) return;
    setIsLoadingFollowUps(true);
    try {
      const { data, error } = await supabase.from("follow_ups").select("*").eq("lead_id", lead.id).order("scheduled_at", { ascending: true });
      if (error) throw error;
      const fuData = data || [];
      setFollowUps(fuData);
      await fetchUserProfiles(fuData.map(f => f.user_id));
    } catch (error) { console.error("Error fetching follow-ups:", error); }
    finally { setIsLoadingFollowUps(false); }
  };

  const fetchNotes = async () => {
    if (!lead) return;
    setIsLoadingNotes(true);
    try {
      const { data, error } = await supabase.from("lead_notes").select("*").eq("lead_id", lead.id).order("created_at", { ascending: false });
      if (error) throw error;
      const noteData = data || [];
      setNotes(noteData);
      await fetchUserProfiles(noteData.map(n => n.user_id));
    } catch (error) { console.error("Error fetching notes:", error); }
    finally { setIsLoadingNotes(false); }
  };

  const handleStatusChange = async (newStatus: LeadStatus) => {
    if (!lead) return;
    const oldStatus = lead.status;
    setIsUpdatingStatus(true);
    try {
      const { error } = await supabase.from("leads").update({ status: newStatus }).eq("id", lead.id);
      if (error) throw error;
      onLeadUpdate({ ...lead, status: newStatus });
      toast.success(`Lead status updated to ${newStatus}`);
      notifyStatusChanged(lead.id, lead.full_name, lead.email, oldStatus, newStatus, lead.assigned_to || undefined, lead.phone || undefined);
    } catch (error) {
      console.error("Error updating status:", error);
      toast.error("Failed to update status");
    } finally { setIsUpdatingStatus(false); }
  };

  const handleAddNote = async () => {
    if (!lead || !newNote.trim()) return;
    setIsSavingNote(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");
      const { data, error } = await supabase.from("lead_notes").insert({ lead_id: lead.id, user_id: session.user.id, content: newNote.trim() }).select().single();
      if (error) throw error;
      setNotes([data, ...notes]);
      setNoteCount(prev => prev + 1);
      const noteContent = newNote.trim();
      setNewNote("");
      toast.success("Note added");
      await fetchUserProfiles([session.user.id]);
      notifyNoteAdded(lead.id, lead.full_name, lead.email, noteContent, lead.assigned_to || undefined);
    } catch (error) {
      console.error("Error adding note:", error);
      toast.error("Failed to add note");
    } finally { setIsSavingNote(false); }
  };

  const handleDeleteNote = async (noteId: string) => {
    try {
      const { error } = await supabase.from("lead_notes").delete().eq("id", noteId);
      if (error) throw error;
      setNotes(notes.filter((n) => n.id !== noteId));
      setNoteCount(prev => prev - 1);
      toast.success("Note deleted");
    } catch (error) { toast.error("Failed to delete note"); }
  };

  const handleAddFollowUp = async () => {
    if (!lead || !followUpTitle.trim() || !followUpDate) return;
    setIsSavingFollowUp(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");
      const [hours, minutes] = followUpTime.split(":").map(Number);
      const scheduledAt = new Date(followUpDate);
      scheduledAt.setHours(hours, minutes, 0, 0);
      const descWithRemarks = [
        followUpDescription.trim(),
        followUpRemarks.trim() ? `Remarks: ${followUpRemarks.trim()}` : '',
      ].filter(Boolean).join('\n') || null;
      const { data, error } = await supabase.from("follow_ups").insert({
        lead_id: lead.id, user_id: session.user.id,
        title: followUpTitle.trim(), description: descWithRemarks,
        scheduled_at: scheduledAt.toISOString(),
        stage: followUpStage,
        follow_up_type: followUpType,
      }).select().single();
      if (error) throw error;
      setFollowUps([...followUps, data].sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime()));
      setFollowUpCount(prev => prev + 1);
      await fetchUserProfiles([session.user.id]);
      const savedTitle = followUpTitle.trim();
      const savedDate = scheduledAt.toISOString();
      setFollowUpTitle(""); setFollowUpDescription(""); setFollowUpRemarks(""); setFollowUpDate(undefined); setFollowUpTime("09:00"); setShowFollowUpForm(false); setFollowUpStage("scheduled");
      toast.success("Follow-up scheduled");
      notifyFollowupScheduled(lead.id, lead.full_name, lead.email, savedTitle, format(new Date(savedDate), "MMM d, yyyy 'at' h:mm a"), lead.assigned_to || undefined);
    } catch (error) { toast.error("Failed to schedule follow-up"); }
    finally { setIsSavingFollowUp(false); }
  };

  const handleToggleFollowUp = async (followUp: FollowUp) => {
    if (!lead) return;
    try {
      const newStage = !followUp.completed ? "completed" : "pending";
      const { error } = await supabase.from("follow_ups").update({
        completed: !followUp.completed, completed_at: !followUp.completed ? new Date().toISOString() : null,
        stage: newStage,
      }).eq("id", followUp.id);
      if (error) throw error;
      setFollowUps(followUps.map((f) => f.id === followUp.id ? { ...f, completed: !f.completed, completed_at: !f.completed ? new Date().toISOString() : null, stage: newStage } : f));
      if (!followUp.completed) {
        setFollowUpCount(prev => prev - 1);
        notifyFollowupCompleted(lead.id, lead.full_name, lead.email, followUp.title, lead.assigned_to || undefined);
      } else { setFollowUpCount(prev => prev + 1); }
    } catch (error) { toast.error("Failed to update follow-up"); }
  };

  const handleUpdateFollowUpStage = async (followUpId: string, stage: string) => {
    try {
      const { error } = await supabase.from("follow_ups").update({ stage }).eq("id", followUpId);
      if (error) throw error;
      setFollowUps(followUps.map(f => f.id === followUpId ? { ...f, stage } : f));
      toast.success(`Stage updated to ${stage}`);
    } catch { toast.error("Failed to update stage"); }
  };

  const handleDeleteFollowUp = async (followUpId: string) => {
    try {
      const fu = followUps.find(f => f.id === followUpId);
      const { error } = await supabase.from("follow_ups").delete().eq("id", followUpId);
      if (error) throw error;
      setFollowUps(followUps.filter((f) => f.id !== followUpId));
      if (fu && !fu.completed) setFollowUpCount(prev => prev - 1);
      toast.success("Follow-up deleted");
    } catch (error) { toast.error("Failed to delete follow-up"); }
  };

  const handleEditSave = (updatedLead: Lead) => {
    onLeadUpdate(updatedLead);
    setIsEditMode(false);
  };

  if (!lead) return null;

  const daysSinceCreated = differenceInDays(new Date(), new Date(lead.created_at));
  const assignedMember = teamMembers.find(m => m.id === lead.assigned_to);

  const stageColors: Record<string, string> = {
    scheduled: "bg-sky-500/10 text-sky-600 border-sky-500/20",
    pending: "bg-amber-500/10 text-amber-600 border-amber-500/20",
    in_progress: "bg-blue-500/10 text-blue-600 border-blue-500/20",
    completed: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
    cancelled: "bg-red-500/10 text-red-600 border-red-500/20",
    rescheduled: "bg-purple-500/10 text-purple-600 border-purple-500/20",
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl w-[95vw] sm:w-full p-0 gap-0 overflow-hidden" style={{ maxHeight: '90vh', height: 'auto', display: 'flex', flexDirection: 'column' }}>
        {/* Fixed Header */}
        <DialogHeader className="px-4 pt-4 sm:px-6 sm:pt-6 pb-3 flex-shrink-0 border-b border-border">
          <DialogTitle className="flex items-center gap-2 sm:gap-3 text-base sm:text-lg">
            <User className="w-4 h-4 sm:w-5 sm:h-5 text-[hsl(var(--gold))]" />
            <span className="truncate">{lead.full_name}</span>
            <div className="flex items-center gap-1 ml-auto shrink-0">
              {canEdit && (
                <MultiAssigneeSelector leadId={lead.id} teamMembers={teamMembers} />
              )}
              {canEdit && !isEditMode && (
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setIsEditMode(true)}>
                  <Edit className="w-3.5 h-3.5" />
                </Button>
              )}
            </div>
          </DialogTitle>
        </DialogHeader>

        {/* Scrollable Body */}
        {isEditMode ? (
          <div style={{ flex: '1 1 auto', minHeight: 0, overflowY: 'auto', WebkitOverflowScrolling: 'touch' }} className="px-4 sm:px-6 py-4">
            <LeadEditForm lead={lead} teamMembers={teamMembers} onSave={handleEditSave} onCancel={() => setIsEditMode(false)} />
          </div>
        ) : (
          <div style={{ flex: '1 1 auto', minHeight: 0, overflowY: 'auto', WebkitOverflowScrolling: 'touch', overscrollBehavior: 'contain' }} className="px-4 sm:px-6 py-4">
            {/* Lead Info Header */}
            <div className="space-y-3 pb-3 border-b border-border">
              <div className="flex flex-wrap items-center gap-2 sm:gap-4">
                <div className="flex items-center gap-1.5 text-xs sm:text-sm text-muted-foreground">
                  <Mail className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                  <a href={`mailto:${lead.email}`} className="text-[hsl(var(--gold))] hover:underline truncate max-w-[180px] sm:max-w-none">{lead.email}</a>
                </div>
                {lead.phone && (
                  <div className="flex items-center gap-1.5 text-xs sm:text-sm text-muted-foreground">
                    <Phone className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                    <a href={`tel:${lead.phone}`} className="hover:text-[hsl(var(--gold))]">{lead.phone}</a>
                    <ClickToCallButton customerPhone={lead.phone} leadId={lead.id} />
                  </div>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-1.5">
                  <Label className="text-xs sm:text-sm">Status:</Label>
                  <Select value={lead.status} onValueChange={(v) => handleStatusChange(v as LeadStatus)} disabled={isUpdatingStatus}>
                    <SelectTrigger className="w-[120px] sm:w-[140px] h-7 sm:h-8 text-xs sm:text-sm">
                      <SelectValue><LeadStatusBadge status={lead.status} /></SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="new">New</SelectItem>
                      <SelectItem value="warm">Warm</SelectItem>
                      <SelectItem value="hot">Hot</SelectItem>
                      <SelectItem value="cold">Cold</SelectItem>
                      <SelectItem value="not_interested">Not Interested</SelectItem>
                      <SelectItem value="converted">Converted</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {lead.country && (
                  <Badge variant="outline" className="text-xs gap-1">
                    {lead.country === "dubai" ? "🇦🇪 Dubai" : "🇮🇳 India"}
                  </Badge>
                )}
                {canEdit && (
                  <LeadCountryTransfer
                    leadIds={[lead.id]}
                    currentCountry={lead.country as "dubai" | "india" | null}
                    onTransferComplete={() => {
                      supabase.from("leads").select("*").eq("id", lead.id).single().then(({ data }) => {
                        if (data) onLeadUpdate(data as Lead);
                      });
                    }}
                  />
                )}
              </div>

              {/* Interest Tags */}
              <LeadInterestTags leadId={lead.id} compact />

              {/* Quick Info Cards */}
              <div className="grid grid-cols-4 gap-1.5 sm:gap-2">
                <div className="bg-muted/50 rounded-lg p-1.5 sm:p-2 text-center">
                  <p className="text-[10px] sm:text-xs text-muted-foreground">Age</p>
                  <p className="font-semibold text-xs sm:text-sm">{daysSinceCreated}d</p>
                </div>
                <div className="bg-muted/50 rounded-lg p-1.5 sm:p-2 text-center">
                  <p className="text-[10px] sm:text-xs text-muted-foreground">Calls</p>
                  <p className="font-semibold text-xs sm:text-sm">{callLogCount}</p>
                </div>
                <div className="bg-muted/50 rounded-lg p-1.5 sm:p-2 text-center">
                  <p className="text-[10px] sm:text-xs text-muted-foreground">Notes</p>
                  <p className="font-semibold text-xs sm:text-sm">{noteCount}</p>
                </div>
                <div className="bg-muted/50 rounded-lg p-1.5 sm:p-2 text-center">
                  <p className="text-[10px] sm:text-xs text-muted-foreground">F/U</p>
                  <p className="font-semibold text-xs sm:text-sm">{followUpCount}</p>
                </div>
              </div>

              {/* Additional Info */}
              <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-[10px] sm:text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Clock className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                  <span>{format(new Date(lead.created_at), "MMM d, yyyy")}</span>
                </div>
                {lead.source && <Badge variant="outline" className="text-[10px] sm:text-xs capitalize h-5">{lead.source}</Badge>}
                {lead.interest && <Badge variant="secondary" className="text-[10px] sm:text-xs capitalize h-5">{lead.interest}</Badge>}
                {assignedMember && (
                  <div className="flex items-center gap-1">
                    <UserCheck className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                    <span className="font-medium text-foreground">{assignedMember.fullName || assignedMember.email}</span>
                  </div>
                )}
              </div>

              {lead.message && (
                <div className="bg-muted/30 rounded-lg p-2 sm:p-3 border border-border">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Info className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-muted-foreground" />
                    <span className="text-[10px] sm:text-xs font-medium text-muted-foreground">Lead Message</span>
                  </div>
                  <p className="text-xs sm:text-sm">{lead.message}</p>
                </div>
              )}
            </div>

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-3">
              <TabsList className="w-full justify-start bg-muted/50 flex-wrap h-auto gap-0.5 sm:gap-1 p-0.5 sm:p-1">
                <TabsTrigger value="activity" className="gap-1 text-[10px] sm:text-xs px-2 sm:px-3">
                  <Activity className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                  <span className="hidden sm:inline">Activity</span>
                  <span className="sm:hidden">Log</span>
                </TabsTrigger>
                <TabsTrigger value="calls" className="gap-1 text-[10px] sm:text-xs px-2 sm:px-3">
                  <PhoneCall className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                  Calls
                  {callLogCount > 0 && <Badge variant="secondary" className="ml-0.5 h-4 text-[9px] sm:text-[10px] px-1">{callLogCount}</Badge>}
                </TabsTrigger>
                <TabsTrigger value="notes" className="gap-1 text-[10px] sm:text-xs px-2 sm:px-3">
                  <MessageSquare className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                  Notes
                  {noteCount > 0 && <Badge variant="secondary" className="ml-0.5 h-4 text-[9px] sm:text-[10px] px-1">{noteCount}</Badge>}
                </TabsTrigger>
                <TabsTrigger value="followups" className="gap-1 text-[10px] sm:text-xs px-2 sm:px-3">
                  <CalendarIcon className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                  <span className="hidden sm:inline">Follow-ups</span>
                  <span className="sm:hidden">F/U</span>
                  {followUpCount > 0 && <Badge variant="secondary" className="ml-0.5 h-4 text-[9px] sm:text-[10px] px-1">{followUpCount}</Badge>}
                </TabsTrigger>
                <TabsTrigger value="account" className="gap-1 text-[10px] sm:text-xs px-2 sm:px-3">
                  <Briefcase className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                  <span className="hidden sm:inline">Account</span>
                  <span className="sm:hidden">Acc</span>
                </TabsTrigger>
                <TabsTrigger value="transfers" className="gap-1 text-[10px] sm:text-xs px-2 sm:px-3">
                  <ArrowLeftRight className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                  <span className="hidden sm:inline">Transfers</span>
                  <span className="sm:hidden">Hist</span>
                </TabsTrigger>
              </TabsList>

              {/* Activity Tab */}
              <TabsContent value="activity" className="mt-3 sm:mt-4">
                <LeadActivityTimeline leadId={lead.id} />
              </TabsContent>

              {/* Calls Tab */}
              <TabsContent value="calls" className="mt-3 sm:mt-4">
                <div className="mb-3 sm:mb-4 p-3 sm:p-4 rounded-lg border border-border bg-muted/30">
                  <CallLogForm leadId={lead.id} leadName={lead.full_name} onSuccess={() => setCallLogCount(prev => prev + 1)} />
                </div>
                <div>
                  <h4 className="text-xs sm:text-sm font-medium mb-2">Call History</h4>
                  <CallLogHistory leadId={lead.id} />
                </div>
              </TabsContent>

              {/* Notes Tab */}
              <TabsContent value="notes" className="mt-3 sm:mt-4">
                <div className="flex gap-2 mb-3 sm:mb-4">
                  <Textarea placeholder="Add a remark or note..." value={newNote} onChange={(e) => setNewNote(e.target.value)} className="min-h-[50px] sm:min-h-[60px] resize-none text-xs sm:text-sm" />
                  <Button onClick={handleAddNote} disabled={isSavingNote || !newNote.trim()} size="icon" className="shrink-0">
                    {isSavingNote ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  </Button>
                </div>
                {isLoadingNotes ? (
                  <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-[hsl(var(--gold))]" /></div>
                ) : notes.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No notes yet</p>
                  </div>
                ) : (
                  <div className="space-y-2 sm:space-y-3">
                    {notes.map((note) => (
                      <div key={note.id} className="p-2 sm:p-3 rounded-lg bg-muted/50 border border-border group">
                        <div className="flex justify-between items-start gap-2">
                          <p className="text-xs sm:text-sm whitespace-pre-wrap flex-1">{note.content}</p>
                          <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 h-6 w-6 text-destructive hover:text-destructive shrink-0" onClick={() => handleDeleteNote(note.id)}>
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                        <div className="flex items-center gap-2 sm:gap-3 mt-1.5 sm:mt-2">
                          <div className="flex items-center gap-1">
                            <User className="w-3 h-3 text-muted-foreground" />
                            <span className="text-[10px] sm:text-xs font-medium text-muted-foreground">{getUserName(note.user_id)}</span>
                          </div>
                          <span className="text-[10px] sm:text-xs text-muted-foreground">{format(new Date(note.created_at), "MMM d, h:mm a")}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>

              {/* Follow-ups Tab */}
              <TabsContent value="followups" className="mt-3 sm:mt-4 pb-20">
                <div className="flex gap-2 mb-3">
                  {!showFollowUpForm && !showMeetingScheduler && (
                    <>
                      <Button variant="outline" onClick={() => setShowFollowUpForm(true)} className="flex-1 text-xs sm:text-sm">
                        <Plus className="w-4 h-4 mr-2" />
                        Follow-up
                      </Button>
                      <Button variant="outline" onClick={() => setShowMeetingScheduler(true)} className="flex-1 text-xs sm:text-sm">
                        <CalendarCheck className="w-4 h-4 mr-2" />
                        Meeting
                      </Button>
                    </>
                  )}
                </div>

                {/* Meeting Scheduler */}
                {showMeetingScheduler && (
                  <div className="mb-4">
                    <MeetingScheduler
                      leadId={lead.id}
                      leadName={lead.full_name}
                      leadEmail={lead.email}
                      leadPhone={lead.phone}
                      onScheduled={() => { setShowMeetingScheduler(false); fetchFollowUps(); }}
                      onCancel={() => setShowMeetingScheduler(false)}
                    />
                  </div>
                )}

                {/* Follow-up Form */}
                {showFollowUpForm && (
                  <div className="p-3 sm:p-4 rounded-lg border border-border bg-muted/30 mb-3 sm:mb-4 space-y-2 sm:space-y-3">
                    <div className="flex flex-wrap gap-1.5 sm:gap-2">
                      {[
                        { value: "call_back", label: "📞 Call Back" },
                        { value: "meeting", label: "🤝 Meeting" },
                        { value: "site_visit", label: "🏠 Site Visit" },
                        { value: "send_docs", label: "📄 Send Docs" },
                        { value: "whatsapp", label: "💬 WhatsApp" },
                        { value: "email_followup", label: "✉️ Email" },
                        { value: "proposal", label: "📊 Proposal" },
                        { value: "negotiation", label: "🤝 Negotiate" },
                        { value: "other", label: "📌 Other" },
                      ].map((type) => (
                        <Button
                          key={type.value}
                          variant={followUpType === type.value ? "default" : "outline"}
                          size="sm"
                          className={cn("text-[10px] sm:text-xs h-7 sm:h-8", followUpType === type.value && "bg-[hsl(var(--gold))] text-[hsl(var(--charcoal))]")}
                          onClick={() => { setFollowUpType(type.value); if (!followUpTitle) setFollowUpTitle(type.label.replace(/^.{2}\s/, "")); }}
                        >
                          {type.label}
                        </Button>
                      ))}
                    </div>
                    <Input placeholder="Follow-up title" value={followUpTitle} onChange={(e) => setFollowUpTitle(e.target.value)} className="text-xs sm:text-sm" />
                    <Textarea placeholder="Description (optional)" value={followUpDescription} onChange={(e) => setFollowUpDescription(e.target.value)} className="min-h-[50px] sm:min-h-[60px] resize-none text-xs sm:text-sm" />
                    <Textarea placeholder="Comments / Remarks (optional)" value={followUpRemarks} onChange={(e) => setFollowUpRemarks(e.target.value)} className="min-h-[40px] sm:min-h-[50px] resize-none text-xs sm:text-sm" />
                    
                    {/* Stage selector */}
                    <div className="flex items-center gap-2">
                      <Label className="text-xs shrink-0">Stage:</Label>
                      <Select value={followUpStage} onValueChange={setFollowUpStage}>
                        <SelectTrigger className="h-7 text-xs w-[140px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                      <SelectItem value="scheduled">📋 Scheduled</SelectItem>
                          <SelectItem value="in_progress">🔄 In Progress</SelectItem>
                          <SelectItem value="completed">✅ Completed</SelectItem>
                          <SelectItem value="rescheduled">📅 Rescheduled</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-2">
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" className={cn("flex-1 justify-start text-left font-normal text-xs sm:text-sm", !followUpDate && "text-muted-foreground")}>
                            <CalendarIcon className="mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4" />
                            {followUpDate ? format(followUpDate, "PPP") : "Pick a date"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0 z-[9999]" align="start">
                          <Calendar mode="single" selected={followUpDate} onSelect={setFollowUpDate} disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))} initialFocus className="p-3 pointer-events-auto" />
                        </PopoverContent>
                      </Popover>
                      <div className="flex items-center gap-2">
                        <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-muted-foreground" />
                        <Input type="time" value={followUpTime} onChange={(e) => setFollowUpTime(e.target.value)} className="w-[100px] sm:w-[120px] text-xs sm:text-sm" />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" onClick={() => { setShowFollowUpForm(false); setFollowUpTitle(""); setFollowUpDescription(""); setFollowUpDate(undefined); }} className="flex-1 text-xs sm:text-sm">Cancel</Button>
                      <Button onClick={handleAddFollowUp} disabled={isSavingFollowUp || !followUpTitle.trim() || !followUpDate} className="flex-1 text-xs sm:text-sm">
                        {isSavingFollowUp && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                        Schedule
                      </Button>
                    </div>
                  </div>
                )}

                {/* Follow-up list */}
                {isLoadingFollowUps ? (
                  <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-[hsl(var(--gold))]" /></div>
                ) : followUps.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <CalendarIcon className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No follow-ups scheduled</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {followUps.map((followUp) => {
                      const isOverdue = !followUp.completed && new Date(followUp.scheduled_at) < new Date();
                      const stage = followUp.stage || "pending";
                      return (
                        <div key={followUp.id} className={cn("p-2 sm:p-3 rounded-lg border group", followUp.completed ? "bg-muted/30 border-border" : isOverdue ? "bg-destructive/5 border-destructive/20" : "bg-background border-border")}>
                          <div className="flex items-start gap-2 sm:gap-3">
                            <Checkbox checked={followUp.completed} onCheckedChange={() => handleToggleFollowUp(followUp)} className="mt-0.5 sm:mt-1" />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className={cn("font-medium text-xs sm:text-sm", followUp.completed && "line-through text-muted-foreground")}>{followUp.title}</p>
                                <Badge variant="outline" className={cn("text-[9px] h-4 capitalize", stageColors[stage] || "")}>
                                  {stage.replace("_", " ")}
                                </Badge>
                                {followUp.follow_up_type && (
                                  <Badge variant="secondary" className="text-[9px] h-4 capitalize">
                                    {followUp.follow_up_type.replace("_", " ")}
                                  </Badge>
                                )}
                              </div>
                              {followUp.description && <p className="text-[10px] sm:text-sm text-muted-foreground mt-0.5 sm:mt-1">{followUp.description}</p>}
                              <div className="flex flex-wrap items-center gap-2 sm:gap-3 mt-1 sm:mt-2 text-[10px] sm:text-xs text-muted-foreground">
                                <span className="flex items-center gap-1"><CalendarIcon className="w-3 h-3" />{format(new Date(followUp.scheduled_at), "MMM d, h:mm a")}</span>
                                {isOverdue && !followUp.completed && <span className="text-destructive font-medium">Overdue</span>}
                                <span className="flex items-center gap-1"><User className="w-3 h-3" />{getUserName(followUp.user_id)}</span>
                              </div>
                              {/* Stage update buttons */}
                              {!followUp.completed && (
                                <div className="flex gap-1 mt-2 flex-wrap">
                                  <Button variant="default" size="sm" className="h-6 text-[9px] px-2 bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => setCompletingFollowUp(followUp)}>
                                    ✅ Complete with Remarks
                                  </Button>
                                  {canEdit && ["scheduled", "in_progress", "rescheduled"].filter(s => s !== stage).map(s => (
                                    <Button key={s} variant="ghost" size="sm" className="h-5 text-[9px] px-1.5" onClick={() => handleUpdateFollowUpStage(followUp.id, s)}>
                                       {s === "scheduled" ? "📋" : s === "in_progress" ? "🔄" : "📅"} {s.replace("_", " ")}
                                    </Button>
                                  ))}
                                </div>
                              )}
                            </div>
                            <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 h-6 w-6 text-destructive hover:text-destructive shrink-0" onClick={() => handleDeleteFollowUp(followUp.id)}>
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </TabsContent>

              {/* Account Details Tab */}
              <TabsContent value="account" className="mt-3 sm:mt-4">
                <LeadAccountDetails lead={lead} teamMembers={teamMembers} />
              </TabsContent>

              {/* Assignment Transfers Tab */}
              <TabsContent value="transfers" className="mt-3 sm:mt-4 pb-20">
                <LeadAssignmentHistory leadId={lead.id} />
              </TabsContent>
            </Tabs>
          </div>
        )}
        {/* Follow-up Complete Dialog */}
        {completingFollowUp && (
          <FollowUpCompleteDialog
            open={!!completingFollowUp}
            onOpenChange={(open) => !open && setCompletingFollowUp(null)}
            followUpId={completingFollowUp.id}
            followUpTitle={completingFollowUp.title}
            onCompleted={(id, remarks, outcome) => {
              setFollowUps(followUps.map(f => f.id === id ? { ...f, completed: true, completed_at: new Date().toISOString(), stage: outcome, description: remarks } : f));
              setFollowUpCount(prev => prev - 1);
              if (lead) notifyFollowupCompleted(lead.id, lead.full_name, lead.email, completingFollowUp.title, lead.assigned_to || undefined);
              setCompletingFollowUp(null);
            }}
          />
        )}
      </DialogContent>
    </Dialog>
  );
};
