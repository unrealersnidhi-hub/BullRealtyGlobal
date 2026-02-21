import { useState } from "react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Loader2, UserPlus, Trash2, Users, Shield, User, MoreHorizontal, Pencil, KeyRound } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface TeamMember {
  id: string;
  email: string;
  fullName: string | null;
  roles: string[];
  createdAt: string;
  lastSignIn: string | null;
  country: 'dubai' | 'india' | null;
}

type CountryCode = 'dubai' | 'india';
type RoleType = "admin" | "user" | "blog_writer" | "super_admin" | "manager" | "telesales" | "mis" | "hr";

interface TeamMembersTableProps {
  teamMembers: TeamMember[];
  currentUserId?: string;
  onRefresh: () => void;
  isLoading: boolean;
}

const roleConfig: Record<string, { label: string; color: string; icon: typeof Shield }> = {
  super_admin: { label: "Super Admin", color: "bg-purple-500/10 text-purple-600 border-purple-200", icon: Shield },
  admin: { label: "Admin", color: "bg-[hsl(var(--gold))]/10 text-[hsl(var(--gold))] border-[hsl(var(--gold))]/30", icon: Shield },
  manager: { label: "Manager", color: "bg-blue-500/10 text-blue-600 border-blue-200", icon: User },
  user: { label: "Sales", color: "bg-emerald-500/10 text-emerald-600 border-emerald-200", icon: User },
  telesales: { label: "Telesales", color: "bg-cyan-500/10 text-cyan-600 border-cyan-200", icon: User },
  mis: { label: "MIS", color: "bg-indigo-500/10 text-indigo-600 border-indigo-200", icon: User },
  hr: { label: "HR", color: "bg-pink-500/10 text-pink-600 border-pink-200", icon: User },
  blog_writer: { label: "Writer", color: "bg-amber-500/10 text-amber-600 border-amber-200", icon: User },
};

