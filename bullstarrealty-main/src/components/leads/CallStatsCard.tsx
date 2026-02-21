import { useState, useEffect, useMemo, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Loader2, Phone, PhoneOff, PhoneMissed, PhoneCall, Clock } from "lucide-react";
import { format, startOfDay, endOfDay } from "date-fns";

interface CallStats {
  total: number;
  answered: number;
  not_answered: number;
  busy: number;
  voicemail: number;
  wrong_number: number;
  callback_scheduled: number;
  not_reachable: number;
  call_dropped: number;
  totalDuration: number;
}

interface CallStatsCardProps {
  userId?: string;
  date?: Date;
  showAllUsers?: boolean;
}

export const CallStatsCard = ({ userId, date, showAllUsers = false }: CallStatsCardProps) => {
  const [stats, setStats] = useState<CallStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const fetchedRef = useRef(false);

  // Stabilize date to avoid infinite re-renders
  const stableDate = useMemo(() => date || new Date(), [date?.toDateString()]);

  useEffect(() => {
    fetchedRef.current = false;
    fetchStats();
  }, [userId, stableDate.toDateString(), showAllUsers]);
 
  const fetchStats = async () => {
    if (fetchedRef.current) return;
    fetchedRef.current = true;
    setIsLoading(true);
    try {
      const dayStart = startOfDay(stableDate).toISOString();
      const dayEnd = endOfDay(stableDate).toISOString();
 
       let query = supabase
         .from("call_logs")
         .select("outcome, duration_seconds")
         .gte("created_at", dayStart)
         .lte("created_at", dayEnd);
 
       if (!showAllUsers && userId) {
         query = query.eq("user_id", userId);
       }
 
       const { data, error } = await query;
 
       if (error) throw error;
 
       const calculatedStats: CallStats = {
         total: data?.length || 0,
         answered: 0,
         not_answered: 0,
         busy: 0,
         voicemail: 0,
         wrong_number: 0,
         callback_scheduled: 0,
         not_reachable: 0,
         call_dropped: 0,
         totalDuration: 0,
       };
 
       data?.forEach((log) => {
         const outcome = log.outcome as keyof Omit<CallStats, "total" | "totalDuration">;
         if (outcome in calculatedStats) {
           calculatedStats[outcome]++;
         }
         calculatedStats.totalDuration += log.duration_seconds || 0;
       });
 
       setStats(calculatedStats);
     } catch (error) {
       console.error("Error fetching call stats:", error);
     } finally {
       setIsLoading(false);
     }
   };
 
   const formatDuration = (seconds: number) => {
     const hours = Math.floor(seconds / 3600);
     const minutes = Math.floor((seconds % 3600) / 60);
     if (hours > 0) {
       return `${hours}h ${minutes}m`;
     }
     return `${minutes}m`;
   };
 
   if (isLoading) {
     return (
       <Card className="p-6">
         <div className="flex items-center justify-center py-4">
           <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
         </div>
       </Card>
     );
   }
 
   if (!stats) return null;
 
   const statItems = [
     { label: "Total Calls", value: stats.total, icon: Phone, color: "text-foreground" },
     { label: "Answered", value: stats.answered, icon: PhoneCall, color: "text-green-500" },
     { label: "Not Answered", value: stats.not_answered, icon: PhoneOff, color: "text-red-500" },
     { label: "Busy", value: stats.busy, icon: PhoneMissed, color: "text-amber-500" },
     { label: "Callbacks", value: stats.callback_scheduled, icon: Clock, color: "text-purple-500" },
   ];
 
   return (
     <Card className="p-6">
       <div className="flex items-center justify-between mb-4">
         <h3 className="text-lg font-semibold">
           {showAllUsers ? "Team Call Stats" : "My Call Stats"}
         </h3>
          <span className="text-sm text-muted-foreground">
            {format(stableDate, "MMM d, yyyy")}
          </span>
       </div>
 
       <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
         {statItems.map((item) => (
           <div key={item.label} className="text-center p-3 rounded-lg bg-muted/30">
             <item.icon className={`w-5 h-5 mx-auto mb-1 ${item.color}`} />
             <div className="text-2xl font-bold">{item.value}</div>
             <div className="text-xs text-muted-foreground">{item.label}</div>
           </div>
         ))}
       </div>
 
       <div className="mt-4 pt-4 border-t border-border flex items-center justify-between text-sm">
         <span className="text-muted-foreground">Total Talk Time</span>
         <span className="font-medium">{formatDuration(stats.totalDuration)}</span>
       </div>
 
       {stats.total > 0 && (
         <div className="mt-3 flex items-center justify-between text-sm">
           <span className="text-muted-foreground">Answer Rate</span>
           <span className="font-medium text-green-600">
             {((stats.answered / stats.total) * 100).toFixed(1)}%
           </span>
         </div>
       )}
     </Card>
   );
 };