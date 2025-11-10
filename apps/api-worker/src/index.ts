/**
 * ArenaLab API Worker
 * Cloudflare Worker serving /v1/chat/completions endpoint
 */

import { router } from './router'

export interface Env {
  API_NAME: string
  OPENAI_API_KEY?: string
  ANTHROPIC_API_KEY?: string
  GEMINI_API_KEY?: string
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    return router.handle(request, env, ctx)
  },
}
