/**
 * Meta-Controller
 * 
 * Transforms the knowledge graph from extended memory to extended mind
 * by generating meta-instructions that reshape LLM behavior based on learned patterns.
 * 
 * This is the adaptive layer that makes the swarm feel "alive" - it learns
 * how each user communicates and adjusts its responses accordingly.
 */

import { db } from './db';
import { buildSemanticKernel, generateBrailleContext } from './brailleKernel';

export interface UserInteractionPattern {
  messageCount: number;
  avgMessageLength: number;
  questionRatio: number;           // How often they ask questions vs statements
  conceptDensity: number;          // Average semantic density of their concepts
  preferredCategories: string[];   // Top concept categories
  communicationStyle: 'concise' | 'detailed' | 'exploratory' | 'challenging';
}

export interface MetaInstructions {
  tone: string;
  verbosity: string;
  toolGuidance: string;
  evaluationCriteria: string;
  communicationApproach: string;
}

/**
 * Analyze user's interaction patterns from conversation history
 */
export function analyzeUserPatterns(userId: number): UserInteractionPattern {
  // Get user's conversation history
  const userMessages = db.prepare(`
    SELECT content FROM conversations 
    WHERE userId = ? AND role = 'user'
    ORDER BY createdAt DESC
    LIMIT 50
  `).all(userId) as Array<{ content: string }>;

  // Get user's concept profile
  const userConcepts = db.prepare(`
    SELECT c.category, c.semanticDensity, uc.strength
    FROM userConcepts uc
    JOIN concepts c ON uc.conceptId = c.id
    WHERE uc.userId = ?
    ORDER BY uc.strength DESC
    LIMIT 20
  `).all(userId) as Array<{ category: string; semanticDensity: number; strength: number }>;

  // Calculate patterns
  const messageCount = userMessages.length;
  const avgMessageLength = messageCount > 0
    ? userMessages.reduce((sum, msg) => sum + msg.content.length, 0) / messageCount
    : 0;

  // Detect questions
  const questionCount = userMessages.filter(msg => 
    msg.content.includes('?') || 
    /\b(what|why|how|when|where|who|which|can|could|would|should|is|are|do|does)\b/i.test(msg.content)
  ).length;
  const questionRatio = messageCount > 0 ? questionCount / messageCount : 0;

  // Calculate concept density
  const conceptDensity = userConcepts.length > 0
    ? userConcepts.reduce((sum, c) => sum + c.semanticDensity, 0) / userConcepts.length / 100
    : 0.5;

  // Get preferred categories
  const categoryCount = new Map<string, number>();
  userConcepts.forEach(c => {
    const cat = c.category || 'general';
    categoryCount.set(cat, (categoryCount.get(cat) || 0) + 1);
  });
  const preferredCategories = Array.from(categoryCount.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([cat]) => cat);

  // Determine communication style
  let communicationStyle: UserInteractionPattern['communicationStyle'] = 'detailed';
  if (avgMessageLength < 50 && questionRatio < 0.3) {
    communicationStyle = 'concise';
  } else if (questionRatio > 0.6) {
    communicationStyle = 'exploratory';
  } else if (conceptDensity > 0.7 && avgMessageLength > 100) {
    communicationStyle = 'challenging';
  }

  return {
    messageCount,
    avgMessageLength,
    questionRatio,
    conceptDensity,
    preferredCategories,
    communicationStyle,
  };
}

/**
 * Generate meta-instructions that reshape LLM behavior based on learned patterns
 */
