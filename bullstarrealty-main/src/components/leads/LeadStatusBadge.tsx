import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type LeadStatus = "new" | "warm" | "cold" | "hot" | "not_interested" | "converted";

interface LeadStatusBadgeProps {
  status: LeadStatus;
  className?: string;
}

const statusConfig: Record<LeadStatus, { label: string; className: string }> = {
  new: {
    label: "New",
    className: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  },
  warm: {
    label: "Warm",
    className: "bg-orange-500/10 text-orange-600 border-orange-500/20",
  },
  cold: {
    label: "Cold",
    className: "bg-slate-500/10 text-slate-600 border-slate-500/20",
  },
  hot: {
    label: "Hot",
    className: "bg-red-500/10 text-red-600 border-red-500/20",
  },
  not_interested: {
    label: "Not Interested",
    className: "bg-gray-500/10 text-gray-600 border-gray-500/20",
  },
  converted: {
    label: "Converted",
    className: "bg-green-500/10 text-green-600 border-green-500/20",
  },
};

export const LeadStatusBadge = ({ status, className }: LeadStatusBadgeProps) => {
  const config = statusConfig[status] || statusConfig.new;
  
  return (
    <Badge 
      variant="outline" 
      className={cn(config.className, "font-medium", className)}
    >
      {config.label}
    </Badge>
  );
};
