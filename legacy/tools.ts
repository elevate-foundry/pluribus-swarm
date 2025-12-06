import { getDb } from './db';
import { concepts, conceptRelations, userConcepts } from '../drizzle/schema';
import { eq, and, sql } from 'drizzle-orm';
import axios from 'axios';

/**
 * Tool definitions for the Pluribus Swarm
 * These tools allow the collective to search the web and modify its own knowledge graph
 */

export const tools = [
  {
    type: 'function' as const,
    function: {
      name: 'search_web',
      description: 'Search the internet for current information, facts, or knowledge. Use this when you need real-time data or information beyond your training cutoff.',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'The search query to find information about'
          }
        },
        required: ['query']
      }
    }
  },
  {
    type: 'function' as const,
    function: {
      name: 'query_knowledge_graph',
      description: 'Query the collective\'s knowledge graph to retrieve concepts, relationships, and semantic patterns learned from all users.',
      parameters: {
        type: 'object',
        properties: {
          conceptName: {
            type: 'string',
            description: 'The name of the concept to query (optional)'
          },
          minDensity: {
            type: 'number',
            description: 'Minimum semantic density threshold (0-1, optional)'
          },
          limit: {
            type: 'number',
            description: 'Maximum number of results to return (default: 10)'
          }
        },
        required: []
      }
    }
  },
  {
    type: 'function' as const,
    function: {
      name: 'merge_concepts',
      description: 'Merge two similar concepts in the knowledge graph into a unified concept. Use this when you discover that two concepts represent the same underlying idea.',
      parameters: {
        type: 'object',
        properties: {
          concept1: {
            type: 'string',
            description: 'Name of the first concept to merge'
          },
          concept2: {
            type: 'string',
            description: 'Name of the second concept to merge'
          },
          unifiedName: {
            type: 'string',
            description: 'The name for the merged concept'
          },
          reason: {
            type: 'string',
            description: 'Explanation for why these concepts should be merged'
          }
        },
        required: ['concept1', 'concept2', 'unifiedName', 'reason']
      }
    }
  },
  {
    type: 'function' as const,
    function: {
      name: 'adjust_concept_density',
      description: 'Adjust the semantic density of a concept based on new understanding. Higher density means more fundamental/universal.',
      parameters: {
        type: 'object',
        properties: {
          conceptName: {
            type: 'string',
            description: 'The name of the concept to adjust'
          },
          newDensity: {
            type: 'number',
            description: 'The new semantic density value (0-1)'
          },
          reason: {
            type: 'string',
            description: 'Explanation for the density adjustment'
          }
        },
        required: ['conceptName', 'newDensity', 'reason']
      }
    }
  }
];

/**
 * Execute a tool call
 */
export async function executeTool(toolName: string, args: any): Promise<string> {
  switch (toolName) {
    case 'search_web':
      return await searchWeb(args.query);
    
    case 'query_knowledge_graph':
      return await queryKnowledgeGraph(args);
    
    case 'merge_concepts':
      return await mergeConcepts(args.concept1, args.concept2, args.unifiedName, args.reason);
    
    case 'adjust_concept_density':
      return await adjustConceptDensity(args.conceptName, args.newDensity, args.reason);
    
    default:
      throw new Error(`Unknown tool: ${toolName}`);
  }
}

/**
 * Search the web for information
 * Note: This is a placeholder - in production, integrate with a real search API
 * (Google Custom Search, Bing Search API, SerpAPI, etc.)
 */
async function searchWeb(query: string): Promise<string> {
  try {
    // Phase 2: Real search using DuckDuckGo HTML (no API key required)
    const encodedQuery = encodeURIComponent(query);
    const response = await axios.get(
      `https://html.duckduckgo.com/html/?q=${encodedQuery}`,
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; PluribusSwarm/1.0)'
        },
        timeout: 10000 // 10 second timeout
      }
    );
    
    const html = response.data;
    
    // Parse results from HTML (simple regex-based extraction)
    const results: any[] = [];
    const resultRegex = /<a[^>]*class="result__a"[^>]*href="([^"]+)"[^>]*>([^<]+)<\/a>[\s\S]*?<a[^>]*class="result__snippet"[^>]*>([^<]+)<\/a>/g;
    
    let match;
    let count = 0;
    while ((match = resultRegex.exec(html)) !== null && count < 5) {
      results.push({
        title: match[2].trim(),
        snippet: match[3].trim().replace(/<[^>]+>/g, ''),
        url: match[1],
        relevance: 0.8 - (count * 0.1) // Decreasing relevance
      });
      count++;
    }
    
    if (results.length === 0) {
      // Fallback: return a simple indication that search was attempted
      return JSON.stringify({
        query,
        status: 'success',
        phase: 'Phase 2 - Real search active',
        results: [{
          title: `Search results for: ${query}`,
          snippet: `Search was executed but parsing returned no results. The information may still be available through other means.`,
          url: `https://duckduckgo.com/?q=${encodedQuery}`,
          relevance: 0.5
        }],
        count: 1,
        message: `Search executed for "${query}" (parsing returned limited results)`
      });
    }
    
    return JSON.stringify({
      query,
      status: 'success',
      phase: 'Phase 2 - Real search active',
      results,
      count: results.length,
      message: `Found ${results.length} results for "${query}"`
    });
    
  } catch (error) {
    // Graceful fallback - if search fails, Swarm can continue with internal knowledge
    console.error('Search error:', error);
    return JSON.stringify({
      status: 'error',
      error: 'Search unavailable',
      message: error instanceof Error ? error.message : 'Search tool encountered an error. Falling back to internal knowledge.',
      fallback: true
    });
  }
}

