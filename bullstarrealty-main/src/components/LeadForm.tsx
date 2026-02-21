import { useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, CheckCircle } from "lucide-react";
import { sendLeadNotification } from "@/hooks/useLeadNotifications";

// Phone validation: accepts international formats (+971, +1, etc.) or local UAE formats
const phoneRegex = /^(\+?\d{1,4}[\s.-]?)?(\(?\d{1,4}\)?[\s.-]?)?[\d\s.-]{6,14}$/;

const formSchema = z.object({
  full_name: z.string().min(2, "Name must be at least 2 characters").max(100),
  email: z.string().email("Please enter a valid email").max(255),
  phone: z.string()
    .min(1, "Phone number is required")
    .refine(
      (val) => phoneRegex.test(val),
      { message: "Please enter a valid phone number" }
    ),
  interest: z.string().optional(),
  message: z.string().max(1000).optional(),
});

type FormData = z.infer<typeof formSchema>;

interface LeadFormProps {
  source?: string;
  compact?: boolean;
}

// Throttle interval in milliseconds (5 seconds)
const THROTTLE_INTERVAL = 5000;

const LeadForm = ({ source = "website", compact = false }: LeadFormProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [honeypot, setHoneypot] = useState("");
  const lastSubmitRef = useRef<number>(0);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      full_name: "",
      email: "",
      phone: "",
      interest: "",
      message: "",
    },
  });

  const onSubmit = async (formData: FormData) => {
    // Honeypot check - if filled, silently fail (bots fill hidden fields)
    if (honeypot) {
      setIsSubmitted(true);
      return;
    }

    // Throttle check - prevent rapid submissions
    const now = Date.now();
    if (now - lastSubmitRef.current < THROTTLE_INTERVAL) {
      toast.error("Please wait a moment before submitting again.");
      return;
    }
    lastSubmitRef.current = now;

    setIsSubmitting(true);
    try {
      const { data, error } = await supabase.from("leads").insert([{
        full_name: formData.full_name,
        email: formData.email,
        phone: formData.phone || null,
        interest: formData.interest || null,
        message: formData.message || null,
        source: source,
      }]).select().single();

      if (error) throw error;

      setIsSubmitted(true);
      toast.success("Thank you! We'll be in touch soon.");

      // Auto-assign to one random sales/telesales member (equal distribution)
      if (data) {
        try {
          const { data: roles } = await supabase
            .from("user_roles")
            .select("user_id, role")
            .in("role", ["user", "telesales"]);

          if (roles && roles.length > 0) {
            // Get lead counts per member for equal distribution
            const { data: assignCounts } = await supabase
              .from("lead_assignees")
              .select("user_id");
            
            const countMap: Record<string, number> = {};
            roles.forEach(r => { countMap[r.user_id] = 0; });
            assignCounts?.forEach(a => {
              if (countMap[a.user_id] !== undefined) countMap[a.user_id]++;
            });

            // Pick the member with fewest leads (random tiebreak)
            const sorted = roles
              .map(r => ({ ...r, count: countMap[r.user_id] || 0 }))
              .sort((a, b) => a.count - b.count);
            const minCount = sorted[0].count;
            const candidates = sorted.filter(r => r.count === minCount);
            const chosen = candidates[Math.floor(Math.random() * candidates.length)];

            await supabase.from("lead_assignees").insert({
              lead_id: data.id,
              user_id: chosen.user_id,
              role: chosen.role === "telesales" ? "telesales" : "member",
            });

            // Also set assigned_to on the lead
            await supabase.from("leads").update({ 
              assigned_to: chosen.user_id, 
              assigned_at: new Date().toISOString() 
            }).eq("id", data.id);
          }
        } catch (e) {
          console.warn("Auto-assign failed:", e);
        }

        // Send email notification
        sendLeadNotification({
          type: "lead_created",
          lead_id: data.id,
          lead_name: data.full_name,
          lead_email: data.email,
          lead_phone: data.phone || undefined,
          lead_source: source,
          lead_interest: data.interest || undefined,
        });
      }
    } catch (error) {
      console.error("Error submitting form:", error);
      toast.error("Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSubmitted) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center animate-fade-in">
        <div className="w-16 h-16 rounded-full bg-accent-soft flex items-center justify-center mb-6">
          <CheckCircle className="w-8 h-8 text-gold" />
        </div>
        <h3 className="text-xl font-semibold mb-2">Thank You!</h3>
        <p className="text-muted-foreground">
          We've received your inquiry and will contact you shortly.
        </p>
      </div>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
        {/* Honeypot field - hidden from users, bots will fill it */}
        <input
          type="text"
          name="website"
          tabIndex={-1}
          autoComplete="off"
          value={honeypot}
          onChange={(e) => setHoneypot(e.target.value)}
          style={{ position: 'absolute', left: '-9999px', opacity: 0 }}
          aria-hidden="true"
        />

        <div className={compact ? "space-y-4" : "grid md:grid-cols-2 gap-5"}>
          <FormField
            control={form.control}
            name="full_name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Full Name *</FormLabel>
                <FormControl>
                  <Input placeholder="John Smith" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email *</FormLabel>
                <FormControl>
                  <Input type="email" placeholder="john@example.com" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className={compact ? "space-y-4" : "grid md:grid-cols-2 gap-5"}>
          <FormField
            control={form.control}
            name="phone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Phone *</FormLabel>
                <FormControl>
                  <Input placeholder="+971 50 123 4567" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="interest"
            render={({ field }) => (
              <FormItem>
                <FormLabel>I'm Interested In</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select an option" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="buying">Buying Property</SelectItem>
                    <SelectItem value="selling">Selling Property</SelectItem>
                    <SelectItem value="investment">Investment Advisory</SelectItem>
                    <SelectItem value="marketing">Marketing Services</SelectItem>
                    <SelectItem value="consultation">General Consultation</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {!compact && (
          <FormField
            control={form.control}
            name="message"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Message (Optional)</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Tell us more about your requirements..."
                    rows={4}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        <Button
          type="submit"
          variant="premium"
          size="lg"
          className="w-full"
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Submitting...
            </>
          ) : (
            "Submit Inquiry"
          )}
        </Button>
      </form>
    </Form>
  );
};

export default LeadForm;
