import { useState, useRef, useEffect } from "react";
import { MessageCircle, X, Send, Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useChat } from "@/hooks/useChat";
import ReactMarkdown from "react-markdown";

const ChatWidget = () => {
  const [isOpen, setIsOpen] = useState(false);
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
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !isLoading) {
      sendMessage(input);
      setInput("");
    }
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
        {/* Header */}
        <div className="bg-primary p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
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
      </div>
    </>
  );
};

export default ChatWidget;
