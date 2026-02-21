import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  Phone, PhoneCall, PhoneIncoming, PhoneOutgoing, PhoneMissed,
  Play, Clock, User, Loader2, RefreshCw, Search, Copy,
  BarChart3, TrendingUp, PhoneOff, Headphones,
} from "lucide-react";

interface MCubeCallRecord {
  id: string;
  call_id: string;
  direction: string;
  agent_phone: string | null;
  agent_name: string | null;
  customer_phone: string | null;
  did_number: string | null;
  dial_status: string | null;
  recording_url: string | null;
  start_time: string | null;
  end_time: string | null;
  answered_time: string | null;
  disconnected_by: string | null;
  group_name: string | null;
  duration_seconds: number;
  matched_lead_id: string | null;
  matched_user_id: string | null;
  created_at: string;
}

interface AgentStats {
  agent_name: string;
  agent_phone: string;
  total_calls: number;
  answered: number;
  missed: number;
  total_duration: number;
  avg_duration: number;
}

export function MCubeCallTracker() {
  const [records, setRecords] = useState<MCubeCallRecord[]>([]);
  const [agentStats, setAgentStats] = useState<AgentStats[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [directionFilter, setDirectionFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("today");
  const [isCallDialogOpen, setIsCallDialogOpen] = useState(false);
  const [callAgentNumber, setCallAgentNumber] = useState(() => localStorage.getItem("mcube_agent_number") || "");
  const [callCustomerNumber, setCallCustomerNumber] = useState("");
  const [isInitiatingCall, setIsInitiatingCall] = useState(false);

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const webhookUrl = `${supabaseUrl}/functions/v1/mcube-webhook`;

  useEffect(() => {
    fetchRecords();
  }, [dateFilter]);

  const fetchRecords = async () => {
    setIsLoading(true);
    try {
      let query = supabase
        .from("mcube_call_records")
        .select("*")
        .order("start_time", { ascending: false })
        .limit(500);

      // Date filter
      const now = new Date();
      if (dateFilter === "today") {
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
        query = query.gte("start_time", todayStart);
      } else if (dateFilter === "week") {
        const weekAgo = new Date(now);
        weekAgo.setDate(now.getDate() - 7);
        query = query.gte("start_time", weekAgo.toISOString());
      } else if (dateFilter === "month") {
        const monthAgo = new Date(now);
        monthAgo.setMonth(now.getMonth() - 1);
        query = query.gte("start_time", monthAgo.toISOString());
      }

      const { data, error } = await query;
      if (error) throw error;

      const callData = (data || []) as MCubeCallRecord[];
      setRecords(callData);
      calculateAgentStats(callData);
    } catch (error: any) {
      console.error("Error fetching MCube records:", error);
      toast.error("Failed to load call records");
    } finally {
      setIsLoading(false);
    }
  };

  const calculateAgentStats = (data: MCubeCallRecord[]) => {
    const statsMap: Record<string, AgentStats> = {};

    data.forEach((record) => {
      const key = record.agent_phone || record.agent_name || "Unknown";
      if (!statsMap[key]) {
        statsMap[key] = {
          agent_name: record.agent_name || "Unknown",
          agent_phone: record.agent_phone || "",
          total_calls: 0,
          answered: 0,
          missed: 0,
          total_duration: 0,
          avg_duration: 0,
        };
      }
      statsMap[key].total_calls++;
      if (record.dial_status === "ANSWER") {
        statsMap[key].answered++;
        statsMap[key].total_duration += record.duration_seconds || 0;
      } else {
        statsMap[key].missed++;
      }
    });

    const stats = Object.values(statsMap).map((s) => ({
      ...s,
      avg_duration: s.answered > 0 ? Math.round(s.total_duration / s.answered) : 0,
    }));
    stats.sort((a, b) => b.total_calls - a.total_calls);
    setAgentStats(stats);
  };

  const initiateOutboundCall = async () => {
    const cleanAgent = callAgentNumber.replace(/[^\d]/g, "");
    const cleanCustomer = callCustomerNumber.replace(/[^\d]/g, "");

    if (!cleanAgent || !cleanCustomer) {
      toast.error("Both agent and customer numbers are required");
      return;
    }
    if (cleanAgent.length < 10 || cleanCustomer.length < 10) {
      toast.error("Both numbers should be at least 10 digits");
      return;
    }
    setIsInitiatingCall(true);
    try {
      const { data, error } = await supabase.functions.invoke("mcube-outbound", {
        body: { exenumber: cleanAgent, custnumber: cleanCustomer },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      localStorage.setItem("mcube_agent_number", cleanAgent);
      toast.success("Call initiated successfully!");
      setIsCallDialogOpen(false);
      setCallCustomerNumber("");
      setTimeout(fetchRecords, 3000);
    } catch (error: any) {
      console.error("Error initiating call:", error);
      toast.error(error.message || "Failed to initiate call");
    } finally {
      setIsInitiatingCall(false);
    }
  };

  const filteredRecords = records.filter((r) => {
    const matchesSearch = !searchQuery ||
      (r.agent_name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (r.agent_phone || "").includes(searchQuery) ||
      (r.customer_phone || "").includes(searchQuery) ||
      (r.call_id || "").includes(searchQuery);
    const matchesDirection = directionFilter === "all" || r.direction === directionFilter;
    const matchesStatus = statusFilter === "all" || r.dial_status === statusFilter;
    return matchesSearch && matchesDirection && matchesStatus;
  });

  const totalCalls = records.length;
  const answeredCalls = records.filter((r) => r.dial_status === "ANSWER").length;
  const missedCalls = totalCalls - answeredCalls;
  const totalDuration = records.reduce((sum, r) => sum + (r.dial_status === "ANSWER" ? (r.duration_seconds || 0) : 0), 0);
  const avgDuration = answeredCalls > 0 ? Math.round(totalDuration / answeredCalls) : 0;

  const formatDuration = (seconds: number) => {
    if (seconds === 0) return "0s";
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h}h ${m}m`;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
  };

  const getStatusBadge = (status: string | null) => {
    const colors: Record<string, string> = {
      ANSWER: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
      CANCEL: "bg-red-500/10 text-red-600 border-red-500/20",
      "Executive Busy": "bg-amber-500/10 text-amber-600 border-amber-500/20",
      Busy: "bg-amber-500/10 text-amber-600 border-amber-500/20",
      NoAnswer: "bg-red-500/10 text-red-500 border-red-500/20",
      INITIATED: "bg-blue-500/10 text-blue-600 border-blue-500/20",
    };
    return (
      <Badge variant="outline" className={colors[status || ""] || "bg-muted text-muted-foreground"}>
        {status || "Unknown"}
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-[hsl(var(--gold))]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Headphones className="w-5 h-5 text-[hsl(var(--gold))]" />
            MCube Call Tracking
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Monitor inbound & outbound call performance
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchRecords}>
            <RefreshCw className="w-4 h-4 mr-1" /> Refresh
          </Button>
          <Dialog open={isCallDialogOpen} onOpenChange={setIsCallDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="bg-[hsl(var(--gold))] text-[hsl(var(--charcoal))] hover:bg-[hsl(var(--gold-light))]">
                <PhoneCall className="w-4 h-4 mr-1" /> Initiate Call
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Initiate Outbound Call</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div>
                  <Label>Agent Phone Number *</Label>
                  <Input value={callAgentNumber} onChange={(e) => setCallAgentNumber(e.target.value)} placeholder="e.g., 9876543210" className="mt-1" />
                </div>
                <div>
                  <Label>Customer Phone Number *</Label>
                  <Input value={callCustomerNumber} onChange={(e) => setCallCustomerNumber(e.target.value)} placeholder="e.g., 9123456789" className="mt-1" />
                </div>
                <Button onClick={initiateOutboundCall} disabled={isInitiatingCall} className="w-full">
                  {isInitiatingCall ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <PhoneCall className="w-4 h-4 mr-2" />}
                  {isInitiatingCall ? "Connecting..." : "Connect Call"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Webhook URL Card */}
      <Card className="border-border/50 bg-muted/30">
        <CardContent className="p-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium">MCube Webhook URL</p>
              <p className="text-xs text-muted-foreground mt-0.5">Configure this URL in your MCube dashboard for inbound/hangup events</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                navigator.clipboard.writeText(webhookUrl);
                toast.success("Webhook URL copied!");
              }}
            >
              <Copy className="w-3.5 h-3.5 mr-1" /> Copy URL
            </Button>
          </div>
          <code className="block mt-2 text-xs p-2 bg-background rounded border overflow-x-auto">
            {webhookUrl}
          </code>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Phone className="w-4 h-4 text-[hsl(var(--gold))]" />
              <span className="text-sm text-muted-foreground">Total Calls</span>
            </div>
            <p className="text-2xl font-bold">{totalCalls}</p>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <PhoneCall className="w-4 h-4 text-emerald-500" />
              <span className="text-sm text-muted-foreground">Answered</span>
            </div>
            <p className="text-2xl font-bold text-emerald-600">{answeredCalls}</p>
            <p className="text-xs text-muted-foreground">{totalCalls > 0 ? Math.round((answeredCalls / totalCalls) * 100) : 0}% answer rate</p>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <PhoneMissed className="w-4 h-4 text-red-500" />
              <span className="text-sm text-muted-foreground">Missed</span>
            </div>
            <p className="text-2xl font-bold text-red-500">{missedCalls}</p>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-4 h-4 text-blue-500" />
              <span className="text-sm text-muted-foreground">Avg Duration</span>
            </div>
            <p className="text-2xl font-bold">{formatDuration(avgDuration)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Date filter */}
      <div className="flex items-center gap-3">
        <Select value={dateFilter} onValueChange={setDateFilter}>
          <SelectTrigger className="w-[140px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="today">Today</SelectItem>
            <SelectItem value="week">This Week</SelectItem>
            <SelectItem value="month">This Month</SelectItem>
            <SelectItem value="all">All Time</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Agent Performance Table */}
      {agentStats.length > 0 && (
        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-[hsl(var(--gold))]" />
              Agent Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Agent</TableHead>
                  <TableHead className="text-center">Total</TableHead>
                  <TableHead className="text-center">Answered</TableHead>
                  <TableHead className="text-center">Missed</TableHead>
                  <TableHead className="text-center">Answer Rate</TableHead>
                  <TableHead className="text-center">Avg Duration</TableHead>
                  <TableHead className="text-center">Talk Time</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {agentStats.map((agent, idx) => (
                  <TableRow key={idx}>
                    <TableCell>
                      <div>
                        <p className="font-medium text-sm">{agent.agent_name}</p>
                        <p className="text-xs text-muted-foreground">{agent.agent_phone}</p>
                      </div>
                    </TableCell>
                    <TableCell className="text-center font-medium">{agent.total_calls}</TableCell>
                    <TableCell className="text-center text-emerald-600">{agent.answered}</TableCell>
                    <TableCell className="text-center text-red-500">{agent.missed}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline" className={agent.total_calls > 0 && (agent.answered / agent.total_calls) >= 0.7 ? "text-emerald-600" : "text-amber-600"}>
                        {agent.total_calls > 0 ? Math.round((agent.answered / agent.total_calls) * 100) : 0}%
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">{formatDuration(agent.avg_duration)}</TableCell>
                    <TableCell className="text-center">{formatDuration(agent.total_duration)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Call Log Filters */}
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Phone className="w-4 h-4 text-[hsl(var(--gold))]" />
            Call Records
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search agent, phone, call ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={directionFilter} onValueChange={setDirectionFilter}>
              <SelectTrigger className="w-[130px]">
                <SelectValue placeholder="Direction" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="inbound">Inbound</SelectItem>
                <SelectItem value="outbound">Outbound</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="ANSWER">Answered</SelectItem>
                <SelectItem value="NoAnswer">No Answer</SelectItem>
                <SelectItem value="Busy">Busy</SelectItem>
                <SelectItem value="CANCEL">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <ScrollArea className="h-[400px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Direction</TableHead>
                  <TableHead>Agent</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead>Recording</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRecords.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      <PhoneOff className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      No call records found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredRecords.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell>
                        <Badge variant="outline" className={record.direction === "inbound" ? "text-blue-600" : "text-orange-600"}>
                          {record.direction === "inbound" ? (
                            <PhoneIncoming className="w-3 h-3 mr-1" />
                          ) : (
                            <PhoneOutgoing className="w-3 h-3 mr-1" />
                          )}
                          {record.direction}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="text-sm font-medium">{record.agent_name || "-"}</p>
                          <p className="text-xs text-muted-foreground">{record.agent_phone || ""}</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">{record.customer_phone || "-"}</TableCell>
                      <TableCell>{getStatusBadge(record.dial_status)}</TableCell>
                      <TableCell className="text-sm">{formatDuration(record.duration_seconds)}</TableCell>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        {record.start_time ? format(new Date(record.start_time), "MMM d, h:mm a") : "-"}
                      </TableCell>
                      <TableCell>
                        {record.recording_url ? (
                          <Button variant="ghost" size="icon" className="h-7 w-7" asChild>
                            <a href={record.recording_url} target="_blank" rel="noopener noreferrer">
                              <Play className="w-3.5 h-3.5 text-[hsl(var(--gold))]" />
                            </a>
                          </Button>
                        ) : (
                          <span className="text-xs text-muted-foreground">-</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
