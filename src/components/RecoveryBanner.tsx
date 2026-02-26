import { useState, useEffect } from 'react';
import { getAutoSave, clearAutoSave, type AutoSaveData } from '@/hooks/useAutoSave';
import { useDiagramStore } from '@/store/diagramStore';
import { X, FolderOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function RecoveryBanner() {
  const [savedData, setSavedData] = useState<AutoSaveData | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const nodes = useDiagramStore((s) => s.nodes);

  useEffect(() => {
    // Only show if canvas is empty and autosave exists
    if (nodes.length === 0 && !dismissed) {
      const data = getAutoSave();
      setSavedData(data);
    }
  }, []); // Run once on mount

  if (!savedData || dismissed || nodes.length > 0) return null;

  const formattedDate = new Date(savedData.savedAt).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const handleRestore = () => {
    const { loadDiagram, setDiagramName } = useDiagramStore.getState();
    loadDiagram(savedData.nodes, savedData.edges);
    if (savedData.title) setDiagramName(savedData.title);
    setDismissed(true);
  };

  const handleDiscard = () => {
    clearAutoSave();
    setDismissed(true);
  };

  return (
    <div className="absolute top-2 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-top-2 duration-300">
      <div className="flex items-center gap-3 rounded-lg border border-amber-500/30 bg-amber-900/80 px-4 py-2.5 shadow-lg backdrop-blur-sm">
        <FolderOpen className="h-4 w-4 text-amber-300 shrink-0" />
        <span className="text-sm text-amber-100">
          Diagrama recuperado: "<strong>{savedData.title}</strong>" — salvo em {formattedDate}
        </span>
        <div className="flex items-center gap-1.5 ml-2">
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs border-amber-500/40 bg-amber-800/50 text-amber-100 hover:bg-amber-700/60"
            onClick={handleRestore}
          >
            Restaurar
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 text-xs text-amber-300 hover:bg-amber-800/50 hover:text-amber-100"
            onClick={handleDiscard}
          >
            <X className="h-3.5 w-3.5 mr-1" />
            Descartar
          </Button>
        </div>
      </div>
    </div>
  );
}
