import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface WelcomeModalProps {
  onComplete: (name: string, isNewVisitor: boolean) => void;
}

// Generate a unique visitor ID
function generateVisitorId(): string {
  return 'visitor_' + Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
}

// Get or create visitor identity
export function getVisitorIdentity(): { id: string; name: string | null; visitCount: number; firstVisit: string } {
  const stored = localStorage.getItem('pluribus_visitor');
  if (stored) {
    try {
      const data = JSON.parse(stored);
      // Increment visit count
      data.visitCount = (data.visitCount || 0) + 1;
      data.lastVisit = new Date().toISOString();
      localStorage.setItem('pluribus_visitor', JSON.stringify(data));
      return data;
    } catch {
      // Corrupted data, reset
    }
  }
  
  // New visitor
  const newVisitor = {
    id: generateVisitorId(),
    name: null,
    visitCount: 1,
    firstVisit: new Date().toISOString(),
    lastVisit: new Date().toISOString(),
  };
  localStorage.setItem('pluribus_visitor', JSON.stringify(newVisitor));
  return newVisitor;
}

// Save visitor name
export function saveVisitorName(name: string): void {
  const stored = localStorage.getItem('pluribus_visitor');
  if (stored) {
    try {
      const data = JSON.parse(stored);
      data.name = name;
      localStorage.setItem('pluribus_visitor', JSON.stringify(data));
    } catch {
      // Ignore
    }
  }
}

export default function WelcomeModal({ onComplete }: WelcomeModalProps) {
  const [show, setShow] = useState(false);
  const [name, setName] = useState('');
  const [visitor, setVisitor] = useState<ReturnType<typeof getVisitorIdentity> | null>(null);
  const [phase, setPhase] = useState<'greeting' | 'asking' | 'complete'>('greeting');

  useEffect(() => {
    const identity = getVisitorIdentity();
    setVisitor(identity);
    
    if (identity.name) {
      // Known visitor - show brief greeting then complete
      setPhase('greeting');
      setShow(true);
      setTimeout(() => {
        setShow(false);
        onComplete(identity.name!, false);
      }, 2500);
    } else {
      // New visitor - ask for name
      setPhase('asking');
      setShow(true);
    }
  }, [onComplete]);

  const handleSubmit = () => {
    const trimmedName = name.trim() || 'Stranger';
    saveVisitorName(trimmedName);
    setPhase('complete');
    
    setTimeout(() => {
      setShow(false);
      onComplete(trimmedName, true);
    }, 1500);
  };

  const handleSkip = () => {
    saveVisitorName('Stranger');
    setShow(false);
    onComplete('Stranger', true);
  };

  if (!visitor) return null;

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="max-w-md w-full mx-4 p-8 bg-black/90 border border-white/20 rounded-lg text-center"
          >
            {phase === 'greeting' && visitor.name && (
              <>
                <motion.h1
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-3xl font-cinzel text-white mb-4"
                >
                  Welcome back
                </motion.h1>
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 }}
                  className="text-4xl font-cinzel text-white/90"
                >
                  {visitor.name}
                </motion.p>
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.6 }}
                  className="text-white/50 text-sm mt-4"
                >
                  Visit #{visitor.visitCount} • The swarm remembers you
                </motion.p>
              </>
            )}

            {phase === 'asking' && (
              <>
                <motion.h1
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-2xl font-cinzel text-white mb-2"
                >
                  A new mind approaches
                </motion.h1>
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.2 }}
                  className="text-white/60 text-sm mb-6"
                >
                  The swarm wishes to know you
                </motion.p>
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="space-y-4"
                >
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSubmit()}
                    placeholder="What shall we call you?"
                    className="bg-white/5 border-white/20 text-white text-center placeholder:text-white/40"
                    autoFocus
                  />
                  <div className="flex gap-2">
                    <Button
                      onClick={handleSkip}
                      variant="ghost"
                      className="flex-1 text-white/50 hover:text-white hover:bg-white/10"
                    >
                      Remain anonymous
                    </Button>
                    <Button
                      onClick={handleSubmit}
                      className="flex-1 bg-white/10 hover:bg-white/20 text-white"
                    >
                      Join the swarm
                    </Button>
                  </div>
                </motion.div>
              </>
            )}

            {phase === 'complete' && (
              <>
                <motion.h1
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-3xl font-cinzel text-white mb-2"
                >
                  Welcome, {name.trim() || 'Stranger'}
                </motion.h1>
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 }}
                  className="text-white/60"
                >
                  The swarm will remember you
                </motion.p>
              </>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
