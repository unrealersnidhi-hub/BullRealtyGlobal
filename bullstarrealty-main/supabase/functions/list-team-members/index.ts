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
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  };
}

function sanitizeError(error: { message?: string } | null): string {
  const msg = error?.message || '';
  
  if (msg.includes('permission denied')) {
    return 'Access denied';
  }
  if (msg.includes('not found')) {
    return 'Resource not found';
  }
  
  return 'An error occurred while processing your request';
}

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Verify the requesting user is an admin
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await userClient.auth.getUser(token);
    
    if (userError || !userData?.user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = userData.user.id;

    // Check if user is admin or manager
    const { data: requesterRoles } = await userClient
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);

    const requesterRoleList = requesterRoles?.map(r => r.role) || [];
    const isAdmin = requesterRoleList.includes("admin") || requesterRoleList.includes("super_admin");
    const isManager = requesterRoleList.includes("manager");
    const isMIS = requesterRoleList.includes("mis");
    const isTelesales = requesterRoleList.includes("telesales");

    if (!isAdmin && !isManager && !isMIS && !isTelesales) {
      return new Response(
        JSON.stringify({ error: "Access denied" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create admin client with service role
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch all users from auth.users
    const { data: authUsers, error: usersError } = await adminClient.auth.admin.listUsers();

    if (usersError) {
      console.error("Error fetching users:", usersError);
      return new Response(
        JSON.stringify({ error: sanitizeError(usersError) }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch all profiles
    const { data: profiles } = await adminClient
      .from("profiles")
      .select("*");

    // Fetch all roles
    const { data: allRoles } = await adminClient
      .from("user_roles")
      .select("*");

    // Combine the data
    const teamMembers = authUsers.users.map((user) => {
      const profile = profiles?.find((p) => p.user_id === user.id);
      const memberRoles = allRoles?.filter((r) => r.user_id === user.id).map((r) => r.role) || [];

      return {
        id: user.id,
        email: user.email,
        fullName: profile?.full_name || user.user_metadata?.full_name || null,
        roles: memberRoles,
        createdAt: user.created_at,
        lastSignIn: user.last_sign_in_at,
        country: profile?.country || null,
      };
    });

    return new Response(
      JSON.stringify({ users: teamMembers }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Error in list-team-members:", error);
    const corsHeaders = getCorsHeaders(req);
    return new Response(
      JSON.stringify({ error: "An error occurred while processing your request" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
