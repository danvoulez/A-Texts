/**
 * Router: Handle HTTP requests and route to appropriate handlers
 */

import { handleChat } from './handlers/chat'
import type { Env } from './index'

class Router {
  async handle(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url)
    const path = url.pathname

    // CORS headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    }

    // Handle OPTIONS (CORS preflight)
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders })
    }

    // Route: POST /v1/chat/completions
    if (path === '/v1/chat/completions' && request.method === 'POST') {
      const response = await handleChat(request, env, ctx)
      // Add CORS headers to response
      Object.entries(corsHeaders).forEach(([key, value]) => {
        response.headers.set(key, value)
      })
      return response
    }

    // Route: GET /health
    if (path === '/health' && request.method === 'GET') {
      return new Response(JSON.stringify({ status: 'ok' }), {
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      })
    }

    // Route: GET /metrics
    if (path === '/metrics' && request.method === 'GET') {
      // TODO: Return Prometheus metrics
      return new Response('# TODO: Prometheus metrics\n', {
        headers: { 'Content-Type': 'text/plain', ...corsHeaders },
      })
    }

    // 404 Not Found
    return new Response(JSON.stringify({ error: 'Not Found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    })
  }
}

export const router = new Router()
