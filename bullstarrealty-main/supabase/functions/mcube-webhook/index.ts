import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const sanitizePhone = (value: unknown) => String(value ?? "").replace(/[^\d]/g, "");
    const pick = (obj: Record<string, unknown>, keys: string[]) => {
      for (const key of keys) {
        const value = obj[key];
        if (value !== undefined && value !== null && String(value).trim() !== "") {
          return value;
        }
      }
      return null;
    };
    const parseTimestamp = (value: unknown): string | null => {
      if (value === undefined || value === null || value === "") return null;
      const raw = String(value).trim();
      if (/^\d+$/.test(raw)) {
        const numeric = Number(raw);
        const asMs = raw.length === 10 ? numeric * 1000 : numeric;
        const fromEpoch = new Date(asMs);
        if (!Number.isNaN(fromEpoch.getTime())) return fromEpoch.toISOString();
      }
      const parsed = new Date(raw);
      return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
    };
    const normalizeDialStatus = (value: unknown) => {
      const raw = String(value ?? "").trim();
      const lower = raw.toLowerCase();
      if (!lower) return null;
      if (["answer", "answered", "connected"].includes(lower)) return "ANSWER";
      if (["busy", "executive busy"].includes(lower)) return "Busy";
      if (["cancel", "cancelled", "canceled"].includes(lower)) return "CANCEL";
      if (["noanswer", "no answer", "not answered", "no_answer"].includes(lower)) return "NoAnswer";
      if (["initiated", "ringing", "queued"].includes(lower)) return "INITIATED";
      return raw;
    };

    const contentType = req.headers.get("content-type") || "";
    const rawBody = await req.text();
    let payload: Record<string, unknown> = {};
    if (rawBody) {
      if (contentType.includes("application/json")) {
        payload = JSON.parse(rawBody);
      } else if (
        contentType.includes("application/x-www-form-urlencoded") ||
        contentType.includes("multipart/form-data")
      ) {
        payload = Object.fromEntries(new URLSearchParams(rawBody).entries());
      } else {
        try {
          payload = JSON.parse(rawBody);
        } catch {
          payload = Object.fromEntries(new URLSearchParams(rawBody).entries());
        }
      }
    }

    console.log("MCube webhook received:", JSON.stringify(payload));

    const callid = String(pick(payload, ["callid", "call_id", "callId", "uuid"]) ?? "");
    const directionRaw = String(pick(payload, ["direction", "call_direction", "type"]) ?? "inbound").toLowerCase();
    const direction = ["outbound", "out", "clicktocall"].includes(directionRaw) ? "outbound" : "inbound";
    const empPhone = String(pick(payload, ["emp_phone", "exenumber", "agent_phone", "agentnumber"]) ?? "");
    const agentName = String(pick(payload, ["agentname", "agent_name", "executive_name"]) ?? "");
    const dialStatus = normalizeDialStatus(pick(payload, ["dialstatus", "dial_status", "status", "call_status"]));
    const recordingUrl = String(pick(payload, ["filename", "recording_url", "recording"]) ?? "");
    const startTimeIso = parseTimestamp(pick(payload, ["starttime", "start_time", "start"]));
    const endTimeIso = parseTimestamp(pick(payload, ["endtime", "end_time", "end"]));
    const answeredTimeIso = parseTimestamp(pick(payload, ["answeredtime", "answered_time", "answer_time"]));
    const disconnectedBy = String(pick(payload, ["disconnectedby", "disconnected_by", "hangup_by"]) ?? "");
    const groupName = String(pick(payload, ["groupname", "group_name"]) ?? "");
    const didNumber = String(pick(payload, ["clicktocalldid", "did", "did_number"]) ?? "");

    const inboundCustomer = pick(payload, ["callfrom", "callerid", "from", "customer_phone", "customer"]);
    const outboundCustomer = pick(payload, ["callto", "custnumber", "to", "customer_phone", "customer"]);
    const customerPhoneRaw = direction === "outbound" ? outboundCustomer : inboundCustomer;
    const customerPhone = sanitizePhone(customerPhoneRaw);
    const agentPhone = sanitizePhone(empPhone);

    if (!callid) {
      return new Response(JSON.stringify({ error: "Missing callid" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Calculate duration in seconds from start/end time
    let durationSeconds = 0;
    if (startTimeIso && endTimeIso) {
      const start = new Date(startTimeIso);
      const end = new Date(endTimeIso);
      durationSeconds = Math.max(0, Math.floor((end.getTime() - start.getTime()) / 1000));
    }

    // Try to match lead by phone number
    let matchedLeadId = null;
    let matchedUserId = null;

    if (customerPhone) {
      const phoneVariants = Array.from(
        new Set(
          [customerPhone, customerPhone.slice(-10)].filter((phone) => phone && phone.length >= 10),
        ),
      );
      if (phoneVariants.length > 0) {
        const { data: leads } = await supabase
          .from("leads")
          .select("id, assigned_to")
          .or(phoneVariants.map((p) => `phone.ilike.%${p}%`).join(","))
          .limit(1);

        if (leads && leads.length > 0) {
          matchedLeadId = leads[0].id;
          matchedUserId = leads[0].assigned_to;
        }
      }
    }

    // Try to match agent by phone number in profiles
    if (!matchedUserId && agentName) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id")
        .ilike("full_name", `%${agentName}%`)
        .limit(1);

      if (profiles && profiles.length > 0) {
        matchedUserId = profiles[0].user_id;
      }
    }

    // Upsert call record
    const { error: insertError } = await supabase
      .from("mcube_call_records")
      .upsert(
        {
          call_id: callid,
          direction,
          agent_phone: agentPhone || null,
          agent_name: agentName || null,
          customer_phone: customerPhone || null,
          did_number: didNumber || null,
          dial_status: dialStatus,
          recording_url: recordingUrl || null,
          start_time: startTimeIso,
          end_time: endTimeIso,
          answered_time: answeredTimeIso,
          disconnected_by: disconnectedBy || null,
          group_name: groupName || null,
          duration_seconds: durationSeconds,
          matched_lead_id: matchedLeadId,
          matched_user_id: matchedUserId,
          raw_payload: payload,
        },
        { onConflict: "call_id" }
      );

    if (insertError) {
      console.error("Error inserting MCube call record:", insertError);
      return new Response(JSON.stringify({ error: insertError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // If matched to a lead, also create a call_log entry for CRM tracking
    if (matchedLeadId && matchedUserId && dialStatus) {
      const outcomeMap: Record<string, string> = {
        ANSWER: "answered",
        CANCEL: "not_answered",
        "Executive Busy": "busy",
        Busy: "busy",
        NoAnswer: "not_answered",
      };
      const outcome = outcomeMap[dialStatus] || "not_answered";

      await supabase.from("call_logs").insert({
        lead_id: matchedLeadId,
        user_id: matchedUserId,
        outcome,
        duration_seconds: durationSeconds,
        notes: `MCube ${direction} call - ${dialStatus}${agentName ? ` by ${agentName}` : ""}`,
      });
    }

    return new Response(JSON.stringify({ status: "success", call_id: callid }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("MCube webhook error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
