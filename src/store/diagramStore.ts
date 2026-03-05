import { create } from 'zustand';
import { temporal } from 'zundo';
import {
  addEdge,
  applyNodeChanges,
  applyEdgeChanges,
  MarkerType,
  type Connection,
  type NodeChange,
  type EdgeChange,
} from '@xyflow/react';
import type { DiagramNode, DiagramEdge, DiagramNodeData, NodeType } from '@/types/diagram';

import { getLayoutedElements, getELKLayoutedElements, type LayoutDirection } from '@/services/layoutService';
import { getDbColor } from '@/constants/databaseColors';

function getNodeColor(type?: NodeType, subType?: string): string {
  switch (type) {
    case 'service': return 'hsl(217, 91%, 60%)';
    case 'database': return getDbColor(subType);
    case 'queue': return 'hsl(157, 52%, 49%)';
    case 'external': return 'hsl(220, 9%, 46%)';
    default: return '#888';
  }
}

const createNodeId = () => `node_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;

interface DiagramState {
  nodes: DiagramNode[];
  edges: DiagramEdge[];
  diagramName: string;
  currentDiagramId: string | undefined;
  isAnalyzing: boolean;
  analysisResult: string | null;
  isCollaborator: boolean;
}

interface DiagramActions {
  setNodes: (nodes: DiagramNode[]) => void;
  setEdges: (edges: DiagramEdge[]) => void;
  setDiagramName: (name: string) => void;
  setCurrentDiagramId: (id: string | undefined) => void;
  setIsAnalyzing: (value: boolean) => void;
  setAnalysisResult: (result: string | null) => void;
  setIsCollaborator: (value: boolean) => void;

  onNodesChange: (changes: NodeChange[]) => void;
  onEdgesChange: (changes: EdgeChange[]) => void;
  onConnect: (connection: Connection) => void;
  onNodeDragHandler: (event: React.MouseEvent, node: DiagramNode) => void;

  addNode: (type: NodeType, subType?: string, position?: { x: number; y: number }) => void;
  addNodesFromSource: (sourceNodeId: string, type: NodeType, count: number, subType?: string) => void;
  deleteSelected: () => void;
  autoLayout: (direction?: LayoutDirection) => void;
  autoLayoutELK: (direction?: LayoutDirection) => Promise<void>;
  clearCanvas: () => void;
  loadDiagram: (nodes: DiagramNode[], edges: DiagramEdge[]) => void;
  exportJSON: () => string;
  
}

type DiagramStore = DiagramState & DiagramActions;

/** Slice rastreado pelo undo/redo — apenas nodes, edges e diagramName */
type UndoSlice = Pick<DiagramStore, 'nodes' | 'edges' | 'diagramName'>;

export const useDiagramStore = create<DiagramStore>()(
  temporal(
    (set, get) => ({
      // State
      nodes: [],
      edges: [],
      diagramName: 'Novo Diagrama',
      currentDiagramId: undefined,
      isAnalyzing: false,
      analysisResult: null,
      isCollaborator: false,

      // Setters
      setNodes: (nodes) => set({ nodes }),
      setEdges: (edges) => set({ edges }),
      setDiagramName: (diagramName) => set({ diagramName }),
      setCurrentDiagramId: (currentDiagramId) => set({ currentDiagramId }),
      setIsAnalyzing: (isAnalyzing) => set({ isAnalyzing }),
      setAnalysisResult: (analysisResult) => set({ analysisResult }),
      setIsCollaborator: (isCollaborator) => set({ isCollaborator }),

      // React Flow handlers - avoid unnecessary updates to prevent infinite loops
      onNodesChange: (changes) => {
        if (!changes || changes.length === 0) return;
        const { nodes } = get();
        if (!Array.isArray(nodes)) { set({ nodes: [] }); return; }
        const updated = applyNodeChanges(changes, nodes) as DiagramNode[];
        // Only update if reference actually changed (avoid render loop)
        if (updated !== nodes) set({ nodes: Array.isArray(updated) ? updated : [] });
      },

      onEdgesChange: (changes) => {
        if (!changes || changes.length === 0) return;
        const { edges } = get();
        if (!Array.isArray(edges)) { set({ edges: [] }); return; }
        const updated = applyEdgeChanges(changes, edges) as DiagramEdge[];
        if (updated !== edges) set({ edges: Array.isArray(updated) ? updated : [] });
      },

      onConnect: (connection) => {
        const { nodes } = get();
        const sourceNode = nodes.find((n) => n.id === connection.source);
        const sourceType = sourceNode?.type as NodeType | undefined;
        const sourceSubType = (sourceNode?.data as DiagramNodeData | undefined)?.subType;
        const isQueue = sourceType === 'queue';
        const targetNode = nodes.find((n) => n.id === connection.target);
        const targetType = targetNode?.type as NodeType | undefined;
        // Queue connections are always green
        const isQueueConnection = sourceType === 'queue' || targetType === 'queue';
        const edgeColor = isQueueConnection ? 'hsl(157, 52%, 49%)' : getNodeColor(sourceType, sourceSubType);
        set((state) => ({
          edges: addEdge(
            {
              ...connection,
              type: 'editable',
              animated: false,
              style: { strokeWidth: 2 },
              markerEnd: { type: MarkerType.ArrowClosed, color: edgeColor },
              data: { waypoints: undefined, sourceNodeType: sourceType, sourceNodeSubType: sourceSubType, isQueueConnection },
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
      addNode: (type, subType, position) => {
        const labelMap: Record<NodeType, string> = {
          service: 'Microserviço',
          database: subType || 'Oracle',
          queue: subType || 'IBM MQ',
          external: subType || 'REST',
        };
        const newNode: DiagramNode = {
          id: createNodeId(),
          type,
          position: position ?? { x: Math.random() * 400 + 100, y: Math.random() * 300 + 100 },
          data: { label: labelMap[type], type, subType, internalDatabases: [], internalServices: [] },
        };
        set((state) => ({ nodes: [...state.nodes, newNode] }));
      },

      addNodesFromSource: (sourceNodeId, type, count, subType) => {
        const { nodes } = get();
        const sourceNode = nodes.find((n) => n.id === sourceNodeId);
        if (!sourceNode) return;

        const sourceData: DiagramNodeData = sourceNode.data;

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

        // Embed library inside service (triggered by subType === 'library')
        if (type === 'service' && subType === 'library' && sourceNode.type === 'service') {
          const currentSvcs = sourceData.internalServices || [];
          const newSvcs = [...currentSvcs];
          for (let i = 0; i < count; i++) {
            newSvcs.push(`Biblioteca ${currentSvcs.length + i + 1}`);
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
          queue: subType || 'IBM MQ',
          external: subType || 'REST',
        };

        const newNodes: DiagramNode[] = [];

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
        }

        set((state) => ({
          nodes: [...state.nodes, ...newNodes],
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

      clearCanvas: () => set({ nodes: [], edges: [], isCollaborator: false }),

      loadDiagram: (nodes, edges) => set({ nodes: Array.isArray(nodes) ? nodes : [], edges: Array.isArray(edges) ? edges : [], isCollaborator: false }),

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
      partialize: (state): DiagramStore =>
        ({
          nodes: state.nodes,
          edges: state.edges,
          diagramName: state.diagramName,
        } as unknown as DiagramStore), // zundo: partialize requer o tipo completo do store; apenas UndoSlice é rastreado
    },
  ),
);
