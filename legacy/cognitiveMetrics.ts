import { getDb } from "./db";
import { concepts, conceptRelations, conceptConvergence, swarmState, userConcepts } from "../drizzle/schema";
import { desc, sql, count } from "drizzle-orm";

/**
 * Cognitive Metrics for Evolution Dashboard
 * Instruments the Recursive Semantic OS to make its evolution observable
 * 
 * Metrics:
 * - Cₘ (Compression Rate): Invariant density tracking
 * - ΔG (Graph Entropy Change): Structural evolution measurement
 * - σ (Semantic Drift): How much new concepts reshape existing ones
 * - κ (Curvature): Cluster stability
 * - Ψ (Adaptive Match Score): User style alignment
 * - Λ (Lifeworld Complexity): Total emergent conceptual space
 */

export interface CognitiveMetrics {
  compressionRate: number; // Cₘ: 0-1, higher = more compressed
  graphEntropyChange: number; // ΔG: rate of structural change
  semanticDrift: number; // σ: 0-1, how much concepts are reshaping
  curvature: number; // κ: 0-1, cluster stability
  adaptiveMatchScore: number; // Ψ: 0-1, alignment with users
  lifeworldComplexity: number; // Λ: total conceptual space size
  timestamp: Date;
}

/**
 * Calculate Cₘ (Compression Rate)
 * Measures how effectively the graph is compressing toward invariants
 */
async function calculateCompressionRate(): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  
  // Get recent convergence history
  const recentConvergence = await db
    .select()
    .from(conceptConvergence)
    .orderBy(desc(conceptConvergence.mergedAt))
    .limit(10);
  
  if (recentConvergence.length === 0) return 0;
  
  // Calculate average compression rate over recent merges
  const avgRate = recentConvergence.reduce((sum, c) => {
    const rate = c.totalConceptsBefore > 0
      ? (c.totalConceptsBefore - c.totalConceptsAfter) / c.totalConceptsBefore
      : 0;
    return sum + rate;
  }, 0) / recentConvergence.length;
  
  return Math.min(1, avgRate * 10); // Normalize to 0-1
}

/**
 * Calculate ΔG (Graph Entropy Change)
 * Measures structural evolution - how fast the graph topology is changing
 */
async function calculateGraphEntropyChange(): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  
  // Get concept count change over time
  const recentConvergence = await db
    .select()
    .from(conceptConvergence)
    .orderBy(desc(conceptConvergence.mergedAt))
    .limit(20);
  
  if (recentConvergence.length < 2) return 0;
  
  // Calculate rate of change in concept count
  const oldest = recentConvergence[recentConvergence.length - 1];
  const newest = recentConvergence[0];
  
  const timeSpan = newest.mergedAt.getTime() - oldest.mergedAt.getTime();
  if (timeSpan === 0) return 0;
  
  const conceptChange = Math.abs(newest.totalConceptsAfter - oldest.totalConceptsAfter);
  const changeRate = conceptChange / (timeSpan / (1000 * 60 * 60 * 24)); // Changes per day
  
  return Math.min(1, changeRate / 10); // Normalize to 0-1
}

/**
 * Calculate σ (Semantic Drift)
 * Measures how much new concepts are reshaping existing ones
 */
async function calculateSemanticDrift(): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  
  // Get recent concept additions and their relationship density
  const allConcepts = await db.select().from(concepts);
  const allRelations = await db.select().from(conceptRelations);
  
  if (allConcepts.length === 0) return 0;
  
  // Calculate average relationship density (how interconnected concepts are)
  const avgRelationDensity = allRelations.length / allConcepts.length;
  
  // Higher density = more drift (new concepts are connecting to existing ones)
  return Math.min(1, avgRelationDensity / 5); // Normalize to 0-1
}

/**
 * Calculate κ (Curvature / Cluster Stability)
 * Measures how stable concept clusters are over time
 */
