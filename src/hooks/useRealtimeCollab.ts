import { useEffect, useRef, useCallback, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useDiagramStore } from '@/store/diagramStore';
import type { DiagramNode, DiagramEdge } from '@/types/diagram';

const DEBOUNCE_MS = 300;

export interface Collaborator {
  userId: string;
  email: string;
  color: string;
}

const AVATAR_COLORS = [
  'hsl(217, 91%, 60%)',
  'hsl(142, 71%, 45%)',
  'hsl(319, 80%, 55%)',
  'hsl(38, 92%, 50%)',
  'hsl(262, 83%, 58%)',
  'hsl(0, 72%, 51%)',
];

export function useRealtimeCollab(shareToken: string | null) {
  const diagramId = useDiagramStore((s) => s.currentDiagramId);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const dbChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isRemoteUpdate = useRef(false);
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);

  // PERF-02: Track last broadcast content to avoid redundant sends
  const lastBroadcastRef = useRef<string>('');

  const broadcastChanges = useCallback(
    (nodes: DiagramNode[], edges: DiagramEdge[]) => {
      if (!channelRef.current || isRemoteUpdate.current) return;
      if (timerRef.current) clearTimeout(timerRef.current);

      timerRef.current = setTimeout(() => {
        const serialized = JSON.stringify({ nodes, edges });
        // PERF-02: Only broadcast if content actually changed
        if (serialized === lastBroadcastRef.current) return;
        lastBroadcastRef.current = serialized;

        channelRef.current?.send({
          type: 'broadcast',
          event: 'diagram_updated',
          payload: { nodes, edges },
        });
      }, DEBOUNCE_MS);
    },
    [],
  );

  // Broadcast channel for live cursor-style updates
  useEffect(() => {
    if (!shareToken) return;

    const channel = supabase.channel(`diagram:${shareToken}`, {
      config: { presence: { key: 'user' } },
    });

    channel
      .on('broadcast', { event: 'diagram_updated' }, (payload) => {
        const { nodes, edges } = payload.payload as { nodes: DiagramNode[]; edges: DiagramEdge[] };
        isRemoteUpdate.current = true;

        const temporal = useDiagramStore.temporal.getState();
        temporal.pause();

        const store = useDiagramStore.getState();
        store.setNodes(nodes);
        store.setEdges(edges);

        temporal.resume();

        setTimeout(() => {
          isRemoteUpdate.current = false;
        }, 50);
      })
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const users: Collaborator[] = [];
        const seen = new Set<string>();
        Object.values(state).forEach((presences: any[]) => {
          presences.forEach((p) => {
            if (p.userId && !seen.has(p.userId)) {
              seen.add(p.userId);
              users.push({
                userId: p.userId,
                email: p.email || '',
                color: AVATAR_COLORS[users.length % AVATAR_COLORS.length],
              });
            }
          });
        });
        setCollaborators(users);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          const { data } = await supabase.auth.getUser();
          if (data?.user) {
            await channel.track({
              userId: data.user.id,
              email: data.user.email || '',
              online_at: new Date().toISOString(),
            });
          }
        }
      });

    channelRef.current = channel;

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [shareToken]);

  // PERF-03: Track last known updated_at to avoid unnecessary state updates
  const lastUpdatedAtRef = useRef<string>('');

  // Postgres Realtime channel: listen for DB-level updates on the current diagram
  useEffect(() => {
    if (!diagramId) return;

    const dbChannel = supabase
      .channel(`db-diagram:${diagramId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'diagrams',
          filter: `id=eq.${diagramId}`,
        },
        (payload) => {
          if (isRemoteUpdate.current) return;

          const newRecord = payload.new as any;

          // PERF-03: Compare updated_at first to avoid expensive JSON operations
          const remoteUpdatedAt = newRecord.updated_at as string;
          if (remoteUpdatedAt && remoteUpdatedAt === lastUpdatedAtRef.current) {
            return;
          }
          lastUpdatedAtRef.current = remoteUpdatedAt || '';

          const store = useDiagramStore.getState();
          const remoteNodes = newRecord.nodes as DiagramNode[];
          const remoteEdges = newRecord.edges as DiagramEdge[];

          isRemoteUpdate.current = true;
          const temporal = useDiagramStore.temporal.getState();
          temporal.pause();

          store.setNodes(remoteNodes);
          store.setEdges(remoteEdges);
          if (newRecord.title && newRecord.title !== store.diagramName) {
            store.setDiagramName(newRecord.title);
          }

          temporal.resume();
          setTimeout(() => {
            isRemoteUpdate.current = false;
          }, 50);
        },
      )
      .subscribe();

    dbChannelRef.current = dbChannel;

    return () => {
      supabase.removeChannel(dbChannel);
      dbChannelRef.current = null;
    };
  }, [diagramId]);

  return { broadcastChanges, isRemoteUpdate, collaborators };
}
