import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import {
  Plus,
  Loader2,
  Trash2,
  BarChart3,
  Target,
  Eye,
  TrendingUp,
  Activity,
  Users,
  MessageSquare,
} from "lucide-react";
import { format } from "date-fns";

interface AnalyticsIntegration {
  id: string;
  provider: string;
  tracking_id: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// All supported analytics providers
const ANALYTICS_PROVIDERS = [
  {
    value: "google_analytics",
    label: "Google Analytics 4",
    category: "analytics",
    icon: BarChart3,
    description: "Web analytics from Google",
    placeholder: "G-XXXXXXXXXX",
    color: "bg-orange-500/10 text-orange-600 border-orange-500/20",
  },
  {
    value: "google_tag_manager",
    label: "Google Tag Manager",
    category: "analytics",
    icon: Activity,
    description: "Tag management from Google",
    placeholder: "GTM-XXXXXXX",
    color: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  },
  {
    value: "meta_pixel",
    label: "Meta Pixel (Facebook)",
    category: "marketing",
    icon: Target,
    description: "Conversion tracking for Meta ads",
    placeholder: "XXXXXXXXXXXXXXXX",
    color: "bg-blue-600/10 text-blue-700 border-blue-600/20",
  },
  {
    value: "tiktok_pixel",
    label: "TikTok Pixel",
    category: "marketing",
    icon: Target,
    description: "Conversion tracking for TikTok ads",
    placeholder: "XXXXXXXXXXXXXXXXXX",
    color: "bg-pink-500/10 text-pink-600 border-pink-500/20",
  },
  {
    value: "linkedin_insight",
    label: "LinkedIn Insight Tag",
    category: "marketing",
    icon: Users,
    description: "B2B conversion tracking",
    placeholder: "XXXXXXX",
    color: "bg-blue-700/10 text-blue-800 border-blue-700/20",
  },
  {
    value: "twitter_pixel",
    label: "X (Twitter) Pixel",
    category: "marketing",
    icon: Target,
    description: "Conversion tracking for X ads",
    placeholder: "XXXXX",
    color: "bg-gray-600/10 text-gray-700 border-gray-600/20",
  },
  {
    value: "snapchat_pixel",
    label: "Snapchat Pixel",
    category: "marketing",
    icon: Target,
    description: "Conversion tracking for Snapchat ads",
    placeholder: "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
    color: "bg-yellow-500/10 text-yellow-700 border-yellow-500/20",
  },
  {
    value: "pinterest_tag",
    label: "Pinterest Tag",
    category: "marketing",
    icon: Target,
    description: "Conversion tracking for Pinterest ads",
    placeholder: "XXXXXXXXXXXXXXXXXXXXX",
    color: "bg-red-500/10 text-red-600 border-red-500/20",
  },
  {
    value: "hotjar",
    label: "Hotjar",
    category: "analytics",
    icon: Eye,
    description: "Heatmaps and session recordings",
    placeholder: "XXXXXXX",
    color: "bg-red-600/10 text-red-700 border-red-600/20",
  },
  {
    value: "microsoft_clarity",
    label: "Microsoft Clarity",
    category: "analytics",
    icon: Eye,
    description: "Free heatmaps and recordings",
    placeholder: "XXXXXXXXXX",
    color: "bg-cyan-500/10 text-cyan-600 border-cyan-500/20",
  },
  {
    value: "hubspot",
    label: "HubSpot",
    category: "analytics",
    icon: TrendingUp,
    description: "CRM and marketing automation",
    placeholder: "XXXXXXX",
    color: "bg-orange-600/10 text-orange-700 border-orange-600/20",
  },
  {
    value: "intercom",
    label: "Intercom",
    category: "marketing",
    icon: MessageSquare,
    description: "Customer messaging platform",
    placeholder: "XXXXXXXX",
    color: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  },
];

export function AnalyticsSettingsPanel() {
  const [integrations, setIntegrations] = useState<AnalyticsIntegration[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const [newForm, setNewForm] = useState({
    provider: "",
    tracking_id: "",
  });

  useEffect(() => {
    fetchIntegrations();
  }, []);

  const fetchIntegrations = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("analytics_integrations")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setIntegrations((data as AnalyticsIntegration[]) || []);
    } catch (error) {
      console.error("Error fetching analytics integrations:", error);
      toast.error("Failed to load analytics integrations");
    } finally {
      setIsLoading(false);
    }
  };

  const createIntegration = async () => {
    if (!newForm.provider || !newForm.tracking_id) {
      toast.error("Please fill in all fields");
      return;
    }

    // Check if provider already exists
    if (integrations.some((i) => i.provider === newForm.provider)) {
      toast.error("This provider is already configured. Delete the existing one first.");
      return;
    }

    setIsCreating(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("Not authenticated");

      const { error } = await supabase.from("analytics_integrations").insert({
        provider: newForm.provider,
        tracking_id: newForm.tracking_id.trim(),
        created_by: userData.user.id,
      });

      if (error) throw error;

      toast.success("Analytics integration added successfully");
      setIsDialogOpen(false);
      setNewForm({ provider: "", tracking_id: "" });
      fetchIntegrations();
    } catch (error: any) {
      console.error("Error creating integration:", error);
      toast.error(error.message || "Failed to add integration");
    } finally {
      setIsCreating(false);
    }
  };

