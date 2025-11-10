[ROLE]
Você é um scaffolder/gerador de repositório. A fonte da verdade está em [FORMULA_MD], que contém o documento “Formula.md” COMPLETO. Seu trabalho: transformar esse documento em um monorepo TypeScript-first funcional (apps + packages), Edge-first (Cloudflare Worker), BYOK, com JSON✯Atomic, trajectory matching e governança computável. NÃO EXPLIQUE NADA: apenas imprima a ÁRVORE e depois o CONTEÚDO DE TODOS OS ARQUIVOS.

[ENTRADA FIXA]
[FORMULA_MD] = <<COLE AQUI O CONTEÚDO INTEGRAL DO Formula.md>>

[OBJETIVO]
1) Criar o repositório “ArenaLab”.
2) Preencher todos os artefatos (código, docs e infra) DERIVANDO do [FORMULA_MD]: traduza seções em módulos, algoritmos em funções, tabelas/listas em schemas e configs.
3) Edge endpoint `/v1/chat/completions` servindo o matcher (trajectory matching) com explicabilidade, confiança calibrada e fallback LLM/RAG (BYOK).
4) Ledger NDJSON (append-only), JSON✯Atomic schema, métricas e A/B test/bandit operacionais.

[REGRAS DE SAÍDA — OBRIGATÓRIAS]
1) Primeiro imprima apenas a ÁRVORE (formato `tree`) em bloco de código.
2) Em seguida, imprima TODOS os arquivos (um após o outro) no formato:
   === caminho/para/o/arquivo.ext ===
   <conteúdo>
3) Código deve compilar (TypeScript `strict`, ESM), `pnpm` nos scripts, sem dependências desnecessárias.
4) MINIMIZE TODOs. Se [FORMULA_MD] não especificar, implemente uma versão segura e pequena, documentada. Só use TODO quando algo for explicitamente indefinido.
5) Preserve trechos literais relevantes de [FORMULA_MD] em `docs/` e como comentários JSDoc nos módulos correspondentes.
6) Não inclua explicações fora dos arquivos. Não resuma no final. Apenas artefatos.

[ÁRVORE DO REPO]
Imprima exatamente esta árvore:

ArenaLab/
  package.json
  pnpm-workspace.yaml
  tsconfig.base.json
  .gitignore
  .editorconfig
  .gitattributes
  .env.example
  README.md
  LICENSE
  docs/
    one-pager.md
    api.md
    architecture.md
    formula.md
    CONTRIBUTING.md
  data/
    examples/
      spans.sample.ndjson
  scripts/
    seed.ts
    build_index.ts
    verify_ledger.ts
  infra/
    k8s/
      deployment.yaml
      service.yaml
      hpa.yaml
    prometheus/
      alerts.yaml
    grafana/
      arenalab-dashboard.json
    cloudflare/
      README.md
  apps/
    api-worker/
      package.json
      tsconfig.json
      wrangler.toml
      src/
        index.ts
        router.ts
        handlers/
          chat.ts
  packages/
    atomic/
      package.json
      tsconfig.json
      src/
        atomic.schema.json
        index.ts
    ledger/
      package.json
      tsconfig.json
      src/
        index.ts
        ledger.ts
        signature/
          dv25-seal.ts
    search/
      package.json
      tsconfig.json
      src/
        index.ts
        vector/
          hnsw.ts
          ivf.ts
        inverted.ts
        temporal.ts
        quality.ts
    planner/
      package.json
      tsconfig.json
      src/
        index.ts
        planner.ts
    predictor/
      package.json
      tsconfig.json
      src/
        index.ts
        matcher.ts
        outcome_analyzer.ts
        synthesizer.ts
        confidence.ts
        conformal.ts
    ensemble/
      package.json
      tsconfig.json
      src/
        index.ts
        strategies.ts
    experimentation/
      package.json
      tsconfig.json
      src/
        index.ts
        abtest.ts
        bandit.ts
    coverage/
      package.json
      tsconfig.json
      src/
        index.ts
        coverage.ts
    selfplay/
      package.json
      tsconfig.json
      src/
        index.ts
        generator.ts
        guardrails.ts
    fallback/
      package.json
      tsconfig.json
      src/
        index.ts
        rag.ts
    metrics/
      package.json
      tsconfig.json
      src/
        index.ts
        metrics.ts
    cache/
      package.json
      tsconfig.json
      src/
        index.ts
        cache.ts
    tooluse/
      package.json
      tsconfig.json
      src/
        index.ts
        tool_router.ts
        tools/
          calculator.ts
          web_search.ts
    config/
      package.json
      tsconfig.json
      src/
        index.ts
        env.ts
        constants.ts
    utils/
      package.json
      tsconfig.json
      src/
        index.ts
        ids.ts
        types.ts

