 import { useState, useEffect } from "react";
 import { supabase } from "@/integrations/supabase/client";
 import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
 import { Button } from "@/components/ui/button";
 import { Badge } from "@/components/ui/badge";
 import { Input } from "@/components/ui/input";
 import { toast } from "sonner";
 import { Loader2, Check, X, Clock, User } from "lucide-react";
 import { formatDistanceToNow } from "date-fns";
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
 
 interface ProfileRequest {
   id: string;
   user_id: string;
   field_name: string;
   old_value: string | null;
   new_value: string;
   status: string;
   created_at: string;
 }
 
 export const ProfileRequestsPanel = () => {
   const [requests, setRequests] = useState<ProfileRequest[]>([]);
   const [isLoading, setIsLoading] = useState(true);
   const [selectedRequest, setSelectedRequest] = useState<ProfileRequest | null>(null);
   const [reviewNotes, setReviewNotes] = useState("");
   const [isProcessing, setIsProcessing] = useState(false);
   const [dialogAction, setDialogAction] = useState<"approve" | "reject" | null>(null);
 
   useEffect(() => {
     fetchRequests();
   }, []);
 
 const fetchRequests = async () => {
   try {
     const { data, error } = await supabase
       .from("profile_update_requests")
       .select("*")
       .order("created_at", { ascending: false });
 
     if (error) throw error;
     setRequests(data || []);
   } catch (error) {
     console.error("Error fetching requests:", error);
     toast.error("Failed to load requests");
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
 
       // Update request status
       const { error: updateError } = await supabase
         .from("profile_update_requests")
         .update({
           status: action === "approve" ? "approved" : "rejected",
           reviewed_by: user.id,
           reviewed_at: new Date().toISOString(),
           review_notes: reviewNotes,
         })
         .eq("id", selectedRequest.id);
 
       if (updateError) throw updateError;
 
       // If approved, update the profile
       if (action === "approve") {
         const { error: profileError } = await supabase
           .from("profiles")
           .update({ [selectedRequest.field_name]: selectedRequest.new_value })
           .eq("user_id", selectedRequest.user_id);
 
         if (profileError) throw profileError;
       }
 
       // Send notification to user
       await supabase.from("notifications").insert({
         user_id: selectedRequest.user_id,
         title: action === "approve" ? "Request Approved" : "Request Rejected",
         message: `Your request to update ${selectedRequest.field_name.replace("_", " ")} has been ${action === "approve" ? "approved" : "rejected"}.${reviewNotes ? ` Note: ${reviewNotes}` : ""}`,
         type: action === "approve" ? "success" : "error",
       });
 
       toast.success(`Request ${action === "approve" ? "approved" : "rejected"}`);
       setSelectedRequest(null);
       setReviewNotes("");
       setDialogAction(null);
       fetchRequests();
     } catch (error: any) {
       console.error("Error processing request:", error);
       toast.error(error.message || "Failed to process request");
     } finally {
       setIsProcessing(false);
     }
   };
 
   const openActionDialog = (request: ProfileRequest, action: "approve" | "reject") => {
     setSelectedRequest(request);
     setDialogAction(action);
     setReviewNotes("");
   };
 
   const getStatusBadge = (status: string) => {
     switch (status) {
       case "pending":
         return <Badge variant="outline" className="text-amber-500 border-amber-500"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
       case "approved":
         return <Badge variant="outline" className="text-emerald-500 border-emerald-500"><Check className="w-3 h-3 mr-1" />Approved</Badge>;
       case "rejected":
         return <Badge variant="outline" className="text-red-500 border-red-500"><X className="w-3 h-3 mr-1" />Rejected</Badge>;
       default:
         return <Badge variant="outline">{status}</Badge>;
     }
   };
 
   if (isLoading) {
     return (
       <div className="flex items-center justify-center p-8">
         <Loader2 className="w-8 h-8 animate-spin text-primary" />
       </div>
     );
   }
 
   const pendingRequests = requests.filter((r) => r.status === "pending");
   const processedRequests = requests.filter((r) => r.status !== "pending");
 
   return (
     <div className="space-y-6">
       {/* Pending Requests */}
       <Card>
         <CardHeader>
           <CardTitle className="flex items-center gap-2">
             <Clock className="w-5 h-5 text-amber-500" />
             Pending Requests
             {pendingRequests.length > 0 && (
               <Badge variant="secondary">{pendingRequests.length}</Badge>
             )}
           </CardTitle>
           <CardDescription>
             Review and approve or reject profile update requests
           </CardDescription>
         </CardHeader>
         <CardContent>
           {pendingRequests.length === 0 ? (
             <p className="text-muted-foreground text-center py-4">
               No pending requests
             </p>
           ) : (
             <Table>
               <TableHeader>
                 <TableRow>
                   <TableHead>User</TableHead>
                   <TableHead>Field</TableHead>
                   <TableHead>Current Value</TableHead>
                   <TableHead>New Value</TableHead>
                   <TableHead>Requested</TableHead>
                   <TableHead className="text-right">Actions</TableHead>
                 </TableRow>
               </TableHeader>
               <TableBody>
                 {pendingRequests.map((request) => (
                   <TableRow key={request.id}>
                     <TableCell>
                       <div className="flex items-center gap-2">
                         <User className="w-4 h-4 text-muted-foreground" />
                         <span className="text-xs font-mono">{request.user_id.slice(0, 8)}...</span>
                       </div>
                     </TableCell>
                     <TableCell className="capitalize">
                       {request.field_name.replace("_", " ")}
                     </TableCell>
                     <TableCell className="text-muted-foreground">
                       {request.old_value || "—"}
                     </TableCell>
                     <TableCell className="font-medium">
                       {request.new_value}
                     </TableCell>
                     <TableCell>
                       {formatDistanceToNow(new Date(request.created_at), { addSuffix: true })}
                     </TableCell>
                     <TableCell className="text-right">
                       <div className="flex justify-end gap-2">
                         <Button
                           size="sm"
                           variant="outline"
                           className="text-emerald-500 border-emerald-500 hover:bg-emerald-500/10"
                           onClick={() => openActionDialog(request, "approve")}
                         >
                           <Check className="w-4 h-4" />
                         </Button>
                         <Button
                           size="sm"
                           variant="outline"
                           className="text-red-500 border-red-500 hover:bg-red-500/10"
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
 
       {/* Processed Requests History */}
       {processedRequests.length > 0 && (
         <Card>
           <CardHeader>
             <CardTitle>Request History</CardTitle>
           </CardHeader>
           <CardContent>
             <Table>
               <TableHeader>
                 <TableRow>
                   <TableHead>User</TableHead>
                   <TableHead>Field</TableHead>
                   <TableHead>Change</TableHead>
                   <TableHead>Status</TableHead>
                   <TableHead>Processed</TableHead>
                 </TableRow>
               </TableHeader>
               <TableBody>
                 {processedRequests.slice(0, 10).map((request) => (
                   <TableRow key={request.id}>
                     <TableCell>
                       <span className="text-xs font-mono">{request.user_id.slice(0, 8)}...</span>
                     </TableCell>
                     <TableCell className="capitalize">
                       {request.field_name.replace("_", " ")}
                     </TableCell>
                     <TableCell>
                       <span className="text-muted-foreground">{request.old_value || "—"}</span>
                       <span className="mx-2">→</span>
                       <span>{request.new_value}</span>
                     </TableCell>
                     <TableCell>{getStatusBadge(request.status)}</TableCell>
                     <TableCell>
                       {formatDistanceToNow(new Date(request.created_at), { addSuffix: true })}
                     </TableCell>
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
               {dialogAction === "approve" ? "Approve Request" : "Reject Request"}
             </DialogTitle>
             <DialogDescription>
               {dialogAction === "approve"
                 ? "This will update the user's profile with the new value."
                 : "The user will be notified that their request was rejected."}
             </DialogDescription>
           </DialogHeader>
           
           {selectedRequest && (
             <div className="space-y-4">
               <div className="p-4 bg-muted rounded-lg">
                 <p className="text-sm text-muted-foreground">Requested Change</p>
                 <p className="font-medium capitalize">
                   {selectedRequest.field_name.replace("_", " ")}:
                 </p>
                 <p>
                   <span className="text-muted-foreground">{selectedRequest.old_value || "—"}</span>
                   <span className="mx-2">→</span>
                   <span className="font-medium">{selectedRequest.new_value}</span>
                 </p>
               </div>
 
               <div className="space-y-2">
                 <Label htmlFor="notes">Notes (optional)</Label>
                 <Textarea
                   id="notes"
                   value={reviewNotes}
                   onChange={(e) => setReviewNotes(e.target.value)}
                   placeholder="Add a note for the user..."
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
               {isProcessing ? (
                 <Loader2 className="w-4 h-4 animate-spin mr-2" />
               ) : dialogAction === "approve" ? (
                 <Check className="w-4 h-4 mr-2" />
               ) : (
                 <X className="w-4 h-4 mr-2" />
               )}
               {dialogAction === "approve" ? "Approve" : "Reject"}
             </Button>
           </DialogFooter>
         </DialogContent>
       </Dialog>
     </div>
   );
 };