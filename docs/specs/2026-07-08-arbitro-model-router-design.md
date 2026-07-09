# Arbitro — Roteador Determinístico de Modelos (Design v1)

**Data:** 2026-07-08
**Status:** Aprovado para planejamento
**Autor:** edmo.lima + Claude (estruturação assistida por Fable 5)

## Missão

Antes de gastar uma chamada (potencialmente cara) a uma LLM via OpenRouter, o Arbitro
responde a uma pergunta direta: **"qual é o melhor modelo para este prompt?"**

Dado o texto do prompt do usuário, o SDK classifica a tarefa e devolve o **modelo
concreto do OpenRouter** mais adequado — junto com alternativas rankeadas e a
justificativa. A decisão é local, determinística e instantânea: não faz nenhuma
chamada de rede para decidir.

## Escopo da v1

- **Entregável:** SDK TypeScript publicável no npm (`npm i arbitro`), dentro de um monorepo.
- **Juiz puro:** o SDK **decide** o modelo; **não executa** a chamada final. O dev pega
  o slug retornado e chama o OpenRouter (ou qualquer cliente) como preferir.
- **Motor 100% determinístico:** regras + heurísticas sobre o texto. Síncrono, offline,
  sem I/O de rede, **zero dependências de runtime**, reprodutível (mesma entrada → mesma saída).
- **Catálogo curado embutido:** o conhecimento de "qual modelo é bom para quê" é uma lista
  versionada mantida no próprio pacote.

### Fora de escopo (evoluções futuras, deliberadamente adiadas)

Registrado para não ser reintroduzido por engano na v1. Ver "Roadmap futuro".

- Dataset rotulado + harness de avaliação em CI.
- Calibração estatística de `confidence` (Platt/temperature scaling, ECE).
- Classificador aprendido (embeddings locais / ONNX / nearest-centroid).
- Escalonamento para LLM-judge remoto; cascata pós-resposta.
- Preços/disponibilidade ao vivo via API do OpenRouter.
- Telemetria e loop de feedback.

## API pública

```typescript
judge(prompt: string): JudgeResult
createArbitro(config?: ArbitroConfig): { judge(prompt: string): JudgeResult }
```

- `judge` é a via rápida com defaults.
- `createArbitro` existe para quem quer customizar (preferência de custo, catálogo próprio).
- Ambos são **síncronos** — não retornam `Promise`.

### Contrato de saída

```typescript
type Task =
  | "chat" | "summary" | "code"
  | "research" | "json_extraction" | "translation";
type Complexity = "low" | "medium" | "high";

interface JudgeResult {
  model: string;                 // melhor modelo OpenRouter, ex: "anthropic/claude-haiku-4.5"
  alternatives: string[];        // fallbacks rankeados (melhor → pior), pode ser vazio
  task: Task;
  complexity: Complexity;
  needs_structured_output: boolean;
  confidence: number;            // 0.0..1.0 (heurístico na v1 — ver nota de honestidade)
  reason: string;                // justificativa curta e legível
  catalogVersion: string;        // versão do catálogo usado (rastreabilidade)
}
```

**Nota de honestidade sobre `confidence`:** na v1 é um score heurístico (força e
concordância dos sinais), **não** uma probabilidade calibrada. É útil como sinal ordinal
("baixo → prompt ambíguo"), mas não corresponde a `P(decisão correta)`. Calibração real é
roadmap futuro. Isso deve estar documentado no README para o dev não confiar demais em
thresholds absolutos.

### Configuração

```typescript
interface ArbitroConfig {
  costPreference?: number;   // 0 = mais barato possível ... 1 = melhor qualidade. default: 0.5
  catalog?: ModelCatalog;    // opcional: sobrescreve o catálogo curado embutido
}
```

## Arquitetura

Pipeline puro, dependência acíclica. Cada módulo tem um propósito único e pode ser
entendido/testado isoladamente.

