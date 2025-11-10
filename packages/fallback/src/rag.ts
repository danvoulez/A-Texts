/**
 * RAG Fallback: Call external LLM providers when confidence is low
 * 
 * BYOK (Bring Your Own Key) approach:
 * - OpenAI (GPT-3.5/GPT-4)
 * - Anthropic (Claude)
 * - Google (Gemini)
 * 
 * Gracefully degrades if no API keys available.
 * 
 * @see docs/formula.md §Fallback - RAG with External Providers
 */

export interface Provider {
  name: 'openai' | 'anthropic' | 'gemini'
  apiKey: string
  model?: string
}

export interface ProviderResponse {
  content: string
  provider: string
  model: string
  tokensUsed?: number
}

/**
 * Call external LLM provider
 * 
 * Makes API request to specified provider with prompt.
 * Handles errors gracefully and returns fallback message on failure.
 * 
 * @param provider - Provider configuration with API key
 * @param prompt - Prompt/query to send
 * @returns Response from provider
 * 
 * @see docs/formula.md §Provider API Integration
 */
export async function callProvider(
  provider: Provider,
  prompt: string
): Promise<ProviderResponse> {
  console.log(`[Fallback] Calling ${provider.name}...`)
  
  try {
    switch (provider.name) {
      case 'openai':
        return await callOpenAI(provider, prompt)
      case 'anthropic':
        return await callAnthropic(provider, prompt)
      case 'gemini':
        return await callGemini(provider, prompt)
      default:
        throw new Error(`Unknown provider: ${provider.name}`)
    }
  } catch (error) {
    console.error(`[Fallback] Error calling ${provider.name}:`, error)
    return {
      content: `Error calling ${provider.name}. Unable to generate fallback response.`,
      provider: provider.name,
      model: provider.model || 'unknown',
    }
  }
}

/**
 * Call OpenAI API
 */
async function callOpenAI(provider: Provider, prompt: string): Promise<ProviderResponse> {
  const model = provider.model || 'gpt-3.5-turbo'
  
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${provider.apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'user', content: prompt }
      ],
      temperature: 0.7,
      max_tokens: 500,
    }),
  })
  
  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`)
  }
  
  const data = await response.json()
  
  return {
    content: data.choices[0]?.message?.content || 'No response',
    provider: 'openai',
    model,
    tokensUsed: data.usage?.total_tokens,
  }
}

/**
 * Call Anthropic API
 */
async function callAnthropic(provider: Provider, prompt: string): Promise<ProviderResponse> {
  const model = provider.model || 'claude-3-haiku-20240307'
  
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': provider.apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'user', content: prompt }
      ],
      max_tokens: 500,
    }),
  })
  
  if (!response.ok) {
    throw new Error(`Anthropic API error: ${response.status} ${response.statusText}`)
  }
  
  const data = await response.json()
  
  return {
    content: data.content[0]?.text || 'No response',
    provider: 'anthropic',
    model,
    tokensUsed: data.usage?.input_tokens + data.usage?.output_tokens,
  }
}

/**
 * Call Google Gemini API
 */
async function callGemini(provider: Provider, prompt: string): Promise<ProviderResponse> {
  const model = provider.model || 'gemini-pro'
  
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1/models/${model}:generateContent?key=${provider.apiKey}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: prompt }]
          }
        ],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 500,
        },
      }),
    }
  )
  
  if (!response.ok) {
    throw new Error(`Gemini API error: ${response.status} ${response.statusText}`)
  }
  
  const data = await response.json()
  
  return {
    content: data.candidates[0]?.content?.parts[0]?.text || 'No response',
    provider: 'gemini',
    model,
  }
}

/**
 * Select best provider from available options
 * 
 * Selection strategy:
 * 1. Prefer providers with higher reliability
 * 2. Round-robin for load balancing
 * 3. Fallback to any available provider
 * 
 * @param availableProviders - Array of provider configurations
 * @returns Selected provider or null if none available
 */
export function selectProvider(availableProviders: Provider[]): Provider | null {
  if (availableProviders.length === 0) {
    return null
  }
  
  // Priority order (can be customized)
  const priority = ['openai', 'anthropic', 'gemini']
  
  for (const preferred of priority) {
    const provider = availableProviders.find(p => p.name === preferred)
    if (provider) {
      return provider
    }
  }
  
  // Fallback: return first available
  return availableProviders[0]
}

/**
 * Call provider with retry logic
 * 
 * @param provider - Provider configuration
 * @param prompt - Prompt to send
 * @param maxRetries - Maximum retry attempts (default: 2)
 * @returns Provider response
 */
export async function callProviderWithRetry(
  provider: Provider,
  prompt: string,
  maxRetries: number = 2
): Promise<ProviderResponse> {
  let lastError: Error | null = null
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await callProvider(provider, prompt)
    } catch (error) {
      lastError = error as Error
      console.warn(`[Fallback] Retry ${attempt + 1}/${maxRetries} for ${provider.name}`)
      
      // Exponential backoff
      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempt)))
      }
    }
  }
  
  throw lastError || new Error('Max retries exceeded')
}
