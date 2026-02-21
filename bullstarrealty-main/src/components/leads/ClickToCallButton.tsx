import { useState, type MouseEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Phone, Loader2 } from "lucide-react";

interface ClickToCallButtonProps {
  customerPhone: string;
  leadId?: string;
  variant?: "icon" | "button";
}

export const ClickToCallButton = ({ customerPhone, leadId, variant = "icon" }: ClickToCallButtonProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [agentNumber, setAgentNumber] = useState(() => localStorage.getItem("mcube_agent_number") || "");
  const [isInitiating, setIsInitiating] = useState(false);

  const sanitizeNumber = (value: string) => value.replace(/[^\d]/g, "");
  const isValidNumber = (value: string) => value.length >= 10;

  const initiateCall = async (cleanAgent: string, cleanCustomer: string, quickMode = false) => {
    setIsInitiating(true);
    try {
      localStorage.setItem("mcube_agent_number", cleanAgent);
      const { data, error } = await supabase.functions.invoke("mcube-outbound", {
        body: {
          exenumber: cleanAgent,
          custnumber: cleanCustomer,
          lead_id: leadId,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast.success(quickMode ? "Calling now. Stay available on your phone." : "Call initiated! You'll receive a call shortly.");
      setIsOpen(false);
    } catch (error: any) {
      console.error("Click-to-call error:", error);
      toast.error(error.message || "Failed to initiate call");
    } finally {
      setIsInitiating(false);
    }
  };

  const handleCall = async () => {
    const cleanAgent = sanitizeNumber(agentNumber);
    const cleanCustomer = sanitizeNumber(customerPhone);

    if (!cleanAgent) {
      toast.error("Enter your phone number");
      return;
    }
    if (!isValidNumber(cleanAgent)) {
      toast.error("Agent number should be at least 10 digits");
      return;
    }
    if (!cleanCustomer || !isValidNumber(cleanCustomer)) {
      toast.error("Customer phone is invalid for MCube call");
      return;
    }

    await initiateCall(cleanAgent, cleanCustomer);
  };

  const handleQuickCall = async (e: MouseEvent<HTMLButtonElement>) => {
    if (variant !== "icon" || isInitiating) return;

    const cleanAgent = sanitizeNumber(agentNumber);
    const cleanCustomer = sanitizeNumber(customerPhone);
    if (!isValidNumber(cleanAgent) || !isValidNumber(cleanCustomer)) {
      return;
    }

    e.preventDefault();
    e.stopPropagation();
    await initiateCall(cleanAgent, cleanCustomer, true);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {variant === "icon" ? (
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-emerald-500 hover:text-emerald-600 hover:bg-emerald-500/10"
            title="Click to call"
            onClick={handleQuickCall}
          >
            <Phone className="w-3.5 h-3.5" />
          </Button>
        ) : (
          <Button variant="outline" size="sm" className="text-emerald-600 border-emerald-500/30 hover:bg-emerald-500/10">
            <Phone className="w-3.5 h-3.5 mr-1.5" /> Call via MCube
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Phone className="w-5 h-5 text-emerald-500" />
            Call {customerPhone}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label>Your Phone Number</Label>
            <Input
              value={agentNumber}
              onChange={(e) => setAgentNumber(e.target.value)}
              placeholder="e.g., 9876543210"
              type="tel"
            />
            <p className="text-xs text-muted-foreground">
              MCube will call your number first, then connect to the customer.
            </p>
            {isValidNumber(sanitizeNumber(agentNumber)) && (
              <p className="text-xs text-emerald-600">
                Saved for one-click calling from lead list.
              </p>
            )}
          </div>
          <Button onClick={handleCall} disabled={isInitiating} className="w-full bg-emerald-600 hover:bg-emerald-700">
            {isInitiating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Phone className="w-4 h-4 mr-2" />}
            {isInitiating ? "Connecting..." : "Connect Call"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
