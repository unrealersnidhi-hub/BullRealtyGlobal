import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  BarChart3, Phone, TrendingUp, Users, Flame, Clock,
  CheckCircle, Loader2, Trophy, ArrowUp, ArrowDown,
} from "lucide-react";

interface TeamMember {
  id: string;
  email: string;
  fullName: string | null;
  roles?: string[];
}

interface PerformanceBoardProps {
  teamMembers: TeamMember[];
}

interface MemberPerformance {
  member: TeamMember;
  totalLeads: number;
  hotLeads: number;
  convertedLeads: number;
  conversionRate: number;
  totalCalls: number;
  answeredCalls: number;
  avgCallDuration: number;
  followUpsCompleted: number;
  followUpsPending: number;
}

export const PerformanceBoard = ({ teamMembers }: PerformanceBoardProps) => {
  const [performances, setPerformances] = useState<MemberPerformance[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dateRange, setDateRange] = useState("month");
  const [activeView, setActiveView] = useState("overall");

  // Show ALL team members
  const salesTeam = teamMembers;

  useEffect(() => {
    fetchPerformanceData();
  }, [salesTeam.length, dateRange]);

  const getDateFilter = () => {
    const now = new Date();
    if (dateRange === "today") {
      return new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    } else if (dateRange === "week") {
      const d = new Date(now); d.setDate(d.getDate() - 7); return d.toISOString();
    } else if (dateRange === "month") {
      return new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    } else {
      const qStart = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
      return qStart.toISOString();
    }
  };

  const fetchPerformanceData = async () => {
    if (salesTeam.length === 0) { setIsLoading(false); return; }
    setIsLoading(true);
    const dateFrom = getDateFilter();

    try {
      // Fetch leads data
      const { data: leads } = await supabase
        .from("leads")
        .select("id, status, assigned_to, created_at")
        .gte("created_at", dateFrom);

      // Fetch call logs
      const { data: callLogs } = await supabase
        .from("call_logs")
        .select("user_id, outcome, duration_seconds, created_at")
        .gte("created_at", dateFrom);

      // Fetch follow-ups
      const { data: followUps } = await supabase
        .from("follow_ups")
        .select("user_id, completed, created_at")
        .gte("created_at", dateFrom);

      const perfData: MemberPerformance[] = salesTeam.map(member => {
        const memberLeads = (leads || []).filter(l => l.assigned_to === member.id);
        const memberCalls = (callLogs || []).filter(c => c.user_id === member.id);
        const memberFollowUps = (followUps || []).filter(f => f.user_id === member.id);

        const totalLeads = memberLeads.length;
        const hotLeads = memberLeads.filter(l => l.status === "hot").length;
        const convertedLeads = memberLeads.filter(l => l.status === "converted").length;
        const totalCalls = memberCalls.length;
        const answeredCalls = memberCalls.filter(c => c.outcome === "answered").length;
        const avgCallDuration = totalCalls > 0
          ? Math.round(memberCalls.reduce((sum, c) => sum + (c.duration_seconds || 0), 0) / totalCalls)
          : 0;

        return {
          member,
          totalLeads,
          hotLeads,
          convertedLeads,
          conversionRate: totalLeads > 0 ? Math.round((convertedLeads / totalLeads) * 100) : 0,
          totalCalls,
          answeredCalls,
          avgCallDuration,
          followUpsCompleted: memberFollowUps.filter(f => f.completed).length,
          followUpsPending: memberFollowUps.filter(f => !f.completed).length,
        };
      });

      setPerformances(perfData);
    } catch (error) {
      console.error("Error fetching performance data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const sortedByConversions = [...performances].sort((a, b) => b.convertedLeads - a.convertedLeads);
  const sortedByCalls = [...performances].sort((a, b) => b.totalCalls - a.totalCalls);
  const sortedByRate = [...performances].sort((a, b) => b.conversionRate - a.conversionRate);

  if (isLoading) {
    return <Card><CardContent className="p-6 flex justify-center"><Loader2 className="w-5 h-5 animate-spin" /></CardContent></Card>;
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-[hsl(var(--gold))]" />
          <h2 className="text-lg font-semibold">Performance Board</h2>
        </div>
        <Select value={dateRange} onValueChange={setDateRange}>
          <SelectTrigger className="w-[130px] h-9 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="today">Today</SelectItem>
            <SelectItem value="week">This Week</SelectItem>
            <SelectItem value="month">This Month</SelectItem>
            <SelectItem value="quarter">This Quarter</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="border-border/50">
          <CardContent className="p-3 text-center">
            <Users className="w-5 h-5 mx-auto mb-1 text-muted-foreground" />
            <p className="text-2xl font-bold">{performances.reduce((s, p) => s + p.totalLeads, 0)}</p>
            <p className="text-xs text-muted-foreground">Total Leads</p>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-3 text-center">
            <CheckCircle className="w-5 h-5 mx-auto mb-1 text-emerald-500" />
            <p className="text-2xl font-bold">{performances.reduce((s, p) => s + p.convertedLeads, 0)}</p>
            <p className="text-xs text-muted-foreground">Conversions</p>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-3 text-center">
            <Phone className="w-5 h-5 mx-auto mb-1 text-blue-500" />
            <p className="text-2xl font-bold">{performances.reduce((s, p) => s + p.totalCalls, 0)}</p>
            <p className="text-xs text-muted-foreground">Total Calls</p>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-3 text-center">
            <Flame className="w-5 h-5 mx-auto mb-1 text-red-500" />
            <p className="text-2xl font-bold">{performances.reduce((s, p) => s + p.hotLeads, 0)}</p>
            <p className="text-xs text-muted-foreground">Hot Leads</p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed View */}
      <Tabs value={activeView} onValueChange={setActiveView}>
        <TabsList className="bg-muted/50">
          <TabsTrigger value="overall">Overall</TabsTrigger>
          <TabsTrigger value="calls">Calling</TabsTrigger>
          <TabsTrigger value="conversions">Conversions</TabsTrigger>
        </TabsList>

        <TabsContent value="overall" className="mt-3">
          <ScrollArea className="max-h-[500px]">
            <div className="space-y-2">
              {sortedByRate.map((perf, i) => (
                <Card key={perf.member.id} className="border-border/50">
                  <CardContent className="p-3">
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-bold text-muted-foreground w-6 text-center">#{i + 1}</span>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{perf.member.fullName || perf.member.email}</p>
                        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                          <span>{perf.totalLeads} leads</span>
                          <span>{perf.convertedLeads} converted</span>
                          <span>{perf.totalCalls} calls</span>
                          <span>{perf.followUpsCompleted} follow-ups done</span>
                        </div>
                      </div>
                      <Badge variant={perf.conversionRate >= 20 ? "default" : "outline"} 
                        className={perf.conversionRate >= 20 ? "bg-emerald-500" : ""}>
                        {perf.conversionRate}%
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="calls" className="mt-3">
          <ScrollArea className="max-h-[500px]">
            <div className="space-y-2">
              {sortedByCalls.map((perf, i) => (
                <Card key={perf.member.id} className="border-border/50">
                  <CardContent className="p-3">
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-bold text-muted-foreground w-6 text-center">#{i + 1}</span>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{perf.member.fullName || perf.member.email}</p>
                        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                          <span>{perf.totalCalls} total</span>
                          <span>{perf.answeredCalls} answered</span>
                          <span>Avg {Math.floor(perf.avgCallDuration / 60)}m {perf.avgCallDuration % 60}s</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold">{perf.totalCalls}</p>
                        <p className="text-xs text-muted-foreground">calls</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="conversions" className="mt-3">
          <ScrollArea className="max-h-[500px]">
            <div className="space-y-2">
              {sortedByConversions.map((perf, i) => (
                <Card key={perf.member.id} className="border-border/50">
                  <CardContent className="p-3">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-sm font-bold text-muted-foreground w-6 text-center">#{i + 1}</span>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{perf.member.fullName || perf.member.email}</p>
                      </div>
                      <Badge variant="outline">{perf.convertedLeads}/{perf.totalLeads}</Badge>
                    </div>
                    <Progress value={perf.conversionRate} className="h-2" />
                    <p className="text-xs text-muted-foreground mt-1">{perf.conversionRate}% conversion rate</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  );
};
