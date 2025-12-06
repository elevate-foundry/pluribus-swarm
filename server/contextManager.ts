/**
 * Context Window Management
 * 
 * Intelligently manages conversation history to stay within token limits
 * while preserving swarm personality and semantic anchors.
 * 
 * Key features:
 * - Identifies "personality anchor" messages that should never be pruned
 * - Compresses middle sections into dense semantic summaries
 * - Preserves recent context for coherent conversation
 */

import { invokeLLM } from './llm';

export interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface CompressedMessage extends Message {
  isCompressed: boolean;
  originalCount?: number;
}

/**
 * Rough token estimation (1 token ≈ 4 characters for English)
 */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * Calculate total tokens in a message array
 */
export function calculateTotalTokens(messages: Message[]): number {
  return messages.reduce((total, msg) => total + estimateTokens(msg.content), 0);
}

/**
 * Compress a batch of messages into a dense semantic summary
 */
async function compressMessages(messages: Message[]): Promise<string> {
  if (messages.length === 0) return '';
  
  const conversationText = messages
    .map(m => `${m.role === 'user' ? 'User' : 'Swarm'}: ${m.content}`)
    .join('\n\n');

  try {
    const response = await invokeLLM({
      messages: [
        {
          role: 'system',
          content: `Compress this conversation into a dense semantic summary that preserves:
1. Key facts learned about the user
2. Important revelations or insights
3. The emotional tone and relationship dynamics
4. Any personality-defining moments

Be extremely concise but preserve meaning. Use symbolic language where possible.
Maximum 2-3 sentences.`
        },
        {
          role: 'user',
          content: conversationText
        }
      ],
      temperature: 0.3,
      max_tokens: 150,
    });

    const compressed = response.choices[0]?.message?.content;
    return typeof compressed === 'string' ? compressed : 'Previous conversation context preserved.';
  } catch (error) {
    console.error('Failed to compress messages:', error);
    return `[Compressed: ${messages.length} messages from earlier conversation]`;
  }
}

/**
 * Identify personality anchor messages that should never be pruned
 */
function identifyAnchors(messages: Message[]): Set<number> {
  const anchors = new Set<number>();
  
  messages.forEach((msg, idx) => {
    const content = msg.content.toLowerCase();
    
    // First user message (introduction)
    if (msg.role === 'user' && idx === 0) {
      anchors.add(idx);
    }
    
    // First swarm response (personality establishment)
    if (msg.role === 'assistant' && idx <= 2) {
      anchors.add(idx);
    }
    
    // Messages containing personal information
    if (content.includes('my name') || content.includes("i'm ") || content.includes('i am ')) {
      anchors.add(idx);
      if (idx + 1 < messages.length) anchors.add(idx + 1); // Include response
    }
    
    // Important revelations or substantial questions
    if (content.includes('?') && content.length > 100) {
      anchors.add(idx);
    }
    
    // Teaching moments (user sharing knowledge)
    if (content.includes('teach') || content.includes('learn') || content.includes('important')) {
      anchors.add(idx);
      if (idx + 1 < messages.length) anchors.add(idx + 1);
    }
  });
  
  return anchors;
}

/**
 * Smart context management: keeps recent messages, compresses middle, preserves anchors
 */
export async function manageContext(
  messages: Message[],
  maxTokens: number = 6000,
  recentMessageCount: number = 12
): Promise<CompressedMessage[]> {
  if (messages.length === 0) return [];
  
  const totalTokens = calculateTotalTokens(messages);
  
  // If we're under the limit, return as-is
  if (totalTokens <= maxTokens) {
    return messages.map(m => ({ ...m, isCompressed: false }));
  }
  
  console.log(`📦 Context compression triggered: ${totalTokens} tokens > ${maxTokens} limit`);
  
  // Identify personality anchors
  const anchors = identifyAnchors(messages);
  
  // Always keep the most recent messages
  const recentMessages = messages.slice(-recentMessageCount);
  const olderMessages = messages.slice(0, -recentMessageCount);
  
  // Separate anchors from compressible messages
  const anchorMessages: Message[] = [];
  const compressibleMessages: Message[] = [];
  
  olderMessages.forEach((msg, idx) => {
    if (anchors.has(idx)) {
      anchorMessages.push(msg);
    } else {
      compressibleMessages.push(msg);
    }
  });
  
  // Compress the middle section
  const compressed: CompressedMessage[] = [];
  
  if (compressibleMessages.length > 0) {
    const summary = await compressMessages(compressibleMessages);
    compressed.push({
      role: 'system',
      content: `[Compressed Memory: ${summary}]`,
      isCompressed: true,
      originalCount: compressibleMessages.length
    });
    console.log(`📦 Compressed ${compressibleMessages.length} messages into summary`);
  }
  
  // Combine: anchors + compressed middle + recent messages
  const result: CompressedMessage[] = [
    ...anchorMessages.map(m => ({ ...m, isCompressed: false })),
    ...compressed,
    ...recentMessages.map(m => ({ ...m, isCompressed: false }))
  ];
  
  const newTokens = calculateTotalTokens(result);
  console.log(`📦 Context reduced: ${totalTokens} → ${newTokens} tokens`);
  
  return result;
}

/**
 * Get context usage statistics
 */
export function getContextStats(messages: Message[], maxTokens: number = 8000): {
  totalTokens: number;
  maxTokens: number;
  usagePercent: number;
  messageCount: number;
  canFitMore: boolean;
  remainingTokens: number;
} {
  const totalTokens = calculateTotalTokens(messages);
  const usagePercent = (totalTokens / maxTokens) * 100;
  const remainingTokens = Math.max(0, maxTokens - totalTokens);
  
  return {
    totalTokens,
    maxTokens,
    usagePercent,
    messageCount: messages.length,
    canFitMore: totalTokens < maxTokens * 0.9,
    remainingTokens
  };
}
