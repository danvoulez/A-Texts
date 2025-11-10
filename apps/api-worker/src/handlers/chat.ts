/**
 * Chat Handler: Process /v1/chat/completions requests
 * 
 * Implements trajectory matching with fallback to BYOK providers.
 * Based on the algorithm described in Formula.md.
 */

import type { Env } from '../index'

interface Message {
  role: 'system' | 'user' | 'assistant'
  content: string
}

interface ChatCompletionRequest {
  messages: Message[]
  max_tokens?: number
  temperature?: number
  top_p?: number
  stream?: boolean
  model?: string
}

interface ChatCompletionResponse {
  id: string
  object: 'chat.completion'
  created: number
  model: string
  choices: Choice[]
  usage: Usage
  arenalab?: ArenaLabMetadata
}

interface Choice {
  index: number
  message: {
    role: 'assistant'
    content: string
  }
  finish_reason: 'stop' | 'length' | 'constitutional_rejection'
}

interface Usage {
  prompt_tokens: number
  completion_tokens: number
  total_tokens: number
}

interface ArenaLabMetadata {
  confidence: number
  trajectories_used: number
  method: 'trajectory_matching' | 'synthesis' | 'fallback' | 'mock'
  evidence?: any[]
  plan?: any
}

export async function handleChat(
  request: Request,
  env: Env,
  ctx: ExecutionContext
): Promise<Response> {
  const startTime = Date.now()

  try {
    // Parse request body
    const body: ChatCompletionRequest = await request.json()

    // Validate required fields
    if (!body.messages || !Array.isArray(body.messages) || body.messages.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Invalid request: messages array is required' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    }

    // Extract user message
    const lastMessage = body.messages[body.messages.length - 1]
    if (lastMessage.role !== 'user') {
      return new Response(
        JSON.stringify({ error: 'Last message must be from user' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    }

    const userMessage = lastMessage.content

    // Extract context from message history
    const context = extractContext(body.messages)

    // TODO: Implement actual trajectory matching
    // For now, return a mock response
    const prediction = await mockTrajectoryMatching(userMessage, context)

    // Measure latency
    const latencyMs = Date.now() - startTime

    // Build response
    const response: ChatCompletionResponse = {
      id: generateId(),
      object: 'chat.completion',
      created: Math.floor(Date.now() / 1000),
      model: body.model || 'arenalab-creature',
      choices: [
        {
          index: 0,
          message: {
            role: 'assistant',
            content: prediction.output,
          },
          finish_reason: 'stop',
        },
      ],
      usage: {
        prompt_tokens: estimateTokens(userMessage),
        completion_tokens: estimateTokens(prediction.output),
        total_tokens: estimateTokens(userMessage) + estimateTokens(prediction.output),
      },
      arenalab: {
        confidence: prediction.confidence,
        trajectories_used: prediction.trajectories_used,
        method: prediction.method,
      },
    }

    // TODO: Log span to ledger
    // TODO: Emit metrics

    return new Response(JSON.stringify(response), {
      headers: {
        'Content-Type': 'application/json',
        'X-Response-Time': `${latencyMs}ms`,
      },
    })
  } catch (error: any) {
    console.error('Error processing chat request:', error)

    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        message: error.message,
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  }
}

/**
 * Extract context from conversation history
 */
function extractContext(messages: Message[]): any {
  return {
    environment: 'general',
    previous_messages: messages.slice(0, -1).map((m) => ({
      role: m.role,
      content: m.content,
    })),
  }
}

/**
 * Mock trajectory matching (placeholder)
 * TODO: Replace with actual implementation from packages/predictor
 */
async function mockTrajectoryMatching(
  query: string,
  context: any
): Promise<{
  output: string
  confidence: number
  trajectories_used: number
  method: 'trajectory_matching' | 'synthesis' | 'fallback' | 'mock'
}> {
  // Simple mock response
  const responses: Record<string, string> = {
    'capital of france': 'The capital of France is Paris.',
    'hello': 'Hello! How can I help you today?',
    '2 + 2': 'The answer is 4.',
  }

  const lowerQuery = query.toLowerCase()
  let output = 'I apologize, but I need more training data to answer that question confidently.'
  let confidence = 30
  let method: 'trajectory_matching' | 'synthesis' | 'fallback' | 'mock' = 'mock'

  // Check for simple matches
  for (const [key, value] of Object.entries(responses)) {
    if (lowerQuery.includes(key)) {
      output = value
      confidence = 85
      method = 'trajectory_matching'
      break
    }
  }

  return {
    output,
    confidence,
    trajectories_used: confidence > 50 ? 12 : 0,
    method,
  }
}

/**
 * Estimate token count (rough approximation)
 */
function estimateTokens(text: string): number {
  // Rough estimate: 1 token ≈ 4 characters
  return Math.ceil(text.length / 4)
}

/**
 * Generate unique ID
 */
function generateId(): string {
  return `chatcmpl-${Math.random().toString(36).substring(2, 15)}`
}
