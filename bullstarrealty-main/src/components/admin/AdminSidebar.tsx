import { useNavigate, useSearchParams, useLocation } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  LayoutDashboard,
  ClipboardList,
  TrendingUp,
  Calendar,
  Users,
  Plug,
  FileText,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Bell,
  FolderOpen,
  Calculator,
  BarChart3,
  MapPin,
  ClipboardEdit,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface AdminSidebarProps {
  userEmail?: string;
  userRoles: string[];
}

const AdminSidebar = ({ userEmail, userRoles }: AdminSidebarProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { state, toggleSidebar } = useSidebar();
  const collapsed = state === "collapsed";
  const isAdmin = userRoles.includes("admin");
  const isBlogWriter = userRoles.includes("blog_writer");

  const currentTab = searchParams.get("tab") || "leads";
  const isOnDashboard = location.pathname === "/admin/dashboard";
  const isOnBlog = location.pathname === "/admin/blog";

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/admin");
  };

  const handleNavigation = (tab: string) => {
    navigate(`/admin/dashboard?tab=${tab}`);
  };

  const mainNavItems = [
    { title: "Leads", tab: "leads", icon: ClipboardList, adminOnly: true },
    { title: "Funnel", tab: "funnel", icon: TrendingUp, adminOnly: true },
    { title: "Follow-ups", tab: "calendar", icon: Calendar, adminOnly: true },
  ];

  const managementItems = [
    { title: "Team", tab: "team", icon: Users, adminOnly: true },
    { title: "Location", tab: "location", icon: MapPin, adminOnly: true },
    { title: "Integrations", tab: "integrations", icon: Plug, adminOnly: true },
    { title: "Notifications", tab: "notifications", icon: Bell, adminOnly: true },
    { title: "Documents", tab: "documents", icon: FolderOpen, adminOnly: true },
    { title: "Quotations", tab: "quotations", icon: Calculator, adminOnly: true },
    { title: "Reports", tab: "reports", icon: BarChart3, adminOnly: true },
    { title: "Requests", tab: "requests", icon: ClipboardEdit, adminOnly: true },
  ];

  const filterItems = (items: typeof mainNavItems) => {
    return items.filter(item => !item.adminOnly || isAdmin);
  };

  const isTabActive = (tab: string) => isOnDashboard && currentTab === tab;

  return (
    <Sidebar
      className={cn(
        "border-r border-border/50 bg-gradient-to-b from-card to-background transition-all duration-300",
        collapsed ? "w-16" : "w-64"
      )}
      collapsible="icon"
    >
      <SidebarHeader className="border-b border-border/50 p-4">
        <div className="flex items-center justify-between">
          {!collapsed && (
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-gold to-gold-light flex items-center justify-center shadow-lg shadow-gold/20">
                <Sparkles className="w-5 h-5 text-charcoal" />
              </div>
              <div>
                <h2 className="font-bold text-base tracking-tight">Bull Star</h2>
                <p className="text-xs text-muted-foreground font-medium">
                  {isAdmin ? "Administrator" : isBlogWriter ? "Content Writer" : "User"}
                </p>
              </div>
            </div>
          )}
          {collapsed && (
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-gold to-gold-light flex items-center justify-center shadow-lg shadow-gold/20 mx-auto">
              <Sparkles className="w-5 h-5 text-charcoal" />
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className="py-4 px-2">
        {/* Toggle Button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={toggleSidebar}
          className={cn(
            "w-full mb-4 text-muted-foreground hover:text-foreground hover:bg-accent/50",
            collapsed && "px-0"
          )}
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : (
            <>
              <ChevronLeft className="h-4 w-4 mr-2" />
              <span>Collapse</span>
            </>
          )}
        </Button>

        {/* Main Navigation - Admin Only */}
        {isAdmin && (
          <SidebarGroup>
            {!collapsed && (
              <SidebarGroupLabel className="px-3 text-[10px] uppercase tracking-wider text-muted-foreground/70 font-semibold mb-2">
                CRM
              </SidebarGroupLabel>
            )}
            <SidebarGroupContent>
              <SidebarMenu>
                {filterItems(mainNavItems).map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      onClick={() => handleNavigation(item.tab)}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 cursor-pointer group",
                        collapsed && "justify-center px-2",
                        isTabActive(item.tab)
                          ? "bg-gold/10 text-gold border border-gold/20 shadow-sm"
                          : "hover:bg-accent/50 text-muted-foreground hover:text-foreground"
                      )}
                    >
                      <item.icon className={cn(
                        "h-5 w-5 shrink-0 transition-colors",
                        isTabActive(item.tab) ? "text-gold" : "group-hover:text-gold"
                      )} />
                      {!collapsed && (
                        <span className="font-medium text-sm">{item.title}</span>
                      )}
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* Management - Admin Only */}
        {isAdmin && (
          <SidebarGroup className="mt-6">
            {!collapsed && (
              <SidebarGroupLabel className="px-3 text-[10px] uppercase tracking-wider text-muted-foreground/70 font-semibold mb-2">
                Management
              </SidebarGroupLabel>
            )}
            <SidebarGroupContent>
              <SidebarMenu>
                {managementItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      onClick={() => handleNavigation(item.tab)}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 cursor-pointer group",
                        collapsed && "justify-center px-2",
                        isTabActive(item.tab)
                          ? "bg-gold/10 text-gold border border-gold/20 shadow-sm"
                          : "hover:bg-accent/50 text-muted-foreground hover:text-foreground"
                      )}
                    >
                      <item.icon className={cn(
                        "h-5 w-5 shrink-0 transition-colors",
                        isTabActive(item.tab) ? "text-gold" : "group-hover:text-gold"
                      )} />
                      {!collapsed && (
                        <span className="font-medium text-sm">{item.title}</span>
                      )}
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* Content - Blog */}
        <SidebarGroup className="mt-6">
          {!collapsed && (
            <SidebarGroupLabel className="px-3 text-[10px] uppercase tracking-wider text-muted-foreground/70 font-semibold mb-2">
              Content
            </SidebarGroupLabel>
          )}
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={() => navigate("/admin/blog")}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 cursor-pointer group",
                    collapsed && "justify-center px-2",
                    isOnBlog
                      ? "bg-gold/10 text-gold border border-gold/20 shadow-sm"
                      : "hover:bg-accent/50 text-muted-foreground hover:text-foreground"
                  )}
                >
                  <FileText className={cn(
                    "h-5 w-5 shrink-0 transition-colors",
                    isOnBlog ? "text-gold" : "group-hover:text-gold"
                  )} />
                  {!collapsed && (
                    <span className="font-medium text-sm">Blog Posts</span>
                  )}
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-border/50 p-4">
        {!collapsed && userEmail && (
          <div className="mb-3 px-2">
            <p className="text-xs text-muted-foreground truncate">{userEmail}</p>
          </div>
        )}
        <Button
          variant="ghost"
          size={collapsed ? "icon" : "default"}
          onClick={handleLogout}
          className={cn(
            "w-full text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors",
            collapsed && "w-10 h-10"
          )}
        >
          <LogOut className="h-4 w-4" />
          {!collapsed && <span className="ml-2">Sign Out</span>}
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
};

export default AdminSidebar;