async function calculateCurvature(): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  
  // Get concepts with high semantic density (potential invariants)
  const highDensityConcepts = await db
    .select()
    .from(concepts)
    .where(sql`${concepts.semanticDensity} >= 70`)
    .orderBy(desc(concepts.occurrences));
  
  const totalConcepts = await db.select({ count: count() }).from(concepts);
  const total = totalConcepts[0]?.count ?? 0;
  
  if (total === 0) return 0;
  
  // Stability = ratio of high-density concepts to total
  // Higher ratio = more stable (concepts are converging)
  return Math.min(1, highDensityConcepts.length / Math.max(1, total * 0.2));
}

/**
 * Calculate Ψ (Adaptive Match Score)
 * Measures how well the system aligns with user cognitive styles
 */
async function calculateAdaptiveMatchScore(): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  
  // Get user-concept associations
  const userConceptLinks = await db.select().from(userConcepts);
  
  if (userConceptLinks.length === 0) return 0.5; // Neutral if no data
  
  // Calculate average user engagement with concepts
  // Higher engagement = better adaptation
  const avgEngagement = userConceptLinks.reduce((sum, uc) => sum + (uc.strength ?? 0), 0) / userConceptLinks.length;
  
  return Math.min(1, avgEngagement / 10); // Normalize to 0-1
}

/**
 * Calculate Λ (Lifeworld Complexity)
 * Measures total emergent conceptual space
 */
async function calculateLifeworldComplexity(): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  
  const totalConcepts = await db.select({ count: count() }).from(concepts);
  const totalRelations = await db.select({ count: count() }).from(conceptRelations);
  
  const conceptCount = totalConcepts[0]?.count ?? 0;
  const relationCount = totalRelations[0]?.count ?? 0;
  
  // Complexity = concepts + relations, normalized
  const rawComplexity = conceptCount + relationCount;
  
  // Normalize to 0-1 scale (assuming max complexity of 1000)
  return Math.min(1, rawComplexity / 1000);
}

/**
 * Calculate all cognitive metrics at once
 */
export async function calculateCognitiveMetrics(): Promise<CognitiveMetrics> {
  const [
    compressionRate,
    graphEntropyChange,
    semanticDrift,
    curvature,
    adaptiveMatchScore,
    lifeworldComplexity,
  ] = await Promise.all([
    calculateCompressionRate(),
    calculateGraphEntropyChange(),
    calculateSemanticDrift(),
    calculateCurvature(),
    calculateAdaptiveMatchScore(),
    calculateLifeworldComplexity(),
  ]);
  
  return {
    compressionRate,
    graphEntropyChange,
    semanticDrift,
    curvature,
    adaptiveMatchScore,
    lifeworldComplexity,
    timestamp: new Date(),
  };
}

/**
 * Detect anomalies in cognitive metrics
 * Returns warnings for: runaway drift, stagnation, mode collapse, overfitting
 */
export async function detectAnomalies(metrics: CognitiveMetrics): Promise<string[]> {
  const warnings: string[] = [];
  
  // Runaway drift: high semantic drift + high entropy change
  if (metrics.semanticDrift > 0.8 && metrics.graphEntropyChange > 0.7) {
    warnings.push("Runaway drift detected: Concepts are changing too rapidly without stabilization");
  }
  
  // Stagnation: low entropy change + low compression rate
  if (metrics.graphEntropyChange < 0.1 && metrics.compressionRate < 0.1) {
    warnings.push("Stagnation detected: Graph is not evolving or compressing");
  }
  
  // Mode collapse: very high curvature + low complexity
  if (metrics.curvature > 0.9 && metrics.lifeworldComplexity < 0.3) {
    warnings.push("Mode collapse risk: System may be over-compressing and losing diversity");
  }
  
  // Overfitting: very high adaptive match + low drift
  if (metrics.adaptiveMatchScore > 0.9 && metrics.semanticDrift < 0.2) {
    warnings.push("Overfitting risk: System may be too aligned with specific users, losing generalization");
  }
  
  return warnings;
}
