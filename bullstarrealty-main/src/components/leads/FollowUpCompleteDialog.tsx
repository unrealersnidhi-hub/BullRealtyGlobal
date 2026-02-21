import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, CheckCircle2 } from "lucide-react";

interface FollowUpCompleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  followUpId: string;
  followUpTitle: string;
  onCompleted: (id: string, remarks: string, outcome: string) => void;
}

export const FollowUpCompleteDialog = ({
  open, onOpenChange, followUpId, followUpTitle, onCompleted,
}: FollowUpCompleteDialogProps) => {
  const [remarks, setRemarks] = useState("");
  const [outcome, setOutcome] = useState("completed");
  const [isSaving, setIsSaving] = useState(false);

  const handleComplete = async () => {
    if (!remarks.trim()) {
      toast.error("Please add remarks before completing");
      return;
    }

    setIsSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      // Update follow-up
      const { error: fuError } = await supabase
        .from("follow_ups")
        .update({
          completed: true,
          completed_at: new Date().toISOString(),
          stage: outcome,
          description: remarks.trim(),
        })
        .eq("id", followUpId);

      if (fuError) throw fuError;

      // Log activity
      const { data: fu } = await supabase
        .from("follow_ups")
        .select("lead_id")
        .eq("id", followUpId)
        .single();

      if (fu) {
        await supabase.from("lead_activities").insert({
          lead_id: fu.lead_id,
          user_id: session.user.id,
          activity_type: "followup_completed",
          title: `Follow-up Completed: ${followUpTitle}`,
          description: `Outcome: ${outcome}. Remarks: ${remarks.trim()}`,
          metadata: { outcome, remarks: remarks.trim() },
        });
      }

      toast.success("Follow-up completed with remarks");
      onCompleted(followUpId, remarks.trim(), outcome);
      setRemarks("");
      setOutcome("completed");
      onOpenChange(false);
    } catch (error) {
      console.error("Error completing follow-up:", error);
      toast.error("Failed to complete follow-up");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
            Complete Follow-up
          </DialogTitle>
          <DialogDescription>
            {followUpTitle}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label className="text-sm">Outcome</Label>
            <Select value={outcome} onValueChange={setOutcome}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="completed">✅ Completed Successfully</SelectItem>
                <SelectItem value="rescheduled">📅 Rescheduled</SelectItem>
                <SelectItem value="cancelled">❌ Cancelled</SelectItem>
                <SelectItem value="no_response">📵 No Response</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="text-sm">Remarks *</Label>
            <Textarea
              placeholder="Add detailed remarks about this follow-up..."
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              className="min-h-[100px] resize-none"
            />
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
              Cancel
            </Button>
            <Button onClick={handleComplete} disabled={isSaving || !remarks.trim()} className="flex-1">
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
              Complete
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
