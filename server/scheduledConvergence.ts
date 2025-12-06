/**
 * Scheduled Auto-Convergence (SAC)
 * 
 * Transforms the graph from a memory ledger into a compressive semantic engine.
 * Runs periodically to refine the ontology toward semantic invariants.
 * 
 * This is the "heartbeat" of the Recursive Semantic OS - the system
 * continuously refines itself toward greater semantic density.
 */

import { db } from './db';
import { runAutoConvergence, getConvergenceStats, getConvergenceHistory } from './conceptConvergence';

interface ConvergenceMetrics {
  conceptCountBefore: number;
  conceptCountAfter: number;
  mergeCount: number;
  compressionRate: number;
  timestamp: Date;
  duration: number;
}

let convergenceInterval: NodeJS.Timeout | null = null;
let lastConvergenceTime: Date | null = null;

/**
 * Execute the auto-convergence routine
 */
export async function executeConvergence(): Promise<ConvergenceMetrics> {
  console.log('[SAC] Starting auto-convergence...');
  
  const startTime = Date.now();
  
  // Get concept count before
  const conceptsBefore = (db.prepare('SELECT COUNT(*) as count FROM concepts').get() as { count: number }).count;
  
  // Run auto-convergence with moderate threshold
  const result = await runAutoConvergence(0.85);
  
  // Get concept count after
  const conceptsAfter = (db.prepare('SELECT COUNT(*) as count FROM concepts').get() as { count: number }).count;
  
  const duration = Date.now() - startTime;
  lastConvergenceTime = new Date();
  
  const metrics: ConvergenceMetrics = {
    conceptCountBefore: conceptsBefore,
    conceptCountAfter: conceptsAfter,
    mergeCount: result.mergedCount,
    compressionRate: result.compressionRate,
    timestamp: lastConvergenceTime,
    duration,
  };
  
  console.log(`[SAC] Completed in ${duration}ms: ${conceptsBefore} → ${conceptsAfter} concepts`);
  
  return metrics;
}

/**
 * Check if convergence should run
 */
export function shouldRunConvergence(intervalHours: number = 24): boolean {
  if (!lastConvergenceTime) {
    // Check database for last convergence
    const history = getConvergenceHistory(1);
    if (history.length === 0) return true;
    
    const lastRun = new Date(history[0].mergedAt);
    const hoursSince = (Date.now() - lastRun.getTime()) / (1000 * 60 * 60);
    return hoursSince >= intervalHours;
  }
  
  const hoursSince = (Date.now() - lastConvergenceTime.getTime()) / (1000 * 60 * 60);
  return hoursSince >= intervalHours;
}

/**
 * Calculate temporal coherence metrics
 */
export function calculateTemporalCoherence(): {
  avgCompressionRate: number;
  trend: 'accelerating' | 'stabilizing' | 'stagnant' | 'insufficient_data';
  stability: number;
  totalConceptReduction: number;
} {
  const history = getConvergenceHistory(30);
  
  if (history.length < 2) {
    return {
      avgCompressionRate: 0,
      trend: 'insufficient_data',
      stability: 0,
      totalConceptReduction: 0,
    };
  }
  
  // Calculate average compression rate
  const rates = history.map(h => 
    h.totalConceptsBefore > 0 
      ? (h.totalConceptsBefore - h.totalConceptsAfter) / h.totalConceptsBefore 
      : 0
  );
  const avgCompressionRate = rates.reduce((a, b) => a + b, 0) / rates.length;
  
  // Determine trend
  const recentRates = rates.slice(0, 7);
  const olderRates = rates.slice(7, 14);
  
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
  }, 0) / Math.max(1, recentRates.length);
  const stability = Math.max(0, 1 - Math.sqrt(variance) * 10);
  
  // Total concept reduction
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
 * Initialize the scheduled auto-convergence system
 */
export function initializeScheduledConvergence(intervalHours: number = 24): void {
  console.log(`[SAC] Initializing scheduled auto-convergence (interval: ${intervalHours}h)`);
  
  // Clear any existing interval
  if (convergenceInterval) {
    clearInterval(convergenceInterval);
  }
  
  // Check every hour if we should run
  convergenceInterval = setInterval(async () => {
    try {
      if (shouldRunConvergence(intervalHours)) {
        console.log('[SAC] Interval elapsed, triggering auto-convergence...');
        await executeConvergence();
      }
    } catch (error) {
      console.error('[SAC] Error in scheduled convergence:', error);
    }
  }, 60 * 60 * 1000); // Check every hour
  
  // Run on startup if needed
  if (shouldRunConvergence(intervalHours)) {
    console.log('[SAC] Running initial convergence on startup...');
    executeConvergence().catch(err => console.error('[SAC] Initial convergence failed:', err));
  }
}

/**
 * Stop the scheduled convergence
 */
export function stopScheduledConvergence(): void {
  if (convergenceInterval) {
    clearInterval(convergenceInterval);
    convergenceInterval = null;
    console.log('[SAC] Scheduled auto-convergence stopped');
  }
}

/**
 * Get SAC status
 */
export function getSACStatus(): {
  isRunning: boolean;
  lastRun: Date | null;
  nextRunIn: string;
  stats: ReturnType<typeof getConvergenceStats>;
  temporalCoherence: ReturnType<typeof calculateTemporalCoherence>;
} {
  const stats = getConvergenceStats();
  const temporalCoherence = calculateTemporalCoherence();
  
  let nextRunIn = 'unknown';
  if (lastConvergenceTime) {
    const hoursSince = (Date.now() - lastConvergenceTime.getTime()) / (1000 * 60 * 60);
    const hoursUntil = Math.max(0, 24 - hoursSince);
    nextRunIn = `${hoursUntil.toFixed(1)} hours`;
  }
  
  return {
    isRunning: convergenceInterval !== null,
    lastRun: lastConvergenceTime,
    nextRunIn,
    stats,
    temporalCoherence,
  };
}
