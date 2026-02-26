import { memo, useState } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { Globe, Wifi, Share2, Lock, Hexagon } from 'lucide-react';
import type { DiagramNodeData } from '@/types/diagram';

const PROTOCOL_ICONS: Record<string, React.ElementType> = {
  REST: Globe,
  gRPC: Hexagon,
  GraphQL: Share2,
  WebSocket: Wifi,
  HTTPS: Lock,
};

const ExternalNode = memo(({ data, selected }: NodeProps) => {
  const nodeData = data as unknown as DiagramNodeData;
  const [editing, setEditing] = useState(false);
  const [label, setLabel] = useState(nodeData.label);
  const protocol = nodeData.subType || 'REST';
  const Icon = PROTOCOL_ICONS[protocol] || Globe;

  const handleDoubleClick = () => setEditing(true);
  const handleBlur = () => {
    setEditing(false);
    nodeData.label = label;
  };

  return (
    <div
      className={`relative min-w-[160px] rounded-lg border-2 border-dashed bg-card p-3 shadow-md transition-all ${
        selected ? 'border-[hsl(var(--node-external))] shadow-lg ring-2 ring-[hsl(var(--node-external))]/30' : 'border-border'
      }`}
    >
      <Handle id="top-target" type="target" position={Position.Top} className="!w-3 !h-3 !bg-[hsl(var(--node-external))]" />
      <Handle id="top-source" type="source" position={Position.Top} className="!w-3 !h-3 !bg-[hsl(var(--node-external))]" />
      <Handle id="left-target" type="target" position={Position.Left} className="!w-3 !h-3 !bg-[hsl(var(--node-external))]" />
      <Handle id="left-source" type="source" position={Position.Left} className="!w-3 !h-3 !bg-[hsl(var(--node-external))]" />

      <div className="flex items-center gap-2 mb-1">
        <div className="rounded-md bg-[hsl(var(--node-external))]/15 p-1.5">
          <Icon className="h-4 w-4 text-[hsl(var(--node-external))]" />
        </div>
        {editing ? (
          <input
            className="bg-transparent border-b border-[hsl(var(--node-external))] text-sm font-semibold text-foreground outline-none w-full"
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
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">{protocol}</div>

      <Handle id="bottom-target" type="target" position={Position.Bottom} className="!w-3 !h-3 !bg-[hsl(var(--node-external))]" />
      <Handle id="bottom-source" type="source" position={Position.Bottom} className="!w-3 !h-3 !bg-[hsl(var(--node-external))]" />
      <Handle id="right-target" type="target" position={Position.Right} className="!w-3 !h-3 !bg-[hsl(var(--node-external))]" />
      <Handle id="right-source" type="source" position={Position.Right} className="!w-3 !h-3 !bg-[hsl(var(--node-external))]" />
    </div>
  );
});

ExternalNode.displayName = 'ExternalNode';
export default ExternalNode;
