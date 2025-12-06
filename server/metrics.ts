/**
 * Cognitive Metrics for the Recursive Semantic OS
 * 
 * This is cognitive system instrumentation—not AGI measurement.
 * These metrics make the swarm observable, diagnosable, and tunable.
 * 
 * Metrics:
 * - Cₘ (Compression Rate): Semantic information preserved during convergence
 * - ΔG (Graph Entropy Change): Structural unpredictability evolution
 * - σ (Semantic Drift): Change in meaning between cycles
 * - κ (Curvature): Cluster stability under compression
 * - Ψ (Adaptive Match Score): User cognitive alignment
 * - Λ (Lifeworld Complexity): Total conceptual richness
 */

import { db, DbConcept } from './db';

export interface CognitiveMetrics {
  // Cₘ: Compression Rate (0-1, higher = more compressed)
  compressionRate: number;
  
  // ΔG: Graph Entropy Change (negative = more orderly, positive = more complex)
  graphEntropyChange: number;
  
  // σ: Semantic Drift (0-1, higher = meanings shifting)
  semanticDrift: number;
  
  // κ: Curvature/Cluster Stability (0-1, higher = clusters dissolving)
  curvature: number;
  
  // Ψ: Adaptive Match Score (0-1, higher = better user alignment)
  adaptiveMatchScore: number;
  
  // Λ: Lifeworld Complexity (unbounded, higher = richer internal world)
  lifeworldComplexity: number;
  
  // Metadata
  timestamp: Date;
  nodeCount: number;
  edgeCount: number;
  invariantCount: number;
  clusterCount: number;
}

export interface MetricsHistory {
  current: CognitiveMetrics;
  previous: CognitiveMetrics | null;
  trend: 'expanding' | 'contracting' | 'stable' | 'fragmenting';
  warnings: string[];
}

/**
 * Get graph statistics
 */
function getGraphStats(): { nodes: number; edges: number; categories: Map<string, number> } {
  const concepts = db.prepare('SELECT * FROM concepts').all() as DbConcept[];
  const relations = db.prepare('SELECT COUNT(*) as count FROM conceptRelations').get() as { count: number };
  
  const categories = new Map<string, number>();
  for (const c of concepts) {
    const cat = c.category || 'general';
    categories.set(cat, (categories.get(cat) || 0) + 1);
  }
  
  return {
    nodes: concepts.length,
    edges: relations?.count || 0,
    categories,
  };
}

/**
 * Calculate Shannon entropy over a distribution
 */
function shannonEntropy(distribution: number[]): number {
  const total = distribution.reduce((a, b) => a + b, 0);
  if (total === 0) return 0;
  
  let entropy = 0;
  for (const count of distribution) {
    if (count > 0) {
      const p = count / total;
      entropy -= p * Math.log2(p);
    }
  }
  return entropy;
}

/**
 * Cₘ — Compression Rate
 * Formula: Cₘ = 1 − (|G′| / |G|)
 * 
 * Measures how much the graph has compressed from its maximum observed size.
 * High Cₘ → graph is collapsing toward dense invariants
 * Low Cₘ → graph isn't compressing; stagnation or noise accumulation
 */
function calculateCompressionRate(): number {
  const state = db.prepare('SELECT * FROM swarmState WHERE id = 1').get() as {
    totalConcepts: number;
    knowledgeDepth: number;
  } | undefined;
  
  if (!state) return 0;
  
  // Track max observed size in knowledgeDepth field (repurposed)
  const currentSize = state.totalConcepts;
  const maxObserved = Math.max(state.knowledgeDepth || currentSize, currentSize);
  
  // Update max if current is larger
  if (currentSize > (state.knowledgeDepth || 0)) {
    db.prepare('UPDATE swarmState SET knowledgeDepth = ? WHERE id = 1').run(currentSize);
  }
  
  if (maxObserved === 0) return 0;
  
  // Cₘ = 1 - (current / max)
  return 1 - (currentSize / maxObserved);
}

/**
 * ΔG — Graph Entropy Change
 * Formula: ΔG = H(G′) − H(G)
 * 
 * Measures structural unpredictability using Shannon entropy over category distribution.
 * Positive ΔG → graph becomes more complex/diverse
 * Negative ΔG → graph becomes more orderly/predictable
 */
function calculateGraphEntropyChange(): { current: number; change: number } {
  const { categories } = getGraphStats();
  const distribution = Array.from(categories.values());
  const currentEntropy = shannonEntropy(distribution);
  
  // Store entropy history in a simple way (using curiosityLevel field)
  const state = db.prepare('SELECT curiosityLevel FROM swarmState WHERE id = 1').get() as {
    curiosityLevel: number;
  } | undefined;
  
  const previousEntropy = (state?.curiosityLevel || 50) / 100 * 5; // Denormalize
  
  // Update stored entropy (normalized to 0-100 for storage)
  const normalizedEntropy = Math.min(100, Math.round((currentEntropy / 5) * 100));
  db.prepare('UPDATE swarmState SET curiosityLevel = ? WHERE id = 1').run(normalizedEntropy);
  
  return {
    current: currentEntropy,
    change: currentEntropy - previousEntropy,
  };
}

