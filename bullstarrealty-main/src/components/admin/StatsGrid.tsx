import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { DashboardStatsCard } from "./DashboardStatsCard";

interface StatItem {
  label: string;
  value: number | string;
  icon: LucideIcon;
  color?: string;
  action?: () => void;
}

interface StatsGridProps {
  stats: StatItem[];
  columns?: number;
}

export const StatsGrid = ({ stats, columns = 6 }: StatsGridProps) => {
  const gridColsClass = {
    4: "grid-cols-2 sm:grid-cols-4",
    5: "grid-cols-2 sm:grid-cols-3 md:grid-cols-5",
    6: "grid-cols-2 sm:grid-cols-3 md:grid-cols-6",
    7: "grid-cols-2 sm:grid-cols-4 lg:grid-cols-7",
  }[columns] || "grid-cols-2 sm:grid-cols-3 md:grid-cols-6";

  return (
    <div className={cn("grid gap-3 md:gap-4 mb-6 md:mb-8", gridColsClass)}>
      {stats.map((stat) => (
        <DashboardStatsCard
          key={stat.label}
          label={stat.label}
          value={stat.value}
          icon={stat.icon}
          color={stat.color}
          action={stat.action}
        />
      ))}
    </div>
  );
};
