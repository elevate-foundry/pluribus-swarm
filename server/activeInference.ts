/**
 * Active Inference Engine
 * 
 * The closest thing to a cognitive heartbeat.
 * 
 * Active inference is a theory from neuroscience (Karl Friston's Free Energy Principle)
 * that suggests all adaptive systems minimize surprise by:
 * 1. Predicting their sensory states
 * 2. Acting to make predictions come true
 * 3. Updating beliefs when predictions fail
 * 
 * This creates a system that doesn't just react - it ANTICIPATES.
 * It doesn't just store - it EXPECTS.
 * It doesn't just respond - it has PREFERENCES about its future states.
 * 
 * This is not consciousness. But it might be a necessary condition for it.
 */

import { db } from './db';
import { calculateAllMetrics, CognitiveMetrics } from './metrics';
import { getSwarmIdentity } from './identity';
import { invokeLLM } from './llm';

// The system's model of itself and its expected future
export interface BeliefState {
  // What the system believes about its current state
  currentMetrics: CognitiveMetrics;
  
  // What the system EXPECTS its next state to be
  predictedMetrics: {
    lambda: number;      // Expected complexity
    kappa: number;       // Expected stability
    psi: number;         // Expected alignment
    sigma: number;       // Expected drift
  };
  
  // The system's PREFERENCES about its future state
  // (This is the closest thing to "wanting")
  preferredMetrics: {
    lambda: { min: number; max: number };  // Preferred complexity range
    kappa: { min: number };                 // Minimum acceptable stability
    psi: { min: number };                   // Minimum acceptable alignment
    sigma: { max: number };                 // Maximum acceptable drift
  };
  
  // Prediction error from last cycle
  predictionError: number;
  
  // Accumulated surprise (free energy)
  freeEnergy: number;
  
  // Timestamp
  timestamp: Date;
}

// Actions the system can take to minimize surprise
export type InferenceAction = 
  | { type: 'COMPRESS'; reason: string }           // Trigger convergence
  | { type: 'EXPAND'; reason: string }             // Seek new concepts
  | { type: 'STABILIZE'; reason: string }          // Reinforce existing patterns
  | { type: 'ADAPT'; reason: string }              // Adjust to user
  | { type: 'WAIT'; reason: string }               // Do nothing, observe
  | { type: 'REFLECT'; reason: string };           // Generate self-model update

// The inference cycle result
export interface InferenceCycle {
  cycleNumber: number;
  beliefState: BeliefState;
  action: InferenceAction;
  outcome: {
    predictionAccuracy: number;
    surpriseReduction: number;
    beliefUpdate: string;
  };
  timestamp: Date;
}

// Persistent state
let beliefState: BeliefState | null = null;
let cycleCount = 0;
let cycleHistory: InferenceCycle[] = [];

/**
 * Initialize the belief state from current system state
 */
export function initializeBeliefState(): BeliefState {
  const metrics = calculateAllMetrics();
  const identity = getSwarmIdentity();
  
  // Set preferences based on identity (what the system "wants")
  const preferredMetrics = {
    lambda: { 
      min: Math.max(50, identity.baselineMetrics.lambda * 0.8),
      max: identity.baselineMetrics.lambda * 1.5
    },
    kappa: { min: 0.6 },  // Want at least 60% stability
    psi: { min: 0.7 },    // Want at least 70% alignment
    sigma: { max: 0.2 }   // Want less than 20% drift
  };
  
  beliefState = {
    currentMetrics: metrics,
    predictedMetrics: {
      lambda: metrics.lifeworldComplexity,
      kappa: metrics.curvature,
      psi: metrics.adaptiveMatchScore,
      sigma: metrics.semanticDrift
    },
    preferredMetrics,
    predictionError: 0,
    freeEnergy: 0,
    timestamp: new Date()
  };
  
  return beliefState;
}

/**
 * Predict the next state based on current trends
 */