export const TeamMembersTable = ({
  teamMembers,
  currentUserId,
  onRefresh,
  isLoading,
}: TeamMembersTableProps) => {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [deleteUserId, setDeleteUserId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Edit state
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [editForm, setEditForm] = useState({
    fullName: "",
    role: "user" as RoleType,
    country: "dubai" as CountryCode,
  });

  // Password reset state
  const [resetPasswordMember, setResetPasswordMember] = useState<TeamMember | null>(null);
  const [isResetPasswordOpen, setIsResetPasswordOpen] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [form, setForm] = useState({
    email: "",
    password: "",
    fullName: "",
    role: "user" as RoleType,
    country: "dubai" as CountryCode,
  });

  const handleCreate = async () => {
    if (!form.email || !form.password) {
      toast.error("Email and password are required");
      return;
    }

    if (form.password.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }

    setIsCreating(true);

    try {
      const response = await supabase.functions.invoke("create-team-user", {
        body: {
          email: form.email,
          password: form.password,
          fullName: form.fullName,
          role: form.role,
          country: form.country,
        },
      });

      if (response.error) throw new Error(response.error.message);
      if (response.data?.error) throw new Error(response.data.error);

      toast.success(`Team member ${form.email} created successfully`);
      setIsCreateOpen(false);
      setForm({ email: "", password: "", fullName: "", role: "user", country: "dubai" });
      onRefresh();
    } catch (error: any) {
      console.error("Error creating user:", error);
      toast.error(error.message || "Failed to create user");
    } finally {
      setIsCreating(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteUserId) return;

    setIsDeleting(true);

    try {
      const response = await supabase.functions.invoke("delete-team-member", {
        body: { userId: deleteUserId },
      });

      if (response.error) throw new Error(response.error.message);
      if (response.data?.error) throw new Error(response.data.error);

      toast.success("Team member deleted successfully");
      setDeleteUserId(null);
      onRefresh();
    } catch (error: any) {
      console.error("Error deleting user:", error);
      toast.error(error.message || "Failed to delete user");
    } finally {
      setIsDeleting(false);
    }
  };

  const openEditDialog = (member: TeamMember) => {
    setEditingMember(member);
    setEditForm({
      fullName: member.fullName || "",
      role: (member.roles[0] as RoleType) || "user",
      country: member.country || "dubai",
    });
    setIsEditOpen(true);
  };

  const handleUpdate = async () => {
    if (!editingMember) return;

    setIsUpdating(true);

    try {
      const response = await supabase.functions.invoke("update-team-member", {
        body: {
          userId: editingMember.id,
          action: "update_profile",
          fullName: editForm.fullName,
          role: editForm.role,
          country: editForm.country,
        },
      });

      if (response.error) throw new Error(response.error.message);
      if (response.data?.error) throw new Error(response.data.error);

      toast.success("Team member updated successfully");
      setIsEditOpen(false);
      setEditingMember(null);
      onRefresh();
    } catch (error: any) {
      console.error("Error updating user:", error);
      toast.error(error.message || "Failed to update user");
    } finally {
      setIsUpdating(false);
    }
  };

  const openResetPasswordDialog = (member: TeamMember) => {
    setResetPasswordMember(member);
    setNewPassword("");
    setConfirmPassword("");
    setIsResetPasswordOpen(true);
  };

  const handleResetPassword = async () => {
    if (!resetPasswordMember) return;

    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    if (newPassword.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }

    setIsResetting(true);

    try {
      const response = await supabase.functions.invoke("update-team-member", {
        body: {
          userId: resetPasswordMember.id,
          action: "reset_password",
          newPassword,
        },
      });

      if (response.error) throw new Error(response.error.message);
      if (response.data?.error) throw new Error(response.data.error);

      toast.success("Password reset successfully");
      setIsResetPasswordOpen(false);
      setResetPasswordMember(null);
      setNewPassword("");
      setConfirmPassword("");
    } catch (error: any) {
      console.error("Error resetting password:", error);
      toast.error(error.message || "Failed to reset password");
    } finally {
      setIsResetting(false);
    }
  };

  if (isLoading) {
    return (
      <Card className="p-12 text-center">
        <Loader2 className="w-8 h-8 animate-spin text-[hsl(var(--gold))] mx-auto" />
      </Card>
    );
  }

  return (
    <>
      <Card className="overflow-hidden border-border/50">
        <div className="p-5 md:p-6 border-b border-border/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-card to-card/80">
          <div>
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Users className="w-5 h-5 text-[hsl(var(--gold))]" />
              Team Members
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              Manage access and roles for your team
            </p>
          </div>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button className="bg-[hsl(var(--gold))] text-[hsl(var(--charcoal))] hover:bg-[hsl(var(--gold))]/90 shadow-lg shadow-[hsl(var(--gold))]/20">
                <UserPlus className="w-4 h-4 mr-2" />
                Add Member
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Add Team Member</DialogTitle>
                <DialogDescription>
                  Create a new account for your team member
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="fullName">Full Name</Label>
                  <Input
                    id="fullName"
                    placeholder="John Doe"
                    value={form.fullName}
                    onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="john@bullstarrealty.ae"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password *</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Min 8 characters"
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Role</Label>
                    <Select
                      value={form.role}
                      onValueChange={(value: typeof form.role) => setForm({ ...form, role: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="user">Salesperson</SelectItem>
                        <SelectItem value="telesales">Telesales</SelectItem>
                        <SelectItem value="manager">Manager</SelectItem>
                        <SelectItem value="mis">MIS Person</SelectItem>
                        <SelectItem value="blog_writer">Blog Writer</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="super_admin">Super Admin</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Country</Label>
                    <Select
                      value={form.country}
                      onValueChange={(value: CountryCode) => setForm({ ...form, country: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="dubai">🇦🇪 Dubai</SelectItem>
                        <SelectItem value="india">🇮🇳 India</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <Button
                  className="w-full bg-[hsl(var(--gold))] text-[hsl(var(--charcoal))] hover:bg-[hsl(var(--gold))]/90"
                  onClick={handleCreate}
                  disabled={isCreating}
                >
                  {isCreating ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    "Create Member"
                  )}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {teamMembers.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-4">
              <Users className="w-8 h-8 text-muted-foreground/50" />
            </div>
            <h3 className="text-lg font-semibold mb-2">No team members</h3>
            <p className="text-muted-foreground text-sm">
              Add team members to give them access to the dashboard
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30 hover:bg-muted/30">
                  <TableHead className="font-semibold">Member</TableHead>
                  <TableHead className="font-semibold">Country</TableHead>
                  <TableHead className="font-semibold">Role</TableHead>
                  <TableHead className="font-semibold">Created</TableHead>
                  <TableHead className="font-semibold">Last Login</TableHead>
                  <TableHead className="w-[80px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {teamMembers.map((member) => (
                  <TableRow key={member.id} className="hover:bg-muted/50">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[hsl(var(--gold))]/20 to-[hsl(var(--gold))]/5 flex items-center justify-center">
                          <span className="text-sm font-semibold text-[hsl(var(--gold))]">
                            {(member.fullName || member.email)[0].toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <div className="font-medium">{member.fullName || "—"}</div>
                          <div className="text-xs text-muted-foreground">{member.email}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {member.country === 'dubai' && <span>🇦🇪 Dubai</span>}
                      {member.country === 'india' && <span>🇮🇳 India</span>}
                      {!member.country && <span className="text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {member.roles.length > 0 ? (
                          member.roles.map((role) => {
                            const config = roleConfig[role] || roleConfig.user;
                            return (
                              <Badge
                                key={role}
                                variant="outline"
                                className={config.color}
                              >
                                {config.label}
                              </Badge>
                            );
                          })
                        ) : (
                          <span className="text-muted-foreground text-sm">No role</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {format(new Date(member.createdAt), "MMM d, yyyy")}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {member.lastSignIn
                        ? format(new Date(member.lastSignIn), "MMM d, yyyy")
                        : "Never"}
                    </TableCell>
                    <TableCell>
                      {member.id !== currentUserId && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openEditDialog(member)}>
                              <Pencil className="w-4 h-4 mr-2" />
                              Edit Details
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openResetPasswordDialog(member)}>
                              <KeyRound className="w-4 h-4 mr-2" />
                              Reset Password
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onClick={() => setDeleteUserId(member.id)}
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>

      <AlertDialog open={!!deleteUserId} onOpenChange={() => setDeleteUserId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Team Member</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this team member? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Team Member</DialogTitle>
            <DialogDescription>
              Update details for {editingMember?.email}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="editFullName">Full Name</Label>
              <Input
                id="editFullName"
                placeholder="John Doe"
                value={editForm.fullName}
                onChange={(e) => setEditForm({ ...editForm, fullName: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Role</Label>
                <Select
                  value={editForm.role}
                  onValueChange={(value: RoleType) => setEditForm({ ...editForm, role: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">Salesperson</SelectItem>
                    <SelectItem value="telesales">Telesales</SelectItem>
                    <SelectItem value="manager">Manager</SelectItem>
                    <SelectItem value="mis">MIS Person</SelectItem>
                    <SelectItem value="hr">HR</SelectItem>
                    <SelectItem value="blog_writer">Blog Writer</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="super_admin">Super Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Country</Label>
                <Select
                  value={editForm.country}
                  onValueChange={(value: CountryCode) => setEditForm({ ...editForm, country: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="dubai">🇦🇪 Dubai</SelectItem>
                    <SelectItem value="india">🇮🇳 India</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button
              className="w-full bg-[hsl(var(--gold))] text-[hsl(var(--charcoal))] hover:bg-[hsl(var(--gold))]/90"
              onClick={handleUpdate}
              disabled={isUpdating}
            >
              {isUpdating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Updating...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Reset Password Dialog */}
      <Dialog open={isResetPasswordOpen} onOpenChange={setIsResetPasswordOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Reset Password</DialogTitle>
            <DialogDescription>
              Set a new password for {resetPasswordMember?.email}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="newPassword">New Password</Label>
              <Input
                id="newPassword"
                type="password"
                placeholder="Min 8 characters"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="Confirm password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>
            <Button
              className="w-full bg-[hsl(var(--gold))] text-[hsl(var(--charcoal))] hover:bg-[hsl(var(--gold))]/90"
              onClick={handleResetPassword}
              disabled={isResetting}
            >
              {isResetting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Resetting...
                </>
              ) : (
                "Reset Password"
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
