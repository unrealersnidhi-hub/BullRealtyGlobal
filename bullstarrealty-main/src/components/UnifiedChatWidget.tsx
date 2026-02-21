import { useState, useRef, useEffect } from "react";
import { MessageCircle, X, Send, Loader2, Trash2, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useChat } from "@/hooks/useChat";
import ReactMarkdown from "react-markdown";
import WhatsAppLeadForm from "./WhatsAppLeadForm";

type ChatMode = "selector" | "ai" | "whatsapp";

const UnifiedChatWidget = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<ChatMode>("selector");
  const [input, setInput] = useState("");
  const { messages, isLoading, sendMessage, clearMessages } = useChat();
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    if (isOpen && mode === "ai" && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen, mode]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !isLoading) {
      sendMessage(input);
      setInput("");
    }
  };

  const handleClose = () => {
    setIsOpen(false);
    // Reset to selector after closing
    setTimeout(() => setMode("selector"), 300);
  };

  const handleBack = () => {
    setMode("selector");
  };

  return (
    <>
      {/* Chat Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-gold text-primary shadow-lg hover:bg-gold/90 transition-all duration-300 flex items-center justify-center group"
        aria-label={isOpen ? "Close chat" : "Open chat"}
      >
        {isOpen ? (
          <X className="w-6 h-6" />
        ) : (
          <MessageCircle className="w-6 h-6" />
        )}
      </button>

      {/* Chat Window */}
      <div
        className={`fixed bottom-24 right-6 z-50 w-[360px] max-w-[calc(100vw-2rem)] bg-card border border-border rounded-2xl shadow-2xl transition-all duration-300 overflow-hidden ${
          isOpen
            ? "opacity-100 translate-y-0 pointer-events-auto"
            : "opacity-0 translate-y-4 pointer-events-none"
        }`}
      >
        {mode === "selector" && (
          <ChatSelector onSelectAI={() => setMode("ai")} onSelectWhatsApp={() => setMode("whatsapp")} />
        )}

        {mode === "ai" && (
          <AIChat
            messages={messages}
            isLoading={isLoading}
            input={input}
            setInput={setInput}
            handleSubmit={handleSubmit}
            clearMessages={clearMessages}
            scrollRef={scrollRef}
            inputRef={inputRef}
            onBack={handleBack}
          />
        )}

        {mode === "whatsapp" && (
          <WhatsAppLeadForm onBack={handleBack} onClose={handleClose} />
        )}
      </div>
    </>
  );
};

// Chat Selector Component
const ChatSelector = ({
  onSelectAI,
  onSelectWhatsApp,
}: {
  onSelectAI: () => void;
  onSelectWhatsApp: () => void;
}) => {
  return (
    <div className="p-6">
      {/* Header */}
      <div className="text-center mb-6">
        <div className="w-16 h-16 rounded-full bg-accent-soft mx-auto mb-4 flex items-center justify-center">
          <MessageCircle className="w-8 h-8 text-gold" />
        </div>
        <h3 className="font-semibold text-foreground text-lg">How would you like to chat?</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Choose your preferred way to connect with us
        </p>
      </div>

      {/* Options */}
      <div className="space-y-3">
        <button
          onClick={onSelectAI}
          className="w-full flex items-center gap-4 p-4 rounded-xl border border-border bg-secondary/50 hover:bg-secondary transition-colors group"
        >
          <div className="w-12 h-12 rounded-full bg-gold/20 flex items-center justify-center shrink-0">
            <MessageCircle className="w-6 h-6 text-gold" />
          </div>
          <div className="text-left">
            <p className="font-medium text-foreground">AI Assistant</p>
            <p className="text-sm text-muted-foreground">Get instant answers 24/7</p>
          </div>
        </button>

        <button
          onClick={onSelectWhatsApp}
          className="w-full flex items-center gap-4 p-4 rounded-xl border border-border bg-secondary/50 hover:bg-secondary transition-colors group"
        >
          <div className="w-12 h-12 rounded-full bg-[#25D366]/20 flex items-center justify-center shrink-0">
            <svg viewBox="0 0 24 24" fill="#25D366" className="w-6 h-6">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
            </svg>
          </div>
          <div className="text-left">
            <p className="font-medium text-foreground">WhatsApp</p>
            <p className="text-sm text-muted-foreground">Chat with our team directly</p>
          </div>
        </button>
      </div>
    </div>
  );
};

// AI Chat Component
const AIChat = ({
  messages,
  isLoading,
  input,
  setInput,
  handleSubmit,
  clearMessages,
  scrollRef,
  inputRef,
  onBack,
}: {
  messages: { role: "user" | "assistant"; content: string }[];
  isLoading: boolean;
  input: string;
  setInput: (val: string) => void;
  handleSubmit: (e: React.FormEvent) => void;
  clearMessages: () => void;
  scrollRef: React.RefObject<HTMLDivElement>;
  inputRef: React.RefObject<HTMLInputElement>;
  onBack: () => void;
}) => {
  return (
    <>
      {/* Header */}
      <div className="bg-primary p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="text-primary-foreground/70 hover:text-primary-foreground transition-colors"
            aria-label="Back"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="w-10 h-10 rounded-full bg-gold/20 flex items-center justify-center">
            <MessageCircle className="w-5 h-5 text-gold" />
          </div>
          <div>
            <h3 className="font-semibold text-primary-foreground text-sm">
              Bull Star Assistant
            </h3>
            <p className="text-xs text-primary-foreground/70">
              Ask about Dubai real estate
            </p>
          </div>
        </div>
        {messages.length > 0 && (
          <Button
            variant="ghost"
            size="icon"
            onClick={clearMessages}
            className="text-primary-foreground/70 hover:text-primary-foreground hover:bg-white/10 h-8 w-8"
            title="Clear chat"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        )}
      </div>

      {/* Messages */}
      <ScrollArea className="h-[320px] p-4" ref={scrollRef}>
        {messages.length === 0 ? (
          <div className="text-center py-8">
            <div className="w-16 h-16 rounded-full bg-accent-soft mx-auto mb-4 flex items-center justify-center">
              <MessageCircle className="w-8 h-8 text-gold" />
            </div>
            <p className="text-sm text-muted-foreground mb-2">
              Welcome to Bull Star Realty!
            </p>
            <p className="text-xs text-muted-foreground">
              Ask me about properties, neighborhoods, or investment opportunities in Dubai.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${
                    msg.role === "user"
                      ? "bg-gold text-primary rounded-br-md"
                      : "bg-secondary text-foreground rounded-bl-md"
                  }`}
                >
                  {msg.role === "assistant" ? (
                    <div className="prose prose-sm dark:prose-invert max-w-none [&>p]:mb-0 [&>p]:mt-0">
                      <ReactMarkdown>{msg.content}</ReactMarkdown>
                    </div>
                  ) : (
                    msg.content
                  )}
                </div>
              </div>
            ))}
            {isLoading && messages[messages.length - 1]?.role === "user" && (
              <div className="flex justify-start">
                <div className="bg-secondary rounded-2xl rounded-bl-md px-4 py-3">
                  <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                </div>
              </div>
            )}
          </div>
        )}
      </ScrollArea>

      {/* Input */}
      <form onSubmit={handleSubmit} className="p-4 border-t border-border">
        <div className="flex gap-2">
          <Input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your message..."
            disabled={isLoading}
            className="flex-1"
          />
          <Button
            type="submit"
            size="icon"
            disabled={isLoading || !input.trim()}
            className="bg-gold hover:bg-gold/90 text-primary shrink-0"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </div>
      </form>
    </>
  );
};

export default UnifiedChatWidget;
