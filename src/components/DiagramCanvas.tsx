import { useState, useCallback, useRef } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  BackgroundVariant,
  type ReactFlowInstance,
} from '@xyflow/react';
import { toPng } from 'html-to-image';
import { toast } from '@/hooks/use-toast';
import { useDiagram } from '@/hooks/useDiagram';

import ServiceNode from '@/components/nodes/ServiceNode';
import DatabaseNode from '@/components/nodes/DatabaseNode';
import QueueNode from '@/components/nodes/QueueNode';
import ExternalNode from '@/components/nodes/ExternalNode';
import Toolbar from '@/components/Toolbar';
import AIGenerateModal from '@/components/AIGenerateModal';
import AIAnalysisPanel from '@/components/AIAnalysisPanel';
import ImportJSONModal from '@/components/ImportJSONModal';

const nodeTypes = {
  service: ServiceNode,
  database: DatabaseNode,
  queue: QueueNode,
  external: ExternalNode,
};

export default function DiagramCanvas() {
  const {
    nodes, edges, diagramName, setDiagramName,
    onNodesChange, onEdgesChange, onConnect,
    addNode, deleteSelected, undo, redo, autoLayout,
    clearCanvas, loadDiagram, exportJSON, setNodes, setEdges,
  } = useDiagram();

  const [darkMode, setDarkMode] = useState(true);
  const [showAIGenerate, setShowAIGenerate] = useState(false);
  const [showAIAnalysis, setShowAIAnalysis] = useState(false);
  const [showImportJSON, setShowImportJSON] = useState(false);
  const reactFlowWrapper = useRef<HTMLDivElement>(null);

  const toggleDarkMode = useCallback(() => {
    setDarkMode((prev) => {
      const next = !prev;
      document.documentElement.classList.toggle('dark', next);
      return next;
    });
  }, []);

  // Initialize dark mode
  useState(() => {
    document.documentElement.classList.add('dark');
  });

  const handleExportPNG = useCallback(async () => {
    const el = document.querySelector('.react-flow') as HTMLElement;
    if (!el) return;
    try {
      const dataUrl = await toPng(el, { backgroundColor: darkMode ? '#0f1520' : '#f5f7fa' });
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `${diagramName || 'diagram'}.png`;
      a.click();
      toast({ title: 'PNG exportado com sucesso!' });
    } catch {
      toast({ title: 'Erro ao exportar PNG', variant: 'destructive' });
    }
  }, [darkMode, diagramName]);

  const handleExportJSON = useCallback(() => {
    const json = exportJSON();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${diagramName || 'diagram'}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: 'JSON exportado com sucesso!' });
  }, [exportJSON, diagramName]);

  const handleImport = useCallback(
    (data: { nodes: any[]; edges: any[]; name?: string }) => {
      loadDiagram(data.nodes, data.edges);
      if (data.name) setDiagramName(data.name);
      toast({ title: 'Diagrama importado com sucesso!' });
    },
    [loadDiagram, setDiagramName]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Delete') deleteSelected();
      if (e.ctrlKey && e.key === 'z') undo();
      if (e.ctrlKey && e.key === 'y') redo();
    },
    [deleteSelected, undo, redo]
  );

  return (
    <div className="flex h-screen w-screen flex-col bg-background" onKeyDown={handleKeyDown} tabIndex={0}>
      <header className="flex items-center justify-center border-b bg-card/80 px-4 py-2 backdrop-blur-sm">
        <Toolbar
          onAddNode={addNode}
          onDelete={deleteSelected}
          onUndo={undo}
          onRedo={redo}
          onAutoLayout={() => autoLayout('LR')}
          onExportPNG={handleExportPNG}
          onExportJSON={handleExportJSON}
          onImportJSON={() => setShowImportJSON(true)}
          onOpenAIGenerate={() => setShowAIGenerate(true)}
          onOpenAIAnalyze={() => setShowAIAnalysis(true)}
          diagramName={diagramName}
          onDiagramNameChange={setDiagramName}
          darkMode={darkMode}
          onToggleDarkMode={toggleDarkMode}
        />
      </header>

      <div className="flex-1" ref={reactFlowWrapper}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          nodeTypes={nodeTypes}
          fitView
          defaultEdgeOptions={{
            type: 'smoothstep',
            animated: true,
            style: { strokeWidth: 2 },
          }}
          proOptions={{ hideAttribution: true }}
        >
          <Background variant={BackgroundVariant.Dots} gap={20} size={1} />
          <Controls className="!bg-card !border-border !shadow-md [&>button]:!bg-card [&>button]:!border-border [&>button]:!text-foreground" />
          <MiniMap
            className="!bg-card !border-border"
            nodeColor={(node) => {
              const colorMap: Record<string, string> = {
                service: 'hsl(217, 91%, 60%)',
                database: 'hsl(142, 71%, 45%)',
                queue: 'hsl(45, 93%, 47%)',
                external: 'hsl(220, 9%, 46%)',
              };
              return colorMap[node.type || ''] || '#888';
            }}
          />
        </ReactFlow>
      </div>

      <AIGenerateModal
        open={showAIGenerate}
        onOpenChange={setShowAIGenerate}
        onGenerate={(newNodes, newEdges) => {
          loadDiagram(newNodes, newEdges);
          autoLayout('LR');
        }}
      />

      <AIAnalysisPanel
        open={showAIAnalysis}
        onOpenChange={setShowAIAnalysis}
        nodes={nodes}
        edges={edges}
      />

      <ImportJSONModal
        open={showImportJSON}
        onOpenChange={setShowImportJSON}
        onImport={handleImport}
      />
    </div>
  );
}
