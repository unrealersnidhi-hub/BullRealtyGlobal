import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { CalendarIcon, Clock, Loader2, MapPin, Video, Users, Send } from "lucide-react";

interface MeetingSchedulerProps {
  leadId: string;
  leadName: string;
  leadEmail: string;
  leadPhone?: string | null;
  followUpId?: string;
  onScheduled?: () => void;
  onCancel?: () => void;
}

export const MeetingScheduler = ({
  leadId,
  leadName,
  leadEmail,
  leadPhone,
  followUpId,
  onScheduled,
  onCancel,
}: MeetingSchedulerProps) => {
  const [title, setTitle] = useState(`Meeting with ${leadName}`);
  const [description, setDescription] = useState("");
  const [date, setDate] = useState<Date | undefined>();
  const [time, setTime] = useState("10:00");
  const [duration, setDuration] = useState("30");
  const [location, setLocation] = useState("");
  const [meetingType, setMeetingType] = useState("in_person");
  const [notifyCustomer, setNotifyCustomer] = useState(true);
  const [notifyAdmin, setNotifyAdmin] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const handleSchedule = async () => {
    if (!date || !title.trim()) {
      toast.error("Title and date are required");
      return;
    }

    setIsSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const [hours, minutes] = time.split(":").map(Number);
      const scheduledAt = new Date(date);
      scheduledAt.setHours(hours, minutes, 0, 0);

      const { error } = await supabase.from("meetings").insert({
        lead_id: leadId,
        follow_up_id: followUpId || null,
        title: title.trim(),
        description: description.trim() || null,
        scheduled_at: scheduledAt.toISOString(),
        duration_minutes: parseInt(duration),
        location: location.trim() || null,
        meeting_type: meetingType,
        created_by: session.user.id,
        notify_customer: notifyCustomer,
        notify_admin: notifyAdmin,
      });

      if (error) throw error;

      // Send notification via edge function
      if (notifyCustomer || notifyAdmin) {
        try {
          await supabase.functions.invoke("send-lead-notification", {
            body: {
              type: "meeting_scheduled",
              leadId,
              leadName,
              leadEmail,
              leadPhone,
              meetingTitle: title.trim(),
              meetingDate: format(scheduledAt, "EEEE, MMMM d, yyyy 'at' h:mm a"),
              meetingLocation: location.trim() || meetingType,
              notifyCustomer,
              notifyAdmin,
            },
          });
        } catch (e) {
          console.warn("Meeting notification failed:", e);
        }
      }

      toast.success("Meeting scheduled successfully");
      onScheduled?.();
    } catch (e) {
      console.error("Error scheduling meeting:", e);
      toast.error("Failed to schedule meeting");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-3 p-3 sm:p-4 rounded-lg border border-border bg-muted/30">
      <h4 className="text-sm font-semibold flex items-center gap-2">
        <CalendarIcon className="w-4 h-4 text-[hsl(var(--gold))]" />
        Schedule Meeting
      </h4>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1.5 sm:col-span-2">
          <Label className="text-xs">Title</Label>
          <Input value={title} onChange={e => setTitle(e.target.value)} className="text-sm" />
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs">Date</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className={cn("w-full justify-start text-left text-sm", !date && "text-muted-foreground")}>
                <CalendarIcon className="mr-2 h-4 w-4" />
                {date ? format(date, "PPP") : "Pick date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={date}
                onSelect={setDate}
                disabled={d => d < new Date(new Date().setHours(0, 0, 0, 0))}
                initialFocus
                className="p-3 pointer-events-auto"
              />
            </PopoverContent>
          </Popover>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs">Time & Duration</Label>
          <div className="flex gap-2">
            <div className="flex items-center gap-1.5 flex-1">
              <Clock className="w-3.5 h-3.5 text-muted-foreground" />
              <Input type="time" value={time} onChange={e => setTime(e.target.value)} className="text-sm" />
            </div>
            <Select value={duration} onValueChange={setDuration}>
              <SelectTrigger className="w-[100px] text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="15">15 min</SelectItem>
                <SelectItem value="30">30 min</SelectItem>
                <SelectItem value="45">45 min</SelectItem>
                <SelectItem value="60">1 hour</SelectItem>
                <SelectItem value="90">1.5 hrs</SelectItem>
                <SelectItem value="120">2 hrs</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs">Meeting Type</Label>
          <Select value={meetingType} onValueChange={setMeetingType}>
            <SelectTrigger className="text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="in_person">
                <span className="flex items-center gap-1.5"><Users className="w-3.5 h-3.5" /> In Person</span>
              </SelectItem>
              <SelectItem value="video_call">
                <span className="flex items-center gap-1.5"><Video className="w-3.5 h-3.5" /> Video Call</span>
              </SelectItem>
              <SelectItem value="phone_call">
                <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> Phone Call</span>
              </SelectItem>
              <SelectItem value="site_visit">
                <span className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" /> Site Visit</span>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs">Location</Label>
          <div className="flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-muted-foreground" />
            <Input value={location} onChange={e => setLocation(e.target.value)} placeholder="Office / Address / Link" className="text-sm" />
          </div>
        </div>

        <div className="sm:col-span-2 space-y-1.5">
          <Label className="text-xs">Notes</Label>
          <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Meeting agenda..." className="min-h-[60px] resize-none text-sm" />
        </div>

        <div className="sm:col-span-2 flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Switch checked={notifyCustomer} onCheckedChange={setNotifyCustomer} id="notify-customer" />
            <Label htmlFor="notify-customer" className="text-xs cursor-pointer">Notify Customer (Email/WhatsApp)</Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={notifyAdmin} onCheckedChange={setNotifyAdmin} id="notify-admin" />
            <Label htmlFor="notify-admin" className="text-xs cursor-pointer">Notify Admin & Manager</Label>
          </div>
        </div>
      </div>

      <div className="flex gap-2 pt-1">
        {onCancel && <Button variant="outline" onClick={onCancel} className="flex-1 text-sm">Cancel</Button>}
        <Button onClick={handleSchedule} disabled={isSaving || !date || !title.trim()} className="flex-1 text-sm">
          {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}
          Schedule Meeting
        </Button>
      </div>
    </div>
  );
};
