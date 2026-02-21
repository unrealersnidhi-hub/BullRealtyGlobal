import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { MapPin, Plus, Loader2, Trash2 } from "lucide-react";

interface GeofenceLocation {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  radius_meters: number;
  is_active: boolean;
}

export const GeofenceManager = () => {
  const [locations, setLocations] = useState<GeofenceLocation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [canConfigure, setCanConfigure] = useState(false);
  const [form, setForm] = useState({
    name: "",
    latitude: "",
    longitude: "",
    radius_meters: "100",
  });

  useEffect(() => {
    fetchLocations();
    checkPermissions();
  }, []);

  const checkPermissions = async () => {
    try {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) {
        setCanConfigure(false);
        return;
      }
      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", auth.user.id);
      const roleList = (roles || []).map((r) => r.role);
      setCanConfigure(roleList.includes("admin") || roleList.includes("super_admin"));
    } catch {
      setCanConfigure(false);
    }
  };

  const fetchLocations = async () => {
    try {
      const { data, error } = await supabase
        .from("geofence_locations")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      setLocations(data || []);
    } catch (error) {
      console.error("Error fetching geofences:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAdd = async () => {
    if (!canConfigure) {
      toast.error("Only admin can configure geofence locations");
      return;
    }
    if (!form.name || !form.latitude || !form.longitude) {
      toast.error("Name, latitude and longitude are required");
      return;
    }
    setIsSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const { error } = await supabase.from("geofence_locations").insert({
        name: form.name,
        latitude: parseFloat(form.latitude),
        longitude: parseFloat(form.longitude),
        radius_meters: Math.min(100, parseInt(form.radius_meters) || 100),
        created_by: session?.user?.id,
      });
      if (error) throw error;
      toast.success("Geofence location added");
      setIsOpen(false);
      setForm({ name: "", latitude: "", longitude: "", radius_meters: "100" });
      fetchLocations();
    } catch (error: any) {
      toast.error(error.message || "Failed to add location");
    } finally {
      setIsSaving(false);
    }
  };

  const toggleActive = async (id: string, isActive: boolean) => {
    if (!canConfigure) {
      toast.error("Only admin can update geofence status");
      return;
    }
    try {
      const { error } = await supabase.from("geofence_locations").update({ is_active: isActive }).eq("id", id);
      if (error) throw error;
      setLocations(locations.map(l => l.id === id ? { ...l, is_active: isActive } : l));
    } catch (error) {
      toast.error("Failed to update");
    }
  };

  const handleDelete = async (id: string) => {
    if (!canConfigure) {
      toast.error("Only admin can delete geofence locations");
      return;
    }
    try {
      const { error } = await supabase.from("geofence_locations").delete().eq("id", id);
      if (error) throw error;
      setLocations(locations.filter(l => l.id !== id));
      toast.success("Geofence deleted");
    } catch (error) {
      toast.error("Failed to delete");
    }
  };

  if (isLoading) {
    return <Card><CardContent className="p-6 flex justify-center"><Loader2 className="w-5 h-5 animate-spin" /></CardContent></Card>;
  }

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <MapPin className="w-4 h-4 text-[hsl(var(--gold))]" />
            Geofence Locations
          </CardTitle>
          {!canConfigure && (
            <Badge variant="secondary" className="mr-2">
              Admin Only
            </Badge>
          )}
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <Button size="sm" disabled={!canConfigure}><Plus className="w-4 h-4 mr-1" /> Add Location</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Geofence Location</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                <div className="space-y-2">
                  <Label>Location Name</Label>
                  <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Office Dubai" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Latitude</Label>
                    <Input value={form.latitude} onChange={(e) => setForm({ ...form, latitude: e.target.value })} placeholder="25.2048" type="number" step="any" />
                  </div>
                  <div className="space-y-2">
                    <Label>Longitude</Label>
                    <Input value={form.longitude} onChange={(e) => setForm({ ...form, longitude: e.target.value })} placeholder="55.2708" type="number" step="any" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Radius (meters, max 100)</Label>
                  <Input
                    value={form.radius_meters}
                    onChange={(e) => setForm({ ...form, radius_meters: e.target.value })}
                    placeholder="100"
                    type="number"
                    min={1}
                    max={100}
                  />
                </div>
                <Button onClick={handleAdd} disabled={isSaving} className="w-full">
                  {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <MapPin className="w-4 h-4 mr-2" />}
                  Save Location
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {locations.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">No geofence locations configured. Add one to enable attendance geofencing.</p>
        ) : (
          <div className="space-y-2">
            {locations.map((loc) => (
              <div key={loc.id} className="flex items-center justify-between p-3 rounded-lg border border-border/50 hover:bg-muted/30">
                <div className="flex items-center gap-3">
                  <MapPin className={`w-4 h-4 ${loc.is_active ? "text-emerald-500" : "text-muted-foreground"}`} />
                  <div>
                    <p className="text-sm font-medium">{loc.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {loc.latitude.toFixed(6)}, {loc.longitude.toFixed(6)} • {loc.radius_meters}m radius
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={loc.is_active ? "default" : "secondary"} className={loc.is_active ? "bg-emerald-500/10 text-emerald-500" : ""}>
                    {loc.is_active ? "Active" : "Inactive"}
                  </Badge>
                  <Switch checked={loc.is_active} onCheckedChange={(v) => toggleActive(loc.id, v)} disabled={!canConfigure} />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-destructive"
                    onClick={() => handleDelete(loc.id)}
                    disabled={!canConfigure}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
