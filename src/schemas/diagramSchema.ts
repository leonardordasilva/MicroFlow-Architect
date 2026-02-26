import { z } from 'zod';

const NODE_TYPES = ['service', 'database', 'queue', 'external'] as const;

const EDGE_PROTOCOLS = [
  'REST', 'gRPC', 'GraphQL', 'WebSocket',
  'Kafka', 'AMQP', 'MQTT', 'HTTPS', 'TCP', 'UDP',
] as const;

const EXTERNAL_CATEGORIES = [
  'API', 'CDN', 'Auth', 'Payment', 'Storage', 'Analytics', 'Other',
] as const;

export const NodeSchema = z.object({
  id: z.string().min(1, 'Node id é obrigatório'),
  type: z.enum(NODE_TYPES, { errorMap: () => ({ message: `Tipo de nó deve ser: ${NODE_TYPES.join(', ')}` }) }),
  position: z.object({
    x: z.number(),
    y: z.number(),
  }),
  data: z.object({
    label: z.string().min(1, 'Label é obrigatório'),
    type: z.enum(NODE_TYPES),
    subType: z.string().optional(),
    externalCategory: z.enum(EXTERNAL_CATEGORIES).optional(),
    internalDatabases: z.array(z.string()).optional(),
    internalServices: z.array(z.string()).optional(),
  }).passthrough(),
}).passthrough();

export const EdgeSchema = z.object({
  id: z.string().min(1, 'Edge id é obrigatório'),
  source: z.string().min(1, 'Source é obrigatório'),
  target: z.string().min(1, 'Target é obrigatório'),
  data: z.object({
    protocol: z.enum(EDGE_PROTOCOLS).optional(),
  }).passthrough().optional(),
}).passthrough();

export const ImportDiagramSchema = z.object({
  nodes: z.array(NodeSchema).min(1, 'O diagrama deve ter pelo menos 1 nó'),
  edges: z.array(EdgeSchema),
  name: z.string().optional(),
}).passthrough();

export type ImportDiagramInput = z.infer<typeof ImportDiagramSchema>;