```
prompt
  → signals        (extrai features do texto)
  → classifier     (task + complexity + confidence + needs_structured_output)
  → matcher        (usa catalog + costPreference → melhor modelo + alternativas)
  → JudgeResult
```

| Módulo | Propósito único | Depende de |
|---|---|---|
| `types` | Contrato de dados: `JudgeResult`, `ModelCatalog`, `ArbitroConfig`, enums. Zero lógica. | — |
| `keywords` | **Dados** versionados: padrões PT+EN por task; termos/sinais de complexidade. Ajustável sem tocar em lógica. | — |
| `signals` | Extrai features determinísticas: presença de code fence, comprimento, contagem de perguntas, termos de tradução/resumo/prova, pedido explícito de JSON/tabela, matemática, nº de passos. | `keywords` |
| `classifier` | Sinais → `task` (regra de structured-output primeiro), `complexity` (pesos), `confidence` (força/concordância), `needs_structured_output`. | `signals`, `types` |
| `catalog` | **Catálogo curado embutido e versionado**: cada modelo com pontos fortes por task, faixa de custo, janela de contexto, suporte a saída estruturada. | `types` |
| `matcher` | `(task, complexity, needs_structured_output, costPreference)` → melhor modelo + alternativas rankeadas, a partir do catálogo. | `catalog`, `types` |
| `judge` | Orquestra o pipeline, monta o `JudgeResult` (incl. `reason` e `catalogVersion`). Único lugar com fluxo de controle. | todos acima |
| `index` | API pública: `judge`, `createArbitro`, tipos. Nada mais é exportado. | `judge`, `types` |

### Fluxo de `judge(prompt)`

1. **Guarda trivial:** prompt vazio/whitespace → `task: chat`, `complexity: low`,
   `confidence` baixa, modelo barato do catálogo, `reason` explícito.
2. `signals.extract(prompt)` → objeto de features.
3. `classifier.classify(signals)`:
   - Regra de structured-output primeiro: pedido explícito de JSON/chaves/tabela/lista
     estruturada → `needs_structured_output = true` e `task = "json_extraction"`.
   - Senão, escolhe `task` pelo(s) sinal(is) mais forte(s); default `chat`.
   - `complexity` por soma ponderada de sinais (tamanho, matemática, código, multi-passo).
   - `confidence` pela força/concordância dos sinais (poucos/conflitantes → baixa).
4. `matcher.pick(task, complexity, needs_structured_output, costPreference, catalog)`:
   - Filtra candidatos do catálogo aptos à `task` (e a saída estruturada, se exigida).
   - Rankeia por uma função de utilidade que combina adequação à task/complexity e custo,
     ponderada por `costPreference` (0 favorece custo, 1 favorece qualidade).
   - Retorna o topo como `model` e os próximos como `alternatives`.
5. Monta e devolve o `JudgeResult`.

### Catálogo de modelos (formato)

```typescript
interface ModelEntry {
  slug: string;                 // ex: "anthropic/claude-haiku-4.5"
  strengths: Task[];           // tasks em que se destaca
  costTier: "low" | "medium" | "high";
  contextWindow: number;
  supportsStructuredOutput: boolean;
}
interface ModelCatalog {
  version: string;             // ex: "2026-07-08.1"
  models: ModelEntry[];
}
```

O catálogo embutido é curado manualmente e versionado. Atualizar quando surgir modelo novo
= editar os dados + bump de `version`. Determinístico e auditável.

## Tratamento de casos de borda

- **Prompt vazio/whitespace:** decisão trivial segura (chat/low/modelo barato), sem erro.
- **Prompt multi-tarefa** (ex.: "resuma e depois gere código"): a v1 escolhe uma `task`
  única pela regra de dominância (structured-output vence; senão o sinal mais forte).
  A limitação é documentada; suporte a tasks secundárias é roadmap futuro.
- **Nenhum sinal claro:** `confidence` baixa e escolha conservadora (task `chat`,
  complexity `medium`), com modelo balanceado.
