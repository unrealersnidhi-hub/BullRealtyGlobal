import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, TrendingUp, Users, Phone, Target, Flame, CheckCircle, Clock, BarChart3 } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Legend } from "recharts";

interface CommandCentreProps {
  userId?: string;
  showAll?: boolean;
}

export const CommandCentre = ({ userId, showAll = false }: CommandCentreProps) => {
  const [isLoading, setIsLoading] = useState(true);
  const [leadsByStatus, setLeadsByStatus] = useState<any[]>([]);
  const [leadsBySource, setLeadsBySource] = useState<any[]>([]);
  const [callStats, setCallStats] = useState<any[]>([]);
  const [followUpStats, setFollowUpStats] = useState({ completed: 0, pending: 0, overdue: 0 });
  const [totals, setTotals] = useState({ leads: 0, calls: 0, conversions: 0, hotLeads: 0 });

  useEffect(() => {
    fetchData();
  }, [userId, showAll]);

  const fetchData = async () => {
    try {
      // Fetch leads
      let leadsQuery = supabase.from("leads").select("id, status, source, created_at, assigned_to");
      if (!showAll && userId) {
        leadsQuery = leadsQuery.eq("assigned_to", userId);
      }
      const { data: leads } = await leadsQuery;
      const allLeads = leads || [];

      // Status distribution
      const statusMap: Record<string, number> = {};
      allLeads.forEach(l => { statusMap[l.status] = (statusMap[l.status] || 0) + 1; });
      setLeadsByStatus(Object.entries(statusMap).map(([name, value]) => ({ name, value })));

      // Source distribution
      const sourceMap: Record<string, number> = {};
      allLeads.forEach(l => { sourceMap[l.source || "website"] = (sourceMap[l.source || "website"] || 0) + 1; });
      setLeadsBySource(Object.entries(sourceMap).map(([name, value]) => ({ name, value })));

      // Totals
      setTotals({
        leads: allLeads.length,
        conversions: allLeads.filter(l => l.status === "converted").length,
        hotLeads: allLeads.filter(l => l.status === "hot").length,
        calls: 0,
      });

      // Call stats
      let callQuery = supabase.from("call_logs").select("outcome, duration_seconds, created_at, user_id");
      if (!showAll && userId) {
        callQuery = callQuery.eq("user_id", userId);
      }
      const { data: calls } = await callQuery;
      const allCalls = calls || [];
      
      const outcomeMap: Record<string, number> = {};
      allCalls.forEach(c => { outcomeMap[c.outcome] = (outcomeMap[c.outcome] || 0) + 1; });
      setCallStats(Object.entries(outcomeMap).map(([name, value]) => ({ name: name.replace("_", " "), value })));
      setTotals(prev => ({ ...prev, calls: allCalls.length }));

      // Follow-up stats
      let fuQuery = supabase.from("follow_ups").select("completed, scheduled_at");
      if (!showAll && userId) {
        fuQuery = fuQuery.eq("user_id", userId);
      }
      const { data: followUps } = await fuQuery;
      const allFU = followUps || [];
      const now = new Date();
      setFollowUpStats({
        completed: allFU.filter(f => f.completed).length,
        pending: allFU.filter(f => !f.completed && new Date(f.scheduled_at) >= now).length,
        overdue: allFU.filter(f => !f.completed && new Date(f.scheduled_at) < now).length,
      });
    } catch (error) {
      console.error("Error fetching command centre data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const COLORS = ["#f59e0b", "#ef4444", "#3b82f6", "#10b981", "#8b5cf6", "#ec4899"];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-[hsl(var(--gold))]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <BarChart3 className="w-5 h-5 text-[hsl(var(--gold))]" />
        <h2 className="text-lg font-semibold">Command Centre</h2>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="border-border/50">
          <CardContent className="p-4 text-center">
            <Users className="w-5 h-5 mx-auto mb-1 text-[hsl(var(--gold))]" />
            <p className="text-2xl font-bold">{totals.leads}</p>
            <p className="text-xs text-muted-foreground">Total Leads</p>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-4 text-center">
            <Phone className="w-5 h-5 mx-auto mb-1 text-blue-500" />
            <p className="text-2xl font-bold">{totals.calls}</p>
            <p className="text-xs text-muted-foreground">Total Calls</p>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-4 text-center">
            <Flame className="w-5 h-5 mx-auto mb-1 text-red-500" />
            <p className="text-2xl font-bold">{totals.hotLeads}</p>
            <p className="text-xs text-muted-foreground">Hot Leads</p>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-4 text-center">
            <CheckCircle className="w-5 h-5 mx-auto mb-1 text-emerald-500" />
            <p className="text-2xl font-bold">{totals.conversions}</p>
            <p className="text-xs text-muted-foreground">Conversions</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Lead Status Chart */}
        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Lead Status Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            {leadsByStatus.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={leadsByStatus} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label={({ name, value }) => `${name}: ${value}`}>
                    {leadsByStatus.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">No data</p>
            )}
          </CardContent>
        </Card>

        {/* Lead Source Chart */}
        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Leads by Source</CardTitle>
          </CardHeader>
          <CardContent>
            {leadsBySource.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={leadsBySource}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="value" fill="hsl(var(--gold))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">No data</p>
            )}
          </CardContent>
        </Card>

        {/* Call Outcomes */}
        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Call Outcomes</CardTitle>
          </CardHeader>
          <CardContent>
            {callStats.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={callStats}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">No calls yet</p>
            )}
          </CardContent>
        </Card>

        {/* Follow-up Stats */}
        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Follow-up Status</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={[
                    { name: "Completed", value: followUpStats.completed },
                    { name: "Pending", value: followUpStats.pending },
                    { name: "Overdue", value: followUpStats.overdue },
                  ].filter(d => d.value > 0)}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={70}
                  label={({ name, value }) => `${name}: ${value}`}
                >
                  <Cell fill="#10b981" />
                  <Cell fill="#f59e0b" />
                  <Cell fill="#ef4444" />
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
