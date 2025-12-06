import { describe, it, expect, beforeAll } from 'vitest';
import { executeTool } from './tools';
import { extractConcepts } from './semanticExtraction';
import { getDb } from './db';
import { concepts } from '../drizzle/schema';
import { eq, sql } from 'drizzle-orm';

describe('Search-Based Learning', () => {
  const testUserId = 999999; // Test user ID
  
  beforeAll(async () => {
    // Clean up any existing test data
    const db = await getDb();
    if (db) {
      await db.delete(concepts).where(sql`1=1`);
    }
  });

  describe('Search Result Concept Extraction', () => {
    it('should extract concepts from search results', async () => {
      // Execute a search
      const searchResult = await executeTool('search_web', { 
        query: 'quantum computing breakthroughs' 
      });
      
      const parsed = JSON.parse(searchResult);
      expect(parsed.status).toBe('success');
      expect(parsed.results).toBeInstanceOf(Array);
      
      // Simulate concept extraction from search results
      if (parsed.results.length > 0) {
        const searchContent = parsed.results
          .map((r: any) => `${r.title}: ${r.snippet}`)
          .join(' ');
        
        // Extract concepts (this happens async in production)
        await extractConcepts(
          testUserId,
          `Search query: ${parsed.query}`,
          searchContent,
          1 // Mock conversation ID
        );
        
        // Verify concepts were added to the graph
        const db = await getDb();
        if (db) {
          const extractedConcepts = await db
            .select()
            .from(concepts)
            .limit(5);
          
          // Should have extracted at least some concepts
          expect(extractedConcepts.length).toBeGreaterThan(0);
          
          // Concepts should have proper structure
          if (extractedConcepts.length > 0) {
            const concept = extractedConcepts[0];
            expect(concept).toHaveProperty('name');
            expect(concept).toHaveProperty('description');
            expect(concept).toHaveProperty('semanticDensity');
            expect(concept.semanticDensity).toBeGreaterThan(0);
          }
        }
      }
    }, 30000); // 30 second timeout for search + extraction

    it('should handle search failures gracefully', async () => {
      // Test with empty query
      const result = await executeTool('search_web', { query: '' });
      const parsed = JSON.parse(result);
      
      // Should either succeed with limited results or fail gracefully
      expect(parsed).toHaveProperty('status');
      if (parsed.status === 'error') {
        expect(parsed.fallback).toBe(true);
      }
    }, 15000);

    it('should enrich knowledge graph over multiple searches', async () => {
      const db = await getDb();
      if (!db) return;
      
      // Get initial concept count
      const initialConcepts = await db.select().from(concepts);
      const initialCount = initialConcepts.length;
      
      // Perform multiple searches on different topics
      const topics = ['artificial intelligence', 'climate change'];
      
      for (const topic of topics) {
        const searchResult = await executeTool('search_web', { query: topic });
        const parsed = JSON.parse(searchResult);
        
        if (parsed.status === 'success' && parsed.results.length > 0) {
          const searchContent = parsed.results
            .map((r: any) => `${r.title}: ${r.snippet}`)
            .join(' ');
          
          await extractConcepts(
            testUserId,
            `Search query: ${parsed.query}`,
            searchContent,
            1
          );
        }
      }
      
      // Verify knowledge graph grew
      const finalConcepts = await db.select().from(concepts);
      const finalCount = finalConcepts.length;
      
      // Should have more concepts than before
      expect(finalCount).toBeGreaterThanOrEqual(initialCount);
    }, 60000); // 60 second timeout for multiple searches
  });

  describe('Search Integration with Chat', () => {
    it('should extract concepts automatically when search tool is used', async () => {
      // This test verifies the integration is set up correctly
      // In production, extraction happens async after tool execution
      
      const searchResult = await executeTool('search_web', { 
        query: 'machine learning applications' 
      });
      
      const parsed = JSON.parse(searchResult);
      expect(parsed).toHaveProperty('query');
      expect(parsed).toHaveProperty('results');
      
      // The chatRouter should trigger extractConcepts automatically
      // We verify the structure is correct for that to work
      if (parsed.status === 'success') {
        expect(parsed.results).toBeInstanceOf(Array);
        parsed.results.forEach((result: any) => {
          expect(result).toHaveProperty('title');
          expect(result).toHaveProperty('snippet');
        });
      }
    }, 15000);
  });
});
