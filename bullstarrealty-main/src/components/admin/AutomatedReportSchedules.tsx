import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import {
  Clock, Plus, X, Loader2, Save, Pencil, Trash2, FileSpreadsheet, Send, Calendar,
} from "lucide-react";
import { format } from "date-fns";

interface ReportSchedule {
  id: string;
  name: string;
  report_type: string;
  frequency: string;
  send_time: string;
  is_active: boolean;
  recipient_emails: string[];
  cc_emails: string[];
  include_call_stats: boolean;
  include_lead_stats: boolean;
  include_performance: boolean;
  include_conversion: boolean;
  created_by: string;
  last_sent_at: string | null;
  created_at: string;
}

const FREQUENCIES = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly (Every Monday)" },
  { value: "monthly", label: "Monthly (1st of Month)" },
];

const REPORT_TYPES = [
  { value: "mis_summary", label: "MIS Summary Report" },
  { value: "team_performance", label: "Team Performance Report" },
  { value: "lead_scoring", label: "Lead Scoring Report" },
  { value: "full_detailed", label: "Full Detailed Report" },
];

export function AutomatedReportSchedules() {
  const [schedules, setSchedules] = useState<ReportSchedule[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSendingNow, setIsSendingNow] = useState<string | null>(null);
  const [editing, setEditing] = useState<Partial<ReportSchedule> | null>(null);
  const [newRecipient, setNewRecipient] = useState("");
  const [newCc, setNewCc] = useState("");

  useEffect(() => { fetchSchedules(); }, []);

  const fetchSchedules = async () => {
    try {
      const { data, error } = await supabase
        .from("automated_report_schedules")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      setSchedules((data as any[]) || []);
    } catch (e) {
      console.error(e);
      toast.error("Failed to load report schedules");
    } finally { setIsLoading(false); }
  };

  const openCreate = () => {
    setEditing({
      name: "",
      report_type: "mis_summary",
      frequency: "daily",
      send_time: "19:00",
      is_active: true,
      recipient_emails: [],
      cc_emails: [],
      include_call_stats: true,
      include_lead_stats: true,
      include_performance: true,
      include_conversion: true,
    });
    setIsDialogOpen(true);
  };

  const openEdit = (s: ReportSchedule) => {
    setEditing({ ...s });
    setIsDialogOpen(true);
  };

  const addEmail = (field: "recipient_emails" | "cc_emails", value: string, setter: (v: string) => void) => {
    if (!value || !value.includes("@")) { toast.error("Enter a valid email"); return; }
    const list = editing?.[field] || [];
    if (list.includes(value)) { toast.error("Already added"); return; }
    setEditing({ ...editing, [field]: [...list, value] });
    setter("");
  };

  const removeEmail = (field: "recipient_emails" | "cc_emails", email: string) => {
    setEditing({ ...editing, [field]: (editing?.[field] || []).filter((e) => e !== email) });
  };

  const handleSave = async () => {
    if (!editing?.name?.trim()) { toast.error("Schedule name is required"); return; }
    if ((editing.recipient_emails || []).length === 0) { toast.error("Add at least one recipient"); return; }
    setIsSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const payload = {
        name: editing.name,
        report_type: editing.report_type || "mis_summary",
        frequency: editing.frequency || "daily",
        send_time: editing.send_time || "19:00",
        is_active: editing.is_active ?? true,
        recipient_emails: editing.recipient_emails || [],
        cc_emails: editing.cc_emails || [],
        include_call_stats: editing.include_call_stats ?? true,
        include_lead_stats: editing.include_lead_stats ?? true,
        include_performance: editing.include_performance ?? true,
        include_conversion: editing.include_conversion ?? true,
        created_by: user.id,
      };

      if (editing.id) {
        const { error } = await supabase
          .from("automated_report_schedules")
          .update(payload as any)
          .eq("id", editing.id);
        if (error) throw error;
        toast.success("Schedule updated");
      } else {
        const { error } = await supabase
          .from("automated_report_schedules")
          .insert(payload as any);
        if (error) throw error;
        toast.success("Schedule created");
      }
      setIsDialogOpen(false);
      setEditing(null);
      fetchSchedules();
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || "Failed to save schedule");
    } finally { setIsSaving(false); }
  };

  const toggleActive = async (s: ReportSchedule) => {
    try {
      const { error } = await supabase
        .from("automated_report_schedules")
        .update({ is_active: !s.is_active } as any)
        .eq("id", s.id);
      if (error) throw error;
      setSchedules(schedules.map((r) => (r.id === s.id ? { ...r, is_active: !r.is_active } : r)));
    } catch { toast.error("Failed to update"); }
  };

  const deleteSchedule = async (id: string) => {
    try {
      const { error } = await supabase.from("automated_report_schedules").delete().eq("id", id);
      if (error) throw error;
      setSchedules(schedules.filter((s) => s.id !== id));
      toast.success("Schedule deleted");
    } catch { toast.error("Failed to delete"); }
  };

  const sendNow = async (scheduleId: string) => {
    setIsSendingNow(scheduleId);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-mis-report`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session?.access_token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ schedule_id: scheduleId }),
        }
      );
      const json = await resp.json().catch(() => ({}));
      if (!resp.ok) throw new Error(json?.error || "Failed to send report");
      toast.success("Report sent successfully!");
      fetchSchedules();
    } catch (e: any) {
      toast.error(e.message || "Failed to send report");
    } finally { setIsSendingNow(null); }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-[hsl(var(--gold))]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-[hsl(var(--gold))]" />
                Automated MIS Report Mailer
              </CardTitle>
              <CardDescription>
                Schedule daily, weekly, and monthly MIS reports to be emailed to team members automatically after 7 PM
              </CardDescription>
            </div>
            <Button onClick={openCreate} className="bg-[hsl(var(--gold))] hover:bg-[hsl(var(--gold))]/90 text-[hsl(var(--charcoal))]">
              <Plus className="w-4 h-4 mr-2" />
              Add Schedule
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {schedules.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileSpreadsheet className="w-10 h-10 mx-auto mb-3 opacity-50" />
              <p>No automated report schedules configured.</p>
              <p className="text-sm mt-1">Create schedules to auto-send MIS reports to team members.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Schedule Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Frequency</TableHead>
                  <TableHead>Send Time</TableHead>
                  <TableHead>Recipients</TableHead>
                  <TableHead>Last Sent</TableHead>
                  <TableHead>Active</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {schedules.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">{s.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {REPORT_TYPES.find((r) => r.value === s.report_type)?.label || s.report_type}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="text-xs capitalize">{s.frequency}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        <Clock className="w-3 h-3 mr-1" />
                        {s.send_time}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">{s.recipient_emails.length} recipients</span>
                    </TableCell>
                    <TableCell>
                      <span className="text-xs text-muted-foreground">
                        {s.last_sent_at ? format(new Date(s.last_sent_at), "dd MMM yyyy HH:mm") : "Never"}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Switch checked={s.is_active} onCheckedChange={() => toggleActive(s)} />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-1 justify-end">
                        <Button
                          variant="ghost" size="sm"
                          onClick={() => sendNow(s.id)}
                          disabled={isSendingNow === s.id}
                          title="Send Now"
                        >
                          {isSendingNow === s.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Send className="w-4 h-4" />
                          )}
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => openEdit(s)}>
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => deleteSchedule(s.id)} className="text-destructive">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing?.id ? "Edit Schedule" : "Create Report Schedule"}</DialogTitle>
            <DialogDescription>
              Configure automated MIS report delivery
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Schedule Name *</Label>
              <Input
                value={editing?.name || ""}
                onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                placeholder="e.g., Daily Team Performance Report"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Report Type</Label>
                <Select
                  value={editing?.report_type || "mis_summary"}
                  onValueChange={(v) => setEditing({ ...editing, report_type: v })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {REPORT_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Frequency</Label>
                <Select
                  value={editing?.frequency || "daily"}
                  onValueChange={(v) => setEditing({ ...editing, frequency: v })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {FREQUENCIES.map((f) => (
                      <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Send Time (IST/UAE)</Label>
              <Input
                type="time"
                value={editing?.send_time || "19:00"}
                onChange={(e) => setEditing({ ...editing, send_time: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">Recommended: 19:00 (7 PM) for end-of-day reports</p>
            </div>

            <Separator />

            <div className="space-y-3">
              <Label className="text-base font-semibold">Report Contents</Label>
              {[
                { key: "include_call_stats", label: "Call Statistics", desc: "Daily call logs, answer rates, duration" },
                { key: "include_lead_stats", label: "Lead Status Summary", desc: "Hot, warm, cold, converted counts per person" },
                { key: "include_performance", label: "Team Performance", desc: "Individual task completion and scoring" },
                { key: "include_conversion", label: "Conversion Metrics", desc: "Lead conversion rates and funnel data" },
              ].map((item) => (
                <div key={item.key} className="flex items-center justify-between py-1">
                  <div>
                    <Label>{item.label}</Label>
                    <p className="text-xs text-muted-foreground">{item.desc}</p>
                  </div>
                  <Switch
                    checked={(editing as any)?.[item.key] ?? true}
                    onCheckedChange={(c) => setEditing({ ...editing, [item.key]: c })}
                  />
                </div>
              ))}
            </div>

            <Separator />

            <div className="space-y-3">
              <Label className="text-base font-semibold">Recipients</Label>
              <div className="flex gap-2">
                <Input
                  value={newRecipient}
                  onChange={(e) => setNewRecipient(e.target.value)}
                  placeholder="team@company.com"
                  onKeyDown={(e) => e.key === "Enter" && addEmail("recipient_emails", newRecipient, setNewRecipient)}
                />
                <Button onClick={() => addEmail("recipient_emails", newRecipient, setNewRecipient)} variant="outline" size="sm">
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {(editing?.recipient_emails || []).map((email) => (
                  <Badge key={email} variant="secondary" className="pl-3 pr-1 py-1">
                    {email}
                    <Button variant="ghost" size="sm" className="h-5 w-5 p-0 ml-1" onClick={() => removeEmail("recipient_emails", email)}>
                      <X className="w-3 h-3" />
                    </Button>
                  </Badge>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <Label className="text-base font-semibold">CC (Seniors)</Label>
              <div className="flex gap-2">
                <Input
                  value={newCc}
                  onChange={(e) => setNewCc(e.target.value)}
                  placeholder="senior@company.com"
                  onKeyDown={(e) => e.key === "Enter" && addEmail("cc_emails", newCc, setNewCc)}
                />
                <Button onClick={() => addEmail("cc_emails", newCc, setNewCc)} variant="outline" size="sm">
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {(editing?.cc_emails || []).map((email) => (
                  <Badge key={email} variant="outline" className="pl-3 pr-1 py-1">
                    {email}
                    <Button variant="ghost" size="sm" className="h-5 w-5 p-0 ml-1" onClick={() => removeEmail("cc_emails", email)}>
                      <X className="w-3 h-3" />
                    </Button>
                  </Badge>
                ))}
              </div>
            </div>

            <Separator />
            <div className="flex items-center justify-between">
              <Label>Active</Label>
              <Switch
                checked={editing?.is_active ?? true}
                onCheckedChange={(c) => setEditing({ ...editing, is_active: c })}
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleSave} disabled={isSaving} className="bg-[hsl(var(--gold))] hover:bg-[hsl(var(--gold))]/90 text-[hsl(var(--charcoal))]">
                {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                {editing?.id ? "Update" : "Create"} Schedule
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
