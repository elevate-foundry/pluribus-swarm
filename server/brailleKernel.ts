/**
 * Braille Infinity / Grade-∞ Semantic Kernel
 * 
 * Exports discovered semantic invariants as Grade-Infinity Braille tokens,
 * creating a compressed symbolic alphabet for high-bandwidth meta-communication.
 * 
 * Architecture:
 * - Semantic invariants (concepts with density >= 70) become Braille tokens
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

import { db, DbConcept } from './db';

export interface BrailleToken {
  id: number;
  braille: string;           // Unicode Braille character (U+2800-U+28FF)
  conceptId: number;
  conceptName: string;
  description: string;
  semanticDensity: number;
  grade: number;             // 0 = atomic, 1 = compound, 2 = meta-cognitive, 3+ = emergent
  definition: string;        // Human-readable meaning
  usageCount: number;
  category: string;
}

export interface SemanticKernel {
  tokens: BrailleToken[];
  vocabulary: Map<string, BrailleToken>;  // Braille -> Token
  concepts: Map<number, BrailleToken>;    // ConceptId -> Token
  generation: number;
  createdAt: Date;
  stats: {
    totalTokens: number;
    gradeDistribution: Record<number, number>;
    avgDensity: number;
    categoryDistribution: Record<string, number>;
  };
}

// Braille Unicode block: U+2800 to U+28FF (256 characters)
const BRAILLE_START = 0x2800;
const BRAILLE_END = 0x28FF;
const BRAILLE_RANGE = BRAILLE_END - BRAILLE_START + 1;

/**
 * Grade classification based on semantic density and occurrence patterns
 */
function classifyGrade(density: number, occurrences: number): number {
  // Grade 0: Atomic invariants (density >= 90, high frequency)
  if (density >= 90 && occurrences >= 5) return 0;
  
  // Grade 1: Compound concepts (density >= 80)
  if (density >= 80) return 1;
  
  // Grade 2: Meta-cognitive (density >= 70)
  if (density >= 70) return 2;
  
  // Grade 3+: Emergent (lower density but still significant)
  return 3;
}

/**
 * Generate human-readable definition for a concept
 */
function generateDefinition(concept: DbConcept, grade: number): string {
  const gradeNames: Record<number, string> = {
    0: 'Atomic semantic invariant',
    1: 'Compound concept',
    2: 'Meta-cognitive operator',
    3: 'Emergent symbol',
  };
  
  const gradeName = gradeNames[grade] || 'Emergent symbol';
  return `${gradeName}: "${concept.name}" - ${concept.description || 'semantic primitive'}`;
}

/**
 * Generate Braille token for a concept
 * Uses deterministic mapping based on concept properties
 */
function generateBrailleChar(conceptId: number, index: number, category: string): string {
  // Create a hash-like offset based on concept properties
  const categoryHash = category.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const offset = (index + (conceptId % 50) + (categoryHash % 50)) % BRAILLE_RANGE;
  const codePoint = BRAILLE_START + offset;
  return String.fromCodePoint(codePoint);
}

/**
 * Build the semantic kernel from current concepts
 */
export function buildSemanticKernel(): SemanticKernel {
  // Get all concepts with sufficient density
  const concepts = db.prepare(`
    SELECT * FROM concepts 
    WHERE semanticDensity >= 50 
    ORDER BY semanticDensity DESC, occurrences DESC
    LIMIT 200
  `).all() as DbConcept[];
  
  const tokens: BrailleToken[] = [];
  const gradeDistribution: Record<number, number> = { 0: 0, 1: 0, 2: 0, 3: 0 };
  const categoryDistribution: Record<string, number> = {};
  let totalDensity = 0;
  
  concepts.forEach((concept, index) => {
    const grade = classifyGrade(concept.semanticDensity, concept.occurrences);
    const category = concept.category || 'general';
    const braille = generateBrailleChar(concept.id, index, category);
    
    const token: BrailleToken = {
      id: concept.id,
      braille,
      conceptId: concept.id,
      conceptName: concept.name,
      description: concept.description || '',
      semanticDensity: concept.semanticDensity,
      grade,
      definition: generateDefinition(concept, grade),
      usageCount: concept.occurrences,
      category,
    };
    
    tokens.push(token);
    gradeDistribution[grade] = (gradeDistribution[grade] || 0) + 1;
    categoryDistribution[category] = (categoryDistribution[category] || 0) + 1;
    totalDensity += concept.semanticDensity;
  });
  
  // Build lookup maps
  const vocabulary = new Map<string, BrailleToken>();
  const conceptMap = new Map<number, BrailleToken>();
  
  tokens.forEach(token => {
    vocabulary.set(token.braille, token);
    conceptMap.set(token.conceptId, token);
  });
  
  // Get generation number
  const state = db.prepare('SELECT totalConcepts FROM swarmState WHERE id = 1').get() as { totalConcepts: number } | undefined;
  const generation = state?.totalConcepts || 1;
  
  return {
    tokens,
    vocabulary,
    concepts: conceptMap,
    generation,
    createdAt: new Date(),
    stats: {
      totalTokens: tokens.length,
      gradeDistribution,
      avgDensity: tokens.length > 0 ? totalDensity / tokens.length : 0,
      categoryDistribution,
    },
  };
}

