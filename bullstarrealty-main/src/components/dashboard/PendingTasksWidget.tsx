import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, AlertTriangle, Phone, Calendar, Clock, CheckCircle2, ChevronRight } from "lucide-react";
import { format, isPast, isToday, isTomorrow } from "date-fns";
import { cn } from "@/lib/utils";

interface PendingTask {
  id: string;
  type: "follow_up" | "callback" | "meeting";
  title: string;
  leadName: string;
  leadId: string;
  scheduledAt: string;
  isOverdue: boolean;
  stage?: string;
  followUpType?: string;
}

interface PendingTasksWidgetProps {
  onLeadClick?: (leadId: string) => void;
}

export const PendingTasksWidget = ({ onLeadClick }: PendingTasksWidgetProps) => {
  const [tasks, setTasks] = useState<PendingTask[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchPendingTasks();
  }, []);

  const fetchPendingTasks = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      // Fetch pending follow-ups
      const { data: followUps } = await supabase
        .from("follow_ups")
        .select("id, title, scheduled_at, lead_id, stage, follow_up_type, lead:leads(full_name)")
        .eq("completed", false)
        .eq("user_id", session.user.id)
        .order("scheduled_at", { ascending: true })
        .limit(50);

      // Fetch pending callbacks from call logs
      const { data: callbacks } = await supabase
        .from("call_logs")
        .select("id, callback_scheduled_at, lead_id, lead:leads(full_name)")
        .eq("user_id", session.user.id)
        .eq("outcome", "callback_scheduled")
        .not("callback_scheduled_at", "is", null)
        .order("callback_scheduled_at", { ascending: true })
        .limit(30);

      // Fetch upcoming meetings
      const { data: meetings } = await supabase
        .from("meetings")
        .select("id, title, scheduled_at, lead_id, lead:leads(full_name)")
        .eq("created_by", session.user.id)
        .in("status", ["scheduled", "confirmed"])
        .order("scheduled_at", { ascending: true })
        .limit(30);

      const allTasks: PendingTask[] = [];

      followUps?.forEach((fu: any) => {
        allTasks.push({
          id: fu.id,
          type: "follow_up",
          title: fu.title,
          leadName: fu.lead?.full_name || "Unknown",
          leadId: fu.lead_id,
          scheduledAt: fu.scheduled_at,
          isOverdue: isPast(new Date(fu.scheduled_at)),
          stage: fu.stage,
          followUpType: fu.follow_up_type,
        });
      });

      callbacks?.forEach((cb: any) => {
        if (cb.callback_scheduled_at) {
          allTasks.push({
            id: cb.id,
            type: "callback",
            title: "Callback Scheduled",
            leadName: cb.lead?.full_name || "Unknown",
            leadId: cb.lead_id,
            scheduledAt: cb.callback_scheduled_at,
            isOverdue: isPast(new Date(cb.callback_scheduled_at)),
          });
        }
      });

      meetings?.forEach((m: any) => {
        allTasks.push({
          id: m.id,
          type: "meeting",
          title: m.title,
          leadName: m.lead?.full_name || "Unknown",
          leadId: m.lead_id,
          scheduledAt: m.scheduled_at,
          isOverdue: isPast(new Date(m.scheduled_at)),
        });
      });

      // Sort: overdue first, then by date
      allTasks.sort((a, b) => {
        if (a.isOverdue && !b.isOverdue) return -1;
        if (!a.isOverdue && b.isOverdue) return 1;
        return new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime();
      });

      setTasks(allTasks);
    } catch (error) {
      console.error("Error fetching pending tasks:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const overdueTasks = tasks.filter(t => t.isOverdue);
  const upcomingTasks = tasks.filter(t => !t.isOverdue);

  const getTimeLabel = (dateStr: string) => {
    const date = new Date(dateStr);
    if (isToday(date)) return `Today ${format(date, "h:mm a")}`;
    if (isTomorrow(date)) return `Tomorrow ${format(date, "h:mm a")}`;
    return format(date, "MMM d, h:mm a");
  };

  const getTypeIcon = (type: string) => {
    if (type === "callback") return <Phone className="w-3.5 h-3.5" />;
    if (type === "meeting") return <Calendar className="w-3.5 h-3.5" />;
    return <Clock className="w-3.5 h-3.5" />;
  };

  const getTypeBadgeColor = (type: string) => {
    if (type === "callback") return "bg-blue-500/10 text-blue-600 border-blue-500/20";
    if (type === "meeting") return "bg-purple-500/10 text-purple-600 border-purple-500/20";
    return "bg-amber-500/10 text-amber-600 border-amber-500/20";
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

  if (tasks.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
            Pending Tasks
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6 text-muted-foreground">
            <CheckCircle2 className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm">All caught up! No pending tasks.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Clock className="w-5 h-5 text-[hsl(var(--gold))]" />
          Pending Tasks
          {overdueTasks.length > 0 && (
            <Badge variant="destructive" className="text-[10px] h-5">
              {overdueTasks.length} overdue
            </Badge>
          )}
          <Badge variant="secondary" className="text-[10px] h-5 ml-auto">
            {tasks.length} total
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <ScrollArea className="h-[280px]">
          <div className="space-y-1.5">
            {overdueTasks.length > 0 && (
              <div className="flex items-center gap-1.5 mb-2">
                <AlertTriangle className="w-3.5 h-3.5 text-destructive" />
                <span className="text-xs font-semibold text-destructive">Overdue</span>
              </div>
            )}
            {overdueTasks.map((task) => (
              <button
                key={`${task.type}-${task.id}`}
                onClick={() => onLeadClick?.(task.leadId)}
                className="w-full text-left p-2.5 rounded-lg border border-destructive/20 bg-destructive/5 hover:bg-destructive/10 transition-colors"
              >
                <div className="flex items-center gap-2">
                  {getTypeIcon(task.type)}
                  <span className="text-xs font-medium flex-1 truncate">{task.title}</span>
                  <Badge variant="outline" className={cn("text-[9px] h-4", getTypeBadgeColor(task.type))}>
                    {task.type.replace("_", " ")}
                  </Badge>
                </div>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-[10px] text-muted-foreground">{task.leadName}</span>
                  <span className="text-[10px] text-destructive font-medium">{getTimeLabel(task.scheduledAt)}</span>
                </div>
              </button>
            ))}

            {upcomingTasks.length > 0 && overdueTasks.length > 0 && (
              <div className="flex items-center gap-1.5 mt-3 mb-2">
                <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-xs font-semibold text-muted-foreground">Upcoming</span>
              </div>
            )}
            {upcomingTasks.slice(0, 15).map((task) => (
              <button
                key={`${task.type}-${task.id}`}
                onClick={() => onLeadClick?.(task.leadId)}
                className="w-full text-left p-2.5 rounded-lg border border-border hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-2">
                  {getTypeIcon(task.type)}
                  <span className="text-xs font-medium flex-1 truncate">{task.title}</span>
                  <Badge variant="outline" className={cn("text-[9px] h-4", getTypeBadgeColor(task.type))}>
                    {task.type.replace("_", " ")}
                  </Badge>
                </div>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-[10px] text-muted-foreground">{task.leadName}</span>
                  <span className="text-[10px] text-muted-foreground">{getTimeLabel(task.scheduledAt)}</span>
                </div>
              </button>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};
