import dagre from 'dagre';
import type { DiagramNode, DiagramEdge } from '@/types/diagram';

const NODE_WIDTH = 180;
const NODE_HEIGHT = 80;

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
