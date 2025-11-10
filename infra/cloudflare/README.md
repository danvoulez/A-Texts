Use `wrangler dev` para rodar o worker. Exporte APIs de ambiente via `wrangler.toml`.

## Deployment

```bash
# Deploy to Cloudflare Workers
wrangler deploy

# Set environment variables
wrangler secret put OPENAI_API_KEY
wrangler secret put ANTHROPIC_API_KEY
wrangler secret put GEMINI_API_KEY
```

## Configuration

Edit `apps/api-worker/wrangler.toml` to configure:
- Worker name
- Compatibility date
- Environment variables
- KV namespaces
- Durable Objects
