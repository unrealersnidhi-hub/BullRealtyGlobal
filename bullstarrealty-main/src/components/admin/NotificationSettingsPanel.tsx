import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  Mail,
  MessageCircle,
  Inbox,
  Loader2,
  Save,
  Plus,
  X,
  Bell,
  Settings,
  AlertCircle,
  CheckCircle,
} from "lucide-react";

interface EmailNotificationSettings {
  enabled: boolean;
  from_email: string;
  from_name: string;
}

interface NotificationRecipients {
  admin_emails: string[];
  manager_emails: string[];
  notify_on_new_lead: boolean;
  notify_on_assignment: boolean;
  notify_on_status_change: boolean;
  notify_on_note_added: boolean;
  notify_on_followup: boolean;
}

interface WhatsAppSettings {
  enabled: boolean;
  api_key: string;
  phone_id: string;
  notify_on_new_lead: boolean;
  notify_on_assignment: boolean;
}

interface EmailCaptureSettings {
  enabled: boolean;
  outlook_client_id: string;
  outlook_tenant_id: string;
  imap_enabled: boolean;
  imap_host: string;
  imap_port: number;
}

export function NotificationSettingsPanel() {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isTestingEmail, setIsTestingEmail] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [newManagerEmail, setNewManagerEmail] = useState("");

  const [emailSettings, setEmailSettings] = useState<EmailNotificationSettings>({
    enabled: true,
    from_email: "notifications@bullstarrealty.ae",
    from_name: "Bull Star Realty CRM",
  });

  const [recipients, setRecipients] = useState<NotificationRecipients>({
    admin_emails: [],
    manager_emails: [],
    notify_on_new_lead: true,
    notify_on_assignment: true,
    notify_on_status_change: true,
    notify_on_note_added: false,
    notify_on_followup: true,
  });

  const [whatsappSettings, setWhatsappSettings] = useState<WhatsAppSettings>({
    enabled: false,
    api_key: "",
    phone_id: "",
    notify_on_new_lead: false,
    notify_on_assignment: false,
  });

  const [emailCaptureSettings, setEmailCaptureSettings] = useState<EmailCaptureSettings>({
    enabled: false,
    outlook_client_id: "",
    outlook_tenant_id: "",
    imap_enabled: false,
    imap_host: "",
    imap_port: 993,
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from("notification_settings")
        .select("*");

      if (error) throw error;

      data?.forEach((setting) => {
        const value = setting.setting_value as Record<string, unknown>;
        switch (setting.setting_key) {
          case "email_notifications":
            setEmailSettings(value as unknown as EmailNotificationSettings);
            break;
          case "notification_recipients":
            setRecipients(value as unknown as NotificationRecipients);
            break;
          case "whatsapp_notifications":
            setWhatsappSettings(value as unknown as WhatsAppSettings);
            break;
          case "email_capture":
            setEmailCaptureSettings(value as unknown as EmailCaptureSettings);
            break;
        }
      });
    } catch (error) {
      console.error("Error fetching settings:", error);
      toast.error("Failed to load notification settings");
    } finally {
      setIsLoading(false);
    }
  };

  const saveSettings = async (key: string, value: unknown) => {
    try {
      // Use upsert to handle both insert and update
      const { error } = await supabase
        .from("notification_settings")
        .upsert(
          { setting_key: key, setting_value: value as any, updated_at: new Date().toISOString() },
          { onConflict: "setting_key" }
        );

      if (error) {
        // Fallback to update if upsert fails
        const { error: updateError } = await supabase
          .from("notification_settings")
          .update({ setting_value: value as any, updated_at: new Date().toISOString() })
          .eq("setting_key", key);
        if (updateError) throw updateError;
      }
      return true;
    } catch (error) {
      console.error("Error saving settings:", error);
      return false;
    }
  };

  const handleSaveAll = async () => {
    setIsSaving(true);
    try {
      const results = await Promise.all([
        saveSettings("email_notifications", emailSettings),
        saveSettings("notification_recipients", recipients),
        saveSettings("whatsapp_notifications", whatsappSettings),
        saveSettings("email_capture", emailCaptureSettings),
      ]);

      if (results.every(Boolean)) {
        toast.success("All settings saved successfully");
      } else {
        toast.error("Some settings failed to save");
      }
    } finally {
      setIsSaving(false);
    }
  };

  const sendTestEmail = async () => {
    if (isTestingEmail) return;
    setIsTestingEmail(true);
    try {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError) throw sessionError;
      if (!session?.access_token) throw new Error("You are not signed in. Please sign in again.");

      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-lead-notification?debug=1`;

      const resp = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          type: "lead_created",
          lead_id: crypto.randomUUID(),
          lead_name: "Test Lead",
          lead_email: "test@example.com",
          lead_phone: "+971000000000",
          lead_source: "admin-test",
          lead_interest: "test",
        }),
      });

      const json = await resp.json().catch(() => ({}));

      if (!resp.ok) {
        throw new Error(json?.error || "Failed to send test email");
      }

      const lastEvent =
        json?.emailDetails?.last_event ??
        json?.emailDetails?.lastEvent ??
        undefined;

      toast.success(lastEvent ? `Test email accepted (${lastEvent})` : "Test email accepted");
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Failed to send test email";
      toast.error(msg);
    } finally {
      setIsTestingEmail(false);
    }
  };

  const addAdminEmail = () => {
    if (!newEmail || !newEmail.includes("@")) {
      toast.error("Please enter a valid email");
      return;
    }
    if (recipients.admin_emails.includes(newEmail)) {
      toast.error("Email already added");
      return;
    }
    setRecipients({
      ...recipients,
      admin_emails: [...recipients.admin_emails, newEmail],
    });
    setNewEmail("");
  };

  const removeAdminEmail = (email: string) => {
    setRecipients({
      ...recipients,
      admin_emails: recipients.admin_emails.filter((e) => e !== email),
    });
  };

  const addManagerEmail = () => {
    if (!newManagerEmail || !newManagerEmail.includes("@")) {
      toast.error("Please enter a valid email");
      return;
    }
    if (recipients.manager_emails.includes(newManagerEmail)) {
      toast.error("Email already added");
      return;
    }
    setRecipients({
      ...recipients,
      manager_emails: [...recipients.manager_emails, newManagerEmail],
    });
    setNewManagerEmail("");
  };

  const removeManagerEmail = (email: string) => {
    setRecipients({
      ...recipients,
      manager_emails: recipients.manager_emails.filter((e) => e !== email),
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-gold" />
      </div>
    );
  }

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl md:text-2xl font-bold flex items-center gap-2">
            <Bell className="w-5 h-5 md:w-6 md:h-6 text-gold" />
            Notification Settings
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Configure email notifications, WhatsApp alerts, and email capture settings
          </p>
        </div>
        <Button onClick={handleSaveAll} disabled={isSaving} className="bg-gold hover:bg-gold-dark text-charcoal w-full sm:w-auto">
          {isSaving ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Save className="w-4 h-4 mr-2" />
          )}
          Save All Settings
        </Button>
      </div>

      <Tabs defaultValue="email" className="space-y-4 md:space-y-6">
        <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0 pb-2">
          <TabsList className="bg-background border border-border inline-flex min-w-max">
            <TabsTrigger value="email" className="data-[state=active]:bg-accent-soft text-xs md:text-sm px-2 md:px-3">
              <Mail className="w-3.5 h-3.5 md:w-4 md:h-4 mr-1 md:mr-2" />
              <span className="hidden sm:inline">Email Notifications</span>
              <span className="sm:hidden">Email</span>
            </TabsTrigger>
            <TabsTrigger value="whatsapp" className="data-[state=active]:bg-accent-soft text-xs md:text-sm px-2 md:px-3">
              <MessageCircle className="w-3.5 h-3.5 md:w-4 md:h-4 mr-1 md:mr-2" />
              WhatsApp
            </TabsTrigger>
            <TabsTrigger value="capture" className="data-[state=active]:bg-accent-soft text-xs md:text-sm px-2 md:px-3">
              <Inbox className="w-3.5 h-3.5 md:w-4 md:h-4 mr-1 md:mr-2" />
              <span className="hidden sm:inline">Email Capture</span>
              <span className="sm:hidden">Capture</span>
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Email Notifications Tab */}
        <TabsContent value="email" className="space-y-6">
          {/* Email Configuration */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5" />
                Email Configuration
              </CardTitle>
              <CardDescription>
                Configure the sender email and enable/disable email notifications
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Enable Email Notifications</Label>
                  <p className="text-sm text-muted-foreground">
                    Send email alerts for lead activities
                  </p>
                </div>
                <Switch
                  checked={emailSettings.enabled}
                  onCheckedChange={(checked) =>
                    setEmailSettings({ ...emailSettings, enabled: checked })
                  }
                />
              </div>
              <Separator />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>From Email</Label>
                  <Input
                    value={emailSettings.from_email}
                    onChange={(e) =>
                      setEmailSettings({ ...emailSettings, from_email: e.target.value })
                    }
                    placeholder="notifications@yourdomain.com"
                  />
                  <p className="text-xs text-muted-foreground">
                    Must be a verified domain in Resend
                  </p>
                </div>
                <div className="space-y-2">
                  <Label>From Name</Label>
                  <Input
                    value={emailSettings.from_name}
                    onChange={(e) =>
                      setEmailSettings({ ...emailSettings, from_name: e.target.value })
                    }
                    placeholder="Your Company CRM"
                  />
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-lg border border-border bg-muted/30 p-4">
                <div>
                  <p className="text-sm font-medium">Send a test email</p>
                  <p className="text-xs text-muted-foreground">
                    This sends a “Test Lead” notification to your configured recipients and shows Resend’s latest event.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={sendTestEmail}
                  disabled={isTestingEmail}
                  className="w-full sm:w-auto"
                >
                  {isTestingEmail ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <CheckCircle className="w-4 h-4 mr-2" />
                  )}
                  Send Test Email
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Notification Recipients */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="w-5 h-5" />
                Notification Recipients
              </CardTitle>
              <CardDescription>
                Add email addresses to receive lead notifications
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Admin Emails */}
              <div className="space-y-3">
                <Label className="text-base font-semibold">Admin Emails</Label>
                <div className="flex gap-2">
                  <Input
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="admin@company.com"
                    onKeyDown={(e) => e.key === "Enter" && addAdminEmail()}
                  />
                  <Button onClick={addAdminEmail} variant="outline">
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {recipients.admin_emails.length === 0 ? (
                    <p className="text-sm text-muted-foreground flex items-center gap-2">
                      <AlertCircle className="w-4 h-4" />
                      No admin emails configured - notifications won't be sent
                    </p>
                  ) : (
                    recipients.admin_emails.map((email) => (
                      <Badge key={email} variant="secondary" className="pl-3 pr-1 py-1">
                        {email}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-5 w-5 p-0 ml-1 hover:bg-destructive/20"
                          onClick={() => removeAdminEmail(email)}
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </Badge>
                    ))
                  )}
                </div>
              </div>

              <Separator />

              {/* Manager Emails */}
              <div className="space-y-3">
                <Label className="text-base font-semibold">Manager / Sales Team Emails</Label>
                <div className="flex gap-2">
                  <Input
                    value={newManagerEmail}
                    onChange={(e) => setNewManagerEmail(e.target.value)}
                    placeholder="manager@company.com"
                    onKeyDown={(e) => e.key === "Enter" && addManagerEmail()}
                  />
                  <Button onClick={addManagerEmail} variant="outline">
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {recipients.manager_emails.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No manager emails configured
                    </p>
                  ) : (
                    recipients.manager_emails.map((email) => (
                      <Badge key={email} variant="secondary" className="pl-3 pr-1 py-1">
                        {email}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-5 w-5 p-0 ml-1 hover:bg-destructive/20"
                          onClick={() => removeManagerEmail(email)}
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </Badge>
                    ))
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Notification Triggers */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="w-5 h-5" />
                Notification Triggers
              </CardTitle>
              <CardDescription>
                Choose which events trigger email notifications
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                { key: "notify_on_new_lead", label: "New Lead Captured", desc: "When a new lead is submitted from any source" },
                { key: "notify_on_assignment", label: "Lead Assigned", desc: "When a lead is assigned to a team member" },
                { key: "notify_on_status_change", label: "Status Changed", desc: "When lead status is updated (hot, warm, cold, etc.)" },
                { key: "notify_on_note_added", label: "Note Added", desc: "When a note is added to a lead" },
                { key: "notify_on_followup", label: "Follow-up Scheduled/Completed", desc: "When follow-ups are scheduled or marked complete" },
              ].map((item) => (
                <div key={item.key} className="flex items-center justify-between py-2">
                  <div>
                    <Label>{item.label}</Label>
                    <p className="text-sm text-muted-foreground">{item.desc}</p>
                  </div>
                  <Switch
                    checked={recipients[item.key as keyof NotificationRecipients] as boolean}
                    onCheckedChange={(checked) =>
                      setRecipients({ ...recipients, [item.key]: checked })
                    }
                  />
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* WhatsApp Tab */}
        <TabsContent value="whatsapp" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageCircle className="w-5 h-5 text-[#25D366]" />
                WhatsApp Business API
              </CardTitle>
              <CardDescription>
                Configure WhatsApp notifications for lead alerts (Coming Soon)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Enable WhatsApp Notifications</Label>
                  <p className="text-sm text-muted-foreground">
                    Send WhatsApp messages for lead alerts
                  </p>
                </div>
                <Switch
                  checked={whatsappSettings.enabled}
                  onCheckedChange={(checked) =>
                    setWhatsappSettings({ ...whatsappSettings, enabled: checked })
                  }
                />
              </div>
              <Separator />
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>WhatsApp Business API Key</Label>
                  <Input
                    type="password"
                    value={whatsappSettings.api_key}
                    onChange={(e) =>
                      setWhatsappSettings({ ...whatsappSettings, api_key: e.target.value })
                    }
                    placeholder="Enter your WhatsApp Business API key"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Phone Number ID</Label>
                  <Input
                    value={whatsappSettings.phone_id}
                    onChange={(e) =>
                      setWhatsappSettings({ ...whatsappSettings, phone_id: e.target.value })
                    }
                    placeholder="Enter your WhatsApp phone number ID"
                  />
                </div>
              </div>
              <Separator />
              <div className="space-y-4">
                <Label className="text-base font-semibold">WhatsApp Notification Triggers</Label>
                {[
                  { key: "notify_on_new_lead", label: "New Lead Captured" },
                  { key: "notify_on_assignment", label: "Lead Assigned" },
                ].map((item) => (
                  <div key={item.key} className="flex items-center justify-between py-2">
                    <Label>{item.label}</Label>
                    <Switch
                      checked={whatsappSettings[item.key as keyof WhatsAppSettings] as boolean}
                      onCheckedChange={(checked) =>
                        setWhatsappSettings({ ...whatsappSettings, [item.key]: checked })
                      }
                    />
                  </div>
                ))}
              </div>
              <div className="p-4 bg-muted/50 rounded-lg flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-amber-500 mt-0.5" />
                <div>
                  <p className="font-medium">Coming Soon</p>
                  <p className="text-sm text-muted-foreground">
                    WhatsApp Business API integration is currently in development. 
                    Configure your settings now and they'll be ready when the feature launches.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Email Capture Tab */}
        <TabsContent value="capture" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Inbox className="w-5 h-5 text-blue-500" />
                Email Lead Capture
              </CardTitle>
              <CardDescription>
                Automatically capture leads from incoming emails (Coming Soon)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Enable Email Capture</Label>
                  <p className="text-sm text-muted-foreground">
                    Automatically create leads from incoming emails
                  </p>
                </div>
                <Switch
                  checked={emailCaptureSettings.enabled}
                  onCheckedChange={(checked) =>
                    setEmailCaptureSettings({ ...emailCaptureSettings, enabled: checked })
                  }
                />
              </div>
              <Separator />
              
              {/* Outlook / Microsoft 365 */}
              <div className="space-y-4">
                <Label className="text-base font-semibold">Microsoft 365 / Outlook</Label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Client ID</Label>
                    <Input
                      value={emailCaptureSettings.outlook_client_id}
                      onChange={(e) =>
                        setEmailCaptureSettings({ ...emailCaptureSettings, outlook_client_id: e.target.value })
                      }
                      placeholder="Azure App Client ID"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Tenant ID</Label>
                    <Input
                      value={emailCaptureSettings.outlook_tenant_id}
                      onChange={(e) =>
                        setEmailCaptureSettings({ ...emailCaptureSettings, outlook_tenant_id: e.target.value })
                      }
                      placeholder="Azure Tenant ID"
                    />
                  </div>
                </div>
              </div>
              
              <Separator />
              
              {/* IMAP Settings */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-base font-semibold">IMAP Email Capture</Label>
                    <p className="text-sm text-muted-foreground">
                      Connect any email via IMAP
                    </p>
                  </div>
                  <Switch
                    checked={emailCaptureSettings.imap_enabled}
                    onCheckedChange={(checked) =>
                      setEmailCaptureSettings({ ...emailCaptureSettings, imap_enabled: checked })
                    }
                  />
                </div>
                {emailCaptureSettings.imap_enabled && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>IMAP Host</Label>
                      <Input
                        value={emailCaptureSettings.imap_host}
                        onChange={(e) =>
                          setEmailCaptureSettings({ ...emailCaptureSettings, imap_host: e.target.value })
                        }
                        placeholder="imap.gmail.com"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>IMAP Port</Label>
                      <Input
                        type="number"
                        value={emailCaptureSettings.imap_port}
                        onChange={(e) =>
                          setEmailCaptureSettings({ ...emailCaptureSettings, imap_port: parseInt(e.target.value) || 993 })
                        }
                        placeholder="993"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="p-4 bg-muted/50 rounded-lg flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-amber-500 mt-0.5" />
                <div>
                  <p className="font-medium">Coming Soon</p>
                  <p className="text-sm text-muted-foreground">
                    Email capture from Outlook and IMAP is currently in development. 
                    Configure your settings now and they'll be ready when the feature launches.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
