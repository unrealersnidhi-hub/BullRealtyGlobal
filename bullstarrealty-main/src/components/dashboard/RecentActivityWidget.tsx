import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Activity, Phone, MessageSquare, Calendar, ArrowRight, Tag, UserCheck } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

interface RecentActivity {
  id: string;
  activityType: string;
  title: string;
  description: string | null;
  createdAt: string;
  leadName?: string;
  leadId?: string;
}

interface RecentActivityWidgetProps {
  onLeadClick?: (leadId: string) => void;
}

export const RecentActivityWidget = ({ onLeadClick }: RecentActivityWidgetProps) => {
  const [activities, setActivities] = useState<RecentActivity[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchActivities();
  }, []);

  const fetchActivities = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data, error } = await supabase
        .from("lead_activities")
        .select("id, activity_type, title, description, created_at, lead_id, lead:leads(full_name)")
        .eq("user_id", session.user.id)
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) throw error;

      setActivities(
        (data || []).map((a: any) => ({
          id: a.id,
          activityType: a.activity_type,
          title: a.title,
          description: a.description,
          createdAt: a.created_at,
          leadName: a.lead?.full_name,
          leadId: a.lead_id,
        }))
      );
    } catch (error) {
      console.error("Error fetching activities:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case "call_made": return <Phone className="w-3.5 h-3.5 text-blue-500" />;
      case "note_added": return <MessageSquare className="w-3.5 h-3.5 text-emerald-500" />;
      case "followup_scheduled": return <Calendar className="w-3.5 h-3.5 text-purple-500" />;
      case "followup_completed": return <Calendar className="w-3.5 h-3.5 text-emerald-500" />;
      case "status_changed": return <ArrowRight className="w-3.5 h-3.5 text-amber-500" />;
      case "assigned": return <UserCheck className="w-3.5 h-3.5 text-sky-500" />;
      case "tag_added": return <Tag className="w-3.5 h-3.5 text-pink-500" />;
      default: return <Activity className="w-3.5 h-3.5 text-muted-foreground" />;
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Activity className="w-5 h-5 text-[hsl(var(--gold))]" />
          My Recent Activity
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {activities.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            <Activity className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm">No recent activity</p>
          </div>
        ) : (
          <ScrollArea className="h-[280px]">
            <div className="space-y-1">
              {activities.map((activity) => (
                <button
                  key={activity.id}
                  onClick={() => activity.leadId && onLeadClick?.(activity.leadId)}
                  className="w-full text-left p-2 rounded-lg hover:bg-muted/50 transition-colors flex items-start gap-2.5"
                >
                  <div className="mt-0.5 shrink-0">{getIcon(activity.activityType)}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate">{activity.title}</p>
                    {activity.leadName && (
                      <p className="text-[10px] text-[hsl(var(--gold))]">{activity.leadName}</p>
                    )}
                    {activity.description && (
                      <p className="text-[10px] text-muted-foreground truncate">{activity.description}</p>
                    )}
                  </div>
                  <span className="text-[10px] text-muted-foreground shrink-0 mt-0.5">
                    {formatDistanceToNow(new Date(activity.createdAt), { addSuffix: true })}
                  </span>
                </button>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
};
