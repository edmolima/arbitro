# Arbitro — Harness de Avaliação (Design, subsistema 1 da v2)

**Data:** 2026-07-09
**Status:** Aprovado para planejamento
**Depende de:** SDK `arbitro` v1 (roteador determinístico)

## Missão

Dar ao Arbitro um **aparato de medição**. Hoje os testes provam que o motor faz o que
foi codificado — não que o roteamento *acerta*. Este subsistema mede a qualidade das
decisões contra um dataset rotulado e vira um **portão de CI**: nenhuma mudança em
keywords/catálogo passa sem reportar o delta de métricas.

É o item de maior alavancagem da v2 porque é **grátis em runtime** (não toca o SDK, não
adiciona dependência de runtime) e desbloqueia tudo que vem depois (calibração,
camada aprendida) — sem medição, esses passos são fé.

## Escopo

- **Entregável:** um pacote **privado** `packages/eval` no monorepo (não publicado).
- **Offline e determinístico no CI:** o avaliador roda contra um dataset **congelado**
  (JSON commitado), importando o pacote `arbitro` publicado. Zero chamadas de rede no CI.
- **Geração do dataset é separada:** um script offline usa uma LLM (via OpenRouter) para
  **sintetizar** os casos rotulados. Roda uma vez, o resultado é revisado por amostragem e
  commitado. Não faz parte do caminho testado/CI e não é dependência do avaliador.

### Fora de escopo (outros subsistemas da v2, planos próprios)

Calibração de `confidence` (Platt/ECE), camada aprendida (embeddings/centroides),
escalonamento remoto opt-in, preços ao vivo, taxonomia ampliada. Este subsistema apenas
**mede** a v1 como ela é.

## Formato do dataset

`packages/eval/dataset/cases.json` — estático, versionado:

```jsonc
{
  "version": "2026-07-09.1",
  "cases": [
    {
      "id": "code-001",
      "prompt": "escreva uma função de merge sort em rust",
      "lang": "pt",                 // "pt" | "en"
      "expected": {
        "task": "code",             // Task
        "complexity": "medium",     // Complexity
        "needs_structured_output": false,
        "tier": "medium"            // CostTier apropriado para o modelo roteado
      },
      "tags": ["code", "pt"]
    }
  ]
}
```

O rótulo `tier` (não um modelo específico) é o alvo de roteamento: qual **faixa de custo**
é apropriada. Isso evita amarrar o dataset a slugs voláteis do catálogo e casa com a ideia
de que a decisão certa é sobre *nível de capacidade × custo*, não um modelo exato.

## Métricas

Todas computadas por funções puras (`metrics.ts`), testáveis isoladamente:

- **Acurácia** de `task`, `complexity`, `needs_structured_output` (classificador).
- **Macro-F1** de `task` (média de F1 por classe — robusto a desbalanceamento).
- **Matriz de confusão** de `task` e de `tier`.
- **Erro de tier ponderado por custo (assimétrico):** sub-provisionar (rotear pra tier
  abaixo do esperado) penaliza como risco de *qualidade*; super-provisionar penaliza como
  *dinheiro*. Os erros não são simétricos e a métrica reflete isso.
- **Custo simulado** vs. baseline "sempre premium": um proxy de custo por tier
  (`low=1, medium=5, high=25`, unidades relativas) somado sobre o dataset, e a **economia %**
  contra rotear tudo no tier alto. É o número que justifica o produto.

## Gate de regressão

`packages/eval/thresholds.json` define pisos (ex.: `minTaskAccuracy`,
`minStructuredAccuracy`, `maxUnderProvisionRate`). O CLI `pnpm eval`:

1. Carrega o dataset, roda o `arbitro` sobre cada caso.
2. Computa o relatório e imprime uma tabela legível + o resumo de economia.
3. **Sai com código 1** se qualquer métrica ficar abaixo do piso — falhando o CI.

Assim, um PR que degrade o roteamento é bloqueado com um diff legível das métricas.

## Arquitetura

