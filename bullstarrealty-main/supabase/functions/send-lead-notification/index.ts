import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") || "";

const allowedOrigins = [
  "https://bullstarrealty.ae",
  "https://www.bullstarrealty.ae",
  "http://localhost:5173",
  "http://localhost:8080",
];

function getCorsHeaders(req: Request) {
  const origin = req.headers.get("Origin") || "";
  const isAllowed = allowedOrigins.includes(origin);
  return {
    "Access-Control-Allow-Origin": isAllowed ? origin : allowedOrigins[0],
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-api-version, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  };
}

// Fixed admin emails - removed old ones, added vaibhav
const HARDCODED_ADMIN_EMAILS = [
  "support@bullstarrealty.ae",
  "shivendra.singh@bullrealtyglobal.com",
  "vaibhav@bullrealtyglobal.com",
];

interface NotificationPayload {
  type: "lead_created" | "lead_assigned" | "status_changed" | "note_added" | "followup_scheduled" | "followup_completed" | "meeting_scheduled";
  lead_id?: string;
  lead_name?: string;
  lead_email?: string;
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
  admin_emails?: string[];
  debug?: boolean;
  send_whatsapp?: boolean;
  // Meeting fields (camelCase from MeetingScheduler component)
  leadId?: string;
  leadName?: string;
  leadEmail?: string;
  leadPhone?: string;
  meetingTitle?: string;
  meetingDate?: string;
  meetingLocation?: string;
  meetingType?: string;
  notifyCustomer?: boolean;
  notifyAdmin?: boolean;
}

// Normalize payload - handle both snake_case and camelCase field names
function normalizePayload(raw: NotificationPayload): NotificationPayload {
  return {
    ...raw,
    lead_id: raw.lead_id || raw.leadId,
    lead_name: raw.lead_name || raw.leadName,
    lead_email: raw.lead_email || raw.leadEmail,
    lead_phone: raw.lead_phone || raw.leadPhone,
  };
}

const CRM_URL = "https://bullrealtyglobal.com/admin";

