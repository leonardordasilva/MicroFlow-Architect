import { useState, useCallback, useEffect, useRef } from 'react';
import { useDiagramStore } from '@/store/diagramStore';
import { useAuth } from '@/hooks/useAuth';
import { saveDiagram, saveSharedDiagram } from '@/services/diagramService';
import { toast } from '@/hooks/use-toast';
import type { DiagramNode, DiagramEdge } from '@/types/diagram';

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

  const nodes = useDiagramStore((s) => s.nodes);
  const edges = useDiagramStore((s) => s.edges);
  const diagramName = useDiagramStore((s) => s.diagramName);
  const diagramId = useDiagramStore((s) => s.currentDiagramId);
  const isCollaborator = useDiagramStore((s) => s.isCollaborator);
  const setDiagramId = useDiagramStore((s) => s.setCurrentDiagramId);

  const save = useCallback(async () => {
    if (!user) return;
    setSaving(true);
    try {
      if (isCollaborator && diagramId) {
        await saveSharedDiagram(diagramId, nodes, edges);
        toast({ title: 'Alterações salvas no diagrama compartilhado!' });
      } else {
        const isSharedContext = !!shareToken && !diagramId;
        const record = await saveDiagram(diagramName, nodes, edges, user.id, diagramId);
        setDiagramId(record.id);
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
      toast({ title: 'Erro ao salvar', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  }, [user, diagramName, nodes, edges, diagramId, shareToken, isCollaborator, setDiagramId]);

  // PERF-05: Stable ref always pointing to latest save
  const saveRef = useRef<() => void>(() => {});
  useEffect(() => {
    saveRef.current = save;
  }, [save]);

  return { save, saving, saveRef };
}
