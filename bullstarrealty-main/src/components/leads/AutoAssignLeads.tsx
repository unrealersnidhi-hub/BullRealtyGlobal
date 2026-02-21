import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { Loader2, Shuffle, UserCheck, UserX } from "lucide-react";

interface TeamMember {
  id: string;
  email: string;
  fullName: string | null;
  roles?: string[];
}

interface AutoAssignLeadsProps {
  unassignedLeadIds: string[];
  teamMembers: TeamMember[];
  onAssignComplete: () => void;
}

export const AutoAssignLeads = ({ unassignedLeadIds, teamMembers, onAssignComplete }: AutoAssignLeadsProps) => {
  const [open, setOpen] = useState(false);
  const [isAssigning, setIsAssigning] = useState(false);
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [availability, setAvailability] = useState<Record<string, boolean>>({});

  // Filter to only sales team (user + telesales roles)
  const salesTeam = teamMembers.filter(
    m => m.roles?.includes("user") || m.roles?.includes("telesales")
  );

  // Fetch availability when dialog opens
  useEffect(() => {
    if (open) {
      fetchAvailability();
    }
  }, [open]);

  const fetchAvailability = async () => {
    try {
      const { data } = await supabase.from("team_availability").select("user_id, is_available");
      const avMap: Record<string, boolean> = {};
      salesTeam.forEach(m => { avMap[m.id] = true; });
      data?.forEach(row => { avMap[row.user_id] = row.is_available; });
      setAvailability(avMap);
      // Auto-select only available members
      setSelectedMembers(salesTeam.filter(m => avMap[m.id] !== false).map(m => m.id));
    } catch (error) {
      console.error("Error fetching availability:", error);
    }
  };

  const toggleMember = (id: string) => {
    setSelectedMembers(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const selectAll = () => {
    if (selectedMembers.length === salesTeam.length) {
      setSelectedMembers([]);
    } else {
      setSelectedMembers(salesTeam.map(m => m.id));
    }
  };

  const handleAutoAssign = async () => {
    if (selectedMembers.length === 0) {
      toast.error("Select at least one team member");
      return;
    }
    if (unassignedLeadIds.length === 0) {
      toast.error("No unassigned leads to distribute");
      return;
    }

    setIsAssigning(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      // Round-robin assignment
      const assignments = unassignedLeadIds.map((leadId, index) => ({
        leadId,
        assignTo: selectedMembers[index % selectedMembers.length],
      }));

      // Batch update leads
      let successCount = 0;
      for (const { leadId, assignTo } of assignments) {
        const { error } = await supabase
          .from("leads")
          .update({ assigned_to: assignTo, assigned_at: new Date().toISOString() })
          .eq("id", leadId);
        
        if (!error) {
          successCount++;
          // Log activity
          await supabase.from("lead_activities").insert({
            lead_id: leadId,
            user_id: session.user.id,
            activity_type: "auto_assigned",
            title: "Auto-assigned to team member",
            description: `Lead auto-assigned via round-robin distribution`,
          });
        }
      }

      toast.success(`${successCount} leads auto-assigned to ${selectedMembers.length} team members`);
      setOpen(false);
      onAssignComplete();
    } catch (error: any) {
      console.error("Auto-assign error:", error);
      toast.error("Failed to auto-assign leads");
    } finally {
      setIsAssigning(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="h-9" disabled={unassignedLeadIds.length === 0}>
          <Shuffle className="w-4 h-4 mr-2" />
          Auto Assign
          {unassignedLeadIds.length > 0 && (
            <Badge variant="secondary" className="ml-2 text-[10px]">{unassignedLeadIds.length}</Badge>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shuffle className="w-5 h-5 text-[hsl(var(--gold))]" />
            Auto-Assign Leads
          </DialogTitle>
          <DialogDescription>
            Distribute {unassignedLeadIds.length} unassigned leads equally among selected team members using round-robin.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Select Team Members</span>
            <Button variant="ghost" size="sm" onClick={selectAll} className="text-xs h-7">
              {selectedMembers.length === salesTeam.length ? "Deselect All" : "Select All"}
            </Button>
          </div>

          <ScrollArea className="h-[250px] border rounded-lg p-3">
            {salesTeam.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No sales team members found</p>
            ) : (
              <div className="space-y-2">
                {salesTeam.map(member => (
                  <label
                    key={member.id}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 cursor-pointer"
                  >
                    <Checkbox
                      checked={selectedMembers.includes(member.id)}
                      onCheckedChange={() => toggleMember(member.id)}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{member.fullName || member.email}</p>
                      <p className="text-xs text-muted-foreground">{member.roles?.join(", ")}</p>
                    </div>
                    {availability[member.id] === false ? (
                      <Badge variant="outline" className="text-red-500 border-red-500/30 text-[10px]">
                        <UserX className="w-3 h-3 mr-1" /> On Leave
                      </Badge>
                    ) : (
                      <UserCheck className="w-4 h-4 text-emerald-500 shrink-0" />
                    )}
                  </label>
                ))}
              </div>
            )}
          </ScrollArea>

          {selectedMembers.length > 0 && (
            <div className="bg-muted/50 rounded-lg p-3 text-sm">
              <p>
                Each member will get ~<strong>{Math.ceil(unassignedLeadIds.length / selectedMembers.length)}</strong> leads
              </p>
            </div>
          )}

          <Button
            onClick={handleAutoAssign}
            disabled={isAssigning || selectedMembers.length === 0}
            className="w-full"
          >
            {isAssigning ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Assigning...</>
            ) : (
              <><Shuffle className="w-4 h-4 mr-2" /> Assign {unassignedLeadIds.length} Leads</>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
