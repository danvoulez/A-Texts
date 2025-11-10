# ArenaLab API Documentation

## Endpoint

```
POST /v1/chat/completions
```

OpenAI-compatible chat completions endpoint.

## Request Schema

```typescript
interface ChatCompletionRequest {
  messages: Message[]
  max_tokens?: number
  temperature?: number
  top_p?: number
  stream?: boolean
  model?: string  // Optional, defaults to arenalab-creature
}

interface Message {
  role: 'system' | 'user' | 'assistant'
  content: string
}
```

## Response Schema

```typescript
interface ChatCompletionResponse {
  id: string
  object: 'chat.completion'
  created: number
  model: string
  choices: Choice[]
  usage: Usage
  arenalab?: ArenaLabMetadata  // Extension
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
  confidence: number              // 0-100
  trajectories_used: number       // Number of similar trajectories found
  method: string                  // 'trajectory_matching' | 'synthesis' | 'fallback'
  evidence?: Evidence[]           // Supporting evidence from trajectories
  plan?: QueryPlan                // Query execution plan
  ledger_hash?: string            // Hash for audit trail
}

interface Evidence {
  trajectory_id: string
  similarity: number
  outcome: string
  context: any
}
```

## Example Request

```bash
curl https://api.arenalab.ai/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -d '{
    "messages": [
      {"role": "user", "content": "What is the capital of France?"}
    ],
    "max_tokens": 100
  }'
```

## Example Response

```json
{
  "id": "chatcmpl-abc123",
  "object": "chat.completion",
  "created": 1699999999,
  "model": "arenalab-creature",
  "choices": [{
    "index": 0,
    "message": {
      "role": "assistant",
      "content": "The capital of France is Paris."
    },
    "finish_reason": "stop"
  }],
  "usage": {
    "prompt_tokens": 14,
    "completion_tokens": 8,
    "total_tokens": 22
  },
  "arenalab": {
    "confidence": 95,
    "trajectories_used": 127,
    "method": "trajectory_matching",
    "evidence": [
      {
        "trajectory_id": "traj_xyz789",
        "similarity": 0.98,
        "outcome": "Paris is the capital and largest city of France.",
        "context": {"domain": "geography"}
      }
    ]
  }
}
```

## Fallback Behavior

When confidence is below threshold (default: 50%), the system can fallback to configured LLM providers:

1. Check trajectory matching confidence
2. If confidence < 50%, invoke fallback provider (BYOK)
3. Return fallback response with `method: "fallback"` in metadata
4. Log span for future learning

## Rate Limits

- Free tier: 60 requests/minute, 10k requests/day
- Hobby tier: 600 requests/minute, 100k requests/day
- Pro tier: 6000 requests/minute, 1M requests/day
- Enterprise: Custom limits

## Error Codes

- `400` - Bad request (invalid JSON, missing required fields)
- `401` - Unauthorized (invalid API key)
- `429` - Rate limit exceeded
- `500` - Internal server error
- `503` - Service unavailable

## Streaming (Optional)

Set `stream: true` in request for server-sent events:

```bash
curl https://api.arenalab.ai/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -d '{
    "messages": [{"role": "user", "content": "Tell me a story"}],
    "stream": true
  }'
```

Response will be streamed as SSE:

```
data: {"id":"chatcmpl-123","choices":[{"delta":{"content":"Once"}}]}

data: {"id":"chatcmpl-123","choices":[{"delta":{"content":" upon"}}]}

data: [DONE]
```
