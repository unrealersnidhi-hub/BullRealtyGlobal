import { useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";
import { toast } from "sonner";
import { Loader2, Mail, CheckCircle } from "lucide-react";

const subscribeSchema = z.object({
  email: z.string().email("Please enter a valid email address").max(255),
});

type SubscribeFormData = z.infer<typeof subscribeSchema>;

// Throttle interval in milliseconds (5 seconds)
const THROTTLE_INTERVAL = 5000;

const SubscribeSection = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [honeypot, setHoneypot] = useState("");
  const lastSubmitRef = useRef<number>(0);

  const form = useForm<SubscribeFormData>({
    resolver: zodResolver(subscribeSchema),
    defaultValues: {
      email: "",
    },
  });

  const onSubmit = async (data: SubscribeFormData) => {
    // Honeypot check - if filled, silently fail (bots fill hidden fields)
    if (honeypot) {
      setIsSubscribed(true);
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
      const { error } = await supabase.from("subscribers").insert([
        { email: data.email.toLowerCase().trim() },
      ]);

      if (error) {
        if (error.code === "23505") {
          toast.info("You're already subscribed!");
        } else if (error.code === "23514") {
          // Check constraint violation (invalid email format)
          toast.error("Please enter a valid email address.");
        } else {
          throw error;
        }
      } else {
        setIsSubscribed(true);
        toast.success("Successfully subscribed!");
      }
    } catch (error) {
      console.error("Error subscribing:", error);
      toast.error("Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="py-16 px-6 md:px-12 bg-secondary/50">
      <div className="max-w-4xl mx-auto text-center">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-accent-soft mb-6">
          <Mail className="w-7 h-7 text-gold" />
        </div>
        <h2 className="text-2xl md:text-3xl font-semibold mb-4">
          Stay Updated with Market Insights
        </h2>
        <p className="text-muted-foreground mb-8 max-w-2xl mx-auto">
          Subscribe to our newsletter for exclusive property listings, market trends, 
          and investment opportunities in Dubai's luxury real estate market.
        </p>

        {isSubscribed ? (
          <div className="flex flex-col items-center justify-center py-6 animate-fade-in">
            <div className="w-12 h-12 rounded-full bg-accent-soft flex items-center justify-center mb-4">
              <CheckCircle className="w-6 h-6 text-gold" />
            </div>
            <p className="text-lg font-medium">Thank you for subscribing!</p>
            <p className="text-muted-foreground text-sm">
              You'll receive our latest updates soon.
            </p>
          </div>
        ) : (
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto"
            >
              {/* Honeypot field - hidden from users, bots will fill it */}
              <input
                type="text"
                name="company"
                tabIndex={-1}
                autoComplete="off"
                value={honeypot}
                onChange={(e) => setHoneypot(e.target.value)}
                style={{ position: 'absolute', left: '-9999px', opacity: 0 }}
                aria-hidden="true"
              />

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem className="flex-1">
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="Enter your email address"
                        className="h-12"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button
                type="submit"
                variant="premium"
                size="lg"
                className="h-12 px-8"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  "Subscribe"
                )}
              </Button>
            </form>
          </Form>
        )}

        <p className="text-xs text-muted-foreground mt-4">
          We respect your privacy. Unsubscribe at any time.
        </p>
      </div>
    </section>
  );
};

export default SubscribeSection;
