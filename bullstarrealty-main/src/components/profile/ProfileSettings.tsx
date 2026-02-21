 import { useState, useEffect } from "react";
 import { supabase } from "@/integrations/supabase/client";
 import { Button } from "@/components/ui/button";
 import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
 import { Input } from "@/components/ui/input";
 import { Label } from "@/components/ui/label";
 import { toast } from "sonner";
 import { Loader2, User, Mail, Phone, Lock, Save, Clock } from "lucide-react";
 import { Badge } from "@/components/ui/badge";
 
 interface ProfileData {
   full_name: string | null;
   email: string | null;
   country: string | null;
 }
 
 interface PendingRequest {
   id: string;
   field_name: string;
   new_value: string;
   status: string;
   created_at: string;
 }
 
 export const ProfileSettings = () => {
   const [profile, setProfile] = useState<ProfileData | null>(null);
   const [isLoading, setIsLoading] = useState(true);
   const [isSaving, setIsSaving] = useState(false);
   const [pendingRequests, setPendingRequests] = useState<PendingRequest[]>([]);
   
   // Form fields
   const [fullName, setFullName] = useState("");
   const [phone, setPhone] = useState("");
   
   // Password change
   const [currentPassword, setCurrentPassword] = useState("");
   const [newPassword, setNewPassword] = useState("");
   const [confirmPassword, setConfirmPassword] = useState("");
   const [isChangingPassword, setIsChangingPassword] = useState(false);
 
   useEffect(() => {
     fetchProfile();
     fetchPendingRequests();
   }, []);
 
   const fetchProfile = async () => {
     try {
       const { data: { user } } = await supabase.auth.getUser();
       if (!user) return;
 
       const { data, error } = await supabase
         .from("profiles")
         .select("full_name, email, country")
         .eq("user_id", user.id)
         .single();
 
       if (error) throw error;
       
       setProfile(data);
       setFullName(data.full_name || "");
     } catch (error) {
       console.error("Error fetching profile:", error);
       toast.error("Failed to load profile");
     } finally {
       setIsLoading(false);
     }
   };
 
   const fetchPendingRequests = async () => {
     try {
       const { data: { user } } = await supabase.auth.getUser();
       if (!user) return;
 
       const { data, error } = await supabase
         .from("profile_update_requests")
         .select("id, field_name, new_value, status, created_at")
         .eq("user_id", user.id)
         .eq("status", "pending")
         .order("created_at", { ascending: false });
 
       if (error) throw error;
       setPendingRequests(data || []);
     } catch (error) {
       console.error("Error fetching pending requests:", error);
     }
   };
 
   const submitUpdateRequest = async (fieldName: string, oldValue: string | null, newValue: string) => {
     if (oldValue === newValue) {
       toast.info("No changes detected");
       return;
     }
 
     setIsSaving(true);
     try {
       const { data: { user } } = await supabase.auth.getUser();
       if (!user) throw new Error("Not authenticated");
 
       const { error } = await supabase.from("profile_update_requests").insert({
         user_id: user.id,
         field_name: fieldName,
         old_value: oldValue,
         new_value: newValue,
       });
 
       if (error) throw error;
 
       // Create notification for admins
       const { data: adminRoles } = await supabase
         .from("user_roles")
         .select("user_id")
         .in("role", ["admin", "super_admin"]);
 
       if (adminRoles) {
         const notifications = adminRoles.map((admin) => ({
           user_id: admin.user_id,
           title: "Profile Update Request",
           message: `${profile?.full_name || profile?.email} requested to update their ${fieldName}`,
           type: "request" as const,
           link: "/admin/dashboard?tab=requests",
         }));
 
         await supabase.from("notifications").insert(notifications);
       }
 
       toast.success("Update request submitted for approval");
       fetchPendingRequests();
     } catch (error: any) {
       console.error("Error submitting request:", error);
       toast.error(error.message || "Failed to submit request");
     } finally {
       setIsSaving(false);
     }
   };
 
   const handlePasswordChange = async () => {
     if (newPassword !== confirmPassword) {
       toast.error("Passwords do not match");
       return;
     }
 
     if (newPassword.length < 8) {
       toast.error("Password must be at least 8 characters");
       return;
     }
 
     setIsChangingPassword(true);
     try {
       const { error } = await supabase.auth.updateUser({
         password: newPassword,
       });
 
       if (error) throw error;
 
       toast.success("Password changed successfully");
       setCurrentPassword("");
       setNewPassword("");
       setConfirmPassword("");
     } catch (error: any) {
       console.error("Error changing password:", error);
       toast.error(error.message || "Failed to change password");
     } finally {
       setIsChangingPassword(false);
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
     <div className="space-y-6">
       {/* Pending Requests */}
       {pendingRequests.length > 0 && (
         <Card className="border-warning/50 bg-warning/5">
           <CardHeader className="pb-3">
             <CardTitle className="text-base flex items-center gap-2">
               <Clock className="w-4 h-4 text-warning" />
               Pending Approval Requests
             </CardTitle>
           </CardHeader>
           <CardContent>
             <div className="space-y-2">
               {pendingRequests.map((request) => (
                 <div key={request.id} className="flex items-center justify-between p-3 bg-card rounded-lg border">
                   <div>
                     <span className="font-medium capitalize">{request.field_name.replace("_", " ")}</span>
                     <span className="text-muted-foreground mx-2">→</span>
                     <span>{request.new_value}</span>
                   </div>
                   <Badge variant="outline" className="text-warning border-warning">
                     Pending
                   </Badge>
                 </div>
               ))}
             </div>
           </CardContent>
         </Card>
       )}
 
       {/* Profile Information */}
       <Card>
         <CardHeader>
           <CardTitle className="flex items-center gap-2">
             <User className="w-5 h-5" />
             Profile Information
           </CardTitle>
           <CardDescription>
             Update your profile details. All changes require admin approval.
           </CardDescription>
         </CardHeader>
         <CardContent className="space-y-4">
           <div className="grid gap-4 md:grid-cols-2">
             <div className="space-y-2">
               <Label htmlFor="fullName">Full Name</Label>
               <div className="flex gap-2">
                 <Input
                   id="fullName"
                   value={fullName}
                   onChange={(e) => setFullName(e.target.value)}
                   placeholder="Enter your full name"
                 />
                 <Button
                   size="sm"
                   onClick={() => submitUpdateRequest("full_name", profile?.full_name || null, fullName)}
                   disabled={isSaving || fullName === (profile?.full_name || "")}
                 >
                   {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                 </Button>
               </div>
             </div>
 
             <div className="space-y-2">
               <Label htmlFor="email">Email</Label>
               <div className="flex items-center gap-2">
                 <Input
                   id="email"
                   value={profile?.email || ""}
                   disabled
                   className="bg-muted"
                 />
                 <Mail className="w-4 h-4 text-muted-foreground" />
               </div>
               <p className="text-xs text-muted-foreground">Email cannot be changed</p>
             </div>
           </div>
 
           <div className="space-y-2">
             <Label>Country</Label>
             <Input
               value={profile?.country === "dubai" ? "🇦🇪 Dubai" : profile?.country === "india" ? "🇮🇳 India" : "Not assigned"}
               disabled
               className="bg-muted max-w-xs"
             />
           </div>
         </CardContent>
       </Card>
 
       {/* Change Password */}
       <Card>
         <CardHeader>
           <CardTitle className="flex items-center gap-2">
             <Lock className="w-5 h-5" />
             Change Password
           </CardTitle>
           <CardDescription>
             Update your password to keep your account secure.
           </CardDescription>
         </CardHeader>
         <CardContent className="space-y-4">
           <div className="grid gap-4 md:grid-cols-3">
             <div className="space-y-2">
               <Label htmlFor="newPassword">New Password</Label>
               <Input
                 id="newPassword"
                 type="password"
                 value={newPassword}
                 onChange={(e) => setNewPassword(e.target.value)}
                 placeholder="Enter new password"
               />
             </div>
             <div className="space-y-2">
               <Label htmlFor="confirmPassword">Confirm Password</Label>
               <Input
                 id="confirmPassword"
                 type="password"
                 value={confirmPassword}
                 onChange={(e) => setConfirmPassword(e.target.value)}
                 placeholder="Confirm new password"
               />
             </div>
             <div className="flex items-end">
               <Button
                 onClick={handlePasswordChange}
                 disabled={isChangingPassword || !newPassword || !confirmPassword}
                 className="w-full"
               >
                 {isChangingPassword ? (
                   <Loader2 className="w-4 h-4 animate-spin mr-2" />
                 ) : (
                   <Lock className="w-4 h-4 mr-2" />
                 )}
                 Change Password
               </Button>
             </div>
           </div>
           <p className="text-xs text-muted-foreground">
             Password must be at least 8 characters long.
           </p>
         </CardContent>
       </Card>
     </div>
   );
 };