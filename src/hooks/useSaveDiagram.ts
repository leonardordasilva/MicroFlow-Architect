import { useState, useCallback, useEffect, useRef } from 'react';
import { useDiagramStore } from '@/store/diagramStore';
import { useAuth } from '@/hooks/useAuth';
import { saveDiagram, saveSharedDiagram } from '@/services/diagramService';
import { clearAutoSave } from '@/hooks/useAutoSave';
import { toast } from '@/hooks/use-toast';

interface UseSaveDiagramOptions {
  shareToken?: string;
}

interface UseSaveDiagramReturn {
  save: () => Promise<void>;
  saving: boolean;
  /** Stable ref that always points to latest save — use in event handlers to avoid stale closures */
  saveRef: React.RefObject<() => void>;
}

export function useSaveDiagram({ shareToken }: UseSaveDiagramOptions = {}): UseSaveDiagramReturn {
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);

  // PERF-05: Read store state at call time instead of subscribing — avoids unnecessary callback recreation
  const save = useCallback(async () => {
    if (!user) return;

    // Snapshot current store state at the moment of save
    const { nodes, edges, diagramName, currentDiagramId: diagramId, isCollaborator } = useDiagramStore.getState();
    const setDiagramId = useDiagramStore.getState().setCurrentDiagramId;

    setSaving(true);
    try {
      if (isCollaborator && diagramId) {
        await saveSharedDiagram(diagramId, nodes, edges);
        clearAutoSave();
        toast({ title: 'Alterações salvas no diagrama compartilhado!' });
      } else {
        const isSharedContext = !!shareToken && !diagramId;
        const record = await saveDiagram(diagramName, nodes, edges, user.id, diagramId);
        setDiagramId(record.id);
        clearAutoSave();
        if (isSharedContext) {
          toast({
            title: 'Diagrama salvo como cópia!',
            description: 'Uma cópia deste diagrama foi salva em "Meus Diagramas". Você não está editando o diagrama original.',
            duration: 6000,
          });
        } else {
          toast({ title: 'Diagrama salvo na nuvem!' });
        }
      }
    } catch (err: any) {
      console.error('[useSaveDiagram] Save error:', err);
      toast({ title: 'Erro ao salvar', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  }, [user, shareToken]); // Minimal deps — store state read at call time

  // PERF-05: Stable ref always pointing to latest save
  const saveRef = useRef<() => void>(() => {});
  useEffect(() => {
    saveRef.current = save;
  }, [save]);

  return { save, saving, saveRef };
}
