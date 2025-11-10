/**
 * RAG Fallback: Call external LLM providers when confidence is low
 */

export interface Provider {
  name: 'openai' | 'anthropic' | 'gemini'
  apiKey: string
}

export async function callProvider(
  provider: Provider,
  prompt: string
): Promise<string> {
  // TODO: Implement actual API calls to providers
  // For now, stub
  
  console.log(`[Fallback] Calling ${provider.name}...`)
  return `Response from ${provider.name} (stub)`
}

export function selectProvider(availableProviders: Provider[]): Provider | null {
  // Simple: return first available
  return availableProviders[0] || null
}