const getEmailTemplate = (payload: NotificationPayload): { subject: string; html: string } => {
  const baseStyle = `
    <style>
      body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f4; margin: 0; padding: 20px; }
      .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); }
      .header { background: linear-gradient(135deg, #D4AF37 0%, #B8860B 100%); color: #000; padding: 30px; text-align: center; }
      .header h1 { margin: 0; font-size: 24px; font-weight: 600; }
      .content { padding: 30px; }
      .lead-info { background: #f8f9fa; border-radius: 8px; padding: 20px; margin: 20px 0; }
      .lead-info h3 { margin: 0 0 15px 0; color: #333; font-size: 16px; }
      .info-row { display: flex; padding: 8px 0; border-bottom: 1px solid #eee; }
      .info-label { font-weight: 600; color: #666; width: 120px; }
      .info-value { color: #333; }
      .status-badge { display: inline-block; padding: 6px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; text-transform: uppercase; }
      .footer { background: #f8f9fa; padding: 20px; text-align: center; color: #666; font-size: 12px; }
      .cta-button { display: inline-block; background: #D4AF37; color: #000; padding: 12px 30px; border-radius: 6px; text-decoration: none; font-weight: 600; margin-top: 20px; }
    </style>
  `;

  const leadInfoBlock = `
    <div class="lead-info">
      <h3>📋 Lead Details</h3>
      <div class="info-row"><span class="info-label">Name:</span><span class="info-value">${payload.lead_name}</span></div>
      <div class="info-row"><span class="info-label">Email:</span><span class="info-value">${payload.lead_email}</span></div>
      ${payload.lead_phone ? `<div class="info-row"><span class="info-label">Phone:</span><span class="info-value">${payload.lead_phone}</span></div>` : ''}
      ${payload.lead_source ? `<div class="info-row"><span class="info-label">Source:</span><span class="info-value">${payload.lead_source}</span></div>` : ''}
      ${payload.lead_interest ? `<div class="info-row"><span class="info-label">Interest:</span><span class="info-value">${payload.lead_interest}</span></div>` : ''}
    </div>
  `;

  switch (payload.type) {
    case "lead_created":
      return {
        subject: `🎯 New Lead Captured: ${payload.lead_name}`,
        html: `<!DOCTYPE html><html><head>${baseStyle}</head><body>
          <div class="container">
            <div class="header"><h1>🎯 New Lead Captured!</h1></div>
            <div class="content">
              <p>A new lead has been captured from <strong>${payload.lead_source || 'Website'}</strong>.</p>
              ${payload.assigned_to_name ? `<p>📌 <strong>Assigned to:</strong> ${payload.assigned_to_name}</p>` : ''}
              ${leadInfoBlock}
              <p style="text-align: center;"><a href="${CRM_URL}?tab=leads" class="cta-button">View in CRM →</a></p>
            </div>
            <div class="footer"><p>Bull Star Realty CRM • Lead Management System</p></div>
          </div></body></html>`,
      };

    case "lead_assigned":
      return {
        subject: `📌 Lead Assigned to You: ${payload.lead_name}`,
        html: `<!DOCTYPE html><html><head>${baseStyle}</head><body>
          <div class="container">
            <div class="header"><h1>📌 Lead Assigned to You</h1></div>
            <div class="content">
              <p>Hi <strong>${payload.assigned_to_name || 'Team Member'}</strong>,</p>
              <p>A new lead has been assigned to you. Please follow up at your earliest convenience.</p>
              ${leadInfoBlock}
              <p style="text-align: center;"><a href="${CRM_URL}?tab=leads" class="cta-button">View Lead Details →</a></p>
            </div>
            <div class="footer"><p>Bull Star Realty CRM • Lead Management System</p></div>
          </div></body></html>`,
      };

    case "status_changed":
      return {
        subject: `🔄 Lead Status Updated: ${payload.lead_name} → ${payload.new_status?.replace('_', ' ').toUpperCase()}`,
        html: `<!DOCTYPE html><html><head>${baseStyle}</head><body>
          <div class="container">
            <div class="header"><h1>🔄 Lead Status Updated</h1></div>
            <div class="content">
              <p>The status for lead <strong>${payload.lead_name}</strong> has been changed.</p>
              <div style="text-align: center; margin: 20px 0;">
                <span class="status-badge" style="background: #e0e0e0; color: #616161;">${payload.old_status?.replace('_', ' ').toUpperCase()}</span>
                <span style="margin: 0 15px; font-size: 20px;">→</span>
                <span class="status-badge">${payload.new_status?.replace('_', ' ').toUpperCase()}</span>
              </div>
              ${leadInfoBlock}
              <p style="text-align: center;"><a href="${CRM_URL}?tab=leads" class="cta-button">View in CRM →</a></p>
            </div>
            <div class="footer"><p>Bull Star Realty CRM • Lead Management System</p></div>
          </div></body></html>`,
      };

    case "note_added":
      return {
        subject: `📝 Note Added: ${payload.lead_name}`,
        html: `<!DOCTYPE html><html><head>${baseStyle}</head><body>
          <div class="container">
            <div class="header"><h1>📝 Note Added to Lead</h1></div>
            <div class="content">
              <p>A new note has been added to lead <strong>${payload.lead_name}</strong>.</p>
              <div class="lead-info"><h3>Note Content</h3><p style="color: #333; line-height: 1.6;">${payload.note_content}</p></div>
              ${leadInfoBlock}
              <p style="text-align: center;"><a href="${CRM_URL}?tab=leads" class="cta-button">View in CRM →</a></p>
            </div>
            <div class="footer"><p>Bull Star Realty CRM • Lead Management System</p></div>
          </div></body></html>`,
      };

    case "followup_scheduled":
      return {
        subject: `⏰ Follow-up Scheduled: ${payload.lead_name}`,
        html: `<!DOCTYPE html><html><head>${baseStyle}</head><body>
          <div class="container">
            <div class="header"><h1>⏰ Follow-up Scheduled</h1></div>
            <div class="content">
              <p>A follow-up has been scheduled for lead <strong>${payload.lead_name}</strong>.</p>
              <div class="lead-info">
                <h3>📅 Follow-up Details</h3>
                <div class="info-row"><span class="info-label">Title:</span><span class="info-value">${payload.followup_title}</span></div>
                <div class="info-row"><span class="info-label">Date:</span><span class="info-value">${payload.followup_date}</span></div>
              </div>
              ${leadInfoBlock}
              <p style="text-align: center;"><a href="${CRM_URL}?tab=calendar" class="cta-button">View in CRM →</a></p>
            </div>
            <div class="footer"><p>Bull Star Realty CRM • Lead Management System</p></div>
          </div></body></html>`,
      };

    case "followup_completed":
      return {
        subject: `✅ Follow-up Completed: ${payload.lead_name}`,
        html: `<!DOCTYPE html><html><head>${baseStyle}</head><body>
          <div class="container">
            <div class="header"><h1>✅ Follow-up Completed</h1></div>
            <div class="content">
              <p>A follow-up has been marked as completed for lead <strong>${payload.lead_name}</strong>.</p>
              <div class="lead-info"><h3>Completed Task</h3><p style="color: #2e7d32; font-weight: 600;">${payload.followup_title}</p></div>
              ${leadInfoBlock}
              <p style="text-align: center;"><a href="${CRM_URL}?tab=leads" class="cta-button">View in CRM →</a></p>
            </div>
            <div class="footer"><p>Bull Star Realty CRM • Lead Management System</p></div>
          </div></body></html>`,
      };

    case "meeting_scheduled":
      return {
        subject: `📅 Meeting Scheduled: ${payload.meetingTitle || payload.lead_name}`,
        html: `<!DOCTYPE html><html><head>${baseStyle}</head><body>
          <div class="container">
            <div class="header"><h1>📅 Meeting Scheduled</h1></div>
            <div class="content">
              <p>A meeting has been scheduled regarding lead <strong>${payload.lead_name}</strong>.</p>
              <div class="lead-info">
                <h3>📋 Meeting Details</h3>
                <div class="info-row"><span class="info-label">Title:</span><span class="info-value">${payload.meetingTitle}</span></div>
                <div class="info-row"><span class="info-label">Date/Time:</span><span class="info-value">${payload.meetingDate}</span></div>
                <div class="info-row"><span class="info-label">Location:</span><span class="info-value">${payload.meetingLocation || 'To be confirmed'}</span></div>
                <div class="info-row"><span class="info-label">Type:</span><span class="info-value">${(payload.meetingType || 'in_person').replace('_', ' ')}</span></div>
              </div>
              ${leadInfoBlock}
              <p style="text-align: center;"><a href="${CRM_URL}?tab=leads" class="cta-button">View in CRM →</a></p>
            </div>
            <div class="footer"><p>Bull Star Realty CRM • Lead Management System</p></div>
          </div></body></html>`,
      };

    default:
      return {
        subject: `Lead Activity: ${payload.lead_name}`,
        html: `<p>Activity recorded for lead ${payload.lead_name}</p>`,
      };
  }
};

