 import { useState, useEffect } from "react";
 import { supabase } from "@/integrations/supabase/client";
 import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
 import { Button } from "@/components/ui/button";
 import { Badge } from "@/components/ui/badge";
 import { toast } from "sonner";
 import {
   Table,
   TableBody,
   TableCell,
   TableHead,
   TableHeader,
   TableRow,
 } from "@/components/ui/table";
 import {
   Select,
   SelectContent,
   SelectItem,
   SelectTrigger,
   SelectValue,
 } from "@/components/ui/select";
 import { Loader2, ClipboardCheck, Calendar, Download } from "lucide-react";
 import { format, startOfMonth, endOfMonth, eachDayOfInterval, isWeekend } from "date-fns";
 
 interface Employee {
   id: string;
   full_name: string;
   department: string | null;
 }
 
 interface AttendanceRecord {
   id: string;
   employee_id: string;
   date: string;
   check_in: string | null;
   check_out: string | null;
   status: string | null;
   work_hours: number | null;
 }
 
 export const AttendanceManagement = () => {
   const [employees, setEmployees] = useState<Employee[]>([]);
   const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
   const [isLoading, setIsLoading] = useState(true);
   const [selectedMonth, setSelectedMonth] = useState(format(new Date(), "yyyy-MM"));
   const [isSaving, setIsSaving] = useState(false);
 
   useEffect(() => {
     fetchData();
   }, [selectedMonth]);
 
   const fetchData = async () => {
     setIsLoading(true);
     try {
       // Fetch employees
       const { data: empData, error: empError } = await supabase
         .from("employees")
         .select("id, full_name, department")
         .eq("employment_status", "active")
         .order("full_name");
 
       if (empError) throw empError;
       setEmployees(empData || []);
 
       // Fetch attendance for selected month
       const monthStart = startOfMonth(new Date(selectedMonth + "-01"));
       const monthEnd = endOfMonth(monthStart);
 
       const { data: attData, error: attError } = await supabase
         .from("attendance")
         .select("*")
         .gte("date", format(monthStart, "yyyy-MM-dd"))
         .lte("date", format(monthEnd, "yyyy-MM-dd"));
 
       if (attError) throw attError;
       setAttendance(attData || []);
     } catch (error) {
       console.error("Error fetching data:", error);
       toast.error("Failed to load attendance data");
     } finally {
       setIsLoading(false);
     }
   };
 
   const markAttendance = async (employeeId: string, date: string, status: string) => {
     setIsSaving(true);
     try {
       const existingRecord = attendance.find(
         (a) => a.employee_id === employeeId && a.date === date
       );
 
       if (existingRecord) {
         const { error } = await supabase
           .from("attendance")
           .update({ status })
           .eq("id", existingRecord.id);
 
         if (error) throw error;
       } else {
         const { error } = await supabase.from("attendance").insert({
           employee_id: employeeId,
           date,
           status,
           check_in: status === "present" ? new Date().toISOString() : null,
         });
 
         if (error) throw error;
       }
 
       toast.success("Attendance updated");
       fetchData();
     } catch (error: any) {
       console.error("Error updating attendance:", error);
       toast.error(error.message || "Failed to update attendance");
     } finally {
       setIsSaving(false);
     }
   };
 
   const getAttendanceStatus = (employeeId: string, date: string) => {
     const record = attendance.find(
       (a) => a.employee_id === employeeId && a.date === date
     );
     return record?.status || null;
   };
 
   const getStatusBadge = (status: string | null, isWeekendDay: boolean) => {
     if (isWeekendDay && !status) {
       return <Badge variant="outline" className="text-xs">Weekend</Badge>;
     }
 
     switch (status) {
       case "present":
         return <Badge className="bg-emerald-500/10 text-emerald-500 text-xs">P</Badge>;
       case "absent":
         return <Badge className="bg-red-500/10 text-red-500 text-xs">A</Badge>;
       case "half_day":
         return <Badge className="bg-amber-500/10 text-amber-500 text-xs">H</Badge>;
       case "on_leave":
         return <Badge className="bg-blue-500/10 text-blue-500 text-xs">L</Badge>;
       case "holiday":
         return <Badge className="bg-purple-500/10 text-purple-500 text-xs">Ho</Badge>;
       case "weekend":
         return <Badge variant="outline" className="text-xs">W</Badge>;
       default:
         return <Badge variant="outline" className="text-xs">—</Badge>;
     }
   };
 
   const exportToCSV = () => {
     const monthStart = startOfMonth(new Date(selectedMonth + "-01"));
     const monthEnd = endOfMonth(monthStart);
     const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
 
     const headers = ["Employee", "Department", ...days.map((d) => format(d, "dd"))];
     const rows = employees.map((emp) => {
       const attendanceData = days.map((day) => {
         const dateStr = format(day, "yyyy-MM-dd");
         const status = getAttendanceStatus(emp.id, dateStr);
         return status?.charAt(0).toUpperCase() || (isWeekend(day) ? "W" : "—");
       });
       return [emp.full_name, emp.department || "", ...attendanceData];
     });
 
     const csvContent = [headers, ...rows].map((row) => row.join(",")).join("\n");
     const blob = new Blob([csvContent], { type: "text/csv" });
     const url = URL.createObjectURL(blob);
     const link = document.createElement("a");
     link.href = url;
     link.download = `attendance_${selectedMonth}.csv`;
     link.click();
     URL.revokeObjectURL(url);
   };
 
   // Generate month options
   const monthOptions = [];
   for (let i = 0; i < 12; i++) {
     const date = new Date();
     date.setMonth(date.getMonth() - i);
     monthOptions.push({
       value: format(date, "yyyy-MM"),
       label: format(date, "MMMM yyyy"),
     });
   }
 
   const monthStart = startOfMonth(new Date(selectedMonth + "-01"));
   const monthEnd = endOfMonth(monthStart);
   const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });
   const today = format(new Date(), "yyyy-MM-dd");
 
   if (isLoading) {
     return (
       <div className="flex items-center justify-center p-8">
         <Loader2 className="w-8 h-8 animate-spin text-primary" />
       </div>
     );
   }
 
   return (
     <Card>
       <CardHeader>
         <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
           <div>
             <CardTitle className="flex items-center gap-2">
               <ClipboardCheck className="w-5 h-5" />
               Attendance Management
             </CardTitle>
             <CardDescription>Track and manage employee attendance</CardDescription>
           </div>
           <div className="flex items-center gap-3">
             <Select value={selectedMonth} onValueChange={setSelectedMonth}>
               <SelectTrigger className="w-[180px]">
                 <Calendar className="w-4 h-4 mr-2" />
                 <SelectValue />
               </SelectTrigger>
               <SelectContent>
                 {monthOptions.map((opt) => (
                   <SelectItem key={opt.value} value={opt.value}>
                     {opt.label}
                   </SelectItem>
                 ))}
               </SelectContent>
             </Select>
             <Button variant="outline" onClick={exportToCSV}>
               <Download className="w-4 h-4 mr-2" />
               Export
             </Button>
           </div>
         </div>
       </CardHeader>
       <CardContent>
         {employees.length === 0 ? (
           <p className="text-center text-muted-foreground py-8">
             No active employees found. Add employees first.
           </p>
         ) : (
           <div className="overflow-x-auto">
             <Table>
               <TableHeader>
                 <TableRow>
                   <TableHead className="sticky left-0 bg-background z-10 min-w-[150px]">
                     Employee
                   </TableHead>
                   {daysInMonth.map((day) => (
                     <TableHead
                       key={day.toISOString()}
                       className={`text-center min-w-[40px] ${
                         isWeekend(day) ? "bg-muted/50" : ""
                       } ${format(day, "yyyy-MM-dd") === today ? "bg-primary/10" : ""}`}
                     >
                       <div className="text-xs">
                         <div>{format(day, "EEE")}</div>
                         <div className="font-medium">{format(day, "d")}</div>
                       </div>
                     </TableHead>
                   ))}
                 </TableRow>
               </TableHeader>
               <TableBody>
                 {employees.map((employee) => (
                   <TableRow key={employee.id}>
                     <TableCell className="sticky left-0 bg-background z-10 font-medium">
                       <div>
                         <p className="text-sm">{employee.full_name}</p>
                         <p className="text-xs text-muted-foreground">{employee.department || "—"}</p>
                       </div>
                     </TableCell>
                     {daysInMonth.map((day) => {
                       const dateStr = format(day, "yyyy-MM-dd");
                       const status = getAttendanceStatus(employee.id, dateStr);
                       const isWeekendDay = isWeekend(day);
                       const isPastOrToday = dateStr <= today;
 
                       return (
                         <TableCell
                           key={dateStr}
                           className={`text-center p-1 ${isWeekendDay ? "bg-muted/30" : ""}`}
                         >
                           {isPastOrToday && !isWeekendDay ? (
                             <Select
                               value={status || ""}
                               onValueChange={(value) => markAttendance(employee.id, dateStr, value)}
                               disabled={isSaving}
                             >
                               <SelectTrigger className="h-7 w-10 p-0 border-0 bg-transparent">
                                 {getStatusBadge(status, isWeekendDay)}
                               </SelectTrigger>
                               <SelectContent>
                                 <SelectItem value="present">Present</SelectItem>
                                 <SelectItem value="absent">Absent</SelectItem>
                                 <SelectItem value="half_day">Half Day</SelectItem>
                                 <SelectItem value="on_leave">On Leave</SelectItem>
                                 <SelectItem value="holiday">Holiday</SelectItem>
                               </SelectContent>
                             </Select>
                           ) : (
                             getStatusBadge(status, isWeekendDay)
                           )}
                         </TableCell>
                       );
                     })}
                   </TableRow>
                 ))}
               </TableBody>
             </Table>
           </div>
         )}
 
         {/* Legend */}
         <div className="flex flex-wrap gap-4 mt-4 pt-4 border-t">
           <div className="flex items-center gap-2 text-sm">
             <Badge className="bg-emerald-500/10 text-emerald-500">P</Badge>
             <span className="text-muted-foreground">Present</span>
           </div>
           <div className="flex items-center gap-2 text-sm">
             <Badge className="bg-red-500/10 text-red-500">A</Badge>
             <span className="text-muted-foreground">Absent</span>
           </div>
           <div className="flex items-center gap-2 text-sm">
             <Badge className="bg-amber-500/10 text-amber-500">H</Badge>
             <span className="text-muted-foreground">Half Day</span>
           </div>
           <div className="flex items-center gap-2 text-sm">
             <Badge className="bg-blue-500/10 text-blue-500">L</Badge>
             <span className="text-muted-foreground">Leave</span>
           </div>
           <div className="flex items-center gap-2 text-sm">
             <Badge className="bg-purple-500/10 text-purple-500">Ho</Badge>
             <span className="text-muted-foreground">Holiday</span>
           </div>
         </div>
       </CardContent>
     </Card>
   );
 };