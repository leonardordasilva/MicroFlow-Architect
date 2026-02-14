import { Edge, Node, MarkerType } from 'reactflow';
import { CustomNodeData } from './types';

// Start with an empty canvas
export const initialNodes: Node<CustomNodeData>[] = [];
export const initialEdges: Edge[] = [];

export const defaultEdgeOptions = {
  type: 'smoothstep',
  animated: true,
  markerEnd: { type: MarkerType.ArrowClosed },
  style: { strokeWidth: 2 },
};
