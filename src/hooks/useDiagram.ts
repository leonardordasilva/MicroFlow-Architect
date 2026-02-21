import { useState, useCallback, useRef } from 'react';
import {
  addEdge,
  applyNodeChanges,
  applyEdgeChanges,
  type Connection,
  type NodeChange,
  type EdgeChange,
} from '@xyflow/react';
import type { DiagramNode, DiagramEdge, NodeType, HistoryEntry } from '@/types/diagram';
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
      setEdges((eds) =>
        addEdge(
          {
            ...connection,
            type: 'smoothstep',
            animated: true,
            style: { strokeWidth: 2 },
            markerEnd: { type: 'arrowclosed' as any },
          },
          eds
        ) as DiagramEdge[]
      );
    },
    [pushHistory]
  );

  const addNode = useCallback(
    (type: NodeType) => {
      pushHistory();
      const labelMap: Record<NodeType, string> = {
        service: 'Microserviço',
        database: 'Oracle',
        queue: 'MQ',
        external: 'REST',
      };
      const newNode: DiagramNode = {
        id: createNodeId(),
        type,
        position: { x: Math.random() * 400 + 100, y: Math.random() * 300 + 100 },
        data: { label: labelMap[type], type, internalDatabases: [], internalServices: [] },
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
    deleteSelected,
    undo,
    redo,
    autoLayout,
    clearCanvas,
    loadDiagram,
    exportJSON,
  };
}
