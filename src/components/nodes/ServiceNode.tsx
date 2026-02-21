import { memo, useState } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { Box, Database } from 'lucide-react';
import type { DiagramNodeData } from '@/types/diagram';

function EditableDbItem({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(value);

  const commit = () => {
    setEditing(false);
    onChange(text);
  };

  return editing ? (
    <input
      className="bg-transparent border-b border-[hsl(var(--node-database))] text-xs text-foreground outline-none w-full ml-1"
      value={text}
      onChange={(e) => setText(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => e.key === 'Enter' && commit()}
      autoFocus
    />
  ) : (
    <span className="cursor-pointer truncate" onDoubleClick={() => setEditing(true)}>
      {value}
    </span>
  );
}

const ServiceNode = memo(({ data, id, selected }: NodeProps) => {
  const nodeData = data as unknown as DiagramNodeData;
  const [editing, setEditing] = useState(false);
  const [label, setLabel] = useState(nodeData.label);

  const handleDoubleClick = () => setEditing(true);
  const handleBlur = () => {
    setEditing(false);
    nodeData.label = label;
  };

  const handleDbRename = (index: number, newName: string) => {
    if (nodeData.internalDatabases) {
      nodeData.internalDatabases[index] = newName;
    }
  };

  return (
    <div
      className={`relative min-w-[160px] rounded-lg border-2 bg-card p-3 shadow-md transition-all ${
        selected ? 'border-[hsl(var(--node-service))] shadow-lg ring-2 ring-[hsl(var(--node-service))]/30' : 'border-border'
      }`}
    >
      <Handle id="top-target" type="target" position={Position.Top} className="!w-3 !h-3 !bg-[hsl(var(--node-service))]" />
      <Handle id="top-source" type="source" position={Position.Top} className="!w-3 !h-3 !bg-[hsl(var(--node-service))]" />
      <Handle id="bottom-target" type="target" position={Position.Bottom} className="!w-3 !h-3 !bg-[hsl(var(--node-service))]" />
      <Handle id="bottom-source" type="source" position={Position.Bottom} className="!w-3 !h-3 !bg-[hsl(var(--node-service))]" />
      <Handle id="left-target" type="target" position={Position.Left} className="!w-3 !h-3 !bg-[hsl(var(--node-service))]" />
      <Handle id="left-source" type="source" position={Position.Left} className="!w-3 !h-3 !bg-[hsl(var(--node-service))]" />
      <Handle id="right-target" type="target" position={Position.Right} className="!w-3 !h-3 !bg-[hsl(var(--node-service))]" />
      <Handle id="right-source" type="source" position={Position.Right} className="!w-3 !h-3 !bg-[hsl(var(--node-service))]" />

      <div className="flex items-center gap-2 mb-1">
        <div className="rounded-md bg-[hsl(var(--node-service))]/15 p-1.5">
          <Box className="h-4 w-4 text-[hsl(var(--node-service))]" />
        </div>
        {editing ? (
          <input
            className="bg-transparent border-b border-[hsl(var(--node-service))] text-sm font-semibold text-foreground outline-none w-full"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            onBlur={handleBlur}
            onKeyDown={(e) => e.key === 'Enter' && handleBlur()}
            autoFocus
          />
        ) : (
          <span
            className="text-sm font-semibold text-foreground cursor-pointer truncate"
            onDoubleClick={handleDoubleClick}
          >
            {label}
          </span>
        )}
      </div>

      <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
        Microserviço
      </div>

      {nodeData.internalDatabases && nodeData.internalDatabases.length > 0 && (
        <div className="mt-2 space-y-1">
          {nodeData.internalDatabases.map((db, i) => (
            <div key={i} className="flex items-center gap-1 text-xs text-muted-foreground">
              <Database className="h-3 w-3 text-[hsl(var(--node-database))]" />
              <EditableDbItem value={db} onChange={(v) => handleDbRename(i, v)} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
});

ServiceNode.displayName = 'ServiceNode';
export default ServiceNode;
