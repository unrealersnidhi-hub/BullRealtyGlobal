import { ReactNode } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import UnifiedSidebar from "./UnifiedSidebar";
import { Badge } from "@/components/ui/badge";
import { Building2, Menu, ShieldCheck } from "lucide-react";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { cn } from "@/lib/utils";

interface UnifiedDashboardLayoutProps {
  children: ReactNode;
  userEmail?: string;
  userRoles: string[];
  userCountry?: "dubai" | "india" | null;
}

export const UnifiedDashboardLayout = ({ 
  children, 
  userEmail, 
  userRoles,
  userCountry 
}: UnifiedDashboardLayoutProps) => {
  const getRoleLabel = () => {
    if (userRoles.includes("super_admin")) return "Super Admin";
    if (userRoles.includes("admin")) return "Admin";
    if (userRoles.includes("manager")) return "Manager";
    if (userRoles.includes("mis")) return "MIS";
    if (userRoles.includes("telesales")) return "Telesales";
    if (userRoles.includes("hr")) return "HR";
    if (userRoles.includes("blog_writer")) return "Writer";
    if (userRoles.includes("user")) return "Sales";
    return "User";
  };

  const getCountryFlag = () => {
    if (userCountry === "dubai") return "🇦🇪";
    if (userCountry === "india") return "🇮🇳";
    return null;
  };

  return (
    <SidebarProvider>
      <div className="enterprise-crm min-h-screen flex flex-col w-full bg-background">
        {/* Mobile Header */}
        <header className="lg:hidden flex items-center justify-between h-14 px-4 border-b border-border/70 bg-card sticky top-0 z-40">
          <div className="flex items-center gap-3">
            <SidebarTrigger className="text-muted-foreground hover:text-foreground transition-colors">
              <Menu className="w-5 h-5" />
            </SidebarTrigger>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[hsl(var(--gold))] to-[hsl(var(--gold-light))] flex items-center justify-center shadow-lg shadow-[hsl(var(--gold))]/20">
                <Building2 className="w-4 h-4 text-[hsl(var(--charcoal))]" />
              </div>
              <span className="font-bold text-sm">
                {userCountry === "india" ? "Bull Realty Global" : "Bull Star Realty"}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {getCountryFlag() && (
              <span className="text-lg">{getCountryFlag()}</span>
            )}
            <Badge variant="secondary" className="text-[10px] font-medium">
              {getRoleLabel()}
            </Badge>
            <NotificationBell />
          </div>
        </header>
        
        <div className="flex flex-1">
          <UnifiedSidebar 
            userEmail={userEmail} 
            userRoles={userRoles} 
            userCountry={userCountry}
          />
          
          {/* Main Content */}
          <main className="flex-1 overflow-auto">
            <header className="hidden lg:flex items-center justify-between border-b border-border/70 bg-card px-6 py-3">
              <div className="flex items-center gap-3">
                <div className="rounded-md border border-border/70 bg-background p-1.5">
                  <ShieldCheck className="h-4 w-4 text-[hsl(var(--gold))]" />
                </div>
                <div>
                  <p className="text-sm font-semibold leading-none">CRM Workspace</p>
                  <p className="text-xs text-muted-foreground">{userCountry === "india" ? "Bull Realty Global" : "Bull Star Realty"}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant="outline" className="text-xs">
                  {getRoleLabel()}
                </Badge>
                <NotificationBell />
              </div>
            </header>
            <div className="p-4 md:p-5 lg:p-6">
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
