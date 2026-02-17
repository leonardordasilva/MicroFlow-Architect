import { GoogleGenAI } from "@google/genai";
import { Node, Edge } from 'reactflow';
import { CustomNodeData, NodeType } from '../types';

// Modelo Lite para economizar cota (Free Tier Friendly)
const MODEL_NAME = 'gemini-2.0-flash-lite-preview-02-05';

// Helper para lidar com Rate Limiting (429) automaticamente
const generateWithRetry = async (ai: GoogleGenAI, prompt: string, config: any = {}, retries = 1) => {
  try {
    return await ai.models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
      config: config
    });
  } catch (error: any) {
    const errMsg = String(error);
    // Se for erro de cota, espera e tenta novamente
    if (retries > 0 && (errMsg.includes('429') || errMsg.includes('RESOURCE_EXHAUSTED') || errMsg.includes('Quota'))) {
      console.warn("Cota atingida. Retentando em 3 segundos...");
      await new Promise(resolve => setTimeout(resolve, 3000));
      return generateWithRetry(ai, prompt, config, retries - 1);
    }
    throw error;
  }
};

export const analyzeArchitecture = async (nodes: Node<CustomNodeData>[], edges: Edge[]) => {
  const apiKey = process.env.API_KEY;

  if (!apiKey) {
    throw new Error("API Key não encontrada. Configure a variável de ambiente API_KEY no painel do Netlify.");
  }

  try {
    const ai = new GoogleGenAI({ apiKey });

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
      
      Responda em Português (Markdown).Seja conciso.
    `;

    const response = await generateWithRetry(ai, prompt);

    return response.text;
  } catch (error) {
    console.error("Gemini Analysis Failed:", error);
    throw error;
  }
};

export const generateDiagramFromText = async (description: string): Promise<{ nodes: Node<CustomNodeData>[], edges: Edge[] }> => {
  const apiKey = process.env.API_KEY;

  if (!apiKey) {
    throw new Error("API Key não encontrada.");
  }

  try {
    const ai = new GoogleGenAI({ apiKey });

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

      5. FORMATO DE SAÍDA:
         - Retorne APENAS um objeto JSON válido.
         - NÃO inclua comentários (// ou /* */) dentro do JSON.
         - NÃO use trailing commas.

      Exemplo de JSON esperado:
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

    const response = await generateWithRetry(ai, prompt, {
      responseMimeType: "application/json"
    });

    let jsonStr = response.text || "";
    
    // Limpeza robusta
    jsonStr = jsonStr.replace(/```json/g, '').replace(/```/g, '');
    
    const firstBrace = jsonStr.indexOf('{');
    const lastBrace = jsonStr.lastIndexOf('}');
    
    if (firstBrace !== -1 && lastBrace !== -1) {
      jsonStr = jsonStr.substring(firstBrace, lastBrace + 1);
    }

    jsonStr = jsonStr.trim();

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
    throw new Error(`Falha ao interpretar a arquitetura: ${error instanceof Error ? error.message : String(error)}`);
  }
};