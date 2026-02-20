import { GoogleGenAI } from "@google/genai";
import { Node, Edge } from 'reactflow';
import { CustomNodeData, NodeType } from '../types';

// Lista de modelos para tentar em ordem de prioridade.
const MODELS = [
  'gemini-2.0-flash',
  'gemini-3-flash-preview',
  'gemini-flash-latest', 
  'gemini-1.5-flash-8b'
];

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const generateWithFallback = async (ai: GoogleGenAI, contents: any, config: any = {}) => {
  let lastError: any;

  for (const model of MODELS) {
    try {
      console.log(`Tentando modelo: ${model}`);
      return await ai.models.generateContent({
        model: model,
        contents: contents, // contents can be string or array of parts
        config: config
      });
    } catch (error: any) {
      lastError = error;
      const errMsg = String(error);
      
      const isQuotaError = errMsg.includes('429') || errMsg.includes('RESOURCE_EXHAUSTED') || errMsg.includes('Quota') || errMsg.includes('Too Many Requests');
      const isNotFoundError = errMsg.includes('404') || errMsg.includes('NOT_FOUND') || errMsg.includes('not found');
      const isOverloadedError = errMsg.includes('503') || errMsg.includes('Overloaded') || errMsg.includes('Service Unavailable');
      
      console.warn(`Falha no modelo ${model}.`, { isQuotaError, isNotFoundError, isOverloadedError, msg: errMsg });

      if (isQuotaError || isNotFoundError || isOverloadedError) {
        if (isQuotaError || isOverloadedError) {
            console.log("Aguardando liberação de recurso...");
            await sleep(1500);
        }
        continue; 
      }
      throw error;
    }
  }
  console.error("Todos os modelos de fallback falharam.");
  throw lastError;
};

