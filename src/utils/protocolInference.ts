import type { NodeType, EdgeProtocol } from '@/types/diagram';

const PROTOCOL_MAP: Record<NodeType, Record<NodeType, EdgeProtocol>> = {
  service:  { service: 'REST',  database: 'TCP',  queue: 'AMQP',  external: 'HTTPS' },
  database: { service: 'TCP',   database: 'TCP',  queue: 'TCP',   external: 'TCP' },
  queue:    { service: 'Kafka', database: 'AMQP', queue: 'AMQP',  external: 'AMQP' },
  external: { service: 'REST',  database: 'HTTPS', queue: 'HTTPS', external: 'HTTPS' },
};

export function inferProtocol(sourceType: NodeType, targetType: NodeType): EdgeProtocol {
  return PROTOCOL_MAP[sourceType]?.[targetType] ?? 'REST';
}
