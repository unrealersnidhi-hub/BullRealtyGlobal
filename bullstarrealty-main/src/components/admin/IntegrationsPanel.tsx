import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import {
  Key,
  Webhook,
  Plus,
  Copy,
  Trash2,
  Loader2,
  CheckCircle,
  XCircle,
  RefreshCw,
  Building2,
  Share2,
  Eye,
  EyeOff,
  ExternalLink,
  Globe,
  Code,
  ChevronDown,
  Settings,
} from "lucide-react";
import { format } from "date-fns";
import { TestIntegrationButton } from "./integrations/TestIntegrationButton";
import { IntegrationUsageGuide } from "./integrations/IntegrationUsageGuide";

type IntegrationSource =
  | "99acres"
  | "magicbricks"
  | "housing"
  | "proptiger"
  | "bayut"
  | "property_finder"
  | "dubizzle"
  | "facebook"
  | "instagram"
  | "google_ads"
  | "linkedin"
  | "custom";

interface ApiKey {
  id: string;
  name: string;
  api_key: string;
  source: IntegrationSource;
  description: string | null;
  is_active: boolean;
  last_used_at: string | null;
  request_count: number;
  created_at: string;
  expires_at: string | null;
}

interface WebhookEntry {
  id: string;
  name: string;
  webhook_token: string;
  source: IntegrationSource;
  description: string | null;
  is_active: boolean;
  last_triggered_at: string | null;
  trigger_count: number;
  created_at: string;
}

interface IntegrationLog {
  id: string;
  integration_type: string;
  source: IntegrationSource;
  status: string;
  error_message: string | null;
  created_at: string;
  lead_id: string | null;
}

const SOURCE_OPTIONS: { value: IntegrationSource; label: string; category: "property" | "social" | "website" }[] = [
  { value: "99acres", label: "99acres", category: "property" },
  { value: "magicbricks", label: "MagicBricks", category: "property" },
  { value: "housing", label: "Housing.com", category: "property" },
  { value: "proptiger", label: "PropTiger", category: "property" },
  { value: "bayut", label: "Bayut", category: "property" },
  { value: "property_finder", label: "Property Finder", category: "property" },
  { value: "dubizzle", label: "Dubizzle", category: "property" },
  { value: "facebook", label: "Facebook Leads", category: "social" },
  { value: "instagram", label: "Instagram", category: "social" },
  { value: "google_ads", label: "Google Ads", category: "social" },
  { value: "linkedin", label: "LinkedIn", category: "social" },
  { value: "custom", label: "Custom / External Website", category: "website" },
];

