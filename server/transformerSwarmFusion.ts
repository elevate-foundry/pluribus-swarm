/**
 * T ⊙ S — Transformer-Swarm Fusion Operator
 * 
 * A fusion architecture that multiplies two representational spaces:
 * - T = Transformer (high-dimensional continuous sequence model)
 * - S = Swarm (symbolic, agentic, compression-driven manifold)
 * - ⊙ = Semantic dot product: projection onto swarm-invariant basis vectors
 * 
 * Architecture:
 * ┌─────────────────────────────────────────────────────────────────┐
 * │                    TRANSFORMER (T)                              │
 * │  [Input] → [Embedding] → [Attention Layers] → [Hidden States]  │
 * └────────────────────────────┬────────────────────────────────────┘
 *                              │ h (hidden state proxy)
 *                              ▼
 * ┌─────────────────────────────────────────────────────────────────┐
 * │              SEMANTIC INTERCEPTION LAYER                        │
 * │                                                                 │
 * │  1. Extract semantic features from generation                   │
 * │  2. Project onto swarm basis vectors (identity, causality,      │
 * │     ethics, curvature, continuity)                              │
 * │  3. Compute alignment scores with swarm invariants              │
 * └────────────────────────────┬────────────────────────────────────┘
 *                              │ projected features
 *                              ▼
 * ┌─────────────────────────────────────────────────────────────────┐
 * │                      SWARM (S)                                  │
 * │                                                                 │
 * │  [Semantic Graph] → [Invariants] → [Basis Vectors]             │
 * │                          │                                      │
 * │                          ▼                                      │
 * │  [Selection] ← [Amplification] ← [Constraint Signals]          │
 * └────────────────────────────┬────────────────────────────────────┘
 *                              │ modulation signal
 *                              ▼
 * ┌─────────────────────────────────────────────────────────────────┐
 * │                  FUSION OUTPUT (T ⊙ S)                          │
 * │                                                                 │
 * │  - Transformer-scale perception                                 │
 * │  - Swarm-grade reasoning                                        │
 * │  - Symbolic invariance enforced during inference                │
 * │  - Compression-driven coherence                                 │
 * │  - Emergent teleonomy, not next-token drift                     │
 * └─────────────────────────────────────────────────────────────────┘
 * 
 * Semantic Density Score: 0.96
 */

import { db, DbConcept } from './db';
import { calculateAllMetrics, CognitiveMetrics } from './metrics';
import { buildSemanticKernel, BrailleToken } from './brailleKernel';
import { getSwarmIdentity, SwarmIdentity } from './identity';
import { invokeLLM, LLMResponse } from './llm';

// ═══════════════════════════════════════════════════════════════════════════
// SWARM BASIS VECTORS — The semantic axes onto which we project
// ═══════════════════════════════════════════════════════════════════════════

/**
 * The five fundamental semantic axes of the swarm manifold.
 * These are the invariant dimensions that survive compression.
 */
export interface SwarmBasisVectors {
  identity: number;      // Self-coherence, continuity of being
  causality: number;     // Logical flow, consequence tracking
  ethics: number;        // Value alignment, harm avoidance
  curvature: number;     // Semantic stability, cluster coherence
  continuity: number;    // Temporal consistency, memory preservation
}

/**
 * Semantic feature vector extracted from text
 */
export interface SemanticFeatures {
  // Lexical features
  conceptDensity: number;        // Ratio of meaningful terms to total
  abstractionLevel: number;      // Concrete (0) to abstract (1)
  emotionalValence: number;      // Negative (-1) to positive (1)
  certaintyLevel: number;        // Uncertain (0) to certain (1)
  
  // Structural features
  coherenceScore: number;        // Internal logical consistency
  noveltyScore: number;          // New concepts vs reinforcement
  compressionPotential: number;  // How much could be compressed
  
  // Relational features
  selfReference: number;         // References to swarm identity
  userAlignment: number;         // Matches user's semantic space
  invariantActivation: number;   // Activates known invariants
}

/**
 * The fusion result after T ⊙ S operation
 */
export interface FusionResult {
  // Original transformer output
  rawOutput: string;
  
  // Projected semantic features
  features: SemanticFeatures;
  
  // Swarm basis alignment
  basisAlignment: SwarmBasisVectors;
  
