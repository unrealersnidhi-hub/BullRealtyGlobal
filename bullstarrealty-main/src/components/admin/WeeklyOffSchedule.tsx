import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { Loader2, Calendar } from "lucide-react";

interface TeamMember {
  id: string;
  email: string;
  fullName: string | null;
  roles?: string[];
}

interface WeeklyOffScheduleProps {
  teamMembers: TeamMember[];
}

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export const WeeklyOffSchedule = ({ teamMembers }: WeeklyOffScheduleProps) => {
  const [offs, setOffs] = useState<Record<string, Set<number>>>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchOffs();
  }, [teamMembers.length]);

  const fetchOffs = async () => {
    try {
      const { data, error } = await supabase
        .from("weekly_offs")
        .select("user_id, day_of_week")
        .eq("is_active", true);

      if (error) throw error;

      const offMap: Record<string, Set<number>> = {};
      data?.forEach((row) => {
        if (!offMap[row.user_id]) offMap[row.user_id] = new Set();
        offMap[row.user_id].add(row.day_of_week);
      });
      setOffs(offMap);
    } catch (error) {
      console.error("Error fetching weekly offs:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleOff = async (userId: string, day: number, checked: boolean) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (checked) {
        await supabase.from("weekly_offs").upsert({
          user_id: userId,
          day_of_week: day,
          is_active: true,
          updated_by: session?.user?.id || null,
        }, { onConflict: "user_id,day_of_week" });
      } else {
        await supabase.from("weekly_offs")
          .update({ is_active: false })
          .eq("user_id", userId)
          .eq("day_of_week", day);
      }

      setOffs((prev) => {
        const newOffs = { ...prev };
        if (!newOffs[userId]) newOffs[userId] = new Set();
        if (checked) {
          newOffs[userId] = new Set([...newOffs[userId], day]);
        } else {
          newOffs[userId] = new Set([...newOffs[userId]].filter((d) => d !== day));
        }
        return newOffs;
      });

      const member = teamMembers.find((m) => m.id === userId);
      toast.success(`${member?.fullName || member?.email} - ${DAYS[day]} ${checked ? "set as off" : "removed"}`);
    } catch (error) {
      console.error("Error toggling weekly off:", error);
      toast.error("Failed to update");
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6 flex items-center justify-center">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Calendar className="w-4 h-4 text-[hsl(var(--gold))]" />
          Weekly Off Schedule
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <ScrollArea className="max-h-[400px]">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 pr-4 font-medium text-muted-foreground min-w-[150px]">Member</th>
                  {DAYS.map((day) => (
                    <th key={day} className="text-center py-2 px-2 font-medium text-muted-foreground w-10">{day}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {teamMembers.map((member) => (
                  <tr key={member.id} className="border-b border-border/30 hover:bg-muted/30">
                    <td className="py-2 pr-4">
                      <p className="font-medium text-sm truncate">{member.fullName || member.email}</p>
                      <p className="text-xs text-muted-foreground">{member.roles?.join(", ")}</p>
                    </td>
                    {DAYS.map((_, dayIdx) => (
                      <td key={dayIdx} className="text-center py-2 px-2">
                        <Checkbox
                          checked={offs[member.id]?.has(dayIdx) || false}
                          onCheckedChange={(checked) => toggleOff(member.id, dayIdx, !!checked)}
                        />
                      </td>
                    ))}
                  </tr>
                ))}
                {teamMembers.length === 0 && (
                  <tr>
                    <td colSpan={8} className="text-center py-4 text-muted-foreground">
                      No team members found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};
