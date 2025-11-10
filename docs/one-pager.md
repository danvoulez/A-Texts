# ArenaLab One-Pager

## Vision
Transform LLM training from expensive GPU-intensive processes to accessible CPU-friendly trajectory matching. Enable anyone to create competitive AI models using curated datasets instead of backpropagation.

## Core Concept: Trajectory Matching
- **No Gradients**: Instead of training with backprop, we use pattern matching on high-quality trajectories
- **CPU-Friendly**: Runs on browsers and laptops, not GPU clusters
- **Interpretable**: Every prediction is backed by real examples from the dataset

## The Diamond Dataset
- **Quality First**: 5D quality meter (Completeness, Provenance, Impact, Uniqueness, Coherence)
- **Community-Driven**: Players curate and contribute high-quality spans
- **Gamified**: Turn data curation into an engaging gameplay experience

## Key Features
- **Edge-First**: Cloudflare Worker deployment with `/v1/chat/completions` endpoint
- **BYOK**: Bring Your Own Keys - fallback to OpenAI/Anthropic/Gemini when needed
- **JSON✯Atomic**: Structured span format for actions and outcomes
- **Constitutional AI**: Built-in values and safety through principles
- **Multi-Model Ensemble**: Combine multiple specialized models

## Performance Target
- **10k diamonds**: GPT-3 level (55-65% TruthfulQA)
- **100k diamonds**: GPT-3.5 level (65-75% TruthfulQA)
- **1M diamonds**: Claude 2 / GPT-4 base level (75-85% TruthfulQA)

## Economics
- **Training Cost**: $0-$100 (vs. $1M-$10M traditional)
- **Training Time**: 2-48 hours (vs. 3-12 months traditional)
- **Team Size**: 1 person (vs. 20-50 people traditional)
- **ROI**: >400,000%

## Architecture
- **Monorepo**: TypeScript-first with pnpm workspaces
- **Packages**: Modular design (search, predictor, ledger, metrics, etc.)
- **Edge Deployment**: Cloudflare Workers for global low-latency
- **Append-Only Ledger**: NDJSON with DV25 cryptographic seals
- **Observable**: Prometheus metrics, distributed tracing

## Why This Works
1. **Quality > Quantity**: 100k high-quality examples beats 100M noisy ones
2. **Pattern Matching**: Most AI tasks are pattern recognition, not creativity
3. **Incremental Learning**: Continuous improvement through community feedback
4. **Composability**: Combine multiple specialized models for better results
