import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { type LeadStatus } from "./LeadStatusBadge";
import { cn } from "@/lib/utils";
import { TrendingDown, TrendingUp, Users } from "lucide-react";

interface Lead {
  id: string;
  status: LeadStatus;
  created_at: string;
}

interface LeadFunnelProps {
  leads: Lead[];
}

interface FunnelStage {
  status: LeadStatus;
  label: string;
  color: string;
  bgColor: string;
  count: number;
  percentage: number;
}

export const LeadFunnel = ({ leads }: LeadFunnelProps) => {
  const funnelData = useMemo(() => {
    const statusCounts: Record<LeadStatus, number> = {
      new: 0,
      warm: 0,
      hot: 0,
      cold: 0,
      not_interested: 0,
      converted: 0,
    };

    leads.forEach((lead) => {
      if (lead.status in statusCounts) {
        statusCounts[lead.status]++;
      }
    });

    const total = leads.length || 1;

    // Main funnel stages (positive progression)
    const mainStages: FunnelStage[] = [
      {
        status: "new",
        label: "New Leads",
        color: "text-blue-600",
        bgColor: "bg-blue-500",
        count: statusCounts.new,
        percentage: (statusCounts.new / total) * 100,
      },
      {
        status: "warm",
        label: "Warm",
        color: "text-orange-600",
        bgColor: "bg-orange-500",
        count: statusCounts.warm,
        percentage: (statusCounts.warm / total) * 100,
      },
      {
        status: "hot",
        label: "Hot",
        color: "text-red-600",
        bgColor: "bg-red-500",
        count: statusCounts.hot,
        percentage: (statusCounts.hot / total) * 100,
      },
      {
        status: "converted",
        label: "Converted",
        color: "text-green-600",
        bgColor: "bg-green-500",
        count: statusCounts.converted,
        percentage: (statusCounts.converted / total) * 100,
      },
    ];

    // Exit stages (negative outcomes)
    const exitStages: FunnelStage[] = [
      {
        status: "cold",
        label: "Cold",
        color: "text-slate-600",
        bgColor: "bg-slate-500",
        count: statusCounts.cold,
        percentage: (statusCounts.cold / total) * 100,
      },
      {
        status: "not_interested",
        label: "Not Interested",
        color: "text-gray-600",
        bgColor: "bg-gray-500",
        count: statusCounts.not_interested,
        percentage: (statusCounts.not_interested / total) * 100,
      },
    ];

    const conversionRate = total > 0 
      ? ((statusCounts.converted / total) * 100).toFixed(1)
      : "0";

    const activeLeads = statusCounts.new + statusCounts.warm + statusCounts.hot;
    const lostLeads = statusCounts.cold + statusCounts.not_interested;

    return { mainStages, exitStages, conversionRate, activeLeads, lostLeads, total };
  }, [leads]);

  const maxCount = Math.max(...funnelData.mainStages.map((s) => s.count), 1);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Main Funnel Visualization */}
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-gold" />
            Lead Conversion Funnel
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {funnelData.mainStages.map((stage, index) => {
              const widthPercent = Math.max((stage.count / maxCount) * 100, 10);
              const isLast = index === funnelData.mainStages.length - 1;
              
              return (
                <div key={stage.status} className="relative">
                  {/* Connector arrow */}
                  {index > 0 && (
                    <div className="absolute -top-2 left-1/2 transform -translate-x-1/2 text-muted-foreground/30">
                      <svg width="24" height="12" viewBox="0 0 24 12">
                        <path d="M12 12L0 0h24z" fill="currentColor" />
                      </svg>
                    </div>
                  )}
                  
                  <div className="flex items-center gap-4">
                    <div className="w-28 text-right">
                      <span className={cn("text-sm font-medium", stage.color)}>
                        {stage.label}
                      </span>
                    </div>
                    
                    <div className="flex-1 relative">
                      <div 
                        className={cn(
                          "h-12 rounded-lg transition-all duration-500 flex items-center justify-center relative overflow-hidden",
                          stage.bgColor
                        )}
                        style={{ 
                          width: `${widthPercent}%`,
                          clipPath: isLast 
                            ? "polygon(0 0, 100% 0, 100% 100%, 0 100%)" 
                            : "polygon(0 0, 95% 0, 100% 50%, 95% 100%, 0 100%)"
                        }}
                      >
                        {/* Shimmer effect */}
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full animate-shimmer" />
                        
                        <span className="text-white font-bold text-lg relative z-10">
                          {stage.count}
                        </span>
                      </div>
                    </div>
                    
                    <div className="w-16 text-right">
                      <span className="text-sm text-muted-foreground">
                        {stage.percentage.toFixed(0)}%
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          
          {/* Funnel flow indicators */}
          <div className="mt-8 pt-6 border-t border-border">
            <div className="flex items-center justify-center gap-8 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-green-500" />
                <span className="text-muted-foreground">Conversion Path</span>
              </div>
              <div className="flex items-center gap-2">
                <TrendingDown className="w-4 h-4 text-muted-foreground" />
                <span className="text-muted-foreground">
                  {funnelData.lostLeads} leads exited funnel
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="space-y-4">
        {/* Conversion Rate */}
        <Card className="bg-gradient-to-br from-green-500/10 to-green-600/5 border-green-500/20">
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-4xl font-bold text-green-600">
                {funnelData.conversionRate}%
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Conversion Rate
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Active Leads */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-accent-soft flex items-center justify-center">
                <Users className="w-6 h-6 text-gold" />
              </div>
              <div>
                <p className="text-2xl font-bold">{funnelData.activeLeads}</p>
                <p className="text-sm text-muted-foreground">Active in Pipeline</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Exit Stages */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Exited Leads
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {funnelData.exitStages.map((stage) => (
              <div key={stage.status} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={cn("w-2 h-2 rounded-full", stage.bgColor)} />
                  <span className="text-sm">{stage.label}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-medium">{stage.count}</span>
                  <span className="text-xs text-muted-foreground">
                    ({stage.percentage.toFixed(0)}%)
                  </span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Total Leads */}
        <Card className="bg-muted/50">
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-3xl font-bold">{funnelData.total}</p>
              <p className="text-sm text-muted-foreground mt-1">Total Leads</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
