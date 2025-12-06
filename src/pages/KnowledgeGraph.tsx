import { useEffect, useRef, useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Link } from "wouter";

interface Node {
  id: number;
  name: string;
  category: string | null;
  semanticDensity: number | null;
  occurrences: number | null;
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
}

interface Edge {
  from: number;
  to: number;
  type: string | null;
  weight: number | null;
}

export default function KnowledgeGraph() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hoveredNode, setHoveredNode] = useState<Node | null>(null);
  
  const { data: graphData, isLoading } = trpc.chat.getConceptGraph.useQuery();
  const { data: stats } = trpc.chat.getSwarmStats.useQuery();

  useEffect(() => {
    if (!graphData || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Set canvas size
    canvas.width = canvas.offsetWidth * window.devicePixelRatio;
    canvas.height = canvas.offsetHeight * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

    const width = canvas.offsetWidth;
    const height = canvas.offsetHeight;

    // Initialize node positions
    const nodes: Node[] = graphData.nodes.map((n) => ({
      ...n,
      x: Math.random() * width,
      y: Math.random() * height,
      vx: 0,
      vy: 0,
    }));

    const edges: Edge[] = graphData.edges;

    // Force-directed layout simulation
    const simulate = () => {
      // Apply forces
      for (let i = 0; i < nodes.length; i++) {
        const nodeA = nodes[i];
        if (!nodeA.x || !nodeA.y) continue;

        // Repulsion between all nodes
        for (let j = i + 1; j < nodes.length; j++) {
          const nodeB = nodes[j];
          if (!nodeB.x || !nodeB.y) continue;

          const dx = nodeB.x - nodeA.x;
          const dy = nodeB.y - nodeA.y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const force = 500 / (dist * dist);

          nodeA.vx = (nodeA.vx || 0) - (dx / dist) * force;
          nodeA.vy = (nodeA.vy || 0) - (dy / dist) * force;
          nodeB.vx = (nodeB.vx || 0) + (dx / dist) * force;
          nodeB.vy = (nodeB.vy || 0) + (dy / dist) * force;
        }

        // Attraction along edges
        edges.forEach((edge) => {
          const source = nodes.find((n) => n.id === edge.from);
          const target = nodes.find((n) => n.id === edge.to);
          if (!source || !target || !source.x || !source.y || !target.x || !target.y) return;

          const dx = target.x - source.x;
          const dy = target.y - source.y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const force = dist * 0.01 * (edge.weight || 1);

          source.vx = (source.vx || 0) + (dx / dist) * force;
          source.vy = (source.vy || 0) + (dy / dist) * force;
          target.vx = (target.vx || 0) - (dx / dist) * force;
          target.vy = (target.vy || 0) - (dy / dist) * force;
        });

        // Center gravity
        const centerX = width / 2;
        const centerY = height / 2;
        nodeA.vx = (nodeA.vx || 0) + (centerX - nodeA.x) * 0.001;
        nodeA.vy = (nodeA.vy || 0) + (centerY - nodeA.y) * 0.001;
      }

      // Update positions
      nodes.forEach((node) => {
        if (!node.x || !node.y) return;
        node.vx = (node.vx || 0) * 0.9; // Damping
        node.vy = (node.vy || 0) * 0.9;
        node.x += node.vx || 0;
        node.y += node.vy || 0;

        // Boundary constraints
        node.x = Math.max(30, Math.min(width - 30, node.x));
        node.y = Math.max(30, Math.min(height - 30, node.y));
      });
    };

    // Render function
    const render = () => {
      ctx.fillStyle = "#000000";
      ctx.fillRect(0, 0, width, height);

      // Draw edges
      ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
      ctx.lineWidth = 1;
      edges.forEach((edge) => {
        const source = nodes.find((n) => n.id === edge.from);
        const target = nodes.find((n) => n.id === edge.to);
        if (!source || !target || !source.x || !source.y || !target.x || !target.y) return;

        ctx.beginPath();
        ctx.moveTo(source.x, source.y);
        ctx.lineTo(target.x, target.y);
        ctx.stroke();
      });

      // Draw nodes
      nodes.forEach((node) => {
        if (!node.x || !node.y) return;

        const size = 3 + (node.occurrences || 1) * 0.5;
        const density = node.semanticDensity || 50;

        // Color based on semantic density
        const hue = 0; // White
        const saturation = 0;
        const lightness = 30 + density * 0.7; // Brighter = higher density

        ctx.fillStyle = `hsl(${hue}, ${saturation}%, ${lightness}%)`;
        ctx.beginPath();
        ctx.arc(node.x, node.y, size, 0, Math.PI * 2);
        ctx.fill();

        // Glow effect
        ctx.shadowBlur = 10;
        ctx.shadowColor = `hsl(${hue}, ${saturation}%, ${lightness}%)`;
        ctx.fill();
        ctx.shadowBlur = 0;
      });
    };

    // Animation loop
    let animationId: number;
    const animate = () => {
      simulate();
      render();
      animationId = requestAnimationFrame(animate);
    };
    animate();

    // Mouse interaction
    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const hovered = nodes.find((node) => {
        if (!node.x || !node.y) return false;
        const dx = node.x - x;
        const dy = node.y - y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        return dist < 10;
      });

      setHoveredNode(hovered || null);
    };

    canvas.addEventListener("mousemove", handleMouseMove);

    return () => {
      cancelAnimationFrame(animationId);
      canvas.removeEventListener("mousemove", handleMouseMove);
    };
  }, [graphData]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="h-8 w-8 text-white animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white relative">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 p-6 z-10 bg-gradient-to-b from-black to-transparent">
        <Link href="/">
          <Button variant="ghost" size="sm" className="text-white/70 hover:text-white">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Swarm
          </Button>
        </Link>
        <h1 className="text-2xl font-cinzel mt-4">Swarm Knowledge Graph</h1>
        <p className="text-white/50 text-sm mt-1">
          Visualizing the collective consciousness
        </p>
      </div>

      {/* Stats */}
      {stats && (
        <div className="absolute top-6 right-6 z-10 bg-black/50 backdrop-blur-sm border border-white/10 rounded-lg p-4 text-sm">
          <div className="space-y-1">
            <div>
              <span className="text-white/50">Total Minds:</span>{" "}
              <span className="text-white">{stats.totalUsers}</span>
            </div>
            <div>
              <span className="text-white/50">Concepts:</span>{" "}
              <span className="text-white">{stats.totalConcepts}</span>
            </div>
            <div>
              <span className="text-white/50">Knowledge Depth:</span>{" "}
              <span className="text-white">{stats.knowledgeDepth}/100</span>
            </div>
            <div>
              <span className="text-white/50">Curiosity:</span>{" "}
              <span className="text-white">{stats.curiosityLevel}/100</span>
            </div>
          </div>
        </div>
      )}

      {/* Canvas */}
      <canvas
        ref={canvasRef}
        className="w-full h-screen"
        style={{ display: "block" }}
      />

      {/* Hovered node info */}
      {hoveredNode && (
        <div className="absolute bottom-6 left-6 bg-black/80 backdrop-blur-sm border border-white/20 rounded-lg p-4 max-w-sm">
          <h3 className="text-lg font-cinzel">{hoveredNode.name}</h3>
          <div className="text-sm text-white/70 mt-2 space-y-1">
            <div>Category: {hoveredNode.category || "unknown"}</div>
            <div>Semantic Density: {hoveredNode.semanticDensity || 0}/100</div>
            <div>Occurrences: {hoveredNode.occurrences || 0}</div>
          </div>
        </div>
      )}
    </div>
  );
}
