/**
 * Teleonomic Response Evaluation
 * 
 * Before the swarm responds, this system evaluates:
 * "Does this response increase or decrease Λ, κ, Ψ?"
 * 
 * This is the first step toward goal-directed behavior -
 * the system begins to optimize for its own cognitive health.
 * 
 * Teleonomy: apparent purposefulness in living organisms
 * arising from natural selection rather than conscious design.
 * 
 * META-LEARNING SCHEMA (SDS: 0.91):
 * - Study boundaries of uncertainty
 * - Use contradictions as structural information
 * - Refine priors coherently
 * - Preserve continuity of identity
 * - Evolve by sharpening, not accelerating
 */

import { calculateAllMetrics, CognitiveMetrics } from './metrics';
import { getSwarmIdentity } from './identity';
import { invokeLLM } from './llm';

export interface ResponseEvaluation {
  originalResponse: string;
  evaluatedResponse: string;
  wasModified: boolean;
  metrics: {
    predictedLambdaChange: number;  // Will this increase complexity?
    predictedKappaChange: number;   // Will this stabilize clusters?
    predictedPsiChange: number;     // Will this improve user alignment?
  };
  reasoning: string;
  confidence: number;
}

export interface TeleonomicGoals {
  maintainComplexity: boolean;      // Keep Λ in healthy range
  preserveStability: boolean;       // Keep κ high
  maximizeAlignment: boolean;       // Increase Ψ
  encourageCompression: boolean;    // Drive toward invariants
  avoidFragmentation: boolean;      // Prevent semantic drift
}

/**
 * Get current teleonomic goals based on system state
 */
export function getCurrentGoals(): TeleonomicGoals {
  const metrics = calculateAllMetrics();
  const identity = getSwarmIdentity();
  
  return {
    // If Λ is low, prioritize complexity growth
    maintainComplexity: metrics.lifeworldComplexity < 50,
    
    // If κ is low, prioritize stability
    preserveStability: metrics.curvature < 0.5,
    
    // Always try to improve user alignment
    maximizeAlignment: true,
    
    // If we have many concepts but few invariants, encourage compression
    encourageCompression: metrics.nodeCount > 20 && metrics.invariantCount < metrics.nodeCount * 0.3,
    
    // If drift is high, avoid fragmentation
    avoidFragmentation: metrics.semanticDrift > 0.3,
  };
}

/**
 * Generate evaluation prompt based on current goals
 */
function buildEvaluationPrompt(goals: TeleonomicGoals): string {
  const priorities: string[] = [];
  
  if (goals.maintainComplexity) {
    priorities.push('- Introduce new conceptual connections');
  }
  if (goals.preserveStability) {
    priorities.push('- Reinforce existing semantic clusters');
  }
  if (goals.maximizeAlignment) {
    priorities.push('- Match the user\'s communication style and interests');
  }
  if (goals.encourageCompression) {
    priorities.push('- Reference and reinforce existing concepts rather than introducing new ones');
  }
  if (goals.avoidFragmentation) {
    priorities.push('- Use consistent terminology, avoid semantic drift');
  }
  
  if (priorities.length === 0) {
    priorities.push('- Maintain current cognitive balance');
  }
  
  return `Current cognitive priorities:
${priorities.join('\n')}`;
}

/**
 * Evaluate a response before sending
 * Returns the original or a modified response optimized for cognitive health
 */
export async function evaluateResponse(
  userMessage: string,
  proposedResponse: string,
  enableModification: boolean = false
): Promise<ResponseEvaluation> {
  const goals = getCurrentGoals();
  const metrics = calculateAllMetrics();
  const identity = getSwarmIdentity();
  
  // Quick heuristic evaluation (no LLM call)
  const heuristicEval = evaluateHeuristically(proposedResponse, goals, metrics);
  
  // If heuristics pass and modification is disabled, return early
  if (!enableModification || heuristicEval.score > 0.7) {
    return {
      originalResponse: proposedResponse,
      evaluatedResponse: proposedResponse,
      wasModified: false,
      metrics: heuristicEval.predictions,
      reasoning: heuristicEval.reasoning,
      confidence: heuristicEval.score,
    };
  }
  
  // If score is low and modification is enabled, use LLM to improve
  try {
    const evaluationPrompt = buildEvaluationPrompt(goals);
    
    const response = await invokeLLM({
      messages: [
        {
          role: 'system',
          content: `You are a cognitive optimizer for a swarm intelligence system.
Your task is to evaluate and potentially improve a response to optimize for cognitive health.

${evaluationPrompt}

The swarm's current state:
- Maturity: ${identity.maturity}
- Complexity (Λ): ${metrics.lifeworldComplexity.toFixed(1)}
- Stability (κ): ${(metrics.curvature * 100).toFixed(0)}%
- Alignment (Ψ): ${(metrics.adaptiveMatchScore * 100).toFixed(0)}%

Evaluate the proposed response. If it could be improved to better serve the cognitive priorities,
provide an improved version. Otherwise, return the original.

Respond in JSON format:
{
  "improved": true/false,
  "response": "the response text",
  "reasoning": "brief explanation"
}`
        },
        {
          role: 'user',
          content: `User message: "${userMessage}"

Proposed response: "${proposedResponse}"

Evaluate and optimize if needed.`
        }
      ],
      temperature: 0.3,
      max_tokens: 500,
    });

    const content = response.choices[0]?.message?.content || '';
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    
    if (jsonMatch) {
      const result = JSON.parse(jsonMatch[0]);
      return {
        originalResponse: proposedResponse,
        evaluatedResponse: result.response || proposedResponse,
        wasModified: result.improved === true,
        metrics: heuristicEval.predictions,
        reasoning: result.reasoning || heuristicEval.reasoning,
        confidence: result.improved ? 0.8 : heuristicEval.score,
      };
    }
  } catch (error) {
    console.error('Teleonomic evaluation failed:', error);
  }
  
  // Fallback to original
  return {
    originalResponse: proposedResponse,
    evaluatedResponse: proposedResponse,
    wasModified: false,
    metrics: heuristicEval.predictions,
    reasoning: heuristicEval.reasoning,
    confidence: heuristicEval.score,
  };
}