// Customer-specific meeting email
const getCustomerMeetingEmail = (payload: NotificationPayload): { subject: string; html: string } => {
  return {
    subject: `Meeting Confirmation - Bull Star Realty`,
    html: `<!DOCTYPE html><html><head>
      <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f4; margin: 0; padding: 20px; }
        .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); }
        .header { background: linear-gradient(135deg, #D4AF37 0%, #B8860B 100%); color: #000; padding: 30px; text-align: center; }
        .header h1 { margin: 0; font-size: 24px; font-weight: 600; }
        .content { padding: 30px; }
        .meeting-box { background: #f8f9fa; border-radius: 8px; padding: 20px; margin: 20px 0; border-left: 4px solid #D4AF37; }
        .info-row { padding: 8px 0; border-bottom: 1px solid #eee; }
        .info-label { font-weight: 600; color: #666; }
        .info-value { color: #333; }
        .footer { background: #f8f9fa; padding: 20px; text-align: center; color: #666; font-size: 12px; }
      </style>
    </head><body>
      <div class="container">
        <div class="header"><h1>📅 Meeting Confirmation</h1></div>
        <div class="content">
          <p>Dear <strong>${payload.lead_name}</strong>,</p>
          <p>We are pleased to confirm your upcoming meeting with Bull Star Realty.</p>
          <div class="meeting-box">
            <h3 style="margin: 0 0 15px 0;">Meeting Details</h3>
            <div class="info-row"><span class="info-label">📋 Subject:</span> <span class="info-value">${payload.meetingTitle}</span></div>
            <div class="info-row"><span class="info-label">🕐 Date & Time:</span> <span class="info-value">${payload.meetingDate}</span></div>
            <div class="info-row"><span class="info-label">📍 Location:</span> <span class="info-value">${payload.meetingLocation || 'To be confirmed'}</span></div>
          </div>
          <p>If you need to reschedule, please contact us at <a href="tel:+971545304304">+971 545 304 304</a> or reply to this email.</p>
          <p>We look forward to meeting you!</p>
          <p>Best regards,<br><strong>Bull Star Realty Team</strong></p>
        </div>
        <div class="footer">
          <p>Bull Star Realty • Premium Real Estate Services</p>
          <p>📞 +971 545 304 304 | ✉️ support@bullstarrealty.ae</p>
        </div>
      </div>
    </body></html>`,
  };
};