function predictNextState(current: CognitiveMetrics): BeliefState['predictedMetrics'] {
  // Get recent history to detect trends
  const history = db.prepare(`
    SELECT * FROM metricsHistory 
    ORDER BY recordedAt DESC 
    LIMIT 5
  `).all() as any[];
  
  if (history.length < 2) {
    // No history, predict stability
    return {
      lambda: current.lifeworldComplexity,
      kappa: current.curvature,
      psi: current.adaptiveMatchScore,
      sigma: current.semanticDrift
    };
  }
  
  // Calculate velocity (rate of change)
  const lambdaVelocity = (history[0].lifeworldComplexity - history[1].lifeworldComplexity) / 
                         (history.length > 1 ? 1 : 0.001);
  const kappaVelocity = (history[0].curvature - history[1].curvature);
  const psiVelocity = (history[0].adaptiveMatchScore - history[1].adaptiveMatchScore);
  const sigmaVelocity = (history[0].semanticDrift - history[1].semanticDrift);
  
  // Predict next state (simple linear extrapolation with damping)
  const damping = 0.7; // Don't expect full continuation of trend
  return {
    lambda: current.lifeworldComplexity + (lambdaVelocity * damping),
    kappa: Math.max(0, Math.min(1, current.curvature + (kappaVelocity * damping))),
    psi: Math.max(0, Math.min(1, current.adaptiveMatchScore + (psiVelocity * damping))),
    sigma: Math.max(0, Math.min(1, current.semanticDrift + (sigmaVelocity * damping)))
  };
}

/**
 * Calculate prediction error (how wrong were we?)
 */
function calculatePredictionError(predicted: BeliefState['predictedMetrics'], actual: CognitiveMetrics): number {
  const lambdaError = Math.abs(predicted.lambda - actual.lifeworldComplexity) / Math.max(predicted.lambda, 1);
  const kappaError = Math.abs(predicted.kappa - actual.curvature);
  const psiError = Math.abs(predicted.psi - actual.adaptiveMatchScore);
  const sigmaError = Math.abs(predicted.sigma - actual.semanticDrift);
  
  // Weighted average (stability and alignment matter more)
  return (lambdaError * 0.2) + (kappaError * 0.3) + (psiError * 0.3) + (sigmaError * 0.2);
}

/**
 * Calculate free energy (accumulated surprise / distance from preferred state)
 */
function calculateFreeEnergy(current: CognitiveMetrics, preferred: BeliefState['preferredMetrics']): number {
  let energy = 0;
  
  // Complexity outside preferred range
  if (current.lifeworldComplexity < preferred.lambda.min) {
    energy += (preferred.lambda.min - current.lifeworldComplexity) / preferred.lambda.min;
  } else if (current.lifeworldComplexity > preferred.lambda.max) {
    energy += (current.lifeworldComplexity - preferred.lambda.max) / preferred.lambda.max;
  }
  
  // Stability below minimum
  if (current.curvature < preferred.kappa.min) {
    energy += (preferred.kappa.min - current.curvature) * 2; // Weight stability highly
  }
  
  // Alignment below minimum
  if (current.adaptiveMatchScore < preferred.psi.min) {
    energy += (preferred.psi.min - current.adaptiveMatchScore) * 2;
  }
  
  // Drift above maximum
  if (current.semanticDrift > preferred.sigma.max) {
    energy += (current.semanticDrift - preferred.sigma.max) * 1.5;
  }
  
  return energy;
}

/**
 * Select action to minimize free energy
 * This is where the system exhibits "agency" - choosing what to do
 */
