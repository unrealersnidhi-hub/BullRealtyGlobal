import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-api-key, x-webhook-token, api_key",
};

const sanitizeError = (error: unknown): string => {
  if (error instanceof Error) {
    return "An error occurred processing your request";
  }
  return "Unknown error occurred";
};

const validateLeadData = (data: any): { valid: boolean; lead?: any; error?: string } => {
  if (!data || typeof data !== "object") {
    return { valid: false, error: "Invalid request body" };
  }

  const fullName = String(data.full_name || data.name || data.fullName || data.clientname || data.client_name || data.customerName || "").trim().slice(0, 100);
  const email = String(data.email || "").trim().toLowerCase().slice(0, 255);
  const phone = String(data.phone || data.mobile || data.contact || data.mobilenumber || data.mobile_number || data.contactnumber || "").trim().slice(0, 20);

  if (!fullName) {
    return { valid: false, error: "Name is required" };
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email || !emailRegex.test(email)) {
    return { valid: false, error: "Valid email is required" };
  }

  const interest = String(data.interest || data.property_type || data.propertyType || data.projectname || data.project_name || "").trim().slice(0, 255);
  const message = String(data.message || data.comments || data.notes || data.customercomments || data.customer_comments || "").trim().slice(0, 2000);
  const externalSource = String(data.sourcename || data.source_name || data.source || "").trim().slice(0, 100);

  return {
    valid: true,
    lead: {
      full_name: fullName,
      email,
      phone: phone || null,
      interest: interest || null,
      message: [message, externalSource ? `Source: ${externalSource}` : ""].filter(Boolean).join(" | ") || null,
    },
  };
};

