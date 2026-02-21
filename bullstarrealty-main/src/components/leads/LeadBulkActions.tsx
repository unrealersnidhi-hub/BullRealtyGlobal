import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { Loader2, UserCheck, Tag, Trash2, X } from "lucide-react";
import { type LeadStatus } from "./LeadStatusBadge";
import { LeadCountryTransfer } from "./LeadCountryTransfer";

interface TeamMember {
  id: string;
  email: string;
  fullName: string | null;
}

interface LeadBulkActionsProps {
  selectedIds: string[];
  teamMembers: TeamMember[];
  onClearSelection: () => void;
  onActionComplete: () => void;
}

export const LeadBulkActions = ({
  selectedIds,
  teamMembers,
  onClearSelection,
  onActionComplete,
}: LeadBulkActionsProps) => {
  const [isProcessing, setIsProcessing] = useState(false);

  const handleBulkAssign = async (assignedTo: string) => {
    setIsProcessing(true);
    try {
      const { error } = await supabase
        .from("leads")
        .update({ assigned_to: assignedTo === "unassigned" ? null : assignedTo })
        .in("id", selectedIds);

      if (error) throw error;
      toast.success(`${selectedIds.length} leads updated`);
      onClearSelection();
      onActionComplete();
    } catch (error) {
      console.error("Bulk assign error:", error);
      toast.error("Failed to assign leads");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleBulkStatus = async (status: LeadStatus) => {
    setIsProcessing(true);
    try {
      const { error } = await supabase
        .from("leads")
        .update({ status })
        .in("id", selectedIds);

      if (error) throw error;
      toast.success(`${selectedIds.length} leads updated to ${status}`);
      onClearSelection();
      onActionComplete();
    } catch (error) {
      console.error("Bulk status error:", error);
      toast.error("Failed to update leads");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleBulkDelete = async () => {
    setIsProcessing(true);
    try {
      const { error } = await supabase
        .from("leads")
        .delete()
        .in("id", selectedIds);

      if (error) throw error;
      toast.success(`${selectedIds.length} leads deleted`);
      onClearSelection();
      onActionComplete();
    } catch (error) {
      console.error("Bulk delete error:", error);
      toast.error("Failed to delete leads");
    } finally {
      setIsProcessing(false);
    }
  };

  if (selectedIds.length === 0) return null;

  return (
    <div className="flex items-center gap-3 p-3 rounded-lg bg-primary/5 border border-primary/20 animate-in slide-in-from-top-2">
      <span className="text-sm font-medium text-primary">
        {selectedIds.length} selected
      </span>

      <div className="flex items-center gap-2 flex-1 flex-wrap">
        {/* Bulk Assign */}
        <Select onValueChange={handleBulkAssign} disabled={isProcessing}>
          <SelectTrigger className="w-[160px] h-8 text-xs">
            <UserCheck className="w-3.5 h-3.5 mr-1.5" />
            Assign To
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="unassigned">Unassign All</SelectItem>
            {teamMembers.map((m) => (
              <SelectItem key={m.id} value={m.id}>
                {m.fullName || m.email}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Bulk Status */}
        <Select onValueChange={(v) => handleBulkStatus(v as LeadStatus)} disabled={isProcessing}>
          <SelectTrigger className="w-[150px] h-8 text-xs">
            <Tag className="w-3.5 h-3.5 mr-1.5" />
            Change Status
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="new">New</SelectItem>
            <SelectItem value="warm">Warm</SelectItem>
            <SelectItem value="hot">Hot</SelectItem>
            <SelectItem value="cold">Cold</SelectItem>
            <SelectItem value="not_interested">Not Interested</SelectItem>
            <SelectItem value="converted">Converted</SelectItem>
          </SelectContent>
        </Select>

        {/* Country Transfer */}
        <LeadCountryTransfer
          leadIds={selectedIds}
          onTransferComplete={() => { onClearSelection(); onActionComplete(); }}
          variant="bulk"
        />

        {/* Bulk Delete */}
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" size="sm" className="h-8 text-xs" disabled={isProcessing}>
              <Trash2 className="w-3.5 h-3.5 mr-1.5" />
              Delete
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete {selectedIds.length} leads?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. All selected leads and their associated data will be permanently deleted.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleBulkDelete} className="bg-destructive text-destructive-foreground">
                Delete All
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      {isProcessing && <Loader2 className="w-4 h-4 animate-spin" />}

      <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={onClearSelection}>
        <X className="w-4 h-4" />
      </Button>
    </div>
  );
};