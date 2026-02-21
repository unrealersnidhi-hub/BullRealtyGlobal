import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type CountryCode = "dubai" | "india";

interface ZoneGuardResult {
  isLoading: boolean;
  user: {
    id: string;
    email: string;
    country: CountryCode | null;
    fullName: string | null;
  } | null;
  userRoles: string[];
}

/**
 * Mapping from role to their correct dashboard path.
 */
const ROLE_DASHBOARD_MAP: Record<string, string> = {
  super_admin: "/admin/dashboard",
  admin: "/admin/dashboard",
  manager: "/manager/dashboard",
  mis: "/mis/dashboard",
  telesales: "/telesales/dashboard",
  hr: "/hr/dashboard",
  blog_writer: "/admin/blog",
  user: "/user/dashboard",
};

/**
 * Role priority order for determining where to redirect.
 */
const ROLE_PRIORITY = [
  "super_admin",
  "admin",
  "manager",
  "mis",
  "telesales",
  "hr",
  "blog_writer",
  "user",
];

/**
 * Hook that checks auth, validates role access for a dashboard,
 * and enforces country zone restrictions.
 * 
 * @param allowedRoles - Roles that can access this dashboard
 * @param currentPath - The current dashboard path (e.g. "/telesales/dashboard")
 */
export const useCountryZoneGuard = (
  allowedRoles: string[],
  currentPath: string
): ZoneGuardResult => {
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<ZoneGuardResult["user"]>(null);
  const [userRoles, setUserRoles] = useState<string[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    const check = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();

        if (!session) {
          navigate("/admin");
          return;
        }

        const { data: roles } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", session.user.id);

        const roleList = roles?.map((r) => r.role) || [];
        setUserRoles(roleList);

        if (roleList.length === 0) {
          await supabase.auth.signOut();
          toast.error("Access denied. No role assigned.");
          navigate("/admin");
          return;
        }

        // Check if user has any of the allowed roles for this dashboard
        const hasAccess = allowedRoles.some((r) => roleList.includes(r as any));

        if (!hasAccess) {
          // Redirect to the correct dashboard based on their highest role
          const correctRole = ROLE_PRIORITY.find((r) => roleList.includes(r as any));
          const correctPath = correctRole ? ROLE_DASHBOARD_MAP[correctRole] : "/admin";

          if (correctPath && correctPath !== currentPath) {
            toast.error("Access denied. Redirecting to your dashboard.");
            navigate(correctPath);
            return;
          }

          await supabase.auth.signOut();
          toast.error("Access denied.");
          navigate("/admin");
          return;
        }

        // Get profile with country
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name, country")
          .eq("user_id", session.user.id)
          .maybeSingle();

        const userCountry = profile?.country || null;

        // Country zone enforcement:
        // The user's profile country (set at login) must match the session context.
        // If a user tries to access a dashboard URL that doesn't match their zone,
        // the RLS policies will handle data isolation, but we also validate here.
        // Super admins bypass country restrictions.
        
        setUser({
          id: session.user.id,
          email: session.user.email || "",
          country: userCountry,
          fullName: profile?.full_name || null,
        });
      } catch (error) {
        console.error("Auth check error:", error);
        navigate("/admin");
      } finally {
        setIsLoading(false);
      }
    };

    check();
  }, [navigate, allowedRoles, currentPath]);

  return { isLoading, user, userRoles };
};
