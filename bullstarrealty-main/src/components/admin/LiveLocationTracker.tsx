 import { useState, useEffect, useCallback } from "react";
 import { supabase } from "@/integrations/supabase/client";
 import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
 import { Badge } from "@/components/ui/badge";
 import { Button } from "@/components/ui/button";
 import { ScrollArea } from "@/components/ui/scroll-area";
 import { toast } from "sonner";
 import { MapPin, RefreshCw, User, Clock, Loader2 } from "lucide-react";
 import { formatDistanceToNow, format } from "date-fns";
 
 interface UserLocation {
   id: string;
   user_id: string;
   latitude: number;
   longitude: number;
   accuracy: number;
   recorded_at: string;
   profile?: {
     full_name: string | null;
     email: string | null;
   };
 }
 
 interface TeamMember {
   id: string;
   fullName: string | null;
   email: string;
   roles: string[];
 }
 
 export const LiveLocationTracker = () => {
   const [locations, setLocations] = useState<UserLocation[]>([]);
   const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
   const [isLoading, setIsLoading] = useState(true);
   const [isRefreshing, setIsRefreshing] = useState(false);
 
   const fetchTeamMembers = useCallback(async () => {
     try {
       const response = await supabase.functions.invoke("list-team-members");
       if (response.error) throw new Error(response.error.message);
       
       // Filter to show only sales users and managers
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
 
   const fetchLatestLocations = useCallback(async () => {
     try {
       // Get the latest location for each user (within last 24 hours)
       const twentyFourHoursAgo = new Date();
       twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);
 
       const { data, error } = await supabase
         .from("user_locations")
         .select("*")
         .gte("recorded_at", twentyFourHoursAgo.toISOString())
         .order("recorded_at", { ascending: false });
 
       if (error) throw error;
 
       // Group by user and get latest location for each
       const latestByUser = new Map<string, UserLocation>();
       for (const loc of data || []) {
         if (!latestByUser.has(loc.user_id)) {
           latestByUser.set(loc.user_id, loc);
         }
       }
 
       setLocations(Array.from(latestByUser.values()));
     } catch (error) {
       console.error("Error fetching locations:", error);
       toast.error("Failed to fetch location data");
     }
   }, []);
 
   const loadData = useCallback(async () => {
     setIsLoading(true);
     await Promise.all([fetchTeamMembers(), fetchLatestLocations()]);
     setIsLoading(false);
   }, [fetchTeamMembers, fetchLatestLocations]);
 
   useEffect(() => {
     loadData();
 
     // Set up realtime subscription for location updates
     const channel = supabase
       .channel("location-updates")
       .on(
         "postgres_changes",
         {
           event: "INSERT",
           schema: "public",
           table: "user_locations",
         },
         (payload) => {
           const newLocation = payload.new as UserLocation;
           setLocations((prev) => {
             const filtered = prev.filter((l) => l.user_id !== newLocation.user_id);
             return [newLocation, ...filtered];
           });
         }
       )
       .subscribe();
 
     return () => {
       supabase.removeChannel(channel);
     };
   }, [loadData]);
 
   const handleRefresh = async () => {
     setIsRefreshing(true);
     await fetchLatestLocations();
     setIsRefreshing(false);
     toast.success("Locations refreshed");
   };
 
   const getMemberInfo = (userId: string) => {
     return teamMembers.find((m) => m.id === userId);
   };
 
   const openInMaps = (lat: number, lng: number) => {
     window.open(`https://www.google.com/maps?q=${lat},${lng}`, "_blank");
   };
 
   const getLocationStatus = (recordedAt: string) => {
     const diff = Date.now() - new Date(recordedAt).getTime();
     const minutes = diff / 60000;
 
     if (minutes < 5) {
       return { label: "Active", color: "bg-emerald-500" };
     } else if (minutes < 30) {
       return { label: "Recent", color: "bg-amber-500" };
     } else if (minutes < 60) {
       return { label: "Away", color: "bg-orange-500" };
     } else {
       return { label: "Offline", color: "bg-gray-400" };
     }
   };
 
   if (isLoading) {
     return (
       <div className="flex items-center justify-center p-8">
         <Loader2 className="w-8 h-8 animate-spin text-primary" />
       </div>
     );
   }
 
   // Get all team members and their location status
   const teamWithLocations = teamMembers.map((member) => {
     const location = locations.find((l) => l.user_id === member.id);
     return { ...member, location };
   });
 
   const activeMembers = teamWithLocations.filter((m) => m.location);
   const offlineMembers = teamWithLocations.filter((m) => !m.location);
 
   return (
     <Card>
       <CardHeader>
         <div className="flex items-center justify-between">
           <div>
             <CardTitle className="flex items-center gap-2">
               <MapPin className="w-5 h-5 text-[hsl(var(--gold))]" />
               Live Location Tracker
             </CardTitle>
             <CardDescription>
               Real-time location of sales team and managers
             </CardDescription>
           </div>
           <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isRefreshing}>
             <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`} />
             Refresh
           </Button>
         </div>
       </CardHeader>
       <CardContent>
         {teamWithLocations.length === 0 ? (
           <div className="text-center py-8 text-muted-foreground">
             <MapPin className="w-12 h-12 mx-auto mb-4 opacity-30" />
             <p>No team members have shared their location yet.</p>
             <p className="text-sm mt-2">
               Location sharing must be enabled by each team member.
             </p>
           </div>
         ) : (
           <div className="space-y-6">
             {/* Active Members */}
             {activeMembers.length > 0 && (
               <div>
                 <h4 className="text-sm font-medium text-muted-foreground mb-3">
                   Active ({activeMembers.length})
                 </h4>
                 <ScrollArea className="h-[300px]">
                   <div className="space-y-3">
                     {activeMembers.map((member) => {
                       const status = getLocationStatus(member.location!.recorded_at);
                       return (
                         <div
                           key={member.id}
                           className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                         >
                           <div className="flex items-center gap-3">
                             <div className="relative">
                               <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                                 <User className="w-5 h-5 text-primary" />
                               </div>
                               <div
                                 className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-background ${status.color}`}
                               />
                             </div>
                             <div>
                               <p className="font-medium text-sm">
                                 {member.fullName || member.email}
                               </p>
                               <p className="text-xs text-muted-foreground flex items-center gap-1">
                                 <Clock className="w-3 h-3" />
                                 {formatDistanceToNow(new Date(member.location!.recorded_at), {
                                   addSuffix: true,
                                 })}
                               </p>
                             </div>
                           </div>
                           <div className="flex items-center gap-2">
                             <Badge variant="outline" className="text-xs">
                               {status.label}
                             </Badge>
                             <Button
                               size="sm"
                               variant="ghost"
                               onClick={() =>
                                 openInMaps(
                                   member.location!.latitude,
                                   member.location!.longitude
                                 )
                               }
                             >
                               <MapPin className="w-4 h-4" />
                             </Button>
                           </div>
                         </div>
                       );
                     })}
                   </div>
                 </ScrollArea>
               </div>
             )}
 
             {/* Offline Members */}
             {offlineMembers.length > 0 && (
               <div>
                 <h4 className="text-sm font-medium text-muted-foreground mb-3">
                   No Location Data ({offlineMembers.length})
                 </h4>
                 <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                   {offlineMembers.map((member) => (
                     <div
                       key={member.id}
                       className="flex items-center gap-2 p-2 rounded-lg border bg-muted/30"
                     >
                       <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                         <User className="w-4 h-4 text-muted-foreground" />
                       </div>
                       <span className="text-xs text-muted-foreground truncate">
                         {member.fullName || member.email}
                       </span>
                     </div>
                   ))}
                 </div>
               </div>
             )}
           </div>
         )}
       </CardContent>
     </Card>
   );
 };