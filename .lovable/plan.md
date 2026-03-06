

## Correção Cirúrgica — `generate-diagram/index.ts`

O bug é claro: na linha 249, `AiDiagramSchema.safeParse(diagram)` referencia `diagram` que nunca foi declarada — falta o `JSON.parse(content)`.

### Alteração única (linhas 230–275)

Substituir todo o bloco de validação e resposta por:

1. **Schemas Zod mais robustos** com `AiNodeDataSchema` (inclui `externalCategory`, `internalDatabases`, etc.), `AiNodeSchema`, `AiEdgeSchema`, `AiDiagramOutputSchema` com limites (`min(1)`, `max(100)`, `max(300)`).

2. **Parse + validação corretos**:
   - `JSON.parse(content)` → atribuído a `rawDiagram`
   - `AiDiagramOutputSchema.safeParse(rawDiagram)` → resultado validado
   - Try/catch para capturar erros de JSON.parse separadamente (retorna 422)

3. **Normalização de edges** mantida exatamente como está, mas usando `diagram` (a variável validada) em vez de `diagram2`.

4. **Resposta final** usando `{ nodes: diagram.nodes, edges: finalEdges }`.

Nenhuma outra parte do arquivo é tocada — CORS, auth, rate limiting, system prompt e model cascade permanecem intactos.

