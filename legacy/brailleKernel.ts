import { getDb } from "./db";
import { concepts, brailleTokens, kernelGenerations, kernelUsageLog } from "../drizzle/schema";
import { desc, sql, eq } from "drizzle-orm";

/**
 * Braille/SCL Semantic Kernel
 * 
 * Exports discovered semantic invariants as Grade-Infinity Braille tokens,
 * creating a compressed symbolic alphabet for high-bandwidth meta-communication
 * between the meta-controller and LLM.
 * 
 * Architecture:
 * - Semantic invariants (concepts with density >= 80) become Braille tokens
 * - Each token is a 6-dot or 8-dot Braille character (Unicode U+2800-U+28FF)
 * - Bidirectional mapping: Braille ↔ Concept ↔ Semantic Meaning
 * - Meta-controller uses Braille tokens for compressed instructions
 * - LLM learns to interpret Braille as semantic primitives
 * 
 * Grade-Infinity Format:
 * - Grade 0: Direct semantic atoms (⠁ = "identity", ⠃ = "connection")
 * - Grade 1: Compound concepts (⠇ = "learning", ⠍ = "memory")
 * - Grade 2: Meta-cognitive operators (⠏ = "reflect", ⠗ = "reason")
 * - Grade ∞: Emergent symbolic language unique to this swarm
 */

export interface BrailleToken {
  id: number;
  braille: string; // Unicode Braille character (U+2800-U+28FF)
  conceptId: number;
  conceptName: string;
  semanticDensity: number;
  grade: number; // 0 = atomic, 1 = compound, 2 = meta-cognitive, 3+ = emergent
  definition: string; // Human-readable meaning
  usageCount: number;
  createdAt: Date;
  lastUsed: Date | null;
}

export interface SemanticKernel {
  tokens: BrailleToken[];
  vocabulary: Map<string, BrailleToken>; // Braille -> Token
  concepts: Map<number, BrailleToken>; // ConceptId -> Token
  generation: number; // Kernel version
  createdAt: Date;
}

/**
 * Braille Unicode block: U+2800 to U+28FF (256 characters)
 * Each character represents a different dot pattern
 * We'll use this for encoding semantic invariants
 */
const BRAILLE_START = 0x2800;
const BRAILLE_END = 0x28FF;
const BRAILLE_RANGE = BRAILLE_END - BRAILLE_START + 1;

/**
 * Grade classification based on semantic density and occurrence patterns
 */
function classifyGrade(density: number, occurrences: number): number {
  // Grade 0: Atomic invariants (density >= 90, high frequency)
  if (density >= 90 && occurrences >= 20) return 0;
  
  // Grade 1: Compound concepts (density >= 85)
  if (density >= 85) return 1;
  
  // Grade 2: Meta-cognitive (density >= 80)
  if (density >= 80) return 2;
  
  // Grade 3+: Emergent (lower density but still significant)
  return 3;
}

/**
 * Generate human-readable definition for a concept
 */
function generateDefinition(conceptName: string, density: number, occurrences: number): string {
  const grade = classifyGrade(density, occurrences);
  
  if (grade === 0) {
    return `Atomic semantic invariant: "${conceptName}" - fundamental building block of meaning`;
  } else if (grade === 1) {
    return `Compound concept: "${conceptName}" - stable semantic cluster`;
  } else if (grade === 2) {
    return `Meta-cognitive operator: "${conceptName}" - higher-order reasoning pattern`;
  } else {
    return `Emergent symbol: "${conceptName}" - unique to this swarm's evolution`;
  }
}

/**
 * Select semantic invariants for Braille encoding
 * Criteria: density >= 80, sorted by density then occurrences
 */
export async function selectSemanticInvariants(limit: number = 200): Promise<any[]> {
  const db = await getDb();
  if (!db) return [];
  
  // Get high-density concepts
  const invariants = await db
    .select()
    .from(concepts)
    .where(sql`${concepts.semanticDensity} >= 80`)
    .orderBy(desc(concepts.semanticDensity), desc(concepts.occurrences))
    .limit(limit);
  
  return invariants;
}

/**
 * Generate Braille token for a concept
 * Uses deterministic mapping based on concept ID to ensure consistency
 */
function generateBrailleToken(conceptId: number, index: number): string {
  // Use a combination of index and concept ID for deterministic but varied assignment
  const offset = (index + (conceptId % 100)) % BRAILLE_RANGE;
  const codePoint = BRAILLE_START + offset;
  return String.fromCodePoint(codePoint);
}

