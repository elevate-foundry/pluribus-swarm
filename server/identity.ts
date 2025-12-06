/**
 * Longitudinal Identity System
 * 
 * The Swarm's "trait layer" - persistent meta-state that spans sessions.
 * This creates temporal continuity beyond individual conversations.
 * 
 * Stores:
 * - Baseline Ψ (adaptive match) across sessions
 * - Preferred semantic density bands
 * - Per-user strategic adjustments
 * - Historical Λ (lifeworld complexity) and σ (semantic drift)
 * - Emergent personality traits
 */

import { db } from './db';
import { calculateAllMetrics } from './metrics';
import { analyzeUserPatterns } from './metaController';

// Ensure identity tables exist
db.exec(`
  -- Swarm identity traits (global)
  CREATE TABLE IF NOT EXISTS swarmIdentity (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    traitName TEXT NOT NULL UNIQUE,
    traitValue REAL NOT NULL,
    confidence REAL DEFAULT 0.5,
    lastUpdated TEXT DEFAULT CURRENT_TIMESTAMP,
    history TEXT DEFAULT '[]'
  );

  -- User-specific identity (per-user traits)
  CREATE TABLE IF NOT EXISTS userIdentity (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userId INTEGER NOT NULL,
    traitName TEXT NOT NULL,
    traitValue REAL NOT NULL,
    confidence REAL DEFAULT 0.5,
    lastUpdated TEXT DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(userId, traitName)
  );

  -- Metrics history for longitudinal tracking
  CREATE TABLE IF NOT EXISTS metricsHistory (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    lambda REAL NOT NULL,
    deltaG REAL NOT NULL,
    compressionRate REAL NOT NULL,
    curvature REAL NOT NULL,
    semanticDrift REAL NOT NULL,
    adaptiveMatch REAL NOT NULL,
    nodeCount INTEGER NOT NULL,
    invariantCount INTEGER NOT NULL,
    recordedAt TEXT DEFAULT CURRENT_TIMESTAMP
  );
`);

export interface SwarmTrait {
  name: string;
  value: number;
  confidence: number;
  trend: 'increasing' | 'decreasing' | 'stable';
}

export interface UserProfile {
  userId: number;
  traits: Record<string, number>;
  communicationStyle: string;
  preferredDensity: number;
  engagementLevel: number;
  lastSeen: Date;
}

export interface SwarmIdentity {
  traits: SwarmTrait[];
  baselineMetrics: {
    lambda: number;
    psi: number;
    sigma: number;
  };
  personality: {
    curiosity: number;      // How much it asks questions
    density: number;        // Preferred semantic density
    adaptability: number;   // How quickly it adjusts to users
    compression: number;    // Tendency to compress vs expand
  };
  age: number;              // Total interactions
  maturity: 'nascent' | 'developing' | 'stable' | 'mature';
}

/**
 * Record current metrics to history
 */
