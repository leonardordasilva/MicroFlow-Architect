import React, { useState, useRef, useEffect } from 'react';
import { X, Loader2, ArrowRight, UploadCloud, FileJson, FileType } from 'lucide-react';

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (content: string, type: 'json') => Promise<void>;
}

const ImportModal: React.FC<ImportModalProps> = ({ isOpen, onClose, onImport }) => {
  const [selectedFile, setSelectedFile] = useState<{ content: string; type: 'json'; name: string } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setSelectedFile(null);
      setError(null);
    }
  }, [isOpen]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const processFile = (file: File) => {
    setError(null);

    // Check for JSON
    if (file.type === 'application/json' || file.name.endsWith('.json')) {
        const reader = new FileReader();
        reader.onload = (event) => {
            const content = event.target?.result as string;
            // Validate JSON
            try {
                JSON.parse(content);
                setSelectedFile({ content, type: 'json', name: file.name });
            } catch (e) {
                setError("O arquivo JSON é inválido.");
            }
        };
        reader.onerror = () => setError("Erro ao ler o arquivo.");
        reader.readAsText(file);
        return;
    }

    setError("Formato não suportado. Use JSON (Backup).");
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handleSubmit = async () => {
    if (!selectedFile) return;

    setIsLoading(true);
    setError(null);
    try {
      await onImport(selectedFile.content, selectedFile.type);
      onClose();
    } catch (err: any) {
      const errorMessage = err?.message || String(err);
      setError(`Falha ao importar: ${errorMessage.substring(0, 100)}...`);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-lg border border-slate-200 dark:border-slate-800 flex flex-col scale-100 animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-950/50 rounded-t-xl">
          <div className="flex items-center gap-3">
            <div className="bg-blue-100 dark:bg-blue-900/30 p-2 rounded-lg text-blue-600 dark:text-blue-400">
              <UploadCloud className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-xl text-slate-900 dark:text-slate-100">Importar Arquivo</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">Restaurar backup (JSON).</p>
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
        <div className="p-6">
          
          {!selectedFile ? (
            <div 
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors gap-4 text-center group"
            >
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileChange} 
                className="hidden" 
                accept=".json"
              />
              <div className="bg-slate-100 dark:bg-slate-800 p-4 rounded-full group-hover:scale-110 transition-transform">
                <UploadCloud className="w-8 h-8 text-slate-400 dark:text-slate-500" />
              </div>
              <div>
                <p className="font-medium text-slate-700 dark:text-slate-300">Clique ou arraste o arquivo</p>
                <p className="text-sm text-slate-500 mt-1">.JSON (Backup exato)</p>
              </div>
            </div>
          ) : (
            <div className="relative rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-4 flex flex-col items-center justify-center gap-3">
              <button 
                onClick={() => setSelectedFile(null)}
                className="absolute top-2 right-2 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 p-1 rounded-full transition-colors"
                title="Remover arquivo"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="h-20 w-20 bg-blue-100 dark:bg-blue-900/20 rounded-xl flex items-center justify-center text-blue-600 dark:text-blue-400">
                  <FileJson className="w-10 h-10" />
              </div>
              <p className="font-mono text-sm text-slate-600 dark:text-slate-300 truncate max-w-full px-4">{selectedFile.name}</p>
              <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/10 px-3 py-1 rounded-full text-xs font-medium border border-emerald-100 dark:border-emerald-900/30">
                  <FileType className="w-3 h-3" />
                  Modo: Restauração de Backup
              </div>
            </div>
          )}

          {error && (
            <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm rounded-lg flex items-center gap-2 border border-red-100 dark:border-red-900/50">
              <span className="w-1.5 h-1.5 bg-red-500 rounded-full shrink-0" />
              {error}
            </div>
          )}
          
          <div className="mt-4 bg-slate-50 dark:bg-slate-900/50 p-3 rounded-lg border border-slate-100 dark:border-slate-800">
             <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                <span className="font-bold">JSON:</span> Restaura o diagrama exatamente como foi salvo.
             </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 rounded-b-xl flex justify-end gap-3">
           <button
            onClick={onClose}
            disabled={isLoading}
            className="px-5 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800 font-medium transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={isLoading || !selectedFile}
            className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-medium shadow-lg shadow-blue-500/20 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Processando...</span>
              </>
            ) : (
              <>
                <UploadCloud className="w-5 h-5" />
                <span>Importar</span>
                <ArrowRight className="w-4 h-4 ml-1" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ImportModal;