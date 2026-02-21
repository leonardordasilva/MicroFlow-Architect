import type { Node, Edge } from '@xyflow/react';

export type NodeType = 'service' | 'database' | 'queue' | 'external';

export interface DiagramNodeData {
  label: string;
  type: NodeType;
  internalDatabases?: string[];
  internalServices?: string[];
  [key: string]: unknown;
}

export type DiagramNode = Node<DiagramNodeData>;
export type DiagramEdge = Edge;

export interface DiagramState {
  nodes: DiagramNode[];
  edges: DiagramEdge[];
  diagramName: string;
}

export interface HistoryEntry {
  nodes: DiagramNode[];
  edges: DiagramEdge[];
}