```
dataset/cases.json (congelado)
  → runner.predict(dataset)      importa `arbitro`, roda judge() por caso,
  │                              resolve o tier do modelo escolhido via DEFAULT_CATALOG
  → report.evaluate(...)         aplica metrics.* → EvalReport
  → report.formatReport(...)     tabela + resumo (string)
  → report.checkThresholds(...)  EvalReport × thresholds → { passed, failures[] }
  → index.ts (CLI)               imprime e define o exit code
```

| Módulo | Propósito | Depende de |
|---|---|---|
| `types` | `EvalCase`, `EvalDataset`, `Prediction`, `EvalReport`, `Thresholds`. Reusa `Task`/`Complexity`/`CostTier` de `arbitro`. | `arbitro` (tipos) |
| `dataset-schema` | Valida um `EvalDataset` (enums válidos, ids únicos, campos presentes). | `types` |
| `metrics` | Funções puras: accuracy, macroF1, confusion, simulatedCost, tierCostWeightedError. | `types` (tipos) |
| `runner` | `predict(dataset, costPreference?)`: roda `arbitro` e mapeia slug→tier via `DEFAULT_CATALOG`. | `arbitro`, `types` |
| `report` | `evaluate`, `formatReport`, `checkThresholds`. | `metrics`, `runner`, `types` |
| `index` (CLI) | Carrega `cases.json` + `thresholds.json`, roda, imprime, define exit code. | `report` |
| `scripts/generate` | **Dev tool offline**: sintetiza casos via OpenRouter. Fora do CI/testes. | `arbitro` (tipos), fetch nativo |

Runtime: apenas `fetch` nativo (só no script de geração). O pacote `eval` depende de
`arbitro` via workspace e não adiciona dependência de runtime ao SDK.

## Geração do dataset (script offline)

`packages/eval/scripts/generate.ts` — rodado manualmente pelo mantenedor:

1. Para cada `task`/`complexity`/idioma alvo, pede a uma LLM forte (via OpenRouter,
   `OPENROUTER_API_KEY` do env) para gerar N prompts realistas **e** seus rótulos.
2. Valida cada caso contra o `dataset-schema`; descarta os malformados.
3. Escreve `cases.json` com um novo `version`.
4. O mantenedor **revisa por amostragem** antes de commitar.

Requer API key **só na geração**. O avaliador (e o CI) nunca chamam rede — leem o JSON
congelado. Isso mantém o harness puro, offline e determinístico.

## Estratégia de testes

- `metrics`: golden tests — vetores de entrada conhecidos → valores esperados (incluindo
  casos de F1 com classe ausente, e a assimetria sub/super-provisão).
- `dataset-schema`: casos válidos e inválidos (enum errado, id duplicado, campo faltando).
- `runner`: fixture minúsculo inline (2–3 casos) → checa shape das `Prediction` e o
  mapeamento slug→tier via catálogo real.
- `report`: `evaluate` sobre fixture → relatório esperado; `checkThresholds` → pass/fail.
- CLI: teste do gate — dataset fixture abaixo do piso → `checkThresholds.passed === false`.

Os testes usam **fixtures inline**, não o `cases.json` real — assim não quebram quando o
dataset cresce. O dataset real só é consumido pelo CLI `pnpm eval`.

## Estrutura

```
packages/eval/
├── package.json          # privado; dep workspace em "arbitro"; pretest builda arbitro
├── tsconfig.json
├── thresholds.json       # pisos do gate de CI
├── dataset/
│   └── cases.json        # dataset rotulado, congelado, versionado
├── scripts/
│   └── generate.ts       # gerador offline via OpenRouter (dev tool)
├── src/
│   ├── index.ts          # CLI: pnpm eval
│   ├── types.ts
│   ├── dataset-schema.ts
│   ├── metrics.ts
│   ├── runner.ts
│   └── report.ts
└── tests/
```

## Roadmap (o que este subsistema desbloqueia)

Com o harness no lugar, os próximos planos da v2 passam a ser mensuráveis:
calibração da `confidence` (medir ECE antes/depois), depois a camada aprendida de
embeddings (provar o delta de acurácia no eval set antes de adotar). Cada um vira seu
próprio spec → plano.
