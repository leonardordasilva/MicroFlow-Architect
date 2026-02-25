import { useCallback, useRef } from 'react';
import {
  BaseEdge,
  useReactFlow,
  type EdgeProps,
} from '@xyflow/react';

interface Point {
  x: number;
  y: number;
}

interface EditableEdgeData {
  waypoints?: Point[];
  [key: string]: unknown;
}

function computeDefaultWaypoints(
  sx: number,
  sy: number,
  tx: number,
  ty: number
): Point[] {
  const mx = (sx + tx) / 2;
  return [
    { x: mx, y: sy },
    { x: mx, y: ty },
  ];
}

function buildOrthogonalPath(points: Point[]): string {
  if (points.length < 2) return '';
  return points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
}

function isHorizontal(a: Point, b: Point): boolean {
  return Math.abs(a.y - b.y) < 2;
}

function isVertical(a: Point, b: Point): boolean {
  return Math.abs(a.x - b.x) < 2;
}

function segmentLength(a: Point, b: Point): number {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

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
    segmentIndex: number;
    orientation: 'h' | 'v';
    initialWaypoints: Point[];
    startSvg: Point;
  } | null>(null);

  const edgeData = data as EditableEdgeData | undefined;
  const waypoints: Point[] =
    edgeData?.waypoints ?? computeDefaultWaypoints(sourceX, sourceY, targetX, targetY);

  const source: Point = { x: sourceX, y: sourceY };
  const target: Point = { x: targetX, y: targetY };
  const allPoints: Point[] = [source, ...waypoints, target];

  const edgePath = buildOrthogonalPath(allPoints);

  // Label at midpoint
  const midIdx = Math.floor(allPoints.length / 2);
  const labelX = (allPoints[midIdx - 1].x + allPoints[midIdx].x) / 2;
  const labelY = (allPoints[midIdx - 1].y + allPoints[midIdx].y) / 2;

  const updateWaypoints = useCallback(
    (newWp: Point[]) => {
      setEdges((edges) =>
        edges.map((e) =>
          e.id === id ? { ...e, data: { ...e.data, waypoints: newWp } } : e
        )
      );
    },
    [id, setEdges]
  );

  const handleSegmentPointerDown = useCallback(
    (segIdx: number, orientation: 'h' | 'v') =>
      (evt: React.PointerEvent) => {
        evt.stopPropagation();
        evt.preventDefault();

        const svg = (evt.target as Element).closest('svg') as SVGSVGElement;
        if (!svg) return;

        const ctm = svg.getScreenCTM()?.inverse();
        if (!ctm) return;

        const startPt = svg.createSVGPoint();
        startPt.x = evt.clientX;
        startPt.y = evt.clientY;
        const startSvg = startPt.matrixTransform(ctm);

        // Prepare working waypoints — insert new ones for first/last segments
        let workingWaypoints = waypoints.map((p) => ({ ...p }));
        let dragSegIdx = segIdx;
        const totalPoints = allPoints.length;

        if (segIdx === 0) {
          // First segment: insert waypoint at source position to make it internal
          workingWaypoints = [{ x: sourceX, y: sourceY }, ...workingWaypoints];
          dragSegIdx = 1;
        } else if (segIdx === totalPoints - 2) {
          // Last segment: insert waypoint at target position
          workingWaypoints = [...workingWaypoints, { x: targetX, y: targetY }];
          // dragSegIdx stays the same
        }

        const initialWp = workingWaypoints.map((p) => ({ ...p }));

        // Persist the expanded waypoints immediately
        updateWaypoints(workingWaypoints);

        draggingRef.current = {
          segmentIndex: dragSegIdx,
          orientation,
          initialWaypoints: initialWp,
          startSvg: { x: startSvg.x, y: startSvg.y },
        };

        const onMove = (e: PointerEvent) => {
          if (!draggingRef.current) return;

          const pt = svg.createSVGPoint();
          pt.x = e.clientX;
          pt.y = e.clientY;
          const currentCtm = svg.getScreenCTM()?.inverse();
          if (!currentCtm) return;
          const svgPt = pt.matrixTransform(currentCtm);

          const dx = svgPt.x - draggingRef.current.startSvg.x;
          const dy = svgPt.y - draggingRef.current.startSvg.y;

          const { initialWaypoints: iwp, segmentIndex: si, orientation: ori } = draggingRef.current;

          // Waypoint indices for the segment endpoints in allPoints
          // allPoints[i] corresponds to waypoints[i-1] for i in [1..allPoints.length-2]
          const wpIdx1 = si - 1;
          const wpIdx2 = si;

          const newWp = iwp.map((p) => ({ ...p }));

          if (ori === 'h') {
            // Horizontal segment → drag vertically
            if (wpIdx1 >= 0 && wpIdx1 < newWp.length)
              newWp[wpIdx1] = { ...newWp[wpIdx1], y: iwp[wpIdx1].y + dy };
            if (wpIdx2 >= 0 && wpIdx2 < newWp.length)
              newWp[wpIdx2] = { ...newWp[wpIdx2], y: iwp[wpIdx2].y + dy };
          } else {
            // Vertical segment → drag horizontally
            if (wpIdx1 >= 0 && wpIdx1 < newWp.length)
              newWp[wpIdx1] = { ...newWp[wpIdx1], x: iwp[wpIdx1].x + dx };
            if (wpIdx2 >= 0 && wpIdx2 < newWp.length)
              newWp[wpIdx2] = { ...newWp[wpIdx2], x: iwp[wpIdx2].x + dx };
          }

          updateWaypoints(newWp);
        };

        const onUp = () => {
          draggingRef.current = null;
          document.removeEventListener('pointermove', onMove);
          document.removeEventListener('pointerup', onUp);
        };

        document.addEventListener('pointermove', onMove);
        document.addEventListener('pointerup', onUp);
      },
    [waypoints, allPoints, sourceX, sourceY, targetX, targetY, updateWaypoints]
  );

  // Build interactive segments
  const segments: {
    index: number;
    p1: Point;
    p2: Point;
    orientation: 'h' | 'v';
  }[] = [];

  for (let i = 0; i < allPoints.length - 1; i++) {
    const p1 = allPoints[i];
    const p2 = allPoints[i + 1];
    // Only render hit area for segments with meaningful length
    if (segmentLength(p1, p2) < 5) continue;
    let ori: 'h' | 'v' | null = null;
    if (isHorizontal(p1, p2)) ori = 'h';
    else if (isVertical(p1, p2)) ori = 'v';
    if (ori) segments.push({ index: i, p1, p2, orientation: ori });
  }

  return (
    <>
      <BaseEdge
        path={edgePath}
        markerEnd={markerEnd}
        markerStart={markerStart}
        style={{ ...style, pointerEvents: 'none' }}
        labelX={labelX}
        labelY={labelY}
        label={label}
        labelStyle={labelStyle}
      />
      {/* Invisible hit areas for each segment */}
      {segments.map((seg) => (
        <line
          key={seg.index}
          x1={seg.p1.x}
          y1={seg.p1.y}
          x2={seg.p2.x}
          y2={seg.p2.y}
          stroke="transparent"
          strokeWidth={16}
          style={{
            cursor: seg.orientation === 'h' ? 'ns-resize' : 'ew-resize',
          }}
          onPointerDown={handleSegmentPointerDown(seg.index, seg.orientation)}
        />
      ))}
    </>
  );
}
