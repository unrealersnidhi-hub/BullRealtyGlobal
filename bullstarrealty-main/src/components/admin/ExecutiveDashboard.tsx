import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import {
  BarChart,
  Bar,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatDistanceToNowStrict } from "date-fns";
import { cn } from "@/lib/utils";

interface LeadRow {
  id: string;
  assigned_to: string | null;
  full_name: string;
  email?: string | null;
  phone?: string | null;
  source: string | null;
  status: string;
  created_at: string;
}

interface CallLogRow {
  id: string;
  lead_id: string;
  user_id: string;
  outcome: string;
  duration_seconds: number | null;
  created_at: string;
}

interface FollowUpRow {
  id: string;
  lead_id: string;
  user_id: string;
  title: string;
  completed: boolean;
  scheduled_at: string;
}

interface MeetingRow {
  id: string;
  lead_id: string;
  created_by: string;
  title: string;
  meeting_type: string | null;
  status: string | null;
  scheduled_at: string;
}

interface ActivityRow {
  id: string;
  lead_id: string;
  user_id: string | null;
  activity_type: string;
  title: string;
  description: string | null;
  created_at: string;
}

interface TeamMember {
  id: string;
  email: string;
  fullName: string | null;
}

interface RecentEvent {
  id: string;
  type: string;
  title: string;
  actorId: string | null;
  at: string;
}

const STATUS_COLORS = ["#C5A572", "#e11d48", "#f59e0b", "#3b82f6", "#10b981", "#6b7280"];

function normalizeLabel(value: string | null | undefined): string {
  if (!value) return "unknown";
  return value.replace(/_/g, " ");
}

function includesAny(text: string, values: string[]): boolean {
  const lower = text.toLowerCase();
  return values.some((v) => lower.includes(v));
}

