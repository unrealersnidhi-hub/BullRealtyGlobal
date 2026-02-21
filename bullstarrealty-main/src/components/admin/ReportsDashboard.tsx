import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  BarChart3,
  TrendingUp,
  Users,
  Calendar,
  Download,
  Loader2,
  FileText,
  Target,
  Flame,
  CheckCircle,
  Clock,
  PieChart,
} from "lucide-react";
import { format, subDays, startOfMonth, endOfMonth, parseISO } from "date-fns";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend,
} from "recharts";

interface Lead {
  id: string;
  status: string;
  source: string | null;
  assigned_to: string | null;
  created_at: string;
}

interface FollowUp {
  id: string;
  completed: boolean;
  scheduled_at: string;
  user_id: string;
}

interface Quotation {
  id: string;
  status: string;
  total_amount: number;
  created_by: string;
  created_at: string;
}

interface TeamMember {
  id: string;
  email: string;
  fullName: string | null;
}

const COLORS = ["#C5A572", "#4CAF50", "#2196F3", "#FF9800", "#E91E63", "#9C27B0"];

export const ReportsDashboard = () => {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [followUps, setFollowUps] = useState<FollowUp[]>([]);
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dateRange, setDateRange] = useState({
    start: format(subDays(new Date(), 30), "yyyy-MM-dd"),
    end: format(new Date(), "yyyy-MM-dd"),
  });

  useEffect(() => {
    fetchData();
  }, [dateRange]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [leadsRes, followUpsRes, quotationsRes, teamRes] = await Promise.all([
        supabase
          .from("leads")
          .select("id, status, source, assigned_to, created_at")
          .gte("created_at", dateRange.start)
          .lte("created_at", dateRange.end + "T23:59:59"),
        supabase
          .from("follow_ups")
          .select("id, completed, scheduled_at, user_id")
          .gte("scheduled_at", dateRange.start)
          .lte("scheduled_at", dateRange.end + "T23:59:59"),
        supabase
          .from("quotations")
          .select("id, status, total_amount, created_by, created_at")
          .gte("created_at", dateRange.start)
          .lte("created_at", dateRange.end + "T23:59:59"),
        supabase.functions.invoke("list-team-members"),
      ]);

      if (leadsRes.error) throw leadsRes.error;
      if (followUpsRes.error) throw followUpsRes.error;
      if (quotationsRes.error) throw quotationsRes.error;

      setLeads(leadsRes.data || []);
      setFollowUps(followUpsRes.data || []);
      setQuotations(quotationsRes.data || []);
      setTeamMembers(teamRes.data?.users || []);
    } catch (error) {
      console.error("Error fetching report data:", error);
      toast.error("Failed to load report data");
    } finally {
      setIsLoading(false);
    }
  };

  // Lead Analytics Data
  const leadsByStatus = [
    { name: "New", value: leads.filter(l => l.status === "new").length, color: "#C5A572" },
    { name: "Hot", value: leads.filter(l => l.status === "hot").length, color: "#E91E63" },
    { name: "Warm", value: leads.filter(l => l.status === "warm").length, color: "#FF9800" },
    { name: "Cold", value: leads.filter(l => l.status === "cold").length, color: "#2196F3" },
    { name: "Converted", value: leads.filter(l => l.status === "converted").length, color: "#4CAF50" },
    { name: "Not Interested", value: leads.filter(l => l.status === "not_interested").length, color: "#9E9E9E" },
  ].filter(item => item.value > 0);

  const leadsBySource = Object.entries(
    leads.reduce((acc, lead) => {
      const source = lead.source || "website";
      acc[source] = (acc[source] || 0) + 1;
      return acc;
    }, {} as Record<string, number>)
  ).map(([name, value]) => ({ name: name.replace("-", " "), value }));

  // Team Performance Data
  const teamPerformance = teamMembers.map(member => {
    const assignedLeads = leads.filter(l => l.assigned_to === member.id);
    const completedFollowUps = followUps.filter(f => f.user_id === member.id && f.completed);
    const pendingFollowUps = followUps.filter(f => f.user_id === member.id && !f.completed);
    const memberQuotes = quotations.filter(q => q.created_by === member.id);

    return {
      name: member.fullName || member.email?.split("@")[0] || "Unknown",
      leads: assignedLeads.length,
      converted: assignedLeads.filter(l => l.status === "converted").length,
      followUpsCompleted: completedFollowUps.length,
      followUpsPending: pendingFollowUps.length,
      quotations: memberQuotes.length,
      quoteValue: memberQuotes.reduce((sum, q) => sum + q.total_amount, 0),
    };
  }).filter(m => m.leads > 0 || m.followUpsCompleted > 0 || m.quotations > 0);

  // Sales Performance Data
  const quotationsByStatus = [
    { name: "Draft", value: quotations.filter(q => q.status === "draft").length },
    { name: "Sent", value: quotations.filter(q => q.status === "sent").length },
    { name: "Accepted", value: quotations.filter(q => q.status === "accepted").length },
    { name: "Rejected", value: quotations.filter(q => q.status === "rejected").length },
  ].filter(item => item.value > 0);

  const totalQuoteValue = quotations.reduce((sum, q) => sum + q.total_amount, 0);
  const acceptedQuoteValue = quotations
    .filter(q => q.status === "accepted")
    .reduce((sum, q) => sum + q.total_amount, 0);
  const conversionRate = leads.length > 0
    ? ((leads.filter(l => l.status === "converted").length / leads.length) * 100).toFixed(1)
    : "0";

  // Daily lead trend
  const dailyLeads = leads.reduce((acc, lead) => {
    const date = format(parseISO(lead.created_at), "MMM d");
    acc[date] = (acc[date] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const leadTrend = Object.entries(dailyLeads)
    .map(([date, count]) => ({ date, leads: count }))
    .slice(-14); // Last 14 days

  const exportReport = (reportType: string) => {
    let csvContent = "";
    let fileName = "";

    switch (reportType) {
      case "leads":
        csvContent = "Status,Source,Count\n";
        leadsByStatus.forEach(item => {
          csvContent += `${item.name},All Sources,${item.value}\n`;
        });
        leadsBySource.forEach(item => {
          csvContent += `All Statuses,${item.name},${item.value}\n`;
        });
        fileName = `lead_analytics_${format(new Date(), "yyyy-MM-dd")}.csv`;
        break;

      case "team":
        csvContent = "Team Member,Assigned Leads,Converted,Follow-ups Done,Pending,Quotations,Quote Value\n";
        teamPerformance.forEach(member => {
          csvContent += `${member.name},${member.leads},${member.converted},${member.followUpsCompleted},${member.followUpsPending},${member.quotations},${member.quoteValue}\n`;
        });
        fileName = `team_performance_${format(new Date(), "yyyy-MM-dd")}.csv`;
        break;

      case "sales":
        csvContent = "Quote Status,Count\n";
        quotationsByStatus.forEach(item => {
          csvContent += `${item.name},${item.value}\n`;
        });
        csvContent += `\nTotal Quote Value,${totalQuoteValue}\n`;
        csvContent += `Accepted Value,${acceptedQuoteValue}\n`;
        fileName = `sales_report_${format(new Date(), "yyyy-MM-dd")}.csv`;
        break;
    }

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast.success("Report exported successfully");
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="w-8 h-8 animate-spin text-gold" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Date Range Filter */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-end gap-4">
            <div>
              <Label>Start Date</Label>
              <Input
                type="date"
                value={dateRange.start}
                onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                className="w-[160px]"
              />
            </div>
            <div>
              <Label>End Date</Label>
              <Input
                type="date"
                value={dateRange.end}
                onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                className="w-[160px]"
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDateRange({
                  start: format(subDays(new Date(), 7), "yyyy-MM-dd"),
                  end: format(new Date(), "yyyy-MM-dd"),
                })}
              >
                Last 7 Days
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDateRange({
                  start: format(subDays(new Date(), 30), "yyyy-MM-dd"),
                  end: format(new Date(), "yyyy-MM-dd"),
                })}
              >
                Last 30 Days
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDateRange({
                  start: format(startOfMonth(new Date()), "yyyy-MM-dd"),
                  end: format(endOfMonth(new Date()), "yyyy-MM-dd"),
                })}
              >
                This Month
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gold/10 flex items-center justify-center">
                <Target className="w-5 h-5 text-gold" />
              </div>
              <div>
                <p className="text-2xl font-semibold">{leads.length}</p>
                <p className="text-xs text-muted-foreground">Total Leads</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-red-500/10 flex items-center justify-center">
                <Flame className="w-5 h-5 text-red-500" />
              </div>
              <div>
                <p className="text-2xl font-semibold">{leads.filter(l => l.status === "hot").length}</p>
                <p className="text-xs text-muted-foreground">Hot Leads</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-semibold">{conversionRate}%</p>
                <p className="text-xs text-muted-foreground">Conversion Rate</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <FileText className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-semibold">{quotations.length}</p>
                <p className="text-xs text-muted-foreground">Quotations</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-purple-500" />
              </div>
              <div>
                <p className="text-lg font-semibold">AED {(totalQuoteValue / 1000000).toFixed(1)}M</p>
                <p className="text-xs text-muted-foreground">Quote Value</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-orange-500/10 flex items-center justify-center">
                <Clock className="w-5 h-5 text-orange-500" />
              </div>
              <div>
                <p className="text-2xl font-semibold">{followUps.filter(f => f.completed).length}</p>
                <p className="text-xs text-muted-foreground">Follow-ups Done</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Report Tabs */}
      <Tabs defaultValue="leads" className="space-y-6">
        <TabsList className="bg-background border">
          <TabsTrigger value="leads" className="data-[state=active]:bg-gold data-[state=active]:text-charcoal">
            <BarChart3 className="w-4 h-4 mr-2" />
            Lead Analytics
          </TabsTrigger>
          <TabsTrigger value="team" className="data-[state=active]:bg-gold data-[state=active]:text-charcoal">
            <Users className="w-4 h-4 mr-2" />
            Team Activity
          </TabsTrigger>
          <TabsTrigger value="sales" className="data-[state=active]:bg-gold data-[state=active]:text-charcoal">
            <TrendingUp className="w-4 h-4 mr-2" />
            Sales Performance
          </TabsTrigger>
        </TabsList>

        {/* Lead Analytics */}
        <TabsContent value="leads" className="space-y-6">
          <div className="flex justify-end">
            <Button variant="outline" onClick={() => exportReport("leads")}>
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Leads by Status</CardTitle>
              </CardHeader>
              <CardContent>
                {leadsByStatus.length > 0 ? (
                  <ResponsiveContainer width="100%" height={250}>
                    <RechartsPieChart>
                      <Pie
                        data={leadsByStatus}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={90}
                        paddingAngle={5}
                        dataKey="value"
                        label={({ name, value }) => `${name}: ${value}`}
                      >
                        {leadsByStatus.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </RechartsPieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                    No data available
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Leads by Source</CardTitle>
              </CardHeader>
              <CardContent>
                {leadsBySource.length > 0 ? (
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={leadsBySource}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="name" className="text-xs" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="value" fill="#C5A572" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                    No data available
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Lead Trend</CardTitle>
            </CardHeader>
            <CardContent>
              {leadTrend.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={leadTrend}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="date" className="text-xs" />
                    <YAxis />
                    <Tooltip />
                    <Line
                      type="monotone"
                      dataKey="leads"
                      stroke="#C5A572"
                      strokeWidth={2}
                      dot={{ fill: "#C5A572" }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                  No data available
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Team Activity */}
        <TabsContent value="team" className="space-y-6">
          <div className="flex justify-end">
            <Button variant="outline" onClick={() => exportReport("team")}>
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Team Performance</CardTitle>
              <CardDescription>Leads assigned, conversions, and follow-up completion</CardDescription>
            </CardHeader>
            <CardContent>
              {teamPerformance.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={teamPerformance} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis type="number" />
                    <YAxis dataKey="name" type="category" width={100} className="text-xs" />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="leads" name="Leads" fill="#C5A572" radius={[0, 4, 4, 0]} />
                    <Bar dataKey="converted" name="Converted" fill="#4CAF50" radius={[0, 4, 4, 0]} />
                    <Bar dataKey="followUpsCompleted" name="Follow-ups Done" fill="#2196F3" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                  No team activity data available
                </div>
              )}
            </CardContent>
          </Card>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {teamPerformance.map((member, i) => (
              <Card key={i}>
                <CardContent className="p-4">
                  <h4 className="font-medium mb-3">{member.name}</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Assigned Leads</span>
                      <span className="font-medium">{member.leads}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Converted</span>
                      <span className="font-medium text-green-600">{member.converted}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Follow-ups Done</span>
                      <span className="font-medium">{member.followUpsCompleted}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Pending Follow-ups</span>
                      <span className="font-medium text-orange-600">{member.followUpsPending}</span>
                    </div>
                    <div className="flex justify-between border-t pt-2">
                      <span className="text-muted-foreground">Quote Value</span>
                      <span className="font-medium">AED {member.quoteValue.toLocaleString()}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Sales Performance */}
        <TabsContent value="sales" className="space-y-6">
          <div className="flex justify-end">
            <Button variant="outline" onClick={() => exportReport("sales")}>
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle className="text-base">Quotation Status</CardTitle>
              </CardHeader>
              <CardContent>
                {quotationsByStatus.length > 0 ? (
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={quotationsByStatus}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="value" fill="#C5A572" radius={[4, 4, 0, 0]}>
                        {quotationsByStatus.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                    No quotation data available
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Sales Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="p-4 bg-accent-soft rounded-lg">
                    <p className="text-sm text-muted-foreground">Total Quote Value</p>
                    <p className="text-2xl font-bold text-gold">AED {totalQuoteValue.toLocaleString()}</p>
                  </div>
                  <div className="p-4 bg-green-500/10 rounded-lg">
                    <p className="text-sm text-muted-foreground">Accepted Value</p>
                    <p className="text-2xl font-bold text-green-600">AED {acceptedQuoteValue.toLocaleString()}</p>
                  </div>
                  <div className="p-4 bg-blue-500/10 rounded-lg">
                    <p className="text-sm text-muted-foreground">Acceptance Rate</p>
                    <p className="text-2xl font-bold text-blue-600">
                      {quotations.length > 0
                        ? ((quotations.filter(q => q.status === "accepted").length / quotations.length) * 100).toFixed(0)
                        : 0}%
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ReportsDashboard;