export function IntegrationsPanel() {
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [webhooks, setWebhooks] = useState<WebhookEntry[]>([]);
  const [logs, setLogs] = useState<IntegrationLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreatingKey, setIsCreatingKey] = useState(false);
  const [isCreatingWebhook, setIsCreatingWebhook] = useState(false);
  const [deleteItem, setDeleteItem] = useState<{ type: "api_key" | "webhook"; id: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showApiKey, setShowApiKey] = useState<string | null>(null);
  const [showUsageGuide, setShowUsageGuide] = useState<string | null>(null);
  const [isCreateKeyOpen, setIsCreateKeyOpen] = useState(false);
  const [isCreateWebhookOpen, setIsCreateWebhookOpen] = useState(false);

  const [newKeyForm, setNewKeyForm] = useState({
    name: "",
    source: "custom" as IntegrationSource,
    description: "",
    expiresInDays: "",
  });

  const [newWebhookForm, setNewWebhookForm] = useState({
    name: "",
    source: "custom" as IntegrationSource,
    description: "",
  });

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [keysRes, webhooksRes, logsRes] = await Promise.all([
        supabase.from("api_keys").select("*").order("created_at", { ascending: false }),
        supabase.from("webhooks").select("*").order("created_at", { ascending: false }),
        supabase
          .from("integration_logs")
          .select("id, integration_type, source, status, error_message, created_at, lead_id")
          .order("created_at", { ascending: false })
          .limit(50),
      ]);

      if (keysRes.error) throw keysRes.error;
      if (webhooksRes.error) throw webhooksRes.error;
      if (logsRes.error) throw logsRes.error;

      setApiKeys((keysRes.data as ApiKey[]) || []);
      setWebhooks((webhooksRes.data as WebhookEntry[]) || []);
      setLogs((logsRes.data as IntegrationLog[]) || []);
    } catch (error) {
      console.error("Error fetching integrations:", error);
      toast.error("Failed to load integrations");
    } finally {
      setIsLoading(false);
    }
  };

  const generateApiKey = async () => {
    if (!newKeyForm.name) {
      toast.error("Name is required");
      return;
    }

    setIsCreatingKey(true);
    try {
      // Generate key using database function
      const { data: keyData, error: keyError } = await supabase.rpc("generate_api_key");
      if (keyError) throw keyError;

      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("Not authenticated");

      const expiresAt = newKeyForm.expiresInDays
        ? new Date(Date.now() + parseInt(newKeyForm.expiresInDays) * 24 * 60 * 60 * 1000).toISOString()
        : null;

      const { error: insertError } = await supabase.from("api_keys").insert({
        name: newKeyForm.name,
        api_key: keyData,
        source: newKeyForm.source,
        description: newKeyForm.description || null,
        created_by: userData.user.id,
        expires_at: expiresAt,
      });

      if (insertError) throw insertError;

      toast.success("API key created successfully");
      setIsCreateKeyOpen(false);
      setNewKeyForm({ name: "", source: "custom", description: "", expiresInDays: "" });
      fetchData();
    } catch (error: any) {
      console.error("Error creating API key:", error);
      toast.error(error.message || "Failed to create API key");
    } finally {
      setIsCreatingKey(false);
    }
  };

  const generateWebhook = async () => {
    if (!newWebhookForm.name) {
      toast.error("Name is required");
      return;
    }

    setIsCreatingWebhook(true);
    try {
      // Generate token using database function
      const { data: tokenData, error: tokenError } = await supabase.rpc("generate_webhook_token");
      if (tokenError) throw tokenError;

      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("Not authenticated");

      const { error: insertError } = await supabase.from("webhooks").insert({
        name: newWebhookForm.name,
        webhook_token: tokenData,
        source: newWebhookForm.source,
        description: newWebhookForm.description || null,
        created_by: userData.user.id,
      });

      if (insertError) throw insertError;

      toast.success("Webhook created successfully");
      setIsCreateWebhookOpen(false);
      setNewWebhookForm({ name: "", source: "custom", description: "" });
      fetchData();
    } catch (error: any) {
      console.error("Error creating webhook:", error);
      toast.error(error.message || "Failed to create webhook");
    } finally {
      setIsCreatingWebhook(false);
    }
  };

  const toggleActive = async (type: "api_key" | "webhook", id: string, isActive: boolean) => {
    try {
      const table = type === "api_key" ? "api_keys" : "webhooks";
      const { error } = await supabase.from(table).update({ is_active: !isActive }).eq("id", id);

      if (error) throw error;

      toast.success(`${type === "api_key" ? "API key" : "Webhook"} ${isActive ? "disabled" : "enabled"}`);
      fetchData();
    } catch (error) {
      console.error("Error toggling status:", error);
      toast.error("Failed to update status");
    }
  };

  const handleDelete = async () => {
    if (!deleteItem) return;

    setIsDeleting(true);
    try {
      const table = deleteItem.type === "api_key" ? "api_keys" : "webhooks";
      const { error } = await supabase.from(table).delete().eq("id", deleteItem.id);

      if (error) throw error;

      toast.success(`${deleteItem.type === "api_key" ? "API key" : "Webhook"} deleted`);
      setDeleteItem(null);
      fetchData();
    } catch (error) {
      console.error("Error deleting:", error);
      toast.error("Failed to delete");
    } finally {
      setIsDeleting(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard`);
  };

  const getWebhookUrl = (token: string) => {
    return `${supabaseUrl}/functions/v1/lead-webhook/${token}`;
  };

  const maskApiKey = (key: string) => {
    return `${key.slice(0, 8)}${"•".repeat(32)}${key.slice(-4)}`;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-gold" />
      </div>
    );
  }

  // Get active integrations (both API keys and webhooks that are active)
  const activeIntegrations = [
    ...apiKeys.filter(k => k.is_active).map(k => ({
      id: k.id,
      name: k.name,
      type: 'api_key' as const,
      source: k.source,
      lastUsed: k.last_used_at,
      requestCount: k.request_count,
    })),
    ...webhooks.filter(w => w.is_active).map(w => ({
      id: w.id,
      name: w.name,
      type: 'webhook' as const,
      source: w.source,
      lastUsed: w.last_triggered_at,
      requestCount: w.trigger_count,
    })),
  ];

  const getSourceIcon = (source: IntegrationSource) => {
    if (['facebook', 'instagram', 'google_ads', 'linkedin'].includes(source)) {
      return Share2;
    }
    return Building2;
  };

  const getSourceColor = (source: IntegrationSource) => {
    const colors: Record<string, string> = {
      '99acres': 'bg-red-500/10 text-red-500 border-red-500/20',
      'magicbricks': 'bg-purple-500/10 text-purple-500 border-purple-500/20',
      'housing': 'bg-blue-500/10 text-blue-500 border-blue-500/20',
      'proptiger': 'bg-orange-500/10 text-orange-500 border-orange-500/20',
      'bayut': 'bg-cyan-500/10 text-cyan-500 border-cyan-500/20',
      'property_finder': 'bg-green-500/10 text-green-500 border-green-500/20',
      'dubizzle': 'bg-pink-500/10 text-pink-500 border-pink-500/20',
      'facebook': 'bg-blue-600/10 text-blue-600 border-blue-600/20',
      'instagram': 'bg-gradient-to-r from-purple-500/10 to-pink-500/10 text-pink-500 border-pink-500/20',
      'google_ads': 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20',
      'linkedin': 'bg-blue-700/10 text-blue-700 border-blue-700/20',
      'custom': 'bg-gold/10 text-gold border-gold/20',
    };
    return colors[source] || colors.custom;
  };

  return (
    <div className="space-y-6">
      {/* Active Integrations Cards */}
      {activeIntegrations.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-500" />
            Active Integrations
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {activeIntegrations.map((integration) => {
              const IconComponent = getSourceIcon(integration.source);
              return (
                <Card key={`${integration.type}-${integration.id}`} className={cn("border-2 transition-all hover:shadow-md", getSourceColor(integration.source))}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center", getSourceColor(integration.source))}>
                          <IconComponent className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="font-semibold text-sm truncate max-w-[120px]">{integration.name}</p>
                          <Badge variant="outline" className="text-[10px] mt-1">
                            {integration.type === 'api_key' ? 'API Key' : 'Webhook'}
                          </Badge>
                        </div>
                      </div>
                      <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                    </div>
                    <div className="space-y-1 text-xs text-muted-foreground">
                      <p className="capitalize">{integration.source.replace('_', ' ')}</p>
                      <p>{integration.requestCount} requests</p>
                      {integration.lastUsed && (
                        <p>Last: {format(new Date(integration.lastUsed), 'MMM d, HH:mm')}</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-card to-background border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Key className="w-5 h-5 text-gold" />
              API Keys
            </CardTitle>
            <CardDescription>For programmatic lead submission</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{apiKeys.length}</p>
            <p className="text-xs text-muted-foreground mt-1">
              <span className="text-green-500 font-medium">{apiKeys.filter((k) => k.is_active).length}</span> active
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-card to-background border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Webhook className="w-5 h-5 text-gold" />
              Webhooks
            </CardTitle>
            <CardDescription>For portal integrations</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{webhooks.length}</p>
            <p className="text-xs text-muted-foreground mt-1">
              <span className="text-green-500 font-medium">{webhooks.filter((w) => w.is_active).length}</span> active
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-card to-background border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Share2 className="w-5 h-5 text-gold" />
              Today's Leads
            </CardTitle>
            <CardDescription>Via integrations</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">
              {logs.filter((l) => l.status === "success" && new Date(l.created_at).toDateString() === new Date().toDateString()).length}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              <span className="text-red-500 font-medium">{logs.filter((l) => l.status === "failed" && new Date(l.created_at).toDateString() === new Date().toDateString()).length}</span> failed
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Integration Tabs */}
      <Tabs defaultValue="website-integration" className="space-y-4">
        <TabsList className="bg-background border border-border">
          <TabsTrigger value="website-integration" className="data-[state=active]:bg-accent-soft">
            <Globe className="w-4 h-4 mr-2" />
            External Website
          </TabsTrigger>
          <TabsTrigger value="api-keys" className="data-[state=active]:bg-accent-soft">
            <Key className="w-4 h-4 mr-2" />
            API Keys
          </TabsTrigger>
          <TabsTrigger value="webhooks" className="data-[state=active]:bg-accent-soft">
            <Webhook className="w-4 h-4 mr-2" />
            Webhooks
          </TabsTrigger>
          <TabsTrigger value="logs" className="data-[state=active]:bg-accent-soft">
            <RefreshCw className="w-4 h-4 mr-2" />
            Activity Logs
          </TabsTrigger>
        </TabsList>

        {/* Website Integration Tab */}
        <TabsContent value="website-integration">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="w-5 h-5 text-gold" />
                Connect Your External Website
              </CardTitle>
              <CardDescription>
                Capture leads from your external website's contact form by adding a simple code snippet
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Step 1: Create Webhook */}
              <div className="space-y-3">
                <h4 className="font-semibold flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-gold/20 text-gold text-sm flex items-center justify-center">1</span>
                  Create a Webhook for Your Website
                </h4>
                <p className="text-sm text-muted-foreground ml-8">
                  First, create a webhook in the "Webhooks" tab above with source set to "Custom / External Website". 
                  This will generate a unique URL for your website.
                </p>
              </div>

              {/* Step 2: Code Snippet */}
              <div className="space-y-3">
                <h4 className="font-semibold flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-gold/20 text-gold text-sm flex items-center justify-center">2</span>
                  Add This Code to Your Website
                </h4>
                <div className="ml-8 space-y-4">
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">JavaScript Code (Add to your form submit handler)</Label>
                    <div className="relative">
                      <pre className="bg-muted rounded-lg p-4 text-xs overflow-x-auto">
{`// Replace YOUR_WEBHOOK_TOKEN with your actual webhook token
const WEBHOOK_URL = "${supabaseUrl}/functions/v1/lead-webhook/YOUR_WEBHOOK_TOKEN";

async function submitLead(formData) {
  const response = await fetch(WEBHOOK_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      full_name: formData.name,      // Required
      email: formData.email,          // Required
      phone: formData.phone,          // Optional
      interest: formData.interest,    // Optional
      message: formData.message,      // Optional
    }),
  });
  
  const result = await response.json();
  if (result.success) {
    console.log("Lead captured:", result.lead_id);
  }
}`}
                      </pre>
                      <Button
                        size="sm"
                        variant="outline"
                        className="absolute top-2 right-2"
                        onClick={() => copyToClipboard(`const WEBHOOK_URL = "${supabaseUrl}/functions/v1/lead-webhook/YOUR_WEBHOOK_TOKEN";\n\nasync function submitLead(formData) {\n  const response = await fetch(WEBHOOK_URL, {\n    method: "POST",\n    headers: {\n      "Content-Type": "application/json",\n    },\n    body: JSON.stringify({\n      full_name: formData.name,\n      email: formData.email,\n      phone: formData.phone,\n      interest: formData.interest,\n      message: formData.message,\n    }),\n  });\n  \n  const result = await response.json();\n  if (result.success) {\n    console.log("Lead captured:", result.lead_id);\n  }\n}`, "Code snippet")}
                      >
                        <Copy className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">PHP Code (For WordPress or PHP websites)</Label>
                    <div className="relative">
                      <pre className="bg-muted rounded-lg p-4 text-xs overflow-x-auto">
{`<?php
$webhook_url = "${supabaseUrl}/functions/v1/lead-webhook/YOUR_WEBHOOK_TOKEN";

