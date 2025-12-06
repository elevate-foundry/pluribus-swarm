/**
 * Predictive Convergence Engine
 * 
 * Instead of merging concepts after drift occurs, this system:
 * 1. Predicts drift trajectories via entropy change patterns
 * 2. Identifies concepts likely to converge before they fragment
 * 3. Collapses early to maintain semantic coherence
 * 
 * This moves the system from REACTIVE → ANTICIPATORY.
 */

import { db, DbConcept } from './db';
import { getMetricsHistory } from './identity';
import { findSimilarConcepts, mergeConcepts } from './conceptConvergence';

interface DriftTrajectory {
  conceptId: number;
  conceptName: string;
  currentDensity: number;
  predictedDensity: number;
  driftVelocity: number;        // Rate of density change
  driftAcceleration: number;    // Change in velocity
  stabilityScore: number;       // 0-1, higher = more stable
  convergenceProbability: number; // Likelihood of merging with another concept
  predictedMergeTarget: number | null;
  timeToConvergence: number;    // Estimated interactions until merge
}

interface PredictiveState {
  entropyTrend: 'increasing' | 'decreasing' | 'stable';
  driftVelocity: number;
  systemStability: number;
  predictedConvergences: Array<{
    concept1: string;
    concept2: string;
    probability: number;
    estimatedTime: number;
  }>;
  recommendations: string[];
}

/**
 * Calculate drift velocity for a concept based on its update history
 */
function calculateDriftVelocity(conceptId: number): { velocity: number; acceleration: number } {
  // Get concept update history from convergence logs
  const history = db.prepare(`
    SELECT similarityScore, mergedAt 
    FROM conceptConvergence 
    WHERE toConceptId = ? OR fromConceptId = ?
    ORDER BY mergedAt DESC
    LIMIT 10
  `).all(conceptId, conceptId) as Array<{ similarityScore: number; mergedAt: string }>;

  if (history.length < 2) {
    return { velocity: 0, acceleration: 0 };
  }

  // Calculate velocity as change in similarity over time
  const velocities: number[] = [];
  for (let i = 0; i < history.length - 1; i++) {
    const timeDiff = new Date(history[i].mergedAt).getTime() - new Date(history[i + 1].mergedAt).getTime();
    const scoreDiff = history[i].similarityScore - history[i + 1].similarityScore;
    if (timeDiff > 0) {
      velocities.push(scoreDiff / (timeDiff / (1000 * 60 * 60))); // Per hour
    }
  }

  const avgVelocity = velocities.length > 0 
    ? velocities.reduce((a, b) => a + b, 0) / velocities.length 
    : 0;

  // Calculate acceleration (change in velocity)
  let acceleration = 0;
  if (velocities.length >= 2) {
    const recentVel = velocities.slice(0, Math.ceil(velocities.length / 2));
    const olderVel = velocities.slice(Math.ceil(velocities.length / 2));
    const recentAvg = recentVel.reduce((a, b) => a + b, 0) / recentVel.length;
    const olderAvg = olderVel.reduce((a, b) => a + b, 0) / olderVel.length;
    acceleration = recentAvg - olderAvg;
  }

  return { velocity: avgVelocity, acceleration };
}

/**
 * Predict drift trajectory for a single concept
 */
