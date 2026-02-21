import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Loader2, Phone, Clock, User, MessageSquare } from "lucide-react";
import { format } from "date-fns";
import { outcomeLabels, outcomeColors, type CallOutcome } from "./CallLogForm";

interface CallLog {
  id: string;
  lead_id: string;
  user_id: string;
  outcome: CallOutcome;
  duration_seconds: number;
  notes: string | null;
  callback_scheduled_at: string | null;
  created_at: string;
}

interface UserProfile {
  user_id: string;
  full_name: string | null;
  email: string | null;
}

interface CallLogHistoryProps {
  leadId?: string;
  userId?: string;
  limit?: number;
}

export const CallLogHistory = ({ leadId, userId, limit = 20 }: CallLogHistoryProps) => {
  const [logs, setLogs] = useState<CallLog[]>([]);
  const [userProfiles, setUserProfiles] = useState<Record<string, UserProfile>>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchLogs();
  }, [leadId, userId]);

  const fetchLogs = async () => {
    setIsLoading(true);
    try {
      let query = supabase
        .from("call_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(limit);

      if (leadId) {
        query = query.eq("lead_id", leadId);
      }
      if (userId) {
        query = query.eq("user_id", userId);
      }

      const { data, error } = await query;

      if (error) throw error;
      const logData = (data as CallLog[]) || [];
      setLogs(logData);

      // Fetch user profiles for all unique user_ids
      const userIds = [...new Set(logData.map(l => l.user_id).filter(Boolean))];
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, full_name, email")
          .in("user_id", userIds);

        if (profiles) {
          const profileMap: Record<string, UserProfile> = {};
          profiles.forEach(p => { profileMap[p.user_id] = p; });
          setUserProfiles(profileMap);
        }
      }
    } catch (error) {
      console.error("Error fetching call logs:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const getUserName = (userId: string) => {
    const profile = userProfiles[userId];
    return profile?.full_name || profile?.email || "Unknown User";
  };

  const formatDuration = (seconds: number) => {
    if (seconds === 0) return "-";
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs.toString().padStart(2, "0")}`;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (logs.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Phone className="w-8 h-8 mx-auto mb-2 opacity-50" />
        <p>No calls logged yet</p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-[300px]">
      <div className="space-y-3">
        {logs.map((log) => (
          <div
            key={log.id}
            className="p-3 rounded-lg border border-border bg-muted/20"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2 flex-wrap">
                <Phone className="w-4 h-4 text-muted-foreground" />
                <Badge
                  variant="outline"
                  className={outcomeColors[log.outcome]}
                >
                  {outcomeLabels[log.outcome]}
                </Badge>
                {log.duration_seconds > 0 && (
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {formatDuration(log.duration_seconds)}
                  </span>
                )}
              </div>
              <span className="text-xs text-muted-foreground whitespace-nowrap">
                {format(new Date(log.created_at), "MMM d, h:mm a")}
              </span>
            </div>

            {/* User who logged the call */}
            <div className="flex items-center gap-1.5 mt-2 pl-6">
              <User className="w-3 h-3 text-muted-foreground" />
              <span className="text-xs font-medium text-muted-foreground">
                {getUserName(log.user_id)}
              </span>
            </div>

            {log.notes && (
              <div className="mt-2 pl-6 flex items-start gap-1.5">
                <MessageSquare className="w-3 h-3 text-muted-foreground mt-0.5 shrink-0" />
                <p className="text-sm text-muted-foreground">
                  {log.notes}
                </p>
              </div>
            )}

            {log.callback_scheduled_at && (
              <div className="mt-2 pl-6 text-xs text-purple-600">
                📅 Callback: {format(new Date(log.callback_scheduled_at), "MMM d, h:mm a")}
              </div>
            )}
          </div>
        ))}
      </div>
    </ScrollArea>
  );
};
