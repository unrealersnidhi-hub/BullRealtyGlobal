 import { useState, useEffect } from "react";
 import { supabase } from "@/integrations/supabase/client";
 import { Button } from "@/components/ui/button";
 import { Card } from "@/components/ui/card";
 import { Input } from "@/components/ui/input";
 import { Label } from "@/components/ui/label";
 import {
   Select,
   SelectContent,
   SelectItem,
   SelectTrigger,
   SelectValue,
 } from "@/components/ui/select";
 import {
   Table,
   TableBody,
   TableCell,
   TableHead,
   TableHeader,
   TableRow,
 } from "@/components/ui/table";
 import { toast } from "sonner";
 import { Loader2, Download, FileSpreadsheet, Phone, Users, TrendingUp, Calendar } from "lucide-react";
 import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, subDays } from "date-fns";
 
 interface TeamMember {
   id: string;
   email: string;
   fullName: string | null;
 }
 
 interface CallStats {
   userId: string;
   userName: string;
   userEmail: string;
   totalCalls: number;
   answered: number;
   notAnswered: number;
   busy: number;
   voicemail: number;
   callbackScheduled: number;
   totalDuration: number;
   answerRate: number;
 }
 
 interface LeadStats {
   userId: string;
   userName: string;
   userEmail: string;
   totalLeads: number;
   hotLeads: number;
   warmLeads: number;
   coldLeads: number;
   converted: number;
   conversionRate: number;
 }
 
 export const MISReportsDashboard = () => {
   const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
   const [callStats, setCallStats] = useState<CallStats[]>([]);
   const [leadStats, setLeadStats] = useState<LeadStats[]>([]);
   const [isLoading, setIsLoading] = useState(true);
   const [dateRange, setDateRange] = useState("this_month");
   const [startDate, setStartDate] = useState("");
   const [endDate, setEndDate] = useState("");
   const [selectedUser, setSelectedUser] = useState("all");
 
  const [teamLoaded, setTeamLoaded] = useState(false);

  useEffect(() => {
    fetchTeamMembers();
  }, []);

  useEffect(() => {
    const { start, end } = getDateRange();
    setStartDate(format(start, "yyyy-MM-dd"));
    setEndDate(format(end, "yyyy-MM-dd"));
  }, [dateRange]);

  useEffect(() => {
    if (startDate && endDate && teamLoaded) {
      fetchReports();
    }
  }, [startDate, endDate, selectedUser, teamLoaded]);
 
   const getDateRange = () => {
     const today = new Date();
     switch (dateRange) {
       case "today":
         return { start: today, end: today };
       case "this_week":
         return { start: startOfWeek(today, { weekStartsOn: 1 }), end: endOfWeek(today, { weekStartsOn: 1 }) };
       case "this_month":
         return { start: startOfMonth(today), end: endOfMonth(today) };
       case "last_7_days":
         return { start: subDays(today, 7), end: today };
       case "last_30_days":
         return { start: subDays(today, 30), end: today };
       default:
         return { start: startOfMonth(today), end: endOfMonth(today) };
     }
   };
 
   const fetchTeamMembers = async () => {
     try {
       const response = await supabase.functions.invoke("list-team-members");
       if (response.error) throw new Error(response.error.message);
       
        const users = (response.data?.users || []).filter((m: any) => 
          m.roles.includes("user") || m.roles.includes("manager") || m.roles.includes("telesales")
        );
        setTeamMembers(users.map((u: any) => ({
          id: u.id,
          email: u.email,
          fullName: u.fullName,
        })));
        setTeamLoaded(true);
      } catch (error) {
        console.error("Error fetching team members:", error);
        setTeamLoaded(true);
      }
   };
 
   const fetchReports = async () => {
     setIsLoading(true);
     try {
       const startDateTime = new Date(startDate).toISOString();
       const endDateTime = new Date(endDate + "T23:59:59").toISOString();
 
       // Fetch call logs
       let callQuery = supabase
         .from("call_logs")
         .select("*")
         .gte("created_at", startDateTime)
         .lte("created_at", endDateTime);
 
       if (selectedUser !== "all") {
         callQuery = callQuery.eq("user_id", selectedUser);
       }
 
       const { data: callLogs, error: callError } = await callQuery;
       if (callError) throw callError;
 
       // Fetch leads
       let leadQuery = supabase
         .from("leads")
         .select("*")
         .gte("created_at", startDateTime)
         .lte("created_at", endDateTime);
 
       if (selectedUser !== "all") {
         leadQuery = leadQuery.eq("assigned_to", selectedUser);
       }
 
       const { data: leads, error: leadError } = await leadQuery;
       if (leadError) throw leadError;
 
       // Process call stats by user
       const callStatsByUser: Record<string, CallStats> = {};
       callLogs?.forEach((log) => {
         if (!callStatsByUser[log.user_id]) {
           const member = teamMembers.find((m) => m.id === log.user_id);
           callStatsByUser[log.user_id] = {
             userId: log.user_id,
             userName: member?.fullName || "Unknown",
             userEmail: member?.email || "",
             totalCalls: 0,
             answered: 0,
             notAnswered: 0,
             busy: 0,
             voicemail: 0,
             callbackScheduled: 0,
             totalDuration: 0,
             answerRate: 0,
           };
         }
         const stats = callStatsByUser[log.user_id];
         stats.totalCalls++;
         stats.totalDuration += log.duration_seconds || 0;
         
         switch (log.outcome) {
           case "answered": stats.answered++; break;
           case "not_answered": stats.notAnswered++; break;
           case "busy": stats.busy++; break;
           case "voicemail": stats.voicemail++; break;
           case "callback_scheduled": stats.callbackScheduled++; break;
         }
       });
 
       // Calculate answer rates
       Object.values(callStatsByUser).forEach((stats) => {
         stats.answerRate = stats.totalCalls > 0 
           ? (stats.answered / stats.totalCalls) * 100 
           : 0;
       });
 
       setCallStats(Object.values(callStatsByUser));
 
        // Process lead stats by user - initialize ALL team members first
        const leadStatsByUser: Record<string, LeadStats> = {};
        
        // Pre-populate with all team members so everyone shows up
        if (selectedUser === "all") {
          teamMembers.forEach((member) => {
            leadStatsByUser[member.id] = {
              userId: member.id,
              userName: member.fullName || member.email,
              userEmail: member.email,
              totalLeads: 0,
              hotLeads: 0,
              warmLeads: 0,
              coldLeads: 0,
              converted: 0,
              conversionRate: 0,
            };
          });
        }

        leads?.forEach((lead) => {
          const userId = lead.assigned_to || "unassigned";
          if (!leadStatsByUser[userId]) {
            const member = teamMembers.find((m) => m.id === userId);
            leadStatsByUser[userId] = {
              userId,
              userName: userId === "unassigned" ? "Unassigned" : (member?.fullName || member?.email || "Unknown"),
              userEmail: member?.email || "",
              totalLeads: 0,
              hotLeads: 0,
              warmLeads: 0,
              coldLeads: 0,
              converted: 0,
              conversionRate: 0,
            };
          }
          const stats = leadStatsByUser[userId];
          stats.totalLeads++;
          
          switch (lead.status) {
            case "hot": stats.hotLeads++; break;
            case "warm": stats.warmLeads++; break;
            case "cold": stats.coldLeads++; break;
            case "converted": stats.converted++; break;
          }
        });

        // Calculate conversion rates
        Object.values(leadStatsByUser).forEach((stats) => {
          stats.conversionRate = stats.totalLeads > 0 
            ? (stats.converted / stats.totalLeads) * 100 
            : 0;
        });

        // Sort: team members with leads first, then by total desc, then unassigned last
        const sortedStats = Object.values(leadStatsByUser).sort((a, b) => {
          if (a.userId === "unassigned") return 1;
          if (b.userId === "unassigned") return -1;
          return b.totalLeads - a.totalLeads;
        });

        setLeadStats(sortedStats);
     } catch (error) {
       console.error("Error fetching reports:", error);
       toast.error("Failed to load reports");
     } finally {
       setIsLoading(false);
     }
   };
 
   const formatDuration = (seconds: number) => {
     const hours = Math.floor(seconds / 3600);
     const minutes = Math.floor((seconds % 3600) / 60);
     if (hours > 0) return `${hours}h ${minutes}m`;
     return `${minutes}m`;
   };
 
   const downloadCSV = (type: "calls" | "leads") => {
     let csvContent = "";
     let filename = "";
 
     if (type === "calls") {
       filename = `call_report_${startDate}_to_${endDate}.csv`;
       csvContent = "Team Member,Email,Total Calls,Answered,Not Answered,Busy,Voicemail,Callbacks,Total Duration,Answer Rate\n";
       callStats.forEach((stat) => {
         csvContent += `"${stat.userName}","${stat.userEmail}",${stat.totalCalls},${stat.answered},${stat.notAnswered},${stat.busy},${stat.voicemail},${stat.callbackScheduled},"${formatDuration(stat.totalDuration)}","${stat.answerRate.toFixed(1)}%"\n`;
       });
     } else {
       filename = `lead_report_${startDate}_to_${endDate}.csv`;
       csvContent = "Team Member,Email,Total Leads,Hot,Warm,Cold,Converted,Conversion Rate\n";
       leadStats.forEach((stat) => {
         csvContent += `"${stat.userName}","${stat.userEmail}",${stat.totalLeads},${stat.hotLeads},${stat.warmLeads},${stat.coldLeads},${stat.converted},"${stat.conversionRate.toFixed(1)}%"\n`;
       });
     }
 
     const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
     const link = document.createElement("a");
     link.href = URL.createObjectURL(blob);
     link.download = filename;
     link.click();
     toast.success("Report downloaded");
   };
 
   const downloadFullReport = async () => {
     try {
       const startDateTime = new Date(startDate).toISOString();
       const endDateTime = new Date(endDate + "T23:59:59").toISOString();
 
       // Fetch detailed call logs
       let callQuery = supabase
         .from("call_logs")
         .select("*")
         .gte("created_at", startDateTime)
         .lte("created_at", endDateTime)
         .order("created_at", { ascending: false });
 
       if (selectedUser !== "all") {
         callQuery = callQuery.eq("user_id", selectedUser);
       }
 
       const { data: callLogs, error: callError } = await callQuery;
       if (callError) throw callError;
 
        // Fetch leads with details - include date filter for consistency
        let leadQuery = supabase
          .from("leads")
          .select("*")
          .gte("created_at", startDateTime)
          .lte("created_at", endDateTime)
          .order("created_at", { ascending: false });

        if (selectedUser !== "all") {
          leadQuery = leadQuery.eq("assigned_to", selectedUser);
        }

        const { data: leads, error: leadError } = await leadQuery;
        if (leadError) throw leadError;
 
       // Create detailed CSV
       let csvContent = "=== CALL LOGS ===\n";
       csvContent += "Date,Time,Team Member,Outcome,Duration (min),Notes,Callback Scheduled\n";
       
       callLogs?.forEach((log) => {
         const member = teamMembers.find((m) => m.id === log.user_id);
         const durationMin = Math.round((log.duration_seconds || 0) / 60);
         csvContent += `"${format(new Date(log.created_at), "yyyy-MM-dd")}","${format(new Date(log.created_at), "HH:mm")}","${member?.fullName || member?.email || "Unknown"}","${log.outcome}",${durationMin},"${(log.notes || "").replace(/"/g, '""')}","${log.callback_scheduled_at ? format(new Date(log.callback_scheduled_at), "yyyy-MM-dd HH:mm") : ""}"\n`;
       });
 
       csvContent += "\n\n=== LEADS ===\n";
       csvContent += "Name,Email,Phone,Status,Source,Interest,Captured At,Assigned At,Assigned To\n";
       
       leads?.forEach((lead) => {
         const member = teamMembers.find((m) => m.id === lead.assigned_to);
         csvContent += `"${lead.full_name}","${lead.email}","${lead.phone || ""}","${lead.status}","${lead.source || "website"}","${lead.interest || ""}","${format(new Date(lead.created_at), "yyyy-MM-dd HH:mm")}","${lead.assigned_at ? format(new Date(lead.assigned_at), "yyyy-MM-dd HH:mm") : ""}","${member?.fullName || member?.email || "Unassigned"}"\n`;
       });
 
       const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
       const link = document.createElement("a");
       link.href = URL.createObjectURL(blob);
       link.download = `full_report_${startDate}_to_${endDate}.csv`;
       link.click();
       toast.success("Full report downloaded");
     } catch (error) {
       console.error("Error downloading full report:", error);
       toast.error("Failed to download report");
     }
   };
 
   // Calculate totals
   const totalCalls = callStats.reduce((sum, s) => sum + s.totalCalls, 0);
   const totalAnswered = callStats.reduce((sum, s) => sum + s.answered, 0);
   const totalLeads = leadStats.reduce((sum, s) => sum + s.totalLeads, 0);
   const totalConverted = leadStats.reduce((sum, s) => sum + s.converted, 0);
 
   return (
     <div className="space-y-6">
       {/* Filters */}
       <Card className="p-4">
         <div className="flex flex-wrap gap-4 items-end">
           <div>
             <Label className="text-xs">Date Range</Label>
             <Select value={dateRange} onValueChange={setDateRange}>
               <SelectTrigger className="w-[160px] mt-1">
                 <SelectValue />
               </SelectTrigger>
               <SelectContent>
                 <SelectItem value="today">Today</SelectItem>
                 <SelectItem value="this_week">This Week</SelectItem>
                 <SelectItem value="this_month">This Month</SelectItem>
                 <SelectItem value="last_7_days">Last 7 Days</SelectItem>
                 <SelectItem value="last_30_days">Last 30 Days</SelectItem>
                 <SelectItem value="custom">Custom</SelectItem>
               </SelectContent>
             </Select>
           </div>
 
           {dateRange === "custom" && (
             <>
               <div>
                 <Label className="text-xs">Start Date</Label>
                 <Input
                   type="date"
                   value={startDate}
                   onChange={(e) => setStartDate(e.target.value)}
                   className="w-[150px] mt-1"
                 />
               </div>
               <div>
                 <Label className="text-xs">End Date</Label>
                 <Input
                   type="date"
                   value={endDate}
                   onChange={(e) => setEndDate(e.target.value)}
                   className="w-[150px] mt-1"
                 />
               </div>
             </>
           )}
 
           <div>
             <Label className="text-xs">Team Member</Label>
             <Select value={selectedUser} onValueChange={setSelectedUser}>
               <SelectTrigger className="w-[180px] mt-1">
                 <SelectValue placeholder="All Members" />
               </SelectTrigger>
               <SelectContent>
                 <SelectItem value="all">All Members</SelectItem>
                 {teamMembers.map((member) => (
                   <SelectItem key={member.id} value={member.id}>
                     {member.fullName || member.email}
                   </SelectItem>
                 ))}
               </SelectContent>
             </Select>
           </div>
 
           <div className="ml-auto flex gap-2">
             <Button variant="outline" onClick={() => downloadCSV("calls")} disabled={callStats.length === 0}>
               <Download className="w-4 h-4 mr-2" />
               Calls CSV
             </Button>
             <Button variant="outline" onClick={() => downloadCSV("leads")} disabled={leadStats.length === 0}>
               <Download className="w-4 h-4 mr-2" />
               Leads CSV
             </Button>
             <Button onClick={downloadFullReport}>
               <FileSpreadsheet className="w-4 h-4 mr-2" />
               Full Report
             </Button>
           </div>
         </div>
       </Card>
 
       {/* Summary Stats */}
       <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
         <Card className="p-4">
           <div className="flex items-center gap-3">
             <div className="p-2 rounded-lg bg-blue-500/10">
               <Phone className="w-5 h-5 text-blue-500" />
             </div>
             <div>
               <div className="text-2xl font-bold">{totalCalls}</div>
               <div className="text-xs text-muted-foreground">Total Calls</div>
             </div>
           </div>
         </Card>
         <Card className="p-4">
           <div className="flex items-center gap-3">
             <div className="p-2 rounded-lg bg-green-500/10">
               <TrendingUp className="w-5 h-5 text-green-500" />
             </div>
             <div>
               <div className="text-2xl font-bold">
                 {totalCalls > 0 ? ((totalAnswered / totalCalls) * 100).toFixed(1) : 0}%
               </div>
               <div className="text-xs text-muted-foreground">Answer Rate</div>
             </div>
           </div>
         </Card>
         <Card className="p-4">
           <div className="flex items-center gap-3">
             <div className="p-2 rounded-lg bg-purple-500/10">
               <Users className="w-5 h-5 text-purple-500" />
             </div>
             <div>
               <div className="text-2xl font-bold">{totalLeads}</div>
               <div className="text-xs text-muted-foreground">Total Leads</div>
             </div>
           </div>
         </Card>
         <Card className="p-4">
           <div className="flex items-center gap-3">
             <div className="p-2 rounded-lg bg-amber-500/10">
               <Calendar className="w-5 h-5 text-amber-500" />
             </div>
             <div>
               <div className="text-2xl font-bold">
                 {totalLeads > 0 ? ((totalConverted / totalLeads) * 100).toFixed(1) : 0}%
               </div>
               <div className="text-xs text-muted-foreground">Conversion Rate</div>
             </div>
           </div>
         </Card>
       </div>
 
       {isLoading ? (
         <div className="flex justify-center py-12">
           <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
         </div>
       ) : (
         <>
           {/* Call Stats Table */}
           <Card className="overflow-hidden">
             <div className="p-4 border-b border-border">
               <h3 className="font-semibold flex items-center gap-2">
                 <Phone className="w-4 h-4" />
                 Call Performance by Team Member
               </h3>
             </div>
             {callStats.length === 0 ? (
               <div className="p-8 text-center text-muted-foreground">
                 No call data for this period
               </div>
             ) : (
               <Table>
                 <TableHeader>
                   <TableRow className="bg-muted/30">
                     <TableHead>Team Member</TableHead>
                     <TableHead className="text-center">Total</TableHead>
                     <TableHead className="text-center">Answered</TableHead>
                     <TableHead className="text-center">Not Answered</TableHead>
                     <TableHead className="text-center">Busy</TableHead>
                     <TableHead className="text-center">Callbacks</TableHead>
                     <TableHead className="text-center">Duration</TableHead>
                     <TableHead className="text-center">Answer Rate</TableHead>
                   </TableRow>
                 </TableHeader>
                 <TableBody>
                   {callStats.map((stat) => (
                     <TableRow key={stat.userId}>
                       <TableCell>
                         <div className="font-medium">{stat.userName}</div>
                         <div className="text-xs text-muted-foreground">{stat.userEmail}</div>
                       </TableCell>
                       <TableCell className="text-center font-medium">{stat.totalCalls}</TableCell>
                       <TableCell className="text-center text-green-600">{stat.answered}</TableCell>
                       <TableCell className="text-center text-red-500">{stat.notAnswered}</TableCell>
                       <TableCell className="text-center text-amber-500">{stat.busy}</TableCell>
                       <TableCell className="text-center text-purple-500">{stat.callbackScheduled}</TableCell>
                       <TableCell className="text-center">{formatDuration(stat.totalDuration)}</TableCell>
                       <TableCell className="text-center">
                         <span className={stat.answerRate >= 50 ? "text-green-600" : "text-red-500"}>
                           {stat.answerRate.toFixed(1)}%
                         </span>
                       </TableCell>
                     </TableRow>
                   ))}
                 </TableBody>
               </Table>
             )}
           </Card>
 
           {/* Lead Stats Table */}
           <Card className="overflow-hidden">
             <div className="p-4 border-b border-border">
               <h3 className="font-semibold flex items-center gap-2">
                 <Users className="w-4 h-4" />
                 Lead Performance by Team Member
               </h3>
             </div>
             {leadStats.length === 0 ? (
               <div className="p-8 text-center text-muted-foreground">
                 No lead data for this period
               </div>
             ) : (
               <Table>
                 <TableHeader>
                   <TableRow className="bg-muted/30">
                     <TableHead>Team Member</TableHead>
                     <TableHead className="text-center">Total</TableHead>
                     <TableHead className="text-center">Hot</TableHead>
                     <TableHead className="text-center">Warm</TableHead>
                     <TableHead className="text-center">Cold</TableHead>
                     <TableHead className="text-center">Converted</TableHead>
                     <TableHead className="text-center">Conversion Rate</TableHead>
                   </TableRow>
                 </TableHeader>
                 <TableBody>
                   {leadStats.map((stat) => (
                     <TableRow key={stat.userId}>
                       <TableCell>
                         <div className="font-medium">{stat.userName}</div>
                         <div className="text-xs text-muted-foreground">{stat.userEmail}</div>
                       </TableCell>
                       <TableCell className="text-center font-medium">{stat.totalLeads}</TableCell>
                       <TableCell className="text-center text-red-500">{stat.hotLeads}</TableCell>
                       <TableCell className="text-center text-orange-500">{stat.warmLeads}</TableCell>
                       <TableCell className="text-center text-blue-500">{stat.coldLeads}</TableCell>
                       <TableCell className="text-center text-green-600 font-medium">{stat.converted}</TableCell>
                       <TableCell className="text-center">
                         <span className={stat.conversionRate >= 10 ? "text-green-600" : "text-muted-foreground"}>
                           {stat.conversionRate.toFixed(1)}%
                         </span>
                       </TableCell>
                     </TableRow>
                   ))}
                 </TableBody>
               </Table>
             )}
           </Card>
         </>
       )}
     </div>
   );
 };