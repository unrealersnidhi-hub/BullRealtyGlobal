import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const mcubeToken = Deno.env.get("MCUBE_API_TOKEN");

    if (!mcubeToken) {
      return new Response(JSON.stringify({ error: "MCube API token not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!serviceRoleKey) {
      return new Response(JSON.stringify({ error: "Service role key not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { exenumber, custnumber, lead_id } = await req.json();
    const sanitizePhone = (value: unknown) => String(value ?? "").replace(/[^\d]/g, "");
    const isValidPhone = (value: string) => value.length >= 10;
    const cleanAgent = sanitizePhone(exenumber);
    const cleanCustomer = sanitizePhone(custnumber);

    if (!cleanAgent || !cleanCustomer) {
      return new Response(JSON.stringify({ error: "Agent number and customer number are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!isValidPhone(cleanAgent) || !isValidPhone(cleanCustomer)) {
      return new Response(JSON.stringify({ error: "Phone numbers must be at least 10 digits" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Call MCube outbound API
    const mcubeResponse = await fetch("https://api.mcube.com/Restmcube-api/outbound-calls", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        HTTP_AUTHORIZATION: mcubeToken,
        exenumber: cleanAgent,
        custnumber: cleanCustomer,
        refurl: 1,
      }),
    });

    const responseText = await mcubeResponse.text();
    let mcubeData: Record<string, unknown> = {};
    try {
      mcubeData = responseText ? JSON.parse(responseText) : {};
    } catch {
      mcubeData = { raw_response: responseText };
    }

    console.log("MCube outbound response:", JSON.stringify(mcubeData));

    if (!mcubeResponse.ok) {
      return new Response(JSON.stringify({ error: "MCube API request failed", details: mcubeData }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const statusRaw = String(mcubeData?.status ?? mcubeData?.Status ?? "").toLowerCase();
    const isSuccess = ["succ", "success", "ok", "queued", "true", "1"].includes(statusRaw);
    if (!isSuccess) {
      const message = String(mcubeData?.msg ?? mcubeData?.message ?? mcubeData?.error ?? "MCube call initiation failed");
      return new Response(JSON.stringify({ error: message, details: mcubeData }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const callId = String(mcubeData?.callid ?? mcubeData?.call_id ?? mcubeData?.refid ?? `out_${Date.now()}`);

    // Store outbound call record
    const serviceClient = createClient(supabaseUrl, serviceRoleKey);
    const { error: recordError } = await serviceClient.from("mcube_call_records").insert({
      call_id: callId,
      direction: "outbound",
      agent_phone: cleanAgent,
      customer_phone: cleanCustomer,
      dial_status: "INITIATED",
      matched_lead_id: lead_id || null,
      matched_user_id: user.id,
      start_time: new Date().toISOString(),
      ref_id: String(mcubeData?.refid ?? "") || null,
      raw_payload: mcubeData,
    });
    if (recordError) {
      console.error("MCube outbound call record insert failed:", recordError);
    }

    return new Response(JSON.stringify({ 
      status: "success", 
      message: "Call initiated successfully",
      call_id: callId
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("MCube outbound error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
