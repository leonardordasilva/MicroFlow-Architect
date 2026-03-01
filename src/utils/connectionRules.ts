import type { NodeType } from '@/types/diagram';

const ALLOWED_TARGETS: Record<NodeType, NodeType[]> = {
  service:  ['service', 'database', 'queue', 'external'],
  database: ['service', 'external'],
  queue:    ['service'],
  external: ['service', 'database', 'queue', 'external'],
};

export function canConnect(sourceType: NodeType, targetType: NodeType): boolean {
  return ALLOWED_TARGETS[sourceType]?.includes(targetType) ?? false;
}

export function connectionErrorMessage(sourceType: NodeType, targetType: NodeType): string {
  const names: Record<NodeType, string> = {
    service: 'Microserviço',
    database: 'Banco de Dados',
    queue: 'Fila/Mensageria',
    external: 'API/Protocolo',
  };
  return `${names[sourceType]} não pode se conectar a ${names[targetType]}`;
}
