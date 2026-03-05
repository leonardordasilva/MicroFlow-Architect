import { useState, useCallback } from 'react';
import type { Node } from '@xyflow/react';
import { useDiagramStore } from '@/store/diagramStore';

const SNAP_THRESHOLD = 8;

interface GuideLine {
  type: 'horizontal' | 'vertical';
  pos: number;
}

export function useSnapGuides(nodes: Node[]) {
  const [guides, setGuides] = useState<GuideLine[]>([]);

  const onNodeDrag = useCallback(
    (_event: React.MouseEvent, draggedNode: Node) => {
      const newGuides: GuideLine[] = [];
      const dragX = draggedNode.position.x;
      const dragY = draggedNode.position.y;
      const dragW = draggedNode.measured?.width ?? 160;
      const dragH = draggedNode.measured?.height ?? 80;
      const dragCX = dragX + dragW / 2;
      const dragCY = dragY + dragH / 2;

      let snapX: number | null = null;
      let snapY: number | null = null;
      let bestDx = SNAP_THRESHOLD;
      let bestDy = SNAP_THRESHOLD;

      for (const node of nodes) {
        if (node.id === draggedNode.id) continue;
        const nW = node.measured?.width ?? 160;
        const nH = node.measured?.height ?? 80;
        const nCX = node.position.x + nW / 2;
        const nCY = node.position.y + nH / 2;

        // Center X alignment
        const dCX = Math.abs(dragCX - nCX);
        if (dCX < bestDx) {
          bestDx = dCX;
          snapX = nCX - dragW / 2;
          newGuides.push({ type: 'vertical', pos: nCX });
        }
        // Left edge
        const dLX = Math.abs(dragX - node.position.x);
        if (dLX < bestDx) {
          bestDx = dLX;
          snapX = node.position.x;
          newGuides.push({ type: 'vertical', pos: node.position.x });
        }
        // Right edge
        const dRX = Math.abs(dragX + dragW - (node.position.x + nW));
        if (dRX < bestDx) {
          bestDx = dRX;
          snapX = node.position.x + nW - dragW;
          newGuides.push({ type: 'vertical', pos: node.position.x + nW });
        }

        // Center Y alignment
        const dCY = Math.abs(dragCY - nCY);
        if (dCY < bestDy) {
          bestDy = dCY;
          snapY = nCY - dragH / 2;
          newGuides.push({ type: 'horizontal', pos: nCY });
        }
        // Top edge
        const dTY = Math.abs(dragY - node.position.y);
        if (dTY < bestDy) {
          bestDy = dTY;
          snapY = node.position.y;
          newGuides.push({ type: 'horizontal', pos: node.position.y });
        }
        // Bottom edge
        const dBY = Math.abs(dragY + dragH - (node.position.y + nH));
        if (dBY < bestDy) {
          bestDy = dBY;
          snapY = node.position.y + nH - dragH;
          newGuides.push({ type: 'horizontal', pos: node.position.y + nH });
        }
      }

      setGuides(newGuides);

      // Actually snap the node position
      if (snapX !== null || snapY !== null) {
        const newPos = {
          x: snapX ?? dragX,
          y: snapY ?? dragY,
        };
        if (newPos.x !== dragX || newPos.y !== dragY) {
          useDiagramStore.getState().setNodes(
            useDiagramStore.getState().nodes.map((n) =>
              n.id === draggedNode.id ? { ...n, position: newPos } : n
            )
          );
        }
      }
    },
    [nodes]
  );

  const onNodeDragStop = useCallback(() => {
    setGuides([]);
  }, []);

  return { guides, onNodeDrag, onNodeDragStop };
}