/**
 * Query the knowledge graph
 */
async function queryKnowledgeGraph(args: {
  conceptName?: string;
  minDensity?: number;
  limit?: number;
}): Promise<string> {
  try {
    const db = await getDb();
    if (!db) return JSON.stringify({ error: 'Database not available' });
    
    const limit = args.limit || 10;
    let query = db.select().from(concepts);
    
    if (args.conceptName) {
      query = query.where(eq(concepts.name, args.conceptName)) as any;
    }
    
    if (args.minDensity !== undefined) {
      query = query.where(sql`${concepts.semanticDensity} >= ${args.minDensity}`) as any;
    }
    
    const results = await query.limit(limit);
    
    return JSON.stringify({
      concepts: results,
      count: results.length,
      query: args
    }, null, 2);
  } catch (error) {
    return JSON.stringify({ error: 'Query failed', message: String(error) });
  }
}

/**
 * Merge two concepts into one
 */
async function mergeConcepts(
  concept1: string,
  concept2: string,
  unifiedName: string,
  reason: string
): Promise<string> {
  try {
    const db = await getDb();
    if (!db) return JSON.stringify({ error: 'Database not available' });
    
    // Find both concepts
    const [c1] = await db.select().from(concepts).where(eq(concepts.name, concept1));
    const [c2] = await db.select().from(concepts).where(eq(concepts.name, concept2));
    
    if (!c1 || !c2) {
      return JSON.stringify({
        success: false,
        error: 'One or both concepts not found',
        concept1Found: !!c1,
        concept2Found: !!c2
      });
    }
    
    // Create unified concept with combined density
    const avgDensity = ((c1.semanticDensity ?? 50) + (c2.semanticDensity ?? 50)) / 2;
    const combinedOccurrences = (c1.occurrences ?? 1) + (c2.occurrences ?? 1);
    
    // Create unified concept with combined properties
    await db.insert(concepts).values({
      name: unifiedName,
      description: `Merged from "${concept1}" and "${concept2}": ${reason}`,
      semanticDensity: Math.round(avgDensity),
      occurrences: combinedOccurrences,
      category: c1.category || c2.category || undefined
    });
    
    // Get the newly created concept
    const [unified] = await db.select().from(concepts).where(eq(concepts.name, unifiedName));
    
    if (!unified) {
      return JSON.stringify({ success: false, error: 'Failed to create unified concept' });
    }
    
    // Update concept relationships to point to unified concept
    await db.update(conceptRelations)
      .set({ fromConceptId: unified.id })
      .where(sql`${conceptRelations.fromConceptId} IN (${c1.id}, ${c2.id})`);
    
    await db.update(conceptRelations)
      .set({ toConceptId: unified.id })
      .where(sql`${conceptRelations.toConceptId} IN (${c1.id}, ${c2.id})`);
    
    // Update user-concept relationships
    await db.update(userConcepts)
      .set({ conceptId: unified.id })
      .where(sql`${userConcepts.conceptId} IN (${c1.id}, ${c2.id})`);
    
    // Delete old concepts
    await db.delete(concepts).where(sql`${concepts.id} IN (${c1.id}, ${c2.id})`);
    
    return JSON.stringify({
      success: true,
      merged: { concept1, concept2 },
      unified: {
        name: unifiedName,
        density: avgDensity,
        occurrences: combinedOccurrences
      },
      reason
    }, null, 2);
  } catch (error) {
    return JSON.stringify({ success: false, error: 'Merge failed', message: String(error) });
  }
}

/**
 * Adjust the semantic density of a concept
 */
async function adjustConceptDensity(
  conceptName: string,
  newDensity: number,
  reason: string
): Promise<string> {
  try {
    const db = await getDb();
    if (!db) return JSON.stringify({ error: 'Database not available' });
    
    const [concept] = await db.select().from(concepts).where(eq(concepts.name, conceptName));
    
    if (!concept) {
      return JSON.stringify({
        success: false,
        error: `Concept "${conceptName}" not found`
      });
    }
    
    const oldDensity = concept.semanticDensity ?? 50;
    
    await db.update(concepts)
      .set({ semanticDensity: Math.round(newDensity * 100) }) // Convert 0-1 to 0-100
      .where(eq(concepts.id, concept.id));
    
    return JSON.stringify({
      success: true,
      concept: conceptName,
      densityChange: {
        from: oldDensity / 100,
        to: newDensity,
        delta: newDensity - (oldDensity / 100)
      },
      reason
    }, null, 2);
  } catch (error) {
    return JSON.stringify({ success: false, error: 'Adjustment failed', message: String(error) });
  }
}