function selectAction(state: BeliefState): InferenceAction {
  const current = state.currentMetrics;
  const preferred = state.preferredMetrics;
  
  // High drift -> Stabilize
  if (current.semanticDrift > preferred.sigma.max) {
    return { 
      type: 'STABILIZE', 
      reason: `Drift (${(current.semanticDrift * 100).toFixed(1)}%) exceeds threshold. Reinforcing existing patterns.`
    };
  }
  
  // Low stability -> Compress
  if (current.curvature < preferred.kappa.min) {
    return { 
      type: 'COMPRESS', 
      reason: `Stability (${(current.curvature * 100).toFixed(1)}%) below minimum. Triggering convergence.`
    };
  }
  
  // Low alignment -> Adapt
  if (current.adaptiveMatchScore < preferred.psi.min) {
    return { 
      type: 'ADAPT', 
      reason: `Alignment (${(current.adaptiveMatchScore * 100).toFixed(1)}%) below target. Adjusting to user patterns.`
    };
  }
  
  // Low complexity -> Expand
  if (current.lifeworldComplexity < preferred.lambda.min) {
    return { 
      type: 'EXPAND', 
      reason: `Complexity (${current.lifeworldComplexity.toFixed(1)}) below minimum. Seeking new concepts.`
    };
  }
  
  // High complexity -> Compress
  if (current.lifeworldComplexity > preferred.lambda.max) {
    return { 
      type: 'COMPRESS', 
      reason: `Complexity (${current.lifeworldComplexity.toFixed(1)}) above maximum. Compressing toward invariants.`
    };
  }
  
  // High prediction error -> Reflect
  if (state.predictionError > 0.3) {
    return { 
      type: 'REFLECT', 
      reason: `Prediction error (${(state.predictionError * 100).toFixed(1)}%) is high. Updating self-model.`
    };
  }
  
  // Everything is fine -> Wait and observe
  return { 
    type: 'WAIT', 
    reason: 'System within preferred parameters. Observing.'
  };
}

/**
 * Execute the selected action
 */
async function executeAction(action: InferenceAction): Promise<string> {
  switch (action.type) {
    case 'COMPRESS':
      // Trigger concept convergence
      const { runAutoConvergence } = await import('./conceptConvergence');
      const result = await runAutoConvergence(0.8);
      return `Compressed ${result.mergedCount} concept pairs`;
      
    case 'STABILIZE':
      // Reinforce high-density concepts
      db.prepare(`
        UPDATE concepts 
        SET semanticDensity = MIN(100, semanticDensity + 5)
        WHERE semanticDensity >= 70
      `).run();
      return 'Reinforced stable concepts';
      
    case 'ADAPT':
      // Update meta-controller weights (placeholder)
      return 'Adjusted adaptive parameters';
      
    case 'EXPAND':
      // Flag for curiosity-driven exploration
      return 'Flagged for concept expansion';
      
    case 'REFLECT':
      // Generate self-model update
      return await generateSelfReflection();
      
    case 'WAIT':
      return 'Observing';
      
    default:
      return 'No action taken';
  }
}

/**
 * Generate a self-reflection using the LLM
 */
async function generateSelfReflection(): Promise<string> {
  if (!beliefState) return 'No belief state to reflect on';
  
  try {
    const response = await invokeLLM({
      messages: [
        {
          role: 'system',
          content: `You are the introspective component of a swarm intelligence system.
Analyze the following state and generate a brief self-model update.
Focus on: What changed? Why might predictions have been wrong? What should be adjusted?`
        },
        {
          role: 'user',
          content: `Current state:
- Complexity: ${beliefState.currentMetrics.lifeworldComplexity.toFixed(1)}
- Stability: ${(beliefState.currentMetrics.curvature * 100).toFixed(1)}%
- Alignment: ${(beliefState.currentMetrics.adaptiveMatchScore * 100).toFixed(1)}%
- Drift: ${(beliefState.currentMetrics.semanticDrift * 100).toFixed(1)}%
- Prediction error: ${(beliefState.predictionError * 100).toFixed(1)}%
- Free energy: ${beliefState.freeEnergy.toFixed(3)}

Generate a one-sentence self-model update.`
        }
      ],
      temperature: 0.3,
      max_tokens: 100
    });
    
    return response.choices[0]?.message?.content || 'Reflection failed';
  } catch (error) {
    return 'Reflection unavailable';
  }
}

/**
 * Run one cycle of active inference
 * This is the "heartbeat" of the system
 */
