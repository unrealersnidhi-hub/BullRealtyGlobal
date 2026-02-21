import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import {
  FileText,
  Upload,
  Download,
  Trash2,
  Eye,
  CheckCircle,
  XCircle,
  Clock,
  Loader2,
  UserPlus,
  Filter,
} from "lucide-react";
import { format } from "date-fns";

interface Document {
  id: string;
  title: string;
  description: string | null;
  file_url: string;
  file_name: string;
  file_type: string | null;
  file_size: number | null;
  category: string;
  status: string;
  uploaded_by: string;
  assigned_to: string | null;
  lead_id: string | null;
  approval_requested_from: string | null;
  approval_notes: string | null;
  approved_by: string | null;
  approved_at: string | null;
  created_at: string;
}

interface TeamMember {
  id: string;
  email: string;
  fullName: string | null;
}

export const DocumentCenter = () => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const [uploadForm, setUploadForm] = useState({
    title: "",
    description: "",
    category: "property",
    assignTo: "",
    file: null as File | null,
  });

  useEffect(() => {
    fetchDocuments();
    fetchTeamMembers();
  }, []);

  const fetchDocuments = async () => {
    try {
      const { data, error } = await supabase
        .from("documents")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setDocuments(data || []);
    } catch (error) {
      console.error("Error fetching documents:", error);
      toast.error("Failed to load documents");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchTeamMembers = async () => {
    try {
      const response = await supabase.functions.invoke("list-team-members");
      if (response.data?.users) {
        setTeamMembers(response.data.users);
      }
    } catch (error) {
      console.error("Error fetching team members:", error);
    }
  };

  const handleUpload = async () => {
    if (!uploadForm.file || !uploadForm.title) {
      toast.error("Title and file are required");
      return;
    }

    setIsUploading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Upload file to storage
      const fileExt = uploadForm.file.name.split('.').pop();
      const storagePath = `${user.id}/${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from("documents")
        .upload(storagePath, uploadForm.file);

      if (uploadError) throw uploadError;

      // Store the storage path (not public URL) since this is a private bucket
      // We'll generate signed URLs on demand when viewing/downloading
      const fileUrl = `storage://documents/${storagePath}`;

      // Create document record
      const { error: dbError } = await supabase.from("documents").insert({
        title: uploadForm.title,
        description: uploadForm.description || null,
        file_url: storagePath, // Store the path, not URL
        file_name: uploadForm.file.name,
        file_type: uploadForm.file.type,
        file_size: uploadForm.file.size,
        category: uploadForm.category,
        uploaded_by: user.id,
        assigned_to: uploadForm.assignTo || null,
        status: "approved", // Admin uploads are auto-approved
      });

      if (dbError) throw dbError;

      toast.success("Document uploaded successfully");
      setIsUploadOpen(false);
      setUploadForm({ title: "", description: "", category: "property", assignTo: "", file: null });
      fetchDocuments();
    } catch (error: any) {
      console.error("Error uploading document:", error);
      toast.error(error.message || "Failed to upload document");
    } finally {
      setIsUploading(false);
    }
  };

  // Helper function to get storage path from file_url
  const getStoragePath = (fileUrl: string): string => {
    // Handle both old format (full URL) and new format (just path)
    if (fileUrl.includes('/documents/')) {
      const parts = fileUrl.split('/documents/');
      return parts[parts.length - 1];
    }
    // New format: just the path
    return fileUrl;
  };

  const handleViewDocument = async (doc: Document) => {
    try {
      const storagePath = getStoragePath(doc.file_url);
      
      const { data, error } = await supabase.storage
        .from("documents")
        .createSignedUrl(storagePath, 3600); // 1 hour expiry

      if (error) throw error;
      
      window.open(data.signedUrl, '_blank');
    } catch (error) {
      console.error("Error viewing document:", error);
      toast.error("Failed to open document. Please try again.");
    }
  };

  const handleDownloadDocument = async (doc: Document) => {
    try {
      const storagePath = getStoragePath(doc.file_url);
      
      const { data, error } = await supabase.storage
        .from("documents")
        .createSignedUrl(storagePath, 3600, {
          download: doc.file_name,
        });

      if (error) throw error;
      
      window.open(data.signedUrl, '_blank');
    } catch (error) {
      console.error("Error downloading document:", error);
      toast.error("Failed to download document. Please try again.");
    }
  };

  const handleStatusChange = async (docId: string, newStatus: string, notes?: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const updateData: any = { status: newStatus };
      if (newStatus === "approved") {
        updateData.approved_by = user?.id;
        updateData.approved_at = new Date().toISOString();
      }
      if (notes) {
        updateData.approval_notes = notes;
      }

      const { error } = await supabase
        .from("documents")
        .update(updateData)
        .eq("id", docId);

      if (error) throw error;

      toast.success(`Document ${newStatus}`);
      fetchDocuments();
    } catch (error) {
      console.error("Error updating document:", error);
      toast.error("Failed to update document status");
    }
  };

  const handleAssign = async (docId: string, userId: string) => {
    try {
      const { error } = await supabase
        .from("documents")
        .update({ assigned_to: userId || null })
        .eq("id", docId);

      if (error) throw error;

      toast.success("Document assignment updated");
      fetchDocuments();
    } catch (error) {
      console.error("Error assigning document:", error);
      toast.error("Failed to assign document");
    }
  };

  const handleDelete = async (docId: string) => {
    try {
      const { error } = await supabase.from("documents").delete().eq("id", docId);
      if (error) throw error;
      
      toast.success("Document deleted");
      fetchDocuments();
    } catch (error) {
      console.error("Error deleting document:", error);
      toast.error("Failed to delete document");
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved":
        return <Badge className="bg-green-500/10 text-green-600 border-green-500/20"><CheckCircle className="w-3 h-3 mr-1" />Approved</Badge>;
      case "rejected":
        return <Badge className="bg-red-500/10 text-red-600 border-red-500/20"><XCircle className="w-3 h-3 mr-1" />Rejected</Badge>;
      case "pending":
        return <Badge className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const filteredDocuments = statusFilter === "all"
    ? documents
    : documents.filter(d => d.status === statusFilter);

  const pendingCount = documents.filter(d => d.status === "pending").length;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="w-8 h-8 animate-spin text-gold" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="cursor-pointer hover:border-gold/50 transition-colors" onClick={() => setStatusFilter("all")}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-accent-soft flex items-center justify-center">
                <FileText className="w-5 h-5 text-gold" />
              </div>
              <div>
                <p className="text-2xl font-semibold">{documents.length}</p>
                <p className="text-xs text-muted-foreground">Total Documents</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:border-yellow-500/50 transition-colors" onClick={() => setStatusFilter("pending")}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-yellow-500/10 flex items-center justify-center">
                <Clock className="w-5 h-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-2xl font-semibold">{pendingCount}</p>
                <p className="text-xs text-muted-foreground">Pending Approval</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:border-green-500/50 transition-colors" onClick={() => setStatusFilter("approved")}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-semibold">{documents.filter(d => d.status === "approved").length}</p>
                <p className="text-xs text-muted-foreground">Approved</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:border-red-500/50 transition-colors" onClick={() => setStatusFilter("rejected")}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-red-500/10 flex items-center justify-center">
                <XCircle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-semibold">{documents.filter(d => d.status === "rejected").length}</p>
                <p className="text-xs text-muted-foreground">Rejected</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Documents Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Document Center</CardTitle>
            <CardDescription>Manage property documents, contracts, and files</CardDescription>
          </div>
          <div className="flex items-center gap-3">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px]">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Filter" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
            <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
              <DialogTrigger asChild>
                <Button className="bg-gold hover:bg-gold-light text-charcoal">
                  <Upload className="w-4 h-4 mr-2" />
                  Upload Document
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Upload Document</DialogTitle>
                  <DialogDescription>Add a new document to the system</DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Title *</Label>
                    <Input
                      value={uploadForm.title}
                      onChange={(e) => setUploadForm({ ...uploadForm, title: e.target.value })}
                      placeholder="Document title"
                    />
                  </div>
                  <div>
                    <Label>Description</Label>
                    <Textarea
                      value={uploadForm.description}
                      onChange={(e) => setUploadForm({ ...uploadForm, description: e.target.value })}
                      placeholder="Brief description"
                      rows={2}
                    />
                  </div>
                  <div>
                    <Label>Category</Label>
                    <Select
                      value={uploadForm.category}
                      onValueChange={(value) => setUploadForm({ ...uploadForm, category: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="property">Property Document</SelectItem>
                        <SelectItem value="contract">Contract</SelectItem>
                        <SelectItem value="agreement">Agreement</SelectItem>
                        <SelectItem value="title_deed">Title Deed</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Assign To (Optional)</Label>
                    <Select
                      value={uploadForm.assignTo || "none"}
                      onValueChange={(value) => setUploadForm({ ...uploadForm, assignTo: value === "none" ? "" : value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select user" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No assignment</SelectItem>
                        {teamMembers.map((member) => (
                          <SelectItem key={member.id} value={member.id}>
                            {member.fullName || member.email}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>File *</Label>
                    <Input
                      type="file"
                      onChange={(e) => setUploadForm({ ...uploadForm, file: e.target.files?.[0] || null })}
                      accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                    />
                    <p className="text-xs text-muted-foreground mt-1">Accepts PDF, DOC, DOCX, JPG, PNG</p>
                  </div>
                  <Button
                    onClick={handleUpload}
                    disabled={isUploading || !uploadForm.file || !uploadForm.title}
                    className="w-full bg-gold hover:bg-gold-light text-charcoal"
                  >
                    {isUploading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4 mr-2" />
                        Upload
                      </>
                    )}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {filteredDocuments.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No documents found</h3>
              <p className="text-muted-foreground">Upload your first document to get started.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Document</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Assigned To</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredDocuments.map((doc) => (
                    <TableRow key={doc.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-accent-soft flex items-center justify-center">
                            <FileText className="w-5 h-5 text-gold" />
                          </div>
                          <div>
                            <p className="font-medium">{doc.title}</p>
                            <p className="text-xs text-muted-foreground">{doc.file_name}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">{doc.category.replace("_", " ")}</Badge>
                      </TableCell>
                      <TableCell>{getStatusBadge(doc.status)}</TableCell>
                      <TableCell>
                        <Select
                          value={doc.assigned_to || "no_assignment"}
                          onValueChange={(value) => handleAssign(doc.id, value === "no_assignment" ? "" : value)}
                        >
                          <SelectTrigger className="w-[140px] h-8">
                            <SelectValue placeholder="Assign..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="no_assignment">Unassigned</SelectItem>
                            {teamMembers.map((member) => (
                              <SelectItem key={member.id} value={member.id}>
                                {member.fullName || member.email}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {format(new Date(doc.created_at), "MMM d, yyyy")}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleViewDocument(doc)}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDownloadDocument(doc)}
                          >
                            <Download className="w-4 h-4" />
                          </Button>
                          {doc.status === "pending" && (
                            <>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-green-600 hover:text-green-700"
                                onClick={() => handleStatusChange(doc.id, "approved")}
                              >
                                <CheckCircle className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-red-600 hover:text-red-700"
                                onClick={() => handleStatusChange(doc.id, "rejected")}
                              >
                                <XCircle className="w-4 h-4" />
                              </Button>
                            </>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:text-destructive"
                            onClick={() => handleDelete(doc.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default DocumentCenter;