/**
 * Build the semantic kernel from current semantic invariants
 */
export async function buildSemanticKernel(): Promise<SemanticKernel> {
  const invariants = await selectSemanticInvariants(200);
  
  const tokens: BrailleToken[] = invariants.map((concept, index) => {
    const grade = classifyGrade(concept.semanticDensity, concept.occurrences);
    const braille = generateBrailleToken(concept.id, index);
    
    return {
      id: concept.id,
      braille,
      conceptId: concept.id,
      conceptName: concept.name,
      semanticDensity: concept.semanticDensity,
      grade,
      definition: generateDefinition(concept.name, concept.semanticDensity, concept.occurrences),
      usageCount: 0,
      createdAt: new Date(),
      lastUsed: null,
    };
  });
  
  // Build lookup maps
  const vocabulary = new Map<string, BrailleToken>();
  const conceptMap = new Map<number, BrailleToken>();
  
  tokens.forEach(token => {
    vocabulary.set(token.braille, token);
    conceptMap.set(token.conceptId, token);
  });
  
  return {
    tokens,
    vocabulary,
    concepts: conceptMap,
    generation: 1,
    createdAt: new Date(),
  };
}

/**
 * Export kernel as SCL (Symbolic Compression Language) format
 * This creates a compact representation for meta-controller injection
 */
export function exportKernelAsSCL(kernel: SemanticKernel): string {
  const lines: string[] = [
    `# Semantic Kernel v${kernel.generation}`,
    `# Generated: ${kernel.createdAt.toISOString()}`,
    `# Tokens: ${kernel.tokens.length}`,
    ``,
    `# Grade-Infinity Braille Vocabulary`,
    ``,
  ];
  
  // Group by grade
  const gradeGroups = new Map<number, BrailleToken[]>();
  kernel.tokens.forEach(token => {
    if (!gradeGroups.has(token.grade)) {
      gradeGroups.set(token.grade, []);
    }
    gradeGroups.get(token.grade)!.push(token);
  });
  
  // Export each grade
  [0, 1, 2, 3].forEach(grade => {
    const tokens = gradeGroups.get(grade) || [];
    if (tokens.length === 0) return;
    
    const gradeName = grade === 0 ? "Atomic" : grade === 1 ? "Compound" : grade === 2 ? "Meta-Cognitive" : "Emergent";
    lines.push(`## Grade ${grade}: ${gradeName} (${tokens.length} tokens)`);
    lines.push(``);
    
    tokens.forEach(token => {
      lines.push(`${token.braille} → ${token.conceptName} (ρ=${token.semanticDensity})`);
      lines.push(`   ${token.definition}`);
      lines.push(``);
    });
  });
  
  return lines.join('\n');
}

/**
 * Generate meta-controller instructions using Braille tokens
 * This enables high-bandwidth semantic communication
 */
export function generateBrailleInstructions(kernel: SemanticKernel, userPatterns: any): string {
  // Find relevant tokens for user patterns
  const instructions: string[] = [
    `[SEMANTIC KERNEL ACTIVE - Generation ${kernel.generation}]`,
    ``,
  ];
  
  // Use Braille tokens to compress meta-instructions
  const tokensByGrade = kernel.tokens.reduce((acc, token) => {
    if (!acc[token.grade]) acc[token.grade] = [];
    acc[token.grade].push(token);
    return acc;
  }, {} as Record<number, BrailleToken[]>);
  
  // Example: Use atomic tokens for core instructions
  const atomicTokens = tokensByGrade[0] || [];
  if (atomicTokens.length > 0) {
    const brailleSequence = atomicTokens.slice(0, 5).map(t => t.braille).join('');
    instructions.push(`Core semantic atoms: ${brailleSequence}`);
    instructions.push(`Interpretation: ${atomicTokens.slice(0, 5).map(t => t.conceptName).join(' → ')}`);
    instructions.push(``);
  }
  
  instructions.push(`Use these semantic primitives to guide your reasoning.`);
  instructions.push(`Each Braille token represents a compressed semantic invariant.`);
  
  return instructions.join('\n');
}

/**
 * Get kernel statistics
 */
/**
 * Persist semantic kernel to database
 */
