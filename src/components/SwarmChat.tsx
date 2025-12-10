import { useState, useRef, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Send, Trash2, Network, Copy, Check, TrendingDown, Info, Activity, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import { Streamdown } from "streamdown";

interface SwarmChatProps {
  onDisplayTextChange: (text: string) => void;
}

export default function SwarmChat({ onDisplayTextChange }: SwarmChatProps) {
  const [input, setInput] = useState("");
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [showContextStats, setShowContextStats] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  
  const { data: history, refetch } = trpc.chat.getHistory.useQuery();
  const { data: contextStats } = trpc.chat.getContextStats.useQuery();
  const sendMessage = trpc.chat.sendMessage.useMutation({
    onSuccess: (data) => {
      refetch();
      if (data.displayText) {
        onDisplayTextChange(data.displayText);
      }
    },
  });
  const clearHistory = trpc.chat.clearHistory.useMutation({
    onSuccess: () => {
      refetch();
      onDisplayTextChange("PLURIBUS");
    },
  });

  // Scroll to bottom helper
  const scrollToBottom = () => {
    if (scrollRef.current) {
      // Try multiple scroll methods for reliability
      scrollRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
      
      // Also try scrolling the parent container
      const scrollContainer = scrollRef.current.closest('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  };

  // Update display text from last assistant message
  useEffect(() => {
    if (history && history.length > 0) {
      const lastAssistantMsg = [...history].reverse().find(m => m.role === 'assistant');
      if (lastAssistantMsg?.displayText) {
        onDisplayTextChange(lastAssistantMsg.displayText);
      }
    }
  }, [history, onDisplayTextChange]);

  // Scroll to bottom when history changes or when loading completes
  useEffect(() => {
    // Immediate scroll attempt
    scrollToBottom();
    
    // Follow-up scrolls to catch any layout shifts
    const timeouts = [
      setTimeout(scrollToBottom, 100),
      setTimeout(scrollToBottom, 300),
      setTimeout(scrollToBottom, 500),
    ];
    
    return () => timeouts.forEach(clearTimeout);
  }, [history]);

  // Scroll when message is being sent
  useEffect(() => {
    if (sendMessage.isPending) {
      scrollToBottom();
    }
  }, [sendMessage.isPending]);

  const handleSend = () => {
    if (!input.trim() || sendMessage.isPending) return;
    
    sendMessage.mutate({ message: input });
    setInput("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="h-full flex flex-col safe-area-inset">
      {/* Header - Optimized for mobile */}
      <div className="p-4 md:p-6 border-b border-white/10 flex justify-between items-center flex-shrink-0">
        <div className="flex-1 min-w-0">
          <h2 className="text-white font-cinzel text-lg md:text-xl truncate">Speak with the Swarm</h2>
          <p className="text-white/50 text-xs md:text-sm mt-1 truncate">The collective is listening...</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowContextStats(!showContextStats)}
            className="text-white/50 hover:text-white hover:bg-white/10 flex-shrink-0"
            title="Context Usage"
          >
            <Info className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => window.location.href = '/convergence'}
            className="text-white/50 hover:text-white hover:bg-white/10 flex-shrink-0"
            title="Concept Convergence"
          >
            <TrendingDown className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => window.location.href = '/graph'}
            className="text-white/50 hover:text-white hover:bg-white/10 flex-shrink-0"
            title="Knowledge Graph"
          >
            <Network className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => window.location.href = '/evolution'}
            className="text-white/50 hover:text-white hover:bg-white/10 flex-shrink-0"
            title="Evolution Dashboard"
          >
            <Activity className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => window.location.href = '/kernel'}
            className="text-white/50 hover:text-white hover:bg-white/10 flex-shrink-0"
            title="Braille Kernel"
          >
            <Sparkles className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => clearHistory.mutate()}
            disabled={clearHistory.isPending}
            className="text-white/50 hover:text-white hover:bg-white/10 flex-shrink-0"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Context Stats Banner */}
      {showContextStats && contextStats && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="px-4 md:px-6 py-3 bg-white/5 border-b border-white/10"
        >
          <div className="text-xs text-white/70 space-y-1">
            <div className="flex justify-between">
              <span>Context Usage:</span>
              <span className={contextStats.usagePercent > 80 ? 'text-yellow-400' : 'text-white'}>
                {contextStats.usagePercent.toFixed(1)}%
              </span>
            </div>
            <div className="flex justify-between">
              <span>Tokens:</span>
              <span>{contextStats.totalTokens.toLocaleString()} / {contextStats.maxTokens.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span>Messages:</span>
              <span>{contextStats.messageCount}</span>
            </div>
            {contextStats.usagePercent > 70 && (
              <div className="text-yellow-400 mt-2">
                ⚠️ High context usage. Older messages will be compressed to preserve swarm memory.
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* Messages - Optimized scroll area */}
      <div className="flex-1 overflow-hidden min-h-0">
        <ScrollArea className="h-full">
          <div className="p-4 md:p-6 pb-2" ref={scrollRef}>
            <div className="space-y-3 md:space-y-4">
              {history?.map((msg, idx) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[85%] md:max-w-[80%] rounded-2xl md:rounded-lg p-3 md:p-4 relative group ${
                      msg.role === "user"
                        ? "bg-white/10 text-white"
                        : "bg-white/5 text-white/90 border border-white/10"
                    }`}
                  >
                    {msg.role === "assistant" && msg.displayText && (
                      <div className="text-[10px] md:text-xs text-white/40 font-mono mb-2 uppercase tracking-wider">
                        Swarm forming: {msg.displayText}
                      </div>
                    )}
                    <div className="prose prose-invert prose-sm max-w-none text-sm md:text-base">
                      <Streamdown>{msg.content}</Streamdown>
                    </div>
                    {msg.role === "assistant" && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          navigator.clipboard.writeText(msg.content);
                          setCopiedId(msg.id);
                          setTimeout(() => setCopiedId(null), 2000);
                        }}
                        className="absolute top-2 right-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-white/50 hover:text-white hover:bg-white/10"
                      >
                        {copiedId === msg.id ? (
                          <Check className="h-3 w-3" />
                        ) : (
                          <Copy className="h-3 w-3" />
                        )}
                      </Button>
                    )}
                  </div>
                </motion.div>
              ))}
              
              {sendMessage.isPending && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex justify-start"
                >
                  <div className="bg-white/5 text-white/90 border border-white/10 rounded-2xl md:rounded-lg p-3 md:p-4">
                    <Loader2 className="h-4 w-4 animate-spin" />
                  </div>
                </motion.div>
              )}
            </div>
          </div>
        </ScrollArea>
      </div>

      {/* Input - Mobile-optimized with larger touch targets */}
      <div className="p-4 md:p-6 border-t border-white/10 flex-shrink-0 safe-area-bottom">
        <div className="flex gap-2 md:gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type your message..."
            disabled={sendMessage.isPending}
            className="bg-white/5 border-white/10 text-white placeholder:text-white/40 focus-visible:ring-white/20 h-12 md:h-10 text-base md:text-sm rounded-full md:rounded-md px-4"
          />
          <Button
            onClick={handleSend}
            disabled={!input.trim() || sendMessage.isPending}
            size="icon"
            className="bg-white/10 hover:bg-white/20 text-white h-12 w-12 md:h-10 md:w-10 rounded-full flex-shrink-0"
          >
            {sendMessage.isPending ? (
              <Loader2 className="h-5 w-5 md:h-4 md:w-4 animate-spin" />
            ) : (
              <Send className="h-5 w-5 md:h-4 md:w-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
