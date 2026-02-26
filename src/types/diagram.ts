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
  | 'UDP';

export interface ProtocolConfig {
  label: string;
  color: string;       // HSL string for stroke
  dashArray?: string;   // SVG stroke-dasharray for async
  async: boolean;
}

export const PROTOCOL_CONFIGS: Record<EdgeProtocol, ProtocolConfig> = {
  REST:      { label: 'REST',      color: 'hsl(217, 91%, 60%)',  async: false },
  gRPC:      { label: 'gRPC',      color: 'hsl(262, 83%, 58%)',  async: false },
  GraphQL:   { label: 'GraphQL',   color: 'hsl(319, 80%, 55%)',  async: false },
  WebSocket: { label: 'WebSocket', color: 'hsl(38, 92%, 50%)',   async: true,  dashArray: '8 4' },
  Kafka:     { label: 'Kafka',     color: 'hsl(38, 92%, 50%)',   async: true,  dashArray: '6 3' },
  AMQP:      { label: 'AMQP',      color: 'hsl(25, 95%, 53%)',   async: true,  dashArray: '6 3' },
  MQTT:      { label: 'MQTT',      color: 'hsl(142, 71%, 45%)',  async: true,  dashArray: '4 4' },
  HTTPS:     { label: 'HTTPS',     color: 'hsl(200, 80%, 50%)',  async: false },
  TCP:       { label: 'TCP',       color: 'hsl(45, 93%, 47%)',   async: false },
  UDP:       { label: 'UDP',       color: 'hsl(15, 80%, 50%)',   async: true,  dashArray: '2 4' },
};

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

export interface HistoryEntry {
  nodes: DiagramNode[];
  edges: DiagramEdge[];
}
