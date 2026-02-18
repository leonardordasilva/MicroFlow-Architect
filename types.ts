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

export interface InternalService {
  id: string;
  label: string;
}

export interface CustomNodeData {
  label: string;
  type: NodeType;
  details?: string;
  // List of individual internal databases
  databases?: InternalDatabase[]; 
  // List of individual internal services
  services?: InternalService[];
  
  // Deprecated (kept for temporary compat if needed)
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
  
  // Callbacks for internal services
  onRenameService?: (svcId: string, newLabel: string) => void;
  onDeleteService?: (svcId: string) => void;
  
  // Callback to toggle internal database (Legacy/Shortcut)
  onToggleDatabase?: () => void;
}

export type ArchitectureNode = Node<CustomNodeData>;
export type ArchitectureEdge = Edge;

export interface AnalysisResult {
  markdown: string;
}