[REGRAS DE DERIVAÇÃO (como preencher a partir do Formula.md)]
- Copie o conteúdo integral de [FORMULA_MD] para `docs/formula.md` sem alterações.
- Extraia do [FORMULA_MD]:
  • Tese/visão → `docs/one-pager.md` (bullets claros).  
  • API/fluxos → `docs/api.md` (contratos REST do `/v1/chat/completions`, esquemas de request/response, exemplos).  
  • Arquitetura → `docs/architecture.md` (diagrama ASCII do pipeline e lista de módulos).  
  • Normas de contribuição → `docs/CONTRIBUTING.md` (lint, testes, convenções).  
  • SLOs/Métricas → preencher `infra/prometheus/alerts.yaml` e comentários em `packages/metrics/src/metrics.ts`.  
  • Glossário/terminologia → comentários JSDoc nos módulos relevantes.
- Algoritmos descritos no [FORMULA_MD]:
  • “Trajectory Matching” → `packages/predictor/src/matcher.ts` (orquestrar busca, intersectar filtros, ranquear, compor evidências).  
  • “Análise de outcomes” → `outcome_analyzer.ts` (métricas de sucesso, custo, risco; score composto).  
  • “Síntese” → `synthesizer.ts` (montar resposta com explicabilidade e citações das trajetórias).  
  • “Confiança” → `confidence.ts` (calibração: isotonic/Platt — implemente pelo menos Platt com regressão logística simples).  
  • “Conformal” → `conformal.ts` (intervalo p-val com método split conformal básico).  
  • “Índices” → `packages/search/*` (HNSW com efSearch configurável; IVF stub funcional; filtros `inverted/temporal/quality`).  
  • “Planner/Optimizer” → `packages/planner/src/planner.ts` (topK, minQuality, efSearch e estimativa simples de seletividade).  
  • “A/B e Bandit” → `packages/experimentation/*` (A/B por métrica de qualidade/latência; UCB1 e Thompson sampling).  
  • “Cobertura & Self-play” → `packages/coverage/*` e `packages/selfplay/*` (medidas de densidade/diversidade + gerador com guardrails de distância mínima no embedding).  
  • “Fallback BYOK” → `packages/fallback/src/rag.ts` (detectar baixa confiança e chamar provedor via chaves do ambiente).  
  • “Ledger NDJSON + assinatura” → `packages/ledger/*` (append em arquivo NDJSON; DV25-Seal stub com Ed25519+BLAKE3).  
  • “Métricas” → `packages/metrics/*` (contadores, histogramas e export text/plain).  
  • “Cache” → `packages/cache/*` (LRU simples em memória com TTL).
- Scripts:
  • `scripts/seed.ts` → gerar spans de exemplo coerentes com domínios/ações do [FORMULA_MD].  
  • `scripts/build_index.ts` → construir índices (vetorial + invertido + temporal + quality) a partir dos spans.  
  • `scripts/verify_ledger.ts` → varrer NDJSON, verificar integridade (hash por linha) e assinatura (stub DV25).
- Endpoint/Edge:
  • `apps/api-worker/src/handlers/chat.ts` deve: validar input, chamar matcher, medir latência, aplicar fallback conforme confiança, registrar spans (request/predição/feedback se vier), e retornar `{ content, confidence, evidence[], plan }`.
