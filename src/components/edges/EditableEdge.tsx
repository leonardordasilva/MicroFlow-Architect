import { useCallback, useRef } from 'react';
import {
  BaseEdge,
  getSmoothStepPath,
  useReactFlow,
  type EdgeProps,
} from '@xyflow/react';

interface ControlPoint {
  x: number;
  y: number;
}

interface EditableEdgeData {
  controlPoints?: ControlPoint[];
  [key: string]: unknown;
}

function buildPathThroughPoints(points: { x: number; y: number }[]): string {
  if (points.length < 2) return '';
  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length; i++) {
    d += ` L ${points[i].x} ${points[i].y}`;
  }
  return d;
}

export default function EditableEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style,
  markerEnd,
  markerStart,
  label,
  labelStyle,
  data,
}: EdgeProps) {
  const { setEdges } = useReactFlow();
  const draggingRef = useRef<{ index: number } | null>(null);

  const edgeData = data as EditableEdgeData | undefined;
  const controlPoints: ControlPoint[] = edgeData?.controlPoints || [];
  const hasControlPoints = controlPoints.length > 0;

  // Build path
  let edgePath: string;
  let labelX: number;
  let labelY: number;

  if (!hasControlPoints) {
    const [path, lx, ly] = getSmoothStepPath({
      sourceX,
      sourceY,
      targetX,
      targetY,
      sourcePosition,
      targetPosition,
    });
    edgePath = path;
    labelX = lx;
    labelY = ly;
  } else {
    const allPoints = [
      { x: sourceX, y: sourceY },
      ...controlPoints,
      { x: targetX, y: targetY },
    ];
    edgePath = buildPathThroughPoints(allPoints);
    const mid = Math.floor(allPoints.length / 2);
    labelX = (allPoints[mid - 1].x + allPoints[mid].x) / 2;
    labelY = (allPoints[mid - 1].y + allPoints[mid].y) / 2;
  }

  const updateControlPoints = useCallback(
    (newPoints: ControlPoint[]) => {
      setEdges((edges) =>
        edges.map((e) =>
          e.id === id
            ? { ...e, data: { ...e.data, controlPoints: newPoints } }
            : e
        )
      );
    },
    [id, setEdges]
  );

  const handlePointerDown = useCallback(
    (index: number) => (evt: React.PointerEvent) => {
      evt.stopPropagation();
      evt.preventDefault();
      draggingRef.current = { index };

      const onMove = (e: PointerEvent) => {
        if (!draggingRef.current) return;
        // Get the SVG element to convert screen coords to SVG coords
        const svg = (evt.target as Element).closest('svg');
        if (!svg) return;
        const point = (svg as SVGSVGElement).createSVGPoint();
        point.x = e.clientX;
        point.y = e.clientY;
        const ctm = (svg as SVGSVGElement).getScreenCTM()?.inverse();
        if (!ctm) return;
        const svgPoint = point.matrixTransform(ctm);

        const newPoints = [...controlPoints];
        newPoints[draggingRef.current!.index] = { x: svgPoint.x, y: svgPoint.y };
        updateControlPoints(newPoints);
      };

      const onUp = () => {
        draggingRef.current = null;
        document.removeEventListener('pointermove', onMove);
        document.removeEventListener('pointerup', onUp);
      };

      document.addEventListener('pointermove', onMove);
      document.addEventListener('pointerup', onUp);
    },
    [controlPoints, updateControlPoints]
  );

  const handleEdgeDoubleClick = useCallback(
    (evt: React.MouseEvent) => {
      evt.stopPropagation();
      const svg = (evt.target as Element).closest('svg');
      if (!svg) return;
      const point = (svg as SVGSVGElement).createSVGPoint();
      point.x = evt.clientX;
      point.y = evt.clientY;
      const ctm = (svg as SVGSVGElement).getScreenCTM()?.inverse();
      if (!ctm) return;
      const svgPoint = point.matrixTransform(ctm);

      // Find which segment to insert into
      const allPoints = [
        { x: sourceX, y: sourceY },
        ...controlPoints,
        { x: targetX, y: targetY },
      ];

      let bestIdx = 0;
      let bestDist = Infinity;
      for (let i = 0; i < allPoints.length - 1; i++) {
        const mx = (allPoints[i].x + allPoints[i + 1].x) / 2;
        const my = (allPoints[i].y + allPoints[i + 1].y) / 2;
        const dist = Math.hypot(svgPoint.x - mx, svgPoint.y - my);
        // Also check distance to the segment itself
        const segDist = distToSegment(svgPoint, allPoints[i], allPoints[i + 1]);
        const combinedDist = Math.min(dist, segDist);
        if (combinedDist < bestDist) {
          bestDist = combinedDist;
          bestIdx = i;
        }
      }

      const newPoint: ControlPoint = { x: svgPoint.x, y: svgPoint.y };
      const newPoints = [...controlPoints];
      // Insert after the bestIdx (accounting for source being index 0)
      newPoints.splice(bestIdx, 0, newPoint);
      updateControlPoints(newPoints);
    },
    [sourceX, sourceY, targetX, targetY, controlPoints, updateControlPoints]
  );

  const handlePointDoubleClick = useCallback(
    (index: number) => (evt: React.MouseEvent) => {
      evt.stopPropagation();
      const newPoints = controlPoints.filter((_, i) => i !== index);
      updateControlPoints(newPoints);
    },
    [controlPoints, updateControlPoints]
  );

  return (
    <>
      {/* Invisible wider path for easier double-click targeting */}
      <path
        d={edgePath}
        fill="none"
        stroke="transparent"
        strokeWidth={20}
        onDoubleClick={handleEdgeDoubleClick}
        style={{ cursor: 'crosshair' }}
      />
      <BaseEdge
        path={edgePath}
        markerEnd={markerEnd}
        markerStart={markerStart}
        style={style}
        labelX={labelX}
        labelY={labelY}
        label={label}
        labelStyle={labelStyle}
      />
      {controlPoints.map((cp, i) => (
        <circle
          key={i}
          cx={cp.x}
          cy={cp.y}
          r={5}
          fill="hsl(217, 91%, 60%)"
          stroke="hsl(0, 0%, 100%)"
          strokeWidth={1.5}
          style={{ cursor: 'grab' }}
          onPointerDown={handlePointerDown(i)}
          onDoubleClick={handlePointDoubleClick(i)}
        />
      ))}
    </>
  );
}

function distToSegment(
  p: { x: number; y: number },
  a: { x: number; y: number },
  b: { x: number; y: number }
) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return Math.hypot(p.x - a.x, p.y - a.y);
  let t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
}
