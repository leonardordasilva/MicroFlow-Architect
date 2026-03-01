import dagre from 'dagre';
import type { DiagramNode, DiagramEdge } from '@/types/diagram';

const NODE_WIDTH = 180;
const NODE_HEIGHT = 80;

export type LayoutEngine = 'dagre' | 'elk';
export type LayoutDirection = 'TB' | 'LR' | 'BT' | 'RL';

// ─── Dagre Layout ───

export function getLayoutedElements(
  nodes: DiagramNode[],
  edges: DiagramEdge[],
  direction: 'TB' | 'LR' = 'LR'
): { nodes: DiagramNode[]; edges: DiagramEdge[] } {
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));
  dagreGraph.setGraph({ rankdir: direction, nodesep: 60, ranksep: 80 });

  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, { width: NODE_WIDTH, height: NODE_HEIGHT });
  });

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  dagre.layout(dagreGraph);

  const layoutedNodes = nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    return {
      ...node,
      position: {
        x: nodeWithPosition.x - NODE_WIDTH / 2,
        y: nodeWithPosition.y - NODE_HEIGHT / 2,
      },
    };
  });

  return { nodes: layoutedNodes, edges };
}

// ─── ELK Layout (PERF-04: lazy loaded) ───

const ELK_DIRECTION_MAP: Record<LayoutDirection, string> = {
  LR: 'RIGHT',
  RL: 'LEFT',
  TB: 'DOWN',
  BT: 'UP',
};

// Singleton: ELK is lazily loaded on first use. In Vite HMR, module re-execution
// will create a new instance (harmless, just an extra import).
let elkInstance: import('elkjs').ELK | null = null;

export async function getELKLayoutedElements(
  nodes: DiagramNode[],
  edges: DiagramEdge[],
  direction: LayoutDirection = 'LR'
): Promise<{ nodes: DiagramNode[]; edges: DiagramEdge[] }> {
  // PERF-04: Dynamic import — only loads elkjs when first needed
  if (!elkInstance) {
    const ELK = (await import('elkjs')).default;
    elkInstance = new ELK();
  }

  const graph = {
    id: 'root',
    layoutOptions: {
      'elk.algorithm': 'layered',
      'elk.direction': ELK_DIRECTION_MAP[direction],
      'elk.spacing.nodeNode': '80',
      'elk.layered.spacing.nodeNodeBetweenLayers': '120',
      'elk.layered.crossingMinimization.strategy': 'LAYER_SWEEP',
      'elk.layered.nodePlacement.strategy': 'BRANDES_KOEPF',
    },
    children: nodes.map((node) => ({
      id: node.id,
      width: NODE_WIDTH,
      height: NODE_HEIGHT,
    })),
    edges: edges.map((edge) => ({
      id: edge.id,
      sources: [edge.source],
      targets: [edge.target],
    })),
  };

  const layouted = await elkInstance.layout(graph);

  const layoutedNodes = nodes.map((node) => {
    const elkNode = layouted.children?.find((n) => n.id === node.id);
    return {
      ...node,
      position: {
        x: elkNode?.x ?? node.position.x,
        y: elkNode?.y ?? node.position.y,
      },
    };
  });

  return { nodes: layoutedNodes, edges };
}
