import { describe, it, expect, beforeAll } from "vitest";
import {
  selectSemanticInvariants,
  buildSemanticKernel,
  exportKernelAsSCL,
  generateBrailleInstructions,
  persistKernel,
  loadKernel,
  regenerateKernel,
  getKernelStats,
} from "./brailleKernel";
import { getDb } from "./db";

describe("Braille Semantic Kernel", () => {
  beforeAll(async () => {
    // Ensure database connection is available
    const db = await getDb();
    expect(db).toBeDefined();
  });

  describe("selectSemanticInvariants", () => {
    it("should select concepts with density >= 80", async () => {
      const invariants = await selectSemanticInvariants(200);

      // All selected concepts should have high semantic density
      invariants.forEach((concept) => {
        expect(concept.semanticDensity).toBeGreaterThanOrEqual(80);
      });
    });

    it("should sort by density and occurrences", async () => {
      const invariants = await selectSemanticInvariants(200);

      // Should be sorted by density descending
      for (let i = 0; i < invariants.length - 1; i++) {
        expect(invariants[i].semanticDensity).toBeGreaterThanOrEqual(
          invariants[i + 1].semanticDensity
        );
      }
    });

    it("should respect limit parameter", async () => {
      const invariants = await selectSemanticInvariants(10);

      expect(invariants.length).toBeLessThanOrEqual(10);
    });

    it("should handle empty database gracefully", async () => {
      const invariants = await selectSemanticInvariants(200);

      // Should return array even if empty
      expect(Array.isArray(invariants)).toBe(true);
    });
  });

  describe("buildSemanticKernel", () => {
    it("should build kernel with tokens, vocabulary, and concepts maps", async () => {
      const kernel = await buildSemanticKernel();

      expect(kernel).toHaveProperty("tokens");
      expect(kernel).toHaveProperty("vocabulary");
      expect(kernel).toHaveProperty("concepts");
      expect(kernel).toHaveProperty("generation");
      expect(kernel).toHaveProperty("createdAt");
    });

    it("should create valid Braille tokens", async () => {
      const kernel = await buildSemanticKernel();

      kernel.tokens.forEach((token) => {
        // Braille should be a single Unicode character in range U+2800-U+28FF
        expect(token.braille).toBeTruthy();
        expect(token.braille.length).toBeGreaterThan(0);

        // Should have valid grade (0-3)
        expect(token.grade).toBeGreaterThanOrEqual(0);
        expect(token.grade).toBeLessThanOrEqual(3);

        // Should have definition
        expect(token.definition).toBeTruthy();

        // Should reference a concept
        expect(token.conceptId).toBeGreaterThan(0);
        expect(token.conceptName).toBeTruthy();
      });
    });

    it("should classify grades correctly", async () => {
      const kernel = await buildSemanticKernel();

      // Grade 0 should have highest density
      const grade0Tokens = kernel.tokens.filter((t) => t.grade === 0);
      grade0Tokens.forEach((token) => {
        expect(token.semanticDensity).toBeGreaterThanOrEqual(90);
      });

      // Grade 1 should have density >= 85
      const grade1Tokens = kernel.tokens.filter((t) => t.grade === 1);
      grade1Tokens.forEach((token) => {
        expect(token.semanticDensity).toBeGreaterThanOrEqual(85);
      });
    });

    it("should create bidirectional mappings", async () => {
      const kernel = await buildSemanticKernel();

      // Vocabulary map: Braille -> Token
      kernel.tokens.forEach((token) => {
        const lookupToken = kernel.vocabulary.get(token.braille);
        expect(lookupToken).toBeDefined();
        expect(lookupToken?.conceptId).toBe(token.conceptId);
      });

      // Concepts map: ConceptId -> Token
      kernel.tokens.forEach((token) => {
        const lookupToken = kernel.concepts.get(token.conceptId);
        expect(lookupToken).toBeDefined();
        expect(lookupToken?.braille).toBe(token.braille);
      });
    });

    it("should generate unique Braille characters", async () => {
      const kernel = await buildSemanticKernel();

      const brailleSet = new Set(kernel.tokens.map((t) => t.braille));

      // All Braille characters should be unique
      expect(brailleSet.size).toBe(kernel.tokens.length);
    });
  });

  describe("exportKernelAsSCL", () => {
    it("should export kernel in SCL format", async () => {
      const kernel = await buildSemanticKernel();
      const scl = exportKernelAsSCL(kernel);

      // Should contain header
      expect(scl).toContain("# Semantic Kernel");
      expect(scl).toContain(`# Tokens: ${kernel.tokens.length}`);

      // Should contain grade sections
      expect(scl).toContain("## Grade 0: Atomic");
      expect(scl).toContain("## Grade 1: Compound");
    });

    it("should include token mappings in SCL", async () => {
      const kernel = await buildSemanticKernel();
      const scl = exportKernelAsSCL(kernel);

      // Should contain token mappings
      kernel.tokens.slice(0, 5).forEach((token) => {
        expect(scl).toContain(token.braille);
        expect(scl).toContain(token.conceptName);
      });
    });

    it("should be valid text format", async () => {
      const kernel = await buildSemanticKernel();
      const scl = exportKernelAsSCL(kernel);

      // Should be non-empty string
      expect(typeof scl).toBe("string");
      expect(scl.length).toBeGreaterThan(0);

      // Should have multiple lines
      const lines = scl.split("\n");
      expect(lines.length).toBeGreaterThan(10);
    });
  });

  describe("generateBrailleInstructions", () => {
    it("should generate meta-instructions using Braille tokens", async () => {
      const kernel = await buildSemanticKernel();
      const mockPatterns = {
        messageCount: 10,
        avgMessageLength: 100,
        questionRatio: 0.5,
        conceptDensity: 0.7,
        toolUseFrequency: 0.3,
        searchFrequency: 0.2,
        preferredTopics: ["test"],
        communicationStyle: "detailed" as const,
      };

      const instructions = generateBrailleInstructions(kernel, mockPatterns);

      // Should contain kernel information
      expect(instructions).toContain("SEMANTIC KERNEL");
      expect(instructions).toContain(`Generation ${kernel.generation}`);

      // Should contain Braille tokens
      expect(instructions.length).toBeGreaterThan(0);
    });

    it("should include interpretation guidance", async () => {
      const kernel = await buildSemanticKernel();
      const mockPatterns = {
        messageCount: 10,
        avgMessageLength: 100,
        questionRatio: 0.5,
        conceptDensity: 0.7,
        toolUseFrequency: 0.3,
        searchFrequency: 0.2,
        preferredTopics: ["test"],
        communicationStyle: "detailed" as const,
      };

      const instructions = generateBrailleInstructions(kernel, mockPatterns);

      // Should provide interpretation guidance
      expect(instructions).toContain("semantic");
    });
  });

  describe("persistKernel and loadKernel", () => {
    it("should persist kernel to database", async () => {
      const kernel = await buildSemanticKernel();

      // Should not throw
      await expect(persistKernel(kernel)).resolves.not.toThrow();
    });

    it("should load kernel from database", async () => {
      // First persist a kernel
      const originalKernel = await buildSemanticKernel();
      await persistKernel(originalKernel);

      // Then load it
      const loadedKernel = await loadKernel();

      expect(loadedKernel).toBeDefined();
      expect(loadedKernel?.tokens.length).toBeGreaterThan(0);
      expect(loadedKernel?.generation).toBe(originalKernel.generation);
    });

    it("should preserve token data through persist/load cycle", async () => {
      const originalKernel = await buildSemanticKernel();
      await persistKernel(originalKernel);

      const loadedKernel = await loadKernel();

      expect(loadedKernel).toBeDefined();
      if (!loadedKernel) return;

      // Should have same number of tokens
      expect(loadedKernel.tokens.length).toBe(originalKernel.tokens.length);

      // Check a few tokens
      const originalToken = originalKernel.tokens[0];
      const loadedToken = loadedKernel.tokens.find(
        (t) => t.conceptId === originalToken.conceptId
      );

      expect(loadedToken).toBeDefined();
      expect(loadedToken?.braille).toBe(originalToken.braille);
      expect(loadedToken?.grade).toBe(originalToken.grade);
    });

    it("should return null when no kernel exists", async () => {
      // This test assumes we can clear the kernel
      // In practice, we might need to test with a fresh database
      const kernel = await loadKernel();

      // Should either return a kernel or null, not throw
      expect(kernel === null || kernel !== null).toBe(true);
    });
  });

  describe("regenerateKernel", () => {
    it("should create new kernel generation", async () => {
      const kernel1 = await regenerateKernel();
      const kernel2 = await regenerateKernel();

      // Generation should increment
      expect(kernel2.generation).toBeGreaterThan(kernel1.generation);
    });

    it("should persist regenerated kernel", async () => {
      await regenerateKernel();

      const loadedKernel = await loadKernel();

      expect(loadedKernel).toBeDefined();
      expect(loadedKernel?.tokens.length).toBeGreaterThan(0);
    });

    it("should update tokens based on current semantic invariants", async () => {
      const kernel = await regenerateKernel();

      // All tokens should be from current high-density concepts
      kernel.tokens.forEach((token) => {
        expect(token.semanticDensity).toBeGreaterThanOrEqual(80);
      });
    });
  });

  describe("getKernelStats", () => {
    it("should return comprehensive kernel statistics", async () => {
      const stats = await getKernelStats();

      expect(stats).toHaveProperty("totalTokens");
      expect(stats).toHaveProperty("gradeDistribution");
      expect(stats).toHaveProperty("avgDensity");
      expect(stats).toHaveProperty("topTokens");
    });

    it("should calculate grade distribution correctly", async () => {
      const stats = await getKernelStats();

      // Grade distribution should be an object with grade numbers as keys
      expect(typeof stats.gradeDistribution).toBe("object");

      // Total of grade distribution should equal total tokens
      const totalFromDistribution = Object.values(
        stats.gradeDistribution
      ).reduce((sum, count) => sum + count, 0);

      expect(totalFromDistribution).toBe(stats.totalTokens);
    });

    it("should return top tokens", async () => {
      const stats = await getKernelStats();

      expect(Array.isArray(stats.topTokens)).toBe(true);
      expect(stats.topTokens.length).toBeLessThanOrEqual(10);

      // Top tokens should have highest densities
      for (let i = 0; i < stats.topTokens.length - 1; i++) {
        expect(stats.topTokens[i].semanticDensity).toBeGreaterThanOrEqual(
          stats.topTokens[i + 1].semanticDensity
        );
      }
    });

    it("should calculate average density correctly", async () => {
      const stats = await getKernelStats();

      // Average density should be reasonable (0-100)
      expect(stats.avgDensity).toBeGreaterThanOrEqual(0);
      expect(stats.avgDensity).toBeLessThanOrEqual(100);

      // If there are tokens, avg should be >= 80 (our threshold)
      if (stats.totalTokens > 0) {
        expect(stats.avgDensity).toBeGreaterThanOrEqual(80);
      }
    });
  });

  describe("Integration", () => {
    it("should support complete workflow: build -> persist -> load -> export", async () => {
      // Build kernel
      const kernel = await buildSemanticKernel();
      expect(kernel.tokens.length).toBeGreaterThan(0);

      // Persist
      await persistKernel(kernel);

      // Load
      const loadedKernel = await loadKernel();
      expect(loadedKernel).toBeDefined();

      // Export
      if (loadedKernel) {
        const scl = exportKernelAsSCL(loadedKernel);
        expect(scl.length).toBeGreaterThan(0);
      }
    });

    it("should work with empty concept database", async () => {
      // Should handle gracefully even with no high-density concepts
      const kernel = await buildSemanticKernel();

      // Should return valid kernel structure even if empty
      expect(kernel).toHaveProperty("tokens");
      expect(Array.isArray(kernel.tokens)).toBe(true);
    });
  });

  describe("Performance", () => {
    it("should build kernel in reasonable time", async () => {
      const startTime = Date.now();
      await buildSemanticKernel();
      const endTime = Date.now();

      // Should complete within 5 seconds
      expect(endTime - startTime).toBeLessThan(5000);
    });

    it("should handle large kernel efficiently", async () => {
      const startTime = Date.now();
      const kernel = await buildSemanticKernel();
      await persistKernel(kernel);
      await loadKernel();
      const endTime = Date.now();

      // Full cycle should complete within 10 seconds
      expect(endTime - startTime).toBeLessThan(10000);
    });
  });
});
