import { Node, Edge } from 'reactflow';

export enum NodeType {
  SERVICE = 'service',
  DATABASE = 'database',
  QUEUE = 'queue',
  EXTERNAL = 'external'
}

export interface InternalDatabase {
  id: string;
  label: string;
}

export interface CustomNodeData {
  label: string;
  type: NodeType;
  details?: string;
  // New: List of individual internal databases
  databases?: InternalDatabase[]; 
  
  // Deprecated (kept for temporary compat if needed, but logic will move to 'databases' array)
  hasDatabase?: boolean; 
  databaseCount?: number; 

  // Callback to trigger adding a connected node from the toolbar
  onAddConnection?: (type: NodeType, direction: 'right' | 'bottom', count?: number) => void;
  // Callback to rename the node
  onLabelChange?: (newLabel: string) => void;
  // Callback to delete the node
  onDelete?: () => void;
  
  // Callbacks for internal databases
  onRenameDatabase?: (dbId: string, newLabel: string) => void;
  onDeleteDatabase?: (dbId: string) => void;
  
  // Callback to toggle internal database (Legacy/Shortcut)
  onToggleDatabase?: () => void;
}

export type ArchitectureNode = Node<CustomNodeData>;
export type ArchitectureEdge = Edge;

export interface AnalysisResult {
  markdown: string;
}