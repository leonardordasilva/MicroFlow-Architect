import { useState, useCallback } from 'react';
import type { Node, NodeChange } from '@xyflow/react';

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

      for (const node of nodes) {
        if (node.id === draggedNode.id) continue;
        const nW = node.measured?.width ?? 160;
        const nH = node.measured?.height ?? 80;
        const nCX = node.position.x + nW / 2;
        const nCY = node.position.y + nH / 2;

        // Vertical alignment (center X)
        if (Math.abs(dragCX - nCX) < SNAP_THRESHOLD) {
          newGuides.push({ type: 'vertical', pos: nCX });
        }
        // Left edge alignment
        if (Math.abs(dragX - node.position.x) < SNAP_THRESHOLD) {
          newGuides.push({ type: 'vertical', pos: node.position.x });
        }
        // Right edge alignment
        if (Math.abs(dragX + dragW - (node.position.x + nW)) < SNAP_THRESHOLD) {
          newGuides.push({ type: 'vertical', pos: node.position.x + nW });
        }

        // Horizontal alignment (center Y)
        if (Math.abs(dragCY - nCY) < SNAP_THRESHOLD) {
          newGuides.push({ type: 'horizontal', pos: nCY });
        }
        // Top edge alignment
        if (Math.abs(dragY - node.position.y) < SNAP_THRESHOLD) {
          newGuides.push({ type: 'horizontal', pos: node.position.y });
        }
        // Bottom edge alignment
        if (Math.abs(dragY + dragH - (node.position.y + nH)) < SNAP_THRESHOLD) {
          newGuides.push({ type: 'horizontal', pos: node.position.y + nH });
        }
      }

      setGuides(newGuides);
    },
    [nodes]
  );

  const onNodeDragStop = useCallback(() => {
    setGuides([]);
  }, []);

  return { guides, onNodeDrag, onNodeDragStop };
}
