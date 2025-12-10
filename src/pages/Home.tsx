import SwarmCanvas from "@/components/SwarmCanvas";
import SwarmChat from "@/components/SwarmChat";
import WelcomeModal from "@/components/WelcomeModal";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useCallback } from "react";
import { MessageSquare, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";

export default function Home() {
  const [showChat, setShowChat] = useState(false);
  const [currentText, setCurrentText] = useState("PLURIBUS");
  const [visitorName, setVisitorName] = useState<string | null>(null);
  const [showWelcome, setShowWelcome] = useState(true);
  const { isAuthenticated } = useAuth();

  const handleWelcomeComplete = useCallback((name: string, isNew: boolean) => {
    setVisitorName(name);
    setShowWelcome(false);
    
    // Set the display text based on whether they're new or returning
    if (isNew) {
      setCurrentText(`WELCOME ${name.toUpperCase()}`);
    } else {
      setCurrentText(`HELLO ${name.toUpperCase()}`);
    }
    
    // After a few seconds, return to PLURIBUS
    setTimeout(() => {
      setCurrentText("PLURIBUS");
    }, 4000);
  }, []);

  const handleChatToggle = () => {
    if (!isAuthenticated) {
      window.location.href = getLoginUrl();
      return;
    }
    setShowChat(!showChat);
  };

  return (
    <div className="min-h-screen w-full bg-black overflow-hidden relative">
      {/* Welcome Modal for new/returning visitors */}
      {showWelcome && <WelcomeModal onComplete={handleWelcomeComplete} />}
      
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
            <SwarmChat onDisplayTextChange={setCurrentText} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}