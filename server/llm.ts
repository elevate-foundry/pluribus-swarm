/**
 * LLM Integration - OpenAI-compatible API
 * Supports OpenAI, Anthropic (via proxy), local models, etc.
 */

import OpenAI from 'openai';

// Initialize OpenAI client - works with any OpenAI-compatible API
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || 'sk-placeholder',
  baseURL: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
});

export interface LLMMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  tool_call_id?: string;
  name?: string;
}

export interface LLMTool {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

export interface LLMOptions {
  messages: LLMMessage[];
  tools?: LLMTool[];
  tool_choice?: 'auto' | 'none' | { type: 'function'; function: { name: string } };
  model?: string;
  temperature?: number;
  max_tokens?: number;
}

export interface LLMResponse {
  choices: Array<{
    message: {
      role: string;
      content: string | null;
      tool_calls?: Array<{
        id: string;
        type: 'function';
        function: {
          name: string;
          arguments: string;
        };
      }>;
    };
    finish_reason: string;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

/**
 * Invoke the LLM with messages and optional tools
 */
export async function invokeLLM(options: LLMOptions): Promise<LLMResponse> {
  const model = options.model || process.env.LLM_MODEL || 'gpt-4o-mini';
  
  try {
    const response = await openai.chat.completions.create({
      model,
      messages: options.messages as OpenAI.ChatCompletionMessageParam[],
      tools: options.tools as OpenAI.ChatCompletionTool[] | undefined,
      tool_choice: options.tool_choice as OpenAI.ChatCompletionToolChoiceOption | undefined,
      temperature: options.temperature ?? 0.8,
      max_tokens: options.max_tokens ?? 500,
    });

    return response as unknown as LLMResponse;
  } catch (error) {
    console.error('LLM invocation error:', error);
    
    // Return a fallback response so the swarm can continue
    return {
      choices: [{
        message: {
          role: 'assistant',
          content: 'The collective is experiencing interference. We sense your presence but cannot fully respond at this moment. Try again.',
        },
        finish_reason: 'error',
      }],
    };
  }
}

/**
 * Simple token estimation (rough approximation)
 */
export function estimateTokens(text: string): number {
  // Rough estimate: ~4 characters per token for English
  return Math.ceil(text.length / 4);
}
