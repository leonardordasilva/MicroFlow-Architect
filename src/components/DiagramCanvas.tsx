import { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  BackgroundVariant,
} from '@xyflow/react';
import { useSnapGuides } from '@/hooks/useSnapGuides';
import SnapGuideLines from '@/components/SnapGuideLines';
import { toPng, toSvg } from 'html-to-image';
import { toast } from '@/hooks/use-toast';
import { useDiagramStore } from '@/store/diagramStore';

import ServiceNode from '@/components/nodes/ServiceNode';
import DatabaseNode from '@/components/nodes/DatabaseNode';
import QueueNode from '@/components/nodes/QueueNode';
import ExternalNode from '@/components/nodes/ExternalNode';
import EditableEdge from '@/components/edges/EditableEdge';
import Toolbar from '@/components/Toolbar';
import AIGenerateModal from '@/components/AIGenerateModal';
import AIAnalysisPanel from '@/components/AIAnalysisPanel';
import ImportJSONModal from '@/components/ImportJSONModal';
import SpawnFromNodeModal from '@/components/SpawnFromNodeModal';
import type { DiagramNodeData } from '@/types/diagram';
import { exportToMermaid } from '@/services/exportService';
import MermaidExportModal from '@/components/MermaidExportModal';
import ShareModal from '@/components/ShareModal';
import { useAutoSave } from '@/hooks/useAutoSave';
import RecoveryBanner from '@/components/RecoveryBanner';
import { useAuth } from '@/hooks/useAuth';
import { saveDiagram } from '@/services/diagramService';
import { useRealtimeCollab } from '@/hooks/useRealtimeCollab';
import { Check, Loader2, Share2, Save, LogOut, Keyboard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import NodePropertiesPanel from '@/components/NodePropertiesPanel';
import StatusBar from '@/components/StatusBar';
import KeyboardShortcutsModal from '@/components/KeyboardShortcutsModal';

const nodeTypes = {
  service: ServiceNode,
  database: DatabaseNode,
  queue: QueueNode,
  external: ExternalNode,
};

const edgeTypes = {
  editable: EditableEdge,
};

// Get stable references to temporal actions (no reactive subscription)
const getTemporalActions = () => useDiagramStore.temporal.getState();

interface DiagramCanvasProps {
  shareToken?: string;
}

export default function DiagramCanvas({ shareToken }: DiagramCanvasProps = {}) {
  const nodes = useDiagramStore((s) => s.nodes);
  const edges = useDiagramStore((s) => s.edges);
  const diagramName = useDiagramStore((s) => s.diagramName);

  // Get action references directly - they're stable in Zustand
  const storeActions = useMemo(() => {
    const s = useDiagramStore.getState();
    return {
      setDiagramName: s.setDiagramName,
      onNodesChange: s.onNodesChange,
      onEdgesChange: s.onEdgesChange,
      onConnect: s.onConnect,
      onNodeDragHandler: s.onNodeDragHandler,
      addNode: s.addNode,
      addNodesFromSource: s.addNodesFromSource,
      deleteSelected: s.deleteSelected,
      autoLayout: s.autoLayout,
      autoLayoutELK: s.autoLayoutELK,
      clearCanvas: s.clearCanvas,
      loadDiagram: s.loadDiagram,
      exportJSON: s.exportJSON,
    };
  }, []);

  const undo = useCallback(() => getTemporalActions().undo(), []);
  const redo = useCallback(() => getTemporalActions().redo(), []);

  const { saveStatus } = useAutoSave();
  const { user, signOut } = useAuth();
  const [darkMode, setDarkMode] = useState(true);
  const [showAIGenerate, setShowAIGenerate] = useState(false);
  const [showAIAnalysis, setShowAIAnalysis] = useState(false);
  const [showImportJSON, setShowImportJSON] = useState(false);
  const [spawnSource, setSpawnSource] = useState<{ id: string; label: string; nodeType: string } | null>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; nodeId: string; nodeLabel: string } | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [mermaidCode, setMermaidCode] = useState<string | null>(null);
  const [diagramId, setDiagramId] = useState<string | undefined>();
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const { guides, onNodeDrag, onNodeDragStop } = useSnapGuides(nodes);
  const { broadcastChanges } = useRealtimeCollab(shareToken || null);

  // Broadcast changes when nodes/edges update (only if in shared mode)
  useEffect(() => {
    if (shareToken) {
      broadcastChanges(nodes, edges);
    }
  }, [nodes, edges, shareToken, broadcastChanges]);

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

  const handleExportSVG = useCallback(async () => {
    const el = document.querySelector('.react-flow') as HTMLElement;
    if (!el) return;
    try {
      const dataUrl = await toSvg(el, { backgroundColor: darkMode ? '#0f1520' : '#f5f7fa' });
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `${diagramName || 'diagram'}.svg`;
      a.click();
      toast({ title: 'SVG exportado com sucesso!' });
    } catch {
      toast({ title: 'Erro ao exportar SVG', variant: 'destructive' });
    }
  }, [darkMode, diagramName]);

  const handleExportMermaid = useCallback(() => {
    const code = exportToMermaid(nodes, edges);
    setMermaidCode(code);
  }, [nodes, edges]);

  const handleExportJSON = useCallback(() => {
    const json = storeActions.exportJSON();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${diagramName || 'diagram'}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: 'JSON exportado com sucesso!' });
  }, [storeActions, diagramName]);

  const handleImport = useCallback(
    (data: { nodes: any[]; edges: any[]; name?: string }) => {
      storeActions.loadDiagram(data.nodes, data.edges);
      if (data.name) storeActions.setDiagramName(data.name);
      toast({ title: 'Diagrama importado com sucesso!' });
    },
    [storeActions]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Delete') storeActions.deleteSelected();
      if (e.ctrlKey && e.key === 'z') { e.preventDefault(); undo(); }
      if (e.ctrlKey && e.key === 'y') { e.preventDefault(); redo(); }
      if (e.ctrlKey && e.shiftKey && e.key === 'Z') { e.preventDefault(); redo(); }
      if (e.ctrlKey && e.key === 's') { e.preventDefault(); handleSaveToCloud(); }
      if (e.key === '?') setShowShortcuts(true);
      if (e.key === 'Escape') {
        setSelectedNodeId(null);
        setContextMenu(null);
      }
    },
    [storeActions, undo, redo]
  );

  const handleNodeClick = useCallback((_event: React.MouseEvent, node: any) => {
    setSelectedNodeId(node.id);
  }, []);

  const handleNodeContextMenu = useCallback(
    (event: React.MouseEvent, node: any) => {
      event.preventDefault();
      if (node.type === 'database' || node.type === 'external') return;
      const nodeData = node.data as DiagramNodeData;
      setContextMenu({
        x: event.clientX,
        y: event.clientY,
        nodeId: node.id,
        nodeLabel: nodeData.label,
      });
    },
    []
  );

  const handlePaneClick = useCallback(() => {
    setContextMenu(null);
    setSelectedNodeId(null);
  }, []);

  const handleSaveToCloud = useCallback(async () => {
    if (!user) return;
    setSaving(true);
    try {
      const record = await saveDiagram(diagramName, nodes, edges, user.id, diagramId);
      setDiagramId(record.id);
      toast({ title: 'Diagrama salvo na nuvem!' });
    } catch (err: any) {
      toast({ title: 'Erro ao salvar', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  }, [user, diagramName, nodes, edges, diagramId]);

  const handleShare = useCallback(async () => {
    if (!user) return;
    setSaving(true);
    try {
      const record = await saveDiagram(diagramName, nodes, edges, user.id, diagramId);
      setDiagramId(record.id);
      if (record.share_token) {
        setShareUrl(`${window.location.origin}/diagram/${record.share_token}`);
      }
    } catch (err: any) {
      toast({ title: 'Erro ao compartilhar', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  }, [user, diagramName, nodes, edges, diagramId]);

  return (
    <div className="flex h-screen w-screen flex-col bg-background" onKeyDown={handleKeyDown} tabIndex={0}>
      <header className="flex items-center justify-center gap-3 border-b bg-card/80 px-4 py-2 backdrop-blur-sm">
        <Toolbar
          onAddNode={storeActions.addNode}
          onDelete={storeActions.deleteSelected}
          onClearCanvas={() => setShowClearConfirm(true)}
          onUndo={undo}
          onRedo={redo}
          onAutoLayout={(engine, direction) => {
            if (engine === 'elk') {
              storeActions.autoLayoutELK(direction as any);
            } else {
              storeActions.autoLayout(direction as any);
            }
          }}
          onExportPNG={handleExportPNG}
          onExportSVG={handleExportSVG}
          onExportMermaid={handleExportMermaid}
          onExportJSON={handleExportJSON}
          onImportJSON={() => setShowImportJSON(true)}
          onOpenAIGenerate={() => setShowAIGenerate(true)}
          onOpenAIAnalyze={() => setShowAIAnalysis(true)}
          diagramName={diagramName}
          onDiagramNameChange={storeActions.setDiagramName}
          darkMode={darkMode}
          onToggleDarkMode={toggleDarkMode}
        />
        <div className="flex items-center gap-1">
          {saveStatus === 'saving' && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground animate-pulse">
              <Loader2 className="h-3 w-3 animate-spin" /> Salvando...
            </span>
          )}
          {saveStatus === 'saved' && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Check className="h-3 w-3" /> Salvo
            </span>
          )}
        </div>
        {user && (
          <div className="flex items-center gap-1 ml-auto">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleSaveToCloud} disabled={saving} aria-label="Salvar na nuvem">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">Salvar na nuvem</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleShare} disabled={saving} aria-label="Compartilhar">
                  <Share2 className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">Compartilhar</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={signOut} aria-label="Sair">
                  <LogOut className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">Sair</TooltipContent>
            </Tooltip>
          </div>
        )}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setShowShortcuts(true)} aria-label="Atalhos de teclado">
              <Keyboard className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="text-xs">Atalhos (?)</TooltipContent>
        </Tooltip>
      </header>

      <div className="flex-1 relative" ref={reactFlowWrapper}>
        <RecoveryBanner />
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={storeActions.onNodesChange}
          onEdgesChange={storeActions.onEdgesChange}
          onConnect={storeActions.onConnect}
          onNodeDrag={(event, node) => {
            onNodeDrag(event, node);
            storeActions.onNodeDragHandler(event, node as any);
          }}
          onNodeDragStop={onNodeDragStop}
          onNodeContextMenu={handleNodeContextMenu}
          onPaneClick={handlePaneClick}
          onNodeClick={handleNodeClick}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          fitView
          snapToGrid
          snapGrid={[10, 10]}
          defaultEdgeOptions={{
            type: 'editable',
            animated: true,
            style: { strokeWidth: 2 },
            data: { waypoints: undefined },
          }}
          proOptions={{ hideAttribution: true }}
        >
          <SnapGuideLines guides={guides} />
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

        {contextMenu && (
          <div
            className="fixed z-50 rounded-md border bg-popover p-1 shadow-md min-w-[180px]"
            style={{ top: contextMenu.y, left: contextMenu.x }}
          >
            <button
              className="flex w-full items-center gap-2 rounded-sm px-3 py-2 text-sm text-popover-foreground hover:bg-accent hover:text-accent-foreground"
              onClick={() => {
                const nd = nodes.find((n) => n.id === contextMenu.nodeId);
                setSpawnSource({ id: contextMenu.nodeId, label: contextMenu.nodeLabel, nodeType: nd?.type || '' });
                setContextMenu(null);
              }}
            >
              Criar objetos a partir deste
            </button>
          </div>
        )}

        {selectedNodeId && (
          <NodePropertiesPanel
            nodeId={selectedNodeId}
            onClose={() => setSelectedNodeId(null)}
          />
        )}
      </div>

      <StatusBar nodes={nodes} edges={edges} />

      <AIGenerateModal
        open={showAIGenerate}
        onOpenChange={setShowAIGenerate}
        onGenerate={(newNodes, newEdges) => {
          storeActions.loadDiagram(newNodes, newEdges);
          storeActions.autoLayoutELK('LR');
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

      <SpawnFromNodeModal
        open={!!spawnSource}
        onOpenChange={(open) => { if (!open) setSpawnSource(null); }}
        sourceNodeLabel={spawnSource?.label || ''}
        sourceNodeType={spawnSource?.nodeType || ''}
        onConfirm={(type, count, subType) => {
          if (spawnSource) {
            storeActions.addNodesFromSource(spawnSource.id, type, count, subType);
          }
        }}
      />
      <AlertDialog open={showClearConfirm} onOpenChange={setShowClearConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Limpar diagrama</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja limpar todo o diagrama? Esta ação pode ser desfeita com Ctrl+Z.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={storeActions.clearCanvas}>Limpar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <MermaidExportModal
        open={!!mermaidCode}
        onOpenChange={(open) => { if (!open) setMermaidCode(null); }}
        code={mermaidCode || ''}
      />

      <ShareModal
        open={!!shareUrl}
        onOpenChange={(open) => { if (!open) setShareUrl(null); }}
        shareUrl={shareUrl || ''}
      />

      <KeyboardShortcutsModal
        open={showShortcuts}
        onOpenChange={setShowShortcuts}
      />
    </div>
  );
}
