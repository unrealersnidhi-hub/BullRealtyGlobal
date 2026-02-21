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
   Dialog,
   DialogContent,
   DialogDescription,
   DialogFooter,
   DialogHeader,
   DialogTitle,
 } from "@/components/ui/dialog";
 import { Textarea } from "@/components/ui/textarea";
 import { Label } from "@/components/ui/label";
 import { Loader2, Calendar, Check, X, Clock } from "lucide-react";
 import { format, differenceInDays } from "date-fns";
 
 interface LeaveRequest {
   id: string;
   employee_id: string;
   leave_type: string;
   start_date: string;
   end_date: string;
   reason: string | null;
   status: string;
   created_at: string;
   employee?: {
     full_name: string;
     department: string | null;
   };
 }
 
 export const LeaveManagement = () => {
   const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
   const [isLoading, setIsLoading] = useState(true);
   const [selectedRequest, setSelectedRequest] = useState<LeaveRequest | null>(null);
   const [approvalNotes, setApprovalNotes] = useState("");
   const [isProcessing, setIsProcessing] = useState(false);
   const [dialogAction, setDialogAction] = useState<"approve" | "reject" | null>(null);
 
   useEffect(() => {
     fetchLeaveRequests();
   }, []);
 
   const fetchLeaveRequests = async () => {
     try {
       const { data, error } = await supabase
         .from("leave_requests")
         .select(`
           *,
           employee:employees(full_name, department)
         `)
         .order("created_at", { ascending: false });
 
       if (error) throw error;
       setLeaveRequests(data || []);
     } catch (error) {
       console.error("Error fetching leave requests:", error);
       toast.error("Failed to load leave requests");
     } finally {
       setIsLoading(false);
     }
   };
 
   const handleAction = async (action: "approve" | "reject") => {
     if (!selectedRequest) return;
 
     setIsProcessing(true);
     try {
       const { data: { user } } = await supabase.auth.getUser();
       if (!user) throw new Error("Not authenticated");
 
       const { error } = await supabase
         .from("leave_requests")
         .update({
           status: action === "approve" ? "approved" : "rejected",
           approved_by: user.id,
           approved_at: new Date().toISOString(),
           approval_notes: approvalNotes,
         })
         .eq("id", selectedRequest.id);
 
       if (error) throw error;
 
       // Update employee status if leave is approved
       if (action === "approve") {
         const today = new Date();
         const startDate = new Date(selectedRequest.start_date);
         
         if (startDate <= today) {
           await supabase
             .from("employees")
             .update({ employment_status: "on_leave" })
             .eq("id", selectedRequest.employee_id);
         }
       }
 
       toast.success(`Leave request ${action === "approve" ? "approved" : "rejected"}`);
       setSelectedRequest(null);
       setApprovalNotes("");
       setDialogAction(null);
       fetchLeaveRequests();
     } catch (error: any) {
       console.error("Error processing request:", error);
       toast.error(error.message || "Failed to process request");
     } finally {
       setIsProcessing(false);
     }
   };
 
   const openActionDialog = (request: LeaveRequest, action: "approve" | "reject") => {
     setSelectedRequest(request);
     setDialogAction(action);
     setApprovalNotes("");
   };
 
   const getStatusBadge = (status: string) => {
     switch (status) {
       case "pending":
         return <Badge variant="outline" className="text-amber-500 border-amber-500"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
       case "approved":
         return <Badge variant="outline" className="text-emerald-500 border-emerald-500"><Check className="w-3 h-3 mr-1" />Approved</Badge>;
       case "rejected":
         return <Badge variant="outline" className="text-red-500 border-red-500"><X className="w-3 h-3 mr-1" />Rejected</Badge>;
       case "cancelled":
         return <Badge variant="outline" className="text-muted-foreground">Cancelled</Badge>;
       default:
         return <Badge variant="outline">{status}</Badge>;
     }
   };
 
   const getLeaveTypeBadge = (type: string) => {
     const colors: Record<string, string> = {
       annual: "bg-blue-500/10 text-blue-500",
       sick: "bg-red-500/10 text-red-500",
       casual: "bg-purple-500/10 text-purple-500",
       maternity: "bg-pink-500/10 text-pink-500",
       paternity: "bg-cyan-500/10 text-cyan-500",
       unpaid: "bg-gray-500/10 text-gray-500",
       other: "bg-orange-500/10 text-orange-500",
     };
     return <Badge className={colors[type] || "bg-muted"}>{type}</Badge>;
   };
 
   if (isLoading) {
     return (
       <div className="flex items-center justify-center p-8">
         <Loader2 className="w-8 h-8 animate-spin text-primary" />
       </div>
     );
   }
 
   const pendingRequests = leaveRequests.filter((r) => r.status === "pending");
   const processedRequests = leaveRequests.filter((r) => r.status !== "pending");
 
   return (
     <div className="space-y-6">
       {/* Pending Requests */}
       <Card>
         <CardHeader>
           <CardTitle className="flex items-center gap-2">
             <Calendar className="w-5 h-5 text-amber-500" />
             Pending Leave Requests
             {pendingRequests.length > 0 && (
               <Badge variant="secondary">{pendingRequests.length}</Badge>
             )}
           </CardTitle>
           <CardDescription>Review and approve or reject leave requests</CardDescription>
         </CardHeader>
         <CardContent>
           {pendingRequests.length === 0 ? (
             <p className="text-muted-foreground text-center py-4">No pending leave requests</p>
           ) : (
             <Table>
               <TableHeader>
                 <TableRow>
                   <TableHead>Employee</TableHead>
                   <TableHead>Type</TableHead>
                   <TableHead>Duration</TableHead>
                   <TableHead>Reason</TableHead>
                   <TableHead className="text-right">Actions</TableHead>
                 </TableRow>
               </TableHeader>
               <TableBody>
                 {pendingRequests.map((request) => (
                   <TableRow key={request.id}>
                     <TableCell>
                       <div>
                         <p className="font-medium">{request.employee?.full_name || "Unknown"}</p>
                         <p className="text-sm text-muted-foreground">{request.employee?.department || "—"}</p>
                       </div>
                     </TableCell>
                     <TableCell>{getLeaveTypeBadge(request.leave_type)}</TableCell>
                     <TableCell>
                       <div>
                         <p>{format(new Date(request.start_date), "MMM dd")} - {format(new Date(request.end_date), "MMM dd, yyyy")}</p>
                         <p className="text-sm text-muted-foreground">
                           {differenceInDays(new Date(request.end_date), new Date(request.start_date)) + 1} days
                         </p>
                       </div>
                     </TableCell>
                     <TableCell className="max-w-[200px] truncate">
                       {request.reason || "—"}
                     </TableCell>
                     <TableCell className="text-right">
                       <div className="flex justify-end gap-2">
                         <Button
                           size="sm"
                           variant="outline"
                           className="text-emerald-500 border-emerald-500"
                           onClick={() => openActionDialog(request, "approve")}
                         >
                           <Check className="w-4 h-4" />
                         </Button>
                         <Button
                           size="sm"
                           variant="outline"
                           className="text-red-500 border-red-500"
                           onClick={() => openActionDialog(request, "reject")}
                         >
                           <X className="w-4 h-4" />
                         </Button>
                       </div>
                     </TableCell>
                   </TableRow>
                 ))}
               </TableBody>
             </Table>
           )}
         </CardContent>
       </Card>
 
       {/* Leave History */}
       {processedRequests.length > 0 && (
         <Card>
           <CardHeader>
             <CardTitle>Leave History</CardTitle>
           </CardHeader>
           <CardContent>
             <Table>
               <TableHeader>
                 <TableRow>
                   <TableHead>Employee</TableHead>
                   <TableHead>Type</TableHead>
                   <TableHead>Duration</TableHead>
                   <TableHead>Status</TableHead>
                 </TableRow>
               </TableHeader>
               <TableBody>
                 {processedRequests.slice(0, 10).map((request) => (
                   <TableRow key={request.id}>
                     <TableCell>{request.employee?.full_name || "Unknown"}</TableCell>
                     <TableCell>{getLeaveTypeBadge(request.leave_type)}</TableCell>
                     <TableCell>
                       {format(new Date(request.start_date), "MMM dd")} - {format(new Date(request.end_date), "MMM dd")}
                     </TableCell>
                     <TableCell>{getStatusBadge(request.status)}</TableCell>
                   </TableRow>
                 ))}
               </TableBody>
             </Table>
           </CardContent>
         </Card>
       )}
 
       {/* Action Dialog */}
       <Dialog open={!!dialogAction} onOpenChange={() => setDialogAction(null)}>
         <DialogContent>
           <DialogHeader>
             <DialogTitle>
               {dialogAction === "approve" ? "Approve Leave" : "Reject Leave"}
             </DialogTitle>
             <DialogDescription>
               {dialogAction === "approve"
                 ? "The employee will be notified that their leave is approved."
                 : "The employee will be notified that their leave is rejected."}
             </DialogDescription>
           </DialogHeader>
           
           {selectedRequest && (
             <div className="space-y-4">
               <div className="p-4 bg-muted rounded-lg">
                 <p className="font-medium">{selectedRequest.employee?.full_name}</p>
                 <p className="text-sm text-muted-foreground capitalize">{selectedRequest.leave_type} leave</p>
                 <p className="text-sm">
                   {format(new Date(selectedRequest.start_date), "MMM dd, yyyy")} - {format(new Date(selectedRequest.end_date), "MMM dd, yyyy")}
                 </p>
               </div>
 
               <div className="space-y-2">
                 <Label>Notes (optional)</Label>
                 <Textarea
                   value={approvalNotes}
                   onChange={(e) => setApprovalNotes(e.target.value)}
                   placeholder="Add a note..."
                 />
               </div>
             </div>
           )}
 
           <DialogFooter>
             <Button variant="outline" onClick={() => setDialogAction(null)}>
               Cancel
             </Button>
             <Button
               variant={dialogAction === "approve" ? "default" : "destructive"}
               onClick={() => dialogAction && handleAction(dialogAction)}
               disabled={isProcessing}
             >
               {isProcessing && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
               {dialogAction === "approve" ? "Approve" : "Reject"}
             </Button>
           </DialogFooter>
         </DialogContent>
       </Dialog>
     </div>
   );
 };