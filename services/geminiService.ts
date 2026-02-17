import { Node, Edge } from 'reactflow';
import { CustomNodeData, NodeType } from '../types';

export const analyzeArchitecture = async (nodes: Node<CustomNodeData>[], edges: Edge[]) => {
  const nodeDesc = nodes.map(n => `- ${n.data.label} (${n.data.type}) ${n.data.hasDatabase ? '[Possui Banco de Dados Oracle Interno]' : ''}`).join('\n');
  
  const edgeDesc = edges.map(e => {
    const source = nodes.find(n => n.id === e.source)?.data.label || e.source;
    const target = nodes.find(n => n.id === e.target)?.data.label || e.target;
    return `- ${source} conecta para ${target} via ${e.label || 'conexão direta'}`;
  }).join('\n');

  const prompt = `
    Você é um Arquiteto de Software Sênior.
    Analise o seguinte diagrama de arquitetura:
    
    NODES:
    ${nodeDesc}
    
    EDGES:
    ${edgeDesc}
    
    Forneça:
    1. Resumo do fluxo.
    2. Pontos de falha (SPOFs).
    3. Sugestões de melhoria.
    
    Responda em Português (Markdown).
  `;

  try {
    const response = await fetch('/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt }),
    });

    if (!response.ok) {
      let errMsg = 'Analysis failed';
      try { errMsg = (await response.json()).error || errMsg; } catch {}
      throw new Error(errMsg);
    }

    const data = await response.json();
    return data.text;
  } catch (error) {
    console.error("Gemini Analysis Failed:", error);
    throw error;
  }
};

export const generateDiagramFromText = async (description: string): Promise<{ nodes: Node<CustomNodeData>[], edges: Edge[] }> => {
  const prompt = `
    Atue como um gerador de diagramas de arquitetura React Flow altamente especializado.
    Descrição do usuário: "${description}".

    REGRAS CRÍTICAS DE COMPORTAMENTO (Siga estritamente):

    1. REGRA DE BANCO DE DADOS (Internalização):
       - Se a descrição diz que um serviço "tem um banco", "usa oracle", "salva dados", ou algo similar:
         NÃO crie um nó separado do tipo "database".
       - EM VEZ DISSO: Crie o nó do serviço com a propriedade "hasDatabase": true dentro de "data".
       - Use nós do tipo 'database' APENAS se for explicitamente um banco legado compartilhado e isolado.

    2. REGRA DE ISOLAMENTO VISUAL (Duplicação de Nós REST):
       - Objetivo: Clareza visual absoluta. O diagrama deve ser lido da esquerda para a direita sem linhas cruzando a tela inteira.
       - Se "Serviço A" e "Serviço B" chamam o "Serviço C":
         VOCÊ DEVE CRIAR DUAS CÓPIAS VISUAIS DO "Serviço C".
         - Cópia 1: ID "svc_c_1", posicionado imediatamente à direita do "Serviço A".
         - Cópia 2: ID "svc_c_2", posicionado imediatamente à direita do "Serviço B".
       - NUNCA reutilize o mesmo nó de destino para chamadores distantes. Cada fluxo deve parecer independente.

    3. LAYOUT E POSICIONAMENTO:
       - Fluxo: Esquerda (x: 0) -> Direita (x: growing).
       - Proximidade: O serviço chamado deve estar EXATAMENTE à direita do seu chamador (Offset X: +300px).
       - Alinhamento Vertical: Se um serviço chama 3 outros, empilhe-os verticalmente com espaçamento de 150px no eixo Y, todos alinhados no mesmo eixo X.
    
    4. TIPOS DE NÓS:
       - 'service' (Microserviços, APIs)
       - 'queue' (Filas, Tópicos, MQ)
       - 'external' (Sistemas terceiros)
       - 'database' (APENAS para DBs soltos, não vinculados a um serviço específico)

    Retorne APENAS o JSON cru no seguinte formato (sem markdown):
    {
      "nodes": [
        { 
          "id": "unique_id_1", 
          "type": "service", 
          "position": { "x": 0, "y": 0 }, 
          "data": { "label": "Nome do Serviço", "hasDatabase": true, "type": "service" } 
        }
      ],
      "edges": [
        { "id": "e1", "source": "unique_id_1", "target": "unique_id_2", "label": "REST" }
      ]
    }
  `;

  try {
    const response = await fetch('/api/generate-diagram', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt }),
    });

    if (!response.ok) {
      let errMsg = 'Generation failed';
      try { errMsg = (await response.json()).error || errMsg; } catch {}
      throw new Error(errMsg);
    }

    const data = await response.json();
    let jsonStr = data.text || "";
    jsonStr = jsonStr.replace(/```json/g, '').replace(/```/g, '').trim();

    const result = JSON.parse(jsonStr);
    
    const nodes = result.nodes.map((n: any) => ({
      ...n,
      data: { 
        ...n.data, 
        type: n.type
      }
    }));

    return {
      nodes: nodes,
      edges: result.edges
    };

  } catch (error) {
    console.error("Gemini Generation Failed:", error);
    throw new Error("Falha ao interpretar a arquitetura. Tente simplificar ou detalhar passo a passo.");
  }
};
