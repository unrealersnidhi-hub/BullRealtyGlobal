 import { useState, useEffect } from "react";
 import { supabase } from "@/integrations/supabase/client";
 import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
 import { Button } from "@/components/ui/button";
 import { Badge } from "@/components/ui/badge";
 import { Input } from "@/components/ui/input";
 import { Label } from "@/components/ui/label";
 import { Textarea } from "@/components/ui/textarea";
 import { toast } from "sonner";
 import {
   Dialog,
   DialogContent,
   DialogDescription,
   DialogFooter,
   DialogHeader,
   DialogTitle,
   DialogTrigger,
 } from "@/components/ui/dialog";
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
 import { Loader2, Star, Plus, Eye } from "lucide-react";
 import { format } from "date-fns";
 
 interface Employee {
   id: string;
   full_name: string;
   department: string | null;
 }
 
 interface PerformanceReview {
   id: string;
   employee_id: string;
   reviewer_id: string;
   review_period_start: string;
   review_period_end: string;
   overall_rating: number | null;
   goals_achieved: string | null;
   areas_of_improvement: string | null;
   strengths: string | null;
   comments: string | null;
   status: string | null;
   created_at: string;
   employee?: {
     full_name: string;
     department: string | null;
   };
 }
 
 export const PerformanceReviews = () => {
   const [reviews, setReviews] = useState<PerformanceReview[]>([]);
   const [employees, setEmployees] = useState<Employee[]>([]);
   const [isLoading, setIsLoading] = useState(true);
   const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
   const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
   const [selectedReview, setSelectedReview] = useState<PerformanceReview | null>(null);
   const [isSaving, setIsSaving] = useState(false);
 
   const [formData, setFormData] = useState({
     employee_id: "",
     review_period_start: "",
     review_period_end: "",
     overall_rating: "",
     goals_achieved: "",
     areas_of_improvement: "",
     strengths: "",
     comments: "",
   });
 
   useEffect(() => {
     fetchData();
   }, []);
 
   const fetchData = async () => {
     try {
       const [reviewsRes, employeesRes] = await Promise.all([
         supabase
           .from("performance_reviews")
           .select(`
             *,
             employee:employees(full_name, department)
           `)
           .order("created_at", { ascending: false }),
         supabase
           .from("employees")
           .select("id, full_name, department")
           .eq("employment_status", "active")
           .order("full_name"),
       ]);
 
       if (reviewsRes.error) throw reviewsRes.error;
       if (employeesRes.error) throw employeesRes.error;
 
       setReviews(reviewsRes.data || []);
       setEmployees(employeesRes.data || []);
     } catch (error) {
       console.error("Error fetching data:", error);
       toast.error("Failed to load data");
     } finally {
       setIsLoading(false);
     }
   };
 
   const handleAddReview = async () => {
     if (!formData.employee_id || !formData.review_period_start || !formData.review_period_end) {
       toast.error("Please fill in required fields");
       return;
     }
 
     setIsSaving(true);
     try {
       const { data: { user } } = await supabase.auth.getUser();
       if (!user) throw new Error("Not authenticated");
 
       const { error } = await supabase.from("performance_reviews").insert({
         employee_id: formData.employee_id,
         reviewer_id: user.id,
         review_period_start: formData.review_period_start,
         review_period_end: formData.review_period_end,
         overall_rating: formData.overall_rating ? parseInt(formData.overall_rating) : null,
         goals_achieved: formData.goals_achieved || null,
         areas_of_improvement: formData.areas_of_improvement || null,
         strengths: formData.strengths || null,
         comments: formData.comments || null,
         status: "submitted",
       });
 
       if (error) throw error;
 
       toast.success("Review submitted successfully");
       setIsAddDialogOpen(false);
       resetForm();
       fetchData();
     } catch (error: any) {
       console.error("Error adding review:", error);
       toast.error(error.message || "Failed to add review");
     } finally {
       setIsSaving(false);
     }
   };
 
   const resetForm = () => {
     setFormData({
       employee_id: "",
       review_period_start: "",
       review_period_end: "",
       overall_rating: "",
       goals_achieved: "",
       areas_of_improvement: "",
       strengths: "",
       comments: "",
     });
   };
 
   const getRatingStars = (rating: number | null) => {
     if (!rating) return "—";
     return (
       <div className="flex items-center gap-0.5">
         {[1, 2, 3, 4, 5].map((star) => (
           <Star
             key={star}
             className={`w-4 h-4 ${
               star <= rating ? "fill-amber-400 text-amber-400" : "text-muted"
             }`}
           />
         ))}
       </div>
     );
   };
 
   const getStatusBadge = (status: string | null) => {
     switch (status) {
       case "draft":
         return <Badge variant="outline">Draft</Badge>;
       case "submitted":
         return <Badge className="bg-blue-500/10 text-blue-500">Submitted</Badge>;
       case "acknowledged":
         return <Badge className="bg-emerald-500/10 text-emerald-500">Acknowledged</Badge>;
       default:
         return <Badge variant="outline">{status || "Unknown"}</Badge>;
     }
   };
 
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
               <Star className="w-5 h-5" />
               Performance Reviews
             </CardTitle>
             <CardDescription>Manage employee performance reviews</CardDescription>
           </div>
           <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
             <DialogTrigger asChild>
               <Button onClick={resetForm}>
                 <Plus className="w-4 h-4 mr-2" />
                 New Review
               </Button>
             </DialogTrigger>
             <DialogContent className="max-w-2xl">
               <DialogHeader>
                 <DialogTitle>Create Performance Review</DialogTitle>
                 <DialogDescription>
                   Evaluate employee performance for a specific period.
                 </DialogDescription>
               </DialogHeader>
               <div className="grid gap-4 py-4">
                 <div className="space-y-2">
                   <Label>Employee *</Label>
                   <Select
                     value={formData.employee_id}
                     onValueChange={(value) => setFormData({ ...formData, employee_id: value })}
                   >
                     <SelectTrigger>
                       <SelectValue placeholder="Select employee" />
                     </SelectTrigger>
                     <SelectContent>
                       {employees.map((emp) => (
                         <SelectItem key={emp.id} value={emp.id}>
                           {emp.full_name} {emp.department && `(${emp.department})`}
                         </SelectItem>
                       ))}
                     </SelectContent>
                   </Select>
                 </div>
                 <div className="grid grid-cols-2 gap-4">
                   <div className="space-y-2">
                     <Label>Review Period Start *</Label>
                     <Input
                       type="date"
                       value={formData.review_period_start}
                       onChange={(e) => setFormData({ ...formData, review_period_start: e.target.value })}
                     />
                   </div>
                   <div className="space-y-2">
                     <Label>Review Period End *</Label>
                     <Input
                       type="date"
                       value={formData.review_period_end}
                       onChange={(e) => setFormData({ ...formData, review_period_end: e.target.value })}
                     />
                   </div>
                 </div>
                 <div className="space-y-2">
                   <Label>Overall Rating</Label>
                   <Select
                     value={formData.overall_rating}
                     onValueChange={(value) => setFormData({ ...formData, overall_rating: value })}
                   >
                     <SelectTrigger>
                       <SelectValue placeholder="Select rating" />
                     </SelectTrigger>
                     <SelectContent>
                       <SelectItem value="1">1 - Needs Improvement</SelectItem>
                       <SelectItem value="2">2 - Below Expectations</SelectItem>
                       <SelectItem value="3">3 - Meets Expectations</SelectItem>
                       <SelectItem value="4">4 - Exceeds Expectations</SelectItem>
                       <SelectItem value="5">5 - Outstanding</SelectItem>
                     </SelectContent>
                   </Select>
                 </div>
                 <div className="space-y-2">
                   <Label>Goals Achieved</Label>
                   <Textarea
                     value={formData.goals_achieved}
                     onChange={(e) => setFormData({ ...formData, goals_achieved: e.target.value })}
                     placeholder="List goals achieved during the review period..."
                   />
                 </div>
                 <div className="space-y-2">
                   <Label>Strengths</Label>
                   <Textarea
                     value={formData.strengths}
                     onChange={(e) => setFormData({ ...formData, strengths: e.target.value })}
                     placeholder="Key strengths demonstrated..."
                   />
                 </div>
                 <div className="space-y-2">
                   <Label>Areas of Improvement</Label>
                   <Textarea
                     value={formData.areas_of_improvement}
                     onChange={(e) => setFormData({ ...formData, areas_of_improvement: e.target.value })}
                     placeholder="Areas that need improvement..."
                   />
                 </div>
                 <div className="space-y-2">
                   <Label>Additional Comments</Label>
                   <Textarea
                     value={formData.comments}
                     onChange={(e) => setFormData({ ...formData, comments: e.target.value })}
                     placeholder="Any additional feedback..."
                   />
                 </div>
               </div>
               <DialogFooter>
                 <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                   Cancel
                 </Button>
                 <Button onClick={handleAddReview} disabled={isSaving}>
                   {isSaving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                   Submit Review
                 </Button>
               </DialogFooter>
             </DialogContent>
           </Dialog>
         </div>
       </CardHeader>
       <CardContent>
         {reviews.length === 0 ? (
           <div className="text-center py-8 text-muted-foreground">
             No performance reviews yet. Create one to get started.
           </div>
         ) : (
           <Table>
             <TableHeader>
               <TableRow>
                 <TableHead>Employee</TableHead>
                 <TableHead>Period</TableHead>
                 <TableHead>Rating</TableHead>
                 <TableHead>Status</TableHead>
                 <TableHead>Created</TableHead>
                 <TableHead className="text-right">Actions</TableHead>
               </TableRow>
             </TableHeader>
             <TableBody>
               {reviews.map((review) => (
                 <TableRow key={review.id}>
                   <TableCell>
                     <div>
                       <p className="font-medium">{review.employee?.full_name || "Unknown"}</p>
                       <p className="text-sm text-muted-foreground">{review.employee?.department || "—"}</p>
                     </div>
                   </TableCell>
                   <TableCell>
                     {format(new Date(review.review_period_start), "MMM yyyy")} -{" "}
                     {format(new Date(review.review_period_end), "MMM yyyy")}
                   </TableCell>
                   <TableCell>{getRatingStars(review.overall_rating)}</TableCell>
                   <TableCell>{getStatusBadge(review.status)}</TableCell>
                   <TableCell>{format(new Date(review.created_at), "MMM dd, yyyy")}</TableCell>
                   <TableCell className="text-right">
                     <Button
                       size="sm"
                       variant="ghost"
                       onClick={() => {
                         setSelectedReview(review);
                         setIsViewDialogOpen(true);
                       }}
                     >
                       <Eye className="w-4 h-4" />
                     </Button>
                   </TableCell>
                 </TableRow>
               ))}
             </TableBody>
           </Table>
         )}
 
         {/* View Review Dialog */}
         <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
           <DialogContent className="max-w-2xl">
             <DialogHeader>
               <DialogTitle>Performance Review Details</DialogTitle>
             </DialogHeader>
             {selectedReview && (
               <div className="space-y-4">
                 <div className="flex items-center justify-between">
                   <div>
                     <p className="font-medium text-lg">{selectedReview.employee?.full_name}</p>
                     <p className="text-muted-foreground">{selectedReview.employee?.department}</p>
                   </div>
                   {getRatingStars(selectedReview.overall_rating)}
                 </div>
                 
                 <div className="p-4 bg-muted rounded-lg">
                   <p className="text-sm text-muted-foreground mb-1">Review Period</p>
                   <p>
                     {format(new Date(selectedReview.review_period_start), "MMMM yyyy")} -{" "}
                     {format(new Date(selectedReview.review_period_end), "MMMM yyyy")}
                   </p>
                 </div>
 
                 {selectedReview.goals_achieved && (
                   <div>
                     <p className="font-medium mb-1">Goals Achieved</p>
                     <p className="text-muted-foreground">{selectedReview.goals_achieved}</p>
                   </div>
                 )}
 
                 {selectedReview.strengths && (
                   <div>
                     <p className="font-medium mb-1">Strengths</p>
                     <p className="text-muted-foreground">{selectedReview.strengths}</p>
                   </div>
                 )}
 
                 {selectedReview.areas_of_improvement && (
                   <div>
                     <p className="font-medium mb-1">Areas of Improvement</p>
                     <p className="text-muted-foreground">{selectedReview.areas_of_improvement}</p>
                   </div>
                 )}
 
                 {selectedReview.comments && (
                   <div>
                     <p className="font-medium mb-1">Comments</p>
                     <p className="text-muted-foreground">{selectedReview.comments}</p>
                   </div>
                 )}
               </div>
             )}
           </DialogContent>
         </Dialog>
       </CardContent>
     </Card>
   );
 };