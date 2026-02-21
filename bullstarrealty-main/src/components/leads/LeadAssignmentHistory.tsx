import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, ArrowRight, UserMinus, UserPlus } from "lucide-react";
import { format } from "date-fns";

interface AssignmentRecord {
  id: string;
  lead_id: string;
  assigned_from: string | null;
  assigned_to: string | null;
  assigned_by: string | null;
  notes: string | null;
  created_at: string;
}

interface ProfileMap {
  [userId: string]: { full_name: string | null; email: string | null };
}

interface LeadAssignmentHistoryProps {
  leadId: string;
}

export const LeadAssignmentHistory = ({ leadId }: LeadAssignmentHistoryProps) => {
  const [history, setHistory] = useState<AssignmentRecord[]>([]);
  const [profiles, setProfiles] = useState<ProfileMap>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchHistory();
  }, [leadId]);

  const fetchHistory = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("lead_assignment_history")
        .select("*")
        .eq("lead_id", leadId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const records = data || [];
      setHistory(records);

      // Collect unique user IDs to fetch profiles
      const userIds = new Set<string>();
      records.forEach((r) => {
        if (r.assigned_from) userIds.add(r.assigned_from);
        if (r.assigned_to) userIds.add(r.assigned_to);
        if (r.assigned_by) userIds.add(r.assigned_by);
      });

      if (userIds.size > 0) {
        const { data: profileData } = await supabase
          .from("profiles")
          .select("user_id, full_name, email")
          .in("user_id", Array.from(userIds));

        const map: ProfileMap = {};
        profileData?.forEach((p) => {
          map[p.user_id] = { full_name: p.full_name, email: p.email };
        });
        setProfiles(map);
      }
    } catch (error) {
      console.error("Error fetching assignment history:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const getUserName = (userId: string | null) => {
    if (!userId) return "Unassigned";
    const profile = profiles[userId];
    return profile?.full_name || profile?.email || "Unknown User";
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-[hsl(var(--gold))]" />
      </div>
    );
  }

  if (history.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <ArrowRight className="w-8 h-8 mx-auto mb-2 opacity-50" />
        <p>No assignment transfers yet</p>
      </div>
    );
  }

  return (
    <ScrollArea className="flex-1">
      <div className="space-y-3">
        {history.map((record) => (
          <div
            key={record.id}
            className="p-3 rounded-lg bg-muted/50 border border-border"
          >
            <div className="flex items-center gap-2 text-sm">
              {record.assigned_from ? (
                <>
                  <UserMinus className="w-4 h-4 text-muted-foreground shrink-0" />
                  <span className="font-medium">{getUserName(record.assigned_from)}</span>
                  <ArrowRight className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                </>
              ) : (
                <UserPlus className="w-4 h-4 text-emerald-500 shrink-0" />
              )}
              {record.assigned_to ? (
                <span className="font-medium text-[hsl(var(--gold))]">
                  {getUserName(record.assigned_to)}
                </span>
              ) : (
                <span className="text-muted-foreground italic">Unassigned</span>
              )}
            </div>
            {record.assigned_by && (
              <p className="text-xs text-muted-foreground mt-1.5">
                By: {getUserName(record.assigned_by)}
              </p>
            )}
            {record.notes && (
              <p className="text-xs text-muted-foreground mt-1">{record.notes}</p>
            )}
            <p className="text-xs text-muted-foreground mt-1.5">
              {format(new Date(record.created_at), "MMM d, yyyy 'at' h:mm a")}
            </p>
          </div>
        ))}
      </div>
    </ScrollArea>
  );
};
