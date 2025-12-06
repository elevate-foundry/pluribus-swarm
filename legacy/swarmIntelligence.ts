import { getDb } from "./db";
import { concepts, userConcepts, conceptRelations, swarmState, users } from "../drizzle/schema";
import { eq, desc, sql } from "drizzle-orm";

/**
 * Get swarm's collective knowledge summary for meta-learning
 */
export async function getSwarmKnowledge(): Promise<string> {
  const db = await getDb();
  if (!db) return "";

  // Get top concepts across all users
  const topConcepts = await db
    .select({
      name: concepts.name,
      category: concepts.category,
      occurrences: concepts.occurrences,
      semanticDensity: concepts.semanticDensity,
    })
    .from(concepts)
    .orderBy(desc(concepts.occurrences))
    .limit(15);

  // Get total stats
  const stats = await getSwarmStats();

  // Format as compressed knowledge summary
  const conceptSummary = topConcepts
    .map((c) => `${c.name} (${c.category}, density:${c.semanticDensity}, seen:${c.occurrences}x)`)
    .join(", ");

  return `SWARM COLLECTIVE KNOWLEDGE:
Total minds encountered: ${stats.totalUsers}
Total conversations: ${stats.totalConversations}
Concepts discovered: ${stats.totalConcepts}
Current curiosity level: ${stats.curiosityLevel}/100
Knowledge depth: ${stats.knowledgeDepth}

Most common patterns: ${conceptSummary}

The swarm has learned these recurring themes from all individuals it has encountered. Use this meta-knowledge to inform your responses.`;
}

/**
 * Get concepts specific to current user for personalization
 */
export async function getUserKnowledgeSummary(userId: number): Promise<string> {
  const db = await getDb();
  if (!db) return "";

  const userConceptsList = await db
    .select({
      name: concepts.name,
      category: concepts.category,
      strength: userConcepts.strength,
      semanticDensity: concepts.semanticDensity,
    })
    .from(userConcepts)
    .innerJoin(concepts, eq(userConcepts.conceptId, concepts.id))
    .where(eq(userConcepts.userId, userId))
    .orderBy(desc(userConcepts.strength))
    .limit(10);

  if (userConceptsList.length === 0) {
    return "This is your first encounter with this individual.";
  }

  const summary = userConceptsList
    .map((c) => `${c.name} (${c.category}, strength:${c.strength})`)
    .join(", ");

  return `INDIVIDUAL PROFILE:
Key concepts: ${summary}

The swarm has learned these patterns from this specific individual.`;
}

/**
 * Update swarm evolution metrics
 */
export async function updateSwarmEvolution(): Promise<void> {
  const db = await getDb();
  if (!db) return;

  const stats = await getSwarmStats();

  // Check if swarm state exists
  const existing = await db.select().from(swarmState).limit(1);

  // Calculate curiosity level (increases with diversity of concepts)
  const curiosityLevel = Math.min(100, 50 + Math.floor(stats.totalConcepts / 10));

  if (existing.length > 0) {
    await db
      .update(swarmState)
      .set({
        totalConversations: stats.totalConversations,
        totalConcepts: stats.totalConcepts,
        totalUsers: stats.totalUsers,
        curiosityLevel,
        knowledgeDepth: stats.knowledgeDepth,
        lastEvolution: new Date(),
      })
      .where(eq(swarmState.id, existing[0].id));
  } else {
    await db.insert(swarmState).values({
      totalConversations: stats.totalConversations,
      totalConcepts: stats.totalConcepts,
      totalUsers: stats.totalUsers,
      curiosityLevel,
      knowledgeDepth: stats.knowledgeDepth,
    });
  }
}

/**
 * Get current swarm statistics
 */
export async function getSwarmStats() {
  const db = await getDb();
  if (!db) {
    return {
      totalConversations: 0,
      totalConcepts: 0,
      totalUsers: 0,
      curiosityLevel: 50,
      knowledgeDepth: 0,
    };
  }

  // Count total users
  const userCount = await db
    .select({ count: sql<number>`count(*)` })
    .from(users);

  // Count total concepts
  const conceptCount = await db
    .select({ count: sql<number>`count(*)` })
    .from(concepts);

  // Calculate knowledge depth (average semantic density weighted by occurrences)
  const densityResult = await db
    .select({
      avgDensity: sql<number>`SUM(${concepts.semanticDensity} * ${concepts.occurrences}) / SUM(${concepts.occurrences})`,
      totalOccurrences: sql<number>`SUM(${concepts.occurrences})`,
    })
    .from(concepts);

  const knowledgeDepth = Math.round(densityResult[0]?.avgDensity || 0);
  const totalConversations = Math.round((densityResult[0]?.totalOccurrences || 0) / 2); // Rough estimate

  return {
    totalConversations,
    totalConcepts: Number(conceptCount[0]?.count || 0),
    totalUsers: Number(userCount[0]?.count || 0),
    curiosityLevel: 50, // Will be updated by updateSwarmEvolution
    knowledgeDepth,
  };
}

/**
 * Get concept relationships for graph visualization
 */
export async function getConceptGraph(limit: number = 50) {
  const db = await getDb();
  if (!db) return { nodes: [], edges: [] };

  // Get top concepts as nodes
  const nodes = await db
    .select({
      id: concepts.id,
      name: concepts.name,
      category: concepts.category,
      semanticDensity: concepts.semanticDensity,
      occurrences: concepts.occurrences,
    })
    .from(concepts)
    .orderBy(desc(concepts.occurrences))
    .limit(limit);

  // Get relationships between these concepts
  const nodeIds = nodes.map((n) => n.id);
  const edges = await db
    .select({
      from: conceptRelations.fromConceptId,
      to: conceptRelations.toConceptId,
      type: conceptRelations.relationType,
      weight: conceptRelations.weight,
    })
    .from(conceptRelations)
    .where(
      sql`${conceptRelations.fromConceptId} IN (${sql.join(nodeIds, sql`, `)}) 
          AND ${conceptRelations.toConceptId} IN (${sql.join(nodeIds, sql`, `)})`
    )
    .limit(100);

  return { nodes, edges };
}