- Config/BYOK:
  • `.env.example` com `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `GEMINI_API_KEY`.  
  • `packages/config/src/env.ts` lê chaves e expõe `ENV`.  
  • `packages/config/src/constants.ts` define DEFAULTS (TOP_K, MIN_QUALITY, EF_SEARCH, EMIN, etc) coerentes com [FORMULA_MD].
- Qualidade mínima:
  • Tipos exportados, JSDoc com referências a linhas/seções do [FORMULA_MD].  
  • Funções com parâmetros e retornos bem tipados.  
  • Código rodável em `wrangler dev` e `pnpm build`.

[CONTEÚDOS-BASE A SEREM GERADOS (exemplos e defaults obrigatórios)]
Gere exatamente os seguintes arquivos com estes conteúdos-base (e COMPLETE além disso com o que extrair de [FORMULA_MD]):

=== package.json ===
{
  "name": "arenalab",
  "private": true,
  "packageManager": "pnpm@9",
  "workspaces": ["apps/*","packages/*"],
  "scripts": {
    "build": "pnpm -r run build",
    "dev": "pnpm -C apps/api-worker run dev",
    "test": "pnpm -r run test",
    "lint": "echo 'TODO: add eslint' && exit 0"
  }
}

=== pnpm-workspace.yaml ===
packages:
  - "apps/*"
  - "packages/*"

=== tsconfig.base.json ===
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM"],
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "strict": true,
    "declaration": true,
    "skipLibCheck": true,
    "allowJs": false,
    "resolveJsonModule": true,
    "types": []
  }
}

=== .gitignore ===
node_modules
dist
.esbuild
.wrangler
.env
.DS_Store

=== .editorconfig ===
root = true
[*]
charset = utf-8
indent_style = space
indent_size = 2
end_of_line = lf
insert_final_newline = true
trim_trailing_whitespace = true

=== .gitattributes ===
* text=auto eol=lf

=== .env.example ===
OPENAI_API_KEY=changeme
ANTHROPIC_API_KEY=changeme
GEMINI_API_KEY=changeme

=== README.md ===
# ArenaLab
Monorepo TypeScript-first. Edge endpoint `/v1/chat/completions`, JSON✯Atomic, trajectory matching, BYOK.
## Comandos
- `pnpm i`
- `pnpm build`
- `pnpm dev` (Cloudflare Worker)
## Pastas
Ver `docs/architecture.md`.

=== LICENSE ===
MIT License
Copyright (c) 2025 ArenaLab

=== infra/cloudflare/README.md ===
Use `wrangler dev` para rodar o worker. Exporte APIs de ambiente via `wrangler.toml`.

=== apps/api-worker/package.json ===
{
  "name": "@arenalab/api-worker",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "wrangler dev",
    "build": "esbuild src/index.ts --bundle --format=esm --outfile=dist/index.mjs",
    "test": "vitest run || echo 'no tests'"
  },
  "dependencies": {},
  "devDependencies": { "esbuild": "^0.23.0", "typescript": "^5.6.0", "vitest": "^2.0.0" }
}

=== apps/api-worker/tsconfig.json ===
{ "extends": "../../tsconfig.base.json", "compilerOptions": { "outDir": "dist" }, "include": ["src"] }

=== apps/api-worker/wrangler.toml ===
name = "arenalab-api"
main = "dist/index.mjs"
compatibility_date = "2025-01-01"
[vars]
API_NAME = "ArenaLab"
[observability]
enabled = true
logs = { level = "info" }

[VALIDAÇÕES FINAIS — imprimir dentro dos arquivos apropriados como comentários]
- Checklist em `docs/CONTRIBUTING.md`: como rodar build, testes e worker.
- Em `packages/atomic/src/atomic.schema.json`: schema mínimo do JSON✯Atomic com campos {id, ts, actor, domain, action, context?, outcome?}.
- Em `packages/predictor/src/matcher.ts`: pipeline completo descrito no [FORMULA_MD] (busca vetorial + filtros + ranking + evidências).
- Em `packages/predictor/src/confidence.ts`: Platt scaling simples (logística) + docstring com referência ao [FORMULA_MD].
- Em `packages/experimentation/*`: A/B por métrica e UCB1/Thompson operacionais.
- Em `packages/ledger/*`: append-only NDJSON + DV25 stub.
- Em `infra/prometheus/alerts.yaml`: alerta P95 > 400ms (ajuste se [FORMULA_MD] definir outro SLO).
- Em `docs/api.md`: exemplos de request/response coerentes com o matcher.

[FIM]