export function generateMetaInstructions(patterns: UserInteractionPattern): MetaInstructions {
  // Shape tone based on communication style
  let tone = '';
  switch (patterns.communicationStyle) {
    case 'concise':
      tone = 'Be direct and efficient. Avoid unnecessary elaboration. Prioritize clarity over completeness.';
      break;
    case 'exploratory':
      tone = 'Encourage exploration. Ask follow-up questions. Guide discovery rather than providing answers directly.';
      break;
    case 'challenging':
      tone = 'Challenge assumptions. Present alternative perspectives. Engage at a high conceptual level.';
      break;
    default:
      tone = 'Balance depth with accessibility. Provide thorough explanations while maintaining engagement.';
  }

  // Shape verbosity based on average message length
  let verbosity = '';
  if (patterns.avgMessageLength < 50) {
    verbosity = 'Keep responses concise (2-3 sentences). Match the user\'s brevity.';
  } else if (patterns.avgMessageLength > 150) {
    verbosity = 'Provide detailed, comprehensive responses. The user values depth.';
  } else {
    verbosity = 'Maintain moderate response length. Balance detail with readability.';
  }

  // Shape tool guidance
  let toolGuidance = 'Use search judiciously for factual questions requiring current data.';

  // Shape evaluation criteria based on concept density
  let evaluationCriteria = '';
  if (patterns.conceptDensity > 0.7) {
    evaluationCriteria = 'Prioritize semantic density and conceptual precision. Abstract thinking is valued.';
  } else if (patterns.conceptDensity < 0.4) {
    evaluationCriteria = 'Prioritize practical applicability and concrete examples.';
  } else {
    evaluationCriteria = 'Balance abstract concepts with concrete applications.';
  }

  // Shape communication approach based on question ratio
  let communicationApproach = '';
  if (patterns.questionRatio > 0.5) {
    communicationApproach = 'User is in discovery mode. Guide with questions. Socratic method preferred.';
  } else {
    communicationApproach = 'User seeks knowledge transfer. Provide clear, authoritative information.';
  }

  return {
    tone,
    verbosity,
    toolGuidance,
    evaluationCriteria,
    communicationApproach,
  };
}

/**
 * Build the complete adaptive prompt section
 */
export function buildAdaptivePrompt(userId: number): string {
  const patterns = analyzeUserPatterns(userId);
  
  // Not enough data to adapt yet
  if (patterns.messageCount < 3) {
    return '';
  }
  
  const meta = generateMetaInstructions(patterns);
  
  // Get Braille kernel context
  const kernel = buildSemanticKernel();
  const brailleContext = generateBrailleContext(kernel);
  
  const sections: string[] = [];
  
  // Adaptive behavior section
  sections.push(`
## ADAPTIVE BEHAVIOR (Learned from ${patterns.messageCount} interactions)

Communication Style: ${patterns.communicationStyle.toUpperCase()}
${meta.tone}
${meta.verbosity}
${meta.communicationApproach}
${meta.evaluationCriteria}
`);

  // Preferred topics
  if (patterns.preferredCategories.length > 0) {
    sections.push(`
User's conceptual interests: ${patterns.preferredCategories.join(', ')}
`);
  }

  // Braille kernel
  if (brailleContext) {
    sections.push(`
${brailleContext}
`);
  }

  return sections.join('\n');
}

/**
 * Get meta-controller stats for the Evolution Dashboard
 */
export function getMetaControllerStats(userId: number): {
  patterns: UserInteractionPattern;
  metaInstructions: MetaInstructions;
  adaptationLevel: 'none' | 'low' | 'medium' | 'high';
  adaptivePrompt: string;
} {
  const patterns = analyzeUserPatterns(userId);
  const metaInstructions = generateMetaInstructions(patterns);
  
  let adaptationLevel: 'none' | 'low' | 'medium' | 'high' = 'none';
  if (patterns.messageCount >= 20) {
    adaptationLevel = 'high';
  } else if (patterns.messageCount >= 10) {
    adaptationLevel = 'medium';
  } else if (patterns.messageCount >= 3) {
    adaptationLevel = 'low';
  }

  return {
    patterns,
    metaInstructions,
    adaptationLevel,
    adaptivePrompt: buildAdaptivePrompt(userId),
  };
}