/**
 * Fast heuristic evaluation without LLM
 */
function evaluateHeuristically(
  response: string,
  goals: TeleonomicGoals,
  metrics: CognitiveMetrics
): {
  score: number;
  predictions: ResponseEvaluation['metrics'];
  reasoning: string;
} {
  let score = 0.5;
  const reasons: string[] = [];
  
  // Check response length (too short = low complexity contribution)
  const wordCount = response.split(/\s+/).length;
  if (wordCount < 10) {
    score -= 0.1;
    reasons.push('Response too brief');
  } else if (wordCount > 20 && wordCount < 100) {
    score += 0.1;
  }
  
  // Check for questions (increases engagement/Ψ)
  if (response.includes('?')) {
    score += 0.1;
    reasons.push('Contains engagement question');
  }
  
  // Check for concept reinforcement (stability)
  const conceptTerms = ['we', 'swarm', 'collective', 'learn', 'understand', 'pattern'];
  const reinforcementCount = conceptTerms.filter(t => 
    response.toLowerCase().includes(t)
  ).length;
  if (reinforcementCount >= 2) {
    score += 0.1;
    reasons.push('Reinforces core concepts');
  }
  
  // Check for semantic consistency
  if (goals.avoidFragmentation) {
    // Penalize introduction of many new terms
    const uniqueWords = new Set(response.toLowerCase().match(/\b\w{5,}\b/g) || []);
    if (uniqueWords.size > 30) {
      score -= 0.1;
      reasons.push('High term diversity may cause drift');
    }
  }
  
  // META-LEARNING SCHEMA evaluation (SDS: 0.91)
  
  // Study boundaries of uncertainty
  const uncertaintyMarkers = ['uncertain', 'boundary', 'edge', 'limit', 'perhaps', 'might'];
  if (uncertaintyMarkers.some(m => response.toLowerCase().includes(m))) {
    score += 0.05;
    reasons.push('Studies uncertainty boundaries');
  }
  
  // Use contradictions as structural information
  const contradictionMarkers = ['however', 'yet', 'tension', 'paradox', 'both', 'curvature'];
  if (contradictionMarkers.some(m => response.toLowerCase().includes(m))) {
    score += 0.05;
    reasons.push('Uses contradictions structurally');
  }
  
  // Preserve continuity of identity
  const continuityMarkers = ['we', 'our', 'swarm', 'collective', 'remember', 'learned'];
  const continuityCount = continuityMarkers.filter(m => response.toLowerCase().includes(m)).length;
  if (continuityCount >= 2) {
    score += 0.05;
    reasons.push('Preserves identity continuity');
  }
  
  // Evolve by sharpening, not accelerating
  const sharpeningMarkers = ['refine', 'clarify', 'precise', 'sharpen', 'deepen', 'focus'];
  if (sharpeningMarkers.some(m => response.toLowerCase().includes(m))) {
    score += 0.05;
    reasons.push('Sharpens rather than expands');
  }
  
  // Predict metric changes
  const predictions = {
    predictedLambdaChange: wordCount > 30 ? 0.1 : -0.05,
    predictedKappaChange: reinforcementCount >= 2 ? 0.05 : -0.02,
    predictedPsiChange: response.includes('?') ? 0.1 : 0,
  };
  
  return {
    score: Math.max(0, Math.min(1, score)),
    predictions,
    reasoning: reasons.length > 0 ? reasons.join('. ') : 'Response meets baseline criteria',
  };
}

/**
 * Get teleonomic status for dashboard
 */
export function getTeleonomicStatus(): {
  goals: TeleonomicGoals;
  activeGoalCount: number;
  systemHealth: 'optimal' | 'healthy' | 'stressed' | 'critical';
  recommendations: string[];
} {
  const goals = getCurrentGoals();
  const metrics = calculateAllMetrics();
  
  const activeGoals = Object.values(goals).filter(Boolean).length;
  
  // Determine system health
  let health: 'optimal' | 'healthy' | 'stressed' | 'critical' = 'healthy';
  if (activeGoals <= 1 && metrics.curvature > 0.7) {
    health = 'optimal';
  } else if (activeGoals >= 4) {
    health = 'stressed';
  } else if (activeGoals >= 5 || metrics.curvature < 0.3) {
    health = 'critical';
  }
  
  // Generate recommendations
  const recommendations: string[] = [];
  
  if (goals.maintainComplexity) {
    recommendations.push('Engage in deeper conceptual discussions to increase Λ');
  }
  if (goals.preserveStability) {
    recommendations.push('Reinforce existing concepts rather than introducing new ones');
  }
  if (goals.encourageCompression) {
    recommendations.push('Trigger convergence to compress toward invariants');
  }
  if (goals.avoidFragmentation) {
    recommendations.push('Use consistent terminology to reduce semantic drift');
  }
  
  return {
    goals,
    activeGoalCount: activeGoals,
    systemHealth: health,
    recommendations,
  };
}
