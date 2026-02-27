import type { Node, Edge } from '@xyflow/react';

export type NodeType = 'service' | 'database' | 'queue' | 'external';

export type EdgeProtocol =
  | 'REST'
  | 'gRPC'
  | 'GraphQL'
  | 'WebSocket'
  | 'Kafka'
  | 'AMQP'
  | 'MQTT'
  | 'HTTPS'
  | 'TCP'
  | 'UDP'
  | 'SQL';

// ProtocolConfig and PROTOCOL_CONFIGS moved to src/constants/protocolConfigs.ts
// Re-export for backwards compat
export { PROTOCOL_CONFIGS, type ProtocolConfig } from '@/constants/protocolConfigs';

export type ExternalCategory = 'API' | 'CDN' | 'Auth' | 'Payment' | 'Storage' | 'Analytics' | 'Other';

export interface DiagramNodeData {
  label: string;
  type: NodeType;
  subType?: string;
  externalCategory?: ExternalCategory;
  internalDatabases?: string[];
  internalServices?: string[];
  [key: string]: unknown;
}

export interface ControlPoint {
  x: number;
  y: number;
}

export interface DiagramEdgeData {
  waypoints?: ControlPoint[];
  protocol?: EdgeProtocol;
  [key: string]: unknown;
}

export type DiagramNode = Node<DiagramNodeData>;
export type DiagramEdge = Edge<DiagramEdgeData>;

export interface DiagramState {
  nodes: DiagramNode[];
  edges: DiagramEdge[];
  diagramName: string;
}

// HistoryEntry removed — no longer used in the codebase
