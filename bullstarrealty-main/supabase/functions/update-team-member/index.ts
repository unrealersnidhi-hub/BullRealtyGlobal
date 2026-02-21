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

    const requesterId = userData.user.id;

    // Check if user is admin or super_admin
    const { data: requesterRoles } = await userClient
      .from("user_roles")
      .select("role")
      .eq("user_id", requesterId);

    const requesterRoleList = requesterRoles?.map(r => r.role) || [];
    const isAdmin = requesterRoleList.includes("admin") || requesterRoleList.includes("super_admin");

    if (!isAdmin) {
      return new Response(
        JSON.stringify({ error: "Only admins can update team members" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = await req.json();
    const { userId, action, fullName, role, country, newPassword } = body;

    if (!userId) {
      return new Response(
        JSON.stringify({ error: "User ID is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Prevent modifying super_admin unless requester is also super_admin
    const { data: targetRoles } = await userClient
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);
    
    const targetRoleList = targetRoles?.map(r => r.role) || [];
    const targetIsSuperAdmin = targetRoleList.includes("super_admin");
    const requesterIsSuperAdmin = requesterRoleList.includes("super_admin");

    if (targetIsSuperAdmin && !requesterIsSuperAdmin) {
      return new Response(
        JSON.stringify({ error: "Only super admins can modify other super admins" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    // Handle password reset
    if (action === "reset_password" && newPassword) {
      if (newPassword.length < 8) {
        return new Response(
          JSON.stringify({ error: "Password must be at least 8 characters" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { error: passwordError } = await adminClient.auth.admin.updateUserById(
        userId,
        { password: newPassword }
      );

      if (passwordError) {
        console.error("Error resetting password:", passwordError);
        return new Response(
          JSON.stringify({ error: "Failed to reset password" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ success: true, message: "Password reset successfully" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Handle profile update
    if (action === "update_profile") {
      // Update profile
      if (fullName !== undefined || country !== undefined) {
        const profileUpdate: Record<string, string> = {};
        if (fullName !== undefined) profileUpdate.full_name = fullName;
        if (country !== undefined) profileUpdate.country = country;

        const { error: profileError } = await adminClient
          .from("profiles")
          .update(profileUpdate)
          .eq("user_id", userId);

        if (profileError) {
          console.error("Error updating profile:", profileError);
          return new Response(
            JSON.stringify({ error: "Failed to update profile" }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }

      // Update role if provided
      if (role !== undefined) {
        // Delete existing roles
        await adminClient
          .from("user_roles")
          .delete()
          .eq("user_id", userId);

        // Insert new role
        const { error: roleError } = await adminClient
          .from("user_roles")
          .insert({ user_id: userId, role });

        if (roleError) {
          console.error("Error updating role:", roleError);
          return new Response(
            JSON.stringify({ error: "Failed to update role" }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }

      return new Response(
        JSON.stringify({ success: true, message: "Profile updated successfully" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Invalid action" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    console.error("Error in update-team-member:", error);
    const corsHeaders = getCorsHeaders(req);
    return new Response(
      JSON.stringify({ error: "An error occurred while processing your request" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