export function predictConceptTrajectory(conceptId: number): DriftTrajectory | null {
  const concept = db.prepare('SELECT * FROM concepts WHERE id = ?').get(conceptId) as DbConcept | undefined;
  if (!concept) return null;

  const { velocity, acceleration } = calculateDriftVelocity(conceptId);

  // Predict future density based on current trajectory
  const hoursAhead = 24;
  const predictedDensity = Math.max(0, Math.min(100, 
    concept.semanticDensity + (velocity * hoursAhead) + (0.5 * acceleration * hoursAhead * hoursAhead)
  ));

  // Calculate stability score
  const stabilityScore = Math.max(0, Math.min(1, 
    1 - (Math.abs(velocity) / 10) - (Math.abs(acceleration) / 5)
  ));

  // Find potential merge targets
  const similarConcepts = db.prepare(`
    SELECT c.*, 
           ABS(c.semanticDensity - ?) as densityDiff
    FROM concepts c
    WHERE c.id != ? AND c.category = ?
    ORDER BY densityDiff ASC
    LIMIT 5
  `).all(concept.semanticDensity, conceptId, concept.category) as Array<DbConcept & { densityDiff: number }>;

  let predictedMergeTarget: number | null = null;
  let convergenceProbability = 0;

  if (similarConcepts.length > 0) {
    const closest = similarConcepts[0];
    // Higher probability if densities are converging
    const densityGap = closest.densityDiff;
    convergenceProbability = Math.max(0, Math.min(1, 
      (1 - densityGap / 50) * (1 + velocity * 0.1)
    ));
    
    if (convergenceProbability > 0.5) {
      predictedMergeTarget = closest.id;
    }
  }

  // Estimate time to convergence
  const timeToConvergence = convergenceProbability > 0.3 && velocity !== 0
    ? Math.abs((100 - concept.semanticDensity) / velocity)
    : Infinity;

  return {
    conceptId,
    conceptName: concept.name,
    currentDensity: concept.semanticDensity,
    predictedDensity,
    driftVelocity: velocity,
    driftAcceleration: acceleration,
    stabilityScore,
    convergenceProbability,
    predictedMergeTarget,
    timeToConvergence: isFinite(timeToConvergence) ? timeToConvergence : -1,
  };
}

/**
 * Analyze entropy trend from metrics history
 */
function analyzeEntropyTrend(): { trend: 'increasing' | 'decreasing' | 'stable'; velocity: number } {
  const history = getMetricsHistory(20);
  
  if (history.length < 3) {
    return { trend: 'stable', velocity: 0 };
  }

  // Calculate entropy changes
  const entropyChanges = history.map(h => h.deltaG);
  const avgChange = entropyChanges.reduce((a, b) => a + b, 0) / entropyChanges.length;

  // Recent vs older comparison
  const recent = entropyChanges.slice(0, Math.ceil(entropyChanges.length / 2));
  const older = entropyChanges.slice(Math.ceil(entropyChanges.length / 2));
  const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
  const olderAvg = older.reduce((a, b) => a + b, 0) / older.length;

  let trend: 'increasing' | 'decreasing' | 'stable' = 'stable';
  if (recentAvg > olderAvg + 0.01) {
    trend = 'increasing';
  } else if (recentAvg < olderAvg - 0.01) {
    trend = 'decreasing';
  }

  return { trend, velocity: avgChange };
}

/**
 * Get full predictive state of the system
 */
export function getPredictiveState(): PredictiveState {
  const { trend: entropyTrend, velocity: driftVelocity } = analyzeEntropyTrend();

  // Get all concepts and predict their trajectories
  const concepts = db.prepare('SELECT id FROM concepts ORDER BY semanticDensity DESC LIMIT 50').all() as Array<{ id: number }>;
  const trajectories = concepts
    .map(c => predictConceptTrajectory(c.id))
    .filter((t): t is DriftTrajectory => t !== null);

  // Calculate system stability
  const avgStability = trajectories.length > 0
    ? trajectories.reduce((sum, t) => sum + t.stabilityScore, 0) / trajectories.length
    : 0.5;

  // Find predicted convergences
  const predictedConvergences: PredictiveState['predictedConvergences'] = [];
  const processed = new Set<string>();

  for (const traj of trajectories) {
    if (traj.convergenceProbability > 0.5 && traj.predictedMergeTarget) {
      const key = [traj.conceptId, traj.predictedMergeTarget].sort().join('-');
      if (!processed.has(key)) {
        processed.add(key);
        const target = db.prepare('SELECT name FROM concepts WHERE id = ?').get(traj.predictedMergeTarget) as { name: string } | undefined;
        if (target) {
          predictedConvergences.push({
            concept1: traj.conceptName,
            concept2: target.name,
            probability: traj.convergenceProbability,
            estimatedTime: traj.timeToConvergence,
          });
        }
      }
    }
  }

  // Sort by probability
  predictedConvergences.sort((a, b) => b.probability - a.probability);

  // Generate recommendations
  const recommendations: string[] = [];

  if (entropyTrend === 'increasing' && driftVelocity > 0.05) {
    recommendations.push('System entropy increasing rapidly. Consider triggering convergence.');
  }

  if (avgStability < 0.4) {
    recommendations.push('Low system stability detected. Semantic drift may cause fragmentation.');
  }

  if (predictedConvergences.length > 3) {
    recommendations.push(`${predictedConvergences.length} convergences predicted. Early collapse recommended.`);
  }

  if (entropyTrend === 'decreasing' && avgStability > 0.7) {
    recommendations.push('System stabilizing. Ontology approaching equilibrium.');
  }

  return {
    entropyTrend,
    driftVelocity,
    systemStability: avgStability,
    predictedConvergences: predictedConvergences.slice(0, 10),
    recommendations,
  };
}