- **`costPreference` fora de [0,1]:** clamp para [0,1].
- **Catálogo customizado sem candidato apto à task:** cai para o modelo de melhor
  adequação geral disponível; nunca lança em runtime por isso.

## Estratégia de testes

Unitários puros, table-driven, sem rede nem mocks (o motor não faz I/O). Rodam no CI a
custo zero.

- `signals`: golden tests — dado prompt, features esperadas.
- `classifier`: uma tabela por regra/task/complexity, incluindo caso ambíguo (confidence baixa)
  e caso de structured-output.
- `matcher`: casos como "code+high, costPreference 0.8 → modelo forte em código";
  "chat+low → modelo barato"; "json_extraction → só modelos com `supportsStructuredOutput`".
- `judge`: fluxo ponta a ponta sobre prompts representativos; verifica formato do `JudgeResult`.

## Estrutura do monorepo

```
arbitro/
├── package.json              # raiz: workspaces + scripts (build, test, dev, lint)
├── pnpm-workspace.yaml
├── tsconfig.base.json        # config TS compartilhada (strict: true, target ES2022)
├── packages/
│   └── arbitro/              # o SDK (publicável)
│       ├── src/
│       │   ├── index.ts
│       │   ├── types.ts
│       │   ├── keywords.ts
│       │   ├── signals.ts
│       │   ├── classifier.ts
│       │   ├── catalog.ts
│       │   ├── matcher.ts
│       │   └── judge.ts
│       ├── tests/
│       ├── package.json      # name: "arbitro", exports dual ESM/CJS, types, sideEffects:false
│       ├── tsconfig.json
│       └── tsup.config.ts
└── examples/
    └── playground/           # app de teste (privado, não publicado)
        ├── src/index.ts      # CLI interativa + modo batch
        └── package.json      # depende de "arbitro" via workspace
```

- **Gerenciador:** pnpm workspaces.
- **Build do SDK:** tsup (dual ESM/CJS + `.d.ts`).
- **Runtime:** apenas APIs nativas (sem dependência de runtime no pacote `arbitro`).

## O exemplo (`examples/playground`)

Objetivo: fechar o loop de validação — "o Arbitro está mesmo escolhendo o melhor modelo?".

- **CLI interativa** (`pnpm dev`): digita um prompt, vê `model` + `alternatives` + `task` +
  `complexity` + `confidence` + `reason`. Permite ajustar `costPreference` na hora para
  comparar a escolha "barata" vs "qualidade".
- **Modo batch:** roda um conjunto de ~15 prompts de exemplo cobrindo as tasks (chat trivial,
  código complexo, tradução, extração JSON, pesquisa profunda, ambíguo) e imprime uma tabela
  com as decisões, para inspeção visual do roteamento como um todo.

Depende apenas do pacote `arbitro` (não é publicado).

## Roadmap futuro (não implementar agora)

Ordem de maior alavancagem, caso a precisão precise evoluir:

1. **Dataset rotulado + harness de avaliação em CI** — pré-requisito para medir qualidade
   de verdade e calibrar. Maior alavancagem.
2. **Calibração de `confidence`** (Platt/temperature scaling; publicar ECE).
3. **Camada aprendida determinística** — embeddings locais quantizados + nearest-centroid
   com centroides versionados; acionada só sob baixa confiança da camada de regras.
4. **Contrato para escalonamento opt-in** — slot assíncrono para um LLM-judge remoto.
5. **Preços ao vivo do OpenRouter** e taxonomia de tasks ampliada (math/reasoning, creative,
   rewrite, RAG-QA), classe `other`/abstenção, e knob custo↔qualidade dirigido por custos reais.

Todos preservam a promessa "determinístico, offline, auditável" quando bem executados
(um modelo com pesos congelados rodando em CPU é determinístico — "determinístico" ≠
"escrito à mão").
