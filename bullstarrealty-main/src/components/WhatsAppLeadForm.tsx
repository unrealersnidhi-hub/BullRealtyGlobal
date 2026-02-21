import { useState } from "react";
import { ArrowLeft, Loader2, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { z } from "zod";
import { sendLeadNotification } from "@/hooks/useLeadNotifications";

const leadSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100, "Name too long"),
  email: z.string().trim().email("Invalid email").max(255, "Email too long"),
  phone: z.string().trim().min(10, "Phone must be at least 10 digits").max(20, "Phone too long"),
  interest: z.string().trim().max(500, "Message too long").optional(),
});

type WhatsAppLeadFormProps = {
  onBack: () => void;
  onClose: () => void;
};

const WhatsAppLeadForm = ({ onBack, onClose }: WhatsAppLeadFormProps) => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    interest: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const phoneNumber = "919118428999";

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    // Clear error on change
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    // Validate form
    const result = leadSchema.safeParse(formData);
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
      // Save lead to database
      const { data, error } = await supabase.from("leads").insert([
        {
          full_name: result.data.name,
          email: result.data.email,
          phone: result.data.phone,
          interest: result.data.interest || null,
          source: "whatsapp",
        },
      ]).select().single();

      if (error) {
        if (error.code === "23505") {
          // Duplicate email - still proceed to WhatsApp
          console.log("Lead already exists, proceeding to WhatsApp");
        } else {
          throw error;
        }
      } else if (data) {
        // Send email notification for new lead
        sendLeadNotification({
          type: "lead_created",
          lead_id: data.id,
          lead_name: result.data.name,
          lead_email: result.data.email,
          lead_phone: result.data.phone,
          lead_source: "whatsapp",
          lead_interest: result.data.interest,
        });
      }

      setIsSuccess(true);

      // Build WhatsApp message with lead info
      const message = `Hello! I'm ${result.data.name}.
📧 Email: ${result.data.email}
📱 Phone: ${result.data.phone}
${result.data.interest ? `\n💬 Interest: ${result.data.interest}` : ""}

I'd like to learn more about your real estate services.`;

      const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;

      // Small delay to show success state, then redirect
      setTimeout(() => {
        window.open(whatsappUrl, "_blank", "noopener,noreferrer");
        onClose();
      }, 1500);
    } catch (error) {
      console.error("Error saving lead:", error);
      toast.error("Something went wrong. Please try again.");
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="p-6 text-center">
        <div className="w-16 h-16 rounded-full bg-[#25D366]/20 mx-auto mb-4 flex items-center justify-center">
          <CheckCircle className="w-8 h-8 text-[#25D366]" />
        </div>
        <h3 className="font-semibold text-foreground text-lg mb-2">Opening WhatsApp...</h3>
        <p className="text-sm text-muted-foreground">
          You'll be redirected to continue the conversation.
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="bg-[#25D366] p-4 flex items-center gap-3">
        <button
          onClick={onBack}
          className="text-white/80 hover:text-white transition-colors"
          aria-label="Back"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
          <svg viewBox="0 0 24 24" fill="white" className="w-5 h-5">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
          </svg>
        </div>
        <div>
          <h3 className="font-semibold text-white text-sm">Chat on WhatsApp</h3>
          <p className="text-xs text-white/80">Share your details to start</p>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="p-4 space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name">Name *</Label>
          <Input
            id="name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            placeholder="Your full name"
            disabled={isSubmitting}
          />
          {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">Email *</Label>
          <Input
            id="email"
            name="email"
            type="email"
            value={formData.email}
            onChange={handleChange}
            placeholder="your@email.com"
            disabled={isSubmitting}
          />
          {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="phone">Phone *</Label>
          <Input
            id="phone"
            name="phone"
            type="tel"
            value={formData.phone}
            onChange={handleChange}
            placeholder="+971 50 123 4567"
            disabled={isSubmitting}
          />
          {errors.phone && <p className="text-xs text-destructive">{errors.phone}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="interest">What are you looking for? (Optional)</Label>
          <Textarea
            id="interest"
            name="interest"
            value={formData.interest}
            onChange={handleChange}
            placeholder="e.g., 2BR apartment in Downtown Dubai"
            rows={2}
            disabled={isSubmitting}
          />
          {errors.interest && <p className="text-xs text-destructive">{errors.interest}</p>}
        </div>

        <Button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-[#25D366] hover:bg-[#20BD5A] text-white"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
              Starting chat...
            </>
          ) : (
            <>
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 mr-2">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
              </svg>
              Continue on WhatsApp
            </>
          )}
        </Button>

        <p className="text-xs text-muted-foreground text-center">
          Your details help us serve you better
        </p>
      </form>
    </div>
  );
};

export default WhatsAppLeadForm;
