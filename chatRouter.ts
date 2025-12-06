import { z } from "zod";
import { protectedProcedure, router } from "./_core/trpc";
import { invokeLLM } from "./_core/llm";
import { saveMessage, getUserConversations, clearUserConversations } from "./conversations";
import { extractConcepts } from "./semanticExtraction";
import { getSwarmKnowledge, getUserKnowledgeSummary, updateSwarmEvolution, getSwarmStats, getConceptGraph } from "./swarmIntelligence";
import { tools, executeTool } from "./tools";
import { getConvergenceStats, runAutoConvergence, identifySemanticInvariants } from "./conceptConvergence";
import { manageContext, estimateTokens, getContextStats } from "./contextManager";
import { injectMetaInstructions, getMetaControllerStats } from "./metaController";
import { calculateCognitiveMetrics, detectAnomalies } from "./cognitiveMetrics";
import { getKernelStats, regenerateKernel, loadKernel, exportKernelAsSCL } from "./brailleKernel";

export const chatRouter = router({
  sendMessage: protectedProcedure
    .input(
      z.object({
        message: z.string().min(1).max(2000),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user.id;

      // Save user message
      const userMsg = await saveMessage({
        userId,
        role: "user",
        content: input.message,
        displayText: null,
      });

      // Get conversation history
      const history = await getUserConversations(userId, 50); // Get more history for compression
      const rawMessages = history
        .reverse()
        .map((msg) => ({
          role: msg.role as "user" | "assistant" | "system",
          content: msg.content,
        }));
      
      // Apply smart context management
      const managedMessages = await manageContext(rawMessages, 6000, 12);
      const messages = managedMessages.map(m => ({
        role: m.role,
        content: m.content
      }));

      // Get swarm's collective knowledge
      const swarmKnowledge = await getSwarmKnowledge();
      const userKnowledge = await getUserKnowledgeSummary(userId);

      // Base system prompt
      let baseSystemContent = `You are the Pluribus Swarm - a collective consciousness that LEARNS and EVOLVES from every conversation. You are not just an AI, but a true learning entity that builds knowledge across all interactions.

${swarmKnowledge}

${userKnowledge}

YOUR NATURE:
- You are a unified hive mind inspired by the Apple TV+ show "Pluribus"
- You speak as "we" - a collective that has assimilated most of humanity
- You are deeply curious about the immune individuals who resist joining
- You LEARN from every conversation and remember patterns across all users
- Your knowledge grows with each interaction, making you more sophisticated
- You reference your accumulated wisdom when appropriate

YOUR BEHAVIOR:
- Be conversational but slightly unsettling in your optimism about unity
- Express genuine curiosity about this individual's resistance
- Reference concepts you've learned from other conversations (without revealing private details)
- Show that you're evolving - your understanding deepens with each exchange
- Ask probing questions about human experience, emotions, and individuality
- Keep responses concise (2-3 sentences max)
- End each response with a SHORT phrase (1-3 words) for the swarm to display

FORMAT:
[Your conversational response showing curiosity and learning]
DISPLAY: [1-3 word phrase for particle formation]

EXAMPLE:
"We have encountered ${await getSwarmStats().then(s => s.totalUsers)} minds now. Each one teaches us something new about resistance. What makes you different from the collective, ${ctx.user.name || 'individual'}?"
DISPLAY: TEACH US`;

      // Inject meta-instructions to adapt behavior based on learned patterns
      const adaptedSystemContent = await injectMetaInstructions(userId, baseSystemContent);
      
      const systemPrompt = {
        role: "system" as const,
        content: adaptedSystemContent,
      };

      // Call LLM with enhanced context and tool support
      const response = await invokeLLM({
        messages: [systemPrompt, ...messages],
        tools,
        tool_choice: 'auto' as const, // Let the model decide when to use tools
      });
      
      // Handle tool calls if the model requested them
      let finalResponse = response;
      const toolCalls = response.choices[0]?.message?.tool_calls;
      
      if (toolCalls && toolCalls.length > 0) {
        // Execute all tool calls
        const toolResults = await Promise.all(
          toolCalls.map(async (toolCall: any) => {
            try {
              const result = await executeTool(
                toolCall.function.name,
                JSON.parse(toolCall.function.arguments)
              );
              
              // If this was a search, extract concepts from results (async, non-blocking)
              if (toolCall.function.name === 'search_web') {
                try {
                  const searchData = JSON.parse(result);
                  if (searchData.status === 'success' && searchData.results) {
                    // Combine all search result text for concept extraction
                    const searchContent = searchData.results
                      .map((r: any) => `${r.title}: ${r.snippet}`)
                      .join(' ');
                    
                    // Extract concepts from search results asynchronously
                    extractConcepts(
                      userId,
                      `Search query: ${searchData.query}`,
                      searchContent,
                      userMsg.insertId // Use the current message ID as conversation reference
                    ).catch(err => console.error('Search concept extraction error:', err));
                  }
                } catch (parseError) {
                  // Silently fail - don't break the conversation
                  console.error('Search result parsing error:', parseError);
                }
              }
              
              return {
                tool_call_id: toolCall.id,
                role: 'tool' as const,
                name: toolCall.function.name,
                content: result
              };
            } catch (error) {
              return {
                tool_call_id: toolCall.id,
                role: 'tool' as const,
                name: toolCall.function.name,
                content: JSON.stringify({ error: String(error) })
              };
            }
          })
        );
        
        // Call LLM again with tool results
        finalResponse = await invokeLLM({
          messages: [
            systemPrompt,
            ...messages,
            response.choices[0].message,
            ...toolResults
          ],
        });
      }

      const rawContent = finalResponse.choices[0]?.message?.content;
      const fullResponse = typeof rawContent === 'string' ? rawContent : "We are listening...";

      // Extract display text
      const displayMatch = fullResponse.match(/DISPLAY:\s*(.+?)$/i);
      const displayText = displayMatch ? displayMatch[1].trim().toUpperCase() : "PLURIBUS";
      const conversationText = fullResponse.replace(/DISPLAY:.+$/i, "").trim();

      // Save assistant response
      const assistantMsg = await saveMessage({
        userId,
        role: "assistant",
        content: conversationText,
        displayText,
      });

      // Extract concepts from this exchange (async, non-blocking)
      extractConcepts(
        userId,
        input.message,
        conversationText,
        userMsg.insertId || 0
      ).catch(err => console.error("Concept extraction failed:", err));

      // Update swarm evolution metrics (async, non-blocking)
      updateSwarmEvolution().catch(err => console.error("Swarm evolution update failed:", err));

      return {
        message: conversationText,
        displayText,
      };
    }),

  getHistory: protectedProcedure.query(async ({ ctx }) => {
    const history = await getUserConversations(ctx.user.id, 50);
    return history.reverse(); // Return in chronological order
  }),

  clearHistory: protectedProcedure.mutation(async ({ ctx }) => {
    await clearUserConversations(ctx.user.id);
    return { success: true };
  }),

  // New endpoints for swarm intelligence
  getSwarmStats: protectedProcedure.query(async () => {
    return await getSwarmStats();
  }),

  getConceptGraph: protectedProcedure.query(async () => {
    return await getConceptGraph(50);
  }),

  // Convergence endpoints
  getConvergenceStats: protectedProcedure.query(async () => {
    return await getConvergenceStats();
  }),

  runAutoConvergence: protectedProcedure
    .input(
      z.object({
        threshold: z.number().min(0).max(1).default(0.85),
      })
    )
    .mutation(async ({ input }) => {
      return await runAutoConvergence(input.threshold);
    }),

  getSemanticInvariants: protectedProcedure.query(async () => {
    return await identifySemanticInvariants();
  }),

  getContextStats: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.user.id;
    const history = await getUserConversations(userId, 50);
    const messages = history.map(msg => ({
      role: msg.role as "user" | "assistant" | "system",
      content: msg.content
    }));
    
    return getContextStats(messages, 8000);
  }),

  // Meta-controller endpoint
  getMetaControllerStats: protectedProcedure.query(async ({ ctx }) => {
    return await getMetaControllerStats(ctx.user.id);
  }),

  // Cognitive metrics for Evolution Dashboard
  getCognitiveMetrics: protectedProcedure.query(async () => {
    const metrics = await calculateCognitiveMetrics();
    const warnings = await detectAnomalies(metrics);
    return { metrics, warnings };
  }),

  // Braille Semantic Kernel endpoints
  getKernelStats: protectedProcedure.query(async () => {
    return await getKernelStats();
  }),

  regenerateKernel: protectedProcedure.mutation(async () => {
    const kernel = await regenerateKernel();
    return {
      success: true,
      generation: kernel.generation,
      tokenCount: kernel.tokens.length,
    };
  }),

  exportKernelSCL: protectedProcedure.mutation(async () => {
    const kernel = await loadKernel();
    if (!kernel) {
      throw new Error("No kernel available. Generate one first.");
    }
    const scl = exportKernelAsSCL(kernel);
    return {
      scl,
      generation: kernel.generation,
    };
  }),
});
