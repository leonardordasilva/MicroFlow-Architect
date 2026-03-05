import { useCallback, useRef } from 'react';
import {
  BaseEdge,
  useReactFlow,
  type EdgeProps,
} from '@xyflow/react';
import { PROTOCOL_CONFIGS, type EdgeProtocol, type NodeType } from '@/types/diagram';
import { getDbColor } from '@/constants/databaseColors';

interface Point {
  x: number;
  y: number;
}

function getSourceNodeColor(sourceNodeType?: NodeType, sourceNodeSubType?: string): string | undefined {
  switch (sourceNodeType) {
    case 'service':
      return 'hsl(217, 91%, 60%)';
    case 'database':
      return getDbColor(sourceNodeSubType);
    case 'queue':
      return 'hsl(157, 52%, 49%)';
    case 'external':
      return 'hsl(220, 9%, 46%)';
    default:
      return undefined;
  }
}

interface EditableEdgeData {
  midOffsetX?: number;
  sourceOffsetY?: number;
  targetOffsetY?: number;
  protocol?: EdgeProtocol;
  sourceNodeType?: NodeType;
  sourceNodeSubType?: string;
  isQueueConnection?: boolean;
  [key: string]: unknown;
}

function buildOrthogonalPath(points: Point[]): string {
  if (points.length < 2) return '';
  return points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
}

function buildSegmentPath(a: Point, b: Point): string {
  return `M ${a.x} ${a.y} L ${b.x} ${b.y}`;
}

function isVerticalSegment(a: Point, b: Point): boolean {
  return Math.abs(a.x - b.x) < 1;
}

type DragAxis = 'x' | 'y';
type OffsetKey = 'midOffsetX' | 'sourceOffsetY' | 'targetOffsetY';

