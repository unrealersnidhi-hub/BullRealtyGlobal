import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { ArrowRightLeft, Loader2 } from "lucide-react";

interface LeadCountryTransferProps {
  leadIds: string[];
  currentCountry?: "dubai" | "india" | null;
  onTransferComplete: () => void;
  variant?: "single" | "bulk";
}

export const LeadCountryTransfer = ({
  leadIds,
  currentCountry,
  onTransferComplete,
  variant = "single",
}: LeadCountryTransferProps) => {
  const [targetCountry, setTargetCountry] = useState<string>(
    currentCountry === "dubai" ? "india" : "dubai"
  );
  const [reason, setReason] = useState("");
  const [isTransferring, setIsTransferring] = useState(false);

  const handleTransfer = async () => {
    setIsTransferring(true);
    try {
      // Update country and unassign (since new country team should pick up)
      const { error } = await supabase
        .from("leads")
        .update({
          country: targetCountry as "dubai" | "india",
          assigned_to: null,
          assigned_at: null,
        })
        .in("id", leadIds);

      if (error) throw error;

      // Log activity for each lead
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const activities = leadIds.map((leadId) => ({
          lead_id: leadId,
          user_id: session.user.id,
          activity_type: "country_transfer",
          title: "Lead Transferred",
          description: `Transferred to ${targetCountry === "dubai" ? "🇦🇪 Dubai" : "🇮🇳 India"} branch${reason ? ": " + reason : ""}`,
          old_value: currentCountry || "none",
          new_value: targetCountry,
        }));

        await supabase.from("lead_activities").insert(activities);
      }

      toast.success(
        `${leadIds.length} lead${leadIds.length > 1 ? "s" : ""} transferred to ${
          targetCountry === "dubai" ? "Dubai" : "India"
        }`
      );
      onTransferComplete();
    } catch (error) {
      console.error("Transfer error:", error);
      toast.error("Failed to transfer lead(s)");
    } finally {
      setIsTransferring(false);
    }
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="outline" size={variant === "bulk" ? "sm" : "default"} className={variant === "bulk" ? "h-8 text-xs" : ""}>
          <ArrowRightLeft className="w-3.5 h-3.5 mr-1.5" />
          {variant === "bulk" ? "Transfer" : "Transfer to Branch"}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <ArrowRightLeft className="w-5 h-5" />
            Transfer {leadIds.length > 1 ? `${leadIds.length} Leads` : "Lead"} to Branch
          </AlertDialogTitle>
          <AlertDialogDescription>
            This will transfer the selected lead(s) to the target branch and unassign them so the new branch team can pick them up.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-4 py-2">
          <div className="flex items-center gap-3">
            <div className="flex-1 text-center p-3 rounded-lg bg-muted/50 border">
              <p className="text-xs text-muted-foreground mb-1">From</p>
              <p className="font-medium">
                {currentCountry === "dubai" ? "🇦🇪 Dubai" : currentCountry === "india" ? "🇮🇳 India" : "No Branch"}
              </p>
            </div>
            <ArrowRightLeft className="w-5 h-5 text-muted-foreground shrink-0" />
            <div className="flex-1">
              <Select value={targetCountry} onValueChange={setTargetCountry}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="dubai">🇦🇪 Dubai</SelectItem>
                  <SelectItem value="india">🇮🇳 India</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm">Reason (optional)</Label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Why is this lead being transferred?"
              className="min-h-[60px] resize-none"
            />
          </div>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleTransfer} disabled={isTransferring}>
            {isTransferring && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
            Transfer to {targetCountry === "dubai" ? "Dubai" : "India"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
