import { useEffect, useRef } from 'react';
import { Quadtree } from '@/lib/Quadtree';

type ParticleType = 'scout' | 'anchor' | 'drifter';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  targetX: number;
  targetY: number;
  isForming: boolean;
  size: number;
  friction: number;
  ease: number;
  type: ParticleType;
  maxSpeed: number;
  attractionStrength: number;
}

interface SwarmCanvasProps {
  text?: string | string[];  // Can be single text or array of texts
  particleCount?: number | 'auto';
}

/**
 * Calculate optimal particle count based on device capabilities
 */
function calculateOptimalParticleCount(): number {
  // Check device memory (in GB) - available in Chrome/Edge
  const deviceMemory = (navigator as any).deviceMemory || 4; // Default 4GB if not available
  
  // Check hardware concurrency (CPU cores)
  const cpuCores = navigator.hardwareConcurrency || 4;
  
  // Check if mobile device (typically less powerful)
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  
  // Check screen size (larger screens can handle more particles visually)
  const screenArea = window.innerWidth * window.innerHeight;
  const screenFactor = Math.min(screenArea / (1920 * 1080), 2); // Normalize to 1080p, cap at 2x
  
  // Base calculation
  // Memory: ~100 bytes per particle, we want to use max 5% of available memory
  const memoryBasedMax = (deviceMemory * 1024 * 1024 * 1024 * 0.05) / 100;
  
  // CPU: More cores = more particles we can animate smoothly
  const cpuBasedMax = cpuCores * 2000;
  
  // Take the minimum of memory and CPU constraints
  let optimalCount = Math.min(memoryBasedMax, cpuBasedMax);
  
  // Adjust for screen size
  optimalCount *= screenFactor;
  
  // Mobile penalty (GPUs are weaker, screens smaller)
  if (isMobile) {
    optimalCount *= 0.25;
  }
  
  // Clamp to reasonable range
  const minParticles = isMobile ? 3000 : 8000;
  const maxParticles = isMobile ? 8000 : 20000;
  optimalCount = Math.max(minParticles, Math.min(maxParticles, optimalCount));
  
  console.log(`🐝 Particle calculation:
    Device Memory: ${deviceMemory}GB
    CPU Cores: ${cpuCores}
    Screen: ${window.innerWidth}x${window.innerHeight}
    Mobile: ${isMobile}
    Optimal Particles: ${Math.round(optimalCount)}`);
  
  return Math.round(optimalCount);
}

// Debug logging for swarm state
const DEBUG_SWARM = true;
function swarmLog(message: string, data?: any) {
  if (DEBUG_SWARM) {
    console.log(`🐝 [SwarmCanvas] ${message}`, data !== undefined ? data : '');
  }
}

