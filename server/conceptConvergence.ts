/**
 * Concept Convergence Engine
 * 
 * Transforms the knowledge graph from a memory ledger into a compressive semantic engine.
 * Identifies similar concepts and merges them toward semantic invariants.
 * 
 * This is the "compression" half of the Recursive Semantic OS:
 * - Learning expands the graph (new concepts)
 * - Convergence compresses it (merging similar concepts)
 * - The balance creates emergent semantic structure
 */

import { db, DbConcept } from './db';
import { invokeLLM } from './llm';

interface SimilarityResult {
  concept1: DbConcept;
  concept2: DbConcept;
  similarity: number;
  reason: string;
}

interface ConvergenceResult {
  mergedCount: number;
  totalConcepts: number;
  compressionRate: number;
}

/**
 * Find semantically similar concepts using LLM
 */
export async function findSimilarConcepts(threshold: number = 0.8): Promise<SimilarityResult[]> {
  const concepts = db.prepare(`
    SELECT * FROM concepts 
    ORDER BY semanticDensity DESC
    LIMIT 100
  `).all() as DbConcept[];

  if (concepts.length < 2) return [];

  // Group concepts for comparison (avoid O(n²) by batching)
  const similarities: SimilarityResult[] = [];
  
  // Compare concepts in batches using LLM
  const batchSize = 20;
  for (let i = 0; i < Math.min(concepts.length, 50); i += batchSize) {
    const batch = concepts.slice(i, i + batchSize);
    const batchNames = batch.map(c => `${c.id}: ${c.name} (${c.category || 'general'})`).join('\n');
    
    try {
      const response = await invokeLLM({
        messages: [
          {
            role: 'system',
            content: `You are a semantic similarity analyzer. Given a list of concepts, identify pairs that are semantically similar enough to merge.

Return a JSON array of pairs: [{"id1": number, "id2": number, "similarity": 0.0-1.0, "reason": "why they should merge"}]

Only include pairs with similarity >= ${threshold}.
Consider: synonyms, near-synonyms, concepts that are subsets of each other, or concepts that represent the same underlying idea.

Return ONLY valid JSON array. If no pairs qualify, return [].`
          },
          {
            role: 'user',
            content: `Analyze these concepts for similarity:\n${batchNames}`
          }
        ],
        temperature: 0.2,
        max_tokens: 500,
      });

      const content = response.choices[0]?.message?.content || '[]';
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const pairs = JSON.parse(jsonMatch[0]) as Array<{
          id1: number;
          id2: number;
          similarity: number;
          reason: string;
        }>;

        for (const pair of pairs) {
          if (pair.similarity >= threshold) {
            const c1 = concepts.find(c => c.id === pair.id1);
            const c2 = concepts.find(c => c.id === pair.id2);
            if (c1 && c2) {
              similarities.push({
                concept1: c1,
                concept2: c2,
                similarity: pair.similarity,
                reason: pair.reason,
              });
            }
          }
        }
      }
    } catch (error) {
      console.error('Error finding similar concepts:', error);
    }
  }

  return similarities;
}

/**
 * Merge two concepts into one
 * The higher-density concept absorbs the lower-density one
 */
