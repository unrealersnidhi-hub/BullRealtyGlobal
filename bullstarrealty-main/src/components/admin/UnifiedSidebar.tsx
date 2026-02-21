import { useEffect, useMemo, useState } from "react";
import { useNavigate, useLocation, useSearchParams } from "react-router-dom";
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
  ClipboardList,
  TrendingUp,
  Calendar,
  Users,
  Plug,
  FileText,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Bell,
  FolderOpen,
  Calculator,
  BarChart3,
  MapPin,
  ClipboardEdit,
  Phone,
  FileSpreadsheet,
  UserCog,
  ClipboardCheck,
  Star,
  Building2,
  Shield,
  GripVertical,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { useSessionManagement } from "@/hooks/useSessionManagement";

interface UnifiedSidebarProps {
  userEmail?: string;
  userRoles: string[];
  userCountry?: "dubai" | "india" | null;
}

type MenuSection = "CRM" | "Management" | "Reports" | "HR" | "Content" | "Account";

interface MenuItem {
  id: string;
  title: string;
  tab?: string;
  path?: string;
  icon: React.ElementType;
  roles: string[];
  section: MenuSection;
}

const UnifiedSidebar = ({ userEmail, userRoles, userCountry }: UnifiedSidebarProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { state, toggleSidebar } = useSidebar();
  const collapsed = state === "collapsed";
  const { endSession } = useSessionManagement();

  const [customizeMode, setCustomizeMode] = useState(false);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [orderedIds, setOrderedIds] = useState<string[]>([]);
  const [collapsedSections, setCollapsedSections] = useState<Record<MenuSection, boolean>>({
    CRM: false,
    Management: false,
    Reports: false,
    HR: false,
    Content: false,
    Account: false,
  });

  const isAdmin = userRoles.includes("admin") || userRoles.includes("super_admin");
  const isSuperAdmin = userRoles.includes("super_admin");
  const isManager = userRoles.includes("manager");
  const isMIS = userRoles.includes("mis");
  const isTelesales = userRoles.includes("telesales");
  const isHR = userRoles.includes("hr");
  const isBlogWriter = userRoles.includes("blog_writer");
  const isSales = userRoles.includes("user");

  const currentTab = searchParams.get("tab") || "";
  const currentPath = location.pathname;

  const getRoleLabel = () => {
    if (isSuperAdmin) return "Super Admin";
    if (isAdmin) return "Admin";
    if (isManager) return "Manager";
    if (isMIS) return "MIS";
    if (isTelesales) return "Telesales";
    if (isHR) return "HR";
    if (isBlogWriter) return "Writer";
    if (isSales) return "Sales";
    return "User";
  };

  const getBasePath = () => {
    if (isAdmin) return "/admin/dashboard";
    if (isManager) return "/manager/dashboard";
    if (isMIS) return "/mis/dashboard";
    if (isTelesales) return "/telesales/dashboard";
    if (isHR) return "/hr/dashboard";
    return "/user/dashboard";
  };

  const storageKey = `sidebar_order_${getBasePath()}_${getRoleLabel().replace(/\s+/g, "_").toLowerCase()}`;

  const allItems: MenuItem[] = [
    { id: "crm_leads", title: "Leads", tab: "leads", icon: ClipboardList, roles: ["admin", "super_admin", "manager", "telesales", "user"], section: "CRM" },
    { id: "crm_funnel", title: "Funnel", tab: "funnel", icon: TrendingUp, roles: ["admin", "super_admin", "manager", "mis"], section: "CRM" },
    { id: "crm_followups", title: "Follow-ups", tab: "calendar", icon: Calendar, roles: ["admin", "super_admin", "manager", "telesales", "user"], section: "CRM" },
    { id: "crm_calls", title: "Calls", tab: "calls", icon: Phone, roles: ["telesales", "user", "manager", "mis"], section: "CRM" },

    { id: "mgmt_team", title: "Team", tab: "team", icon: Users, roles: ["admin", "super_admin", "manager"], section: "Management" },
    { id: "mgmt_sessions", title: "Sessions", tab: "sessions", icon: Shield, roles: ["admin", "super_admin"], section: "Management" },
    { id: "mgmt_location", title: "Location", tab: "location", icon: MapPin, roles: ["admin", "super_admin", "manager"], section: "Management" },
    { id: "mgmt_integrations", title: "Integrations", tab: "integrations", icon: Plug, roles: ["admin", "super_admin"], section: "Management" },
    { id: "mgmt_notifications", title: "Notifications", tab: "notifications", icon: Bell, roles: ["admin", "super_admin"], section: "Management" },
    { id: "mgmt_documents", title: "Documents", tab: "documents", icon: FolderOpen, roles: ["admin", "super_admin", "manager", "user"], section: "Management" },
    { id: "mgmt_quotations", title: "Quotations", tab: "quotations", icon: Calculator, roles: ["admin", "super_admin", "manager", "user"], section: "Management" },
    { id: "mgmt_reports", title: "Reports", tab: "reports", icon: BarChart3, roles: ["admin", "super_admin", "mis"], section: "Management" },
    { id: "mgmt_requests", title: "Requests", tab: "requests", icon: ClipboardEdit, roles: ["admin", "super_admin"], section: "Management" },

    { id: "mis_reports", title: "Reports", tab: "reports", icon: FileSpreadsheet, roles: ["mis"], section: "Reports" },
    { id: "mis_calls", title: "Call Stats", tab: "calls", icon: Phone, roles: ["mis"], section: "Reports" },
    { id: "mis_funnel", title: "Lead Funnel", tab: "funnel", icon: TrendingUp, roles: ["mis"], section: "Reports" },

    { id: "hr_employees", title: "Employees", tab: "employees", path: "/hr/dashboard?tab=employees", icon: Users, roles: ["hr", "admin", "super_admin"], section: "HR" },
    { id: "hr_leave", title: "Leave", tab: "leave", path: "/hr/dashboard?tab=leave", icon: Calendar, roles: ["hr", "admin", "super_admin"], section: "HR" },
    { id: "hr_attendance", title: "Attendance", tab: "attendance", path: "/hr/dashboard?tab=attendance", icon: ClipboardCheck, roles: ["hr", "admin", "super_admin"], section: "HR" },
    { id: "hr_performance", title: "Performance", tab: "performance", path: "/hr/dashboard?tab=performance", icon: Star, roles: ["hr", "admin", "super_admin"], section: "HR" },

    { id: "content_blog", title: "Blog Posts", path: "/admin/blog", icon: FileText, roles: ["admin", "super_admin", "blog_writer"], section: "Content" },
    { id: "account_profile", title: "My Profile", tab: "profile", icon: UserCog, roles: [], section: "Account" },
  ];

  const hasAccess = (item: MenuItem) => item.roles.length === 0 || item.roles.some((role) => userRoles.includes(role));

  const visibleItems = useMemo(() => {
    return allItems.filter((item) => {
      if (!hasAccess(item)) return false;
      if (item.section === "Management" && !isAdmin) return false;
      if (item.section === "CRM" && !(isAdmin || isManager || isTelesales || isSales)) return false;
      if (item.section === "Reports" && !isMIS) return false;
      if (item.section === "HR" && !(isHR || isAdmin)) return false;
      return true;
    });
  }, [isAdmin, isManager, isTelesales, isSales, isMIS, isHR, userRoles]);

  useEffect(() => {
    const stored = localStorage.getItem(storageKey);
    const visibleIds = visibleItems.map((i) => i.id);

    if (!stored) {
      setOrderedIds(visibleIds);
      return;
    }

    const parsed = JSON.parse(stored) as string[];
    const kept = parsed.filter((id) => visibleIds.includes(id));
    const missing = visibleIds.filter((id) => !kept.includes(id));
    setOrderedIds([...kept, ...missing]);
  }, [storageKey, visibleItems]);

  useEffect(() => {
    if (orderedIds.length > 0) localStorage.setItem(storageKey, JSON.stringify(orderedIds));
  }, [orderedIds, storageKey]);

  const orderedItems = useMemo(() => {
    const map = new Map(visibleItems.map((item) => [item.id, item]));
    return orderedIds.map((id) => map.get(id)).filter(Boolean) as MenuItem[];
  }, [orderedIds, visibleItems]);

  const groupedItems = useMemo(() => {
    const groups: Record<MenuSection, MenuItem[]> = {
      CRM: [],
      Management: [],
      Reports: [],
      HR: [],
      Content: [],
      Account: [],
    };
    orderedItems.forEach((item) => groups[item.section].push(item));
    return groups;
  }, [orderedItems]);

  const handleLogout = async () => {
    await endSession();
    await supabase.auth.signOut();
    navigate("/admin");
  };

  const handleNavigation = (item: MenuItem) => {
    if (item.path) navigate(item.path);
    else if (item.tab) navigate(`${getBasePath()}?tab=${item.tab}`);
  };

  const isActive = (item: MenuItem) => {
    if (item.path) {
      const [itemPath, itemQuery] = item.path.split("?");
      if (currentPath !== itemPath) return false;
      if (itemQuery) {
        const itemTab = new URLSearchParams(itemQuery).get("tab");
        return currentTab === itemTab;
      }
      return !currentTab;
    }
    if (item.tab) return currentPath === getBasePath() && currentTab === item.tab;
    return false;
  };

  const onDrop = (targetId: string) => {
    if (!draggedId || draggedId === targetId) return;
    const next = [...orderedIds];
    const from = next.indexOf(draggedId);
    const to = next.indexOf(targetId);
    if (from < 0 || to < 0) return;
    next.splice(from, 1);
    next.splice(to, 0, draggedId);
    setOrderedIds(next);
    setDraggedId(null);
  };

  const renderSection = (section: MenuSection) => {
    const items = groupedItems[section] || [];
    if (items.length === 0) return null;

    return (
      <SidebarGroup key={section}>
        {!collapsed && (
          <SidebarGroupLabel
            className="mb-2 cursor-pointer px-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70"
            onClick={() => setCollapsedSections((s) => ({ ...s, [section]: !s[section] }))}
          >
            {section}
          </SidebarGroupLabel>
        )}
        {!collapsedSections[section] && (
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.id}>
                  <SidebarMenuButton
                    draggable={customizeMode && !collapsed}
                    onDragStart={() => setDraggedId(item.id)}
                    onDragOver={(e) => customizeMode && e.preventDefault()}
                    onDrop={() => customizeMode && onDrop(item.id)}
                    onClick={() => !customizeMode && handleNavigation(item)}
                    className={cn(
                      "group flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 transition-all duration-200",
                      collapsed && "justify-center px-2",
                      customizeMode && "border border-dashed border-border/60",
                      isActive(item)
                        ? "border border-[hsl(var(--gold))]/20 bg-[hsl(var(--gold))]/10 text-[hsl(var(--gold))] shadow-sm"
                        : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                    )}
                  >
                    {customizeMode && !collapsed && <GripVertical className="h-3.5 w-3.5 text-muted-foreground" />}
                    <item.icon
                      className={cn(
                        "h-5 w-5 shrink-0 transition-colors",
                        isActive(item) ? "text-[hsl(var(--gold))]" : "group-hover:text-[hsl(var(--gold))]"
                      )}
                    />
                    {!collapsed && <span className="text-sm font-medium">{item.title}</span>}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        )}
      </SidebarGroup>
    );
  };

  return (
    <Sidebar
      className={cn(
        "border-r border-border/70 bg-card transition-all duration-300",
        collapsed ? "w-16" : "w-64"
      )}
      collapsible="icon"
    >
      <SidebarHeader className="border-b border-border/70 p-4">
        <div className="flex items-center justify-between">
          {!collapsed && (
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[hsl(var(--gold))] to-[hsl(var(--gold-light))] shadow-lg shadow-[hsl(var(--gold))]/20">
                <Building2 className="h-5 w-5 text-[hsl(var(--charcoal))]" />
              </div>
              <div>
                <h2 className="text-base font-bold tracking-tight">
                  {userCountry === "india" ? "Bull Realty Global" : "Bull Star Realty"}
                </h2>
                <div className="flex items-center gap-1.5">
                  <Badge variant="secondary" className="px-1.5 py-0 text-[9px]">
                    {getRoleLabel()}
                  </Badge>
                </div>
              </div>
            </div>
          )}
          {collapsed && (
            <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[hsl(var(--gold))] to-[hsl(var(--gold-light))] shadow-lg shadow-[hsl(var(--gold))]/20">
              <Building2 className="h-5 w-5 text-[hsl(var(--charcoal))]" />
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className="px-2 py-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={toggleSidebar}
          className={cn("mb-2 w-full text-muted-foreground hover:bg-accent/50 hover:text-foreground", collapsed && "px-0")}
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <>
              <ChevronLeft className="mr-2 h-4 w-4" />
              <span>Collapse</span>
            </>
          )}
        </Button>

        {!collapsed && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCustomizeMode((v) => !v)}
            className="mb-3 w-full"
          >
            {customizeMode ? "Done Arranging" : "Arrange Menu"}
          </Button>
        )}

        {renderSection("CRM")}
        {renderSection("Management")}
        {renderSection("Reports")}
        {renderSection("HR")}
        {renderSection("Content")}
        {renderSection("Account")}
      </SidebarContent>

      <SidebarFooter className="border-t border-border/70 p-4">
        {!collapsed && userEmail && (
          <div className="mb-3 px-2">
            <p className="truncate text-xs text-muted-foreground">{userEmail}</p>
          </div>
        )}
        <Button
          variant="ghost"
          size={collapsed ? "icon" : "default"}
          onClick={handleLogout}
          className={cn(
            "w-full text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive",
            collapsed && "h-10 w-10"
          )}
        >
          <LogOut className="h-4 w-4" />
          {!collapsed && <span className="ml-2">Sign Out</span>}
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
};

export default UnifiedSidebar;
