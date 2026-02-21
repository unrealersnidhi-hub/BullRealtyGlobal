 import { useState, useEffect } from "react";
 import { supabase } from "@/integrations/supabase/client";
 import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
 import { Button } from "@/components/ui/button";
 import { Input } from "@/components/ui/input";
 import { Label } from "@/components/ui/label";
 import { Badge } from "@/components/ui/badge";
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
 import { Loader2, Plus, Search, User, Edit, Trash2 } from "lucide-react";
 import { format } from "date-fns";
 
 interface Employee {
   id: string;
   employee_code: string | null;
   full_name: string;
   email: string;
   phone: string | null;
   department: string | null;
   designation: string | null;
   date_of_joining: string | null;
   employment_status: string | null;
   country: string | null;
 }
 
 export const EmployeeDirectory = () => {
   const [employees, setEmployees] = useState<Employee[]>([]);
   const [isLoading, setIsLoading] = useState(true);
   const [searchQuery, setSearchQuery] = useState("");
   const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
   const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
   const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
   const [isSaving, setIsSaving] = useState(false);
 
   // Form state
   const [formData, setFormData] = useState({
     full_name: "",
     email: "",
     phone: "",
     department: "",
     designation: "",
     date_of_joining: "",
     employment_status: "active",
     country: "",
   });
 
   useEffect(() => {
     fetchEmployees();
   }, []);
 
   const fetchEmployees = async () => {
     try {
       const { data, error } = await supabase
         .from("employees")
         .select("*")
         .order("full_name");
 
       if (error) throw error;
       setEmployees(data || []);
     } catch (error) {
       console.error("Error fetching employees:", error);
       toast.error("Failed to load employees");
     } finally {
       setIsLoading(false);
     }
   };
 
   const handleAddEmployee = async () => {
     if (!formData.full_name || !formData.email) {
       toast.error("Name and email are required");
       return;
     }
 
     setIsSaving(true);
     try {
       const { error } = await supabase.from("employees").insert({
         full_name: formData.full_name,
         email: formData.email,
         phone: formData.phone || null,
         department: formData.department || null,
         designation: formData.designation || null,
         date_of_joining: formData.date_of_joining || null,
         employment_status: formData.employment_status,
         country: formData.country as "dubai" | "india" || null,
       });
 
       if (error) throw error;
 
       toast.success("Employee added successfully");
       setIsAddDialogOpen(false);
       resetForm();
       fetchEmployees();
     } catch (error: any) {
       console.error("Error adding employee:", error);
       toast.error(error.message || "Failed to add employee");
     } finally {
       setIsSaving(false);
     }
   };
 
   const handleEditEmployee = async () => {
     if (!selectedEmployee || !formData.full_name || !formData.email) {
       toast.error("Name and email are required");
       return;
     }
 
     setIsSaving(true);
     try {
       const { error } = await supabase
         .from("employees")
         .update({
           full_name: formData.full_name,
           email: formData.email,
           phone: formData.phone || null,
           department: formData.department || null,
           designation: formData.designation || null,
           date_of_joining: formData.date_of_joining || null,
           employment_status: formData.employment_status,
           country: formData.country as "dubai" | "india" || null,
         })
         .eq("id", selectedEmployee.id);
 
       if (error) throw error;
 
       toast.success("Employee updated successfully");
       setIsEditDialogOpen(false);
       resetForm();
       fetchEmployees();
     } catch (error: any) {
       console.error("Error updating employee:", error);
       toast.error(error.message || "Failed to update employee");
     } finally {
       setIsSaving(false);
     }
   };
 
   const handleDeleteEmployee = async (id: string) => {
     if (!confirm("Are you sure you want to delete this employee?")) return;
 
     try {
       const { error } = await supabase.from("employees").delete().eq("id", id);
       if (error) throw error;
 
       toast.success("Employee deleted");
       fetchEmployees();
     } catch (error: any) {
       console.error("Error deleting employee:", error);
       toast.error(error.message || "Failed to delete employee");
     }
   };
 
   const openEditDialog = (employee: Employee) => {
     setSelectedEmployee(employee);
     setFormData({
       full_name: employee.full_name,
       email: employee.email,
       phone: employee.phone || "",
       department: employee.department || "",
       designation: employee.designation || "",
       date_of_joining: employee.date_of_joining || "",
       employment_status: employee.employment_status || "active",
       country: employee.country || "",
     });
     setIsEditDialogOpen(true);
   };
 
   const resetForm = () => {
     setFormData({
       full_name: "",
       email: "",
       phone: "",
       department: "",
       designation: "",
       date_of_joining: "",
       employment_status: "active",
       country: "",
     });
     setSelectedEmployee(null);
   };
 
   const filteredEmployees = employees.filter(
     (e) =>
       e.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
       e.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
       (e.department?.toLowerCase() || "").includes(searchQuery.toLowerCase())
   );
 
   const getStatusBadge = (status: string | null) => {
     switch (status) {
       case "active":
         return <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20">Active</Badge>;
       case "on_leave":
         return <Badge className="bg-amber-500/10 text-amber-500 border-amber-500/20">On Leave</Badge>;
       case "probation":
         return <Badge className="bg-blue-500/10 text-blue-500 border-blue-500/20">Probation</Badge>;
       case "terminated":
         return <Badge className="bg-red-500/10 text-red-500 border-red-500/20">Terminated</Badge>;
       default:
         return <Badge variant="outline">{status || "Unknown"}</Badge>;
     }
   };
 
   const EmployeeForm = ({ onSubmit, submitLabel }: { onSubmit: () => void; submitLabel: string }) => (
     <div className="grid gap-4 py-4">
       <div className="grid grid-cols-2 gap-4">
         <div className="space-y-2">
           <Label>Full Name *</Label>
           <Input
             value={formData.full_name}
             onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
             placeholder="John Doe"
           />
         </div>
         <div className="space-y-2">
           <Label>Email *</Label>
           <Input
             type="email"
             value={formData.email}
             onChange={(e) => setFormData({ ...formData, email: e.target.value })}
             placeholder="john@example.com"
           />
         </div>
       </div>
       <div className="grid grid-cols-2 gap-4">
         <div className="space-y-2">
           <Label>Phone</Label>
           <Input
             value={formData.phone}
             onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
             placeholder="+1234567890"
           />
         </div>
         <div className="space-y-2">
           <Label>Department</Label>
           <Input
             value={formData.department}
             onChange={(e) => setFormData({ ...formData, department: e.target.value })}
             placeholder="Sales"
           />
         </div>
       </div>
       <div className="grid grid-cols-2 gap-4">
         <div className="space-y-2">
           <Label>Designation</Label>
           <Input
             value={formData.designation}
             onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
             placeholder="Sales Manager"
           />
         </div>
         <div className="space-y-2">
           <Label>Date of Joining</Label>
           <Input
             type="date"
             value={formData.date_of_joining}
             onChange={(e) => setFormData({ ...formData, date_of_joining: e.target.value })}
           />
         </div>
       </div>
       <div className="grid grid-cols-2 gap-4">
         <div className="space-y-2">
           <Label>Status</Label>
           <Select
             value={formData.employment_status}
             onValueChange={(value) => setFormData({ ...formData, employment_status: value })}
           >
             <SelectTrigger>
               <SelectValue />
             </SelectTrigger>
             <SelectContent>
               <SelectItem value="active">Active</SelectItem>
               <SelectItem value="probation">Probation</SelectItem>
               <SelectItem value="on_leave">On Leave</SelectItem>
               <SelectItem value="terminated">Terminated</SelectItem>
             </SelectContent>
           </Select>
         </div>
         <div className="space-y-2">
           <Label>Country</Label>
           <Select
             value={formData.country}
             onValueChange={(value) => setFormData({ ...formData, country: value })}
           >
             <SelectTrigger>
               <SelectValue placeholder="Select country" />
             </SelectTrigger>
             <SelectContent>
               <SelectItem value="dubai">🇦🇪 Dubai</SelectItem>
               <SelectItem value="india">🇮🇳 India</SelectItem>
             </SelectContent>
           </Select>
         </div>
       </div>
       <DialogFooter>
         <Button onClick={onSubmit} disabled={isSaving}>
           {isSaving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
           {submitLabel}
         </Button>
       </DialogFooter>
     </div>
   );
 
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
               <User className="w-5 h-5" />
               Employee Directory
             </CardTitle>
             <CardDescription>Manage all employees in the organization</CardDescription>
           </div>
           <div className="flex items-center gap-3">
             <div className="relative">
               <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
               <Input
                 placeholder="Search employees..."
                 value={searchQuery}
                 onChange={(e) => setSearchQuery(e.target.value)}
                 className="pl-9 w-[200px]"
               />
             </div>
             <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
               <DialogTrigger asChild>
                 <Button onClick={() => resetForm()}>
                   <Plus className="w-4 h-4 mr-2" />
                   Add Employee
                 </Button>
               </DialogTrigger>
               <DialogContent className="max-w-2xl">
                 <DialogHeader>
                   <DialogTitle>Add New Employee</DialogTitle>
                   <DialogDescription>Enter the employee details below.</DialogDescription>
                 </DialogHeader>
                 <EmployeeForm onSubmit={handleAddEmployee} submitLabel="Add Employee" />
               </DialogContent>
             </Dialog>
           </div>
         </div>
       </CardHeader>
       <CardContent>
         {filteredEmployees.length === 0 ? (
           <div className="text-center py-8 text-muted-foreground">
             {searchQuery ? "No employees found matching your search" : "No employees yet. Add your first employee."}
           </div>
         ) : (
           <Table>
             <TableHeader>
               <TableRow>
                 <TableHead>Employee</TableHead>
                 <TableHead>Department</TableHead>
                 <TableHead>Designation</TableHead>
                 <TableHead>Joined</TableHead>
                 <TableHead>Status</TableHead>
                 <TableHead className="text-right">Actions</TableHead>
               </TableRow>
             </TableHeader>
             <TableBody>
               {filteredEmployees.map((employee) => (
                 <TableRow key={employee.id}>
                   <TableCell>
                     <div>
                       <p className="font-medium">{employee.full_name}</p>
                       <p className="text-sm text-muted-foreground">{employee.email}</p>
                       {employee.employee_code && (
                         <p className="text-xs text-muted-foreground">{employee.employee_code}</p>
                       )}
                     </div>
                   </TableCell>
                   <TableCell>{employee.department || "—"}</TableCell>
                   <TableCell>{employee.designation || "—"}</TableCell>
                   <TableCell>
                     {employee.date_of_joining
                       ? format(new Date(employee.date_of_joining), "MMM dd, yyyy")
                       : "—"}
                   </TableCell>
                   <TableCell>{getStatusBadge(employee.employment_status)}</TableCell>
                   <TableCell className="text-right">
                     <div className="flex justify-end gap-2">
                       <Button size="sm" variant="ghost" onClick={() => openEditDialog(employee)}>
                         <Edit className="w-4 h-4" />
                       </Button>
                       <Button
                         size="sm"
                         variant="ghost"
                         className="text-red-500 hover:text-red-600"
                         onClick={() => handleDeleteEmployee(employee.id)}
                       >
                         <Trash2 className="w-4 h-4" />
                       </Button>
                     </div>
                   </TableCell>
                 </TableRow>
               ))}
             </TableBody>
           </Table>
         )}
 
         {/* Edit Dialog */}
         <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
           <DialogContent className="max-w-2xl">
             <DialogHeader>
               <DialogTitle>Edit Employee</DialogTitle>
               <DialogDescription>Update the employee details.</DialogDescription>
             </DialogHeader>
             <EmployeeForm onSubmit={handleEditEmployee} submitLabel="Save Changes" />
           </DialogContent>
         </Dialog>
       </CardContent>
     </Card>
   );
 };