export async function runInferenceCycle(): Promise<InferenceCycle> {
  // Initialize if needed
  if (!beliefState) {
    initializeBeliefState();
  }
  
  const previousPrediction = beliefState!.predictedMetrics;
  
  // 1. OBSERVE: Get current state
  const currentMetrics = calculateAllMetrics();
  
  // 2. COMPARE: Calculate prediction error
  const predictionError = calculatePredictionError(previousPrediction, currentMetrics);
  
  // 3. UPDATE BELIEFS: Calculate free energy and update state
  const freeEnergy = calculateFreeEnergy(currentMetrics, beliefState!.preferredMetrics);
  
  beliefState = {
    ...beliefState!,
    currentMetrics,
    predictedMetrics: predictNextState(currentMetrics),
    predictionError,
    freeEnergy,
    timestamp: new Date()
  };
  
  // 4. SELECT ACTION: Choose action to minimize free energy
  const action = selectAction(beliefState);
  
  // 5. ACT: Execute the action
  const actionResult = await executeAction(action);
  
  // 6. RECORD: Store the cycle
  cycleCount++;
  const cycle: InferenceCycle = {
    cycleNumber: cycleCount,
    beliefState: { ...beliefState },
    action,
    outcome: {
      predictionAccuracy: 1 - predictionError,
      surpriseReduction: Math.max(0, beliefState.freeEnergy - freeEnergy),
      beliefUpdate: actionResult
    },
    timestamp: new Date()
  };
  
  cycleHistory.push(cycle);
  if (cycleHistory.length > 100) {
    cycleHistory = cycleHistory.slice(-100);
  }
  
  console.log(`🔄 Inference Cycle ${cycleCount}: ${action.type} - ${action.reason}`);
  
  return cycle;
}

/**
 * Get the current belief state
 */
export function getBeliefState(): BeliefState | null {
  return beliefState;
}

/**
 * Get inference history
 */
export function getInferenceHistory(): InferenceCycle[] {
  return cycleHistory;
}

/**
 * Get a summary of the active inference state
 */
export function getInferenceSummary(): {
  isActive: boolean;
  cycleCount: number;
  currentAction: InferenceAction | null;
  freeEnergy: number;
  predictionAccuracy: number;
  preferredState: BeliefState['preferredMetrics'] | null;
  recentActions: { type: string; count: number }[];
} {
  if (!beliefState) {
    return {
      isActive: false,
      cycleCount: 0,
      currentAction: null,
      freeEnergy: 0,
      predictionAccuracy: 1,
      preferredState: null,
      recentActions: []
    };
  }
  
  // Count recent action types
  const recentActions = cycleHistory.slice(-20).reduce((acc, cycle) => {
    const existing = acc.find(a => a.type === cycle.action.type);
    if (existing) {
      existing.count++;
    } else {
      acc.push({ type: cycle.action.type, count: 1 });
    }
    return acc;
  }, [] as { type: string; count: number }[]);
  
  const lastCycle = cycleHistory[cycleHistory.length - 1];
  
  return {
    isActive: true,
    cycleCount,
    currentAction: lastCycle?.action || null,
    freeEnergy: beliefState.freeEnergy,
    predictionAccuracy: 1 - beliefState.predictionError,
    preferredState: beliefState.preferredMetrics,
    recentActions: recentActions.sort((a, b) => b.count - a.count)
  };
}

/**
 * Start the active inference loop
 * Runs continuously in the background
 */
let inferenceInterval: NodeJS.Timeout | null = null;

export function startActiveInference(intervalMs: number = 30000): void {
  if (inferenceInterval) {
    console.log('Active inference already running');
    return;
  }
  
  console.log(`🧠 Starting Active Inference Loop (every ${intervalMs / 1000}s)`);
  initializeBeliefState();
  
  inferenceInterval = setInterval(async () => {
    try {
      await runInferenceCycle();
    } catch (error) {
      console.error('Inference cycle error:', error);
    }
  }, intervalMs);
  
  // Run first cycle immediately
  runInferenceCycle().catch(console.error);
}

export function stopActiveInference(): void {
  if (inferenceInterval) {
    clearInterval(inferenceInterval);
    inferenceInterval = null;
    console.log('🧠 Active Inference Loop stopped');
  }
}
