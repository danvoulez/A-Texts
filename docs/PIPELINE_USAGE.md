# 🚀 LogLine LLM Training Pipeline - Guia de Uso

Guia completo para executar o pipeline de treino do LogLine LLM usando Trajectory Matching e Orquestração Metalinguística.

---

## 📋 Pré-requisitos

### 1. Dados de Entrada

Você precisa de um arquivo NDJSON com spans diamante (qualidade ≥80). Formato esperado:

```json
{"id":"span_001","who":"user","did":"ask_question","this":"What is the capital of France?","when":"2025-01-10T10:00:00Z","status":"completed","if_ok":"The capital of France is Paris.","context":{"environment":"geography"},"metadata":{"quality_score":95}}
```

**Campos obrigatórios:**
- `id`: Identificador único
- `who`: Ator
- `did`: Ação
- `this`: Contexto/query
- `when`: Timestamp ISO 8601
- `status`: `pending` | `completed` | `failed`
- `if_ok`: Resposta/outcome (para spans completed)

**Campos opcionais mas recomendados:**
- `context.environment`: Domínio/ambiente
- `metadata.quality_score`: Score de qualidade (0-100)

### 2. Instalação

```bash
# Instalar dependências
pnpm install

# Build dos packages
pnpm -r build
```

---

## 🎯 Execução Rápida

### Pipeline Completo

```bash
# Executar todas as fases (0 e 1)
node scripts/pipeline/run-full-pipeline.js -i data/diamonds.ndjson -o data/output
```

### Executar Fases Individualmente

```bash
# Phase 0: Preparação (validação + enriquecimento + índices)
node scripts/pipeline/phase0-prepare.js data/diamonds.ndjson data/diamonds-enriched.ndjson

# Phase 1: Orquestração (transformação com enzimas)
node scripts/pipeline/phase1-orchestrate.js data/diamonds-enriched.ndjson data/diamonds-plus.ndjson
```

---

## 📊 Fases do Pipeline

### PHASE 0: Preparação dos Dados

**O que faz:**
1. ✅ Valida 350k+ spans diamante
2. 🧬 Gera embeddings (query, response, combined)
3. 🏷️ Extrai tags semânticas
4. 📈 Calcula complexity score
5. 🏗️ Constrói índices HNSW e Inverted

**Input:**
- Arquivo NDJSON com spans brutos

**Output:**
- `diamonds-enriched.ndjson`: Spans com embeddings e metadados
- `diamonds-enriched.hnsw.json`: Snapshot do índice HNSW

**Exemplo de span enriquecido:**

```json
{
  "id": "span_001",
  "who": "user",
  "did": "write_code",
  "this": "Write a function to calculate fibonacci",
  "when": "2025-01-10T10:00:00Z",
  "status": "completed",
  "if_ok": "def fib(n): return n if n <= 1 else fib(n-1) + fib(n-2)",
  "context": {"environment": "programming"},
  "metadata": {"quality_score": 88},
  "embeddings": {
    "query_embedding": [0.123, -0.456, ...],
    "response_embedding": [0.789, 0.234, ...],
    "combined_embedding": [0.567, -0.123, ...]
  },
  "semantic_tags": ["programming", "python"],
  "complexity_score": 65
}
```

---

### PHASE 1: Orquestração Metalinguística

**O que faz:**
1. 🧬 Aplica enzimas de transformação:
   - `semantic-enricher`: Enriquece semanticamente
   - `syntax-optimizer`: Otimiza código
   - `security-enzyme`: Remove segredos
   - `context-preserver`: Preserva contexto de thread
2. 📊 Avalia qualidade após transformação
3. ✅ Filtra por quality gate (≥85)
4. 📈 Gera relatório de impacto

**Input:**
- Spans enriquecidos da Phase 0

**Output:**
- `diamonds-plus.ndjson`: Diamonds de alta qualidade (≥85)
- `diamonds-plus.report.json`: Relatório detalhado

**Exemplo de relatório:**

```json
{
  "total_processed": 350000,
  "diamonds_plus": 380000,
  "diamonds_original": 0,
  "rejected": 5000,
  "avg_quality_improvement": 5.2,
  "top_enzymes": [
    {"enzyme": "semantic-enricher", "avg_impact": 4.5, "count": 380000},
    {"enzyme": "syntax-optimizer", "avg_impact": 3.2, "count": 120000},
    {"enzyme": "context-preserver", "avg_impact": 2.8, "count": 85000}
  ]
}
```

---

## 🔧 Configuração Avançada

### Customizar Enzimas

Edite `packages/orchestration/src/activated-orchestration.ts`:

```typescript
// Adicionar nova enzima
private selectEnzymes(rules: OrchestrationRules): string[] {
  const enzymes: string[] = ['semantic-enricher']

  // Sua enzima customizada
  if (rules.mutation_strategy === 'aggressive') {
    enzymes.push('my-custom-enzyme')
  }

  return enzymes
}
```

### Implementar Nova Enzima

Adicione em `packages/orchestration/src/activation-engine.ts`:

```typescript
case 'my-custom-enzyme': {
  const result = await this.applyMyCustomEnzyme(response)
  newResponse = result.result
  changes.push(...result.changes)
  break
}

private async applyMyCustomEnzyme(text: string): Promise<{
  result: string
  changes: ChangeLog[]
}> {
  // Sua lógica aqui
  return { result: text, changes: [] }
}
```

### Ajustar Quality Gates

Modifique o threshold em `phase1-orchestrate.ts`:

```typescript
// Filtrar por qualidade (ajuste aqui)
if (result.executionLog.quality_score >= 90) {  // Era 85
  transformedSpans.push(result.transformedSpan)
}
```

---

