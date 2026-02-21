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
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  Mail, Plus, X, Loader2, Save, Pencil, Trash2, Shield, Users, Bell,
} from "lucide-react";

interface NotificationRule {
  id: string;
  name: string;
  description: string | null;
  event_type: string;
  is_active: boolean;
  send_to_assignee: boolean;
  send_to_admin: boolean;
  cc_emails: string[];
  email_subject_template: string | null;
  priority: string;
  created_by: string;
  created_at: string;
}

const EVENT_TYPES = [
  { value: "lead_created", label: "New Lead Created" },
  { value: "lead_assigned", label: "Lead Assigned" },
  { value: "status_changed", label: "Lead Status Changed" },
  { value: "note_added", label: "Note Added to Lead" },
  { value: "followup_scheduled", label: "Follow-up Scheduled" },
  { value: "followup_completed", label: "Follow-up Completed" },
  { value: "meeting_scheduled", label: "Meeting Scheduled" },
  { value: "lead_converted", label: "Lead Converted" },
];

const PRIORITIES = [
  { value: "low", label: "Low" },
  { value: "normal", label: "Normal" },
  { value: "high", label: "High (CC Seniors)" },
  { value: "urgent", label: "Urgent (CC All Managers)" },
];

const emptyRule = (): Omit<NotificationRule, "id" | "created_by" | "created_at"> => ({
  name: "",
  description: null,
  event_type: "lead_created",
  is_active: true,
  send_to_assignee: true,
  send_to_admin: true,
  cc_emails: [],
  email_subject_template: null,
  priority: "normal",
});