export default function SwarmCanvas({ text = 'PLURIBUS', particleCount = 'auto' }: SwarmCanvasProps) {
  // Calculate particle count inside useEffect to ensure window is ready
  const particleCountRef = useRef<number>(8000);
  
  // Log text prop changes
  useEffect(() => {
    swarmLog('Text prop changed:', { text, length: text?.length, type: typeof text });
  }, [text]);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particles = useRef<Particle[]>([]);
  const animationFrameId = useRef<number>(0);
  const mouse = useRef({ x: 0, y: 0, isActive: false });
  const touches = useRef<Map<number, { x: number; y: number }>>(new Map());
  const lastPinchDistance = useRef<number | null>(null);
  const textCoordinates = useRef<{ x: number; y: number }[]>([]);
  const timeRef = useRef<number>(0);
  const currentTextRef = useRef<string>(Array.isArray(text) ? text.join('|') : (text || 'PLURIBUS'));
  const pendingTextRef = useRef<string | null>(null);  // Store text changes that arrive before particles init
  const quadtree = useRef<Quadtree<Particle> | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Calculate optimal particle count now that window is ready
    if (particleCount === 'auto') {
      particleCountRef.current = calculateOptimalParticleCount();
    } else {
      particleCountRef.current = particleCount;
    }

    // Set canvas size
    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      initParticles();
    };

    // Handle text changes
    const handleTextChange = (newText: string) => {
      if (newText === currentTextRef.current) return;
      currentTextRef.current = newText;
      
      // Regenerate text coordinates
      generateTextCoordinates(ctx, newText);
      
      // Shuffle text coordinates to distribute particles evenly across the text
      const shuffledCoords = [...textCoordinates.current];
      for (let i = shuffledCoords.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffledCoords[i], shuffledCoords[j]] = [shuffledCoords[j], shuffledCoords[i]];
      }
      
      // Reassign targets to existing particles
      particles.current.forEach((p, i) => {
        if (i < shuffledCoords.length) {
          p.targetX = shuffledCoords[i].x;
          p.targetY = shuffledCoords[i].y;
          p.isForming = true;
        } else {
          // Extra particles float around
          p.isForming = false;
        }
      });
    };

    // Initialize particles
    const initParticles = () => {
      particles.current = [];
      
      // Generate text coordinates first to know where targets are
      const initialText = Array.isArray(text) ? text[0] || 'PLURIBUS' : (text || 'PLURIBUS');
      generateTextCoordinates(ctx, initialText);
      
      // Use the larger of: auto-calculated count OR text coordinates needed
      const numberOfParticles = Math.max(particleCountRef.current, textCoordinates.current.length);
      swarmLog('Particle count adjusted:', { 
        requested: particleCountRef.current, 
        textCoords: textCoordinates.current.length,
        using: numberOfParticles 
      });

      // Shuffle text coordinates so particles are distributed evenly across the text
      const shuffledCoords = [...textCoordinates.current];
      for (let i = shuffledCoords.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffledCoords[i], shuffledCoords[j]] = [shuffledCoords[j], shuffledCoords[i]];
      }

      for (let i = 0; i < numberOfParticles; i++) {
        const x = Math.random() * canvas.width;
        const y = Math.random() * canvas.height;
        
        // Assign a target from text coordinates if available, otherwise random
        let targetX = x;
        let targetY = y;
        let isForming = false;

        if (i < shuffledCoords.length) {
          targetX = shuffledCoords[i].x;
          targetY = shuffledCoords[i].y;
          isForming = true;
        } else {
           // Extra particles float around
           targetX = Math.random() * canvas.width;
           targetY = Math.random() * canvas.height;
        }

        // Assign particle type with distribution: 60% scouts, 25% anchors, 15% drifters
        const rand = Math.random();
        let type: ParticleType;
        let maxSpeed: number;
        let attractionStrength: number;
        let size: number;
        let friction: number;
        let ease: number;

        if (rand < 0.6) {
          // Scouts: fast, reactive, small
          type = 'scout';
          maxSpeed = 6;  // Faster
          attractionStrength = 1.5;
          size = Math.random() * 1 + 0.5;
          friction = 0.92 + Math.random() * 0.04;
          ease = 0.12 + Math.random() * 0.06; // Much faster easing
        } else if (rand < 0.85) {
          // Anchors: medium speed, persistent
          type = 'anchor';
          maxSpeed = 4;  // Faster
          attractionStrength = 1.8;
          size = Math.random() * 1.5 + 1;
          friction = 0.94 + Math.random() * 0.03;
          ease = 0.08 + Math.random() * 0.04; // Faster easing
        } else {
          // Drifters: medium speed, low attraction, large
          type = 'drifter';
          maxSpeed = 5;  // Faster
          attractionStrength = 0.8;
          size = Math.random() * 2 + 1.2;
          friction = 0.92 + Math.random() * 0.05;
          ease = 0.10 + Math.random() * 0.05; // Faster easing
        }

        particles.current.push({
          x,
          y,
          vx: (Math.random() - 0.5) * 2,
          vy: (Math.random() - 0.5) * 2,
          targetX,
          targetY,
          isForming,
          size,
          friction,
          ease,
          type,
          maxSpeed,
          attractionStrength,
        });
      }
      
      // Check if there's a pending text update that arrived before particles were ready
      if (pendingTextRef.current && pendingTextRef.current !== currentTextRef.current) {
        swarmLog('Applying pending text after init:', pendingTextRef.current);
        // Trigger the text change handler via a small delay to ensure particles are fully set up
        setTimeout(() => {
          if (pendingTextRef.current) {
            handleTextChange(pendingTextRef.current);
            pendingTextRef.current = null;
          }
        }, 100);
      }
    };

    const generateTextCoordinates = (ctx: CanvasRenderingContext2D, text: string) => {
      // Clear previous coordinates
      textCoordinates.current = [];

      // Draw text off-screen or just use the current canvas temporarily
      ctx.fillStyle = 'white';
      // Responsive font size
      const fontSize = Math.min(canvas.width / 8, 150);
      ctx.font = `700 ${fontSize}px 'Cinzel', serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      
      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      
      ctx.fillText(text, centerX, centerY);

      // Scan the canvas for pixel data
      // Optimization: scan every nth pixel to reduce count
      // Larger gap on mobile for clearer text
      const isMobileView = canvas.width < 768;
      const gap = isMobileView ? 12 : 8; 
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const buffer = new Uint32Array(imageData.data.buffer);

      for (let y = 0; y < canvas.height; y += gap) {
        for (let x = 0; x < canvas.width; x += gap) {
          if (buffer[y * canvas.width + x] & 0xff000000) { // Check alpha channel
             textCoordinates.current.push({ x, y });
          }
        }
      }
      
      // Clear the text we just drew so we can animate particles instead
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    };

    const animate = () => {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.2)'; // Slightly shorter trails for cleaner look
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      timeRef.current += 0.02;

      // Rebuild quadtree each frame for spatial queries
      quadtree.current = new Quadtree<Particle>(
        { x: 0, y: 0, width: canvas.width, height: canvas.height },
        4
      );
      particles.current.forEach(p => quadtree.current!.insert(p));

      // Find particles near mouse using quadtree
      const nearbyParticles = new Set<Particle>();
      if (mouse.current.isActive) {
        const maxDistance = 150;
        const nearby = quadtree.current.queryCircle(
          { x: mouse.current.x, y: mouse.current.y },
          maxDistance
        );
        nearby.forEach(p => nearbyParticles.add(p));
      }

      particles.current.forEach((p) => {
        // Calculate distance to target
        const dx = p.targetX - p.x;
        const dy = p.targetY - p.y;
        
        // Mouse interaction (repulsion) - only for nearby particles
        let forceX = 0;
        let forceY = 0;
        
        if (nearbyParticles.has(p)) {
          const mdx = mouse.current.x - p.x;
          const mdy = mouse.current.y - p.y;
          const distance = Math.sqrt(mdx * mdx + mdy * mdy);
          const maxDistance = 150;
          
          const force = (maxDistance - distance) / maxDistance;
          const angle = Math.atan2(mdy, mdx);
          forceX = -Math.cos(angle) * force * 5; // Repulsion strength
          forceY = -Math.sin(angle) * force * 5;
        }

        // Physics update
        if (p.isForming) {
           // Add breathing effect
           const breathingOffset = Math.sin(timeRef.current + p.y * 0.05) * 2;
           const targetX = p.targetX + breathingOffset;
           const targetY = p.targetY + breathingOffset;
           
           const ddx = targetX - p.x;
           const ddy = targetY - p.y;

           // Move towards text target with ease, scaled by attraction strength
           p.vx += (ddx * p.ease * p.attractionStrength + forceX) * 0.1;
           p.vy += (ddy * p.ease * p.attractionStrength + forceY) * 0.1;
        } else {
           // Float randomly
           p.vx += forceX * 0.5;
           p.vy += forceY * 0.5;
           
           // Boundary check for free particles
           if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
           if (p.y < 0 || p.y > canvas.height) p.vy *= -1;
        }

        p.vx *= p.friction;
        p.vy *= p.friction;
        
        // Clamp velocity to maxSpeed
        const speed = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
        if (speed > p.maxSpeed) {
          p.vx = (p.vx / speed) * p.maxSpeed;
          p.vy = (p.vy / speed) * p.maxSpeed;
        }
        
        p.x += p.vx;
        p.y += p.vy;

        // Draw particle
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        // Forming particles are bright white, floating particles are dim
        if (p.isForming) {
          ctx.fillStyle = 'rgba(255, 255, 255, 1)';
        } else {
          ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        }
        ctx.fill();
      });

      animationFrameId.current = requestAnimationFrame(animate);
    };

    // Event listeners
    const handleMouseMove = (e: MouseEvent) => {
      mouse.current.x = e.clientX;
      mouse.current.y = e.clientY;
      mouse.current.isActive = true;
    };

    const handleMouseLeave = () => {
      mouse.current.isActive = false;
    };

    // Touch event handlers
    const handleTouchStart = (e: TouchEvent) => {
      e.preventDefault();
      Array.from(e.touches).forEach(touch => {
        touches.current.set(touch.identifier, {
          x: touch.clientX,
          y: touch.clientY
        });
      });
      
      // If single touch, treat like mouse
      if (e.touches.length === 1) {
        mouse.current.x = e.touches[0].clientX;
        mouse.current.y = e.touches[0].clientY;
        mouse.current.isActive = true;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      
      if (e.touches.length === 1) {
        // Single touch - act like mouse
        mouse.current.x = e.touches[0].clientX;
        mouse.current.y = e.touches[0].clientY;
        mouse.current.isActive = true;
        touches.current.set(e.touches[0].identifier, {
          x: e.touches[0].clientX,
          y: e.touches[0].clientY
        });
      } else if (e.touches.length === 2) {
        // Two-finger pinch/stretch gesture
        const touch1 = e.touches[0];
        const touch2 = e.touches[1];
        
        const currentDistance = Math.sqrt(
          Math.pow(touch2.clientX - touch1.clientX, 2) +
          Math.pow(touch2.clientY - touch1.clientY, 2)
        );
        
        if (lastPinchDistance.current !== null) {
          const delta = currentDistance - lastPinchDistance.current;
          const centerX = (touch1.clientX + touch2.clientX) / 2;
          const centerY = (touch1.clientY + touch2.clientY) / 2;
          
          // Create ripple effect from center
          particles.current.forEach(p => {
            const dx = p.x - centerX;
            const dy = p.y - centerY;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < 300) {
              const force = delta * 0.05;
              const angle = Math.atan2(dy, dx);
              p.vx += Math.cos(angle) * force;
              p.vy += Math.sin(angle) * force;
            }
          });
        }
        
        lastPinchDistance.current = currentDistance;
        mouse.current.isActive = false;
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      e.preventDefault();
      Array.from(e.changedTouches).forEach(touch => {
        touches.current.delete(touch.identifier);
      });
      
      if (e.touches.length === 0) {
        mouse.current.isActive = false;
        lastPinchDistance.current = null;
      } else if (e.touches.length === 1) {
        // Back to single touch
        mouse.current.x = e.touches[0].clientX;
        mouse.current.y = e.touches[0].clientY;
        mouse.current.isActive = true;
        lastPinchDistance.current = null;
      }
    };

    window.addEventListener('resize', resizeCanvas);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseleave', handleMouseLeave);
    canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
    canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
    canvas.addEventListener('touchend', handleTouchEnd, { passive: false });
    canvas.addEventListener('touchcancel', handleTouchEnd, { passive: false });

    // Wait for font to load before initializing
    document.fonts.ready.then(() => {
      console.log('🐝 Fonts loaded, initializing swarm...');
      resizeCanvas();
      animate();
    });

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseleave', handleMouseLeave);
      canvas.removeEventListener('touchstart', handleTouchStart);
      canvas.removeEventListener('touchmove', handleTouchMove);
      canvas.removeEventListener('touchend', handleTouchEnd);
      canvas.removeEventListener('touchcancel', handleTouchEnd);
      cancelAnimationFrame(animationFrameId.current);
    };
  }, []);

  // Watch for text changes - supports multiple texts displayed vertically
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      swarmLog('ERROR: Canvas ref is null');
      return;
    }
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      swarmLog('ERROR: Could not get 2d context');
      return;
    }
    
    // Normalize text to array
    const textArray = Array.isArray(text) ? text : [text];
    const safeTexts = textArray
      .map(t => (t && t.trim()) || '')
      .filter(t => t.length > 0);
    
    if (safeTexts.length === 0) {
      safeTexts.push('PLURIBUS');
    }
    
    const textKey = safeTexts.join('|');
    swarmLog('Processing text change:', { 
      texts: safeTexts,
      textKey,
      currentRef: currentTextRef.current,
      willUpdate: textKey !== currentTextRef.current 
    });
    
    if (textKey !== currentTextRef.current) {
      currentTextRef.current = textKey;
      
      // Clear and regenerate text coordinates
      textCoordinates.current = [];
      
      // Ensure canvas is properly sized (not default 300x150)
      if (canvas.width <= 300 || canvas.height <= 150) {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        swarmLog('Canvas resized to window:', { width: canvas.width, height: canvas.height });
      }
      
      // If no particles exist yet, store as pending and return
      if (particles.current.length === 0) {
        pendingTextRef.current = textKey;
        swarmLog('Storing pending text update - particles not initialized yet:', textKey);
        return;
      }
      
      const width = canvas.width;
      const height = canvas.height;
      
      swarmLog('Canvas dimensions:', { width, height });
      
      // Calculate layout for multiple texts
      const numTexts = safeTexts.length;
      const verticalSpacing = height / (numTexts + 1);
      
      // Draw each text and collect coordinates
      safeTexts.forEach((displayText, index) => {
        ctx.fillStyle = 'white';
        // Smaller font for multiple texts
        const fontSize = Math.min(width / (8 + numTexts * 2), 150 / Math.sqrt(numTexts));
        ctx.font = `700 ${fontSize}px 'Cinzel', serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        const centerX = width / 2;
        const centerY = verticalSpacing * (index + 1);
        
        ctx.fillText(displayText, centerX, centerY);
        
        swarmLog(`Text ${index + 1}/${numTexts}:`, { displayText, fontSize, centerY });
      });
      
      // Scan for all pixels - larger gap = fewer particles needed
      // Larger gap on mobile for clearer text
      const isMobileView = width < 768;
      const gap = isMobileView ? 12 : 8;
      const imageData = ctx.getImageData(0, 0, width, height);
      const buffer = new Uint32Array(imageData.data.buffer);
      for (let y = 0; y < height; y += gap) {
        for (let x = 0; x < width; x += gap) {
          if (buffer[y * width + x] & 0xff000000) {
            textCoordinates.current.push({ x, y });
          }
        }
      }
      ctx.clearRect(0, 0, width, height);
      
      swarmLog('All texts rendered:', { 
        texts: safeTexts,
        pixelsFound: textCoordinates.current.length
      });
      
      // Match particles to nearest target positions for smooth morphing
      // This creates a fluid transition between text shapes
      const coords = [...textCoordinates.current];
      const numToAssign = Math.min(particles.current.length, coords.length);
      
      // For each particle, find a nearby target (greedy nearest-neighbor)
      // To avoid O(n²), we'll use a grid-based approach
      const gridSize = 50;
      const grid: Map<string, { x: number; y: number; idx: number }[]> = new Map();
      
      coords.forEach((c, idx) => {
        const key = `${Math.floor(c.x / gridSize)},${Math.floor(c.y / gridSize)}`;
        if (!grid.has(key)) grid.set(key, []);
        grid.get(key)!.push({ ...c, idx });
      });
      
      const usedCoords = new Set<number>();
      const assignments: { x: number; y: number }[] = new Array(particles.current.length);
      
      // First pass: assign particles to nearby targets
      particles.current.forEach((p, i) => {
        if (i >= numToAssign) return;
        
        const gx = Math.floor(p.x / gridSize);
        const gy = Math.floor(p.y / gridSize);
        
        let bestDist = Infinity;
        let bestCoord: { x: number; y: number; idx: number } | null = null;
        
        // Search nearby grid cells
        for (let dx = -2; dx <= 2; dx++) {
          for (let dy = -2; dy <= 2; dy++) {
            const cell = grid.get(`${gx + dx},${gy + dy}`);
            if (!cell) continue;
            for (const c of cell) {
              if (usedCoords.has(c.idx)) continue;
              const dist = (p.x - c.x) ** 2 + (p.y - c.y) ** 2;
              if (dist < bestDist) {
                bestDist = dist;
                bestCoord = c;
              }
            }
          }
        }
        
        if (bestCoord) {
          assignments[i] = { x: bestCoord.x, y: bestCoord.y };
          usedCoords.add(bestCoord.idx);
        }
      });
      
      // Second pass: assign remaining particles to any unused coords
      let unusedIdx = 0;
      particles.current.forEach((p, i) => {
        if (assignments[i]) return;
        if (i >= numToAssign) return;
        
        while (unusedIdx < coords.length && usedCoords.has(unusedIdx)) {
          unusedIdx++;
        }
        if (unusedIdx < coords.length) {
          assignments[i] = coords[unusedIdx];
          usedCoords.add(unusedIdx);
          unusedIdx++;
        }
      });
      
      // Reassign targets to existing particles (use what we have, don't add more)
      let formingCount = 0;
      let floatingCount = 0;
      particles.current.forEach((p, i) => {
        if (assignments[i]) {
          p.targetX = assignments[i].x;
          p.targetY = assignments[i].y;
          p.isForming = true;
          formingCount++;
        } else {
          p.isForming = false;
          floatingCount++;
        }
      });
      
      swarmLog('Particle assignment:', { formingCount, floatingCount, total: particles.current.length });
    }
  }, [text]);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 z-0 bg-black cursor-none drop-shadow-[0_0_3px_rgba(255,255,255,0.6)]"
      style={{ touchAction: 'none' }}
    />
  );
}