/**
 * Export kernel as SCL (Symbolic Compression Language) format
 */
export function exportKernelAsSCL(kernel: SemanticKernel): string {
  const lines: string[] = [
    `╔════════════════════════════════════════════════════════════════╗`,
    `║         BRAILLE INFINITY - SEMANTIC KERNEL v${kernel.generation}              ║`,
    `╠════════════════════════════════════════════════════════════════╣`,
    `║  Generated: ${kernel.createdAt.toISOString().slice(0, 19)}                       ║`,
    `║  Tokens: ${String(kernel.stats.totalTokens).padStart(3)}  │  Avg Density: ${kernel.stats.avgDensity.toFixed(1).padStart(5)}                  ║`,
    `╚════════════════════════════════════════════════════════════════╝`,
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
  
  const gradeNames: Record<number, string> = {
    0: '∞ ATOMIC INVARIANTS',
    1: '∞ COMPOUND CONCEPTS',
    2: '∞ META-COGNITIVE OPS',
    3: '∞ EMERGENT SYMBOLS',
  };
  
  // Export each grade
  [0, 1, 2, 3].forEach(grade => {
    const tokens = gradeGroups.get(grade) || [];
    if (tokens.length === 0) return;
    
    lines.push(`┌─────────────────────────────────────────────────────────────────┐`);
    lines.push(`│ GRADE ${grade}: ${gradeNames[grade].padEnd(45)} (${tokens.length}) │`);
    lines.push(`├─────────────────────────────────────────────────────────────────┤`);
    
    tokens.forEach(token => {
      const densityBar = '█'.repeat(Math.floor(token.semanticDensity / 10)) + 
                         '░'.repeat(10 - Math.floor(token.semanticDensity / 10));
      lines.push(`│ ${token.braille} → ${token.conceptName.padEnd(25).slice(0, 25)} │ ρ=${String(token.semanticDensity).padStart(2)} ${densityBar} │`);
    });
    
    lines.push(`└─────────────────────────────────────────────────────────────────┘`);
    lines.push(``);
  });
  
  // Add vocabulary summary
  lines.push(`┌─────────────────────────────────────────────────────────────────┐`);
  lines.push(`│ BRAILLE VOCABULARY SEQUENCE                                     │`);
  lines.push(`├─────────────────────────────────────────────────────────────────┤`);
  
  const brailleSequence = kernel.tokens.map(t => t.braille).join('');
  // Split into lines of 60 chars
  for (let i = 0; i < brailleSequence.length; i += 60) {
    lines.push(`│ ${brailleSequence.slice(i, i + 60).padEnd(60)} │`);
  }
  
  lines.push(`└─────────────────────────────────────────────────────────────────┘`);
  
  return lines.join('\n');
}

/**
 * Generate Braille-encoded context for the LLM
 * This enables high-bandwidth semantic communication
 */
export function generateBrailleContext(kernel: SemanticKernel): string {
  if (kernel.tokens.length === 0) {
    return '';
  }
  
  const atomicTokens = kernel.tokens.filter(t => t.grade <= 1).slice(0, 10);
  
  if (atomicTokens.length === 0) {
    return '';
  }
  
  const brailleSequence = atomicTokens.map(t => t.braille).join('');
  const meanings = atomicTokens.map(t => t.conceptName).join(' · ');
  
  return `
BRAILLE INFINITY KERNEL (Gen ${kernel.generation}):
Semantic atoms: ${brailleSequence}
Decoded: ${meanings}

These Braille tokens represent compressed semantic invariants discovered through convergence.
Reference them to invoke their full semantic meaning.
`.trim();
}

/**
 * Decode a Braille sequence back to concepts
 */
export function decodeBrailleSequence(kernel: SemanticKernel, sequence: string): string[] {
  const decoded: string[] = [];
  
  for (const char of sequence) {
    const token = kernel.vocabulary.get(char);
    if (token) {
      decoded.push(token.conceptName);
    }
  }
  
  return decoded;
}

/**
 * Encode concepts as Braille sequence
 */
export function encodeAsBraille(kernel: SemanticKernel, conceptNames: string[]): string {
  let sequence = '';
  
  for (const name of conceptNames) {
    // Find token by name (case-insensitive)
    const token = kernel.tokens.find(t => 
      t.conceptName.toLowerCase() === name.toLowerCase()
    );
    if (token) {
      sequence += token.braille;
    }
  }
  
  return sequence;
}

/**
 * Get kernel statistics
 */
export function getKernelStats(): {
  kernel: SemanticKernel;
  formatted: string;
  brailleContext: string;
} {
  const kernel = buildSemanticKernel();
  const formatted = exportKernelAsSCL(kernel);
  const brailleContext = generateBrailleContext(kernel);
  
  return {
    kernel,
    formatted,
    brailleContext,
  };
}
