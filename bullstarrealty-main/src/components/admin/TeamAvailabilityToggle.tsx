import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { Loader2, UserCheck, UserX, Calendar } from "lucide-react";

interface TeamMember {
  id: string;
  email: string;
  fullName: string | null;
  roles?: string[];
}

interface TeamAvailabilityToggleProps {
  teamMembers: TeamMember[];
}

export const TeamAvailabilityToggle = ({ teamMembers }: TeamAvailabilityToggleProps) => {
  const [availability, setAvailability] = useState<Record<string, boolean>>({});
  const [isLoading, setIsLoading] = useState(true);

  // Show ALL team members (sales, telesales, managers, MIS, HR, etc.)
  const salesTeam = teamMembers;

  useEffect(() => {
    fetchAvailability();
  }, [salesTeam.length]);

  const fetchAvailability = async () => {
    try {
      const { data, error } = await supabase
        .from("team_availability")
        .select("user_id, is_available");

      if (error) throw error;

      const avMap: Record<string, boolean> = {};
      salesTeam.forEach(m => { avMap[m.id] = true; }); // default available
      data?.forEach(row => { avMap[row.user_id] = row.is_available; });
      setAvailability(avMap);
    } catch (error) {
      console.error("Error fetching availability:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleAvailability = async (userId: string, isAvailable: boolean) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const { error } = await supabase
        .from("team_availability")
        .upsert({
          user_id: userId,
          is_available: isAvailable,
          updated_at: new Date().toISOString(),
          updated_by: session?.user?.id || null,
        }, { onConflict: "user_id" });

      if (error) throw error;

      setAvailability(prev => ({ ...prev, [userId]: isAvailable }));
      const member = salesTeam.find(m => m.id === userId);
      toast.success(`${member?.fullName || member?.email} marked as ${isAvailable ? "available" : "on leave"}`);
    } catch (error) {
      console.error("Error updating availability:", error);
      toast.error("Failed to update availability");
    }
  };

  const availableCount = Object.values(availability).filter(Boolean).length;
  const onLeaveCount = salesTeam.length - availableCount;

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
          Team Availability
          <div className="flex gap-2 ml-auto">
            <Badge variant="outline" className="text-emerald-500 border-emerald-500/30">
              <UserCheck className="w-3 h-3 mr-1" /> {availableCount}
            </Badge>
            <Badge variant="outline" className="text-red-500 border-red-500/30">
              <UserX className="w-3 h-3 mr-1" /> {onLeaveCount}
            </Badge>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <ScrollArea className="max-h-[300px]">
          <div className="space-y-2">
            {salesTeam.map(member => (
              <div
                key={member.id}
                className="flex items-center justify-between p-2.5 rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  {availability[member.id] ? (
                    <UserCheck className="w-4 h-4 text-emerald-500 shrink-0" />
                  ) : (
                    <UserX className="w-4 h-4 text-red-500 shrink-0" />
                  )}
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{member.fullName || member.email}</p>
                    <p className="text-xs text-muted-foreground">{member.roles?.join(", ")}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`text-xs ${availability[member.id] ? "text-emerald-500" : "text-red-500"}`}>
                    {availability[member.id] ? "Available" : "On Leave"}
                  </span>
                  <Switch
                    checked={availability[member.id] ?? true}
                    onCheckedChange={(checked) => toggleAvailability(member.id, checked)}
                  />
                </div>
              </div>
            ))}
            {salesTeam.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">No team members found</p>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};
