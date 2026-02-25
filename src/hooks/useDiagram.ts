import { useState, useCallback, useRef } from 'react';
import {
  addEdge,
  applyNodeChanges,
  applyEdgeChanges,
  type Connection,
  type NodeChange,
  type EdgeChange,
} from '@xyflow/react';
import type { DiagramNode, DiagramEdge, DiagramNodeData, NodeType, HistoryEntry } from '@/types/diagram';
import { getLayoutedElements } from '@/services/layoutService';

const createNodeId = () => `node_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;

export function useDiagram() {
  const [nodes, setNodes] = useState<DiagramNode[]>([]);
  const [edges, setEdges] = useState<DiagramEdge[]>([]);
  const [diagramName, setDiagramName] = useState('Novo Diagrama');

  const historyRef = useRef<HistoryEntry[]>([{ nodes: [], edges: [] }]);
  const historyIndexRef = useRef(0);

  const pushHistory = useCallback(() => {
    const newEntry = { nodes: [...nodes], edges: [...edges] };
    historyRef.current = historyRef.current.slice(0, historyIndexRef.current + 1);
    historyRef.current.push(newEntry);
    historyIndexRef.current = historyRef.current.length - 1;
  }, [nodes, edges]);

  const onNodesChange = useCallback(
    (changes: NodeChange[]) => setNodes((nds) => applyNodeChanges(changes, nds) as DiagramNode[]),
    []
  );

  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => setEdges((eds) => applyEdgeChanges(changes, eds) as DiagramEdge[]),
    []
  );

  const onConnect = useCallback(
    (connection: Connection) => {
      pushHistory();

      // Determine label based on source/target types
      const sourceNode = nodes.find((n) => n.id === connection.source);
      const targetNode = nodes.find((n) => n.id === connection.target);
      let edgeLabel: string | undefined;

      if (sourceNode?.type === 'service' && targetNode?.type === 'queue') {
        edgeLabel = 'produce';
      } else if (sourceNode?.type === 'queue' && targetNode?.type === 'service') {
        edgeLabel = 'consume';
      }

      setEdges((eds) =>
        addEdge(
          {
            ...connection,
            type: 'editable',
            animated: true,
            style: { strokeWidth: 2 },
            markerEnd: { type: 'arrowclosed' as any },
            data: { waypoints: undefined },
            ...(edgeLabel ? { label: edgeLabel, labelStyle: { fontSize: 11, fontWeight: 600 } } : {}),
          },
          eds
        ) as DiagramEdge[]
      );
    },
    [pushHistory, nodes]
  );

  const addNode = useCallback(
    (type: NodeType, subType?: string) => {
      pushHistory();
      const labelMap: Record<NodeType, string> = {
        service: 'Microserviço',
        database: subType || 'Oracle',
        queue: 'MQ',
        external: 'REST',
      };
      const newNode: DiagramNode = {
        id: createNodeId(),
        type,
        position: { x: Math.random() * 400 + 100, y: Math.random() * 300 + 100 },
        data: { label: labelMap[type], type, subType, internalDatabases: [], internalServices: [] },
      };
      setNodes((prev) => [...prev, newNode]);
    },
    [pushHistory]
  );

  const deleteSelected = useCallback(() => {
    pushHistory();
    setNodes((nds) => nds.filter((n) => !n.selected));
    setEdges((eds) => {
      const selectedNodeIds = new Set(nodes.filter((n) => n.selected).map((n) => n.id));
      return eds.filter((e) => !e.selected && !selectedNodeIds.has(e.source) && !selectedNodeIds.has(e.target));
    });
  }, [pushHistory, nodes]);

  const undo = useCallback(() => {
    if (historyIndexRef.current > 0) {
      historyIndexRef.current -= 1;
      const entry = historyRef.current[historyIndexRef.current];
      setNodes(entry.nodes);
      setEdges(entry.edges);
    }
  }, []);

  const redo = useCallback(() => {
    if (historyIndexRef.current < historyRef.current.length - 1) {
      historyIndexRef.current += 1;
      const entry = historyRef.current[historyIndexRef.current];
      setNodes(entry.nodes);
      setEdges(entry.edges);
    }
  }, []);

  const autoLayout = useCallback(
    (direction: 'TB' | 'LR' = 'LR') => {
      pushHistory();
      const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(nodes, edges, direction);
      setNodes(layoutedNodes);
      setEdges(layoutedEdges);
    },
    [nodes, edges, pushHistory]
  );

  const addNodesFromSource = useCallback(
    (sourceNodeId: string, type: NodeType, count: number, subType?: string) => {
      pushHistory();
      const sourceNode = nodes.find((n) => n.id === sourceNodeId);
      if (!sourceNode) return;

      const sourceData = sourceNode.data as unknown as DiagramNodeData;

      // If adding Oracle from a service node, embed it inside the service
      if (type === 'database' && subType === 'Oracle' && sourceNode.type === 'service') {
        const currentDbs = sourceData.internalDatabases || [];
        const newDbs = [...currentDbs];
        for (let i = 0; i < count; i++) {
          newDbs.push(`Oracle ${currentDbs.length + i + 1}`);
        }
        setNodes((prev) =>
          prev.map((n) =>
            n.id === sourceNodeId
              ? { ...n, data: { ...n.data, internalDatabases: newDbs } }
              : n
          )
        );
        return;
      }

      const labelMap: Record<NodeType, string> = {
        service: 'Microserviço',
        database: subType || 'Oracle',
        queue: 'MQ',
        external: 'REST',
      };

      const newNodes: DiagramNode[] = [];
      const newEdges: DiagramEdge[] = [];

      for (let i = 0; i < count; i++) {
        const id = createNodeId();
        newNodes.push({
          id,
          type,
          position: {
            x: sourceNode.position.x + 250,
            y: sourceNode.position.y + i * 120 - ((count - 1) * 60),
          },
          data: { label: `${labelMap[type]} ${count > 1 ? i + 1 : ''}`.trim(), type, subType, internalDatabases: [], internalServices: [] },
        });
        // Determine edge label based on source/target types
        let edgeLabel: string | undefined;
        if (sourceNode.type === 'service' && type === 'queue') {
          edgeLabel = 'produce';
        } else if (sourceNode.type === 'queue' && type === 'service') {
          edgeLabel = 'consume';
        }

        newEdges.push({
          id: `edge_${sourceNodeId}_${id}`,
          source: sourceNodeId,
          target: id,
          type: 'editable',
          animated: true,
          style: { strokeWidth: 2 },
          markerEnd: { type: 'arrowclosed' as any },
          data: { waypoints: undefined },
          ...(edgeLabel ? { label: edgeLabel, labelStyle: { fontSize: 11, fontWeight: 600 } } : {}),
        });
      }

      setNodes((prev) => [...prev, ...newNodes]);
      setEdges((prev) => [...prev, ...newEdges]);
    },
    [nodes, pushHistory]
  );

  const clearCanvas = useCallback(() => {
    pushHistory();
    setNodes([]);
    setEdges([]);
  }, [pushHistory]);

  const loadDiagram = useCallback((newNodes: DiagramNode[], newEdges: DiagramEdge[]) => {
    pushHistory();
    setNodes(newNodes);
    setEdges(newEdges);
  }, [pushHistory]);

  const exportJSON = useCallback(() => {
    return JSON.stringify({ name: diagramName, nodes, edges }, null, 2);
  }, [diagramName, nodes, edges]);

  return {
    nodes,
    edges,
    diagramName,
    setDiagramName,
    setNodes,
    setEdges,
    onNodesChange,
    onEdgesChange,
    onConnect,
    addNode,
    addNodesFromSource,
    deleteSelected,
    undo,
    redo,
    autoLayout,
    clearCanvas,
    loadDiagram,
    exportJSON,
  };
}
