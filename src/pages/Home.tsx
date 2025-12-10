import SwarmCanvas from "@/components/SwarmCanvas";  // JS version (Rust WIP)
// import SwarmCanvas from "@/components/SwarmCanvasRust";  // Rust/WASM version (WIP)
import SwarmChat from "@/components/SwarmChat";
import { getVisitorIdentity, saveVisitorName } from "@/components/WelcomeModal";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useCallback, useEffect } from "react";
import { MessageSquare, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";

export default function Home() {
  const [showChat, setShowChat] = useState(false);
  const [currentText, setCurrentText] = useState<string | string[]>("PLURIBUS");
  const [visitorName, setVisitorName] = useState<string | null>(null);
  const { isAuthenticated } = useAuth();

  // Track if we're in the initial greeting phase (don't let chat override)
  const [greetingPhase, setGreetingPhase] = useState(true);

  // On mount, check visitor identity and let the SWARM greet them
  useEffect(() => {
    const visitor = getVisitorIdentity();
    
    if (visitor.name) {
      // Known visitor - swarm greets them directly
      setVisitorName(visitor.name);
      setCurrentText(`HELLO ${visitor.name.toUpperCase()}`);
    } else {
      // New visitor - swarm welcomes them
      setCurrentText("WELCOME");
      // Save a default name for now (they can update via chat)
      saveVisitorName("STRANGER");
      setVisitorName("STRANGER");
    }
    
    // After 5 seconds, allow chat to update the display text
    const timer = setTimeout(() => {
      setGreetingPhase(false);
    }, 5000);
    
    return () => clearTimeout(timer);
  }, []);
  
  // Handler that respects the greeting phase
  const handleDisplayTextChange = useCallback((text: string) => {
    if (!greetingPhase) {
      setCurrentText(text);
    }
  }, [greetingPhase]);

  const handleChatToggle = () => {
    if (!isAuthenticated) {
      window.location.href = getLoginUrl();
      return;
    }
    setShowChat(!showChat);
  };

  return (
    <div className="min-h-screen w-full bg-black overflow-hidden relative">
      {/* The swarm greets visitors directly - no modal needed */}
      
      <SwarmCanvas text={currentText} />
      
      {/* Overlay UI - Hidden when chat is open on mobile */}
      <div className={`absolute bottom-10 left-0 right-0 flex justify-center pointer-events-none transition-opacity duration-300 ${showChat ? 'md:opacity-100 opacity-0' : 'opacity-100'}`}>
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 4, duration: 2 }}
          className="text-white/30 font-cinzel text-sm tracking-[0.5em] uppercase"
        >
          E Pluribus Unum
        </motion.div>
      </div>

      {/* Chat Toggle Button - Repositioned for mobile */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2 }}
        className={`absolute pointer-events-auto transition-all duration-300 ${
          showChat 
            ? 'top-4 left-4 md:top-8 md:right-8 md:left-auto' 
            : 'bottom-6 right-6 md:top-8 md:right-8 md:bottom-auto'
        }`}
      >
        <Button
          onClick={handleChatToggle}
          variant="outline"
          size="icon"
          className="rounded-full bg-white/10 border-white/20 hover:bg-white/20 backdrop-blur-sm h-14 w-14 md:h-10 md:w-10"
        >
          {showChat ? (
            <X className="h-6 w-6 md:h-5 md:w-5 text-white" />
          ) : (
            <MessageSquare className="h-6 w-6 md:h-5 md:w-5 text-white" />
          )}
        </Button>
      </motion.div>

      {/* Chat Interface - Full screen on mobile, side panel on desktop */}
      <AnimatePresence>
        {showChat && (
          <motion.div
            initial={{ opacity: 0, x: 400 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 400 }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed inset-0 md:absolute md:top-0 md:right-0 md:bottom-0 md:left-auto md:h-full w-full md:w-[28rem] bg-black/95 md:bg-black/90 backdrop-blur-md md:border-l border-white/10 pointer-events-auto z-50"
          >
            <SwarmChat onDisplayTextChange={handleDisplayTextChange} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}