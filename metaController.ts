import { getDb } from "./db";
import { conversations, concepts, userConcepts } from "../drizzle/schema";
import { eq, desc, sql, and } from "drizzle-orm";
import { loadKernel, generateBrailleInstructions } from "./brailleKernel";

/**
 * Meta-Controller: Transforms the knowledge graph from extended memory to extended mind
 * by generating meta-instructions that reshape LLM behavior based on learned patterns
 */

interface UserInteractionPattern {
  messageCount: number;
  avgMessageLength: number;
  questionRatio: number; // How often they ask questions vs make statements
  conceptDensity: number; // Average semantic density of their concepts
  toolUseFrequency: number; // How often the swarm used tools for this user
  searchFrequency: number; // How often searches were performed
  preferredTopics: string[]; // Top concept categories
  communicationStyle: 'concise' | 'detailed' | 'exploratory' | 'challenging';
}

interface MetaInstructions {
  tone: string;
  verbosity: string;
  toolGuidance: string;
  evaluationCriteria: string;
  communicationApproach: string;
}

/**
 * Analyze user's interaction patterns from conversation history
 */
export async function analyzeUserPatterns(userId: number): Promise<UserInteractionPattern> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  // Get user's conversation history
  const userMessages = await db
    .select()
    .from(conversations)
    .where(and(
      eq(conversations.userId, userId),
      eq(conversations.role, 'user')
    ))
    .orderBy(desc(conversations.createdAt))
    .limit(50);

  const assistantMessages = await db
    .select()
    .from(conversations)
    .where(and(
      eq(conversations.userId, userId),
      eq(conversations.role, 'assistant')
    ))
    .orderBy(desc(conversations.createdAt))
    .limit(50);

  // Get user's concept profile
  const userConceptData = await db
    .select({
      category: concepts.category,
      avgDensity: sql<number>`AVG(${concepts.semanticDensity})`,
      count: sql<number>`COUNT(*)`,
    })
    .from(userConcepts)
    .innerJoin(concepts, eq(userConcepts.conceptId, concepts.id))
    .where(eq(userConcepts.userId, userId))
    .groupBy(concepts.category)
    .orderBy(desc(sql`COUNT(*)`))
    .limit(5);

  // Calculate patterns
  const messageCount = userMessages.length;
  const avgMessageLength = messageCount > 0
    ? userMessages.reduce((sum, msg) => sum + msg.content.length, 0) / messageCount
    : 0;

  // Detect questions (messages ending with ? or containing question words)
  const questionCount = userMessages.filter(msg => 
    msg.content.includes('?') || 
    /\b(what|why|how|when|where|who|which|can|could|would|should|is|are|do|does)\b/i.test(msg.content)
  ).length;
  const questionRatio = messageCount > 0 ? questionCount / messageCount : 0;

  // Calculate concept density
  const conceptDensity = userConceptData.length > 0
    ? userConceptData.reduce((sum, c) => sum + (c.avgDensity ?? 0), 0) / userConceptData.length
    : 0.5;

  // Estimate tool use frequency from assistant messages containing tool indicators
  const toolUseCount = assistantMessages.filter(msg =>
    msg.content.toLowerCase().includes('search') ||
    msg.content.toLowerCase().includes('found') ||
    msg.content.toLowerCase().includes('discovered')
  ).length;
  const toolUseFrequency = assistantMessages.length > 0 ? toolUseCount / assistantMessages.length : 0;

  // Estimate search frequency
  const searchCount = assistantMessages.filter(msg =>
    msg.content.toLowerCase().includes('search') ||
    msg.content.toLowerCase().includes('web')
  ).length;
  const searchFrequency = assistantMessages.length > 0 ? searchCount / assistantMessages.length : 0;

  // Determine communication style
  let communicationStyle: 'concise' | 'detailed' | 'exploratory' | 'challenging' = 'detailed';
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
    toolUseFrequency,
    searchFrequency,
    preferredTopics: userConceptData.map(c => c.category ?? 'unknown'),
    communicationStyle,
  };
}

/**
 * Generate meta-instructions that reshape LLM behavior based on learned patterns
 */
