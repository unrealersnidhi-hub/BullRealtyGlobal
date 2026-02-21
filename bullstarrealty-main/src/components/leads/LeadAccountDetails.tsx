import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
// ScrollArea removed - content flows naturally now
import { Separator } from "@/components/ui/separator";
import { format, differenceInDays } from "date-fns";
import {
  User, Mail, Phone, Globe, Calendar, Tag, Clock,
  PhoneCall, MessageSquare, CalendarCheck, Users, MapPin,
  FileText, Activity, Loader2,
} from "lucide-react";
import { LeadStatusBadge, type LeadStatus } from "./LeadStatusBadge";
import { LeadInterestTags } from "./LeadInterestTags";

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

interface LeadAccountDetailsProps {
  lead: Lead;
  teamMembers?: { id: string; email: string; fullName: string | null }[];
}

export const LeadAccountDetails = ({ lead, teamMembers = [] }: LeadAccountDetailsProps) => {
  const [stats, setStats] = useState({
    callCount: 0,
    noteCount: 0,
    followUpCount: 0,
    completedFollowUps: 0,
    meetingCount: 0,
    assigneeCount: 0,
  });
  const [assignees, setAssignees] = useState<{ user_id: string; role: string }[]>([]);
  const [meetings, setMeetings] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchAllDetails();
  }, [lead.id]);

  const fetchAllDetails = async () => {
    setIsLoading(true);
    try {
      const [callRes, noteRes, fuRes, fuCompleted, meetRes, assigneeRes] = await Promise.all([
        supabase.from("call_logs").select("id", { count: "exact", head: true }).eq("lead_id", lead.id),
        supabase.from("lead_notes").select("id", { count: "exact", head: true }).eq("lead_id", lead.id),
        supabase.from("follow_ups").select("id", { count: "exact", head: true }).eq("lead_id", lead.id).eq("completed", false),
        supabase.from("follow_ups").select("id", { count: "exact", head: true }).eq("lead_id", lead.id).eq("completed", true),
        supabase.from("meetings").select("*").eq("lead_id", lead.id).order("scheduled_at", { ascending: false }).limit(5),
        supabase.from("lead_assignees").select("user_id, role").eq("lead_id", lead.id),
      ]);

      setStats({
        callCount: callRes.count || 0,
        noteCount: noteRes.count || 0,
        followUpCount: fuRes.count || 0,
        completedFollowUps: fuCompleted.count || 0,
        meetingCount: meetRes.data?.length || 0,
        assigneeCount: assigneeRes.data?.length || 0,
      });
      setAssignees(assigneeRes.data || []);
      setMeetings(meetRes.data || []);
    } catch (e) {
      console.error("Error fetching lead details:", e);
    } finally {
      setIsLoading(false);
    }
  };

  const getMemberName = (userId: string) => {
    const m = teamMembers.find(t => t.id === userId);
    return m?.fullName || m?.email || "Unknown";
  };

  const daysSinceCreated = differenceInDays(new Date(), new Date(lead.created_at));
  const daysSinceAssigned = lead.assigned_at ? differenceInDays(new Date(), new Date(lead.assigned_at)) : null;

  if (isLoading) {
    return <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-[hsl(var(--gold))]" /></div>;
  }

  return (
    <div className="space-y-4">
      <div className="space-y-4 pr-3">
        {/* Customer Info Card */}
        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <User className="w-4 h-4 text-[hsl(var(--gold))]" />
              Customer Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">Full Name</p>
                <p className="font-medium">{lead.full_name}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Email</p>
                <a href={`mailto:${lead.email}`} className="text-[hsl(var(--gold))] hover:underline text-sm">{lead.email}</a>
              </div>
              {lead.phone && (
                <div>
                  <p className="text-xs text-muted-foreground">Phone</p>
                  <a href={`tel:${lead.phone}`} className="hover:text-[hsl(var(--gold))]">{lead.phone}</a>
                </div>
              )}
              <div>
                <p className="text-xs text-muted-foreground">Country</p>
                <p>{lead.country === "dubai" ? "🇦🇪 Dubai" : lead.country === "india" ? "🇮🇳 India" : "—"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Source</p>
                <Badge variant="outline" className="text-xs capitalize">{lead.source || "website"}</Badge>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Status</p>
                <LeadStatusBadge status={lead.status} />
              </div>
              {lead.interest && (
                <div className="col-span-2">
                  <p className="text-xs text-muted-foreground">Interest</p>
                  <p className="text-sm">{lead.interest}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Interest Tags */}
        <Card className="border-border/50">
          <CardContent className="pt-4">
            <LeadInterestTags leadId={lead.id} />
          </CardContent>
        </Card>

        {/* Stats Overview */}
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
          {[
            { label: "Age", value: `${daysSinceCreated}d`, icon: Clock },
            { label: "Calls", value: stats.callCount, icon: PhoneCall },
            { label: "Notes", value: stats.noteCount, icon: MessageSquare },
            { label: "Pending F/U", value: stats.followUpCount, icon: Calendar },
            { label: "Done F/U", value: stats.completedFollowUps, icon: CalendarCheck },
            { label: "Meetings", value: stats.meetingCount, icon: MapPin },
          ].map(s => (
            <div key={s.label} className="bg-muted/50 rounded-lg p-2 text-center">
              <s.icon className="w-3.5 h-3.5 mx-auto mb-1 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">{s.label}</p>
              <p className="font-bold text-sm">{s.value}</p>
            </div>
          ))}
        </div>

        {/* Team Assignment */}
        {assignees.length > 0 && (
          <Card className="border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Users className="w-4 h-4 text-[hsl(var(--gold))]" />
                Assigned Team ({assignees.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-1.5">
                {assignees.map(a => (
                  <Badge key={a.user_id} variant="secondary" className="text-xs">
                    {getMemberName(a.user_id)}
                    <span className="ml-1 text-muted-foreground capitalize">({a.role})</span>
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Recent Meetings */}
        {meetings.length > 0 && (
          <Card className="border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <CalendarCheck className="w-4 h-4 text-[hsl(var(--gold))]" />
                Recent Meetings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {meetings.map(m => (
                <div key={m.id} className="p-2 rounded-lg border border-border bg-muted/30">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">{m.title}</p>
                    <Badge variant="outline" className="text-[10px] capitalize">{m.status}</Badge>
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {format(new Date(m.scheduled_at), "MMM d, h:mm a")}
                    </span>
                    <span className="capitalize">{m.meeting_type?.replace("_", " ")}</span>
                    {m.location && <span className="truncate max-w-[150px]">{m.location}</span>}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Timeline Summary */}
        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Activity className="w-4 h-4 text-[hsl(var(--gold))]" />
              Timeline
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs space-y-1.5 text-muted-foreground">
            <p>📅 Created: {format(new Date(lead.created_at), "MMMM d, yyyy 'at' h:mm a")}</p>
            {lead.assigned_at && (
              <p>👤 Assigned: {format(new Date(lead.assigned_at), "MMMM d, yyyy")} ({daysSinceAssigned}d ago)</p>
            )}
            {lead.message && (
              <div className="mt-2 p-2 bg-muted/50 rounded border">
                <p className="text-xs font-medium mb-1">Initial Message:</p>
                <p className="text-xs">{lead.message}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