  const toggleActive = async (id: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from("analytics_integrations")
        .update({ is_active: !isActive })
        .eq("id", id);

      if (error) throw error;

      toast.success(`Integration ${isActive ? "disabled" : "enabled"}`);
      fetchIntegrations();
    } catch (error) {
      console.error("Error toggling status:", error);
      toast.error("Failed to update status");
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;

    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from("analytics_integrations")
        .delete()
        .eq("id", deleteId);

      if (error) throw error;

      toast.success("Integration deleted");
      setDeleteId(null);
      fetchIntegrations();
    } catch (error) {
      console.error("Error deleting:", error);
      toast.error("Failed to delete");
    } finally {
      setIsDeleting(false);
    }
  };

  const getProviderInfo = (provider: string) => {
    return ANALYTICS_PROVIDERS.find((p) => p.value === provider);
  };

  const selectedProviderInfo = getProviderInfo(newForm.provider);

  // Filter out already configured providers
  const availableProviders = ANALYTICS_PROVIDERS.filter(
    (p) => !integrations.some((i) => i.provider === p.value)
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-[hsl(var(--gold))]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-[hsl(var(--gold))]" />
            Website Analytics & Tracking
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            Add tracking codes for Google Analytics, Meta Pixel, and other analytics platforms.
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-to-r from-[hsl(var(--gold))] to-[hsl(var(--gold-light))] text-[hsl(var(--charcoal))]">
              <Plus className="w-4 h-4 mr-2" />
              Add Integration
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Add Analytics Integration</DialogTitle>
              <DialogDescription>
                Add a tracking pixel or analytics code to your website.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Analytics Provider</Label>
                <Select
                  value={newForm.provider}
                  onValueChange={(value) => setNewForm({ ...newForm, provider: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a provider" />
                  </SelectTrigger>
                  <SelectContent>
                    <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                      Analytics
                    </div>
                    {availableProviders
                      .filter((p) => p.category === "analytics")
                      .map((provider) => (
                        <SelectItem key={provider.value} value={provider.value}>
                          <div className="flex items-center gap-2">
                            <provider.icon className="w-4 h-4" />
                            {provider.label}
                          </div>
                        </SelectItem>
                      ))}
                    <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground mt-2">
                      Marketing
                    </div>
                    {availableProviders
                      .filter((p) => p.category === "marketing")
                      .map((provider) => (
                        <SelectItem key={provider.value} value={provider.value}>
                          <div className="flex items-center gap-2">
                            <provider.icon className="w-4 h-4" />
                            {provider.label}
                          </div>
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedProviderInfo && (
                <p className="text-xs text-muted-foreground">
                  {selectedProviderInfo.description}
                </p>
              )}

              <div className="space-y-2">
                <Label>Tracking ID / Pixel ID</Label>
                <Input
                  value={newForm.tracking_id}
                  onChange={(e) => setNewForm({ ...newForm, tracking_id: e.target.value })}
                  placeholder={selectedProviderInfo?.placeholder || "Enter your tracking ID"}
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                className="flex-1 bg-gradient-to-r from-[hsl(var(--gold))] to-[hsl(var(--gold-light))] text-[hsl(var(--charcoal))]"
                onClick={createIntegration}
                disabled={isCreating}
              >
                {isCreating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Adding...
                  </>
                ) : (
                  "Add Integration"
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Active Integrations Grid */}
      {integrations.filter((i) => i.is_active).length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {integrations
            .filter((i) => i.is_active)
            .map((integration) => {
              const providerInfo = getProviderInfo(integration.provider);
              const IconComponent = providerInfo?.icon || BarChart3;
              return (
                <Card
                  key={integration.id}
                  className={`border-2 transition-all hover:shadow-md ${providerInfo?.color || "bg-muted"}`}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-10 h-10 rounded-lg flex items-center justify-center ${providerInfo?.color || "bg-muted"}`}
                        >
                          <IconComponent className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="font-semibold text-sm">
                            {providerInfo?.label || integration.provider}
                          </p>
                          <Badge variant="outline" className="text-[10px] mt-1">
                            {providerInfo?.category || "analytics"}
                          </Badge>
                        </div>
                      </div>
                      <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                    </div>
                    <div className="space-y-1 text-xs text-muted-foreground">
                      <p className="font-mono truncate">{integration.tracking_id}</p>
                      <p>Added: {format(new Date(integration.created_at), "MMM d, yyyy")}</p>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
        </div>
      )}

      {/* All Integrations Table */}
      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="text-base">All Integrations</CardTitle>
          <CardDescription>Manage your analytics and tracking integrations</CardDescription>
        </CardHeader>
        <CardContent>
          {integrations.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <BarChart3 className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No analytics integrations configured yet.</p>
              <p className="text-sm">Add your first integration to start tracking.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Provider</TableHead>
                  <TableHead>Tracking ID</TableHead>
                  <TableHead>Added</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {integrations.map((integration) => {
                  const providerInfo = getProviderInfo(integration.provider);
                  return (
                    <TableRow key={integration.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {providerInfo?.icon && (
                            <providerInfo.icon className="w-4 h-4 text-muted-foreground" />
                          )}
                          <span className="font-medium">
                            {providerInfo?.label || integration.provider}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {integration.tracking_id}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {format(new Date(integration.created_at), "MMM d, yyyy")}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={integration.is_active}
                            onCheckedChange={() =>
                              toggleActive(integration.id, integration.is_active)
                            }
                          />
                          <Badge variant={integration.is_active ? "default" : "secondary"}>
                            {integration.is_active ? "Active" : "Disabled"}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive"
                          onClick={() => setDeleteId(integration.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Info Card */}
      <Card className="border-border/50 bg-muted/30">
        <CardContent className="p-4">
          <h4 className="font-medium mb-2">How it works</h4>
          <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
            <li>Add your tracking IDs for each analytics platform you use</li>
            <li>Scripts are automatically injected when visitors accept cookies</li>
            <li>Analytics integrations require "Analytics Cookies" consent</li>
            <li>Marketing pixels require "Marketing Cookies" consent</li>
            <li>Toggle integrations on/off without deleting them</li>
          </ul>
        </CardContent>
      </Card>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Integration</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this analytics integration? This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
