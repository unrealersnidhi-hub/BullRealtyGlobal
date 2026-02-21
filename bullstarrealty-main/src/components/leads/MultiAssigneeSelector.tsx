import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { Loader2, Users, UserPlus, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface TeamMember {
  id: string;
  email: string;
  fullName: string | null;
  roles?: string[];
}

interface Assignee {
  id: string;
  user_id: string;
  role: string;
}

interface MultiAssigneeSelectorProps {
  leadId: string;
  teamMembers: TeamMember[];
  onUpdate?: () => void;
}

export const MultiAssigneeSelector = ({ leadId, teamMembers, onUpdate }: MultiAssigneeSelectorProps) => {
  const [assignees, setAssignees] = useState<Assignee[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (open) fetchAssignees();
  }, [open, leadId]);

  const fetchAssignees = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("lead_assignees")
        .select("id, user_id, role")
        .eq("lead_id", leadId);
      if (error) throw error;
      setAssignees(data || []);
      setSelectedIds((data || []).map(a => a.user_id));
    } catch (e) {
      console.error("Error fetching assignees:", e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const currentIds = assignees.map(a => a.user_id);
      const toAdd = selectedIds.filter(id => !currentIds.includes(id));
      const toRemove = currentIds.filter(id => !selectedIds.includes(id));

      if (toRemove.length > 0) {
        await supabase
          .from("lead_assignees")
          .delete()
          .eq("lead_id", leadId)
          .in("user_id", toRemove);
      }

      if (toAdd.length > 0) {
        await supabase
          .from("lead_assignees")
          .insert(toAdd.map(uid => ({
            lead_id: leadId,
            user_id: uid,
            assigned_by: session.user.id,
            role: "member",
          })));
      }

      toast.success(`Updated team assignment (${selectedIds.length} members)`);
      setOpen(false);
      onUpdate?.();
    } catch (e) {
      console.error("Error saving assignees:", e);
      toast.error("Failed to update assignees");
    } finally {
      setIsSaving(false);
    }
  };

  const toggleMember = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const salesTeam = teamMembers.filter(m =>
    !m.roles || m.roles.some(r => ["user", "telesales", "manager", "admin", "super_admin", "mis"].includes(r))
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5 text-xs h-8">
          <Users className="w-3.5 h-3.5" />
          Team ({assignees.length})
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-[hsl(var(--gold))]" />
            Assign Team Members
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-[hsl(var(--gold))]" />
          </div>
        ) : (
          <>
            <div className="flex flex-wrap gap-1.5 mb-3">
              {selectedIds.map(id => {
                const m = teamMembers.find(t => t.id === id);
                return (
                  <Badge key={id} variant="secondary" className="gap-1 text-xs">
                    {m?.fullName || m?.email || "Unknown"}
                    <X className="w-3 h-3 cursor-pointer" onClick={() => toggleMember(id)} />
                  </Badge>
                );
              })}
              {selectedIds.length === 0 && (
                <p className="text-sm text-muted-foreground">No team members assigned</p>
              )}
            </div>

            <ScrollArea className="h-[300px] border rounded-lg p-2">
              <div className="space-y-1">
                {salesTeam.map(member => (
                  <label
                    key={member.id}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 cursor-pointer"
                  >
                    <Checkbox
                      checked={selectedIds.includes(member.id)}
                      onCheckedChange={() => toggleMember(member.id)}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{member.fullName || member.email}</p>
                      {member.roles && (
                        <p className="text-xs text-muted-foreground capitalize">{member.roles.join(", ")}</p>
                      )}
                    </div>
                  </label>
                ))}
              </div>
            </ScrollArea>

            <div className="flex gap-2 pt-2">
              <Button variant="outline" onClick={() => setOpen(false)} className="flex-1">Cancel</Button>
              <Button onClick={handleSave} disabled={isSaving} className="flex-1">
                {isSaving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                Save ({selectedIds.length})
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};