## 📈 Monitoramento e Métricas

### Durante Execução

O pipeline exibe progresso em tempo real:

```
🚀 PHASE 0: PREPARAÇÃO DOS DADOS

📋 Step 1/3: Validando spans diamante...
  📊 Estatísticas:
    - Total: 350000
    - Válidos: 345000
    - Inválidos: 2000
    - Filtrados: 3000
  📈 Distribuição:
    - Domínios únicos: 25
    - Ações únicas: 48
    - Qualidade média: 83.5
✅ 345000 spans válidos

🧬 Step 2/3: Enriquecendo spans com embeddings...
  ⏳ Progresso: 10000/345000 (2.9%)
  ⏳ Progresso: 20000/345000 (5.8%)
  ...
```

### Após Conclusão

Analise os arquivos de saída:

```bash
# Ver resumo do pipeline
cat data/output/pipeline-summary.json | jq

# Ver relatório da Phase 1
cat data/output/diamonds-plus.report.json | jq

# Contar diamonds+ gerados
wc -l data/output/diamonds-plus.ndjson
```

---

## 🐛 Troubleshooting

### Erro: "Cannot find module '@arenalab/orchestration'"

**Solução:**
```bash
# Build o package de orquestração
cd packages/orchestration
pnpm build
```

### Erro: "ENOENT: no such file or directory"

**Solução:**
```bash
# Criar diretório de saída
mkdir -p data/output
```

### Erro: "Out of memory"

**Solução:**
```bash
# Aumentar heap do Node.js
NODE_OPTIONS="--max-old-space-size=8192" node scripts/pipeline/run-full-pipeline.js
```

### Processar dataset muito grande (>1M spans)

**Solução:**
```bash
# Dividir em chunks menores
split -l 100000 data/diamonds.ndjson data/chunk-

# Processar cada chunk
for file in data/chunk-*; do
  node scripts/pipeline/run-full-pipeline.js -i $file -o data/output-$(basename $file)
done

# Combinar resultados
cat data/output-*/diamonds-plus.ndjson > data/all-diamonds-plus.ndjson
```

---

## 📊 Performance

### Benchmarks

| Dataset Size | Phase 0 | Phase 1 | Total | Memory |
|--------------|---------|---------|-------|--------|
| 10k spans    | 2 min   | 5 min   | 7 min | 2 GB   |
| 100k spans   | 15 min  | 45 min  | 60 min| 8 GB   |
| 350k spans   | 50 min  | 2.5 hrs | 3.3 hrs| 16 GB |
| 1M spans     | 2.5 hrs | 8 hrs   | 10.5 hrs| 32 GB|

*Baseado em CPU: 8 cores, 32GB RAM, SSD*

### Otimizações

**1. Paralelizar lotes:**

```typescript
// Em phase1-orchestrate.ts
const results = await Promise.all(
  batch.map(span => processSpanAsync(span))
)
```

**2. Usar GPU para embeddings (opcional):**

```bash
# Instalar transformers.js com GPU
npm install @xenova/transformers
```

**3. Cachear embeddings:**

```bash
# Salvar embeddings em DB
# Reusar em múltiplas execuções
```

---

## 🎯 Próximas Fases

### PHASE 2: Trajectory Matching Training

```bash
# TODO: Implementar
node scripts/pipeline/phase2-train.js
```

**O que fará:**
- Construir índices de produção (IVF + HNSW)
- Calibrar confiança (Platt Scaling)
- Configurar Conformal Prediction

### PHASE 3: Self-Play & Bootstrapping

```bash
# TODO: Implementar
node scripts/pipeline/phase3-selfplay.js
```

**O que fará:**
- Self-play loop para gerar spans sintéticos
- Guardrails de diversidade
- Expandir dataset para ~500k spans

### PHASE 4: Ensemble & Distillation

```bash
# TODO: Implementar
node scripts/pipeline/phase4-ensemble.js
```

**O que fará:**
- Criar ensemble de modelos especializados
- Knowledge distillation
- Modelo único final

### PHASE 5: Deployment

```bash
# TODO: Implementar
node scripts/pipeline/phase5-deploy.js
```

**O que fará:**
- Deploy na Cloudflare Edge
- Continuous learning
- Monitoring com Prometheus

---

## 💡 Dicas

### 1. Comece Pequeno

Teste o pipeline com um subset pequeno primeiro:

```bash
# Pegar primeiros 1000 spans
head -n 1000 data/diamonds.ndjson > data/test-1k.ndjson

# Executar pipeline
node scripts/pipeline/run-full-pipeline.js -i data/test-1k.ndjson -o data/test-output
```

### 2. Valide Qualidade

Sempre verifique a qualidade dos diamonds+ gerados:

```bash
# Extrair quality scores
cat data/output/diamonds-plus.ndjson | jq '.transformation_log[0].quality_score' | \
  awk '{sum+=$1; count++} END {print "Avg:", sum/count}'
```

### 3. Backup Incremental

Salve checkpoints durante execução longa:

```bash
# Criar backups a cada N lotes
# Adicionar em phase1-orchestrate.ts:
if (batchNum % 10 === 0) {
  writeFileSync(`data/checkpoint-${batchNum}.ndjson`, ...)
}
```

---

## 📚 Referências

- **Estratégia Completa**: [PIPELINE_STRATEGY.md](./PIPELINE_STRATEGY.md)
- **Arquitetura LogLine**: [architecture.md](./architecture.md)
- **Formula Original**: [formula.md](./formula.md)
- **One-Pager**: [one-pager.md](./one-pager.md)

---

## 🤝 Suporte

Encontrou algum problema? Abra uma issue no repositório.

**Boa sorte com seu treino! 🚀**
