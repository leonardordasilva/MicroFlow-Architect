

## Plano — Gaps Enterprise-ready (8 pontos restantes)

Três frentes, seis tarefas concretas.

---

### 1. Banco & Escalabilidade (2 tarefas)

**1a. Índice composto na tabela `ai_requests`**

Criar migration:
```sql
CREATE INDEX IF NOT EXISTS idx_ai_requests_user_created
ON public.ai_requests (user_id, created_at DESC);
```

Sem alteração de código — a query de rate limit já filtra por `user_id` + `created_at`.

**1b. Colunas de metadados não criptografados em `diagrams`**

Criar migration adicionando duas colunas:
```sql
ALTER TABLE public.diagrams
  ADD COLUMN IF NOT EXISTS node_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS edge_count integer NOT NULL DEFAULT 0;
```

Atualizar `diagramService.ts` (`saveDiagram`) para incluir `node_count: nodes.length` e `edge_count: edges.length` nos payloads de insert/update. Isso permitirá queries e relatórios sem descriptografar os JSONBs.

---

### 2. Arquitetura (2 tarefas)

**2a. Decomposição do DiagramCanvas.tsx (691 linhas → ~350)**

Extrair três módulos:

| Novo arquivo | Responsabilidade | Linhas aprox. |
|---|---|---|
| `src/components/DiagramHeader.tsx` | Header com badges, botões de save/refresh/logout, CollaboratorAvatars | ~130 linhas (424–516) |
| `src/components/DiagramExportHandlers.ts` | Funções `handleExportPNG`, `handleExportSVG`, `handleExportMermaid`, `handleExportJSON` como hooks (`useExportHandlers`) | ~100 linhas (197–299) |
| `src/components/DiagramContextMenu.tsx` | Context menu de nó (spawn) | ~30 linhas (592–608) |

O `DiagramCanvasInner` importa e compõe esses módulos, ficando com ~350 linhas focadas no ReactFlow e estado local.

**2b. React.lazy nas rotas secundárias**

Em `App.tsx`, trocar imports estáticos por lazy:

```typescript
const MyDiagrams = lazy(() => import('./pages/MyDiagrams'));
const SharedDiagram = lazy(() => import('./pages/SharedDiagram'));
const ResetPassword = lazy(() => import('./pages/ResetPassword'));
const NotFound = lazy(() => import('./pages/NotFound'));
```

Envolver `<Routes>` com `<Suspense fallback={<LoadingSpinner />}>`. Criar um componente `LoadingSpinner` simples (spinner centralizado com texto "Carregando...").

---

### 3. Crescimento / Testes (2 tarefas)

**3a. Teste E2E do fluxo principal**

Criar `src/test/e2e-flow.test.ts` (Vitest + mocks) cobrindo o fluxo:
1. Login (mock `useAuth`)
2. Criar diagrama (adicionar nós via store)
3. Salvar (mock `saveDiagram`, verificar chamada com dados corretos)
4. Compartilhar (mock `shareDiagram`, verificar URL retornada)
5. Carregar como colaborador (mock `loadDiagramByToken`, verificar `isCollaborator`)

Não é um E2E com browser real (Playwright), mas cobre o contrato completo do fluxo principal em unit/integration level.

**3b. Coverage threshold no Vitest**

Em `vitest.config.ts`, adicionar:
```typescript
coverage: {
  provider: 'v8',
  thresholds: {
    statements: 40,
    branches: 30,
    functions: 35,
    lines: 40,
  },
}
```

Threshold conservador (40%) para não bloquear CI, mas garantir que coverage não regrida.

---

### Resumo de arquivos afetados

| Arquivo | Ação |
|---|---|
| Migration SQL (novo) | Índice `ai_requests` + colunas `node_count`/`edge_count` |
| `src/services/diagramService.ts` | Adicionar `node_count`/`edge_count` nos payloads |
| `src/components/DiagramHeader.tsx` | Criar (extraído do Canvas) |
| `src/components/DiagramExportHandlers.ts` | Criar (hook `useExportHandlers`) |
| `src/components/DiagramContextMenu.tsx` | Criar (extraído do Canvas) |
| `src/components/DiagramCanvas.tsx` | Simplificar (importar novos módulos) |
| `src/App.tsx` | React.lazy + Suspense |
| `src/test/e2e-flow.test.ts` | Criar |
| `vitest.config.ts` | Adicionar coverage thresholds |

