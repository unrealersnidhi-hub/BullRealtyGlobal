import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const allowedOrigins = [
  "https://bullstarrealty.ae",
  "https://www.bullstarrealty.ae",
  "http://localhost:5173",
  "http://localhost:8080",
  "http://localhost:4173",
  "http://127.0.0.1:4173",
];

function getCorsHeaders(req: Request) {
  const origin = req.headers.get("Origin") || "";
  const isAllowed =
    allowedOrigins.includes(origin) ||
    /^https?:\/\/localhost:\d+$/.test(origin) ||
    /^https?:\/\/127\.0\.0\.1:\d+$/.test(origin);
  return {
    "Access-Control-Allow-Origin": isAllowed ? origin : "https://bullstarrealty.ae",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-api-version, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  };
}

// Public team data endpoint - returns only non-sensitive fields
// Explicitly EXCLUDES: email, phone
Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "GET" && req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Use service role to bypass RLS since anonymous access is now blocked
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch team members but only return safe public fields
    const { data, error } = await adminClient
      .from("team_members")
      .select("id, name, role, description, linkedin, photo_url, display_order")
      .eq("is_active", true)
      .order("display_order", { ascending: true });

    if (error) {
      console.error("Error fetching team members:", error);
      return new Response(
        JSON.stringify({ error: "Failed to load team members" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Return only public-safe data (no email, no phone)
    return new Response(
      JSON.stringify({ team: data }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Error in list-public-team:", error);
    return new Response(
      JSON.stringify({ error: "An error occurred while processing your request" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
