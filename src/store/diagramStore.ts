import { create } from 'zustand';
import { temporal } from 'zundo';
import {
  addEdge,
  applyNodeChanges,
  applyEdgeChanges,
  type Connection,
  type NodeChange,
  type EdgeChange,
} from '@xyflow/react';
import type { DiagramNode, DiagramEdge, DiagramNodeData, NodeType } from '@/types/diagram';
import { getLayoutedElements, getELKLayoutedElements, type LayoutDirection } from '@/services/layoutService';

const createNodeId = () => `node_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;

interface DiagramState {
  nodes: DiagramNode[];
  edges: DiagramEdge[];
  diagramName: string;
  isAnalyzing: boolean;
  analysisResult: string | null;
}

interface DiagramActions {
  setNodes: (nodes: DiagramNode[]) => void;
  setEdges: (edges: DiagramEdge[]) => void;
  setDiagramName: (name: string) => void;
  setIsAnalyzing: (value: boolean) => void;
  setAnalysisResult: (result: string | null) => void;

  onNodesChange: (changes: NodeChange[]) => void;
  onEdgesChange: (changes: EdgeChange[]) => void;
  onConnect: (connection: Connection) => void;
  onNodeDragHandler: (event: React.MouseEvent, node: DiagramNode) => void;

  addNode: (type: NodeType, subType?: string) => void;
  addNodesFromSource: (sourceNodeId: string, type: NodeType, count: number, subType?: string) => void;
  deleteSelected: () => void;
  autoLayout: (direction?: LayoutDirection) => void;
  autoLayoutELK: (direction?: LayoutDirection) => Promise<void>;
  clearCanvas: () => void;
  loadDiagram: (nodes: DiagramNode[], edges: DiagramEdge[]) => void;
  exportJSON: () => string;
}

type DiagramStore = DiagramState & DiagramActions;

// Only track nodes/edges/diagramName for undo/redo
const TRACKED_KEYS: (keyof DiagramState)[] = ['nodes', 'edges', 'diagramName'];

export const useDiagramStore = create<DiagramStore>()(
  temporal(
    (set, get) => ({
      // State
      nodes: [],
      edges: [],
      diagramName: 'Novo Diagrama',
      isAnalyzing: false,
      analysisResult: null,

      // Setters
      setNodes: (nodes) => set({ nodes }),
      setEdges: (edges) => set({ edges }),
      setDiagramName: (diagramName) => set({ diagramName }),
      setIsAnalyzing: (isAnalyzing) => set({ isAnalyzing }),
      setAnalysisResult: (analysisResult) => set({ analysisResult }),

      // React Flow handlers - avoid unnecessary updates to prevent infinite loops
      onNodesChange: (changes) => {
        if (changes.length === 0) return;
        const { nodes } = get();
        const updated = applyNodeChanges(changes, nodes) as DiagramNode[];
        // Only update if reference actually changed (avoid render loop)
        if (updated !== nodes) set({ nodes: updated });
      },

      onEdgesChange: (changes) => {
        if (changes.length === 0) return;
        const { edges } = get();
        const updated = applyEdgeChanges(changes, edges) as DiagramEdge[];
        if (updated !== edges) set({ edges: updated });
      },

      onConnect: (connection) => {
        const { nodes } = get();
        const sourceNode = nodes.find((n) => n.id === connection.source);
        const targetNode = nodes.find((n) => n.id === connection.target);
        let edgeLabel: string | undefined;

        if (sourceNode?.type === 'service' && targetNode?.type === 'queue') {
          edgeLabel = 'produce';
        } else if (sourceNode?.type === 'queue' && targetNode?.type === 'service') {
          edgeLabel = 'consume';
        }

        set((state) => ({
          edges: addEdge(
            {
              ...connection,
              type: 'editable',
              animated: true,
              style: { strokeWidth: 2 },
              markerEnd: { type: 'arrowclosed' as any },
              data: { waypoints: undefined },
              ...(edgeLabel ? { label: edgeLabel, labelStyle: { fontSize: 11, fontWeight: 600 } } : {}),
            },
            state.edges,
          ) as DiagramEdge[],
        }));
      },

      onNodeDragHandler: (_event, node) => {
        set((state) => ({
          edges: state.edges.map((edge) => {
            const connected = edge.source === node.id || edge.target === node.id;
            if (!connected || !edge.data?.waypoints?.length) return edge;
            return { ...edge, data: { ...edge.data, waypoints: undefined } };
          }),
        }));
      },

      // Actions
      addNode: (type, subType) => {
        const labelMap: Record<NodeType, string> = {
          service: 'Microserviço',
          database: subType || 'Oracle',
          queue: subType || 'MQ',
          external: subType || 'REST',
        };
        const newNode: DiagramNode = {
          id: createNodeId(),
          type,
          position: { x: Math.random() * 400 + 100, y: Math.random() * 300 + 100 },
          data: { label: labelMap[type], type, subType, internalDatabases: [], internalServices: [] },
        };
        set((state) => ({ nodes: [...state.nodes, newNode] }));
      },

      addNodesFromSource: (sourceNodeId, type, count, subType) => {
        const { nodes } = get();
        const sourceNode = nodes.find((n) => n.id === sourceNodeId);
        if (!sourceNode) return;

        const sourceData = sourceNode.data as unknown as DiagramNodeData;

        // Embed Oracle inside service
        if (type === 'database' && subType === 'Oracle' && sourceNode.type === 'service') {
          const currentDbs = sourceData.internalDatabases || [];
          const newDbs = [...currentDbs];
          for (let i = 0; i < count; i++) {
            newDbs.push(`Oracle ${currentDbs.length + i + 1}`);
          }
          set((state) => ({
            nodes: state.nodes.map((n) =>
              n.id === sourceNodeId ? { ...n, data: { ...n.data, internalDatabases: newDbs } } : n
            ),
          }));
          return;
        }

        // Embed microservice inside service
        if (type === 'service' && sourceNode.type === 'service') {
          const currentSvcs = sourceData.internalServices || [];
          const newSvcs = [...currentSvcs];
          for (let i = 0; i < count; i++) {
            newSvcs.push(`Microserviço ${currentSvcs.length + i + 1}`);
          }
          set((state) => ({
            nodes: state.nodes.map((n) =>
              n.id === sourceNodeId ? { ...n, data: { ...n.data, internalServices: newSvcs } } : n
            ),
          }));
          return;
        }

        const labelMap: Record<NodeType, string> = {
          service: 'Microserviço',
          database: subType || 'Oracle',
          queue: subType || 'MQ',
          external: subType || 'REST',
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

          let edgeLabel: string | undefined;
          if (sourceNode.type === 'service' && type === 'queue') edgeLabel = 'produce';
          else if (sourceNode.type === 'queue' && type === 'service') edgeLabel = 'consume';

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

        set((state) => ({
          nodes: [...state.nodes, ...newNodes],
          edges: [...state.edges, ...newEdges],
        }));
      },

      deleteSelected: () => {
        set((state) => {
          const selectedNodeIds = new Set(state.nodes.filter((n) => n.selected).map((n) => n.id));
          return {
            nodes: state.nodes.filter((n) => !n.selected),
            edges: state.edges.filter(
              (e) => !e.selected && !selectedNodeIds.has(e.source) && !selectedNodeIds.has(e.target)
            ),
          };
        });
      },

      autoLayout: (direction: LayoutDirection = 'LR') => {
        const { nodes, edges } = get();
        const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(nodes, edges, direction as 'TB' | 'LR');
        set({ nodes: layoutedNodes, edges: layoutedEdges });
      },

      autoLayoutELK: async (direction: LayoutDirection = 'LR') => {
        const { nodes, edges } = get();
        const { nodes: layoutedNodes, edges: layoutedEdges } = await getELKLayoutedElements(nodes, edges, direction);
        set({ nodes: layoutedNodes, edges: layoutedEdges });
      },

      clearCanvas: () => set({ nodes: [], edges: [] }),

      loadDiagram: (nodes, edges) => set({ nodes, edges }),

      exportJSON: () => {
        const { diagramName, nodes, edges } = get();
        return JSON.stringify({ name: diagramName, nodes, edges }, null, 2);
      },
    }),
    {
      limit: 50,
      equality: (pastState, currentState) =>
        pastState.nodes === currentState.nodes &&
        pastState.edges === currentState.edges &&
        pastState.diagramName === currentState.diagramName,
      partialize: (state) => ({
        nodes: state.nodes,
        edges: state.edges,
        diagramName: state.diagramName,
      } as unknown as DiagramStore),
    },
  ),
);
