import { supabase } from "@/integrations/supabase/client";

type NotificationType = 
  | "lead_created" 
  | "lead_assigned" 
  | "status_changed" 
  | "note_added" 
  | "followup_scheduled" 
  | "followup_completed";

interface NotificationPayload {
  type: NotificationType;
  lead_id: string;
  lead_name: string;
  lead_email: string;
  lead_phone?: string;
  lead_source?: string;
  lead_interest?: string;
  assigned_to_email?: string;
  assigned_to_name?: string;
  old_status?: string;
  new_status?: string;
  note_content?: string;
  followup_title?: string;
  followup_date?: string;
}

const NOTIFICATION_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-lead-notification`;

export async function sendLeadNotification(payload: NotificationPayload): Promise<void> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    
    const response = await fetch(NOTIFICATION_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session?.access_token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      console.error("Failed to send notification:", await response.text());
    }
  } catch (error) {
    console.error("Notification error:", error);
    // Don't throw - notifications should not block main operations
  }
}

export function useLeadNotifications() {
  const notifyLeadAssigned = async (
    leadId: string,
    leadName: string,
    leadEmail: string,
    assignedToUserId: string,
    leadPhone?: string,
    leadSource?: string,
    leadInterest?: string
  ) => {
    // Get assignee details
    const { data: profile } = await supabase
      .from("profiles")
      .select("email, full_name")
      .eq("user_id", assignedToUserId)
      .single();

    await sendLeadNotification({
      type: "lead_assigned",
      lead_id: leadId,
      lead_name: leadName,
      lead_email: leadEmail,
      lead_phone: leadPhone,
      lead_source: leadSource,
      lead_interest: leadInterest,
      assigned_to_email: profile?.email || undefined,
      assigned_to_name: profile?.full_name || undefined,
    });
  };

  const notifyStatusChanged = async (
    leadId: string,
    leadName: string,
    leadEmail: string,
    oldStatus: string,
    newStatus: string,
    assignedToUserId?: string,
    leadPhone?: string
  ) => {
    let assignedToEmail: string | undefined;
    let assignedToName: string | undefined;

    if (assignedToUserId) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("email, full_name")
        .eq("user_id", assignedToUserId)
        .single();
      
      assignedToEmail = profile?.email || undefined;
      assignedToName = profile?.full_name || undefined;
    }

    await sendLeadNotification({
      type: "status_changed",
      lead_id: leadId,
      lead_name: leadName,
      lead_email: leadEmail,
      lead_phone: leadPhone,
      old_status: oldStatus,
      new_status: newStatus,
      assigned_to_email: assignedToEmail,
      assigned_to_name: assignedToName,
    });
  };

  const notifyNoteAdded = async (
    leadId: string,
    leadName: string,
    leadEmail: string,
    noteContent: string,
    assignedToUserId?: string
  ) => {
    let assignedToEmail: string | undefined;

    if (assignedToUserId) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("email")
        .eq("user_id", assignedToUserId)
        .single();
      
      assignedToEmail = profile?.email || undefined;
    }

    await sendLeadNotification({
      type: "note_added",
      lead_id: leadId,
      lead_name: leadName,
      lead_email: leadEmail,
      note_content: noteContent,
      assigned_to_email: assignedToEmail,
    });
  };

  const notifyFollowupScheduled = async (
    leadId: string,
    leadName: string,
    leadEmail: string,
    followupTitle: string,
    followupDate: string,
    assignedToUserId?: string
  ) => {
    let assignedToEmail: string | undefined;

    if (assignedToUserId) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("email")
        .eq("user_id", assignedToUserId)
        .single();
      
      assignedToEmail = profile?.email || undefined;
    }

    await sendLeadNotification({
      type: "followup_scheduled",
      lead_id: leadId,
      lead_name: leadName,
      lead_email: leadEmail,
      followup_title: followupTitle,
      followup_date: followupDate,
      assigned_to_email: assignedToEmail,
    });
  };

  const notifyFollowupCompleted = async (
    leadId: string,
    leadName: string,
    leadEmail: string,
    followupTitle: string,
    assignedToUserId?: string
  ) => {
    let assignedToEmail: string | undefined;

    if (assignedToUserId) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("email")
        .eq("user_id", assignedToUserId)
        .single();
      
      assignedToEmail = profile?.email || undefined;
    }

    await sendLeadNotification({
      type: "followup_completed",
      lead_id: leadId,
      lead_name: leadName,
      lead_email: leadEmail,
      followup_title: followupTitle,
      assigned_to_email: assignedToEmail,
    });
  };

  return {
    notifyLeadAssigned,
    notifyStatusChanged,
    notifyNoteAdded,
    notifyFollowupScheduled,
    notifyFollowupCompleted,
  };
}
