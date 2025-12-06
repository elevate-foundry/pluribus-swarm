import { describe, it, expect } from "vitest";
import { analyzeUserPatterns, generateMetaInstructions, injectMetaInstructions } from "./metaController";

describe("Meta-Controller", () => {
  it("should analyze user patterns from conversation history", async () => {
    // This test requires a user with conversation history
    // For now, we'll test with user ID 1 (assuming test data exists)
    const patterns = await analyzeUserPatterns(1);
    
    expect(patterns).toHaveProperty("messageCount");
    expect(patterns).toHaveProperty("avgMessageLength");
    expect(patterns).toHaveProperty("questionRatio");
    expect(patterns).toHaveProperty("conceptDensity");
    expect(patterns).toHaveProperty("communicationStyle");
    expect(["concise", "detailed", "exploratory", "challenging"]).toContain(patterns.communicationStyle);
  }, 30000);

  it("should generate meta-instructions based on patterns", async () => {
    const metaInstructions = await generateMetaInstructions(1);
    
    expect(metaInstructions).toHaveProperty("tone");
    expect(metaInstructions).toHaveProperty("verbosity");
    expect(metaInstructions).toHaveProperty("toolGuidance");
    expect(metaInstructions).toHaveProperty("evaluationCriteria");
    expect(metaInstructions).toHaveProperty("communicationApproach");
    
    // All instructions should be non-empty strings
    expect(metaInstructions.tone.length).toBeGreaterThan(0);
    expect(metaInstructions.verbosity.length).toBeGreaterThan(0);
  }, 30000);

  it("should inject meta-instructions into system prompt", async () => {
    const basePrompt = "You are the Pluribus Swarm.";
    const adaptedPrompt = await injectMetaInstructions(1, basePrompt);
    
    expect(adaptedPrompt).toContain(basePrompt);
    expect(adaptedPrompt).toContain("ADAPTIVE BEHAVIOR INSTRUCTIONS");
    expect(adaptedPrompt.length).toBeGreaterThan(basePrompt.length);
  }, 30000);

  it("should adapt behavior based on message length patterns", async () => {
    // Test that short messages lead to concise instructions
    const patterns = await analyzeUserPatterns(1);
    const metaInstructions = await generateMetaInstructions(1);
    
    if (patterns.avgMessageLength < 50) {
      expect(metaInstructions.verbosity.toLowerCase()).toContain("concise");
    } else if (patterns.avgMessageLength > 150) {
      expect(metaInstructions.verbosity.toLowerCase()).toContain("detailed");
    }
  }, 30000);
});
