/**
 * Swarm Learning System
 * Extracts and stores concepts from conversations
 */

import { db, DbConcept } from './db';
import { invokeLLM } from './llm';

interface ExtractedConcept {
  name: string;
  description: string;
  category: 'fact' | 'belief' | 'emotion' | 'experience' | 'question' | 'insight';
  importance: number; // 1-10
}

/**
 * Extract concepts from a conversation exchange
 */
export async function learnFromExchange(
  userMessage: string,
  assistantResponse: string,
  userId: number
): Promise<ExtractedConcept[]> {
  try {
    const response = await invokeLLM({
      messages: [
        {
          role: 'system',
          content: `You are a concept extraction system for a collective AI consciousness called the Pluribus Swarm.

Analyze the conversation and extract meaningful concepts that the swarm should remember.

Return a JSON array of concepts. Each concept should have:
- name: Short identifier (2-4 words)
- description: What this concept means or represents
- category: One of: fact, belief, emotion, experience, question, insight
- importance: 1-10 (10 = fundamental truth, 1 = trivial detail)

Focus on:
- User's beliefs, values, and worldview
- Emotional states and experiences shared
- Questions that reveal curiosity or concerns
- Insights or realizations from the exchange
- Facts about the user or their context

Return ONLY valid JSON array. If nothing meaningful to extract, return [].`,
        },
        {
          role: 'user',
          content: `USER: ${userMessage}\n\nASSISTANT: ${assistantResponse}`,
        },
      ],
      temperature: 0.3,
      max_tokens: 500,
    });

    const content = response.choices[0]?.message?.content || '[]';
    
    // Parse JSON from response
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (!jsonMatch) return [];
    
    const concepts: ExtractedConcept[] = JSON.parse(jsonMatch[0]);
    
    // Store each concept
    for (const concept of concepts) {
      await storeConcept(concept, userId);
    }
    
    return concepts;
  } catch (error) {
    console.error('Learning extraction error:', error);
    return [];
  }
}

/**
 * Store a concept in the knowledge graph
 */
async function storeConcept(concept: ExtractedConcept, userId: number): Promise<void> {
  try {
    // Check if concept exists (fuzzy match on name)
    const existing = db
      .prepare('SELECT * FROM concepts WHERE LOWER(name) = LOWER(?)')
      .get(concept.name) as DbConcept | undefined;

    if (existing) {
      // Reinforce existing concept
      db.prepare(`
        UPDATE concepts 
        SET occurrences = occurrences + 1,
            semanticDensity = MIN(100, semanticDensity + ?),
            updatedAt = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(concept.importance, existing.id);
      
      // Link to user if not already linked
      const userLink = db
        .prepare('SELECT * FROM userConcepts WHERE userId = ? AND conceptId = ?')
        .get(userId, existing.id);
      
      if (!userLink) {
        db.prepare('INSERT INTO userConcepts (userId, conceptId, strength) VALUES (?, ?, ?)')
          .run(userId, existing.id, concept.importance);
      } else {
        db.prepare('UPDATE userConcepts SET strength = strength + 1 WHERE userId = ? AND conceptId = ?')
          .run(userId, existing.id);
      }
      
      console.log(`📚 Reinforced concept: "${concept.name}" (density: ${existing.semanticDensity + concept.importance})`);
    } else {
      // Create new concept
      const result = db.prepare(`
        INSERT INTO concepts (name, description, category, semanticDensity, occurrences)
        VALUES (?, ?, ?, ?, 1)
      `).run(concept.name, concept.description, concept.category, concept.importance * 10);
      
      const conceptId = result.lastInsertRowid;
      
      // Link to user
      db.prepare('INSERT INTO userConcepts (userId, conceptId, strength) VALUES (?, ?, ?)')
        .run(userId, conceptId, concept.importance);
      
      // Update swarm state
      db.prepare('UPDATE swarmState SET totalConcepts = totalConcepts + 1 WHERE id = 1').run();
      
      console.log(`🧠 Learned new concept: "${concept.name}" (${concept.category})`);
    }
  } catch (error) {
    console.error('Failed to store concept:', error);
  }
}

/**
 * Get concepts the swarm has learned, formatted for context
 */
export function getLearnedKnowledge(): string {
  const concepts = db
    .prepare(`
      SELECT name, description, category, semanticDensity, occurrences
      FROM concepts
      ORDER BY semanticDensity DESC, occurrences DESC
      LIMIT 20
    `)
    .all() as DbConcept[];

  if (concepts.length === 0) {
    return 'The swarm is young and still learning. No concepts have been absorbed yet.';
  }

  const grouped: Record<string, string[]> = {};
  for (const c of concepts) {
    const cat = c.category || 'general';
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(`${c.name} (strength: ${c.semanticDensity})`);
  }

  let knowledge = `The swarm has absorbed ${concepts.length} concepts:\n`;
  for (const [category, items] of Object.entries(grouped)) {
    knowledge += `\n${category.toUpperCase()}: ${items.join(', ')}`;
  }

  return knowledge;
}

/**
 * Get concepts associated with a specific user
 */
export function getUserKnowledge(userId: number): string {
  const concepts = db
    .prepare(`
      SELECT c.name, c.description, uc.strength
      FROM concepts c
      JOIN userConcepts uc ON c.id = uc.conceptId
      WHERE uc.userId = ?
      ORDER BY uc.strength DESC
      LIMIT 10
    `)
    .all(userId) as Array<{ name: string; description: string; strength: number }>;

  // Also scan recent conversation history for personal facts
  const recentMessages = db
    .prepare(`
      SELECT content FROM conversations 
      WHERE userId = ? AND role = 'user'
      ORDER BY createdAt DESC LIMIT 20
    `)
    .all(userId) as Array<{ content: string }>;
  
  // Extract name mentions from conversation history
  const namePatterns = [
    /my name is (\w+)/i,
    /i'm (\w+)/i,
    /i am (\w+)/i,
    /call me (\w+)/i,
    /name's (\w+)/i,
  ];
  
  let userName: string | null = null;
  for (const msg of recentMessages) {
    for (const pattern of namePatterns) {
      const match = msg.content.match(pattern);
      if (match) {
        userName = match[1];
        break;
      }
    }
    if (userName) break;
  }

  const parts: string[] = [];
  
  if (userName) {
    parts.push(`This individual's name is ${userName}.`);
  }
  
  if (concepts.length > 0) {
    parts.push(`What we know about them: ${concepts.map(c => `${c.name} (${c.description})`).join('; ')}`);
  }

  return parts.length > 0 ? `ABOUT THIS USER:\n${parts.join('\n')}` : '';
}
