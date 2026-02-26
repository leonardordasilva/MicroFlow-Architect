import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useDiagramStore } from '@/store/diagramStore';
import type { DiagramNode, DiagramEdge } from '@/types/diagram';

const DEBOUNCE_MS = 300;

export function useRealtimeCollab(shareToken: string | null) {
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isRemoteUpdate = useRef(false);

  // Broadcast local changes
  const broadcastChanges = useCallback(
    (nodes: DiagramNode[], edges: DiagramEdge[]) => {
      if (!channelRef.current || isRemoteUpdate.current) return;
      if (timerRef.current) clearTimeout(timerRef.current);

      timerRef.current = setTimeout(() => {
        channelRef.current?.send({
          type: 'broadcast',
          event: 'diagram_updated',
          payload: { nodes, edges },
        });
      }, DEBOUNCE_MS);
    },
    [],
  );

  useEffect(() => {
    if (!shareToken) return;

    const channel = supabase.channel(`diagram:${shareToken}`);

    channel
      .on('broadcast', { event: 'diagram_updated' }, (payload) => {
        const { nodes, edges } = payload.payload as { nodes: DiagramNode[]; edges: DiagramEdge[] };
        isRemoteUpdate.current = true;
        const store = useDiagramStore.getState();
        store.setNodes(nodes);
        store.setEdges(edges);
        // Reset flag after a tick
        setTimeout(() => {
          isRemoteUpdate.current = false;
        }, 50);
      })
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [shareToken]);

  return { broadcastChanges, isRemoteUpdate };
}
