 import { useState } from "react";
 import { supabase } from "@/integrations/supabase/client";
 import { Button } from "@/components/ui/button";
 import { Textarea } from "@/components/ui/textarea";
 import { Label } from "@/components/ui/label";
 import { Input } from "@/components/ui/input";
 import {
   Select,
   SelectContent,
   SelectItem,
   SelectTrigger,
   SelectValue,
 } from "@/components/ui/select";
 import { toast } from "sonner";
 import { Loader2, Phone, Calendar } from "lucide-react";
 
 type CallOutcome =
   | "answered"
   | "not_answered"
   | "busy"
   | "voicemail"
   | "wrong_number"
   | "callback_scheduled"
   | "not_reachable"
   | "call_dropped";
 
 interface CallLogFormProps {
   leadId: string;
   leadName: string;
   onSuccess?: () => void;
   onCancel?: () => void;
 }
 
 const outcomeLabels: Record<CallOutcome, string> = {
   answered: "Answered",
   not_answered: "Not Answered",
   busy: "Busy",
   voicemail: "Voicemail",
   wrong_number: "Wrong Number",
   callback_scheduled: "Callback Scheduled",
   not_reachable: "Not Reachable",
   call_dropped: "Call Dropped",
 };
 
 const outcomeColors: Record<CallOutcome, string> = {
   answered: "text-green-600",
   not_answered: "text-red-500",
   busy: "text-amber-500",
   voicemail: "text-blue-500",
   wrong_number: "text-gray-500",
   callback_scheduled: "text-purple-500",
   not_reachable: "text-orange-500",
   call_dropped: "text-red-400",
 };
 
 export const CallLogForm = ({
   leadId,
   leadName,
   onSuccess,
   onCancel,
 }: CallLogFormProps) => {
   const [isSubmitting, setIsSubmitting] = useState(false);
   const [outcome, setOutcome] = useState<CallOutcome | "">("");
   const [duration, setDuration] = useState("");
   const [notes, setNotes] = useState("");
   const [callbackDate, setCallbackDate] = useState("");
   const [callbackTime, setCallbackTime] = useState("");
 
   const handleSubmit = async () => {
     if (!outcome) {
       toast.error("Please select a call outcome");
       return;
     }
 
     setIsSubmitting(true);
     try {
       const { data: session } = await supabase.auth.getSession();
       if (!session.session) {
         toast.error("You must be logged in");
         return;
       }
 
       let callbackScheduledAt: string | null = null;
       if (outcome === "callback_scheduled" && callbackDate && callbackTime) {
         callbackScheduledAt = new Date(`${callbackDate}T${callbackTime}`).toISOString();
       }
 
       const { error } = await supabase.from("call_logs").insert({
         lead_id: leadId,
         user_id: session.session.user.id,
         outcome: outcome,
         duration_seconds: duration ? parseInt(duration) * 60 : 0,
         notes: notes || null,
         callback_scheduled_at: callbackScheduledAt,
       });
 
       if (error) throw error;
 
       toast.success("Call logged successfully");
       setOutcome("");
       setDuration("");
       setNotes("");
       setCallbackDate("");
       setCallbackTime("");
       onSuccess?.();
     } catch (error: any) {
       console.error("Error logging call:", error);
       toast.error(error.message || "Failed to log call");
     } finally {
       setIsSubmitting(false);
     }
   };
 
   return (
     <div className="space-y-4">
       <div className="flex items-center gap-2 pb-2 border-b border-border">
         <Phone className="w-4 h-4 text-muted-foreground" />
         <span className="text-sm font-medium">Log Call for {leadName}</span>
       </div>
 
       <div className="grid gap-4">
         <div>
           <Label>Call Outcome *</Label>
           <Select value={outcome} onValueChange={(v) => setOutcome(v as CallOutcome)}>
             <SelectTrigger className="mt-1.5">
               <SelectValue placeholder="Select outcome..." />
             </SelectTrigger>
             <SelectContent>
               {(Object.keys(outcomeLabels) as CallOutcome[]).map((key) => (
                 <SelectItem key={key} value={key}>
                   <span className={outcomeColors[key]}>{outcomeLabels[key]}</span>
                 </SelectItem>
               ))}
             </SelectContent>
           </Select>
         </div>
 
         <div>
           <Label>Duration (minutes)</Label>
           <Input
             type="number"
             min="0"
             value={duration}
             onChange={(e) => setDuration(e.target.value)}
             placeholder="e.g., 5"
             className="mt-1.5"
           />
         </div>
 
         {outcome === "callback_scheduled" && (
           <div className="grid grid-cols-2 gap-3">
             <div>
               <Label>Callback Date</Label>
               <Input
                 type="date"
                 value={callbackDate}
                 onChange={(e) => setCallbackDate(e.target.value)}
                 className="mt-1.5"
               />
             </div>
             <div>
               <Label>Callback Time</Label>
               <Input
                 type="time"
                 value={callbackTime}
                 onChange={(e) => setCallbackTime(e.target.value)}
                 className="mt-1.5"
               />
             </div>
           </div>
         )}
 
         <div>
           <Label>Notes</Label>
           <Textarea
             value={notes}
             onChange={(e) => setNotes(e.target.value)}
             placeholder="Add any notes about the call..."
             rows={3}
             className="mt-1.5"
           />
         </div>
       </div>
 
       <div className="flex justify-end gap-2 pt-2">
         {onCancel && (
           <Button variant="outline" onClick={onCancel} disabled={isSubmitting}>
             Cancel
           </Button>
         )}
         <Button onClick={handleSubmit} disabled={isSubmitting || !outcome}>
           {isSubmitting ? (
             <Loader2 className="w-4 h-4 mr-2 animate-spin" />
           ) : (
             <Phone className="w-4 h-4 mr-2" />
           )}
           Log Call
         </Button>
       </div>
     </div>
   );
 };
 
 export { outcomeLabels, outcomeColors };
 export type { CallOutcome };