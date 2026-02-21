import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { toast } from "sonner";
import { UserPlus, Loader2 } from "lucide-react";
import { z } from "zod";

const leadSchema = z.object({
  fullName: z.string().min(2, "Name must be at least 2 characters").max(100),
  email: z.string().email("Invalid email address").max(255),
  phone: z.string().min(10, "Phone must be at least 10 digits").max(20),
  interest: z.string().optional(),
  message: z.string().max(1000).optional(),
  source: z.string().default("manual"),
  status: z.enum(["new", "warm", "cold", "hot", "not_interested", "converted"]).default("new"),
});

interface ManualLeadFormProps {
  onLeadCreated: () => void;
  teamMembers: { id: string; email: string; fullName: string | null }[];
}

export const ManualLeadForm = ({ onLeadCreated, teamMembers }: ManualLeadFormProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    phone: "",
    interest: "",
    message: "",
    source: "manual",
    status: "new" as const,
    assignTo: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = async () => {
    setErrors({});

    // Validate
    const result = leadSchema.safeParse(form);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.errors.forEach((err) => {
        if (err.path[0]) {
          fieldErrors[err.path[0] as string] = err.message;
        }
      });
      setErrors(fieldErrors);
      return;
    }

    setIsSubmitting(true);

    try {
      const { error } = await supabase.from("leads").insert({
        full_name: form.fullName,
        email: form.email,
        phone: form.phone || null,
        interest: form.interest || null,
        message: form.message || null,
        source: form.source,
        status: form.status,
        assigned_to: form.assignTo || null,
      });

      if (error) throw error;

      toast.success("Lead created successfully");
      setIsOpen(false);
      setForm({
        fullName: "",
        email: "",
        phone: "",
        interest: "",
        message: "",
        source: "manual",
        status: "new",
        assignTo: "",
      });
      onLeadCreated();
    } catch (error: any) {
      console.error("Error creating lead:", error);
      toast.error(error.message || "Failed to create lead");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button className="bg-gold hover:bg-gold-light text-charcoal">
          <UserPlus className="w-4 h-4 mr-2" />
          Add Lead
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add New Lead</DialogTitle>
          <DialogDescription>Manually add a lead to the CRM</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Full Name *</Label>
            <Input
              value={form.fullName}
              onChange={(e) => setForm({ ...form, fullName: e.target.value })}
              placeholder="John Doe"
              className={errors.fullName ? "border-destructive" : ""}
            />
            {errors.fullName && (
              <p className="text-xs text-destructive mt-1">{errors.fullName}</p>
            )}
          </div>

          <div>
            <Label>Email *</Label>
            <Input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="john@example.com"
              className={errors.email ? "border-destructive" : ""}
            />
            {errors.email && (
              <p className="text-xs text-destructive mt-1">{errors.email}</p>
            )}
          </div>

          <div>
            <Label>Phone *</Label>
            <Input
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              placeholder="+971 50 123 4567"
              className={errors.phone ? "border-destructive" : ""}
            />
            {errors.phone && (
              <p className="text-xs text-destructive mt-1">{errors.phone}</p>
            )}
          </div>

          <div>
            <Label>Interest</Label>
            <Select
              value={form.interest || "not_specified"}
              onValueChange={(v) => setForm({ ...form, interest: v === "not_specified" ? "" : v })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select interest" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="not_specified">Not Specified</SelectItem>
                <SelectItem value="buying">Buying Property</SelectItem>
                <SelectItem value="selling">Selling Property</SelectItem>
                <SelectItem value="renting">Renting</SelectItem>
                <SelectItem value="investing">Investment</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Initial Status</Label>
            <Select
              value={form.status}
              onValueChange={(v: any) => setForm({ ...form, status: v })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="new">New</SelectItem>
                <SelectItem value="hot">Hot</SelectItem>
                <SelectItem value="warm">Warm</SelectItem>
                <SelectItem value="cold">Cold</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Source</Label>
            <Select
              value={form.source}
              onValueChange={(v) => setForm({ ...form, source: v })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="manual">Manual Entry</SelectItem>
                <SelectItem value="referral">Referral</SelectItem>
                <SelectItem value="phone-call">Phone Call</SelectItem>
                <SelectItem value="walk-in">Walk-in</SelectItem>
                <SelectItem value="exhibition">Exhibition</SelectItem>
                <SelectItem value="social-media">Social Media</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Assign To (Optional)</Label>
            <Select
              value={form.assignTo || "unassigned"}
              onValueChange={(v) => setForm({ ...form, assignTo: v === "unassigned" ? "" : v })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select team member" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="unassigned">Unassigned</SelectItem>
                {teamMembers.map((member) => (
                  <SelectItem key={member.id} value={member.id}>
                    {member.fullName || member.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Notes</Label>
            <Textarea
              value={form.message}
              onChange={(e) => setForm({ ...form, message: e.target.value })}
              placeholder="Additional notes about the lead..."
              rows={3}
            />
          </div>

          <Button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="w-full bg-gold hover:bg-gold-light text-charcoal"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <UserPlus className="w-4 h-4 mr-2" />
                Create Lead
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ManualLeadForm;
