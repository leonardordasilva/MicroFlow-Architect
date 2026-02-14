import { GoogleGenAI } from "@google/genai";
import { Node, Edge } from 'reactflow';
import { CustomNodeData } from '../types';

export const analyzeArchitecture = async (nodes: Node<CustomNodeData>[], edges: Edge[]) => {
  try {
    const apiKey = process.env.API_KEY;
    
    if (!apiKey) {
      throw new Error("API Key não configurada. Verifique suas variáveis de ambiente.");
    }

    // Initialize client only when needed to avoid startup crashes
    const ai = new GoogleGenAI({ apiKey });

    // Construct a textual representation of the graph
    const nodeDesc = nodes.map(n => `- ${n.data.label} (${n.data.type})`).join('\n');
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
    // Return a user-friendly error string instead of throwing, so the UI can display it
    return `Erro na análise: ${error instanceof Error ? error.message : "Falha desconhecida"}. Verifique se a API Key está válida.`;
  }
};