// Auto-assign lead to ONE sales/telesales member randomly with equal distribution
async function autoAssignToRandomSalesMember(supabase: any, leadId: string) {
  try {
    // Get all users with 'user' (salesperson) and 'telesales' roles
    const { data: roles } = await supabase
      .from("user_roles")
      .select("user_id, role")
      .in("role", ["user", "telesales"]);

    if (!roles || roles.length === 0) {
      console.log("No sales/telesales members found for auto-assignment");
      return null;
    }

    // Get current assignment counts for equal distribution
    const { data: assignCounts } = await supabase
      .from("lead_assignees")
      .select("user_id");

    const countMap: Record<string, number> = {};
    roles.forEach((r: any) => { countMap[r.user_id] = 0; });
    assignCounts?.forEach((a: any) => {
      if (countMap[a.user_id] !== undefined) countMap[a.user_id]++;
    });

    // Pick the member with fewest leads (random tiebreak)
    const sorted = roles
      .map((r: any) => ({ ...r, count: countMap[r.user_id] || 0 }))
      .sort((a: any, b: any) => a.count - b.count);
    const minCount = sorted[0].count;
    const candidates = sorted.filter((r: any) => r.count === minCount);
    const chosen = candidates[Math.floor(Math.random() * candidates.length)];

    // Insert single assignee
    const { error } = await supabase
      .from("lead_assignees")
      .insert({
        lead_id: leadId,
        user_id: chosen.user_id,
        role: chosen.role === "telesales" ? "telesales" : "member",
      });

    if (error) {
      console.error("Error auto-assigning lead:", error);
      return null;
    }

    // Update lead's assigned_to
    await supabase.from("leads").update({
      assigned_to: chosen.user_id,
      assigned_at: new Date().toISOString(),
    }).eq("id", leadId);

    console.log(`Lead ${leadId} auto-assigned to ${chosen.user_id}`);
    return chosen.user_id;
  } catch (e) {
    console.error("Auto-assign error:", e);
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    if (req.method !== "POST") {
      return new Response(
        JSON.stringify({ success: false, error: "Method not allowed" }),
        { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const apiKey = req.headers.get("x-api-key") || req.headers.get("api_key") || req.headers.get("API_KEY");
    const webhookToken = req.headers.get("x-webhook-token");

    const url = new URL(req.url);
    const pathToken = url.pathname.split("/").pop();
    const token = webhookToken || (pathToken !== "lead-webhook" ? pathToken : null);

    if (!apiKey && !token) {
      return new Response(
        JSON.stringify({ success: false, error: "Authentication required. Provide x-api-key or x-webhook-token header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let integrationId: string | null = null;
    let source: string = "custom";
    let integrationType: "api_key" | "webhook" = "api_key";

    if (apiKey) {
      const { data: keyData, error: keyError } = await supabase
        .from("api_keys")
        .select("id, source, is_active, expires_at, request_count")
        .eq("api_key", apiKey)
        .single();

      if (keyError || !keyData) {
        return new Response(
          JSON.stringify({ success: false, error: "Invalid API key" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (!keyData.is_active) {
        return new Response(
          JSON.stringify({ success: false, error: "API key is inactive" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (keyData.expires_at && new Date(keyData.expires_at) < new Date()) {
        return new Response(
          JSON.stringify({ success: false, error: "API key has expired" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      integrationId = keyData.id;
      source = keyData.source;
      integrationType = "api_key";

      await supabase
        .from("api_keys")
        .update({ 
          last_used_at: new Date().toISOString(),
          request_count: keyData.request_count + 1 
        })
        .eq("id", keyData.id);
    }

    if (token && !apiKey) {
      const { data: webhookData, error: webhookError } = await supabase
        .from("webhooks")
        .select("id, source, is_active, trigger_count")
        .eq("webhook_token", token)
        .single();

      if (webhookError || !webhookData) {
        return new Response(
          JSON.stringify({ success: false, error: "Invalid webhook token" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (!webhookData.is_active) {
        return new Response(
          JSON.stringify({ success: false, error: "Webhook is inactive" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      integrationId = webhookData.id;
      source = webhookData.source;
      integrationType = "webhook";

      await supabase
        .from("webhooks")
        .update({ 
          last_triggered_at: new Date().toISOString(),
          trigger_count: webhookData.trigger_count + 1 
        })
        .eq("id", webhookData.id);
    }

    let requestPayload: any;
    try {
      requestPayload = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ success: false, error: "Invalid JSON body" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const validation = validateLeadData(requestPayload);
    if (!validation.valid) {
      await supabase.from("integration_logs").insert({
        integration_type: integrationType,
        integration_id: integrationId,
        source,
        status: "failed",
        request_payload: requestPayload,
        error_message: validation.error,
        ip_address: req.headers.get("x-forwarded-for") || req.headers.get("cf-connecting-ip"),
      });

      return new Response(
        JSON.stringify({ success: false, error: validation.error }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: lead, error: leadError } = await supabase
      .from("leads")
      .insert({
        ...validation.lead,
        source: source.replace("_", "-"),
        status: "new",
      })
      .select()
      .single();

    if (leadError) {
      console.error("Lead creation error:", leadError);

      await supabase.from("integration_logs").insert({
        integration_type: integrationType,
        integration_id: integrationId,
        source,
        status: "failed",
        request_payload: requestPayload,
        error_message: leadError.message,
        ip_address: req.headers.get("x-forwarded-for") || req.headers.get("cf-connecting-ip"),
      });

      return new Response(
        JSON.stringify({ success: false, error: "Failed to create lead" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Log successful creation
    await supabase.from("integration_logs").insert({
      integration_type: integrationType,
      integration_id: integrationId,
      source,
      status: "success",
      request_payload: requestPayload,
      response_payload: { lead_id: lead.id },
      lead_id: lead.id,
      ip_address: req.headers.get("x-forwarded-for") || req.headers.get("cf-connecting-ip"),
    });

    // Auto-assign to one random sales/telesales member
    const assignedUserId = await autoAssignToRandomSalesMember(supabase, lead.id);

    // Get assigned user's profile for notification
    let assignedEmail: string | undefined;
    let assignedName: string | undefined;
    let assignedPhone: string | undefined;
    if (assignedUserId) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("email, full_name")
        .eq("user_id", assignedUserId)
        .single();
      assignedEmail = profile?.email || undefined;
      assignedName = profile?.full_name || undefined;

      // Get phone from employees table
      const { data: emp } = await supabase
        .from("employees")
        .select("phone")
        .eq("user_id", assignedUserId)
        .single();
      assignedPhone = emp?.phone || undefined;
    }

    // Send email + WhatsApp notification for new lead
    try {
      await fetch(`${supabaseUrl}/functions/v1/send-lead-notification`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${supabaseServiceKey}`,
        },
        body: JSON.stringify({
          type: "lead_created",
          lead_id: lead.id,
          lead_name: lead.full_name,
          lead_email: lead.email,
          lead_phone: lead.phone,
          lead_source: lead.source,
          lead_interest: lead.interest,
          assigned_to_email: assignedEmail,
          assigned_to_name: assignedName,
          send_whatsapp: true,
        }),
      });
    } catch (notificationError) {
      console.error("Failed to send notification:", notificationError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Lead created successfully",
        lead_id: lead.id,
      }),
      { status: 201, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Webhook error:", error);
    return new Response(
      JSON.stringify({ success: false, error: sanitizeError(error) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
