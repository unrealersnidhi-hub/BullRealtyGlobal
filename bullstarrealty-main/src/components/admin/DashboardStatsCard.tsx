import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";

interface DashboardStatsCardProps {
  label: string;
  value: number | string;
  icon: LucideIcon;
  color?: string;
  trend?: { value: number; isPositive: boolean };
  action?: () => void;
  className?: string;
}

export const DashboardStatsCard = ({
  label,
  value,
  icon: Icon,
  color,
  trend,
  action,
  className,
}: DashboardStatsCardProps) => {
  const Wrapper = action ? "button" : "div";

  return (
    <Wrapper
      onClick={action}
      className={cn(
        "w-full text-left",
        action && "focus:outline-none focus:ring-2 focus:ring-[hsl(var(--gold))]/50 rounded-2xl"
      )}
    >
      <Card
        className={cn(
          "relative overflow-hidden rounded-lg p-4 transition-all duration-200 border border-border/70",
          "bg-card",
          action && "hover:shadow-md hover:border-[hsl(var(--gold))]/35 cursor-pointer group",
          className
        )}
      >
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-[hsl(var(--gold))]/50 to-transparent pointer-events-none" />
        
        <div className="relative flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-2xl md:text-[28px] font-semibold tracking-tight">{value}</p>
            <p className="text-xs md:text-sm text-muted-foreground mt-1 truncate">{label}</p>
            {trend && (
              <div className={cn(
                "flex items-center gap-1 mt-2 text-xs font-medium",
                trend.isPositive ? "text-emerald-600" : "text-red-500"
              )}>
                <span>{trend.isPositive ? "↑" : "↓"} {Math.abs(trend.value)}%</span>
                <span className="text-muted-foreground">vs last week</span>
              </div>
            )}
          </div>
          <div className={cn(
            "w-11 h-11 md:w-12 md:h-12 rounded-xl flex items-center justify-center shrink-0 transition-all duration-300",
            "bg-muted",
            action && "group-hover:bg-[hsl(var(--gold))]/10"
          )}>
            <Icon className={cn(
              "w-5 h-5 md:w-6 md:h-6 transition-colors",
              color || "text-[hsl(var(--gold))]"
            )} />
          </div>
        </div>
      </Card>
    </Wrapper>
  );
};
