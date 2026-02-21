import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Upload, GripVertical } from "lucide-react";

interface TeamMember {
  id: string;
  name: string;
  role: string;
  description: string | null;
  phone: string | null;
  email: string | null;
  linkedin: string | null;
  photo_url: string | null;
  display_order: number;
  is_active: boolean;
}

interface TeamMemberFormData {
  name: string;
  role: string;
  description: string;
  phone: string;
  email: string;
  linkedin: string;
}

const TeamManagement = () => {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null);
  const [formData, setFormData] = useState<TeamMemberFormData>({
    name: "",
    role: "",
    description: "",
    phone: "",
    email: "",
    linkedin: "",
  });
  const [uploadingPhoto, setUploadingPhoto] = useState<string | null>(null);

  const { data: teamMembers = [], isLoading } = useQuery({
    queryKey: ["team-members-admin"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("team_members")
        .select("*")
        .order("display_order", { ascending: true });
      if (error) throw error;
      return data as TeamMember[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: TeamMemberFormData) => {
      const maxOrder = Math.max(...teamMembers.map((m) => m.display_order), 0);
      const { error } = await supabase.from("team_members").insert({
        ...data,
        display_order: maxOrder + 1,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team-members-admin"] });
      queryClient.invalidateQueries({ queryKey: ["team-members"] });
      toast.success("Team member added successfully");
      resetForm();
    },
    onError: (error) => {
      toast.error("Failed to add team member: " + error.message);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<TeamMember> }) => {
      const { error } = await supabase.from("team_members").update(data).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team-members-admin"] });
      queryClient.invalidateQueries({ queryKey: ["team-members"] });
      toast.success("Team member updated successfully");
      resetForm();
    },
    onError: (error) => {
      toast.error("Failed to update team member: " + error.message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("team_members").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team-members-admin"] });
      queryClient.invalidateQueries({ queryKey: ["team-members"] });
      toast.success("Team member deleted successfully");
    },
    onError: (error) => {
      toast.error("Failed to delete team member: " + error.message);
    },
  });

  const handlePhotoUpload = async (memberId: string, file: File) => {
    setUploadingPhoto(memberId);
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${memberId}-${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("team-photos")
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("team-photos")
        .getPublicUrl(filePath);

      await updateMutation.mutateAsync({ id: memberId, data: { photo_url: publicUrl } });
      toast.success("Photo uploaded successfully");
    } catch (error: any) {
      toast.error("Failed to upload photo: " + error.message);
    } finally {
      setUploadingPhoto(null);
    }
  };

  const resetForm = () => {
    setFormData({ name: "", role: "", description: "", phone: "", email: "", linkedin: "" });
    setEditingMember(null);
    setIsDialogOpen(false);
  };

  const openEditDialog = (member: TeamMember) => {
    setEditingMember(member);
    setFormData({
      name: member.name,
      role: member.role,
      description: member.description || "",
      phone: member.phone || "",
      email: member.email || "",
      linkedin: member.linkedin || "",
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingMember) {
      updateMutation.mutate({ id: editingMember.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();
  };

  if (isLoading) {
    return <div className="text-center py-8">Loading team members...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Team Management</h2>
          <p className="text-muted-foreground">Manage your team members and their photos</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => resetForm()}>
              <Plus className="w-4 h-4 mr-2" />
              Add Member
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{editingMember ? "Edit Team Member" : "Add Team Member"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="role">Role *</Label>
                <Input
                  id="role"
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="linkedin">LinkedIn URL</Label>
                <Input
                  id="linkedin"
                  value={formData.linkedin}
                  onChange={(e) => setFormData({ ...formData, linkedin: e.target.value })}
                  placeholder="https://linkedin.com/in/username"
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                  {editingMember ? "Update" : "Add"} Member
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4">
        {teamMembers.map((member) => (
          <Card key={member.id} className={!member.is_active ? "opacity-60" : ""}>
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <GripVertical className="w-5 h-5 text-muted-foreground cursor-grab" />
                </div>
                
                <div className="relative group">
                  <Avatar className="w-16 h-16">
                    <AvatarImage src={member.photo_url || undefined} alt={member.name} />
                    <AvatarFallback className="text-lg">{getInitials(member.name)}</AvatarFallback>
                  </Avatar>
                  <label className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity">
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handlePhotoUpload(member.id, file);
                      }}
                      disabled={uploadingPhoto === member.id}
                    />
                    {uploadingPhoto === member.id ? (
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Upload className="w-5 h-5 text-white" />
                    )}
                  </label>
                </div>

                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold truncate">{member.name}</h3>
                  <p className="text-sm text-gold">{member.role}</p>
                  {member.email && (
                    <p className="text-sm text-muted-foreground truncate">{member.email}</p>
                  )}
                </div>

                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Label htmlFor={`active-${member.id}`} className="text-sm">Active</Label>
                    <Switch
                      id={`active-${member.id}`}
                      checked={member.is_active}
                      onCheckedChange={(checked) =>
                        updateMutation.mutate({ id: member.id, data: { is_active: checked } })
                      }
                    />
                  </div>
                  
                  <Button variant="ghost" size="icon" onClick={() => openEditDialog(member)}>
                    <Pencil className="w-4 h-4" />
                  </Button>
                  
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive hover:text-destructive"
                    onClick={() => {
                      if (confirm("Are you sure you want to delete this team member?")) {
                        deleteMutation.mutate(member.id);
                      }
                    }}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {teamMembers.length === 0 && (
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground">
              No team members yet. Click "Add Member" to get started.
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default TeamManagement;