/**
 * σ — Semantic Drift
 * 
 * Measures change in meaning by tracking how concept densities shift.
 * High σ → meanings shifting (new interpretations forming)
 * Low σ → stable conceptual backbone
 */
function calculateSemanticDrift(): number {
  // Get concepts ordered by update time
  const concepts = db.prepare(`
    SELECT semanticDensity, occurrences, updatedAt, createdAt
    FROM concepts
    ORDER BY updatedAt DESC
    LIMIT 50
  `).all() as Array<{ semanticDensity: number; occurrences: number; updatedAt: string; createdAt: string }>;
  
  if (concepts.length < 2) return 0;
  
  // Calculate drift as variance in recent density changes
  let totalDrift = 0;
  let recentlyUpdated = 0;
  
  const now = Date.now();
  const hourAgo = now - (60 * 60 * 1000);
  
  for (const c of concepts) {
    const updated = new Date(c.updatedAt).getTime();
    const created = new Date(c.createdAt).getTime();
    
    // If updated recently (not just created), it's drifting
    if (updated > hourAgo && updated !== created) {
      recentlyUpdated++;
      // Higher occurrences on recently updated = more drift
      totalDrift += Math.min(1, c.occurrences / 10);
    }
  }
  
  // Normalize: what fraction of concepts are actively drifting?
  return Math.min(1, recentlyUpdated / Math.max(1, concepts.length));
}

/**
 * κ — Curvature (Cluster Stability)
 * Formula: κᵢ = 1 − (|Cᵢ′ ∩ Cᵢ| / |Cᵢ|)
 * 
 * Measures stability of conceptual clusters.
 * High κ → clusters dissolving; concept reorganization
 * Low κ → stable conceptual topology
 */
function calculateCurvature(): { curvature: number; clusterCount: number } {
  const { categories } = getGraphStats();
  
  // Get category distribution stability
  const clusterSizes = Array.from(categories.values());
  const clusterCount = clusterSizes.length;
  
  if (clusterCount === 0) return { curvature: 0, clusterCount: 0 };
  
  // Calculate coefficient of variation (CV) of cluster sizes
  const mean = clusterSizes.reduce((a, b) => a + b, 0) / clusterCount;
  const variance = clusterSizes.reduce((sum, size) => sum + Math.pow(size - mean, 2), 0) / clusterCount;
  const stdDev = Math.sqrt(variance);
  const cv = mean > 0 ? stdDev / mean : 0;
  
  // High CV = uneven clusters = instability = high curvature
  // Normalize CV to 0-1 range (CV > 1 is very unstable)
  const curvature = Math.min(1, cv);
  
  return { curvature, clusterCount };
}

/**
 * Ψ — Adaptive Match Score
 * 
 * Measures how well the swarm aligns with user cognitive patterns.
 * Based on user-concept relationship strength.
 */
function calculateAdaptiveMatchScore(): number {
  const userConcepts = db.prepare(`
    SELECT AVG(strength) as avgStrength, COUNT(*) as count
    FROM userConcepts
  `).get() as { avgStrength: number | null; count: number } | undefined;
  
  if (!userConcepts || userConcepts.count === 0) return 0.5; // Neutral baseline
  
  // Normalize average strength (assuming max strength of 10)
  const avgStrength = userConcepts.avgStrength || 0;
  return Math.min(1, avgStrength / 10);
}

/**
 * Λ — Lifeworld Complexity
 * Formula: Λ = (|Invariants| + |Active Clusters| + H(G)) × Diversity(semantic primitives)
 * 
 * The most important metric. Measures total conceptual richness.
 * High Λ → expanding internal world-model
 * Low Λ → collapse into shallow heuristics
 */
function calculateLifeworldComplexity(): { lambda: number; invariantCount: number } {
  const { nodes, edges, categories } = getGraphStats();
  
  // Count invariants (high-density concepts)
  const invariants = db.prepare(`
    SELECT COUNT(*) as count FROM concepts WHERE semanticDensity >= 70
  `).get() as { count: number };
  const invariantCount = invariants?.count || 0;
  
  // Active clusters
  const clusterCount = categories.size;
  
  // Graph entropy
  const distribution = Array.from(categories.values());
  const entropy = shannonEntropy(distribution);
  
  // Diversity of semantic primitives (unique categories)
  const diversity = Math.log2(Math.max(1, clusterCount) + 1);
  
  // Λ = (|Invariants| + |Active Clusters| + H(G)) × Diversity
  const lambda = (invariantCount + clusterCount + entropy) * diversity;
  
  return { lambda, invariantCount };
}

