import React from 'react';
import { BaseEdge, EdgeLabelRenderer, EdgeProps, getSmoothStepPath, useReactFlow } from 'reactflow';
import { X } from 'lucide-react';

export default function CustomEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
  label,
  selected,
}: EdgeProps) {
  const { setEdges } = useReactFlow();
  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const onEdgeClick = (evt: React.MouseEvent) => {
    evt.stopPropagation();
    setEdges((edges) => edges.filter((e) => e.id !== id));
  };

  // Enhance style when selected
  const edgeStyle = {
    ...style,
    stroke: selected ? '#3b82f6' : style.stroke, // Highlight blue when selected
    strokeWidth: selected ? (Number(style.strokeWidth) || 2) + 1 : style.strokeWidth,
    filter: selected ? 'drop-shadow(0 0 2px rgba(59, 130, 246, 0.5))' : 'none',
    cursor: 'pointer'
  };

  return (
    <>
      <BaseEdge path={edgePath} markerEnd={markerEnd} style={edgeStyle} interactionWidth={20} />
      <EdgeLabelRenderer>
        <div
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            fontSize: 12,
            pointerEvents: 'all',
          }}
          className="flex flex-col items-center group z-10"
        >
          {label && (
            <span 
              className={`px-2 py-0.5 rounded shadow-sm border text-[10px] font-semibold mb-1 transition-colors ${
                selected 
                  ? 'bg-blue-100 border-blue-300 text-blue-800' 
                  : 'bg-slate-100 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
              }`}
            >
              {label}
            </span>
          )}
          <button
            className={`w-5 h-5 bg-red-500 rounded-full text-white flex items-center justify-center transition-all shadow-sm hover:scale-110 cursor-pointer ${selected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
            onClick={onEdgeClick}
            title="Remover conexão"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      </EdgeLabelRenderer>
    </>
  );
}