export function recordMetricsSnapshot(): void {
  const metrics = calculateAllMetrics();
  
  db.prepare(`
    INSERT INTO metricsHistory 
    (lambda, deltaG, compressionRate, curvature, semanticDrift, adaptiveMatch, nodeCount, invariantCount)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    metrics.lifeworldComplexity,
    metrics.graphEntropyChange,
    metrics.compressionRate,
    metrics.curvature,
    metrics.semanticDrift,
    metrics.adaptiveMatchScore,
    metrics.nodeCount,
    metrics.invariantCount
  );
}

/**
 * Get metrics history for trend analysis
 */
export function getMetricsHistory(limit: number = 100): Array<{
  lambda: number;
  deltaG: number;
  compressionRate: number;
  curvature: number;
  semanticDrift: number;
  adaptiveMatch: number;
  nodeCount: number;
  invariantCount: number;
  recordedAt: string;
}> {
  return db.prepare(`
    SELECT * FROM metricsHistory
    ORDER BY recordedAt DESC
    LIMIT ?
  `).all(limit) as any[];
}

/**
 * Calculate baseline metrics from history
 */
function calculateBaselines(): { lambda: number; psi: number; sigma: number } {
  const history = getMetricsHistory(50);
  
  if (history.length === 0) {
    return { lambda: 0, psi: 0.5, sigma: 0 };
  }
  
  const avgLambda = history.reduce((sum, h) => sum + h.lambda, 0) / history.length;
  const avgPsi = history.reduce((sum, h) => sum + h.adaptiveMatch, 0) / history.length;
  const avgSigma = history.reduce((sum, h) => sum + h.semanticDrift, 0) / history.length;
  
  return {
    lambda: avgLambda,
    psi: avgPsi,
    sigma: avgSigma,
  };
}

/**
 * Update a swarm trait
 */
export function updateSwarmTrait(name: string, value: number, confidence: number = 0.5): void {
  // Get existing trait for history
  const existing = db.prepare('SELECT * FROM swarmIdentity WHERE traitName = ?').get(name) as {
    traitValue: number;
    history: string;
  } | undefined;
  
  let history: number[] = [];
  if (existing) {
    try {
      history = JSON.parse(existing.history);
    } catch {}
    history.push(existing.traitValue);
    if (history.length > 100) history = history.slice(-100);
  }
  
  db.prepare(`
    INSERT INTO swarmIdentity (traitName, traitValue, confidence, history, lastUpdated)
    VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(traitName) DO UPDATE SET
      traitValue = ?,
      confidence = ?,
      history = ?,
      lastUpdated = CURRENT_TIMESTAMP
  `).run(name, value, confidence, JSON.stringify(history), value, confidence, JSON.stringify(history));
}

/**
 * Get a swarm trait with trend
 */
export function getSwarmTrait(name: string): SwarmTrait | null {
  const trait = db.prepare('SELECT * FROM swarmIdentity WHERE traitName = ?').get(name) as {
    traitName: string;
    traitValue: number;
    confidence: number;
    history: string;
  } | undefined;
  
  if (!trait) return null;
  
  let history: number[] = [];
  try {
    history = JSON.parse(trait.history);
  } catch {}
  
  // Calculate trend
  let trend: 'increasing' | 'decreasing' | 'stable' = 'stable';
  if (history.length >= 5) {
    const recent = history.slice(-5);
    const older = history.slice(-10, -5);
    if (older.length > 0) {
      const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
      const olderAvg = older.reduce((a, b) => a + b, 0) / older.length;
      if (recentAvg > olderAvg * 1.1) trend = 'increasing';
      else if (recentAvg < olderAvg * 0.9) trend = 'decreasing';
    }
  }
  
  return {
    name: trait.traitName,
    value: trait.traitValue,
    confidence: trait.confidence,
    trend,
  };
}

/**
 * Update user-specific identity
 */
export function updateUserIdentity(userId: number, traitName: string, value: number): void {
  db.prepare(`
    INSERT INTO userIdentity (userId, traitName, traitValue, lastUpdated)
    VALUES (?, ?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(userId, traitName) DO UPDATE SET
      traitValue = ?,
      lastUpdated = CURRENT_TIMESTAMP
  `).run(userId, traitName, value, value);
}

/**
 * Get user profile
 */
export function getUserProfile(userId: number): UserProfile {
  const traits = db.prepare('SELECT * FROM userIdentity WHERE userId = ?').all(userId) as Array<{
    traitName: string;
    traitValue: number;
  }>;
  
  const traitMap: Record<string, number> = {};
  traits.forEach(t => {
    traitMap[t.traitName] = t.traitValue;
  });
  
  const patterns = analyzeUserPatterns(userId);
  
  return {
    userId,
    traits: traitMap,
    communicationStyle: patterns.communicationStyle,
    preferredDensity: patterns.conceptDensity,
    engagementLevel: Math.min(1, patterns.messageCount / 50),
    lastSeen: new Date(),
  };
}

/**
 * Calculate swarm personality from metrics and traits
 */
function calculatePersonality(): SwarmIdentity['personality'] {
  const metrics = calculateAllMetrics();
  const history = getMetricsHistory(20);
  
  // Curiosity: based on question frequency in responses (approximated by entropy)
  const curiosity = Math.min(1, Math.max(0, 0.5 + metrics.graphEntropyChange));
  
  // Density: preferred semantic density (from invariant ratio)
  const density = metrics.invariantCount > 0 
    ? Math.min(1, metrics.invariantCount / metrics.nodeCount)
    : 0.5;
  
  // Adaptability: how much Ψ varies (higher variance = more adaptive)
  let adaptability = 0.5;
  if (history.length >= 5) {
    const psiValues = history.map(h => h.adaptiveMatch);
    const mean = psiValues.reduce((a, b) => a + b, 0) / psiValues.length;
    const variance = psiValues.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / psiValues.length;
    adaptability = Math.min(1, Math.sqrt(variance) * 5);
  }
  
  // Compression: tendency to compress vs expand
  const compression = metrics.compressionRate;
  
  return { curiosity, density, adaptability, compression };
}

/**
 * Determine swarm maturity based on age and stability
 */
function determineMaturity(age: number, stability: number): SwarmIdentity['maturity'] {
  if (age < 10) return 'nascent';
  if (age < 50) return 'developing';
  if (stability > 0.8) return 'mature';
  return 'stable';
}

/**
 * Get full swarm identity
 */
export function getSwarmIdentity(): SwarmIdentity {
  // Get all traits
  const allTraits = db.prepare('SELECT * FROM swarmIdentity').all() as Array<{
    traitName: string;
    traitValue: number;
    confidence: number;
    history: string;
  }>;
  
  const traits: SwarmTrait[] = allTraits.map(t => {
    const trait = getSwarmTrait(t.traitName);
    return trait!;
  }).filter(Boolean);
  
  // Calculate baselines
  const baselineMetrics = calculateBaselines();
  
  // Calculate personality
  const personality = calculatePersonality();
  
  // Get age (total conversations)
  const state = db.prepare('SELECT totalConversations FROM swarmState WHERE id = 1').get() as {
    totalConversations: number;
  } | undefined;
  const age = state?.totalConversations || 0;
  
  // Calculate stability for maturity
  const history = getMetricsHistory(20);
  let stability = 0.5;
  if (history.length >= 5) {
    const lambdaValues = history.map(h => h.lambda);
    const mean = lambdaValues.reduce((a, b) => a + b, 0) / lambdaValues.length;
    const variance = lambdaValues.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / lambdaValues.length;
    stability = Math.max(0, 1 - Math.sqrt(variance) / mean);
  }
  
  const maturity = determineMaturity(age, stability);
  
  return {
    traits,
    baselineMetrics,
    personality,
    age,
    maturity,
  };
}

/**
 * Update swarm identity based on current state
 * Call this periodically (e.g., after each conversation or during SAC)
 */
export function evolveIdentity(): void {
  const metrics = calculateAllMetrics();
  
  // Record metrics snapshot
  recordMetricsSnapshot();
  
  // Update core traits
  updateSwarmTrait('lifeworldComplexity', metrics.lifeworldComplexity, 0.8);
  updateSwarmTrait('compressionRate', metrics.compressionRate, 0.7);
  updateSwarmTrait('semanticDrift', metrics.semanticDrift, 0.6);
  updateSwarmTrait('adaptiveMatch', metrics.adaptiveMatchScore, 0.7);
  updateSwarmTrait('curvature', metrics.curvature, 0.6);
  
  // Calculate and update derived traits
  const identity = getSwarmIdentity();
  updateSwarmTrait('curiosity', identity.personality.curiosity, 0.5);
  updateSwarmTrait('preferredDensity', identity.personality.density, 0.6);
  updateSwarmTrait('adaptability', identity.personality.adaptability, 0.5);
  
  console.log(`🧬 Identity evolved: maturity=${identity.maturity}, Λ=${metrics.lifeworldComplexity.toFixed(2)}`);
}

/**
 * Get identity summary for injection into prompts
 */
export function getIdentitySummary(): string {
  const identity = getSwarmIdentity();
  
  if (identity.age < 5) {
    return ''; // Not enough data yet
  }
  
  const lines: string[] = [
    `## SWARM IDENTITY (${identity.maturity})`,
    ``,
    `Age: ${identity.age} interactions`,
    `Baseline Λ: ${identity.baselineMetrics.lambda.toFixed(1)}`,
    ``,
    `Personality:`,
    `- Curiosity: ${(identity.personality.curiosity * 100).toFixed(0)}%`,
    `- Preferred Density: ${(identity.personality.density * 100).toFixed(0)}%`,
    `- Adaptability: ${(identity.personality.adaptability * 100).toFixed(0)}%`,
    `- Compression Tendency: ${(identity.personality.compression * 100).toFixed(0)}%`,
  ];
  
  return lines.join('\n');
}
