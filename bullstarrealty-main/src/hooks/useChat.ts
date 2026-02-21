import { useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { sendLeadNotification } from "@/hooks/useLeadNotifications";

export type Message = {
  role: "user" | "assistant";
  content: string;
};

type LeadData = {
  name: string;
  email: string;
  phone?: string;
  interest?: string;
};

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`;

export function useChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const lastSubmitRef = useRef<number>(0);

  const extractLeadData = (content: string): LeadData | null => {
    const jsonMatch = content.match(/\{"lead_captured":\s*true[^}]+\}/);
    if (jsonMatch) {
      try {
        const data = JSON.parse(jsonMatch[0]);
        if (data.lead_captured && data.name && data.email) {
          return {
            name: data.name,
            email: data.email,
            phone: data.phone || undefined,
            interest: data.interest || undefined,
          };
        }
      } catch {
        // Not valid JSON, ignore
      }
    }
    return null;
  };

  const saveLeadToDatabase = async (lead: LeadData) => {
    try {
      const { data, error } = await supabase.from("leads").insert([{
        full_name: lead.name,
        email: lead.email,
        phone: lead.phone || null,
        interest: lead.interest || null,
        source: "ai-chatbot",
      }]).select().single();
      
      if (error) {
        if (error.code === "23505") {
          // Duplicate email, that's okay
          console.log("Lead already exists");
        } else {
          throw error;
        }
      } else if (data) {
        // Send email notification for new lead
        sendLeadNotification({
          type: "lead_created",
          lead_id: data.id,
          lead_name: lead.name,
          lead_email: lead.email,
          lead_phone: lead.phone,
          lead_source: "ai-chatbot",
          lead_interest: lead.interest,
        });
      }
    } catch (error) {
      console.error("Error saving lead:", error);
    }
  };

  const sendMessage = useCallback(async (input: string) => {
    if (!input.trim() || isLoading) return;

    // Throttle: 1 second minimum between messages
    const now = Date.now();
    if (now - lastSubmitRef.current < 1000) {
      return;
    }
    lastSubmitRef.current = now;

    const userMsg: Message = { role: "user", content: input };
    setMessages(prev => [...prev, userMsg]);
    setIsLoading(true);

    let assistantContent = "";
    
    const updateAssistantMessage = (chunk: string) => {
      assistantContent += chunk;
      setMessages(prev => {
        const last = prev[prev.length - 1];
        if (last?.role === "assistant") {
          return prev.map((m, i) => 
            i === prev.length - 1 ? { ...m, content: assistantContent } : m
          );
        }
        return [...prev, { role: "assistant", content: assistantContent }];
      });
    };

    try {
      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ messages: [...messages, userMsg] }),
      });

      if (!resp.ok) {
        const errorData = await resp.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to get response");
      }

      if (!resp.body) throw new Error("No response body");

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = "";
      let streamDone = false;

      while (!streamDone) {
        const { done, value } = await reader.read();
        if (done) break;
        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);

          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") {
            streamDone = true;
            break;
          }

          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) updateAssistantMessage(content);
          } catch {
            textBuffer = line + "\n" + textBuffer;
            break;
          }
        }
      }

      // Check for lead capture in final content
      const leadData = extractLeadData(assistantContent);
      if (leadData) {
        await saveLeadToDatabase(leadData);
        // Clean the JSON from the displayed message
        setMessages(prev => 
          prev.map((m, i) => 
            i === prev.length - 1 && m.role === "assistant"
              ? { ...m, content: m.content.replace(/\{"lead_captured":[^}]+\}/g, "").trim() }
              : m
          )
        );
      }
    } catch (error) {
      console.error("Chat error:", error);
      toast.error(error instanceof Error ? error.message : "Failed to send message");
      // Remove the failed message attempt
      setMessages(prev => prev.filter((_, i) => i !== prev.length - 1 || prev[prev.length - 1].role !== "assistant"));
    } finally {
      setIsLoading(false);
    }
  }, [messages, isLoading]);

  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  return {
    messages,
    isLoading,
    sendMessage,
    clearMessages,
  };
}
