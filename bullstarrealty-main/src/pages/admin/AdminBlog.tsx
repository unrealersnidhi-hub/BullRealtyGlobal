import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { SidebarProvider } from "@/components/ui/sidebar";
import AdminSidebar from "@/components/admin/AdminSidebar";
import BlogManagement from "@/components/admin/BlogManagement";
import { Loader2 } from "lucide-react";

const AdminBlog = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<{ email?: string; id: string } | null>(null);
  const [userRoles, setUserRoles] = useState<string[]>([]);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        navigate("/admin");
        return;
      }

      // Check user roles
      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", session.user.id);

      const userRoleList = roles?.map((r) => r.role) || [];
      
      // Allow admin or blog_writer
      if (!userRoleList.includes("admin") && !userRoleList.includes("blog_writer")) {
        await supabase.auth.signOut();
        navigate("/admin");
        return;
      }

      setUser({ email: session.user.email, id: session.user.id });
      setUserRoles(userRoleList);
      setIsLoading(false);
    };

    checkAuth();
  }, [navigate]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-gold" />
      </div>
    );
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-secondary/30">
        <AdminSidebar userEmail={user?.email} userRoles={userRoles} />
        <main className="flex-1 p-6 lg:p-8 overflow-auto">
          <div className="max-w-7xl mx-auto">
            <BlogManagement 
              isAdmin={userRoles.includes("admin")} 
              userId={user?.id || ""} 
            />
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
};

export default AdminBlog;