export function EmailNotificationRulesPanel() {
  const [rules, setRules] = useState<NotificationRule[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingRule, setEditingRule] = useState<Partial<NotificationRule> | null>(null);
  const [newCcEmail, setNewCcEmail] = useState("");

  useEffect(() => {
    fetchRules();
  }, []);

  const fetchRules = async () => {
    try {
      const { data, error } = await supabase
        .from("email_notification_rules")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      setRules((data as any[]) || []);
    } catch (e) {
      console.error(e);
      toast.error("Failed to load notification rules");
    } finally {
      setIsLoading(false);
    }
  };

  const openCreate = () => {
    setEditingRule(emptyRule());
    setIsDialogOpen(true);
  };

  const openEdit = (rule: NotificationRule) => {
    setEditingRule({ ...rule });
    setIsDialogOpen(true);
  };

  const addCcEmail = () => {
    if (!newCcEmail || !newCcEmail.includes("@")) {
      toast.error("Enter a valid email");
      return;
    }
    if (editingRule?.cc_emails?.includes(newCcEmail)) {
      toast.error("Already added");
      return;
    }
    setEditingRule({
      ...editingRule,
      cc_emails: [...(editingRule?.cc_emails || []), newCcEmail],
    });
    setNewCcEmail("");
  };

  const removeCcEmail = (email: string) => {
    setEditingRule({
      ...editingRule,
      cc_emails: (editingRule?.cc_emails || []).filter((e) => e !== email),
    });
  };

  const handleSave = async () => {
    if (!editingRule?.name?.trim()) {
      toast.error("Rule name is required");
      return;
    }
    setIsSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const payload = {
        name: editingRule.name,
        description: editingRule.description || null,
        event_type: editingRule.event_type!,
        is_active: editingRule.is_active ?? true,
        send_to_assignee: editingRule.send_to_assignee ?? true,
        send_to_admin: editingRule.send_to_admin ?? true,
        cc_emails: editingRule.cc_emails || [],
        email_subject_template: editingRule.email_subject_template || null,
        priority: editingRule.priority || "normal",
        created_by: user.id,
      };

      if (editingRule.id) {
        const { error } = await supabase
          .from("email_notification_rules")
          .update(payload as any)
          .eq("id", editingRule.id);
        if (error) throw error;
        toast.success("Rule updated");
      } else {
        const { error } = await supabase
          .from("email_notification_rules")
          .insert(payload as any);
        if (error) throw error;
        toast.success("Rule created");
      }
      setIsDialogOpen(false);
      setEditingRule(null);
      fetchRules();
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || "Failed to save rule");
    } finally {
      setIsSaving(false);
    }
  };

  const toggleActive = async (rule: NotificationRule) => {
    try {
      const { error } = await supabase
        .from("email_notification_rules")
        .update({ is_active: !rule.is_active } as any)
        .eq("id", rule.id);
      if (error) throw error;
      setRules(rules.map((r) => (r.id === rule.id ? { ...r, is_active: !r.is_active } : r)));
    } catch (e) {
      toast.error("Failed to update");
    }
  };

  const deleteRule = async (id: string) => {
    try {
      const { error } = await supabase.from("email_notification_rules").delete().eq("id", id);
      if (error) throw error;
      setRules(rules.filter((r) => r.id !== id));
      toast.success("Rule deleted");
    } catch (e) {
      toast.error("Failed to delete");
    }
  };

  const getEventLabel = (type: string) =>
    EVENT_TYPES.find((e) => e.value === type)?.label || type;

  const getPriorityColor = (p: string) => {
    switch (p) {
      case "urgent": return "bg-red-500/10 text-red-500";
      case "high": return "bg-orange-500/10 text-orange-500";
      case "normal": return "bg-blue-500/10 text-blue-500";
      default: return "bg-muted text-muted-foreground";
    }
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
                <Shield className="w-5 h-5 text-[hsl(var(--gold))]" />
                Email Notification Rules
              </CardTitle>
              <CardDescription>
                Define rules for which emails are sent, to whom, and who gets CC'd (seniors/managers)
              </CardDescription>
            </div>
            <Button onClick={openCreate} className="bg-[hsl(var(--gold))] hover:bg-[hsl(var(--gold))]/90 text-[hsl(var(--charcoal))]">
              <Plus className="w-4 h-4 mr-2" />
              Add Rule
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {rules.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Bell className="w-10 h-10 mx-auto mb-3 opacity-50" />
              <p>No notification rules configured yet.</p>
              <p className="text-sm mt-1">Create rules to control email notifications with CC for seniors.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Rule Name</TableHead>
                  <TableHead>Event</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Recipients</TableHead>
                  <TableHead>CC</TableHead>
                  <TableHead>Active</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rules.map((rule) => (
                  <TableRow key={rule.id}>
                    <TableCell className="font-medium">{rule.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {getEventLabel(rule.event_type)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={getPriorityColor(rule.priority)}>
                        {rule.priority}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1 flex-wrap">
                        {rule.send_to_assignee && <Badge variant="secondary" className="text-xs">Assignee</Badge>}
                        {rule.send_to_admin && <Badge variant="secondary" className="text-xs">Admin</Badge>}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1 flex-wrap max-w-[200px]">
                        {rule.cc_emails.length === 0 ? (
                          <span className="text-xs text-muted-foreground">None</span>
                        ) : (
                          rule.cc_emails.map((e) => (
                            <Badge key={e} variant="outline" className="text-xs">{e}</Badge>
                          ))
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Switch checked={rule.is_active} onCheckedChange={() => toggleActive(rule)} />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-1 justify-end">
                        <Button variant="ghost" size="sm" onClick={() => openEdit(rule)}>
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => deleteRule(rule.id)} className="text-destructive">
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
            <DialogTitle>{editingRule?.id ? "Edit Rule" : "Create Notification Rule"}</DialogTitle>
            <DialogDescription>
              Define when to send emails and who should be CC'd
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Rule Name *</Label>
              <Input
                value={editingRule?.name || ""}
                onChange={(e) => setEditingRule({ ...editingRule, name: e.target.value })}
                placeholder="e.g., Hot Lead Alert to Seniors"
              />
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={editingRule?.description || ""}
                onChange={(e) => setEditingRule({ ...editingRule, description: e.target.value })}
                placeholder="Describe when this rule should trigger"
                rows={2}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Event Type</Label>
                <Select
                  value={editingRule?.event_type || "lead_created"}
                  onValueChange={(v) => setEditingRule({ ...editingRule, event_type: v })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {EVENT_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Priority</Label>
                <Select
                  value={editingRule?.priority || "normal"}
                  onValueChange={(v) => setEditingRule({ ...editingRule, priority: v })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PRIORITIES.map((p) => (
                      <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Custom Subject Line (optional)</Label>
              <Input
                value={editingRule?.email_subject_template || ""}
                onChange={(e) => setEditingRule({ ...editingRule, email_subject_template: e.target.value })}
                placeholder="e.g., 🔥 Hot Lead Alert: {{lead_name}}"
              />
              <p className="text-xs text-muted-foreground">Use {"{{lead_name}}"}, {"{{status}}"} as placeholders</p>
            </div>

            <Separator />

            <div className="space-y-3">
              <Label className="text-base font-semibold">Send To</Label>
              <div className="flex items-center justify-between py-1">
                <div>
                  <Label>Lead Assignee</Label>
                  <p className="text-xs text-muted-foreground">Person assigned to the lead</p>
                </div>
                <Switch
                  checked={editingRule?.send_to_assignee ?? true}
                  onCheckedChange={(c) => setEditingRule({ ...editingRule, send_to_assignee: c })}
                />
              </div>
              <div className="flex items-center justify-between py-1">
                <div>
                  <Label>Admin</Label>
                  <p className="text-xs text-muted-foreground">All configured admin emails</p>
                </div>
                <Switch
                  checked={editingRule?.send_to_admin ?? true}
                  onCheckedChange={(c) => setEditingRule({ ...editingRule, send_to_admin: c })}
                />
              </div>
            </div>

            <Separator />

            <div className="space-y-3">
              <Label className="text-base font-semibold flex items-center gap-2">
                <Users className="w-4 h-4" />
                CC (Seniors / Managers)
              </Label>
              <div className="flex gap-2">
                <Input
                  value={newCcEmail}
                  onChange={(e) => setNewCcEmail(e.target.value)}
                  placeholder="senior@company.com"
                  onKeyDown={(e) => e.key === "Enter" && addCcEmail()}
                />
                <Button onClick={addCcEmail} variant="outline" size="sm">
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {(editingRule?.cc_emails || []).length === 0 ? (
                  <p className="text-sm text-muted-foreground">No CC recipients added</p>
                ) : (
                  (editingRule?.cc_emails || []).map((email) => (
                    <Badge key={email} variant="secondary" className="pl-3 pr-1 py-1">
                      {email}
                      <Button
                        variant="ghost" size="sm"
                        className="h-5 w-5 p-0 ml-1 hover:bg-destructive/20"
                        onClick={() => removeCcEmail(email)}
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </Badge>
                  ))
                )}
              </div>
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <Label>Active</Label>
              <Switch
                checked={editingRule?.is_active ?? true}
                onCheckedChange={(c) => setEditingRule({ ...editingRule, is_active: c })}
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleSave} disabled={isSaving} className="bg-[hsl(var(--gold))] hover:bg-[hsl(var(--gold))]/90 text-[hsl(var(--charcoal))]">
                {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                {editingRule?.id ? "Update" : "Create"} Rule
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
