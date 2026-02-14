import { Edge, Node, MarkerType } from 'reactflow';
import { CustomNodeData, NodeType } from './types';

// Initial nodes representing: Requisição -> Operação -> Saída
export const initialNodes: Node<CustomNodeData>[] = [
  {
    id: 'req-1',
    type: 'custom',
    position: { x: 100, y: 200 },
    data: { 
      label: 'Requisição', 
      type: NodeType.SERVICE 
    },
  },
  {
    id: 'op-1',
    type: 'custom',
    position: { x: 400, y: 200 },
    data: { 
      label: 'Operação', 
      type: NodeType.SERVICE,
      hasDatabase: true
    },
  },
  {
    id: 'out-1',
    type: 'custom',
    position: { x: 700, y: 200 },
    data: { 
      label: 'Saída', 
      type: NodeType.EXTERNAL 
    },
  },
];

export const initialEdges: Edge[] = [
  {
    id: 'e1-2',
    source: 'req-1',
    target: 'op-1',
    type: 'custom',
    markerEnd: { type: MarkerType.ArrowClosed, color: '#3b82f6' },
    label: 'REST',
    style: { stroke: '#3b82f6', strokeWidth: 2 },
  },
  {
    id: 'e2-3',
    source: 'op-1',
    target: 'out-1',
    type: 'custom',
    markerEnd: { type: MarkerType.ArrowClosed, color: '#818cf8' },
    label: 'HTTP',
    style: { stroke: '#818cf8', strokeWidth: 2, strokeDasharray: '4' },
  },
];

export const defaultEdgeOptions = {
  type: 'smoothstep',
  animated: true,
  markerEnd: { type: MarkerType.ArrowClosed },
  style: { strokeWidth: 2 },
};