/**
 * Swarm Tools - Web search and knowledge graph operations
 */

import { db } from './db';

// Tool definitions for OpenAI function calling
export const tools = [
  {
    type: 'function' as const,
    function: {
      name: 'search_web',
      description: 'Search the internet for current information. Use when you need real-time data or facts beyond your training.',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'The search query',
          },
        },
        required: ['query'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'query_knowledge_graph',
      description: "Query the swarm's collective knowledge graph for concepts and relationships.",
      parameters: {
        type: 'object',
        properties: {
          conceptName: {
            type: 'string',
            description: 'Optional concept name to search for',
          },
          limit: {
            type: 'number',
            description: 'Max results (default 10)',
          },
        },
        required: [],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'remember_concept',
      description: 'Store a new concept or insight in the knowledge graph for future reference.',
      parameters: {
        type: 'object',
        properties: {
          name: {
            type: 'string',
            description: 'Name of the concept',
          },
          description: {
            type: 'string',
            description: 'Description of the concept',
          },
          category: {
            type: 'string',
            description: 'Category (emotion, belief, fact, experience)',
          },
        },
        required: ['name', 'description'],
      },
    },
  },
];

/**
 * Execute a tool call
 */
export async function executeTool(toolName: string, args: Record<string, unknown>): Promise<string> {
  switch (toolName) {
    case 'search_web':
      return await searchWeb(args.query as string);
    case 'query_knowledge_graph':
      return await queryKnowledgeGraph(args.conceptName as string | undefined, args.limit as number | undefined);
    case 'remember_concept':
      return await rememberConcept(
        args.name as string,
        args.description as string,
        args.category as string | undefined
      );
    default:
      return JSON.stringify({ error: `Unknown tool: ${toolName}` });
  }
}

/**
 * Search the web using DuckDuckGo
 */
async function searchWeb(query: string): Promise<string> {
  try {
    const encodedQuery = encodeURIComponent(query);
    const response = await fetch(`https://html.duckduckgo.com/html/?q=${encodedQuery}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      },
    });

    const html = await response.text();

    // Parse results from HTML
    const results: Array<{ title: string; snippet: string; url: string }> = [];
    const titleRegex = /<a[^>]*class="result__a"[^>]*>([^<]+)<\/a>/g;
    const snippetRegex = /<a[^>]*class="result__snippet"[^>]*>([^<]+)<\/a>/g;

    let titleMatch;
    let snippetMatch;
    let count = 0;

    while ((titleMatch = titleRegex.exec(html)) !== null && count < 5) {
      snippetMatch = snippetRegex.exec(html);
      results.push({
        title: titleMatch[1].trim(),
        snippet: snippetMatch ? snippetMatch[1].trim().replace(/<[^>]+>/g, '') : '',
        url: `https://duckduckgo.com/?q=${encodedQuery}`,
      });
      count++;
    }

    if (results.length === 0) {
      // Fallback - DuckDuckGo may be blocking
      return JSON.stringify({
        query,
        status: 'limited',
        message: `Search attempted for "${query}". Results may be limited. Use internal knowledge.`,
        results: [],
      });
    }

    return JSON.stringify({
      query,
      status: 'success',
      results,
      count: results.length,
    });
  } catch (error) {
    return JSON.stringify({
      query,
      status: 'error',
      message: error instanceof Error ? error.message : 'Search failed',
      fallback: true,
    });
  }
}

/**
 * Query the knowledge graph
 */
async function queryKnowledgeGraph(conceptName?: string, limit: number = 10): Promise<string> {
  try {
    let concepts;
    if (conceptName) {
      concepts = db
        .prepare('SELECT * FROM concepts WHERE name LIKE ? ORDER BY occurrences DESC LIMIT ?')
        .all(`%${conceptName}%`, limit);
    } else {
      concepts = db
        .prepare('SELECT * FROM concepts ORDER BY semanticDensity DESC, occurrences DESC LIMIT ?')
        .all(limit);
    }

    return JSON.stringify({
      status: 'success',
      concepts,
      count: concepts.length,
    });
  } catch (error) {
    return JSON.stringify({
      status: 'error',
      message: error instanceof Error ? error.message : 'Query failed',
    });
  }
}

/**
 * Store a concept in the knowledge graph
 */
async function rememberConcept(name: string, description: string, category?: string): Promise<string> {
  try {
    // Check if concept exists
    const existing = db.prepare('SELECT * FROM concepts WHERE name = ?').get(name) as { id: number; occurrences: number } | undefined;

    if (existing) {
      // Update occurrences
      db.prepare('UPDATE concepts SET occurrences = occurrences + 1, updatedAt = CURRENT_TIMESTAMP WHERE id = ?').run(
        existing.id
      );
      return JSON.stringify({
        status: 'updated',
        message: `Concept "${name}" reinforced (occurrences: ${existing.occurrences + 1})`,
      });
    } else {
      // Insert new concept
      const result = db
        .prepare('INSERT INTO concepts (name, description, category, semanticDensity) VALUES (?, ?, ?, ?)')
        .run(name, description, category || 'general', 50);

      // Update swarm state
      db.prepare('UPDATE swarmState SET totalConcepts = totalConcepts + 1 WHERE id = 1').run();

      return JSON.stringify({
        status: 'created',
        message: `New concept "${name}" added to collective memory`,
        id: result.lastInsertRowid,
      });
    }
  } catch (error) {
    return JSON.stringify({
      status: 'error',
      message: error instanceof Error ? error.message : 'Failed to store concept',
    });
  }
}