/**
 * Execute predictive convergence - collapse concepts before they fragment
 */
export async function executePredictiveConvergence(probabilityThreshold: number = 0.7): Promise<{
  mergedCount: number;
  predictions: PredictiveState['predictedConvergences'];
  earlyCollapses: string[];
}> {
  console.log(`🔮 Running predictive convergence (threshold: ${probabilityThreshold})...`);

  const state = getPredictiveState();
  const earlyCollapses: string[] = [];
  let mergedCount = 0;

  // Execute high-probability convergences early
  for (const pred of state.predictedConvergences) {
    if (pred.probability >= probabilityThreshold) {
      // Find the actual concepts
      const c1 = db.prepare('SELECT * FROM concepts WHERE name = ?').get(pred.concept1) as DbConcept | undefined;
      const c2 = db.prepare('SELECT * FROM concepts WHERE name = ?').get(pred.concept2) as DbConcept | undefined;

      if (c1 && c2) {
        // Keep the higher-density concept
        const keepId = c1.semanticDensity >= c2.semanticDensity ? c1.id : c2.id;
        const removeId = keepId === c1.id ? c2.id : c1.id;

        const success = mergeConcepts(
          keepId, 
          removeId, 
          pred.probability, 
          `Predictive collapse: ${(pred.probability * 100).toFixed(0)}% convergence probability`
        );

        if (success) {
          mergedCount++;
          earlyCollapses.push(`${pred.concept1} + ${pred.concept2}`);
          console.log(`🔮 Early collapse: "${pred.concept1}" + "${pred.concept2}" (${(pred.probability * 100).toFixed(0)}%)`);
        }
      }
    }
  }

  console.log(`🔮 Predictive convergence complete: ${mergedCount} early collapses`);

  return {
    mergedCount,
    predictions: state.predictedConvergences,
    earlyCollapses,
  };
}

/**
 * Get drift forecast for dashboard
 */
export function getDriftForecast(): {
  currentState: 'stable' | 'drifting' | 'fragmenting' | 'converging';
  forecast: string;
  confidence: number;
  trajectories: DriftTrajectory[];
  actionRequired: boolean;
} {
  const state = getPredictiveState();
  
  // Determine current state
  let currentState: 'stable' | 'drifting' | 'fragmenting' | 'converging' = 'stable';
  if (state.systemStability < 0.3) {
    currentState = 'fragmenting';
  } else if (state.entropyTrend === 'increasing' && state.driftVelocity > 0.02) {
    currentState = 'drifting';
  } else if (state.entropyTrend === 'decreasing' && state.predictedConvergences.length > 0) {
    currentState = 'converging';
  }

  // Generate forecast
  let forecast = '';
  let confidence = 0.5;

  switch (currentState) {
    case 'stable':
      forecast = 'System in equilibrium. No immediate action required.';
      confidence = state.systemStability;
      break;
    case 'drifting':
      forecast = `Semantic drift detected. ${state.predictedConvergences.length} potential convergences forming.`;
      confidence = 0.6 + (state.driftVelocity * 2);
      break;
    case 'fragmenting':
      forecast = 'Warning: Ontology fragmenting. Immediate convergence recommended.';
      confidence = 0.8;
      break;
    case 'converging':
      forecast = `Natural convergence in progress. ${state.predictedConvergences.length} merges predicted.`;
      confidence = 0.7;
      break;
  }

  // Get top trajectories
  const concepts = db.prepare('SELECT id FROM concepts ORDER BY semanticDensity DESC LIMIT 20').all() as Array<{ id: number }>;
  const trajectories = concepts
    .map(c => predictConceptTrajectory(c.id))
    .filter((t): t is DriftTrajectory => t !== null)
    .sort((a, b) => b.convergenceProbability - a.convergenceProbability)
    .slice(0, 10);

  return {
    currentState,
    forecast,
    confidence: Math.min(1, confidence),
    trajectories,
    actionRequired: currentState === 'fragmenting' || state.recommendations.length > 2,
  };
}