const getWhatsAppMessage = (payload: NotificationPayload): string => {
  const leadInfo = `*${payload.lead_name}*\n📧 ${payload.lead_email}${payload.lead_phone ? `\n📞 ${payload.lead_phone}` : ''}${payload.lead_source ? `\n📍 Source: ${payload.lead_source}` : ''}`;
  
  switch (payload.type) {
    case "lead_created":
      return `🎯 *New Lead Captured!*\n\n${leadInfo}\n\n${payload.assigned_to_name ? `👤 Assigned to: ${payload.assigned_to_name}` : ''}`;
    case "lead_assigned":
      return `📌 *Lead Assigned*\n\n${leadInfo}\n\n👤 Assigned to: ${payload.assigned_to_name || 'Team Member'}`;
    case "status_changed":
      return `🔄 *Lead Status Updated*\n\n${leadInfo}\n\n${payload.old_status?.toUpperCase()} → ${payload.new_status?.toUpperCase()}`;
    case "meeting_scheduled":
      return `📅 *Meeting Scheduled*\n\n${leadInfo}\n\n📋 ${payload.meetingTitle}\n🕐 ${payload.meetingDate}\n📍 ${payload.meetingLocation || 'TBD'}`;
    case "followup_scheduled":
      return `⏰ *Follow-up Scheduled*\n\n${leadInfo}\n\n📋 ${payload.followup_title}\n🕐 ${payload.followup_date}`;
    default:
      return `📢 *Lead Activity*\n\n${leadInfo}`;
  }
};

// Customer WhatsApp meeting message
const getCustomerWhatsAppMessage = (payload: NotificationPayload): string => {
  return `📅 *Meeting Confirmation - Bull Star Realty*\n\nDear ${payload.lead_name},\n\nYour meeting has been scheduled:\n\n📋 ${payload.meetingTitle}\n🕐 ${payload.meetingDate}\n📍 ${payload.meetingLocation || 'To be confirmed'}\n\nFor any changes, contact us at +971 545 304 304.\n\nBest regards,\nBull Star Realty Team`;
};