export const analyzeArchitecture = async (nodes: Node<CustomNodeData>[], edges: Edge[]) => {
  const apiKey = process.env.API_KEY;

  if (!apiKey) {
    throw new Error("API Key não encontrada. Configure a variável de ambiente API_KEY no painel do Netlify.");
  }

  try {
    const ai = new GoogleGenAI({ apiKey });

    const nodeDesc = nodes.map(n => `- ${n.data.label} (${n.data.type}) ${n.data.databases?.length ? `[Possui ${n.data.databases.length} Bancos de Dados Internos]` : ''}`).join('\n');
    
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
      
      Responda em Português (Markdown). Seja conciso.
    `;

    const response = await generateWithFallback(ai, prompt);

    return response.text;
  } catch (error) {
    console.error("Gemini Analysis Failed:", error);
    throw error;
  }
};

// Helper robusto para extrair JSON usando contagem de chaves/colchetes
const extractJSON = (str: string) => {
  const firstOpen = str.indexOf('{');
  const firstArray = str.indexOf('[');
  
  let startIndex = -1;
  if (firstOpen !== -1 && firstArray !== -1) {
    startIndex = Math.min(firstOpen, firstArray);
  } else if (firstOpen !== -1) {
    startIndex = firstOpen;
  } else if (firstArray !== -1) {
    startIndex = firstArray;
  } else {
    return null;
  }
  
  const isObject = str[startIndex] === '{';
  let stack = 0;
  let inString = false;
  let escape = false;

  for (let i = startIndex; i < str.length; i++) {
    const char = str[i];
    
    if (escape) {
      escape = false;
      continue;
    }
    
    if (char === '\\') {
      escape = true;
      continue;
    }

    if (char === '"') {
      inString = !inString;
      continue;
    }

    if (!inString) {
      if (isObject) {
        if (char === '{') stack++;
        else if (char === '}') stack--;
      } else {
        if (char === '[') stack++;
        else if (char === ']') stack--;
      }

      if (stack === 0) {
        return str.substring(startIndex, i + 1);
      }
    }
  }
  return null;
};

// Helper para processar a resposta JSON da IA
const processAIResponse = (response: any) => {
    let jsonStr = response.text || "";
    
    // Tenta extrair o primeiro JSON válido
    const extracted = extractJSON(jsonStr);
    
    if (extracted) {
        jsonStr = extracted;
    } else {
        // Fallback para limpeza básica se a extração falhar
        jsonStr = jsonStr.replace(/```json/g, '').replace(/```/g, '');
        
        const firstOpen = jsonStr.indexOf('{');
        const firstArray = jsonStr.indexOf('[');
        let start = -1;
        let endChar = '';

        if (firstOpen !== -1 && (firstArray === -1 || firstOpen < firstArray)) {
             start = firstOpen;
             endChar = '}';
        } else if (firstArray !== -1) {
             start = firstArray;
             endChar = ']';
        }

        if (start !== -1) {
            const lastEnd = jsonStr.lastIndexOf(endChar);
            if (lastEnd !== -1) {
                jsonStr = jsonStr.substring(start, lastEnd + 1);
            } else {
                jsonStr = jsonStr.substring(start);
            }
        }
    }

    try {
        const result = JSON.parse(jsonStr);
        
        let nodes: any[] = [];
        let edges: any[] = [];

        // Verifica se o resultado é um array (formato plano) ou objeto {nodes, edges}
        if (Array.isArray(result)) {
            // Heurística: Itens com 'source' e 'target' são arestas, o resto são nós
            nodes = result.filter((item: any) => !item.source && !item.target);
            edges = result.filter((item: any) => item.source && item.target);
        } else if (result && typeof result === 'object') {
            nodes = result.nodes || [];
            edges = result.edges || [];
        }

        const processedNodes = nodes.map((n: any) => ({
          ...n,
          data: { 
            ...n.data, 
            type: n.data?.type || n.type || 'service' 
          }
        }));

        return {
          nodes: processedNodes,
          edges: edges
        };
    } catch (e) {
        console.error("Erro ao fazer parse do JSON:", jsonStr);
        throw new Error("A IA retornou um formato inválido. Tente novamente.");
    }
};

const COMMON_SYSTEM_PROMPT = `
      Atue como um gerador de diagramas de arquitetura React Flow altamente especializado.
      
      REGRAS CRÍTICAS DE COMPORTAMENTO (Siga estritamente):

      1. REGRA DE BANCO DE DADOS (Internalização e Quantidade):
         - Se a descrição diz que um serviço "tem um banco", "usa oracle", "salva dados":
           NÃO crie um nó separado do tipo "database". O banco deve ser interno.
         - QUANTIDADE: Se o usuário disser "tem 2 bancos", "possui 3 bases de dados", etc:
           Você deve preencher a propriedade "databases" dentro de "data".
           Esta propriedade deve ser um ARRAY de objetos.
           Exemplo para 2 bancos: "databases": [{ "id": "db_gen_1", "label": "DB Vendas" }, { "id": "db_gen_2", "label": "DB Log" }]
         - Se a quantidade não for especificada, mas disser que tem banco, crie um array com 1 objeto padrão.

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
         - Prefira a estrutura: { "nodes": [...], "edges": [...] }
         - Se retornar um array único, certifique-se que edges tenham 'source' e 'target'.
         - NÃO inclua comentários (// ou /* */) dentro do JSON.
         - NÃO use trailing commas.
`;

export const generateDiagramFromText = async (description: string): Promise<{ nodes: Node<CustomNodeData>[], edges: Edge[] }> => {
  const apiKey = process.env.API_KEY;

  if (!apiKey) {
    throw new Error("API Key não encontrada.");
  }

  try {
    const ai = new GoogleGenAI({ apiKey });

    const prompt = `
      ${COMMON_SYSTEM_PROMPT}
      
      Descrição do usuário: "${description}".
    `;

    const response = await generateWithFallback(ai, prompt, {
      responseMimeType: "application/json"
    });

    return processAIResponse(response);

  } catch (error) {
    console.error("Gemini Generation Failed:", error);
    throw new Error(`Falha ao interpretar a arquitetura: ${error instanceof Error ? error.message : String(error)}`);
  }
};