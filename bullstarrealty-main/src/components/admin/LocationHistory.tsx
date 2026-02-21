import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { History, Download, MapPin, User, Loader2, Calendar, Filter } from "lucide-react";
import { format, subDays, subWeeks, subMonths, subYears, startOfDay, endOfDay } from "date-fns";

interface LocationRecord {
  id: string;
  user_id: string;
  latitude: number;
  longitude: number;
  accuracy: number;
  recorded_at: string;
}

interface TeamMember {
  id: string;
  fullName: string | null;
  email: string;
  roles: string[];
}

type TimeFilter = "today" | "week" | "month" | "year" | "all";

export const LocationHistory = () => {
  const [locations, setLocations] = useState<LocationRecord[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<string>("all");
  const [timeFilter, setTimeFilter] = useState<TimeFilter>("today");

  const getDateRange = useCallback((filter: TimeFilter) => {
    const now = new Date();
    switch (filter) {
      case "today":
        return { start: startOfDay(now), end: endOfDay(now) };
      case "week":
        return { start: subWeeks(now, 1), end: now };
      case "month":
        return { start: subMonths(now, 1), end: now };
      case "year":
        return { start: subYears(now, 1), end: now };
      case "all":
        return { start: subYears(now, 10), end: now };
      default:
        return { start: startOfDay(now), end: endOfDay(now) };
    }
  }, []);

  const fetchTeamMembers = useCallback(async () => {
    try {
      const response = await supabase.functions.invoke("list-team-members");
      if (response.error) throw new Error(response.error.message);
      
      const team = (response.data?.users || []).filter((m: TeamMember) =>
        m.roles.includes("user") || m.roles.includes("manager")
      );
      setTeamMembers(team);
      return team;
    } catch (error) {
      console.error("Error fetching team:", error);
      return [];
    }
  }, []);

  const fetchLocationHistory = useCallback(async () => {
    try {
      setIsLoading(true);
      const { start, end } = getDateRange(timeFilter);

      let query = supabase
        .from("user_locations")
        .select("*")
        .gte("recorded_at", start.toISOString())
        .lte("recorded_at", end.toISOString())
        .order("recorded_at", { ascending: false });

      if (selectedUser !== "all") {
        query = query.eq("user_id", selectedUser);
      }

      const { data, error } = await query.limit(500);

      if (error) throw error;
      setLocations(data || []);
    } catch (error) {
      console.error("Error fetching location history:", error);
      toast.error("Failed to fetch location history");
    } finally {
      setIsLoading(false);
    }
  }, [timeFilter, selectedUser, getDateRange]);

  useEffect(() => {
    fetchTeamMembers();
  }, [fetchTeamMembers]);

  useEffect(() => {
    fetchLocationHistory();
  }, [fetchLocationHistory]);

  const getMemberInfo = (userId: string) => {
    return teamMembers.find((m) => m.id === userId);
  };

  const openInMaps = (lat: number, lng: number) => {
    window.open(`https://www.google.com/maps?q=${lat},${lng}`, "_blank");
  };

  const exportToCSV = () => {
    if (locations.length === 0) {
      toast.error("No data to export");
      return;
    }

    const headers = ["User Name", "Email", "Latitude", "Longitude", "Accuracy (m)", "Recorded At", "Google Maps Link"];
    
    const rows = locations.map((loc) => {
      const member = getMemberInfo(loc.user_id);
      return [
        member?.fullName || "Unknown",
        member?.email || "Unknown",
        loc.latitude.toString(),
        loc.longitude.toString(),
        loc.accuracy?.toString() || "N/A",
        format(new Date(loc.recorded_at), "yyyy-MM-dd HH:mm:ss"),
        `https://www.google.com/maps?q=${loc.latitude},${loc.longitude}`
      ];
    });

    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    
    const filterLabel = timeFilter === "all" ? "all-time" : timeFilter;
    const userLabel = selectedUser === "all" ? "all-users" : getMemberInfo(selectedUser)?.fullName || "user";
    const filename = `location-history-${userLabel}-${filterLabel}-${format(new Date(), "yyyy-MM-dd")}.csv`;
    
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast.success(`Exported ${locations.length} records to CSV`);
  };

  const getFilterLabel = (filter: TimeFilter) => {
    switch (filter) {
      case "today": return "Today";
      case "week": return "Last 7 Days";
      case "month": return "Last 30 Days";
      case "year": return "Last Year";
      case "all": return "All Time";
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <History className="w-5 h-5 text-[hsl(var(--gold))]" />
              Location History
            </CardTitle>
            <CardDescription>
              View historical location data for sales team and managers
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={exportToCSV} disabled={locations.length === 0}>
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="flex items-center gap-2 flex-1">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <Select value={selectedUser} onValueChange={setSelectedUser}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder="Select user" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Users</SelectItem>
                {teamMembers.map((member) => (
                  <SelectItem key={member.id} value={member.id}>
                    {member.fullName || member.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-muted-foreground" />
            <Select value={timeFilter} onValueChange={(v) => setTimeFilter(v as TimeFilter)}>
              <SelectTrigger className="w-full sm:w-[150px]">
                <SelectValue placeholder="Time period" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="week">Last 7 Days</SelectItem>
                <SelectItem value="month">Last 30 Days</SelectItem>
                <SelectItem value="year">Last Year</SelectItem>
                <SelectItem value="all">All Time</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Summary */}
        <div className="flex items-center gap-4 mb-4 text-sm text-muted-foreground">
          <Badge variant="secondary">
            {locations.length} records
          </Badge>
          <span>
            Showing: {getFilterLabel(timeFilter)}
            {selectedUser !== "all" && ` • ${getMemberInfo(selectedUser)?.fullName || "Selected User"}`}
          </span>
        </div>

        {/* Data Table */}
        {isLoading ? (
          <div className="flex items-center justify-center p-8">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : locations.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <History className="w-12 h-12 mx-auto mb-4 opacity-30" />
            <p>No location data found for the selected filters.</p>
          </div>
        ) : (
          <ScrollArea className="h-[400px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Accuracy</TableHead>
                  <TableHead>Date & Time</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {locations.map((location) => {
                  const member = getMemberInfo(location.user_id);
                  return (
                    <TableRow key={location.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                            <User className="w-4 h-4 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium text-sm">
                              {member?.fullName || "Unknown"}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {member?.email || location.user_id.slice(0, 8)}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <p className="text-sm font-mono">
                          {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
                        </p>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          ±{Math.round(location.accuracy || 0)}m
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <p className="text-sm">
                          {format(new Date(location.recorded_at), "MMM dd, yyyy")}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(location.recorded_at), "HH:mm:ss")}
                        </p>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => openInMaps(location.latitude, location.longitude)}
                        >
                          <MapPin className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
};
