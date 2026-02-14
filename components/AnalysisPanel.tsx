import React, { useState } from 'react';
import { Bot, X, Sparkles, Loader2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { analyzeArchitecture } from '../services/geminiService';
import { Node, Edge } from 'reactflow';
import { CustomNodeData } from '../types';

interface AnalysisPanelProps {
  nodes: Node<CustomNodeData>[];
  edges: Edge[];
  isOpen: boolean;
  onClose: () => void;
}

const AnalysisPanel: React.FC<AnalysisPanelProps> = ({ nodes, edges, isOpen, onClose }) => {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const handleAnalyze = async () => {
    setLoading(true);
    try {
      const text = await analyzeArchitecture(nodes, edges);
      setResult(text || "No response received.");
    } catch (err) {
      setResult("Erro ao analisar arquitetura. Verifique a API Key.");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed right-0 top-0 h-full w-96 bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 shadow-2xl z-50 flex flex-col transition-transform duration-300">
      <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-950">
        <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
          <Bot className="w-6 h-6" />
          <h2 className="font-bold text-lg">AI Architect</h2>
        </div>
        <button onClick={onClose} className="p-1 hover:bg-slate-200 dark:hover:bg-slate-800 rounded">
          <X className="w-5 h-5 text-slate-500" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {!result && !loading && (
          <div className="text-center py-10">
            <Sparkles className="w-12 h-12 text-amber-400 mx-auto mb-4" />
            <p className="text-slate-600 dark:text-slate-300 mb-6">
              Use a IA para analisar o diagrama atual, encontrar gargalos e sugerir melhorias.
            </p>
            <button
              onClick={handleAnalyze}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium shadow-lg transition-colors flex items-center gap-2 mx-auto"
            >
              <Sparkles className="w-4 h-4" />
              Analisar Arquitetura
            </button>
          </div>
        )}

        {loading && (
          <div className="flex flex-col items-center justify-center py-20 text-blue-500">
            <Loader2 className="w-10 h-10 animate-spin mb-4" />
            <p className="text-sm font-medium animate-pulse">Consultando Arquiteto Gemini...</p>
          </div>
        )}

        {result && (
          <div className="prose dark:prose-invert prose-sm max-w-none">
            <ReactMarkdown>{result}</ReactMarkdown>
          </div>
        )}
      </div>
      
      {result && (
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950">
           <button
              onClick={handleAnalyze}
              disabled={loading}
              className="w-full bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 px-4 py-2 rounded-lg font-medium transition-colors text-sm"
            >
              Regenerar Análise
            </button>
        </div>
      )}
    </div>
  );
};

export default AnalysisPanel;
