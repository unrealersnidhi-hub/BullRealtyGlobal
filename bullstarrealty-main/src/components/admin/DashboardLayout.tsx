import { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import AdminSidebar from "./AdminSidebar";
import { Badge } from "@/components/ui/badge";
import { Sparkles } from "lucide-react";
 import { NotificationBell } from "@/components/notifications/NotificationBell";

interface DashboardLayoutProps {
  children: ReactNode;
  userEmail?: string;
  userRoles: string[];
}

export const DashboardLayout = ({ children, userEmail, userRoles }: DashboardLayoutProps) => {
  const isAdmin = userRoles.includes("admin") || userRoles.includes("super_admin");
  
  return (
    <SidebarProvider>
      <div className="min-h-screen flex flex-col w-full bg-gradient-to-br from-background via-background to-secondary/20">
        {/* Mobile Header */}
        <header className="lg:hidden flex items-center justify-between h-14 px-4 border-b border-border/40 bg-background/80 backdrop-blur-xl sticky top-0 z-40">
          <div className="flex items-center gap-3">
            <SidebarTrigger className="text-muted-foreground hover:text-foreground transition-colors" />
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[hsl(var(--gold))] to-[hsl(var(--gold-light))] flex items-center justify-center shadow-lg shadow-[hsl(var(--gold))]/20">
                <Sparkles className="w-4 h-4 text-[hsl(var(--charcoal))]" />
              </div>
              <span className="font-bold text-sm">Bull Star CRM</span>
            </div>
          </div>
          <Badge variant="secondary" className="text-[10px] font-medium">
            {isAdmin ? (userRoles.includes("super_admin") ? "Super Admin" : "Admin") : "Team"}
          </Badge>
           <NotificationBell />
        </header>
        
        <div className="flex flex-1">
          <AdminSidebar userEmail={userEmail} userRoles={userRoles} />
          
          {/* Main Content */}
          <main className="flex-1 overflow-auto">
            <div className="p-4 md:p-6 lg:p-8">
              <div className="max-w-[1600px] mx-auto">
                {children}
              </div>
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};
