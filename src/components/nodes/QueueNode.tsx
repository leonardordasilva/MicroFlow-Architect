import { memo, useState } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { Mail } from 'lucide-react';
import type { DiagramNodeData } from '@/types/diagram';

const QueueNode = memo(({ data, selected }: NodeProps) => {
  const nodeData = data as unknown as DiagramNodeData;
  const [editing, setEditing] = useState(false);
  const [label, setLabel] = useState(nodeData.label);

  const handleDoubleClick = () => setEditing(true);
  const handleBlur = () => {
    setEditing(false);
    nodeData.label = label;
  };

  return (
    <div
      className={`relative min-w-[160px] rounded-lg border-2 bg-card p-3 shadow-md transition-all ${
        selected ? 'border-[hsl(var(--node-queue))] shadow-lg ring-2 ring-[hsl(var(--node-queue))]/30' : 'border-border'
      }`}
    >
      <Handle type="target" position={Position.Top} className="!w-3 !h-3 !bg-[hsl(var(--node-queue))]" />
      <Handle type="target" position={Position.Left} className="!w-3 !h-3 !bg-[hsl(var(--node-queue))]" />

      <div className="flex items-center gap-2 mb-1">
        <div className="rounded-md bg-[hsl(var(--node-queue))]/15 p-1.5">
          <Mail className="h-4 w-4 text-[hsl(var(--node-queue))]" />
        </div>
        {editing ? (
          <input
            className="bg-transparent border-b border-[hsl(var(--node-queue))] text-sm font-semibold text-foreground outline-none w-full"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            onBlur={handleBlur}
            onKeyDown={(e) => e.key === 'Enter' && handleBlur()}
            autoFocus
          />
        ) : (
          <span className="text-sm font-semibold text-foreground cursor-pointer truncate" onDoubleClick={handleDoubleClick}>
            {label}
          </span>
        )}
      </div>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Fila</div>

      <Handle type="source" position={Position.Bottom} className="!w-3 !h-3 !bg-[hsl(var(--node-queue))]" />
      <Handle type="source" position={Position.Right} className="!w-3 !h-3 !bg-[hsl(var(--node-queue))]" />
    </div>
  );
});

QueueNode.displayName = 'QueueNode';
export default QueueNode;
