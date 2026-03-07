

## Duplicar Diagrama a partir da Galeria

Adicionar um botão "Duplicar" em cada card de diagrama na página "Meus Diagramas", que cria uma cópia independente do diagrama selecionado.

### Mudanças

**1. `src/services/diagramService.ts`** — Nova função `duplicateDiagram(id, ownerId)`
- Carrega o diagrama original pelo ID
- Insere um novo registro com título `"Cópia de {título original}"`, mesmos `nodes` e `edges`, novo `owner_id = ownerId`
- Retorna o novo registro

**2. `src/pages/MyDiagrams.tsx`** — Botão de duplicar no card
- Adicionar ícone `Copy` do lucide-react nos action buttons do card (ao lado de Share, Rename, Delete)
- Criar `duplicateMutation` usando a nova função
- No `onSuccess`, invalidar queries e exibir toast de confirmação
- Opcionalmente, navegar direto para o canvas com o diagrama duplicado carregado

### Fluxo
1. Usuário clica no ícone de copiar no card
2. Mutation chama `duplicateDiagram` → insere cópia no banco
3. Lista é atualizada automaticamente com o novo diagrama "Cópia de X"
4. Toast confirma a ação

Nenhuma alteração de banco de dados é necessária — a inserção usa a mesma tabela `diagrams` com as RLS policies existentes.

