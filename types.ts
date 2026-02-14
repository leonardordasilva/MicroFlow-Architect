import { Node, Edge } from 'reactflow';

export enum NodeType {
  SERVICE = 'service',
  DATABASE = 'database',
  QUEUE = 'queue',
  EXTERNAL = 'external'
}

export interface CustomNodeData {
  label: string;
  type: NodeType;
  details?: string;
  hasDatabase?: boolean; // New: Indicates if the service has an internal DB
  // Callback to trigger adding a connected node from the toolbar
  onAddConnection?: (type: NodeType, direction: 'right' | 'bottom', count?: number) => void;
  // Callback to rename the node
  onLabelChange?: (newLabel: string) => void;
  // Callback to delete the node
  onDelete?: () => void;
  // Callback to toggle internal database
  onToggleDatabase?: () => void;
}

export type ArchitectureNode = Node<CustomNodeData>;
export type ArchitectureEdge = Edge;

export interface AnalysisResult {
  markdown: string;
}