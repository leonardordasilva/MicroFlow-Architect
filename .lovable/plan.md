

## Ajuste de Layout dos Ícones e Adição de Tooltips nos Cards de Diagrama

### Problema
Os ícones de ação (Compartilhar, Duplicar, Renomear, Excluir) estão posicionados com `absolute right-2 top-2`, sobrepondo o título do diagrama quando aparecem no hover.

### Solução

**Arquivo: `src/pages/MyDiagrams.tsx`**

1. **Reposicionar os ícones**: Mover os botões de ação da posição `absolute top-2 right-2` para uma linha dedicada abaixo do conteúdo do card (ou mover para `bottom-2 right-2`). A abordagem mais limpa é adicionar `pr-[120px]` ao título para reservar espaço, ou mover os ícones para baixo do card.

   Melhor abordagem: manter `absolute` mas no canto inferior direito (`bottom-2 right-2`) para não sobrepor o título. Ou adicionar padding-right ao título.

   **Abordagem escolhida**: Manter os ícones no topo direito mas adicionar `pr-28` (padding-right) no container do título para que o texto truncado não sobreponha os ícones.

2. **Adicionar Tooltips**: Envolver cada botão com `<Tooltip>` + `<TooltipTrigger>` + `<TooltipContent>` do componente existente `@/components/ui/tooltip`. Adicionar `<TooltipProvider>` no nível do componente. Labels: "Compartilhar", "Duplicar", "Renomear", "Excluir".

### Mudanças
- Importar `Tooltip, TooltipTrigger, TooltipContent, TooltipProvider` de `@/components/ui/tooltip`
- Adicionar `pr-28` ao container do título (`div` linha 202) para reservar espaço para os 4 ícones
- Envolver cada `Button` de ação com componentes de Tooltip