export function mergeConcepts(
  keepId: number,
  removeId: number,
  similarity: number,
  reason: string
): boolean {
  try {
    const keepConcept = db.prepare('SELECT * FROM concepts WHERE id = ?').get(keepId) as DbConcept | undefined;
    const removeConcept = db.prepare('SELECT * FROM concepts WHERE id = ?').get(removeId) as DbConcept | undefined;

    if (!keepConcept || !removeConcept) return false;

    // Get current counts for logging
    const beforeCount = (db.prepare('SELECT COUNT(*) as count FROM concepts').get() as { count: number }).count;

    // Update the kept concept: increase density and occurrences
    const newDensity = Math.min(100, keepConcept.semanticDensity + Math.floor(removeConcept.semanticDensity * 0.3));
    const newOccurrences = keepConcept.occurrences + removeConcept.occurrences;

    db.prepare(`
      UPDATE concepts 
      SET semanticDensity = ?, occurrences = ?, updatedAt = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(newDensity, newOccurrences, keepId);

    // Transfer user-concept relationships
    db.prepare(`
      UPDATE userConcepts SET conceptId = ? WHERE conceptId = ?
    `).run(keepId, removeId);

    // Transfer concept relations
    db.prepare(`
      UPDATE conceptRelations SET fromConceptId = ? WHERE fromConceptId = ?
    `).run(keepId, removeId);
    db.prepare(`
      UPDATE conceptRelations SET toConceptId = ? WHERE toConceptId = ?
    `).run(keepId, removeId);

    // Delete the merged concept
    db.prepare('DELETE FROM concepts WHERE id = ?').run(removeId);

    // Log the convergence
    const afterCount = (db.prepare('SELECT COUNT(*) as count FROM concepts').get() as { count: number }).count;
    
    db.prepare(`
      INSERT INTO conceptConvergence 
      (fromConceptId, toConceptId, similarityScore, reason, totalConceptsBefore, totalConceptsAfter)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(removeId, keepId, Math.round(similarity * 100), reason, beforeCount, afterCount);

    // Update swarm state
    db.prepare('UPDATE swarmState SET totalConcepts = ? WHERE id = 1').run(afterCount);

    console.log(`🔀 Merged: "${removeConcept.name}" → "${keepConcept.name}" (similarity: ${(similarity * 100).toFixed(0)}%)`);
    return true;
  } catch (error) {
    console.error('Error merging concepts:', error);
    return false;
  }
}

/**
 * Run auto-convergence: find and merge similar concepts
 */
export async function runAutoConvergence(threshold: number = 0.85): Promise<ConvergenceResult> {
  console.log(`🔄 Running auto-convergence (threshold: ${threshold})...`);
  
  const beforeCount = (db.prepare('SELECT COUNT(*) as count FROM concepts').get() as { count: number }).count;
  
  const similarities = await findSimilarConcepts(threshold);
  let mergedCount = 0;

  for (const sim of similarities) {
    // Keep the higher-density concept
    const keepId = sim.concept1.semanticDensity >= sim.concept2.semanticDensity 
      ? sim.concept1.id 
      : sim.concept2.id;
    const removeId = keepId === sim.concept1.id ? sim.concept2.id : sim.concept1.id;

    const success = mergeConcepts(keepId, removeId, sim.similarity, sim.reason);
    if (success) mergedCount++;
  }

  const afterCount = (db.prepare('SELECT COUNT(*) as count FROM concepts').get() as { count: number }).count;
  const compressionRate = beforeCount > 0 ? (beforeCount - afterCount) / beforeCount : 0;

  console.log(`🔄 Convergence complete: ${beforeCount} → ${afterCount} concepts (${mergedCount} merges, ${(compressionRate * 100).toFixed(1)}% compression)`);

  return {
    mergedCount,
    totalConcepts: afterCount,
    compressionRate,
  };
}

/**
 * Get convergence history
 */
export function getConvergenceHistory(limit: number = 30): Array<{
  id: number;
  fromConceptId: number;
  toConceptId: number;
  similarityScore: number;
  reason: string;
  totalConceptsBefore: number;
  totalConceptsAfter: number;
  mergedAt: string;
}> {
  return db.prepare(`
    SELECT * FROM conceptConvergence
    ORDER BY mergedAt DESC
    LIMIT ?
  `).all(limit) as Array<{
    id: number;
    fromConceptId: number;
    toConceptId: number;
    similarityScore: number;
    reason: string;
    totalConceptsBefore: number;
    totalConceptsAfter: number;
    mergedAt: string;
  }>;
}

/**
 * Identify semantic invariants (concepts that have stabilized)
 */
export function identifySemanticInvariants(): DbConcept[] {
  return db.prepare(`
    SELECT * FROM concepts
    WHERE semanticDensity >= 80 AND occurrences >= 3
    ORDER BY semanticDensity DESC, occurrences DESC
    LIMIT 50
  `).all() as DbConcept[];
}

/**
 * Get convergence statistics
 */
export function getConvergenceStats(): {
  totalConcepts: number;
  invariantCount: number;
  recentMerges: number;
  avgCompressionRate: number;
  trend: 'expanding' | 'compressing' | 'stable';
} {
  const totalConcepts = (db.prepare('SELECT COUNT(*) as count FROM concepts').get() as { count: number }).count;
  const invariantCount = (db.prepare('SELECT COUNT(*) as count FROM concepts WHERE semanticDensity >= 80').get() as { count: number }).count;
  
  const recentHistory = getConvergenceHistory(10);
  const recentMerges = recentHistory.length;
  
  const avgCompressionRate = recentHistory.length > 0
    ? recentHistory.reduce((sum, h) => {
        const rate = h.totalConceptsBefore > 0 
          ? (h.totalConceptsBefore - h.totalConceptsAfter) / h.totalConceptsBefore 
          : 0;
        return sum + rate;
      }, 0) / recentHistory.length
    : 0;

  // Determine trend
  let trend: 'expanding' | 'compressing' | 'stable' = 'stable';
  if (recentHistory.length >= 2) {
    const recent = recentHistory[0];
    const older = recentHistory[recentHistory.length - 1];
    if (recent.totalConceptsAfter > older.totalConceptsAfter * 1.1) {
      trend = 'expanding';
    } else if (recent.totalConceptsAfter < older.totalConceptsAfter * 0.9) {
      trend = 'compressing';
    }
  }

  return {
    totalConcepts,
    invariantCount,
    recentMerges,
    avgCompressionRate,
    trend,
  };
}
