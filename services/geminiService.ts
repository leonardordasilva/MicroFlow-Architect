import { GoogleGenAI } from "@google/genai";
import { Node, Edge } from 'reactflow';
import { CustomNodeData, NodeType } from '../types';

export const analyzeArchitecture = async (nodes: Node<CustomNodeData>[], edges: Edge[]) => {
  // Inicialização Lazy: Apenas tenta acessar a chave quando a função é chamada.
  // Isso previne que a aplicação trave no carregamento inicial (White Screen) se a chave não estiver configurada.
  const apiKey = process.env.API_KEY;

  if (!apiKey) {
    throw new Error("API Key não encontrada. Configure a variável de ambiente API_KEY no painel do Netlify.");
  }

  try {
    const ai = new GoogleGenAI({ apiKey });

    // Construct a textual representation of the graph
    const nodeDesc = nodes.map(n => `- ${n.data.label} (${n.data.type}) ${n.data.hasDatabase ? '[Com Banco de Dados Interno]' : ''}`).join('\n');
    const edgeDesc = edges.map(e => {
      const source = nodes.find(n => n.id === e.source)?.data.label || e.source;
      const target = nodes.find(n => n.id === e.target)?.data.label || e.target;
      return `- ${source} connects to ${target} via ${e.label || 'direct connection'}`;
    }).join('\n');

    const prompt = `
      Você é um Arquiteto de Software Sênior especializado em microserviços e sistemas distribuídos.
      Analise o seguinte diagrama de arquitetura (nodes e arestas):
      
      NODES:
      ${nodeDesc}
      
      EDGES:
      ${edgeDesc}
      
      Por favor, forneça:
      1. Um resumo executivo do fluxo de dados.
      2. Pontos potenciais de falha (SPOFs) ou gargalos.
      3. Sugestões de melhoria para resiliência ou escalabilidade.
      4. Identifique se o padrão segue boas práticas de desacoplamento.
      
      Responda em Português usando Markdown formatado. Seja conciso e técnico.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: prompt,
    });

    return response.text;
  } catch (error) {
    console.error("Gemini Analysis Failed:", error);
    // Relançar o erro para que a interface possa exibir a mensagem apropriada
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
      Você é um gerador de layout inteligente para React Flow.
      O usuário descreveu um sistema: "${description}".

      Sua tarefa é gerar um JSON contendo 'nodes' e 'edges' para representar esse sistema, com foco total na clareza visual e isolamento de fluxos.
      
      Regras de Negócio:
      1. Tipos permitidos: 'service', 'queue', 'external', 'database'.
      2. BANCOS DE DADOS: Se um serviço tem DB próprio, use "hasDatabase": true no nó do serviço.

      Regras de Layout (CRÍTICO - ISOLAMENTO VISUAL):
      1. NÃO REUTILIZE NÓS DE SERVIÇO (REST): 
         - Se "Serviço A" e "Serviço B" chamam ambos o "Serviço C", você deve criar DOIS nós "Serviço C" distintos (ex: "Serviço C (A)" e "Serviço C (B)").
         - O objetivo é evitar linhas cruzadas. Cada chamador deve ter sua própria cópia da integração ao seu lado.
      2. FLUXO HIERÁRQUICO: Da esquerda para a direita.
      3. PROXIMIDADE ESTRITA: O serviço chamado deve estar IMEDIATAMENTE à direita do chamador (Offset X: +250px).
      4. ALINHAMENTO VERTICAL:
         - Se o "Serviço A" chama 3 serviços diferentes, empilhe esses 3 serviços verticalmente à direita de A.
      5. FILAS (Queues): Filas podem ser compartilhadas se fizer sentido lógico (ex: barramento), mas se a clareza ficar comprometida, duplique também.

      Retorne APENAS o JSON cru.
      Formato esperado:
      {
        "nodes": [
          { 
            "id": "n1", 
            "type": "service", 
            "position": { "x": 0, "y": 0 }, 
            "data": { "label": "API Gateway", "hasDatabase": false } 
          }
        ],
        "edges": [
          { "id": "e1", "source": "n1", "target": "n2", "label": "REST" }
        ]
      }
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: prompt,
    });

    let jsonStr = response.text || "";
    // Limpeza básica caso venha com markdown
    jsonStr = jsonStr.replace(/```json/g, '').replace(/```/g, '').trim();

    const result = JSON.parse(jsonStr);
    
    // Validar e mapear para garantir conformidade com o app
    const nodes = result.nodes.map((n: any) => ({
      ...n,
      data: { 
        ...n.data, 
        // Garantir que as propriedades necessárias existam para evitar erros de renderização
        type: n.type 
      }
    }));

    return {
      nodes: nodes,
      edges: result.edges
    };

  } catch (error) {
    console.error("Gemini Generation Failed:", error);
    throw new Error("Não foi possível gerar o diagrama. Tente detalhar mais a descrição.");
  }
};
