import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, MapPin, ShieldCheck, ShieldX, Clock3 } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

interface GeofenceLocation {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  radius_meters: number;
  is_active: boolean;
  country: "dubai" | "india" | null;
}

interface AttendanceRecord {
  id: string;
  date: string;
  check_in: string | null;
  check_out: string | null;
  check_in_latitude: number | null;
  check_in_longitude: number | null;
  geofence_verified: boolean | null;
  status: string | null;
  work_hours: number | null;
  notes: string | null;
}

interface Employee {
  id: string;
  user_id: string | null;
  email: string;
  full_name: string;
  country: "dubai" | "india" | null;
}

interface LocationState {
  latitude: number;
  longitude: number;
  accuracy: number;
}

function haversineMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const earthRadiusMeters = 6371000;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadiusMeters * c;
}

export const GeofencedAttendancePanel = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [isMarking, setIsMarking] = useState(false);
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [todayAttendance, setTodayAttendance] = useState<AttendanceRecord | null>(null);
  const [recentAttendance, setRecentAttendance] = useState<AttendanceRecord[]>([]);
  const [locations, setLocations] = useState<GeofenceLocation[]>([]);
  const [locationState, setLocationState] = useState<LocationState | null>(null);
  const [locationError, setLocationError] = useState<string>("");

  const today = new Date().toISOString().split("T")[0];

  useEffect(() => {
    fetchAll();
  }, []);

  const resolveNearestFence = (current: LocationState, activeLocations: GeofenceLocation[]) => {
    if (activeLocations.length === 0) return null;
    const ranked = activeLocations
      .map((loc) => {
        const distance = haversineMeters(current.latitude, current.longitude, loc.latitude, loc.longitude);
        const allowedRadius = Math.min(100, loc.radius_meters || 100);
        return { ...loc, distance, allowedRadius, inside: distance <= allowedRadius };
      })
      .sort((a, b) => a.distance - b.distance);
    return ranked[0] || null;
  };

  const fetchAll = async () => {
    setIsLoading(true);
    try {
      const { data: authData } = await supabase.auth.getUser();
      const user = authData.user;
      if (!user) {
        setLocationError("Not authenticated.");
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, country")
        .eq("user_id", user.id)
        .maybeSingle();

      const { data: employeeRow, error: employeeErr } = await supabase
        .from("employees")
        .select("id, user_id, email, full_name, country")
        .eq("user_id", user.id)
        .maybeSingle();

      if (employeeErr) throw employeeErr;

      if (!employeeRow) {
        setLocationError("Employee record not mapped for this user. Ask admin to map employee user_id.");
        return;
      }

      const normalizedEmployee: Employee = {
        ...employeeRow,
        full_name: employeeRow.full_name || profile?.full_name || user.email || "Employee",
        country: employeeRow.country || profile?.country || null,
      };
      setEmployee(normalizedEmployee);

      const [attendanceRes, locationsRes] = await Promise.all([
        supabase
          .from("attendance")
          .select("id, date, check_in, check_out, check_in_latitude, check_in_longitude, geofence_verified, status, work_hours, notes")
          .eq("employee_id", normalizedEmployee.id)
          .order("date", { ascending: false })
          .limit(14),
        supabase
          .from("geofence_locations")
          .select("id, name, latitude, longitude, radius_meters, is_active, country")
          .eq("is_active", true),
      ]);

      if (attendanceRes.error) throw attendanceRes.error;
      if (locationsRes.error) throw locationsRes.error;

      const filteredLocations = (locationsRes.data || []).filter((l) => {
        if (!normalizedEmployee.country) return true;
        if (!l.country) return true;
        return l.country === normalizedEmployee.country;
      });

      setLocations(filteredLocations as GeofenceLocation[]);
      const attendanceRows = (attendanceRes.data || []) as AttendanceRecord[];
      setRecentAttendance(attendanceRows);
      setTodayAttendance(attendanceRows.find((a) => a.date === today) || null);
      await refreshCurrentLocation();
    } catch (error) {
      console.error("Failed to load geofence attendance:", error);
      toast.error("Failed to load attendance/geofence data");
    } finally {
      setIsLoading(false);
    }
  };

  const refreshCurrentLocation = async (): Promise<LocationState | null> => {
    setLocationError("");
    if (!("geolocation" in navigator)) {
      setLocationError("Geolocation not supported in this browser.");
      return null;
    }

    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const current = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
          };
          setLocationState(current);
          resolve(current);
        },
        (error) => {
          let message = "Unable to read your location.";
          if (error.code === error.PERMISSION_DENIED) message = "Location permission denied.";
          if (error.code === error.POSITION_UNAVAILABLE) message = "Location unavailable.";
          if (error.code === error.TIMEOUT) message = "Location request timed out.";
          setLocationError(message);
          resolve(null);
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
      );
    });
  };

  const nearestFence = useMemo(() => {
    if (!locationState || locations.length === 0) return null;
    return resolveNearestFence(locationState, locations);
  }, [locationState, locations]);

  const canMarkAttendance = !!nearestFence?.inside;

  const handleCheckIn = async () => {
    if (!employee) return;
    setIsMarking(true);
    try {
      const current = await refreshCurrentLocation();
      if (!current) throw new Error(locationError || "Location unavailable.");
      const nearest = resolveNearestFence(current, locations);
      if (!nearest || !nearest.inside) {
        throw new Error("Outside allowed 100m geofence radius. Attendance not allowed.");
      }
      if (todayAttendance?.check_in) {
        throw new Error("Check-in already marked for today.");
      }

      const { error } = await supabase.from("attendance").insert({
        employee_id: employee.id,
        date: today,
        check_in: new Date().toISOString(),
        check_in_latitude: current.latitude,
        check_in_longitude: current.longitude,
        check_in_method: "gps_geofence",
        geofence_verified: true,
        status: "present",
        notes: `Checked in at ${nearest.name} (${Math.round(nearest.distance)}m)`,
      });

      if (error) throw error;
      toast.success("Attendance check-in marked.");
      await fetchAll();
    } catch (error: any) {
      toast.error(error.message || "Check-in failed");
    } finally {
      setIsMarking(false);
    }
  };

  const handleCheckOut = async () => {
    if (!employee || !todayAttendance?.id || !todayAttendance.check_in) return;
    setIsMarking(true);
    try {
      const current = await refreshCurrentLocation();
      if (!current) throw new Error(locationError || "Location unavailable.");
      const nearest = resolveNearestFence(current, locations);
      if (!nearest || !nearest.inside) {
        throw new Error("Outside allowed 100m geofence radius. Attendance not allowed.");
      }
      if (todayAttendance.check_out) {
        throw new Error("Check-out already marked.");
      }

      const checkInTs = new Date(todayAttendance.check_in).getTime();
      const nowTs = Date.now();
      const workHours = Number(((nowTs - checkInTs) / (1000 * 60 * 60)).toFixed(2));

      const { error } = await supabase
        .from("attendance")
        .update({
          check_out: new Date().toISOString(),
          work_hours: workHours,
          notes: `${todayAttendance.notes || ""} | Checked out at ${nearest.name} (${Math.round(nearest.distance)}m)`,
        })
        .eq("id", todayAttendance.id);

      if (error) throw error;
      toast.success("Attendance check-out marked.");
      await fetchAll();
    } catch (error: any) {
      toast.error(error.message || "Check-out failed");
    } finally {
      setIsMarking(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-6">
          <Loader2 className="h-5 w-5 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <MapPin className="h-4 w-4 text-[hsl(var(--gold))]" />
          Geofenced Attendance (100m)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!employee ? (
          <p className="text-sm text-destructive">{locationError || "Employee mapping not found."}</p>
        ) : (
          <>
            <div className="grid gap-3 md:grid-cols-3">
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">Employee</p>
                <p className="font-medium">{employee.full_name}</p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">Today's Check-in</p>
                <p className="font-medium">
                  {todayAttendance?.check_in ? format(new Date(todayAttendance.check_in), "p") : "--"}
                </p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">Today's Check-out</p>
                <p className="font-medium">
                  {todayAttendance?.check_out ? format(new Date(todayAttendance.check_out), "p") : "--"}
                </p>
              </div>
            </div>

            <div className="rounded-lg border p-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Nearest Active Geofence</p>
                  {nearestFence ? (
                    <p className="text-sm">
                      <span className="font-medium">{nearestFence.name}</span>{" "}
                      <span className="text-muted-foreground">({Math.round(nearestFence.distance)}m away, limit {nearestFence.allowedRadius}m)</span>
                    </p>
                  ) : (
                    <p className="text-sm text-muted-foreground">No geofence selected yet.</p>
                  )}
                  {locationState && (
                    <p className="text-xs text-muted-foreground">
                      GPS accuracy: {Math.round(locationState.accuracy)}m
                    </p>
                  )}
                  {locationError && <p className="text-xs text-destructive">{locationError}</p>}
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={refreshCurrentLocation} disabled={isMarking}>
                    {isMarking ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <MapPin className="mr-2 h-4 w-4" />}
                    Refresh Location
                  </Button>
                  {canMarkAttendance ? (
                    <Badge className="bg-emerald-500/10 text-emerald-600">
                      <ShieldCheck className="mr-1 h-3 w-3" />
                      Inside geofence
                    </Badge>
                  ) : (
                    <Badge variant="destructive" className="bg-red-500/10 text-red-600 border-red-500/30">
                      <ShieldX className="mr-1 h-3 w-3" />
                      Outside geofence
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button onClick={handleCheckIn} disabled={isMarking || !!todayAttendance?.check_in || !canMarkAttendance}>
                {isMarking ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Clock3 className="mr-2 h-4 w-4" />}
                Mark Check-in
              </Button>
              <Button
                variant="secondary"
                onClick={handleCheckOut}
                disabled={isMarking || !todayAttendance?.check_in || !!todayAttendance?.check_out || !canMarkAttendance}
              >
                {isMarking ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Clock3 className="mr-2 h-4 w-4" />}
                Mark Check-out
              </Button>
            </div>

            <div className="rounded-lg border">
              <div className="border-b px-3 py-2 text-sm font-medium">Recent Attendance</div>
              <div className="max-h-56 overflow-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-muted-foreground">
                      <th className="px-3 py-2">Date</th>
                      <th className="px-3 py-2">Check-in</th>
                      <th className="px-3 py-2">Check-out</th>
                      <th className="px-3 py-2">Hours</th>
                      <th className="px-3 py-2">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentAttendance.map((row) => (
                      <tr key={row.id} className="border-t">
                        <td className="px-3 py-2">{row.date}</td>
                        <td className="px-3 py-2">{row.check_in ? format(new Date(row.check_in), "p") : "--"}</td>
                        <td className="px-3 py-2">{row.check_out ? format(new Date(row.check_out), "p") : "--"}</td>
                        <td className="px-3 py-2">{row.work_hours ?? "--"}</td>
                        <td className="px-3 py-2 capitalize">{row.status || "--"}</td>
                      </tr>
                    ))}
                    {recentAttendance.length === 0 && (
                      <tr>
                        <td className="px-3 py-6 text-center text-muted-foreground" colSpan={5}>
                          No attendance records yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};
