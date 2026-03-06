import React from 'react';
import { useViewport } from '@xyflow/react';
import type { DiagramNode, DiagramEdge } from '@/types/diagram';
import type { SaveStatus } from '@/hooks/useAutoSave';

interface StatusBarProps {
  nodes: DiagramNode[];
  edges: DiagramEdge[];
  saveStatus?: SaveStatus;
}

function StatusBar({ nodes, edges, saveStatus }: StatusBarProps) {
  const { zoom } = useViewport();

  return (
    <div className="flex items-center justify-center gap-4 border-t border-border bg-card/80 px-4 py-1.5 text-xs text-muted-foreground backdrop-blur-sm">
      <span>{nodes.length} {nodes.length === 1 ? 'nó' : 'nós'}</span>
      <span className="text-border">•</span>
      <span>{edges.length} {edges.length === 1 ? 'conexão' : 'conexões'}</span>
      <span className="text-border">•</span>
      <span>{Math.round(zoom * 100)}%</span>
      {saveStatus === 'saved' && (
        <span className="text-green-500">• Auto-salvo</span>
      )}
      {saveStatus === 'saving' && (
        <span className="text-muted-foreground opacity-70">• Salvando...</span>
      )}
    </div>
  );
}

export default React.memo(StatusBar);
