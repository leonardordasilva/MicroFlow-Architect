## Cores Distintas para Bancos de Dados por SubTipo

### Objetivo

Cada tipo de banco de dados (Oracle, Redis, etc.) tera sua propria cor, em vez de todos usarem a mesma cor verde generica (`--node-database`).

### Mapeamento de Cores

- **Oracle**: `#FBD982` (dourado/amarelo)
- **Redis**: `#DC382C` (vermelho)
- Fallback para outros subTypes: manter a cor atual verde (`hsl(142, 71%, 45%)`)

### Arquivos a Modificar

#### 1. Criar constante de cores por subType

**Arquivo**: `src/constants/databaseColors.ts` (novo)

Um mapa simples de subType para cor hex, usado tanto no DatabaseNode quanto no ServiceNode:

```ts
export const DATABASE_COLORS: Record<string, string> = {
  Oracle: '#FBD982',
  Redis: '#DC382C',
};
export const DEFAULT_DB_COLOR = 'hsl(var(--node-database))';
```

#### 2. Atualizar `DatabaseNode.tsx`

- Importar o mapa de cores
- Derivar a cor com base em `nodeData.subType`
- Substituir todas as referencias a `hsl(var(--node-database))` por essa cor dinamica (bordas, handles, icone, input)

#### 3. Atualizar `ServiceNode.tsx`

- Para os bancos internos exibidos dentro do ServiceNode, usar a cor do Oracle (`#FBD982`) no icone do banco interno (ja que bancos internos sao Oracle por padrao)
- Manter a cor do ServiceNode inalterada para o restante do componente

### Detalhes Tecnicos

- As cores serao aplicadas via `style` inline em vez de classes Tailwind, pois os valores sao dinamicos por instancia
- Os handles, bordas, icones e inputs do DatabaseNode usarao a cor correspondente ao subType
- O badge de subtipo (texto "ORACLE" / "REDIS") continuara usando `text-muted-foreground`

Levar em conta que diagramas já salvos devem sofrer as alterações 