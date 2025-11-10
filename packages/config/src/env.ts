/**
 * Environment variables
 */

export interface Env {
  OPENAI_API_KEY?: string
  ANTHROPIC_API_KEY?: string
  GEMINI_API_KEY?: string
  NODE_ENV?: string
}

export function getEnv(): Env {
  // In Cloudflare Workers, env is passed to handler
  // In Node.js, use process.env
  // For edge compatibility, check if process exists
  const proc = (typeof globalThis !== 'undefined' && (globalThis as any).process) || undefined
  
  return {
    OPENAI_API_KEY: proc?.env?.OPENAI_API_KEY,
    ANTHROPIC_API_KEY: proc?.env?.ANTHROPIC_API_KEY,
    GEMINI_API_KEY: proc?.env?.GEMINI_API_KEY,
    NODE_ENV: proc?.env?.NODE_ENV || 'development',
  }
}
