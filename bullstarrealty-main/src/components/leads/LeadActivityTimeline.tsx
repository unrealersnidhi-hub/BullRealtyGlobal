import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Loader2, User } from "lucide-react";
import { format } from "date-fns";
import {
  UserPlus,
  MessageSquare,
  CalendarCheck,
  CheckCircle,
  RefreshCw,
  TrendingUp,
  Clock,
  Bell,
  Phone,
} from "lucide-react";

interface LeadActivity {
  id: string;
  lead_id: string;
  user_id: string | null;
  activity_type: string;
  title: string;
  description: string | null;
  old_value: string | null;
  new_value: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

interface UserProfile {
  user_id: string;
  full_name: string | null;
  email: string | null;
}

interface LeadActivityTimelineProps {
  leadId: string;
}

const activityIcons: Record<string, typeof UserPlus> = {
  created: TrendingUp,
  status_changed: RefreshCw,
  assigned: UserPlus,
  note_added: MessageSquare,
  followup_scheduled: Bell,
  followup_completed: CheckCircle,
  call_made: Phone,
  email_sent: MessageSquare,
};

const activityColors: Record<string, string> = {
  created: "bg-green-500/10 text-green-600 border-green-500/30",
  status_changed: "bg-blue-500/10 text-blue-600 border-blue-500/30",
  assigned: "bg-purple-500/10 text-purple-600 border-purple-500/30",
  note_added: "bg-yellow-500/10 text-yellow-600 border-yellow-500/30",
  followup_scheduled: "bg-orange-500/10 text-orange-600 border-orange-500/30",
  followup_completed: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30",
  call_made: "bg-cyan-500/10 text-cyan-600 border-cyan-500/30",
  email_sent: "bg-indigo-500/10 text-indigo-600 border-indigo-500/30",
};

export const LeadActivityTimeline = ({ leadId }: LeadActivityTimelineProps) => {
  const [activities, setActivities] = useState<LeadActivity[]>([]);
  const [userProfiles, setUserProfiles] = useState<Record<string, UserProfile>>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchActivities();
  }, [leadId]);

  const fetchActivities = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("lead_activities")
        .select("*")
        .eq("lead_id", leadId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      const activityData = (data as LeadActivity[]) || [];
      setActivities(activityData);

      // Fetch user profiles for all unique user_ids
      const userIds = [...new Set(activityData.map(a => a.user_id).filter(Boolean))] as string[];
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
      console.error("Error fetching activities:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const getUserName = (userId: string | null) => {
    if (!userId) return "System";
    const profile = userProfiles[userId];
    return profile?.full_name || profile?.email || "Unknown User";
  };

  const getIcon = (type: string) => {
    return activityIcons[type] || Clock;
  };

  const getColorClass = (type: string) => {
    return activityColors[type] || "bg-muted text-muted-foreground border-border";
  };

  const formatStatusValue = (value: string | null) => {
    if (!value) return null;
    return value.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-[hsl(var(--gold))]" />
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
        <p>No activity recorded yet</p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-[350px] pr-4">
      <div className="relative">
        {/* Timeline line */}
        <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-border" />

        <div className="space-y-4">
          {activities.map((activity) => {
            const Icon = getIcon(activity.activity_type);
            const colorClass = getColorClass(activity.activity_type);
            const userName = getUserName(activity.user_id);

            return (
              <div key={activity.id} className="relative pl-10">
                {/* Timeline dot */}
                <div
                  className={`absolute left-2 -translate-x-1/2 w-5 h-5 rounded-full border flex items-center justify-center ${colorClass}`}
                >
                  <Icon className="w-3 h-3" />
                </div>

                <div className="bg-muted/30 rounded-lg p-3 border border-border">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-sm">{activity.title}</span>
                        <Badge variant="outline" className={`text-xs ${colorClass}`}>
                          {activity.activity_type.replace(/_/g, " ")}
                        </Badge>
                      </div>

                      {/* User who performed the action */}
                      <div className="flex items-center gap-1.5 mt-1">
                        <User className="w-3 h-3 text-muted-foreground" />
                        <span className="text-xs font-medium text-muted-foreground">
                          by {userName}
                        </span>
                      </div>

                      {activity.description && (
                        <p className="text-sm text-muted-foreground mt-1">
                          {activity.description}
                        </p>
                      )}

                      {activity.activity_type === "status_changed" && (
                        <div className="flex items-center gap-2 mt-2 text-sm">
                          <span className="text-muted-foreground">
                            {formatStatusValue(activity.old_value)}
                          </span>
                          <span className="text-muted-foreground">→</span>
                          <Badge variant="secondary">
                            {formatStatusValue(activity.new_value)}
                          </Badge>
                        </div>
                      )}

                      {activity.activity_type === "assigned" && activity.new_value && (
                        <div className="mt-2">
                          <Badge variant="secondary" className="text-xs">
                            {activity.new_value}
                          </Badge>
                        </div>
                      )}

                      {/* Call metadata */}
                      {activity.activity_type === "call_made" && activity.metadata && (
                        <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                          {activity.metadata.outcome && (
                            <Badge variant="outline" className="text-xs capitalize">
                              {String(activity.metadata.outcome).replace(/_/g, " ")}
                            </Badge>
                          )}
                          {activity.metadata.duration_seconds && Number(activity.metadata.duration_seconds) > 0 && (
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {Math.floor(Number(activity.metadata.duration_seconds) / 60)}:{String(Number(activity.metadata.duration_seconds) % 60).padStart(2, "0")}
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {format(new Date(activity.created_at), "MMM d, h:mm a")}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </ScrollArea>
  );
};