export const ExecutiveDashboard = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [leads, setLeads] = useState<LeadRow[]>([]);
  const [callLogs, setCallLogs] = useState<CallLogRow[]>([]);
  const [followUps, setFollowUps] = useState<FollowUpRow[]>([]);
  const [meetings, setMeetings] = useState<MeetingRow[]>([]);
  const [activities, setActivities] = useState<ActivityRow[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<string>("all");

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const [leadsRes, callsRes, followUpsRes, meetingsRes, activitiesRes, teamRes] = await Promise.all([
          supabase.from("leads").select("id, assigned_to, full_name, email, phone, source, status, created_at"),
          supabase.from("call_logs").select("id, lead_id, user_id, outcome, duration_seconds, created_at"),
          supabase.from("follow_ups").select("id, lead_id, user_id, title, completed, scheduled_at"),
          supabase.from("meetings").select("id, lead_id, created_by, title, meeting_type, status, scheduled_at"),
          supabase.from("lead_activities").select("id, lead_id, user_id, activity_type, title, description, created_at"),
          supabase.functions.invoke("list-team-members"),
        ]);

        if (leadsRes.error) throw leadsRes.error;
        if (callsRes.error) throw callsRes.error;
        if (followUpsRes.error) throw followUpsRes.error;
        if (meetingsRes.error) throw meetingsRes.error;
        if (activitiesRes.error) throw activitiesRes.error;

        setLeads((leadsRes.data ?? []) as LeadRow[]);
        setCallLogs((callsRes.data ?? []) as CallLogRow[]);
        setFollowUps((followUpsRes.data ?? []) as FollowUpRow[]);
        setMeetings((meetingsRes.data ?? []) as MeetingRow[]);
        setActivities((activitiesRes.data ?? []) as ActivityRow[]);
        setTeamMembers((teamRes.data?.users ?? []) as TeamMember[]);
      } catch (error) {
        console.error("Failed to load executive dashboard data", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  const memberName = (id: string | null | undefined) => {
    if (!id) return "Unassigned";
    const member = teamMembers.find((m) => m.id === id);
    if (!member) return "Unknown";
    return member.fullName || member.email;
  };

  const buildLeadsUrl = (filters?: { status?: string; bucket?: string }) => {
    const params = new URLSearchParams({ tab: "leads" });
    if (selectedEmployee !== "all") params.set("assignee", selectedEmployee);
    if (filters?.status) params.set("status", filters.status);
    if (filters?.bucket) params.set("bucket", filters.bucket);
    return `/admin/dashboard?${params.toString()}`;
  };

  const openLeads = (filters?: { status?: string; bucket?: string }) => {
    navigate(buildLeadsUrl(filters));
  };

  const scoped = useMemo(() => {
    if (selectedEmployee === "all") {
      return { leads, callLogs, followUps, meetings, activities };
    }

    const employeeLeadIds = new Set(leads.filter((l) => l.assigned_to === selectedEmployee).map((l) => l.id));

    return {
      leads: leads.filter((l) => l.assigned_to === selectedEmployee),
      callLogs: callLogs.filter((c) => c.user_id === selectedEmployee),
      followUps: followUps.filter((f) => f.user_id === selectedEmployee),
      meetings: meetings.filter((m) => m.created_by === selectedEmployee || employeeLeadIds.has(m.lead_id)),
      activities: activities.filter((a) => a.user_id === selectedEmployee || employeeLeadIds.has(a.lead_id)),
    };
  }, [selectedEmployee, leads, callLogs, followUps, meetings, activities]);

  const now = new Date();

  const leadStatusData = useMemo(() => {
    const map = new Map<string, number>();
    scoped.leads.forEach((l) => map.set(l.status, (map.get(l.status) ?? 0) + 1));
    return Array.from(map.entries()).map(([name, value]) => ({ name: normalizeLabel(name), value }));
  }, [scoped.leads]);

  const callStatusData = useMemo(() => {
    const map = new Map<string, number>();
    scoped.callLogs.forEach((c) => map.set(c.outcome, (map.get(c.outcome) ?? 0) + 1));
    return Array.from(map.entries())
      .map(([name, value]) => ({ name: normalizeLabel(name), value }))
      .sort((a, b) => b.value - a.value);
  }, [scoped.callLogs]);

  const pendingTasks = scoped.followUps.filter((f) => !f.completed).length;
  const pendingMeetings = scoped.meetings.filter(
    (m) => new Date(m.scheduled_at) >= now && !includesAny(m.status ?? "", ["completed", "cancelled"])
  ).length;

  const visitMeetings = scoped.meetings.filter((m) => includesAny(`${m.meeting_type ?? ""} ${m.title}`, ["site", "visit"]));
  const visitPending = visitMeetings.filter((m) => !includesAny(m.status ?? "", ["confirm", "done", "complete"])).length;
  const visitConfirmed = visitMeetings.filter((m) => includesAny(m.status ?? "", ["confirm", "done", "complete"])).length;
  const obmCount = scoped.activities.filter((a) => includesAny(`${a.activity_type} ${a.title} ${a.description ?? ""}`, ["obm"]))
    .length;

  const leadCategories = useMemo(() => {
    const all = scoped.leads;
    return {
      hot: all.filter((l) => l.status === "hot").length,
      warm: all.filter((l) => l.status === "warm").length,
      cold: all.filter((l) => l.status === "cold").length,
      interested: all.filter((l) => ["interested", "hot", "warm"].includes(l.status)).length,
      notInterested: all.filter((l) => l.status === "not_interested").length,
      converted: all.filter((l) => l.status === "converted").length,
      lost: all.filter((l) => l.status === "lost").length,
      deadLead: all.filter((l) => l.status === "deadlead" || l.status === "dead_lead").length,
    };
  }, [scoped.leads]);

  const recentActivities: RecentEvent[] = useMemo(() => {
    const fromActivities: RecentEvent[] = scoped.activities.map((a) => ({
      id: `a-${a.id}`,
      type: normalizeLabel(a.activity_type),
      title: a.title,
      actorId: a.user_id,
      at: a.created_at,
    }));

    const fromFollowUps: RecentEvent[] = scoped.followUps.map((f) => ({
      id: `f-${f.id}`,
      type: f.completed ? "follow up completed" : "follow up pending",
      title: f.title,
      actorId: f.user_id,
      at: f.scheduled_at,
    }));

    const fromMeetings: RecentEvent[] = scoped.meetings.map((m) => ({
      id: `m-${m.id}`,
      type: "meeting",
      title: m.title,
      actorId: m.created_by,
      at: m.scheduled_at,
    }));

    const fromCalls: RecentEvent[] = scoped.callLogs.map((c) => ({
      id: `c-${c.id}`,
      type: "call",
      title: `Call ${normalizeLabel(c.outcome)}`,
      actorId: c.user_id,
      at: c.created_at,
    }));

    return [...fromActivities, ...fromFollowUps, ...fromMeetings, ...fromCalls]
      .sort((a, b) => +new Date(b.at) - +new Date(a.at))
      .slice(0, 25);
  }, [scoped.activities, scoped.followUps, scoped.meetings, scoped.callLogs]);

  const employeeMatrix = useMemo(() => {
    return teamMembers
      .map((m) => {
        const employeeLeads = leads.filter((l) => l.assigned_to === m.id);
        const employeeLeadIds = new Set(employeeLeads.map((l) => l.id));
        const employeeCalls = callLogs.filter((c) => c.user_id === m.id);
        const employeeConverted = employeeLeads.filter((l) => l.status === "converted").length;
        const employeePendingFollowUps = followUps.filter((f) => f.user_id === m.id && !f.completed).length;
        const employeeMeetings = meetings.filter((meeting) => meeting.created_by === m.id || employeeLeadIds.has(meeting.lead_id)).length;

        return {
          id: m.id,
          name: m.fullName || m.email,
          leads: employeeLeads.length,
          calls: employeeCalls.length,
          converted: employeeConverted,
          pendingFollowUps: employeePendingFollowUps,
          meetings: employeeMeetings,
        };
      })
      .sort((a, b) => b.leads - a.leads);
  }, [teamMembers, leads, callLogs, followUps, meetings]);

  const selectedEmployeeData = employeeMatrix.find((e) => e.id === selectedEmployee);
  const selectedEmployeeEvents = selectedEmployee === "all" ? [] : recentActivities.filter((event) => event.actorId === selectedEmployee);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-[hsl(var(--gold))]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-border/60 bg-gradient-to-r from-card via-card to-[hsl(var(--gold))]/5 p-4 md:p-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-xl font-semibold tracking-tight">CRM Command Dashboard</h2>
            <p className="text-sm text-muted-foreground">Employee-centric pipeline, task, meetings, visit tracking, and lead conversion control.</p>
          </div>
          <div className="w-full md:w-72">
            <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
              <SelectTrigger>
                <SelectValue placeholder="Select employee" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All employees</SelectItem>
                {teamMembers.map((member) => (
                  <SelectItem key={member.id} value={member.id}>
                    {member.fullName || member.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-8">
        <Card className="cursor-pointer hover:border-[hsl(var(--gold))]/60" onClick={() => openLeads()}><CardContent className="p-4"><div className="text-xs text-muted-foreground">Leads</div><div className="text-2xl font-semibold">{scoped.leads.length}</div></CardContent></Card>
        <Card className="cursor-pointer hover:border-[hsl(var(--gold))]/60" onClick={() => navigate("/admin/dashboard?tab=calling")}><CardContent className="p-4"><div className="text-xs text-muted-foreground">Calls</div><div className="text-2xl font-semibold">{scoped.callLogs.length}</div></CardContent></Card>
        <Card className="cursor-pointer hover:border-[hsl(var(--gold))]/60" onClick={() => openLeads({ bucket: "pending_tasks" })}><CardContent className="p-4"><div className="text-xs text-muted-foreground">Pending Tasks</div><div className="text-2xl font-semibold">{pendingTasks}</div></CardContent></Card>
        <Card className="cursor-pointer hover:border-[hsl(var(--gold))]/60" onClick={() => openLeads({ bucket: "pending_meetings" })}><CardContent className="p-4"><div className="text-xs text-muted-foreground">Pending Meetings</div><div className="text-2xl font-semibold">{pendingMeetings}</div></CardContent></Card>
        <Card className="cursor-pointer hover:border-[hsl(var(--gold))]/60" onClick={() => openLeads({ bucket: "visit_all" })}><CardContent className="p-4"><div className="text-xs text-muted-foreground">Site Visits</div><div className="text-2xl font-semibold">{visitMeetings.length}</div></CardContent></Card>
        <Card className="cursor-pointer hover:border-[hsl(var(--gold))]/60" onClick={() => openLeads({ bucket: "visit_pending" })}><CardContent className="p-4"><div className="text-xs text-muted-foreground">Visit Pending</div><div className="text-2xl font-semibold">{visitPending}</div></CardContent></Card>
        <Card className="cursor-pointer hover:border-[hsl(var(--gold))]/60" onClick={() => openLeads({ bucket: "visit_confirmed" })}><CardContent className="p-4"><div className="text-xs text-muted-foreground">Visit Confirmed</div><div className="text-2xl font-semibold">{visitConfirmed}</div></CardContent></Card>
        <Card className="cursor-pointer hover:border-[hsl(var(--gold))]/60" onClick={() => openLeads({ bucket: "obm" })}><CardContent className="p-4"><div className="text-xs text-muted-foreground">OBM</div><div className="text-2xl font-semibold">{obmCount}</div></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Lead Categories</CardTitle></CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8">
          <button type="button" onClick={() => openLeads({ status: "hot" })} className="rounded-md border p-3 text-left transition-colors hover:border-red-300 hover:bg-red-50/40"><p className="text-xs text-muted-foreground">Hot</p><p className="text-xl font-semibold text-red-500">{leadCategories.hot}</p></button>
          <button type="button" onClick={() => openLeads({ status: "warm" })} className="rounded-md border p-3 text-left transition-colors hover:border-orange-300 hover:bg-orange-50/40"><p className="text-xs text-muted-foreground">Warm</p><p className="text-xl font-semibold text-orange-500">{leadCategories.warm}</p></button>
          <button type="button" onClick={() => openLeads({ status: "cold" })} className="rounded-md border p-3 text-left transition-colors hover:border-blue-300 hover:bg-blue-50/40"><p className="text-xs text-muted-foreground">Cold</p><p className="text-xl font-semibold text-blue-500">{leadCategories.cold}</p></button>
          <button type="button" onClick={() => openLeads()} className="rounded-md border p-3 text-left transition-colors hover:border-[hsl(var(--gold))]/60"><p className="text-xs text-muted-foreground">Interested</p><p className="text-xl font-semibold">{leadCategories.interested}</p></button>
          <button type="button" onClick={() => openLeads({ status: "not_interested" })} className="rounded-md border p-3 text-left transition-colors hover:border-[hsl(var(--gold))]/60"><p className="text-xs text-muted-foreground">Not Interested</p><p className="text-xl font-semibold">{leadCategories.notInterested}</p></button>
          <button type="button" onClick={() => openLeads({ status: "converted" })} className="rounded-md border p-3 text-left transition-colors hover:border-emerald-300 hover:bg-emerald-50/40"><p className="text-xs text-muted-foreground">Converted</p><p className="text-xl font-semibold text-emerald-500">{leadCategories.converted}</p></button>
          <button type="button" onClick={() => openLeads({ status: "lost" })} className="rounded-md border p-3 text-left transition-colors hover:border-[hsl(var(--gold))]/60"><p className="text-xs text-muted-foreground">Lead Lost</p><p className="text-xl font-semibold">{leadCategories.lost}</p></button>
          <button type="button" onClick={() => openLeads({ status: "deadlead" })} className="rounded-md border p-3 text-left transition-colors hover:border-[hsl(var(--gold))]/60"><p className="text-xs text-muted-foreground">Dead Lead</p><p className="text-xl font-semibold">{leadCategories.deadLead}</p></button>
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-1">
          <CardHeader><CardTitle className="text-base">Lead Status Split</CardTitle></CardHeader>
          <CardContent>
            {leadStatusData.length > 0 ? (
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie data={leadStatusData} dataKey="value" nameKey="name" outerRadius={85} label>
                    {leadStatusData.map((_, idx) => <Cell key={idx} fill={STATUS_COLORS[idx % STATUS_COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : <p className="text-sm text-muted-foreground">No lead data.</p>}
          </CardContent>
        </Card>

        <Card className="xl:col-span-2">
          <CardHeader><CardTitle className="text-base">Calling Status</CardTitle></CardHeader>
          <CardContent>
            {callStatusData.length > 0 ? (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={callStatusData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : <p className="text-sm text-muted-foreground">No call logs.</p>}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Performance Matrix (Click Employee)</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {employeeMatrix.map((row) => (
              <button
                key={row.id}
                type="button"
                onClick={() => setSelectedEmployee(row.id)}
                className={cn(
                  "rounded-lg border p-3 text-left transition-colors",
                  selectedEmployee === row.id ? "border-[hsl(var(--gold))] bg-[hsl(var(--gold))]/10" : "border-border/60 hover:border-[hsl(var(--gold))]/50"
                )}
              >
                <p className="text-sm font-semibold">{row.name}</p>
                <p className="mt-1 text-xs text-muted-foreground">Leads {row.leads} • Calls {row.calls} • Pending {row.pendingFollowUps}</p>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-3">
        <Card>
          <CardHeader><CardTitle className="text-base">Selected Employee Detail</CardTitle></CardHeader>
          <CardContent>
            {selectedEmployeeData ? (
              <div className="space-y-3 text-sm">
                <div className="font-medium">{selectedEmployeeData.name}</div>
                <div className="flex justify-between"><span>Assigned leads</span><span>{selectedEmployeeData.leads}</span></div>
                <div className="flex justify-between"><span>Calls done</span><span>{selectedEmployeeData.calls}</span></div>
                <div className="flex justify-between"><span>Converted</span><span>{selectedEmployeeData.converted}</span></div>
                <div className="flex justify-between"><span>Pending tasks</span><span>{selectedEmployeeData.pendingFollowUps}</span></div>
                <div className="flex justify-between"><span>Meetings</span><span>{selectedEmployeeData.meetings}</span></div>
              </div>
            ) : <p className="text-sm text-muted-foreground">Click employee to open details.</p>}
          </CardContent>
        </Card>

        <Card className="xl:col-span-2">
          <CardHeader><CardTitle className="text-base">Assigned Leads (Selected Employee)</CardTitle></CardHeader>
          <CardContent>
            <div className="max-h-72 overflow-auto rounded-lg border">
              <table className="w-full text-sm">
                <thead className="bg-muted/40">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium">Name</th>
                    <th className="px-3 py-2 text-left font-medium">Phone</th>
                    <th className="px-3 py-2 text-left font-medium">Status</th>
                    <th className="px-3 py-2 text-left font-medium">Source</th>
                  </tr>
                </thead>
                <tbody>
                  {scoped.leads.slice(0, 40).map((lead) => (
                    <tr key={lead.id} className="border-t">
                      <td className="px-3 py-2">{lead.full_name}</td>
                      <td className="px-3 py-2">{lead.phone || "--"}</td>
                      <td className="px-3 py-2 capitalize">{normalizeLabel(lead.status)}</td>
                      <td className="px-3 py-2">{lead.source || "--"}</td>
                    </tr>
                  ))}
                  {scoped.leads.length === 0 && (
                    <tr><td colSpan={4} className="px-3 py-8 text-center text-muted-foreground">No assigned leads.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <Card>
          <CardHeader><CardTitle className="text-base">Site Visit Section</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between"><span>Total site visits</span><span>{visitMeetings.length}</span></div>
            <div className="flex justify-between"><span>Visit pending</span><span>{visitPending}</span></div>
            <div className="flex justify-between"><span>Visit confirmed</span><span>{visitConfirmed}</span></div>
            <div className="flex justify-between"><span>OBM entries</span><span>{obmCount}</span></div>
          </CardContent>
        </Card>

        <Card className="xl:col-span-2">
          <CardHeader><CardTitle className="text-base">Selected Employee Recent Activities</CardTitle></CardHeader>
          <CardContent>
            <div className="max-h-72 space-y-2 overflow-auto pr-1">
              {selectedEmployeeEvents.map((event) => (
                <div key={event.id} className="rounded-lg border border-border/70 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="capitalize">{event.type}</Badge>
                      <p className="text-sm font-medium">{event.title}</p>
                    </div>
                    <span className="text-xs text-muted-foreground">{formatDistanceToNowStrict(new Date(event.at), { addSuffix: true })}</span>
                  </div>
                </div>
              ))}
              {selectedEmployeeEvents.length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">Select employee to view activity.</p>}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Recent Activities (All)</CardTitle></CardHeader>
        <CardContent>
          <div className="max-h-80 space-y-2 overflow-auto pr-1">
            {recentActivities.map((event) => (
              <div key={event.id} className="rounded-lg border border-border/70 p-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="capitalize">{event.type}</Badge>
                    <p className="text-sm font-medium">{event.title}</p>
                  </div>
                  <span className="text-xs text-muted-foreground">{formatDistanceToNowStrict(new Date(event.at), { addSuffix: true })}</span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{memberName(event.actorId)}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