$data = array(
    'full_name' => $_POST['name'],
    'email' => $_POST['email'],
    'phone' => $_POST['phone'],
    'interest' => $_POST['interest'],
    'message' => $_POST['message']
);

$options = array(
    'http' => array(
        'method'  => 'POST',
        'header'  => 'Content-Type: application/json',
        'content' => json_encode($data)
    )
);

$context = stream_context_create($options);
$result = file_get_contents($webhook_url, false, $context);
?>`}
                      </pre>
                      <Button
                        size="sm"
                        variant="outline"
                        className="absolute top-2 right-2"
                        onClick={() => copyToClipboard(`<?php\n$webhook_url = "${supabaseUrl}/functions/v1/lead-webhook/YOUR_WEBHOOK_TOKEN";\n\n$data = array(\n    'full_name' => $_POST['name'],\n    'email' => $_POST['email'],\n    'phone' => $_POST['phone'],\n    'interest' => $_POST['interest'],\n    'message' => $_POST['message']\n);\n\n$options = array(\n    'http' => array(\n        'method'  => 'POST',\n        'header'  => 'Content-Type: application/json',\n        'content' => json_encode($data)\n    )\n);\n\n$context = stream_context_create($options);\n$result = file_get_contents($webhook_url, false, $context);\n?>`, "PHP Code")}
                      >
                        <Copy className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Step 3: Field Mapping */}
              <div className="space-y-3">
                <h4 className="font-semibold flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-gold/20 text-gold text-sm flex items-center justify-center">3</span>
                  Field Mapping Reference
                </h4>
                <div className="ml-8">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Your Form Field</TableHead>
                        <TableHead>Send As</TableHead>
                        <TableHead>Required</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <TableRow>
                        <TableCell>Name / Full Name</TableCell>
                        <TableCell><code className="text-xs bg-muted px-2 py-0.5 rounded">full_name</code> or <code className="text-xs bg-muted px-2 py-0.5 rounded">name</code></TableCell>
                        <TableCell><Badge variant="destructive" className="text-[10px]">Required</Badge></TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>Email Address</TableCell>
                        <TableCell><code className="text-xs bg-muted px-2 py-0.5 rounded">email</code></TableCell>
                        <TableCell><Badge variant="destructive" className="text-[10px]">Required</Badge></TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>Phone / Mobile</TableCell>
                        <TableCell><code className="text-xs bg-muted px-2 py-0.5 rounded">phone</code> or <code className="text-xs bg-muted px-2 py-0.5 rounded">mobile</code></TableCell>
                        <TableCell><Badge variant="secondary" className="text-[10px]">Optional</Badge></TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>Property Interest</TableCell>
                        <TableCell><code className="text-xs bg-muted px-2 py-0.5 rounded">interest</code> or <code className="text-xs bg-muted px-2 py-0.5 rounded">property_type</code></TableCell>
                        <TableCell><Badge variant="secondary" className="text-[10px]">Optional</Badge></TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>Message / Comments</TableCell>
                        <TableCell><code className="text-xs bg-muted px-2 py-0.5 rounded">message</code> or <code className="text-xs bg-muted px-2 py-0.5 rounded">comments</code></TableCell>
                        <TableCell><Badge variant="secondary" className="text-[10px]">Optional</Badge></TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              </div>

              {/* Existing Webhooks for External Sites */}
              {webhooks.filter(w => w.source === "custom").length > 0 && (
                <div className="space-y-3 pt-4 border-t">
                  <h4 className="font-semibold">Your Website Webhooks</h4>
                  <div className="grid gap-3">
                    {webhooks.filter(w => w.source === "custom").map((webhook) => (
                      <div key={webhook.id} className="border rounded-lg p-4 space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Globe className="w-4 h-4 text-gold" />
                            <span className="font-medium">{webhook.name}</span>
                            {webhook.is_active ? (
                              <Badge className="bg-green-500/10 text-green-600 border-green-500/20 text-[10px]">Active</Badge>
                            ) : (
                              <Badge variant="secondary" className="text-[10px]">Inactive</Badge>
                            )}
                          </div>
                          <span className="text-xs text-muted-foreground">{webhook.trigger_count} leads captured</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <code className="text-xs flex-1 bg-muted px-3 py-2 rounded break-all">
                            {getWebhookUrl(webhook.webhook_token)}
                          </code>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => copyToClipboard(getWebhookUrl(webhook.webhook_token), "Webhook URL")}
                          >
                            <Copy className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* API Keys Tab */}
        <TabsContent value="api-keys">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>API Keys</CardTitle>
                <CardDescription>
                  Generate API keys for property portals and social media platforms
                </CardDescription>
              </div>
              <Dialog open={isCreateKeyOpen} onOpenChange={setIsCreateKeyOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    Generate API Key
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Generate API Key</DialogTitle>
                    <DialogDescription>
                      Create a new API key for external integrations
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label>Name *</Label>
                      <Input
                        placeholder="e.g., 99acres Production"
                        value={newKeyForm.name}
                        onChange={(e) => setNewKeyForm({ ...newKeyForm, name: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Source Platform</Label>
                      <Select
                        value={newKeyForm.source}
                        onValueChange={(v: IntegrationSource) => setNewKeyForm({ ...newKeyForm, source: v })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                            Property Portals
                          </div>
                          {SOURCE_OPTIONS.filter((s) => s.category === "property").map((source) => (
                            <SelectItem key={source.value} value={source.value}>
                              {source.label}
                            </SelectItem>
                          ))}
                          <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground mt-2">
                            Social Media
                          </div>
                          {SOURCE_OPTIONS.filter((s) => s.category === "social").map((source) => (
                            <SelectItem key={source.value} value={source.value}>
                              {source.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Description</Label>
                      <Textarea
                        placeholder="Optional description..."
                        value={newKeyForm.description}
                        onChange={(e) => setNewKeyForm({ ...newKeyForm, description: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Expires In (days)</Label>
                      <Input
                        type="number"
                        placeholder="Leave empty for no expiry"
                        value={newKeyForm.expiresInDays}
                        onChange={(e) => setNewKeyForm({ ...newKeyForm, expiresInDays: e.target.value })}
                      />
                    </div>
                    <Button className="w-full" onClick={generateApiKey} disabled={isCreatingKey}>
                      {isCreatingKey ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Generating...
                        </>
                      ) : (
                        "Generate API Key"
                      )}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              {apiKeys.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Key className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p>No API keys yet</p>
                  <p className="text-sm">Generate your first API key to start receiving leads</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>API Key</TableHead>
                      <TableHead>Source</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Usage</TableHead>
                      <TableHead>Last Used</TableHead>
                      <TableHead className="w-[120px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {apiKeys.map((key) => (
                      <Collapsible key={key.id} open={showUsageGuide === key.id} onOpenChange={(open) => setShowUsageGuide(open ? key.id : null)}>
                        <TableRow className={showUsageGuide === key.id ? "border-b-0" : ""}>
                          <TableCell className="font-medium">{key.name}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <code className="text-xs bg-muted px-2 py-1 rounded">
                                {showApiKey === key.id ? key.api_key : maskApiKey(key.api_key)}
                              </code>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                onClick={() => setShowApiKey(showApiKey === key.id ? null : key.id)}
                              >
                                {showApiKey === key.id ? (
                                  <EyeOff className="w-3 h-3" />
                                ) : (
                                  <Eye className="w-3 h-3" />
                                )}
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                onClick={() => copyToClipboard(key.api_key, "API key")}
                              >
                                <Copy className="w-3 h-3" />
                              </Button>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="capitalize">
                              {key.source.replace("_", " ")}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Switch
                                checked={key.is_active}
                                onCheckedChange={() => toggleActive("api_key", key.id, key.is_active)}
                              />
                              <span className={key.is_active ? "text-green-600" : "text-muted-foreground"}>
                                {key.is_active ? "Active" : "Inactive"}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>{key.request_count} requests</TableCell>
                          <TableCell className="text-muted-foreground text-sm">
                            {key.last_used_at
                              ? format(new Date(key.last_used_at), "MMM d, h:mm a")
                              : "Never"}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <TestIntegrationButton
                                type="api_key"
                                identifier={key.api_key}
                                onTestComplete={fetchData}
                              />
                              <CollapsibleTrigger asChild>
                                <Button variant="ghost" size="sm" className="gap-1">
                                  <Code className="w-3 h-3" />
                                  <ChevronDown className={cn("w-3 h-3 transition-transform", showUsageGuide === key.id && "rotate-180")} />
                                </Button>
                              </CollapsibleTrigger>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-destructive hover:text-destructive"
                                onClick={() => setDeleteItem({ type: "api_key", id: key.id })}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                        <CollapsibleContent asChild>
                          <TableRow className="hover:bg-transparent">
                            <TableCell colSpan={7} className="p-0 pt-2 pb-4">
                              <IntegrationUsageGuide
                                type="api_key"
                                identifier={key.api_key}
                                name={key.name}
                              />
                            </TableCell>
                          </TableRow>
                        </CollapsibleContent>
                      </Collapsible>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Webhooks Tab */}
        <TabsContent value="webhooks">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Webhook URLs</CardTitle>
                <CardDescription>
                  Configure webhooks for 99acres, Bayut, Property Finder, and social media leads
                </CardDescription>
              </div>
              <Dialog open={isCreateWebhookOpen} onOpenChange={setIsCreateWebhookOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    Create Webhook
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create Webhook</DialogTitle>
                    <DialogDescription>
                      Generate a webhook URL for property portals to send leads
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label>Name *</Label>
                      <Input
                        placeholder="e.g., Bayut Lead Webhook"
                        value={newWebhookForm.name}
                        onChange={(e) => setNewWebhookForm({ ...newWebhookForm, name: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Source Platform</Label>
                      <Select
                        value={newWebhookForm.source}
                        onValueChange={(v: IntegrationSource) => setNewWebhookForm({ ...newWebhookForm, source: v })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                            Property Portals
                          </div>
                          {SOURCE_OPTIONS.filter((s) => s.category === "property").map((source) => (
                            <SelectItem key={source.value} value={source.value}>
                              {source.label}
                            </SelectItem>
                          ))}
                          <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground mt-2">
                            Social Media
                          </div>
                          {SOURCE_OPTIONS.filter((s) => s.category === "social").map((source) => (
                            <SelectItem key={source.value} value={source.value}>
                              {source.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Description</Label>
                      <Textarea
                        placeholder="Optional description..."
                        value={newWebhookForm.description}
                        onChange={(e) => setNewWebhookForm({ ...newWebhookForm, description: e.target.value })}
                      />
                    </div>
                    <Button className="w-full" onClick={generateWebhook} disabled={isCreatingWebhook}>
                      {isCreatingWebhook ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Creating...
                        </>
                      ) : (
                        "Create Webhook"
                      )}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              {webhooks.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Webhook className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p>No webhooks yet</p>
                  <p className="text-sm">Create a webhook to receive leads from property portals</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {webhooks.map((webhook) => (
                    <Collapsible key={webhook.id}>
                      <div className="border rounded-lg p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Building2 className="w-5 h-5 text-gold" />
                            <div>
                              <h4 className="font-medium">{webhook.name}</h4>
                              <div className="flex items-center gap-2 mt-1">
                                <Badge variant="outline" className="capitalize text-xs">
                                  {webhook.source.replace("_", " ")}
                                </Badge>
                                {webhook.is_active ? (
                                  <Badge className="bg-green-500/10 text-green-600 border-green-500/20 text-[10px]">
                                    Active
                                  </Badge>
                                ) : (
                                  <Badge variant="secondary" className="text-[10px]">
                                    Inactive
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <TestIntegrationButton
                              type="webhook"
                              identifier={webhook.webhook_token}
                              webhookUrl={getWebhookUrl(webhook.webhook_token)}
                              onTestComplete={fetchData}
                            />
                            <Switch
                              checked={webhook.is_active}
                              onCheckedChange={() => toggleActive("webhook", webhook.id, webhook.is_active)}
                            />
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-destructive hover:text-destructive"
                              onClick={() => setDeleteItem({ type: "webhook", id: webhook.id })}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>

                        <div className="bg-muted rounded-md p-3">
                          <Label className="text-xs text-muted-foreground">Webhook URL (Copy this to your portal settings)</Label>
                          <div className="flex items-center gap-2 mt-1">
                            <code className="text-xs flex-1 break-all font-mono">
                              {getWebhookUrl(webhook.webhook_token)}
                            </code>
                            <Button
                              variant="outline"
                              size="sm"
                              className="flex-shrink-0 gap-1"
                              onClick={() => copyToClipboard(getWebhookUrl(webhook.webhook_token), "Webhook URL")}
                            >
                              <Copy className="w-3 h-3" />
                              Copy URL
                            </Button>
                          </div>
                        </div>

                        <div className="flex items-center justify-between text-sm text-muted-foreground">
                          <span>{webhook.trigger_count} leads received</span>
                          <span>
                            Last triggered:{" "}
                            {webhook.last_triggered_at
                              ? format(new Date(webhook.last_triggered_at), "MMM d, h:mm a")
                              : "Never"}
                          </span>
                        </div>

                        {/* Collapsible Usage Guide */}
                        <CollapsibleTrigger asChild>
                          <Button variant="outline" size="sm" className="w-full gap-2">
                            <Code className="w-4 h-4" />
                            Show Integration Code
                            <ChevronDown className="w-4 h-4 ml-auto" />
                          </Button>
                        </CollapsibleTrigger>
                        <CollapsibleContent className="pt-3">
                          <IntegrationUsageGuide
                            type="webhook"
                            identifier={webhook.webhook_token}
                            name={webhook.name}
                          />
                        </CollapsibleContent>
                      </div>
                    </Collapsible>
                  ))}
                </div>
              )}

              {/* Documentation */}
              <div className="mt-6 border-t pt-6">
                <h4 className="font-medium mb-3">Integration Guide</h4>
                <div className="bg-muted rounded-lg p-4 space-y-3 text-sm">
                  <p className="text-muted-foreground">
                    Send a <code className="bg-background px-1 rounded">POST</code> request to your webhook URL with the following JSON body:
                  </p>
                  <pre className="bg-background p-3 rounded text-xs overflow-x-auto">
{`{
  "name": "John Doe",
  "email": "john@example.com",
  "phone": "+971501234567",
  "interest": "2BHK in Dubai Marina",
  "message": "Looking for properties..."
}`}
                  </pre>
                  <p className="text-muted-foreground">
                    The webhook accepts field aliases: <code>full_name/name/fullName</code>, <code>phone/mobile/contact</code>
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Logs Tab */}
        <TabsContent value="logs">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Activity Logs</CardTitle>
                <CardDescription>Recent integration activity and lead submissions</CardDescription>
              </div>
              <Button variant="outline" onClick={fetchData}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh
              </Button>
            </CardHeader>
            <CardContent>
              {logs.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <RefreshCw className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p>No activity yet</p>
                  <p className="text-sm">Logs will appear when leads are received via integrations</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Status</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Source</TableHead>
                      <TableHead>Lead ID</TableHead>
                      <TableHead>Error</TableHead>
                      <TableHead>Time</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell>
                          {log.status === "success" ? (
                            <div className="flex items-center gap-1.5 text-green-600">
                              <CheckCircle className="w-4 h-4" />
                              Success
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5 text-red-500">
                              <XCircle className="w-4 h-4" />
                              Failed
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="capitalize">{log.integration_type.replace("_", " ")}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="capitalize">
                            {log.source.replace("_", " ")}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {log.lead_id ? (
                            <code className="text-xs bg-muted px-2 py-0.5 rounded">
                              {log.lead_id.slice(0, 8)}...
                            </code>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate text-red-500 text-sm">
                          {log.error_message || "—"}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {format(new Date(log.created_at), "MMM d, h:mm a")}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteItem} onOpenChange={() => setDeleteItem(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Delete {deleteItem?.type === "api_key" ? "API Key" : "Webhook"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this {deleteItem?.type === "api_key" ? "API key" : "webhook"}.
              Any integrations using it will stop working immediately.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
