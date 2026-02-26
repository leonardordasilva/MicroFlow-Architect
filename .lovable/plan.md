

# Analise do PRD v2.0 — MicroFlow Architect: Backlog v2.0

## Resumo

O PRD v2.0 endereca itens pendentes apos a implementacao do PRD v1.0. Contem **8 epicos (A-H)** com prioridades variadas, desde correcoes de seguranca criticas ate melhorias de UX de baixa prioridade.

---

## Epicos Identificados

### EPICO A — Seguranca: Corrigir CORS Wildcard (CRITICA)
**Status:** Pendente
**Problema:** As Edge Functions (`generate-diagram` e `analyze-diagram`) usam `Access-Control-Allow-Origin: "*"`, permitindo que qualquer dominio invoque as funcoes.
**Solucao:** Substituir o CORS wildcard por validacao dinamica de origem usando variavel `ALLOWED_ORIGINS`. Aplicar a ambas as Edge Functions existentes.

### EPICO B — Limpeza: Remover Arquivos Legados (CRITICA)
**Status:** Parcialmente resolvido — os arquivos mencionados no PRD (`services/geminiService.ts`, `components/CustomNode.tsx`, etc.) **nao existem** na raiz do projeto atual. A raiz so contem arquivos de configuracao validos. Este epico pode ja estar resolvido ou os arquivos nunca existiram neste repositorio.

### EPICO C — Funcionalidade: Tela "Meus Diagramas" (ALTA)
**Status:** Pendente
**O que falta:** Nao existe pagina `/my-diagrams`. O `diagramService.ts` ja tem `loadUserDiagrams` mas nao ha UI para listar, renomear ou excluir diagramas salvos. Precisa criar:
- `src/pages/MyDiagrams.tsx` com grid de cards
- Funcoes `deleteDiagram` e `renameDiagram` no service
- Rota `/my-diagrams` no `App.tsx`
- Botao "Meus Diagramas" no header do `DiagramCanvas`

### EPICO D — Resiliencia: Fallback Multi-Modelo (ALTA)
**Status:** Pendente
**Problema:** `generate-diagram` usa modelo fixo `google/gemini-3-flash-preview`. Sem fallback em caso de rate limit (429) ou indisponibilidade.
**Solucao:** Implementar funcao `callWithFallback` com cascata de modelos e delay entre tentativas. Aplicar tambem ao `analyze-diagram`.

### EPICO E — Protocolos de Comunicacao nas Arestas (ALTA)
**Status:** Pendente
**Problema:** As arestas nao tem seletor de protocolo, enum `EdgeProtocol`, nem estilizacao visual diferenciada. O `EditableEdge.tsx` renderiza todas com o mesmo estilo.
**O que falta:**
- Adicionar `EdgeProtocol` enum e `PROTOCOL_CONFIGS` com cores/estilos ao `types/diagram.ts`
- Atualizar `EditableEdge` para estilizar por protocolo
- Criar `ProtocolSelectorModal` (grid 2x5 com os 10 protocolos)
- Criar `DiagramLegend.tsx` com legendas sincronas/assincronas
- Atualizar prompt da Edge Function para gerar arestas com protocolo

### EPICO F — Testes: Cobertura dos Modulos Criticos (MEDIA)
**Status:** Pendente (depende do Epico E)
**O que falta:**
- Adicionar casos a `useAutoSave.test.ts` (version missing, quota exceeded)
- Criar `src/types/diagram.test.ts` para validar `PROTOCOL_CONFIGS`
- Adicionar caso `onConnect` ao `diagramStore.test.ts`

### EPICO G — Correcao Tecnica: useState para Efeito Colateral (BAIXA)
**Status:** Pendente
**Problema:** No `DiagramCanvas.tsx` linha 133: `useState(() => { document.documentElement.classList.add('dark'); })` — usa useState para efeito colateral DOM, violando regras do React.
**Solucao:** Trocar por `useEffect(() => { document.documentElement.classList.add('dark'); }, [])`.

### EPICO H — Avatares de Colaboradores ao Vivo (BAIXA)
**Status:** Pendente
**O que falta:** Estender `useRealtimeCollab.ts` com Presence para rastrear usuarios conectados. Criar `CollaboratorAvatars.tsx` com avatares sobrepostos no header.

---

## Ordem de Implementacao Recomendada pelo PRD

```text
1. Epico B  -->  Limpeza (ja pode estar resolvido)
2. Epico A  -->  CORS (seguranca critica)
3. Epico G  -->  useState fix (1 linha)
4. Epico D  -->  Fallback multi-modelo
5. Epico E  -->  Protocolos nas arestas (maior impacto)
6. Epico C  -->  Tela "Meus Diagramas"
7. Epico F  -->  Testes (depende do E)
8. Epico H  -->  Avatares colaboradores
```

---

## Recomendacao

Sugiro implementar na ordem do PRD. O Epico B provavelmente ja esta resolvido (arquivos legados nao encontrados). Podemos comecar pelo **Epico A (CORS)** + **Epico G (useState fix)** juntos por serem rapidos e criticos, e depois avancar sequencialmente.

Deseja que eu implemente todos os epicos em sequencia, ou prefere escolher epicos especificos?