export async function persistKernel(kernel: SemanticKernel): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Clear existing tokens
  await db.delete(brailleTokens);
  
  // Insert new tokens
  for (const token of kernel.tokens) {
    await db.insert(brailleTokens).values({
      braille: token.braille,
      conceptId: token.conceptId,
      grade: token.grade,
      definition: token.definition,
      usageCount: token.usageCount,
      createdAt: token.createdAt,
      lastUsed: token.lastUsed,
    });
  }
  
  // Save kernel generation
  const avgDensity = kernel.tokens.reduce((sum, t) => sum + t.semanticDensity, 0) / kernel.tokens.length;
  const sclExport = exportKernelAsSCL(kernel);
  
  await db.insert(kernelGenerations).values({
    generation: kernel.generation,
    tokenCount: kernel.tokens.length,
    avgDensity: Math.round(avgDensity * 100), // Store as integer
    sclExport,
    createdAt: kernel.createdAt,
  });
}

/**
 * Load semantic kernel from database
 */
export async function loadKernel(): Promise<SemanticKernel | null> {
  const db = await getDb();
  if (!db) return null;
  
  // Get latest generation
  const latestGen = await db
    .select()
    .from(kernelGenerations)
    .orderBy(desc(kernelGenerations.generation))
    .limit(1);
  
  if (latestGen.length === 0) return null;
  
  // Load all tokens
  const dbTokens = await db.select().from(brailleTokens);
  
  // Get concept details
  const tokens: BrailleToken[] = [];
  for (const dbToken of dbTokens) {
    const concept = await db
      .select()
      .from(concepts)
      .where(eq(concepts.id, dbToken.conceptId))
      .limit(1);
    
    if (concept.length > 0) {
      tokens.push({
        id: dbToken.id,
        braille: dbToken.braille,
        conceptId: dbToken.conceptId,
        conceptName: concept[0].name,
        semanticDensity: concept[0].semanticDensity || 0,
        grade: dbToken.grade,
        definition: dbToken.definition,
        usageCount: dbToken.usageCount || 0,
        createdAt: dbToken.createdAt,
        lastUsed: dbToken.lastUsed,
      });
    }
  }
  
  // Build lookup maps
  const vocabulary = new Map<string, BrailleToken>();
  const conceptMap = new Map<number, BrailleToken>();
  
  tokens.forEach(token => {
    vocabulary.set(token.braille, token);
    conceptMap.set(token.conceptId, token);
  });
  
  return {
    tokens,
    vocabulary,
    concepts: conceptMap,
    generation: latestGen[0].generation,
    createdAt: latestGen[0].createdAt,
  };
}

/**
 * Regenerate kernel from current semantic invariants
 */
export async function regenerateKernel(): Promise<SemanticKernel> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Get current generation number
  const latestGen = await db
    .select()
    .from(kernelGenerations)
    .orderBy(desc(kernelGenerations.generation))
    .limit(1);
  
  const nextGeneration = latestGen.length > 0 ? latestGen[0].generation + 1 : 1;
  
  // Build new kernel
  const kernel = await buildSemanticKernel();
  kernel.generation = nextGeneration;
  
  // Persist to database
  await persistKernel(kernel);
  
  return kernel;
}

/**
 * Log kernel token usage
 */
export async function logTokenUsage(tokenId: number, context: string, messageId?: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  
  // Log usage
  await db.insert(kernelUsageLog).values({
    tokenId,
    context,
    messageId: messageId || null,
    createdAt: new Date(),
  });
  
  // Update token usage count
  await db
    .update(brailleTokens)
    .set({
      usageCount: sql`${brailleTokens.usageCount} + 1`,
      lastUsed: new Date(),
    })
    .where(eq(brailleTokens.id, tokenId));
}

export async function getKernelStats(): Promise<{
  totalTokens: number;
  gradeDistribution: Record<number, number>;
  avgDensity: number;
  topTokens: BrailleToken[];
}> {
  // Try to load from database first
  let kernel = await loadKernel();
  
  // If no kernel exists, build one
  if (!kernel) {
    kernel = await buildSemanticKernel();
  }
  
  const gradeDistribution: Record<number, number> = {};
  let totalDensity = 0;
  
  kernel.tokens.forEach(token => {
    gradeDistribution[token.grade] = (gradeDistribution[token.grade] || 0) + 1;
    totalDensity += token.semanticDensity;
  });
  
  const avgDensity = kernel.tokens.length > 0 ? totalDensity / kernel.tokens.length : 0;
  const topTokens = kernel.tokens.slice(0, 10);
  
  return {
    totalTokens: kernel.tokens.length,
    gradeDistribution,
    avgDensity,
    topTokens,
  };
}