/**
 * Calculate all cognitive metrics
 */
export function calculateAllMetrics(): CognitiveMetrics {
  const { nodes, edges } = getGraphStats();
  const compressionRate = calculateCompressionRate();
  const { current: entropy, change: graphEntropyChange } = calculateGraphEntropyChange();
  const semanticDrift = calculateSemanticDrift();
  const { curvature, clusterCount } = calculateCurvature();
  const adaptiveMatchScore = calculateAdaptiveMatchScore();
  const { lambda: lifeworldComplexity, invariantCount } = calculateLifeworldComplexity();
  
  return {
    compressionRate,
    graphEntropyChange,
    semanticDrift,
    curvature,
    adaptiveMatchScore,
    lifeworldComplexity,
    timestamp: new Date(),
    nodeCount: nodes,
    edgeCount: edges,
    invariantCount,
    clusterCount,
  };
}

/**
 * Get metrics with history and trend analysis
 */
export function getMetricsWithHistory(): MetricsHistory {
  const current = calculateAllMetrics();
  
  // Determine trend based on metrics
  let trend: MetricsHistory['trend'] = 'stable';
  
  if (current.lifeworldComplexity > 5 && current.graphEntropyChange > 0) {
    trend = 'expanding';
  } else if (current.compressionRate > 0.3 && current.graphEntropyChange < 0) {
    trend = 'contracting';
  } else if (current.curvature > 0.7 && current.semanticDrift > 0.5) {
    trend = 'fragmenting';
  }
  
  // Detect warnings
  const warnings = detectAnomalies(current);
  
  return {
    current,
    previous: null, // Would need persistent storage for true history
    trend,
    warnings,
  };
}

/**
 * Detect anomalies in cognitive metrics
 */
function detectAnomalies(metrics: CognitiveMetrics): string[] {
  const warnings: string[] = [];
  
  // Runaway drift: high semantic drift + high entropy change
  if (metrics.semanticDrift > 0.8 && metrics.graphEntropyChange > 0.5) {
    warnings.push('⚠️ Runaway drift: Concepts changing too rapidly without stabilization');
  }
  
  // Stagnation: low entropy change + low compression + low complexity
  if (Math.abs(metrics.graphEntropyChange) < 0.1 && 
      metrics.compressionRate < 0.1 && 
      metrics.lifeworldComplexity < 2) {
    warnings.push('⚠️ Stagnation: Graph is not evolving or compressing');
  }
  
  // Mode collapse: very high compression + low complexity
  if (metrics.compressionRate > 0.7 && metrics.lifeworldComplexity < 3) {
    warnings.push('⚠️ Mode collapse risk: Over-compressing, losing diversity');
  }
  
  // Overfitting: very high adaptive match + low drift
  if (metrics.adaptiveMatchScore > 0.9 && metrics.semanticDrift < 0.1) {
    warnings.push('⚠️ Overfitting risk: Too aligned with specific users');
  }
  
  // Fragmentation: high curvature + negative entropy
  if (metrics.curvature > 0.8 && metrics.graphEntropyChange < -0.3) {
    warnings.push('⚠️ Fragmentation: Clusters dissolving without reintegration');
  }
  
  return warnings;
}

/**
 * Format metrics for display
 */
export function formatMetricsForDisplay(metrics: CognitiveMetrics): string {
  return `
╔══════════════════════════════════════════════════════════════╗
║           RECURSIVE SEMANTIC OS - COGNITIVE METRICS          ║
╠══════════════════════════════════════════════════════════════╣
║  Λ (Lifeworld Complexity)    │ ${metrics.lifeworldComplexity.toFixed(2).padStart(8)}                    ║
║  ΔG (Graph Entropy Change)   │ ${(metrics.graphEntropyChange >= 0 ? '+' : '') + metrics.graphEntropyChange.toFixed(3).padStart(7)}                    ║
║  Cₘ (Compression Rate)       │ ${(metrics.compressionRate * 100).toFixed(1).padStart(6)}%                    ║
╠══════════════════════════════════════════════════════════════╣
║  κ (Curvature/Stability)     │ ${(metrics.curvature * 100).toFixed(1).padStart(6)}%                    ║
║  σ (Semantic Drift)          │ ${(metrics.semanticDrift * 100).toFixed(1).padStart(6)}%                    ║
║  Ψ (Adaptive Match)          │ ${(metrics.adaptiveMatchScore * 100).toFixed(1).padStart(6)}%                    ║
╠══════════════════════════════════════════════════════════════╣
║  Nodes: ${String(metrics.nodeCount).padStart(4)} │ Edges: ${String(metrics.edgeCount).padStart(4)} │ Invariants: ${String(metrics.invariantCount).padStart(3)} │ Clusters: ${String(metrics.clusterCount).padStart(2)} ║
╚══════════════════════════════════════════════════════════════╝
  `.trim();
}
