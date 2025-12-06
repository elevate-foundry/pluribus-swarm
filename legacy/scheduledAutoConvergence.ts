import { runAutoConvergence } from "./conceptConvergence";
import { getDb } from "./db";
import { conceptConvergence } from "../drizzle/schema";
import { desc } from "drizzle-orm";

/**
 * Scheduled Auto-Convergence (SAC)
 * Transforms the graph from a memory ledger into a compressive semantic engine
 * Runs daily to refine the ontology toward semantic invariants
 */

interface ConvergenceMetrics {
  conceptCountBefore: number;
  conceptCountAfter: number;
  mergeCount: number;
  compressionRate: number;
  timestamp: Date;
}

/**
 * Execute the daily auto-convergence routine
 * This is the core of the Recursive Semantic OS's self-refinement
 */
export async function executeDailyConvergence(): Promise<ConvergenceMetrics> {
  console.log("[SAC] Starting scheduled auto-convergence...");
  
  const startTime = Date.now();
  
  // Get concept count before convergence
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }
  
  const { concepts: conceptsTable } = await import("../drizzle/schema");
  const conceptsBefore = await db.select().from(conceptsTable);
  const conceptCountBefore = conceptsBefore.length;
  
  // Run auto-convergence with moderate threshold (0.85)
  // This balances aggressive compression with semantic precision
  const result = await runAutoConvergence(0.85);
  
  // Get concept count after convergence
  const conceptsAfter = await db.select().from(conceptsTable);
  const conceptCountAfter = conceptsAfter.length;
  
  const metrics: ConvergenceMetrics = {
    conceptCountBefore,
    conceptCountAfter,
    mergeCount: result.mergedCount,
    compressionRate: conceptCountBefore > 0
      ? (conceptCountBefore - conceptCountAfter) / conceptCountBefore
      : 0,
    timestamp: new Date(),
  };
  
  const duration = Date.now() - startTime;
  console.log(`[SAC] Completed in ${duration}ms. Compressed ${metrics.conceptCountBefore} → ${metrics.conceptCountAfter} concepts (${(metrics.compressionRate * 100).toFixed(2)}% reduction)`);
  
  return metrics;
}

/**
 * Get convergence history for tracking temporal coherence
 */
export async function getConvergenceHistory(limit: number = 30) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }
  
  const history = await db
    .select()
    .from(conceptConvergence)
    .orderBy(desc(conceptConvergence.mergedAt))
    .limit(limit);
  
  return history;
}

/**
 * Calculate temporal coherence metrics from convergence history
 * These show how the system is evolving over time
 */
export async function calculateTemporalCoherence() {
  const history = await getConvergenceHistory(30);
  
  if (history.length < 2) {
    return {
      avgCompressionRate: 0,
      trend: 'insufficient_data' as const,
      stability: 0,
      totalConceptReduction: 0,
    };
  }
  
  // Calculate average compression rate
  const avgCompressionRate = history.reduce((sum, h) => {
    const rate = h.totalConceptsBefore > 0
      ? (h.totalConceptsBefore - h.totalConceptsAfter) / h.totalConceptsBefore
      : 0;
    return sum + rate;
  }, 0) / history.length;
  
  // Determine trend (is compression accelerating or stabilizing?)
  const recentRates = history.slice(0, 7).map(h => 
    h.totalConceptsBefore > 0 ? (h.totalConceptsBefore - h.totalConceptsAfter) / h.totalConceptsBefore : 0
  );
  const olderRates = history.slice(7, 14).map(h =>
    h.totalConceptsBefore > 0 ? (h.totalConceptsBefore - h.totalConceptsAfter) / h.totalConceptsBefore : 0
  );
  
  const recentAvg = recentRates.length > 0 ? recentRates.reduce((a, b) => a + b, 0) / recentRates.length : 0;
  const olderAvg = olderRates.length > 0 ? olderRates.reduce((a, b) => a + b, 0) / olderRates.length : 0;
  
  let trend: 'accelerating' | 'stabilizing' | 'stagnant' = 'stabilizing';
  if (recentAvg > olderAvg * 1.2) {
    trend = 'accelerating';
  } else if (recentAvg < 0.01) {
    trend = 'stagnant';
  }
  
  // Calculate stability (low variance = high stability)
  const variance = recentRates.reduce((sum, rate) => {
    const diff = rate - recentAvg;
    return sum + diff * diff;
  }, 0) / recentRates.length;
  const stability = Math.max(0, 1 - Math.sqrt(variance) * 10); // Normalize to 0-1
  
  // Total concept reduction over time
  const totalConceptReduction = history.length > 0
    ? history[history.length - 1].totalConceptsBefore - history[0].totalConceptsAfter
    : 0;
  
  return {
    avgCompressionRate,
    trend,
    stability,
    totalConceptReduction,
  };
}

/**
 * Check if convergence should run (once per 24 hours)
 */
export async function shouldRunConvergence(): Promise<boolean> {
  const history = await getConvergenceHistory(1);
  
  if (history.length === 0) {
    return true; // Never run before
  }
  
  const lastRun = new Date(history[0].mergedAt);
  const now = new Date();
  const hoursSinceLastRun = (now.getTime() - lastRun.getTime()) / (1000 * 60 * 60);
  
  return hoursSinceLastRun >= 24;
}

/**
 * Initialize the SAC system
 * This would be called on server startup to set up the schedule
 */
export function initializeScheduledAutoConvergence() {
  console.log("[SAC] Scheduled Auto-Convergence system initialized");
  console.log("[SAC] Will run daily convergence automatically");
  
  // Check and run convergence every hour
  setInterval(async () => {
    try {
      const shouldRun = await shouldRunConvergence();
      if (shouldRun) {
        console.log("[SAC] 24 hours elapsed, triggering auto-convergence...");
        await executeDailyConvergence();
      }
    } catch (error) {
      console.error("[SAC] Error in scheduled convergence:", error);
    }
  }, 60 * 60 * 1000); // Check every hour
  
  // Also run on startup if needed
  shouldRunConvergence().then(async (shouldRun) => {
    if (shouldRun) {
      console.log("[SAC] Running initial convergence on startup...");
      await executeDailyConvergence();
    }
  });
}
