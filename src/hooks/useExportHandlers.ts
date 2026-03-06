import { useCallback } from 'react';
import { useReactFlow, getNodesBounds } from '@xyflow/react';
import { toPng, toSvg } from 'html-to-image';
import { toast } from '@/hooks/use-toast';
import { useDiagramStore } from '@/store/diagramStore';
import { exportToMermaid } from '@/services/exportService';

/** Filter out UI controls from image export */
const exportFilter = (domNode: HTMLElement) => {
  if (!domNode.classList) return true;
  const excludeClasses = [
    'react-flow__panel',
    'react-flow__controls',
    'react-flow__minimap',
    'react-flow__attribution',
    'export-exclude',
  ];
  for (const cls of excludeClasses) {
    if (domNode.classList.contains(cls)) return false;
  }
  return true;
};

/**
 * Calculate full diagram bounds including edge paths that extend beyond nodes.
 * Edges with sourceOffsetY/targetOffsetY/midOffsetX can draw lines outside node bounds.
 */
function getFullDiagramBounds(
  flowNodes: any[],
  edges: any[],
  allNodes: any[],
) {
  const nodeBounds = getNodesBounds(flowNodes);
  let minX = nodeBounds.x;
  let minY = nodeBounds.y;
  let maxX = nodeBounds.x + nodeBounds.width;
  let maxY = nodeBounds.y + nodeBounds.height;

  // Build a position map from store nodes (which have position data)
  const nodeMap = new Map<string, { x: number; y: number; width: number; height: number }>();
  for (const fn of flowNodes) {
    nodeMap.set(fn.id, {
      x: fn.position?.x ?? fn.positionAbsolute?.x ?? 0,
      y: fn.position?.y ?? fn.positionAbsolute?.y ?? 0,
      width: fn.measured?.width ?? fn.width ?? 200,
      height: fn.measured?.height ?? fn.height ?? 80,
    });
  }

  for (const edge of edges) {
    const sourceNode = nodeMap.get(edge.source);
    const targetNode = nodeMap.get(edge.target);
    if (!sourceNode || !targetNode) continue;

    // Approximate source/target connection points (center right → center left)
    const sourceX = sourceNode.x + sourceNode.width;
    const sourceY = sourceNode.y + sourceNode.height / 2;
    const targetX = targetNode.x;
    const targetY = targetNode.y + targetNode.height / 2;

    const data = edge.data ?? {};
    const midOffsetX = data.midOffsetX ?? data.midOffset ?? 0;
    const sourceOffsetY = data.sourceOffsetY ?? 0;
    const targetOffsetY = data.targetOffsetY ?? 0;

    const mx = (sourceX + targetX) / 2 + midOffsetX;
    const sy = sourceY + sourceOffsetY;
    const ty = targetY + targetOffsetY;

    // All possible edge waypoints
    const points = [
      { x: sourceX, y: sourceY },
      { x: sourceX, y: sy },
      { x: mx, y: sy },
      { x: mx, y: ty },
      { x: targetX, y: ty },
      { x: targetX, y: targetY },
    ];

    for (const p of points) {
      if (p.x < minX) minX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.x > maxX) maxX = p.x;
      if (p.y > maxY) maxY = p.y;
    }
  }

  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

export function useExportHandlers(darkMode: boolean) {
  const { getNodes: getFlowNodes } = useReactFlow();
  const nodes = useDiagramStore((s) => s.nodes);
  const edges = useDiagramStore((s) => s.edges);
  const diagramName = useDiagramStore((s) => s.diagramName);
  const exportJSON = useDiagramStore((s) => s.exportJSON);

  const handleExportPNG = useCallback(async () => {
    const flowNodes = getFlowNodes();
    if (flowNodes.length === 0) return;
    const bounds = getFullDiagramBounds(flowNodes, edges, nodes);
    const padding = 20;
    const imageWidth = Math.ceil(bounds.width + padding * 2);
    const imageHeight = Math.ceil(bounds.height + padding * 2);
    const translateX = -bounds.x + padding;
    const translateY = -bounds.y + padding;

    const el = document.querySelector('.react-flow__viewport') as HTMLElement;
    if (!el) return;
    try {
      const dataUrl = await toPng(el, {
        backgroundColor: darkMode ? '#0f1520' : '#f5f7fa',
        filter: exportFilter,
        width: imageWidth,
        height: imageHeight,
        style: {
          width: `${imageWidth}px`,
          height: `${imageHeight}px`,
          transform: `translate(${translateX}px, ${translateY}px) scale(1)`,
        },
      });
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `${diagramName || 'diagram'}.png`;
      a.click();
      toast({ title: 'PNG exportado com sucesso!' });
    } catch {
      toast({ title: 'Erro ao exportar PNG', variant: 'destructive' });
    }
  }, [darkMode, diagramName, getFlowNodes, edges, nodes]);

  const handleExportSVG = useCallback(async () => {
    const flowNodes = getFlowNodes();
    if (flowNodes.length === 0) return;
    const bounds = getFullDiagramBounds(flowNodes, edges, nodes);
    const padding = 20;
    const imageWidth = Math.ceil(bounds.width + padding * 2);
    const imageHeight = Math.ceil(bounds.height + padding * 2);
    const translateX = -bounds.x + padding;
    const translateY = -bounds.y + padding;

    const el = document.querySelector('.react-flow__viewport') as HTMLElement;
    if (!el) return;
    try {
      const dataUrl = await toSvg(el, {
        backgroundColor: darkMode ? '#0f1520' : '#f5f7fa',
        filter: exportFilter,
        width: imageWidth,
        height: imageHeight,
        style: {
          width: `${imageWidth}px`,
          height: `${imageHeight}px`,
          transform: `translate(${translateX}px, ${translateY}px) scale(1)`,
        },
      });
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `${diagramName || 'diagram'}.svg`;
      a.click();
      toast({ title: 'SVG exportado com sucesso!' });
    } catch {
      toast({ title: 'Erro ao exportar SVG', variant: 'destructive' });
    }
  }, [darkMode, diagramName, getFlowNodes, edges, nodes]);

  const handleExportMermaid = useCallback(() => {
    return exportToMermaid(nodes, edges);
  }, [nodes, edges]);

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

  return { handleExportPNG, handleExportSVG, handleExportMermaid, handleExportJSON };
}