async function sendWhatsAppMessage(whatsappSettings: any, phone: string, message: string) {
  const cleanPhone = phone.replace(/[^0-9]/g, "");
  if (!cleanPhone) return { phone, status: "invalid_number" };

  if (whatsappSettings.api_url && whatsappSettings.api_key) {
    try {
      const waResp = await fetch(whatsappSettings.api_url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${whatsappSettings.api_key}`,
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: cleanPhone,
          type: "text",
          text: { body: message },
        }),
      });
      return { phone: cleanPhone, status: waResp.ok ? "sent" : "failed" };
    } catch (e) {
      console.warn("WhatsApp send failed for", phone, e);
      return { phone, status: "error" };
    }
  } else {
    console.log(`WhatsApp API not configured. Would send to ${cleanPhone}: ${message}`);
    return { phone: cleanPhone, status: "skipped_no_api" };
  }
}

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const url = new URL(req.url);
    const rawPayload: NotificationPayload = await req.json();
    const payload = normalizePayload(rawPayload);
    const debug = url.searchParams.get("debug") === "1" || payload.debug === true;
    
    console.log("Received notification payload:", payload);

    // Get notification settings from database
    const { data: settings } = await supabase
      .from("notification_settings")
      .select("setting_key, setting_value, is_active")
      .in("setting_key", ["email_notifications", "notification_recipients", "whatsapp_notifications"]);

    const emailConfig = settings?.find(s => s.setting_key === "email_notifications");
    const recipientConfig = settings?.find(s => s.setting_key === "notification_recipients");
    const whatsappConfig = settings?.find(s => s.setting_key === "whatsapp_notifications");

    const emailSettings = emailConfig?.setting_value as { enabled: boolean; from_email: string; from_name: string } | undefined;
    // For meetings, always send even if general notifications are disabled
    if (!emailSettings?.enabled && payload.type !== "meeting_scheduled") {
      console.log("Email notifications are disabled");
      return new Response(
        JSON.stringify({ success: true, message: "Email notifications disabled" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const recipientSettings = recipientConfig?.setting_value as {
      admin_emails: string[];
      manager_emails: string[];
      notify_on_new_lead: boolean;
      notify_on_assignment: boolean;
      notify_on_status_change: boolean;
      notify_on_note_added: boolean;
      notify_on_followup: boolean;
    } | undefined;

    // Check if this notification type should be sent (meetings always go through)
    if (payload.type !== "meeting_scheduled") {
      const shouldNotify: Record<string, boolean> = {
        lead_created: recipientSettings?.notify_on_new_lead ?? true,
        lead_assigned: recipientSettings?.notify_on_assignment ?? true,
        status_changed: recipientSettings?.notify_on_status_change ?? true,
        note_added: recipientSettings?.notify_on_note_added ?? false,
        followup_scheduled: recipientSettings?.notify_on_followup ?? true,
        followup_completed: recipientSettings?.notify_on_followup ?? true,
      };

      if (!shouldNotify[payload.type]) {
        console.log(`Notifications for ${payload.type} are disabled`);
        return new Response(
          JSON.stringify({ success: true, message: `Notifications for ${payload.type} disabled` }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Use hardcoded admin emails + any configured ones (filtering out old ones)
    const configuredAdminEmails = (recipientSettings?.admin_emails || []).filter(
      (e: string) => e !== "admin.india@bullstarrealty.in" && e !== "admin.dubai@bullstarrealty.ae"
    );
    const allAdminEmails = [...HARDCODED_ADMIN_EMAILS, ...configuredAdminEmails];

    // Get manager emails
    const { data: managerRoles } = await supabase
      .from("user_roles")
      .select("user_id")
      .eq("role", "manager");

    const managerUserIds = managerRoles?.map((r) => r.user_id) || [];
    let managerEmails: string[] = [];
    if (managerUserIds.length > 0) {
      const { data: managerProfiles } = await supabase
        .from("profiles")
        .select("email")
        .in("user_id", managerUserIds);
      managerEmails = managerProfiles?.map((p) => p.email).filter(Boolean) as string[] || [];
    }
    const configuredManagerEmails = (recipientSettings?.manager_emails || []).filter(
      (e: string) => e !== "admin.india@bullstarrealty.in" && e !== "admin.dubai@bullstarrealty.ae"
    );

    // === DETERMINE RECIPIENTS ===
    let recipients: string[] = [];

    switch (payload.type) {
      case "lead_created":
        recipients = [...allAdminEmails];
        if (payload.assigned_to_email) recipients.push(payload.assigned_to_email);
        break;
        
      case "lead_assigned":
        recipients = [...allAdminEmails];
        if (payload.assigned_to_email) recipients.push(payload.assigned_to_email);
        break;

      case "meeting_scheduled":
        // Admins + managers + assigned person (customer handled separately below)
        recipients = [...allAdminEmails, ...managerEmails, ...configuredManagerEmails];
        if (payload.assigned_to_email) recipients.push(payload.assigned_to_email);
        break;
        
      case "status_changed":
      case "followup_scheduled":
      case "followup_completed":
      case "note_added":
        recipients = [...allAdminEmails];
        if (payload.assigned_to_email) recipients.push(payload.assigned_to_email);
        break;
        
      default:
        recipients = [...allAdminEmails];
    }

    // Remove duplicates, empty strings, and old admin emails
    recipients = [...new Set(recipients.filter(e => 
      e && e.trim() && 
      e !== "admin.india@bullstarrealty.in" && 
      e !== "admin.dubai@bullstarrealty.ae"
    ))];

    console.log("Sending to recipients:", recipients);

    const { subject, html } = getEmailTemplate(payload);
    const fromEmail = emailSettings?.from_email || "notifications@bullstarrealty.ae";
    const fromName = emailSettings?.from_name || "Bull Star Realty CRM";

    // Send internal team email
    let emailResponse: any = { data: null, error: null };
    if (recipients.length > 0) {
      emailResponse = await resend.emails.send({
        from: `${fromName} <${fromEmail}>`,
        to: recipients,
        subject,
        html,
      });
      console.log("Email sent successfully:", emailResponse);
    }

    // === MEETING: Send customer notification (email + WhatsApp) ===
    let customerEmailResult: any = null;
    let customerWhatsAppResult: any = null;

    if (payload.type === "meeting_scheduled") {
      // Send customer email - use normalized lead_email
      if (payload.notifyCustomer !== false && payload.lead_email) {
        try {
          const customerEmail = getCustomerMeetingEmail(payload);
          customerEmailResult = await resend.emails.send({
            from: `Bull Star Realty <${fromEmail}>`,
            to: [payload.lead_email],
            subject: customerEmail.subject,
            html: customerEmail.html,
          });
          console.log("Customer meeting email sent:", customerEmailResult);
        } catch (e) {
          console.warn("Failed to send customer meeting email:", e);
        }
      }

      // Send customer WhatsApp
      const whatsappSettings = whatsappConfig?.setting_value as any;
      if (payload.notifyCustomer !== false && payload.lead_phone && whatsappSettings?.enabled) {
        const customerMsg = getCustomerWhatsAppMessage(payload);
        customerWhatsAppResult = await sendWhatsAppMessage(whatsappSettings, payload.lead_phone, customerMsg);
        console.log("Customer WhatsApp result:", customerWhatsAppResult);
      }
    }

    // === Send WhatsApp to team/admin (for all notification types) ===
    const whatsappSettings = whatsappConfig?.setting_value as {
      enabled: boolean;
      api_url: string;
      api_key: string;
      phone_number_id: string;
      team_phones: string[];
      admin_phones: string[];
    } | undefined;

    let whatsappResults: any[] = [];
    if (whatsappSettings?.enabled && (payload.send_whatsapp !== false)) {
      const whatsappMessage = getWhatsAppMessage(payload);
      
      let phonesToNotify: string[] = [];
      if (payload.type === "lead_assigned" || payload.type === "lead_created") {
        phonesToNotify = [...(whatsappSettings.admin_phones || [])];
      } else if (payload.type === "meeting_scheduled") {
        phonesToNotify = [
          ...(whatsappSettings.admin_phones || []),
          ...(whatsappSettings.team_phones || []),
        ];
      } else {
        phonesToNotify = [...(whatsappSettings.admin_phones || [])];
      }

      const uniquePhones = [...new Set(phonesToNotify.filter(Boolean))];
      for (const phone of uniquePhones) {
        const result = await sendWhatsAppMessage(whatsappSettings, phone, whatsappMessage);
        whatsappResults.push(result);
      }
    }

    // Log outbound attempt
    try {
      const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
      await supabase.from("integration_logs").insert({
        integration_id: crypto.randomUUID(),
        integration_type: "resend_email",
        source: "custom",
        status: emailResponse.error ? "error" : "sent",
        ip_address: ip,
        lead_id: payload.lead_id ?? null,
        request_payload: payload,
        response_payload: { email: emailResponse, whatsapp: whatsappResults, customerEmail: customerEmailResult, customerWhatsApp: customerWhatsAppResult },
        error_message: (emailResponse as any)?.error?.message ?? null,
      });
    } catch (logErr) {
      console.warn("Failed to write integration log:", logErr);
    }

    // Optional delivery status fetch (admin debug)
    let emailDetails: unknown = undefined;
    const emailId = (emailResponse as any)?.data?.id as string | undefined;
    if (debug && emailId && RESEND_API_KEY) {
      try {
        const detailsResp = await fetch(`https://api.resend.com/emails/${emailId}`, {
          method: "GET",
          headers: { Authorization: `Bearer ${RESEND_API_KEY}` },
        });
        if (detailsResp.ok) emailDetails = await detailsResp.json();
      } catch (e) {
        console.warn("Could not fetch email details:", e);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Notification sent to ${recipients.length} recipient(s)`,
        recipients,
        whatsapp_sent: whatsappResults.length,
        customer_notified: payload.type === "meeting_scheduled" ? { email: !!customerEmailResult, whatsapp: !!customerWhatsAppResult } : undefined,
        ...(debug ? { emailResponse, emailDetails, whatsappResults } : {}),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error sending notification:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
