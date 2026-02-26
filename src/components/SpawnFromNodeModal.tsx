import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { NodeType } from '@/types/diagram';

interface SpawnFromNodeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sourceNodeLabel: string;
  sourceNodeType: string;
  onConfirm: (type: NodeType, count: number, subType?: string) => void;
}

export default function SpawnFromNodeModal({
  open,
  onOpenChange,
  sourceNodeLabel,
  sourceNodeType,
  onConfirm,
}: SpawnFromNodeModalProps) {
  const isQueue = sourceNodeType === 'queue';
  const isService = sourceNodeType === 'service';
  const [type, setType] = useState<NodeType>('database');
  const [subType, setSubType] = useState('Oracle');

  // Update default subType when type changes
  const handleTypeChange = (v: string) => {
    setType(v as NodeType);
    if (v === 'database') setSubType('Oracle');
    else if (v === 'queue') setSubType('MQ');
    else if (v === 'external') setSubType('REST');
  };
  const [count, setCount] = useState(1);

  // Reset state when modal opens
  useEffect(() => {
    if (open) {
      setType(isService ? 'database' : isQueue ? 'service' : 'service');
      setSubType('Oracle');
      setCount(1);
    }
  }, [open, isService, isQueue]);

  const effectiveType = isQueue ? 'service' : type;

  const handleConfirm = () => {
    if (count < 1) return;
    const needsSubType = effectiveType === 'database' || effectiveType === 'queue' || effectiveType === 'external';
    onConfirm(effectiveType, count, needsSubType ? subType : undefined);
    onOpenChange(false);
    setCount(1);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[380px]">
        <DialogHeader>
          <DialogTitle className="text-base">
            Criar a partir de "{sourceNodeLabel}"
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {isQueue ? (
            <div className="space-y-2">
              <Label>Tipo do objeto</Label>
              <div className="rounded-md border bg-muted px-3 py-2 text-sm text-muted-foreground">
                Microserviço
              </div>
              <p className="text-xs text-muted-foreground">Filas só podem criar microserviços</p>
            </div>
          ) : (
            <div className="space-y-2">
              <Label>Tipo do objeto</Label>
              <Select value={type} onValueChange={handleTypeChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="z-50">
                  <SelectItem value="service">Microserviço</SelectItem>
                  <SelectItem value="database">Banco de Dados</SelectItem>
                  <SelectItem value="queue">Fila (MQ/Kafka/AMQP)</SelectItem>
                  <SelectItem value="external">API (REST/gRPC/GraphQL/WS/HTTPS)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {type === 'database' && (
            <div className="space-y-2">
              <Label>Subtipo</Label>
              <Select value={subType} onValueChange={setSubType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="z-50">
                  <SelectItem value="Oracle">Oracle</SelectItem>
                  <SelectItem value="Redis">Redis</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {type === 'queue' && (
            <div className="space-y-2">
              <Label>Subtipo</Label>
              <Select value={subType} onValueChange={setSubType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="z-50">
                  <SelectItem value="MQ">MQ</SelectItem>
                  <SelectItem value="Kafka">Kafka</SelectItem>
                  <SelectItem value="AMQP">AMQP</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {type === 'external' && (
            <div className="space-y-2">
              <Label>Subtipo</Label>
              <Select value={subType} onValueChange={setSubType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="z-50">
                  <SelectItem value="REST">REST</SelectItem>
                  <SelectItem value="gRPC">gRPC</SelectItem>
                  <SelectItem value="GraphQL">GraphQL</SelectItem>
                  <SelectItem value="WebSocket">WebSocket</SelectItem>
                  <SelectItem value="HTTPS">HTTPS</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label>Quantidade</Label>
            <Input
              type="number"
              min={1}
              max={20}
              value={count}
              onChange={(e) => setCount(Math.max(1, parseInt(e.target.value) || 1))}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleConfirm}>Criar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
