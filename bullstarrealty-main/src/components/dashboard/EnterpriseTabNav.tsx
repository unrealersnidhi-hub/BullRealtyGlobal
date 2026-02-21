import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface TabItem {
  value: string;
  label: string;
  icon: React.ElementType;
  badge?: number;
}

interface EnterpriseTabNavProps {
  activeTab: string;
  basePath: string;
  tabs: TabItem[];
  className?: string;
}

export const EnterpriseTabNav = ({ activeTab, basePath, tabs, className }: EnterpriseTabNavProps) => {
  const navigate = useNavigate();

  return (
    <div className={cn("enterprise-tab-nav mb-6 overflow-x-auto rounded-lg border border-border/70 bg-card p-2", className)}>
      <div className="flex w-max min-w-full flex-wrap gap-1.5">
        {tabs.map((tab) => (
          <button
            key={tab.value}
            type="button"
            onClick={() => navigate(`${basePath}?tab=${tab.value}`)}
            className={cn(
              "inline-flex items-center rounded-md border px-3 py-1.5 text-xs font-medium transition-colors md:text-sm",
              activeTab === tab.value
                ? "border-[hsl(var(--gold))]/40 bg-[hsl(var(--gold))]/15 text-foreground"
                : "border-border/60 bg-background text-muted-foreground hover:border-[hsl(var(--gold))]/30 hover:text-foreground"
            )}
          >
            <tab.icon className="mr-1.5 h-3.5 w-3.5 md:h-4 md:w-4" />
            <span>{tab.label}</span>
            {tab.badge ? (
              <Badge variant="secondary" className="ml-2 h-5 px-1.5 text-[10px]">
                {tab.badge}
              </Badge>
            ) : null}
          </button>
        ))}
      </div>
    </div>
  );
};

