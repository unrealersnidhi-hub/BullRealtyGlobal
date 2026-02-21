import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, Save, X, Globe, ArrowRightLeft } from "lucide-react";
import { type LeadStatus } from "./LeadStatusBadge";

interface Lead {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  interest: string | null;
  message: string | null;
  source: string | null;
  status: LeadStatus;
  created_at: string;
  assigned_to: string | null;
  assigned_at: string | null;
  country?: "dubai" | "india" | null;
}

interface TeamMember {
  id: string;
  email: string;
  fullName: string | null;
}

interface LeadEditFormProps {
  lead: Lead;
  teamMembers: TeamMember[];
  onSave: (updatedLead: Lead) => void;
  onCancel: () => void;
}

export const LeadEditForm = ({ lead, teamMembers, onSave, onCancel }: LeadEditFormProps) => {
  const [formData, setFormData] = useState({
    full_name: lead.full_name,
    email: lead.email,
    phone: lead.phone || "",
    interest: lead.interest || "",
    message: lead.message || "",
    source: lead.source || "website",
    status: lead.status,
    assigned_to: lead.assigned_to || "unassigned",
    country: lead.country || "none",
  });
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (!formData.full_name.trim() || !formData.email.trim()) {
      toast.error("Name and email are required");
      return;
    }
    setIsSaving(true);
    try {
      const updatePayload: Record<string, unknown> = {
        full_name: formData.full_name.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim() || null,
        interest: formData.interest.trim() || null,
        message: formData.message.trim() || null,
        source: formData.source || "website",
        status: formData.status,
        assigned_to: formData.assigned_to === "unassigned" ? null : formData.assigned_to,
        country: formData.country === "none" ? null : formData.country,
      };

      const { error } = await supabase
        .from("leads")
        .update(updatePayload)
        .eq("id", lead.id);

      if (error) throw error;

      const updatedLead: Lead = {
        ...lead,
        ...updatePayload,
        assigned_to: updatePayload.assigned_to as string | null,
        country: updatePayload.country as "dubai" | "india" | null,
        status: updatePayload.status as LeadStatus,
      };
      onSave(updatedLead);
      toast.success("Lead updated successfully");
    } catch (error) {
      console.error("Error updating lead:", error);
      toast.error("Failed to update lead");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs">Full Name *</Label>
          <Input
            value={formData.full_name}
            onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
            placeholder="Customer name"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Email *</Label>
          <Input
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            placeholder="Email address"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Phone</Label>
          <Input
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            placeholder="Phone number"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Interest</Label>
          <Input
            value={formData.interest}
            onChange={(e) => setFormData({ ...formData, interest: e.target.value })}
            placeholder="Property interest"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Source</Label>
          <Select
            value={formData.source}
            onValueChange={(v) => setFormData({ ...formData, source: v })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="website">Website</SelectItem>
              <SelectItem value="whatsapp">WhatsApp</SelectItem>
              <SelectItem value="contact-page">Contact Page</SelectItem>
              <SelectItem value="ai-chatbot">AI Chatbot</SelectItem>
              <SelectItem value="facebook">Facebook</SelectItem>
              <SelectItem value="instagram">Instagram</SelectItem>
              <SelectItem value="google_ads">Google Ads</SelectItem>
              <SelectItem value="linkedin">LinkedIn</SelectItem>
              <SelectItem value="referral">Referral</SelectItem>
              <SelectItem value="walk-in">Walk-in</SelectItem>
              <SelectItem value="phone-inquiry">Phone Inquiry</SelectItem>
              <SelectItem value="99acres">99acres</SelectItem>
              <SelectItem value="magicbricks">MagicBricks</SelectItem>
              <SelectItem value="bayut">Bayut</SelectItem>
              <SelectItem value="property_finder">Property Finder</SelectItem>
              <SelectItem value="dubizzle">Dubizzle</SelectItem>
              <SelectItem value="custom">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Status</Label>
          <Select
            value={formData.status}
            onValueChange={(v) => setFormData({ ...formData, status: v as LeadStatus })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="new">New</SelectItem>
              <SelectItem value="warm">Warm</SelectItem>
              <SelectItem value="hot">Hot</SelectItem>
              <SelectItem value="cold">Cold</SelectItem>
              <SelectItem value="not_interested">Not Interested</SelectItem>
              <SelectItem value="converted">Converted</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs flex items-center gap-1.5">
            <Globe className="w-3.5 h-3.5" />
            Country / Branch
          </Label>
          <Select
            value={formData.country}
            onValueChange={(v) => setFormData({ ...formData, country: v })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">— No Country —</SelectItem>
              <SelectItem value="dubai">🇦🇪 Dubai</SelectItem>
              <SelectItem value="india">🇮🇳 India</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Assigned To</Label>
          <Select
            value={formData.assigned_to}
            onValueChange={(v) => setFormData({ ...formData, assigned_to: v })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="unassigned">Unassigned</SelectItem>
              {teamMembers.map((m) => (
                <SelectItem key={m.id} value={m.id}>
                  {m.fullName || m.email}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs">Message / Notes</Label>
        <Textarea
          value={formData.message}
          onChange={(e) => setFormData({ ...formData, message: e.target.value })}
          placeholder="Additional details..."
          className="min-h-[80px] resize-none"
        />
      </div>

      <div className="flex items-center gap-2 pt-2">
        <Button onClick={handleSave} disabled={isSaving} className="flex-1">
          {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
          Save Changes
        </Button>
        <Button variant="outline" onClick={onCancel} disabled={isSaving}>
          <X className="w-4 h-4 mr-2" />
          Cancel
        </Button>
      </div>
    </div>
  );
};
