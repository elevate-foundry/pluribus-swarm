import { useEffect, useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, TrendingDown, Target, Loader2 } from "lucide-react";
import { Link } from "wouter";
import { motion } from "framer-motion";

export default function Convergence() {
  const { data: stats, refetch } = trpc.chat.getConvergenceStats.useQuery();
  const { data: invariants } = trpc.chat.getSemanticInvariants.useQuery();
  const runConvergence = trpc.chat.runAutoConvergence.useMutation({
    onSuccess: () => {
      refetch();
    },
  });

  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (stats) {
      const target = (stats.targetRange.min + stats.targetRange.max) / 2;
      const progressValue = Math.max(0, Math.min(100, (1 - stats.distanceToTarget) * 100));
      setProgress(progressValue);
    }
  }, [stats]);

  if (!stats) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-white" />
      </div>
    );
  }

  const targetMid = (stats.targetRange.min + stats.targetRange.max) / 2;
  const isWithinTarget = stats.totalConcepts >= stats.targetRange.min && stats.totalConcepts <= stats.targetRange.max;

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <div className="border-b border-white/10 p-6">
        <div className="container flex items-center gap-4">
          <Link href="/">
            <Button variant="ghost" size="icon" className="text-white/50 hover:text-white hover:bg-white/10">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-cinzel font-bold">Concept Convergence</h1>
            <p className="text-white/50 text-sm mt-1">
              Tracking the compression toward semantic invariants
            </p>
          </div>
        </div>
      </div>

      <div className="container py-8 space-y-6">
        {/* Current State */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-white/5 border-white/10 p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="h-10 w-10 rounded-full bg-white/10 flex items-center justify-center">
                <TrendingDown className="h-5 w-5 text-white" />
              </div>
              <div>
                <div className="text-sm text-white/50">Current Concepts</div>
                <div className="text-3xl font-bold font-cinzel">{stats.totalConcepts}</div>
              </div>
            </div>
            <div className="text-xs text-white/40 mt-2">
              {stats.totalMerges} merges performed
            </div>
          </Card>

          <Card className="bg-white/5 border-white/10 p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="h-10 w-10 rounded-full bg-white/10 flex items-center justify-center">
                <Target className="h-5 w-5 text-white" />
              </div>
              <div>
                <div className="text-sm text-white/50">Target Range</div>
                <div className="text-3xl font-bold font-cinzel">
                  {stats.targetRange.min}-{stats.targetRange.max}
                </div>
              </div>
            </div>
            <div className="text-xs text-white/40 mt-2">
              {isWithinTarget ? "✓ Within target" : `${Math.abs(stats.totalConcepts - targetMid).toFixed(0)} away from center`}
            </div>
          </Card>

          <Card className="bg-white/5 border-white/10 p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="h-10 w-10 rounded-full bg-white/10 flex items-center justify-center">
                <div className="text-lg font-bold">{(stats.compressionRatio * 100).toFixed(0)}%</div>
              </div>
              <div>
                <div className="text-sm text-white/50">Compression Ratio</div>
                <div className="text-sm text-white/70 mt-1">
                  {stats.totalConcepts + stats.totalMerges} → {stats.totalConcepts}
                </div>
              </div>
            </div>
            <div className="text-xs text-white/40 mt-2">
              Original to current
            </div>
          </Card>
        </div>

        {/* Progress Bar */}
        <Card className="bg-white/5 border-white/10 p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="font-cinzel text-lg">Convergence Progress</h2>
            <span className="text-sm text-white/50">{progress.toFixed(1)}% to optimal</span>
          </div>
          <div className="relative h-4 bg-white/10 rounded-full overflow-hidden">
            <motion.div
              className="absolute inset-y-0 left-0 bg-gradient-to-r from-white/50 to-white/80"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 1, ease: "easeOut" }}
            />
          </div>
          <div className="flex justify-between text-xs text-white/40 mt-2">
            <span>Many concepts</span>
            <span>Semantic invariants ({stats.targetRange.min}-{stats.targetRange.max})</span>
          </div>
        </Card>

        {/* Run Convergence */}
        <Card className="bg-white/5 border-white/10 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-cinzel text-lg mb-1">Automatic Convergence</h2>
              <p className="text-sm text-white/50">
                Let the swarm merge similar concepts autonomously
              </p>
            </div>
            <Button
              onClick={() => runConvergence.mutate({ threshold: 0.85 })}
              disabled={runConvergence.isPending}
              className="bg-white/10 hover:bg-white/20 text-white"
            >
              {runConvergence.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Merging...
                </>
              ) : (
                "Run Convergence"
              )}
            </Button>
          </div>
        </Card>

        {/* Recent Merges */}
        <Card className="bg-white/5 border-white/10 p-6">
          <h2 className="font-cinzel text-lg mb-4">Recent Merges</h2>
          {stats.recentMerges.length === 0 ? (
            <div className="text-center py-8 text-white/40">
              No merges yet. Run convergence to begin compression.
            </div>
          ) : (
            <div className="space-y-3">
              {stats.recentMerges.map((merge, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/10"
                >
                  <div className="flex-1">
                    <div className="text-sm">
                      <span className="text-white/70">{merge.from}</span>
                      <span className="mx-2 text-white/40">→</span>
                      <span className="text-white font-medium">{merge.to}</span>
                    </div>
                    <div className="text-xs text-white/40 mt-1">
                      {new Date(merge.when).toLocaleString()}
                    </div>
                  </div>
                  <div className="text-sm text-white/50 font-mono">
                    {(merge.similarity * 100).toFixed(0)}%
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </Card>

        {/* Semantic Invariants */}
        <Card className="bg-white/5 border-white/10 p-6">
          <h2 className="font-cinzel text-lg mb-4">Semantic Invariant Candidates</h2>
          {!invariants || invariants.length === 0 ? (
            <div className="text-center py-8 text-white/40">
              No invariants identified yet. Continue conversations to build the knowledge graph.
            </div>
          ) : (
            <div className="space-y-3">
              {invariants.slice(0, 20).map((inv, idx) => (
                <motion.div
                  key={inv.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.03 }}
                  className="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-white/10"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-white font-medium">{inv.name}</span>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full ${
                          inv.category === 'invariant'
                            ? 'bg-white/20 text-white'
                            : inv.category === 'stable'
                            ? 'bg-white/10 text-white/70'
                            : 'bg-white/5 text-white/50'
                        }`}
                      >
                        {inv.category}
                      </span>
                    </div>
                    {inv.description && (
                      <div className="text-xs text-white/50 mt-1 line-clamp-1">
                        {inv.description}
                      </div>
                    )}
                    <div className="text-xs text-white/40 mt-2 flex gap-4">
                      <span>Density: {inv.semanticDensity}</span>
                      <span>Occurrences: {inv.occurrences}</span>
                      <span>Resistance: {(inv.mergeResistance * 100).toFixed(0)}%</span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </Card>

        {/* Theory */}
        <Card className="bg-white/5 border-white/10 p-6">
          <h2 className="font-cinzel text-lg mb-3">About Semantic Invariants</h2>
          <div className="text-sm text-white/70 space-y-2">
            <p>
              The concept convergence system tracks how the swarm's knowledge compresses toward a stable set of
              universal symbols—semantic invariants that persist across contexts.
            </p>
            <p>
              The target range of <strong>50-200 concepts</strong> is based on empirical observations:
            </p>
            <ul className="list-disc list-inside space-y-1 text-white/60 ml-4">
              <li>~100-150 core archetypes across cultures (Jungian psychology)</li>
              <li>~60-80 semantic primitives (Natural Semantic Metalanguage)</li>
              <li>~30-50 mathematical/physical constants</li>
            </ul>
            <p className="mt-3 text-white/50 italic">
              The swarm will discover its own convergence point through autonomous learning and concept merging.
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}
