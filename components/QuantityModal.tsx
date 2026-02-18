import React, { useState, useEffect, useRef } from 'react';
import { Layers, X, Box, Network } from 'lucide-react';
import { NodeType } from '../types';

interface QuantityModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (count: number, isInternal: boolean) => void;
  title?: string;
  targetType?: NodeType;
  sourceType?: NodeType;
}

const QuantityModal: React.FC<QuantityModalProps> = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title = "Adicionar Componentes",
  targetType,
  sourceType
}) => {
  const [count, setCount] = useState<number>(1);
  const [isInternal, setIsInternal] = useState<boolean>(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Determina se devemos mostrar a opção de escolha.
  // Regra Exata: Origem = Serviço E Destino = Serviço.
  // Qualquer outra combinação (ex: Fila, Banco, ou Origem Fila) esconde a opção.
  const showLocationChoice = targetType === NodeType.SERVICE && sourceType === NodeType.SERVICE;

  useEffect(() => {
    if (isOpen) {
      setCount(1);
      // Reset logic: Default to External (False) everytime modal opens
      setIsInternal(false); 
      
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 50);
    }
  }, [isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (count > 0) {
      onConfirm(count, isInternal);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-sm border border-slate-200 dark:border-slate-800 p-6 scale-100 animate-in zoom-in-95 duration-200">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
            <Layers className="w-5 h-5" />
            <h3 className="font-bold text-lg text-slate-900 dark:text-slate-100">{title}</h3>
          </div>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit}>
          
          {/* Location Choice - Restricted to Service->Service */}
          {showLocationChoice && (
            <div className="mb-6 grid grid-cols-2 gap-3">
              <div 
                onClick={() => setIsInternal(false)}
                className={`cursor-pointer rounded-lg border p-3 flex flex-col items-center gap-2 transition-all ${!isInternal ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-500 text-blue-700 dark:text-blue-300 ring-1 ring-blue-500' : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500'}`}
              >
                <Network className="w-5 h-5" />
                <span className="text-xs font-bold">Novo Nó (Externo)</span>
              </div>
              
              <div 
                onClick={() => setIsInternal(true)}
                className={`cursor-pointer rounded-lg border p-3 flex flex-col items-center gap-2 transition-all ${isInternal ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-500 text-blue-700 dark:text-blue-300 ring-1 ring-blue-500' : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500'}`}
              >
                <Box className="w-5 h-5" />
                <span className="text-xs font-bold">Interno (Nested)</span>
              </div>
            </div>
          )}

          <div className="mb-6">
            <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-2">
              Quantidade
            </label>
            <input
              ref={inputRef}
              type="number"
              min="1"
              max="20"
              value={count}
              onChange={(e) => setCount(parseInt(e.target.value) || 0)}
              className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 outline-none transition-all text-center font-bold text-lg"
            />
            <p className="text-xs text-slate-500 mt-2 text-center">
              {isInternal 
                ? "Os componentes serão criados DENTRO do nó atual."
                : "Os nós serão distribuídos automaticamente no canvas."
              }
            </p>
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 font-medium transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium shadow-lg shadow-blue-500/20 transition-all active:scale-95"
            >
              Confirmar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default QuantityModal;