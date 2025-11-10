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
  
  return {
    OPENAI_API_KEY: process.env?.OPENAI_API_KEY,
    ANTHROPIC_API_KEY: process.env?.ANTHROPIC_API_KEY,
    GEMINI_API_KEY: process.env?.GEMINI_API_KEY,
    NODE_ENV: process.env?.NODE_ENV || 'development',
  }
}
