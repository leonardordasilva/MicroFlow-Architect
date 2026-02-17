import React, { useState, useRef, useEffect } from 'react';
import { Sparkles, X, Loader2, ArrowRight } from 'lucide-react';

interface TextToDiagramModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGenerate: (text: string) => Promise<void>;
}

const TextToDiagramModal: React.FC<TextToDiagramModalProps> = ({ isOpen, onClose, onGenerate }) => {
  const [description, setDescription] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isOpen) {
      setDescription('');
      setError(null);
      setTimeout(() => {
        textareaRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) return;

    setIsLoading(true);
    setError(null);
    try {
      await onGenerate(description);
      onClose();
    } catch (err: any) {
      // Extrair mensagem de erro para verificar se é problema de cota ou sobrecarga
      const errorMessage = err?.message || String(err);
      
      const isQuota = errorMessage.includes('429') || errorMessage.includes('RESOURCE_EXHAUSTED') || errorMessage.includes('Quota') || errorMessage.includes('Too Many Requests');
      const isOverloaded = errorMessage.includes('503') || errorMessage.includes('Overloaded') || errorMessage.includes('Service Unavailable');
      
      if (isQuota) {
        setError("Cota excedida em todos os modelos. Aguarde 1 minuto.");
      } else if (isOverloaded) {
        setError("Serviço temporariamente sobrecarregado (503). Tente novamente em instantes.");
      } else {
        setError(`Falha ao gerar diagrama: ${errorMessage.substring(0, 100)}...`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[90vh] scale-100 animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-950/50 rounded-t-xl">
          <div className="flex items-center gap-3">
            <div className="bg-purple-100 dark:bg-purple-900/30 p-2 rounded-lg text-purple-600 dark:text-purple-400">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-xl text-slate-900 dark:text-slate-100">Gerar Diagrama com IA</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">Descreva sua arquitetura e deixe a IA desenhar para você.</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors p-1"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
        
        {/* Body */}
        <div className="p-6 flex-1 overflow-y-auto">
          <form id="gen-form" onSubmit={handleSubmit}>
            <div className="space-y-4">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                Descrição do Sistema
              </label>
              <textarea
                ref={textareaRef}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Ex: Uma API Gateway recebe requisições e envia para um Serviço de Pedidos. O Serviço de Pedidos salva em um banco SQL e publica uma mensagem numa fila MQ. Um Serviço de Pagamentos consome essa fila."
                className="w-full h-48 px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-purple-500 outline-none transition-all resize-none text-base leading-relaxed placeholder:text-slate-400"
                disabled={isLoading}
              />
              
              {error && (
                <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm rounded-lg flex items-center gap-2 animate-in fade-in slide-in-from-top-1 border border-red-100 dark:border-red-900/50">
                  <span className="w-1.5 h-1.5 bg-red-500 rounded-full shrink-0" />
                  {error}
                </div>
              )}

              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl border border-blue-100 dark:border-blue-800/50">
                <h4 className="text-sm font-bold text-blue-700 dark:text-blue-300 mb-2">Dicas para melhores resultados:</h4>
                <ul className="text-xs text-blue-600 dark:text-blue-400 space-y-1 list-disc list-inside">
                  <li>Especifique os nomes dos serviços (ex: "Serviço de Checkout").</li>
                  <li>Mencione tecnologias para ícones corretos (ex: "Banco SQL", "Fila RabbitMQ/IBM MQ").</li>
                  <li>Descreva o fluxo dos dados (quem chama quem).</li>
                </ul>
              </div>
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 rounded-b-xl flex justify-end gap-3">
           <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="px-5 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800 font-medium transition-colors"
          >
            Cancelar
          </button>
          <button
            type="submit"
            form="gen-form"
            disabled={isLoading || !description.trim()}
            className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-medium shadow-lg shadow-purple-500/20 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Gerando...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5" />
                <span>Gerar Diagrama</span>
                <ArrowRight className="w-4 h-4 ml-1" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default TextToDiagramModal;