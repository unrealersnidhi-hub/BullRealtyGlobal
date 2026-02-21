import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Tabs } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ChevronDown,
  LayoutDashboard,
  ClipboardList,
  TrendingUp,
  Calendar,
  Users,
  MapPin,
  FolderOpen,
  Calculator,
  Plug,
  Activity,
  Bell,
  ClipboardCheck,
  BarChart3,
  PhoneCall,
  Target,
  Shield,
  UserCog,
} from "lucide-react";

interface TabNavigationProps {
  activeTab: string;
  className?: string;
}

type NavTab = {
  value: string;
  label: string;
  icon: React.ElementType;
};

type NavGroup = {
  title: string;
  tabs: NavTab[];
};

const navGroups: NavGroup[] = [
  {
    title: "Dashboard",
    tabs: [
      { value: "executive", label: "Executive", icon: LayoutDashboard },
      { value: "leads", label: "Leads", icon: ClipboardList },
      { value: "funnel", label: "Funnel", icon: TrendingUp },
      { value: "calendar", label: "Follow-ups", icon: Calendar },
      { value: "calling", label: "Calling", icon: PhoneCall },
    ],
  },
  {
    title: "Operations",
    tabs: [
      { value: "team", label: "Team", icon: Users },
      { value: "location", label: "Location", icon: MapPin },
      { value: "documents", label: "Documents", icon: FolderOpen },
      { value: "quotations", label: "Quotations", icon: Calculator },
      { value: "requests", label: "Requests", icon: ClipboardCheck },
    ],
  },
  {
    title: "Control",
    tabs: [
      { value: "integrations", label: "Integrations", icon: Plug },
      { value: "analytics", label: "Analytics", icon: Activity },
      { value: "notifications", label: "Notifications", icon: Bell },
      { value: "reports", label: "Reports", icon: BarChart3 },
      { value: "targets", label: "Targets", icon: Target },
      { value: "performance", label: "Performance", icon: Activity },
      { value: "sessions", label: "Sessions", icon: Shield },
      { value: "profile", label: "Profile", icon: UserCog },
    ],
  },
];

export const TabNavigation = ({ activeTab, className }: TabNavigationProps) => {
  const navigate = useNavigate();

  const activeTabLabel = useMemo(() => {
    for (const group of navGroups) {
      const tab = group.tabs.find((t) => t.value === activeTab);
      if (tab) return `${group.title} / ${tab.label}`;
    }
    return "Select Module";
  }, [activeTab]);

  return (
    <div className={cn("pb-2", className)}>
      <Tabs value={activeTab}>
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border/70 bg-card p-2 shadow-sm">
          <div className="mr-1 rounded-md border border-[hsl(var(--gold))]/35 bg-[hsl(var(--gold))]/10 px-2.5 py-1 text-xs font-medium text-foreground">
            {activeTabLabel}
          </div>

          {navGroups.map((group) => (
            <DropdownMenu key={group.title}>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 border-border/70 bg-background">
                  {group.title}
                  <ChevronDown className="ml-1 h-3.5 w-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-56 border-border/70">
                <DropdownMenuLabel className="text-xs uppercase tracking-wide text-muted-foreground">
                  {group.title}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {group.tabs.map((tab) => (
                  <DropdownMenuItem
                    key={tab.value}
                    onClick={() => navigate(`/admin/dashboard?tab=${tab.value}`)}
                    className={cn(
                      "cursor-pointer",
                      activeTab === tab.value && "bg-[hsl(var(--gold))]/10 text-foreground"
                    )}
                  >
                    <tab.icon className="mr-2 h-4 w-4" />
                    {tab.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          ))}
        </div>
      </Tabs>
    </div>
  );
};