export default function EditableEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  style,
  markerEnd,
  markerStart,
  label,
  labelStyle,
  data,
}: EdgeProps) {
  const { setEdges } = useReactFlow();
  const draggingRef = useRef<{
    startSvg: Point;
    initialOffset: number;
    axis: DragAxis;
    offsetKey: OffsetKey;
  } | null>(null);

  const edgeData = data as EditableEdgeData | undefined;

  const protocol = edgeData?.protocol;
  const protocolConfig = protocol ? PROTOCOL_CONFIGS[protocol] : undefined;
  const isQueueConn = edgeData?.isQueueConnection ?? edgeData?.sourceNodeType === 'queue';
  const sourceColor = isQueueConn ? 'hsl(157, 52%, 49%)' : getSourceNodeColor(edgeData?.sourceNodeType, edgeData?.sourceNodeSubType);

  // Offsets
  const midOffsetX = edgeData?.midOffsetX ?? (edgeData as any)?.midOffset ?? 0;
  const sourceOffsetY = edgeData?.sourceOffsetY ?? 0;
  const targetOffsetY = edgeData?.targetOffsetY ?? 0;

  const defaultMx = (sourceX + targetX) / 2;
  const mx = defaultMx + midOffsetX;

  const sy = sourceY + sourceOffsetY;
  const ty = targetY + targetOffsetY;

  // Build 5-segment path when offsets cause extra bends, otherwise 3-segment
  const rawPoints: Point[] = [];
  rawPoints.push({ x: sourceX, y: sourceY });
  if (Math.abs(sourceOffsetY) > 0.5) {
    rawPoints.push({ x: sourceX, y: sy });
  }
  rawPoints.push({ x: mx, y: sy });
  rawPoints.push({ x: mx, y: ty });
  if (Math.abs(targetOffsetY) > 0.5) {
    rawPoints.push({ x: targetX, y: ty });
  }
  rawPoints.push({ x: targetX, y: targetY });

  // Deduplicate consecutive points
  const allPoints: Point[] = [rawPoints[0]];
  for (let i = 1; i < rawPoints.length; i++) {
    const prev = allPoints[allPoints.length - 1];
    if (Math.abs(rawPoints[i].x - prev.x) > 0.5 || Math.abs(rawPoints[i].y - prev.y) > 0.5) {
      allPoints.push(rawPoints[i]);
    }
  }
  if (allPoints.length < 2) {
    allPoints.length = 0;
    allPoints.push({ x: sourceX, y: sourceY }, { x: targetX, y: targetY });
  }

  // Ensure final segment has enough length for arrow orientation
  const MIN_ARROW_SEG = 8;
  if (allPoints.length >= 2) {
    const last = allPoints[allPoints.length - 1];
    const prev = allPoints[allPoints.length - 2];
    const dx = last.x - prev.x;
    const dy = last.y - prev.y;
    const len = Math.hypot(dx, dy);
    if (len < MIN_ARROW_SEG && len > 0) {
      const scale = MIN_ARROW_SEG / len;
      allPoints[allPoints.length - 2] = {
        x: last.x - dx * scale,
        y: last.y - dy * scale,
      };
    }
  }

  const edgePath = buildOrthogonalPath(allPoints);

  const midIdx = Math.floor(allPoints.length / 2);
  const labelX = (allPoints[midIdx - 1].x + allPoints[midIdx].x) / 2;
  const labelY2 = (allPoints[midIdx - 1].y + allPoints[midIdx].y) / 2;

  // Determine which offset key a segment controls
  function getSegmentInfo(segIdx: number, a: Point, b: Point): { axis: DragAxis; offsetKey: OffsetKey; cursor: string } | null {
    const vertical = isVerticalSegment(a, b);
    if (vertical) {
      // Vertical segment → drag horizontally → midOffsetX
      return { axis: 'x', offsetKey: 'midOffsetX', cursor: 'ew-resize' };
    } else {
      // Horizontal segment → drag vertically
      // Determine if closer to source or target by Y position
      const midY = (a.y + b.y) / 2;
      const distToSource = Math.abs(midY - sourceY);
      const distToTarget = Math.abs(midY - targetY);
      const offsetKey: OffsetKey = distToSource < distToTarget ? 'sourceOffsetY' : 'targetOffsetY';
      return { axis: 'y', offsetKey, cursor: 'ns-resize' };
    }
  }

  const handleSegmentPointerDown = useCallback(
    (axis: DragAxis, offsetKey: OffsetKey, initialVal: number) =>
      (evt: React.PointerEvent) => {
        evt.preventDefault();
        evt.stopPropagation();

        const svg = (evt.target as Element).closest('svg') as SVGSVGElement;
        if (!svg) return;

        const ctm = svg.getScreenCTM()?.inverse();
        if (!ctm) return;

        const startPt = svg.createSVGPoint();
        startPt.x = evt.clientX;
        startPt.y = evt.clientY;
        const startSvg = startPt.matrixTransform(ctm);

        draggingRef.current = {
          startSvg: { x: startSvg.x, y: startSvg.y },
          initialOffset: initialVal,
          axis,
          offsetKey,
        };

        const onMove = (e: PointerEvent) => {
          if (!draggingRef.current) return;

          const pt = svg.createSVGPoint();
          pt.x = e.clientX;
          pt.y = e.clientY;
          const currentCtm = svg.getScreenCTM()?.inverse();
          if (!currentCtm) return;
          const svgPt = pt.matrixTransform(currentCtm);

          const delta = draggingRef.current.axis === 'x'
            ? svgPt.x - draggingRef.current.startSvg.x
            : svgPt.y - draggingRef.current.startSvg.y;
          const newOffset = draggingRef.current.initialOffset + delta;
          const key = draggingRef.current.offsetKey;

          setEdges((edges) =>
            edges.map((edge) =>
              edge.id === id ? { ...edge, data: { ...edge.data, [key]: newOffset } } : edge
            )
          );
        };

        const onUp = () => {
          draggingRef.current = null;
          document.removeEventListener('pointermove', onMove);
          document.removeEventListener('pointerup', onUp);
        };

        document.addEventListener('pointermove', onMove);
        document.addEventListener('pointerup', onUp);
      },
    [id, setEdges]
  );

  // Build per-segment hit areas
  const segments: React.ReactNode[] = [];
  for (let i = 0; i < allPoints.length - 1; i++) {
    const a = allPoints[i];
    const b = allPoints[i + 1];
    const segLen = Math.hypot(b.x - a.x, b.y - a.y);
    if (segLen < 2) continue;

    const info = getSegmentInfo(i, a, b);
    if (!info) continue;

    const currentVal = info.offsetKey === 'midOffsetX' ? midOffsetX
      : info.offsetKey === 'sourceOffsetY' ? sourceOffsetY
      : targetOffsetY;

    segments.push(
      <path
        key={`seg-${i}`}
        d={buildSegmentPath(a, b)}
        fill="none"
        stroke="transparent"
        strokeWidth={16}
        style={{ cursor: info.cursor }}
        onPointerDown={handleSegmentPointerDown(info.axis, info.offsetKey, currentVal)}
      />
    );
  }

  return (
    <>
      <BaseEdge
        path={edgePath}
        markerEnd={markerEnd}
        markerStart={markerStart}
        style={{
          ...style,
          pointerEvents: 'none',
          ...(sourceColor ? { stroke: sourceColor } : {}),
          ...(isQueueConn ? { strokeDasharray: '8 4' } : {}),
          ...(protocolConfig ? {
            stroke: protocolConfig.color,
            strokeDasharray: protocolConfig.dashArray || undefined,
          } : {}),
        }}
        labelX={labelX}
        labelY={labelY2}
        label={label}
        labelStyle={labelStyle}
      />
      {segments}
    </>
  );
}
