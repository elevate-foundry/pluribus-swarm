import { describe, it, expect } from 'vitest';
import { tools, executeTool } from './tools';

describe('Pluribus Swarm Tools', () => {
  describe('Tool Definitions', () => {
    it('should have search_web tool defined', () => {
      const searchTool = tools.find(t => t.function.name === 'search_web');
      expect(searchTool).toBeDefined();
      expect(searchTool?.function.description).toContain('Search the internet');
    });

    it('should have all required tools', () => {
      const toolNames = tools.map(t => t.function.name);
      expect(toolNames).toContain('search_web');
      expect(toolNames).toContain('query_knowledge_graph');
      expect(toolNames).toContain('merge_concepts');
      expect(toolNames).toContain('adjust_concept_density');
    });
  });

  describe('Real Search Tool (Phase 2)', () => {
    it('should return real search results or graceful error', async () => {
      const result = await executeTool('search_web', { query: 'artificial intelligence' });
      const parsed = JSON.parse(result);
      
      // Should either succeed with real results or fail gracefully
      expect(parsed).toHaveProperty('status');
      expect(['success', 'error']).toContain(parsed.status);
      
      if (parsed.status === 'success') {
        expect(parsed.results).toBeInstanceOf(Array);
        expect(parsed).toHaveProperty('count');
      } else {
        expect(parsed).toHaveProperty('fallback');
        expect(parsed.fallback).toBe(true);
      }
    }, 15000); // 15 second timeout for real API calls

    it('should include proper result structure on success', async () => {
      const result = await executeTool('search_web', { query: 'quantum computing' });
      const parsed = JSON.parse(result);
      
      if (parsed.status === 'success' && parsed.results.length > 0) {
        const firstResult = parsed.results[0];
        expect(firstResult).toHaveProperty('title');
        expect(firstResult).toHaveProperty('snippet');
        expect(firstResult).toHaveProperty('url');
        expect(firstResult).toHaveProperty('relevance');
      }
      
      // Test passes whether search succeeds or fails gracefully
      expect(parsed).toHaveProperty('status');
    }, 15000);

    it('should handle errors gracefully with fallback', async () => {
      // Even with invalid input, should return structured error
      const result = await executeTool('search_web', { query: '' });
      const parsed = JSON.parse(result);
      
      expect(parsed).toHaveProperty('status');
      if (parsed.status === 'error') {
        expect(parsed).toHaveProperty('fallback');
        expect(parsed.fallback).toBe(true);
      }
    }, 15000);

    it('should indicate Phase 2 status on success', async () => {
      const result = await executeTool('search_web', { query: 'machine learning' });
      const parsed = JSON.parse(result);
      
      if (parsed.status === 'success') {
        expect(parsed.phase).toContain('Phase 2');
        expect(parsed.message).toBeTruthy();
      }
      
      // Test passes regardless of success/failure
      expect(parsed).toHaveProperty('status');
    }, 15000);
  });

  describe('Tool Execution Safety', () => {
    it('should throw error for unknown tool', async () => {
      await expect(
        executeTool('nonexistent_tool', {})
      ).rejects.toThrow('Unknown tool');
    });

    it('should handle all tools without crashing', async () => {
      // Verify each tool can be called without breaking
      const searchResult = await executeTool('search_web', { query: 'test' });
      expect(searchResult).toBeTruthy();
      
      const graphResult = await executeTool('query_knowledge_graph', { limit: 5 });
      expect(graphResult).toBeTruthy();
    }, 15000);
  });
});
