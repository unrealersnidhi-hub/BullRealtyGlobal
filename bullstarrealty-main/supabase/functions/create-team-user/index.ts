import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

function sanitizeError(error: { message?: string } | null): string {
  const msg = error?.message || '';
  
  if (msg.includes('duplicate key') || msg.includes('unique constraint')) {
    return 'This user already exists';
  }
  if (msg.includes('foreign key')) {
    return 'Invalid reference provided';
  }
  if (msg.includes('permission denied')) {
    return 'Access denied';
  }
  if (msg.includes('already been registered')) {
    return 'This email is already registered';
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

    // Create client with user's token to verify they're an admin
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
    const { data: userRoles } = await userClient
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);

    const roles = userRoles?.map(r => r.role) || [];
    const isAdmin = roles.includes("admin") || roles.includes("super_admin");
    const isManager = roles.includes("manager");

    if (!isAdmin && !isManager) {
      return new Response(
        JSON.stringify({ error: "Only admins and managers can create team users" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse request body
    const { email, password, fullName, role = "user", country = "dubai" } = await req.json();

    // Managers can only create sales users (role = "user")
    // Managers can create sales users and telesales
    if (isManager && !isAdmin && role !== "user" && role !== "telesales") {
      return new Response(
        JSON.stringify({ error: "Managers can only create sales users and telesales" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!email || !password) {
      return new Response(
        JSON.stringify({ error: "Email and password are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (password.length < 8) {
      return new Response(
        JSON.stringify({ error: "Password must be at least 8 characters" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create admin client with service role
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    // Create the user
    const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName },
    });

    if (createError) {
      console.error("Error creating user:", createError);
      return new Response(
        JSON.stringify({ error: sanitizeError(createError) }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Assign role to the new user
    const { error: roleError } = await adminClient
      .from("user_roles")
      .insert({ user_id: newUser.user.id, role });

    if (roleError) {
      console.error("Error assigning role:", roleError);
      // Still continue since user was created
    }

    // Ensure profile exists (some projects may not have an auth trigger creating profiles).
    // Upsert keeps user creation reliable and supports country-based access rules.
    const { error: profileError } = await adminClient
      .from("profiles")
      .upsert(
        {
          user_id: newUser.user.id,
          email,
          full_name: fullName || null,
          country,
        },
        { onConflict: "user_id" }
      );

    if (profileError) {
      console.error("Error updating profile country:", profileError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        user: {
          id: newUser.user.id,
          email: newUser.user.email,
          role,
        },
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Error in create-team-user:", error);
    const corsHeaders = getCorsHeaders(req);
    return new Response(
      JSON.stringify({ error: "An error occurred while processing your request" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