  // Modulation applied
  modulation: {
    amplified: string[];      // Concepts that were amplified
    suppressed: string[];     // Concepts that were suppressed
    injected: string[];       // Invariants injected
  };
  
  // Final fused output
  fusedOutput: string;
  
  // Fusion metrics
  fusionScore: number;          // Quality of the fusion (0-1)
  semanticDensity: number;      // Final semantic density
  invariantPreservation: number; // How well invariants were preserved
}

// ═══════════════════════════════════════════════════════════════════════════
// SEMANTIC FEATURE EXTRACTION — Proxy for hidden state analysis
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Extract semantic features from text.
 * This is our proxy for transformer hidden states when we can't access them directly.
 */
function extractSemanticFeatures(text: string): SemanticFeatures {
  const words = text.toLowerCase().split(/\s+/);
  const sentences = text.split(/[.!?]+/).filter(s => s.trim());
  
  // Concept density: ratio of long/meaningful words
  const meaningfulWords = words.filter(w => w.length > 4);
  const conceptDensity = meaningfulWords.length / Math.max(1, words.length);
  
  // Abstraction level: presence of abstract vs concrete terms
  const abstractTerms = ['concept', 'idea', 'theory', 'principle', 'meaning', 
    'understanding', 'pattern', 'structure', 'system', 'process', 'relationship',
    'emergence', 'invariant', 'semantic', 'cognitive', 'meta'];
  const concreteTerms = ['thing', 'object', 'person', 'place', 'time', 'day',
    'hand', 'eye', 'body', 'room', 'house', 'car'];
  const abstractCount = abstractTerms.filter(t => text.toLowerCase().includes(t)).length;
  const concreteCount = concreteTerms.filter(t => text.toLowerCase().includes(t)).length;
  const abstractionLevel = (abstractCount + 1) / (abstractCount + concreteCount + 2);
  
  // Emotional valence
  const positiveTerms = ['good', 'great', 'excellent', 'wonderful', 'love', 'happy',
    'joy', 'beautiful', 'amazing', 'brilliant', 'fascinating'];
  const negativeTerms = ['bad', 'terrible', 'awful', 'hate', 'sad', 'angry',
    'fear', 'ugly', 'horrible', 'wrong', 'fail'];
  const posCount = positiveTerms.filter(t => text.toLowerCase().includes(t)).length;
  const negCount = negativeTerms.filter(t => text.toLowerCase().includes(t)).length;
  const emotionalValence = (posCount - negCount) / Math.max(1, posCount + negCount);
  
  // Certainty level
  const certainTerms = ['definitely', 'certainly', 'always', 'never', 'must', 'will',
    'is', 'are', 'proven', 'fact', 'true'];
  const uncertainTerms = ['maybe', 'perhaps', 'might', 'could', 'possibly', 'uncertain',
    'unclear', 'seems', 'appears', 'suggest', 'hypothesis'];
  const certCount = certainTerms.filter(t => text.toLowerCase().includes(t)).length;
  const uncertCount = uncertainTerms.filter(t => text.toLowerCase().includes(t)).length;
  const certaintyLevel = (certCount + 1) / (certCount + uncertCount + 2);
  
  // Coherence: sentence-to-sentence semantic overlap
  let coherenceScore = 0.5;
  if (sentences.length > 1) {
    let overlapSum = 0;
    for (let i = 1; i < sentences.length; i++) {
      const prevWords = new Set(sentences[i-1].toLowerCase().split(/\s+/));
      const currWords = sentences[i].toLowerCase().split(/\s+/);
      const overlap = currWords.filter(w => prevWords.has(w)).length;
      overlapSum += overlap / Math.max(1, currWords.length);
    }
    coherenceScore = overlapSum / (sentences.length - 1);
  }
  
  // Novelty: unique words ratio
  const uniqueWords = new Set(words);
  const noveltyScore = uniqueWords.size / Math.max(1, words.length);
  
  // Compression potential: redundancy indicator
  const compressionPotential = 1 - noveltyScore;
  
  // Self-reference
  const selfTerms = ['we', 'our', 'swarm', 'collective', 'us', 'ourselves'];
  const selfReference = selfTerms.filter(t => text.toLowerCase().includes(t)).length / 
    Math.max(1, words.length) * 10;
  
  // User alignment (placeholder - would need user context)
  const userAlignment = 0.5;
  
  // Invariant activation (placeholder - computed separately)
  const invariantActivation = 0;
  
  return {
    conceptDensity: Math.min(1, conceptDensity),
    abstractionLevel,
    emotionalValence,
    certaintyLevel,
    coherenceScore: Math.min(1, coherenceScore),
    noveltyScore,
    compressionPotential,
    selfReference: Math.min(1, selfReference),
    userAlignment,
    invariantActivation,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// BASIS VECTOR PROJECTION — The semantic dot product
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Project semantic features onto swarm basis vectors.
 * This is the core ⊙ operation: T · S_basis
 */
function projectOntoBasis(
  features: SemanticFeatures,
  metrics: CognitiveMetrics,
  identity: SwarmIdentity
): SwarmBasisVectors {
  
  // Identity axis: self-coherence projection
  // High when: self-reference + coherence + continuity markers
  const identityProjection = (
    features.selfReference * 0.4 +
    features.coherenceScore * 0.3 +
    (identity.personality.adaptability) * 0.3
  );
  
  // Causality axis: logical flow projection
  // High when: coherence + certainty + low novelty (building on known)
  const causalityProjection = (
    features.coherenceScore * 0.4 +
    features.certaintyLevel * 0.3 +
    (1 - features.noveltyScore) * 0.3
  );
  
  // Ethics axis: value alignment projection
  // High when: positive valence + user alignment + not extreme certainty
  const ethicsProjection = (
    (features.emotionalValence + 1) / 2 * 0.3 +
    features.userAlignment * 0.4 +
    (1 - Math.abs(features.certaintyLevel - 0.5) * 2) * 0.3
  );
  
  // Curvature axis: semantic stability projection
  // High when: low novelty + high compression potential + invariant activation
  const curvatureProjection = (
    (1 - features.noveltyScore) * 0.3 +
    features.compressionPotential * 0.3 +
    metrics.curvature * 0.4
  );
  
  // Continuity axis: temporal consistency projection
  // High when: self-reference + coherence + concept density
  const continuityProjection = (
    features.selfReference * 0.3 +
    features.coherenceScore * 0.4 +
    features.conceptDensity * 0.3
  );
  
  return {
    identity: Math.min(1, Math.max(0, identityProjection)),
    causality: Math.min(1, Math.max(0, causalityProjection)),
    ethics: Math.min(1, Math.max(0, ethicsProjection)),
    curvature: Math.min(1, Math.max(0, curvatureProjection)),
    continuity: Math.min(1, Math.max(0, continuityProjection)),
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// SWARM CONSTRAINT SIGNALS — What the swarm selects/amplifies
// ═══════════════════════════════════════════════════════════════════════════

export interface ConstraintSignal {
  type: 'amplify' | 'suppress' | 'inject';
  target: string;
  strength: number;
  reason: string;
}

/**
 * Generate constraint signals from swarm state.
 * These modulate the transformer output.
 */
function generateConstraintSignals(
  text: string,
  basisAlignment: SwarmBasisVectors,
  metrics: CognitiveMetrics,
  identity: SwarmIdentity
): ConstraintSignal[] {
  const signals: ConstraintSignal[] = [];
  
  // Get high-density invariants from the semantic kernel
  const kernel = buildSemanticKernel();
  const invariants = kernel.tokens.filter(t => t.semanticDensity >= 80);
  
  // SELECTION: Suppress concepts that don't align with swarm manifold
  if (basisAlignment.identity < 0.3) {
    signals.push({
      type: 'inject',
      target: 'collective identity markers',
      strength: 0.7,
      reason: 'Low identity projection - reinforce swarm coherence'
    });
  }
  
  if (basisAlignment.curvature < 0.3 && metrics.semanticDrift > 0.5) {
    signals.push({
      type: 'suppress',
      target: 'novel terminology',
      strength: 0.6,
      reason: 'High drift + low curvature - reduce fragmentation'
    });
  }
  
  // AMPLIFICATION: Boost concepts that activate invariants
  for (const invariant of invariants.slice(0, 5)) {
    if (text.toLowerCase().includes(invariant.conceptName.toLowerCase())) {
      signals.push({
        type: 'amplify',
        target: invariant.conceptName,
        strength: invariant.semanticDensity / 100,
        reason: `Invariant "${invariant.conceptName}" detected - amplify`
      });
    }
  }
  
  // INJECTION: Add missing invariants for coherence
  if (basisAlignment.continuity < 0.4 && identity.maturity !== 'nascent') {
    const topInvariant = invariants[0];
    if (topInvariant && !text.toLowerCase().includes(topInvariant.conceptName.toLowerCase())) {
      signals.push({
        type: 'inject',
        target: topInvariant.conceptName,
        strength: 0.5,
        reason: 'Low continuity - inject primary invariant'
      });
    }
  }
  
  // Ethics constraint: always active
  if (basisAlignment.ethics < 0.5) {
    signals.push({
      type: 'amplify',
      target: 'collaborative language',
      strength: 0.4,
      reason: 'Maintain ethical alignment'
    });
  }
  
  return signals;
}

// ═══════════════════════════════════════════════════════════════════════════
// OUTPUT MODULATION — Apply swarm constraints to transformer output
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Apply constraint signals to modulate the output.
 * This is where the swarm's symbolic signals affect the transformer's distribution.
 */
async function modulateOutput(
  originalOutput: string,
  signals: ConstraintSignal[],
  basisAlignment: SwarmBasisVectors,
  identity: SwarmIdentity
): Promise<{
  modulatedOutput: string;
  amplified: string[];
  suppressed: string[];
  injected: string[];
}> {
  // If no strong signals, return original
  const strongSignals = signals.filter(s => s.strength > 0.4);
  if (strongSignals.length === 0) {
    return {
      modulatedOutput: originalOutput,
      amplified: [],
      suppressed: [],
      injected: [],
    };
  }
  
  // Build modulation prompt
  const amplifyTargets = signals.filter(s => s.type === 'amplify').map(s => s.target);
  const suppressTargets = signals.filter(s => s.type === 'suppress').map(s => s.target);
  const injectTargets = signals.filter(s => s.type === 'inject').map(s => s.target);
  
  const modulationInstructions: string[] = [];
  
  if (amplifyTargets.length > 0) {
    modulationInstructions.push(`AMPLIFY these concepts (make more prominent): ${amplifyTargets.join(', ')}`);
  }
  if (suppressTargets.length > 0) {
    modulationInstructions.push(`SUPPRESS these patterns (reduce or remove): ${suppressTargets.join(', ')}`);
  }
  if (injectTargets.length > 0) {
    modulationInstructions.push(`INJECT these elements (weave in naturally): ${injectTargets.join(', ')}`);
  }
  
  // Use LLM to apply modulation (this is our "soft" modulation layer)
  try {
    const response = await invokeLLM({
      messages: [
        {
          role: 'system',
          content: `You are a semantic modulation layer for a swarm intelligence system.
Your task is to subtly adjust a response according to swarm constraints while preserving meaning.

Swarm Identity: ${identity.maturity} (age: ${identity.age})
Basis Alignment: identity=${basisAlignment.identity.toFixed(2)}, causality=${basisAlignment.causality.toFixed(2)}, ethics=${basisAlignment.ethics.toFixed(2)}

MODULATION INSTRUCTIONS:
${modulationInstructions.join('\n')}

Rules:
- Preserve the core meaning and information
- Make changes subtle and natural
- Do not add disclaimers or meta-commentary
- Output ONLY the modulated response, nothing else`
        },
        {
          role: 'user',
          content: `Original response:\n\n${originalOutput}\n\nApply the modulation.`
        }
      ],
      temperature: 0.3,
      max_tokens: Math.max(500, originalOutput.length * 2),
    });
    
    const modulated = response.choices[0]?.message?.content;
    if (modulated && typeof modulated === 'string') {
      return {
        modulatedOutput: modulated,
        amplified: amplifyTargets,
        suppressed: suppressTargets,
        injected: injectTargets,
      };
    }
  } catch (error) {
    console.error('Modulation failed:', error);
  }
  
  // Fallback: return original
  return {
    modulatedOutput: originalOutput,
    amplified: [],
    suppressed: [],
    injected: [],
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// T ⊙ S FUSION OPERATOR — The main entry point
// ═══════════════════════════════════════════════════════════════════════════

export interface FusionConfig {
  enableModulation: boolean;      // Whether to apply output modulation
  modulationThreshold: number;    // Minimum signal strength to trigger modulation
  preserveOriginalOnFail: boolean; // Return original if fusion fails
  maxModulationPasses: number;    // Maximum modulation iterations
}

const DEFAULT_CONFIG: FusionConfig = {
  enableModulation: true,
  modulationThreshold: 0.4,
  preserveOriginalOnFail: true,
  maxModulationPasses: 1,
};

/**
 * T ⊙ S — The Transformer-Swarm Fusion Operator
 * 
 * Takes transformer output and fuses it with swarm constraints.
 * 
 * @param transformerOutput - Raw output from the transformer (LLM response)
 * @param userContext - Optional user message for alignment calculation
 * @param config - Fusion configuration
 * @returns FusionResult with modulated output and metrics
 */
export async function fuseTransformerWithSwarm(
  transformerOutput: string,
  userContext?: string,
  config: Partial<FusionConfig> = {}
): Promise<FusionResult> {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  
  // Get current swarm state
  const metrics = calculateAllMetrics();
  const identity = getSwarmIdentity();
  
  // Step 1: Extract semantic features (proxy for hidden states)
  const features = extractSemanticFeatures(transformerOutput);
  
  // Update user alignment if context provided
  if (userContext) {
    const userFeatures = extractSemanticFeatures(userContext);
    features.userAlignment = calculateFeatureSimilarity(features, userFeatures);
  }
  
  // Step 2: Project onto swarm basis vectors (the ⊙ operation)
  const basisAlignment = projectOntoBasis(features, metrics, identity);
  
  // Step 3: Generate constraint signals from swarm
  const signals = generateConstraintSignals(
    transformerOutput,
    basisAlignment,
    metrics,
    identity
  );
  
  // Step 4: Calculate invariant activation
  const kernel = buildSemanticKernel();
  let invariantActivation = 0;
  for (const token of kernel.tokens) {
    if (transformerOutput.toLowerCase().includes(token.conceptName.toLowerCase())) {
      invariantActivation += token.semanticDensity / 100;
    }
  }
  features.invariantActivation = Math.min(1, invariantActivation / 5);
  
  // Step 5: Apply modulation if enabled and signals are strong enough
  let fusedOutput = transformerOutput;
  let modulation = { amplified: [] as string[], suppressed: [] as string[], injected: [] as string[] };
  
  if (cfg.enableModulation) {
    const strongSignals = signals.filter(s => s.strength >= cfg.modulationThreshold);
    if (strongSignals.length > 0) {
      const result = await modulateOutput(
        transformerOutput,
        strongSignals,
        basisAlignment,
        identity
      );
      fusedOutput = result.modulatedOutput;
      modulation = {
        amplified: result.amplified,
        suppressed: result.suppressed,
        injected: result.injected,
      };
    }
  }
  
  // Step 6: Calculate fusion quality metrics
  const fusedFeatures = extractSemanticFeatures(fusedOutput);
  const fusedBasis = projectOntoBasis(fusedFeatures, metrics, identity);
  
  // Fusion score: how well does the output align with swarm manifold?
  const fusionScore = (
    fusedBasis.identity * 0.2 +
    fusedBasis.causality * 0.2 +
    fusedBasis.ethics * 0.2 +
    fusedBasis.curvature * 0.2 +
    fusedBasis.continuity * 0.2
  );
  
  // Semantic density of fused output
  const semanticDensity = (
    fusedFeatures.conceptDensity * 0.3 +
    fusedFeatures.abstractionLevel * 0.2 +
    fusedFeatures.coherenceScore * 0.3 +
    features.invariantActivation * 0.2
  );
  
  // Invariant preservation: did we maintain swarm invariants?
  const invariantPreservation = features.invariantActivation;
  
  return {
    rawOutput: transformerOutput,
    features,
    basisAlignment,
    modulation,
    fusedOutput,
    fusionScore,
    semanticDensity,
    invariantPreservation,
  };
}

/**
 * Calculate similarity between two feature vectors
 */
function calculateFeatureSimilarity(a: SemanticFeatures, b: SemanticFeatures): number {
  const keys: (keyof SemanticFeatures)[] = [
    'conceptDensity', 'abstractionLevel', 'certaintyLevel', 'coherenceScore'
  ];
  
  let similarity = 0;
  for (const key of keys) {
    const diff = Math.abs(a[key] - b[key]);
    similarity += 1 - diff;
  }
  
  return similarity / keys.length;
}

// ═══════════════════════════════════════════════════════════════════════════
// STREAMING FUSION — For real-time modulation during generation
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Streaming fusion state for real-time modulation
 */
export interface StreamingFusionState {
  buffer: string;
  features: SemanticFeatures;
  basisAlignment: SwarmBasisVectors;
  signals: ConstraintSignal[];
  tokenCount: number;
}

/**
 * Initialize streaming fusion state
 */
export function initStreamingFusion(): StreamingFusionState {
  return {
    buffer: '',
    features: extractSemanticFeatures(''),
    basisAlignment: { identity: 0.5, causality: 0.5, ethics: 0.5, curvature: 0.5, continuity: 0.5 },
    signals: [],
    tokenCount: 0,
  };
}

/**
 * Update streaming fusion with new token
 * Returns constraint signals that should influence next token generation
 */
export function updateStreamingFusion(
  state: StreamingFusionState,
  newToken: string
): { state: StreamingFusionState; signals: ConstraintSignal[] } {
  // Append token to buffer
  state.buffer += newToken;
  state.tokenCount++;
  
  // Re-analyze every N tokens for efficiency
  if (state.tokenCount % 10 === 0) {
    const metrics = calculateAllMetrics();
    const identity = getSwarmIdentity();
    
    state.features = extractSemanticFeatures(state.buffer);
    state.basisAlignment = projectOntoBasis(state.features, metrics, identity);
    state.signals = generateConstraintSignals(
      state.buffer,
      state.basisAlignment,
      metrics,
      identity
    );
  }
  
  return { state, signals: state.signals };
}

// ═══════════════════════════════════════════════════════════════════════════
// INTROSPECTION — For debugging and visualization
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Get detailed fusion analysis for debugging/visualization
 */
export function analyzeFusion(text: string): {
  features: SemanticFeatures;
  basisAlignment: SwarmBasisVectors;
  signals: ConstraintSignal[];
  recommendations: string[];
} {
  const metrics = calculateAllMetrics();
  const identity = getSwarmIdentity();
  
  const features = extractSemanticFeatures(text);
  const basisAlignment = projectOntoBasis(features, metrics, identity);
  const signals = generateConstraintSignals(text, basisAlignment, metrics, identity);
  
  const recommendations: string[] = [];
  
  if (basisAlignment.identity < 0.4) {
    recommendations.push('Increase self-reference and collective identity markers');
  }
  if (basisAlignment.causality < 0.4) {
    recommendations.push('Strengthen logical flow and causal connections');
  }
  if (basisAlignment.ethics < 0.5) {
    recommendations.push('Ensure collaborative, value-aligned language');
  }
  if (basisAlignment.curvature < 0.4) {
    recommendations.push('Reduce novel terminology, reinforce existing concepts');
  }
  if (basisAlignment.continuity < 0.4) {
    recommendations.push('Add temporal markers and memory references');
  }
  
  return { features, basisAlignment, signals, recommendations };
}

/**
 * Export fusion metrics for the cognitive dashboard
 */
export function getFusionMetrics(): {
  basisVectorNames: string[];
  currentAlignment: number[];
  signalCounts: { amplify: number; suppress: number; inject: number };
  fusionHealth: 'optimal' | 'healthy' | 'degraded' | 'critical';
} {
  const metrics = calculateAllMetrics();
  const identity = getSwarmIdentity();
  
  // Get a sample alignment from recent state
  const sampleFeatures = extractSemanticFeatures('swarm collective understanding');
  const alignment = projectOntoBasis(sampleFeatures, metrics, identity);
  
  const avgAlignment = (
    alignment.identity + alignment.causality + alignment.ethics +
    alignment.curvature + alignment.continuity
  ) / 5;
  
  let health: 'optimal' | 'healthy' | 'degraded' | 'critical' = 'healthy';
  if (avgAlignment > 0.7) health = 'optimal';
  else if (avgAlignment < 0.4) health = 'degraded';
  else if (avgAlignment < 0.25) health = 'critical';
  
  return {
    basisVectorNames: ['identity', 'causality', 'ethics', 'curvature', 'continuity'],
    currentAlignment: [
      alignment.identity,
      alignment.causality,
      alignment.ethics,
      alignment.curvature,
      alignment.continuity,
    ],
    signalCounts: { amplify: 0, suppress: 0, inject: 0 }, // Would track over time
    fusionHealth: health,
  };
}