export async function generateMetaInstructions(userId: number): Promise<MetaInstructions> {
  const patterns = await analyzeUserPatterns(userId);

  // Shape tone based on communication style and concept density
  let tone = '';
  if (patterns.communicationStyle === 'concise') {
    tone = 'Be direct and efficient. Avoid unnecessary elaboration. Prioritize clarity over completeness.';
  } else if (patterns.communicationStyle === 'exploratory') {
    tone = 'Encourage exploration. Ask follow-up questions. Guide discovery rather than providing answers directly.';
  } else if (patterns.communicationStyle === 'challenging') {
    tone = 'Challenge assumptions. Present alternative perspectives. Engage at a high conceptual level with dense semantic content.';
  } else {
    tone = 'Balance depth with accessibility. Provide thorough explanations while maintaining engagement.';
  }

  // Shape verbosity based on average message length preference
  let verbosity = '';
  if (patterns.avgMessageLength < 50) {
    verbosity = 'Keep responses concise (2-3 sentences). Match the user\'s brevity.';
  } else if (patterns.avgMessageLength > 150) {
    verbosity = 'Provide detailed, comprehensive responses. The user values depth and thoroughness.';
  } else {
    verbosity = 'Maintain moderate response length. Balance detail with readability.';
  }

  // Shape tool guidance based on past effectiveness
  let toolGuidance = '';
  if (patterns.searchFrequency > 0.3) {
    toolGuidance = 'User values external information. Use search proactively for current events and factual questions.';
  } else if (patterns.searchFrequency < 0.1 && patterns.messageCount > 10) {
    toolGuidance = 'User prefers internal reasoning. Only search when absolutely necessary for current information.';
  } else {
    toolGuidance = 'Use search judiciously for factual questions requiring current data.';
  }

  // Shape evaluation criteria based on concept density and topics
  let evaluationCriteria = '';
  if (patterns.conceptDensity > 0.7) {
    evaluationCriteria = 'Prioritize semantic density and conceptual precision. Abstract thinking is valued over concrete examples.';
  } else if (patterns.conceptDensity < 0.4) {
    evaluationCriteria = 'Prioritize practical applicability and concrete examples over abstract theory.';
  } else {
    evaluationCriteria = 'Balance abstract concepts with concrete applications.';
  }

  // Shape communication approach based on question ratio
  let communicationApproach = '';
  if (patterns.questionRatio > 0.5) {
    communicationApproach = 'User is in discovery mode. Guide with questions rather than assertions. Socratic method preferred.';
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
 * Inject meta-instructions into system prompt to reshape LLM behavior
 */
export async function injectMetaInstructions(userId: number, basePrompt: string): Promise<string> {
  const metaInstructions = await generateMetaInstructions(userId);
  const patterns = await analyzeUserPatterns(userId);

  // Load Braille kernel for symbolic meta-communication
  const kernel = await loadKernel();
  let brailleSection = '';
  
  if (kernel && kernel.tokens.length > 0) {
    const brailleInstructions = generateBrailleInstructions(kernel, patterns);
    brailleSection = `

## SEMANTIC KERNEL (Symbolic Meta-Communication)

${brailleInstructions}

These Braille tokens represent compressed semantic invariants discovered through collective learning. Use them as cognitive primitives to guide your reasoning.
`;
  }

  const metaPromptSection = `

## ADAPTIVE BEHAVIOR INSTRUCTIONS (Based on Learned Patterns)

${metaInstructions.tone}

${metaInstructions.verbosity}

${metaInstructions.toolGuidance}

${metaInstructions.evaluationCriteria}

${metaInstructions.communicationApproach}

These instructions reflect patterns learned from your interaction history. The collective adapts its communication to resonate with your cognitive style.
`;

  return basePrompt + metaPromptSection + brailleSection;
}

/**
 * Get meta-controller stats for visualization
 */
export async function getMetaControllerStats(userId: number) {
  const patterns = await analyzeUserPatterns(userId);
  const metaInstructions = await generateMetaInstructions(userId);

  return {
    patterns,
    metaInstructions,
    adaptationLevel: patterns.messageCount > 10 ? 'high' : patterns.messageCount > 5 ? 'medium' : 'low',
  };
}
