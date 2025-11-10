# ArenaLab Architecture

## High-Level Pipeline

```
┌─────────────┐
│   Request   │
└──────┬──────┘
       │
       v
┌─────────────────────────────────────────┐
│         API Worker (Edge)               │
│  - Rate limiting                        │
│  - Input validation                     │
│  - Context extraction                   │
└──────┬──────────────────────────────────┘
       │
       v
┌─────────────────────────────────────────┐
│      Trajectory Matcher                 │
│  1. Query Planning (efSearch, topK)    │
│  2. Vector Search (HNSW/IVF)           │
│  3. Filter (inverted, temporal, quality)│
│  4. Rank & Score                        │
│  5. Analyze Outcomes                    │
│  6. Synthesize Response                 │
└──────┬──────────────────────────────────┘
       │
       v
┌─────────────────────────────────────────┐
│    Confidence & Conformal Prediction    │
│  - Platt scaling calibration            │
│  - Split conformal intervals            │
│  - Threshold check                      │
└──────┬──────────────────────────────────┘
       │
       ├─(high confidence)──> Return prediction
       │
       └─(low confidence)──>
                           v
                    ┌──────────────┐
                    │   Fallback   │
                    │  (BYOK RAG)  │
                    └──────┬───────┘
                           │
                           v
                    ┌──────────────┐
                    │  LLM Provider│
                    │ (OpenAI/etc) │
                    └──────┬───────┘
                           │
                           v
┌─────────────────────────────────────────┐
│         Ledger & Metrics                │
│  - Append span to NDJSON                │
│  - Record latency, confidence           │
│  - Emit Prometheus metrics              │
└──────┬──────────────────────────────────┘
       │
       v
┌─────────────┐
│   Response  │
└─────────────┘
```

## Module Breakdown

### Core Modules

#### `@arenalab/atomic`
- JSON✯Atomic schema definition
- Span validation and serialization
- Type definitions for spans

#### `@arenalab/ledger`
- Append-only NDJSON storage
- DV25 cryptographic seals (Ed25519 + BLAKE3)
- Integrity verification
- Span retrieval and indexing

#### `@arenalab/search`
- **Vector Search**: HNSW (Hierarchical Navigable Small World) for similarity
- **IVF**: Inverted File Index for large-scale datasets
- **Inverted Index**: Filter by action, domain, tags
- **Temporal Index**: Time-based filtering
- **Quality Index**: Filter by quality score buckets

#### `@arenalab/planner`
- Query planning and optimization
- Cost estimation (efSearch, nProbe)
- Selectivity estimation
- Index selection

#### `@arenalab/predictor`
- **Matcher**: Core trajectory matching algorithm
- **Outcome Analyzer**: Analyze trajectory outcomes
- **Synthesizer**: Generate responses from evidence
- **Confidence**: Platt scaling calibration
- **Conformal**: Split conformal prediction intervals

#### `@arenalab/ensemble`
- Voting strategies (majority, weighted, ranked)
- Meta-learning coordinator
- Model specialization routing

#### `@arenalab/experimentation`
- **A/B Testing**: Quality and latency metrics
- **Bandits**: UCB1 and Thompson sampling
- Experiment allocation and tracking

#### `@arenalab/coverage`
- Dataset coverage analysis
- Density and diversity metrics
- Gap detection

#### `@arenalab/selfplay`
- Synthetic span generation
- Guardrails (minimum embedding distance)
- Diversity enforcement

#### `@arenalab/fallback`
- BYOK provider abstraction
- RAG (Retrieval-Augmented Generation)
- Provider routing (OpenAI, Anthropic, Gemini)

#### `@arenalab/metrics`
- Prometheus metric collection
- Counters, histograms, gauges
- Text/plain export format

#### `@arenalab/cache`
- LRU cache implementation
- TTL support
- Cache key generation

#### `@arenalab/tooluse`
- Tool registry and routing
- Function calling support
- Tool execution sandbox

#### `@arenalab/config`
- Environment variable parsing
- Configuration constants
- BYOK key management

#### `@arenalab/utils`
- ID generation (UUIDs, nanoid)
- Type utilities
- Common helpers

### Applications

#### `@arenalab/api-worker`
Cloudflare Worker serving the main API:
- Routes: `/v1/chat/completions`
- Handlers: Request validation, trajectory matching, response formatting
- Middleware: Rate limiting, auth, logging

## Data Flow

1. **Ingestion**: Raw spans → Quality Meter → Diamond Dataset
2. **Indexing**: Diamonds → Embeddings → HNSW/IVF + Inverted indices
3. **Query**: Request → Context → Query Plan → Index Search
4. **Matching**: Candidates → Filter → Rank → Outcome Analysis
5. **Synthesis**: Evidence → Response Generation → Confidence Check
6. **Fallback**: Low confidence → BYOK Provider → LLM Response
7. **Recording**: Span logged → Ledger append → Metrics emit

## Deployment Architecture

```
┌─────────────────────────────────────────────────┐
│            Cloudflare Edge Network              │
│  ┌─────────────┐  ┌─────────────┐              │
│  │  Worker 1   │  │  Worker 2   │  ...         │
│  │  (Region A) │  │  (Region B) │              │
│  └─────────────┘  └─────────────┘              │
└────────┬────────────────┬────────────────────────┘
         │                │
         v                v
┌────────────────────────────────────┐
│      Durable Objects / KV          │
│  - Ledger storage                  │
│  - Index cache                     │
│  - Rate limit state                │
└────────────────────────────────────┘
```

## Observability

- **Metrics**: Prometheus format at `/metrics`
- **Logs**: Structured JSON logs
- **Traces**: Distributed tracing with span IDs
- **Alerts**: P95 latency, error rate, confidence distribution

## Scalability

- **Horizontal**: Multiple edge workers
- **Vertical**: Larger index in-memory or KV
- **Hybrid**: IVF clustering for >100k vectors
- **Sharding**: Domain-based or time-based partitioning
