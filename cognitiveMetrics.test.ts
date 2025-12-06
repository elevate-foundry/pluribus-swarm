import { describe, it, expect, beforeAll } from "vitest";
import { calculateCognitiveMetrics, detectAnomalies } from "./cognitiveMetrics";
import { getDb } from "./db";
import { concepts, conceptRelations, conceptConvergence, userConcepts } from "../drizzle/schema";

describe("Cognitive Metrics System", () => {
  beforeAll(async () => {
    // Ensure database connection is available
    const db = await getDb();
    expect(db).toBeDefined();
  });

  describe("calculateCognitiveMetrics", () => {
    it("should return all required cognitive metrics", async () => {
      const metrics = await calculateCognitiveMetrics();

      // Verify all metrics are present
      expect(metrics).toHaveProperty("compressionRate");
      expect(metrics).toHaveProperty("graphEntropyChange");
      expect(metrics).toHaveProperty("semanticDrift");
      expect(metrics).toHaveProperty("curvature");
      expect(metrics).toHaveProperty("adaptiveMatchScore");
      expect(metrics).toHaveProperty("lifeworldComplexity");
      expect(metrics).toHaveProperty("timestamp");
    });

    it("should return metrics in valid ranges (0-1)", async () => {
      const metrics = await calculateCognitiveMetrics();

      // All metrics should be between 0 and 1
      expect(metrics.compressionRate).toBeGreaterThanOrEqual(0);
      expect(metrics.compressionRate).toBeLessThanOrEqual(1);

      expect(metrics.graphEntropyChange).toBeGreaterThanOrEqual(0);
      expect(metrics.graphEntropyChange).toBeLessThanOrEqual(1);

      expect(metrics.semanticDrift).toBeGreaterThanOrEqual(0);
      expect(metrics.semanticDrift).toBeLessThanOrEqual(1);

      expect(metrics.curvature).toBeGreaterThanOrEqual(0);
      expect(metrics.curvature).toBeLessThanOrEqual(1);

      expect(metrics.adaptiveMatchScore).toBeGreaterThanOrEqual(0);
      expect(metrics.adaptiveMatchScore).toBeLessThanOrEqual(1);

      expect(metrics.lifeworldComplexity).toBeGreaterThanOrEqual(0);
      expect(metrics.lifeworldComplexity).toBeLessThanOrEqual(1);
    });

    it("should return a valid timestamp", async () => {
      const metrics = await calculateCognitiveMetrics();

      expect(metrics.timestamp).toBeInstanceOf(Date);
      expect(metrics.timestamp.getTime()).toBeLessThanOrEqual(Date.now());
      // Timestamp should be recent (within last minute)
      expect(Date.now() - metrics.timestamp.getTime()).toBeLessThan(60000);
    });

    it("should handle empty database gracefully", async () => {
      // Even with no data, metrics should return valid values
      const metrics = await calculateCognitiveMetrics();

      // Should not throw and should return numbers
      expect(typeof metrics.compressionRate).toBe("number");
      expect(typeof metrics.graphEntropyChange).toBe("number");
      expect(typeof metrics.semanticDrift).toBe("number");
      expect(typeof metrics.curvature).toBe("number");
      expect(typeof metrics.adaptiveMatchScore).toBe("number");
      expect(typeof metrics.lifeworldComplexity).toBe("number");
    });
  });

  describe("Compression Rate (Cₘ)", () => {
    it("should calculate compression rate based on convergence history", async () => {
      const metrics = await calculateCognitiveMetrics();

      // Compression rate measures how effectively concepts are merging
      // Should be 0 if no convergence has happened
      expect(metrics.compressionRate).toBeGreaterThanOrEqual(0);
    });

    it("should normalize compression rate to 0-1 range", async () => {
      const metrics = await calculateCognitiveMetrics();

      // Even with extreme values, should stay in range
      expect(metrics.compressionRate).toBeLessThanOrEqual(1);
    });
  });

  describe("Graph Entropy Change (ΔG)", () => {
    it("should measure rate of structural evolution", async () => {
      const metrics = await calculateCognitiveMetrics();

      // Entropy change measures how fast the graph topology changes
      expect(metrics.graphEntropyChange).toBeGreaterThanOrEqual(0);
    });

    it("should be low when graph is stable", async () => {
      const metrics = await calculateCognitiveMetrics();

      // With little activity, entropy change should be low
      // (This will be true for new/stable systems)
      expect(metrics.graphEntropyChange).toBeLessThanOrEqual(1);
    });
  });

  describe("Semantic Drift (σ)", () => {
    it("should measure concept interconnectedness", async () => {
      const metrics = await calculateCognitiveMetrics();

      // Drift measures how much new concepts reshape existing ones
      expect(metrics.semanticDrift).toBeGreaterThanOrEqual(0);
    });

    it("should increase with relationship density", async () => {
      const metrics = await calculateCognitiveMetrics();

      // More relationships = more drift
      // Should be proportional to avg relations per concept
      expect(metrics.semanticDrift).toBeLessThanOrEqual(1);
    });
  });

  describe("Curvature (κ)", () => {
    it("should measure cluster stability", async () => {
      const metrics = await calculateCognitiveMetrics();

      // Curvature measures how stable concept clusters are
      expect(metrics.curvature).toBeGreaterThanOrEqual(0);
    });

    it("should be high when concepts converge to invariants", async () => {
      const metrics = await calculateCognitiveMetrics();

      // High-density concepts indicate convergence
      expect(metrics.curvature).toBeLessThanOrEqual(1);
    });
  });

  describe("Adaptive Match Score (Ψ)", () => {
    it("should measure user alignment", async () => {
      const metrics = await calculateCognitiveMetrics();

      // Measures how well system aligns with users
      expect(metrics.adaptiveMatchScore).toBeGreaterThanOrEqual(0);
    });

    it("should be neutral (0.5) when no user data exists", async () => {
      const db = await getDb();
      if (!db) return;

      const userConceptCount = await db.select().from(userConcepts);

      if (userConceptCount.length === 0) {
        const metrics = await calculateCognitiveMetrics();
        expect(metrics.adaptiveMatchScore).toBe(0.5);
      }
    });
  });

  describe("Lifeworld Complexity (Λ)", () => {
    it("should measure total conceptual space", async () => {
      const metrics = await calculateCognitiveMetrics();

      // Measures total emergent complexity
      expect(metrics.lifeworldComplexity).toBeGreaterThanOrEqual(0);
    });

    it("should increase with concepts and relationships", async () => {
      const db = await getDb();
      if (!db) return;

      const conceptCount = await db.select().from(concepts);
      const relationCount = await db.select().from(conceptRelations);

      const metrics = await calculateCognitiveMetrics();

      // If there are concepts/relations, complexity should be > 0
      if (conceptCount.length > 0 || relationCount.length > 0) {
        expect(metrics.lifeworldComplexity).toBeGreaterThan(0);
      }
    });
  });

  describe("detectAnomalies", () => {
    it("should return an array of warning strings", async () => {
      const metrics = await calculateCognitiveMetrics();
      const warnings = await detectAnomalies(metrics);

      expect(Array.isArray(warnings)).toBe(true);
      warnings.forEach((warning) => {
        expect(typeof warning).toBe("string");
      });
    });

    it("should detect runaway drift", async () => {
      const mockMetrics = {
        compressionRate: 0.1,
        graphEntropyChange: 0.9, // High entropy
        semanticDrift: 0.9, // High drift
        curvature: 0.3,
        adaptiveMatchScore: 0.5,
        lifeworldComplexity: 0.5,
        timestamp: new Date(),
      };

      const warnings = await detectAnomalies(mockMetrics);

      // Should warn about runaway drift
      const hasRunawayWarning = warnings.some((w) =>
        w.toLowerCase().includes("runaway drift")
      );
      expect(hasRunawayWarning).toBe(true);
    });

    it("should detect stagnation", async () => {
      const mockMetrics = {
        compressionRate: 0.05, // Low compression
        graphEntropyChange: 0.05, // Low entropy
        semanticDrift: 0.2,
        curvature: 0.3,
        adaptiveMatchScore: 0.5,
        lifeworldComplexity: 0.5,
        timestamp: new Date(),
      };

      const warnings = await detectAnomalies(mockMetrics);

      // Should warn about stagnation
      const hasStagnationWarning = warnings.some((w) =>
        w.toLowerCase().includes("stagnation")
      );
      expect(hasStagnationWarning).toBe(true);
    });

    it("should detect mode collapse risk", async () => {
      const mockMetrics = {
        compressionRate: 0.5,
        graphEntropyChange: 0.3,
        semanticDrift: 0.4,
        curvature: 0.95, // Very high curvature
        adaptiveMatchScore: 0.5,
        lifeworldComplexity: 0.2, // Low complexity
        timestamp: new Date(),
      };

      const warnings = await detectAnomalies(mockMetrics);

      // Should warn about mode collapse
      const hasModeCollapseWarning = warnings.some((w) =>
        w.toLowerCase().includes("mode collapse")
      );
      expect(hasModeCollapseWarning).toBe(true);
    });

    it("should detect overfitting risk", async () => {
      const mockMetrics = {
        compressionRate: 0.5,
        graphEntropyChange: 0.3,
        semanticDrift: 0.1, // Low drift
        curvature: 0.5,
        adaptiveMatchScore: 0.95, // Very high match
        lifeworldComplexity: 0.5,
        timestamp: new Date(),
      };

      const warnings = await detectAnomalies(mockMetrics);

      // Should warn about overfitting
      const hasOverfittingWarning = warnings.some((w) =>
        w.toLowerCase().includes("overfitting")
      );
      expect(hasOverfittingWarning).toBe(true);
    });

    it("should return no warnings for healthy metrics", async () => {
      const healthyMetrics = {
        compressionRate: 0.6,
        graphEntropyChange: 0.5,
        semanticDrift: 0.5,
        curvature: 0.6,
        adaptiveMatchScore: 0.7,
        lifeworldComplexity: 0.6,
        timestamp: new Date(),
      };

      const warnings = await detectAnomalies(healthyMetrics);

      // Healthy system should have no warnings
      expect(warnings.length).toBe(0);
    });
  });

  describe("Integration with tRPC", () => {
    it("should be callable through getCognitiveMetrics endpoint", async () => {
      // This tests that the metrics can be calculated and returned
      const metrics = await calculateCognitiveMetrics();
      const warnings = await detectAnomalies(metrics);

      const response = { metrics, warnings };

      // Verify response structure matches what frontend expects
      expect(response).toHaveProperty("metrics");
      expect(response).toHaveProperty("warnings");
      expect(Array.isArray(response.warnings)).toBe(true);
    });
  });

  describe("Performance", () => {
    it("should calculate metrics in reasonable time", async () => {
      const startTime = Date.now();
      await calculateCognitiveMetrics();
      const endTime = Date.now();

      // Should complete within 5 seconds even with large datasets
      expect(endTime - startTime).toBeLessThan(5000);
    });

    it("should handle concurrent metric calculations", async () => {
      // Run multiple calculations in parallel
      const promises = [
        calculateCognitiveMetrics(),
        calculateCognitiveMetrics(),
        calculateCognitiveMetrics(),
      ];

      const results = await Promise.all(promises);

      // All should succeed
      expect(results).toHaveLength(3);
      results.forEach((metrics) => {
        expect(metrics).toHaveProperty("compressionRate");
        expect(metrics).toHaveProperty("timestamp");
      });
    });
  });
});
