import { useState } from 'react';
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
  onConfirm: (type: NodeType, count: number, subType?: string) => void;
}

export default function SpawnFromNodeModal({
  open,
  onOpenChange,
  sourceNodeLabel,
  onConfirm,
}: SpawnFromNodeModalProps) {
  const [type, setType] = useState<NodeType>('service');
  const [subType, setSubType] = useState('Oracle');
  const [count, setCount] = useState(1);

  const handleConfirm = () => {
    if (count < 1) return;
    onConfirm(type, count, type === 'database' ? subType : undefined);
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
          <div className="space-y-2">
            <Label>Tipo do objeto</Label>
            <Select value={type} onValueChange={(v) => setType(v as NodeType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="z-50">
                <SelectItem value="service">Microserviço</SelectItem>
                <SelectItem value="database">Banco de Dados</SelectItem>
                <SelectItem value="queue">MQ</SelectItem>
                <SelectItem value="external">REST</SelectItem>
              </SelectContent>
            </Select>
          </div>

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
