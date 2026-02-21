import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { format, isSameDay } from "date-fns";
import { cn } from "@/lib/utils";
import { CalendarIcon, Loader2, Trash2, User, CheckCircle2 } from "lucide-react";
import { FollowUpCompleteDialog } from "./FollowUpCompleteDialog";

interface FollowUp {
  id: string;
  lead_id: string;
  user_id: string;
  scheduled_at: string;
  title: string;
  description: string | null;
  completed: boolean;
  lead?: {
    full_name: string;
    email: string;
  };
}

interface FollowUpCalendarProps {
  onLeadClick?: (leadId: string) => void;
}

export const FollowUpCalendar = ({ onLeadClick }: FollowUpCalendarProps) => {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [followUps, setFollowUps] = useState<FollowUp[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [completingFollowUp, setCompletingFollowUp] = useState<FollowUp | null>(null);

  useEffect(() => {
    fetchFollowUps();
  }, []);

  const fetchFollowUps = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("follow_ups")
        .select(`
          *,
          lead:leads(full_name, email)
        `)
        .order("scheduled_at", { ascending: true });

      if (error) throw error;
      setFollowUps(data || []);
    } catch (error) {
      console.error("Error fetching follow-ups:", error);
      toast.error("Failed to load follow-ups");
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleFollowUp = async (followUp: FollowUp) => {
    try {
      const { error } = await supabase
        .from("follow_ups")
        .update({
          completed: !followUp.completed,
          completed_at: !followUp.completed ? new Date().toISOString() : null,
        })
        .eq("id", followUp.id);

      if (error) throw error;

      setFollowUps(
        followUps.map((f) =>
          f.id === followUp.id
            ? { ...f, completed: !f.completed }
            : f
        )
      );
    } catch (error) {
      console.error("Error updating follow-up:", error);
      toast.error("Failed to update follow-up");
    }
  };

  const handleDeleteFollowUp = async (followUpId: string) => {
    try {
      const { error } = await supabase
        .from("follow_ups")
        .delete()
        .eq("id", followUpId);

      if (error) throw error;

      setFollowUps(followUps.filter((f) => f.id !== followUpId));
      toast.success("Follow-up deleted");
    } catch (error) {
      console.error("Error deleting follow-up:", error);
      toast.error("Failed to delete follow-up");
    }
  };

  // Get dates that have follow-ups
  const followUpDates = followUps.map((f) => new Date(f.scheduled_at));

  // Filter follow-ups for selected date
  const selectedDateFollowUps = selectedDate
    ? followUps.filter((f) => isSameDay(new Date(f.scheduled_at), selectedDate))
    : [];

  // Get overdue follow-ups (past and not completed)
  const overdueFollowUps = followUps.filter(
    (f) => !f.completed && new Date(f.scheduled_at) < new Date()
  );

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-gold" />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Calendar */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarIcon className="w-5 h-5 text-gold" />
            Follow-up Calendar
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={setSelectedDate}
            className="rounded-md border pointer-events-auto"
            modifiers={{
              hasFollowUp: followUpDates,
            }}
            modifiersStyles={{
              hasFollowUp: {
                fontWeight: "bold",
                textDecoration: "underline",
                textDecorationColor: "hsl(var(--gold))",
              },
            }}
          />
        </CardContent>
      </Card>

      {/* Follow-ups for Selected Date */}
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {selectedDate
                ? format(selectedDate, "EEEE, MMMM d, yyyy")
                : "Select a date"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[200px]">
              {selectedDateFollowUps.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No follow-ups scheduled for this date
                </p>
              ) : (
                <div className="space-y-2">
                  {selectedDateFollowUps.map((followUp) => (
                    <div
                      key={followUp.id}
                      className={cn(
                        "p-3 rounded-lg border group",
                        followUp.completed ? "bg-muted/30" : "bg-background"
                      )}
                    >
                      <div className="flex items-start gap-3">
                        <Checkbox
                          checked={followUp.completed}
                          onCheckedChange={() => handleToggleFollowUp(followUp)}
                          className="mt-1"
                        />
                        <div className="flex-1 min-w-0">
                          <p
                            className={cn(
                              "font-medium text-sm",
                              followUp.completed && "line-through text-muted-foreground"
                            )}
                          >
                            {followUp.title}
                          </p>
                          {followUp.lead && (
                            <button
                              onClick={() => onLeadClick?.(followUp.lead_id)}
                              className="flex items-center gap-1 text-xs text-[hsl(var(--gold))] hover:underline mt-1"
                            >
                              <User className="w-3 h-3" />
                              {followUp.lead.full_name}
                            </button>
                          )}
                          <p className="text-xs text-muted-foreground mt-1">
                            {format(new Date(followUp.scheduled_at), "h:mm a")}
                          </p>
                          {!followUp.completed && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-6 text-[10px] mt-1.5 gap-1"
                              onClick={() => setCompletingFollowUp(followUp)}
                            >
                              <CheckCircle2 className="w-3 h-3" />
                              Complete with Remarks
                            </Button>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="opacity-0 group-hover:opacity-100 h-6 w-6 text-destructive"
                          onClick={() => handleDeleteFollowUp(followUp.id)}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Overdue Follow-ups */}
        {overdueFollowUps.length > 0 && (
          <Card className="border-destructive/50">
            <CardHeader>
              <CardTitle className="text-base text-destructive">
                Overdue ({overdueFollowUps.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[150px]">
                <div className="space-y-2">
                  {overdueFollowUps.map((followUp) => (
                    <div
                      key={followUp.id}
                      className="p-3 rounded-lg border border-destructive/20 bg-destructive/5 group"
                    >
                      <div className="flex items-start gap-3">
                        <Checkbox
                          checked={followUp.completed}
                          onCheckedChange={() => handleToggleFollowUp(followUp)}
                          className="mt-1"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm">{followUp.title}</p>
                          {followUp.lead && (
                            <button
                              onClick={() => onLeadClick?.(followUp.lead_id)}
                              className="flex items-center gap-1 text-xs text-[hsl(var(--gold))] hover:underline mt-1"
                            >
                              <User className="w-3 h-3" />
                              {followUp.lead.full_name}
                            </button>
                          )}
                          <p className="text-xs text-destructive mt-1">
                            {format(new Date(followUp.scheduled_at), "MMM d 'at' h:mm a")}
                          </p>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-6 text-[10px] mt-1.5 gap-1"
                            onClick={() => setCompletingFollowUp(followUp)}
                          >
                            <CheckCircle2 className="w-3 h-3" />
                            Complete with Remarks
                          </Button>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="opacity-0 group-hover:opacity-100 h-6 w-6 text-destructive"
                          onClick={() => handleDeleteFollowUp(followUp.id)}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Follow-up Complete Dialog */}
      {completingFollowUp && (
        <FollowUpCompleteDialog
          open={!!completingFollowUp}
          onOpenChange={(open) => !open && setCompletingFollowUp(null)}
          followUpId={completingFollowUp.id}
          followUpTitle={completingFollowUp.title}
          onCompleted={(id, remarks, outcome) => {
            setFollowUps(followUps.map(f => f.id === id ? { ...f, completed: true, stage: outcome, description: remarks } : f));
            setCompletingFollowUp(null);
          }}
        />
      )}
    </div>
  );
};
