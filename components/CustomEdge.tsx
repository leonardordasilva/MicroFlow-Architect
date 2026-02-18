import React, { useState, useCallback, useEffect } from 'react';
import { BaseEdge, EdgeLabelRenderer, EdgeProps, getSmoothStepPath, useReactFlow, Position } from 'reactflow';
import { X, GripVertical, ChevronsLeftRight, ChevronsUpDown } from 'lucide-react';

// Custom Path Generator for U-turns to strictly respect the handle position
const getSmartPath = ({
  sourceX, sourceY, sourcePosition, 
  targetX, targetY, targetPosition, 
  centerX, centerY, borderRadius = 5
}: any) => {
  const isVerticalU = (sourcePosition === Position.Bottom && targetPosition === Position.Bottom) || 
                      (sourcePosition === Position.Top && targetPosition === Position.Top);
                      
  const isHorizontalU = (sourcePosition === Position.Left && targetPosition === Position.Left) || 
                        (sourcePosition === Position.Right && targetPosition === Position.Right);

  // Manual generation for Vertical U-turns (Bottom-Bottom / Top-Top)
  if (isVerticalU && typeof centerY === 'number') {
     const cY = centerY;
     const r = borderRadius;
     const dirY1 = cY > sourceY ? 1 : -1;
     const dirX = targetX > sourceX ? 1 : -1;
     // Note: Target vector logic for Q curve depends on flow.
     // Simplified: Straight lines for the "legs", curve only if space.
     
     // Label Position
     const labelX = (sourceX + targetX) / 2;
     const labelY = cY;

     // Calculate safe radius
     const hDist = Math.abs(targetX - sourceX);
     const vDist1 = Math.abs(cY - sourceY);
     const vDist2 = Math.abs(targetY - cY);
     const effectiveR = Math.min(r, hDist/2, vDist1/2, vDist2/2);

     if (effectiveR < 1) {
         return [`M ${sourceX} ${sourceY} L ${sourceX} ${cY} L ${targetX} ${cY} L ${targetX} ${targetY}`, labelX, labelY];
     }
     
     const path = [
        `M ${sourceX} ${sourceY}`,
        `L ${sourceX} ${cY - (effectiveR * dirY1)}`,
        `Q ${sourceX} ${cY} ${sourceX + (effectiveR * dirX)} ${cY}`,
        `L ${targetX - (effectiveR * dirX)} ${cY}`,
        `Q ${targetX} ${cY} ${targetX} ${cY + ((targetY > cY ? 1 : -1) * effectiveR)}`, // corner 2
        `L ${targetX} ${targetY}`
     ].join(' ');
     
     return [path, labelX, labelY];
  }
  
  // Manual generation for Horizontal U-turns (Left-Left / Right-Right)
  if (isHorizontalU && typeof centerX === 'number') {
     const cX = centerX;
     const r = borderRadius;
     const dirX1 = cX > sourceX ? 1 : -1;
     const dirY = targetY > sourceY ? 1 : -1;

     // Label Position
     const labelX = cX;
     const labelY = (sourceY + targetY) / 2;

     const vDist = Math.abs(targetY - sourceY);
     const hDist1 = Math.abs(cX - sourceX);
     const hDist2 = Math.abs(targetX - cX);
     const effectiveR = Math.min(r, vDist/2, hDist1/2, hDist2/2);

     if (effectiveR < 1) {
         return [`M ${sourceX} ${sourceY} L ${cX} ${sourceY} L ${cX} ${targetY} L ${targetX} ${targetY}`, labelX, labelY];
     }
     
     const path = [
         `M ${sourceX} ${sourceY}`,
         `L ${cX - (effectiveR * dirX1)} ${sourceY}`,
         `Q ${cX} ${sourceY} ${cX} ${sourceY + (effectiveR * dirY)}`,
         `L ${cX} ${targetY - (effectiveR * dirY)}`,
         `Q ${cX} ${targetY} ${cX + ((targetX > cX ? 1 : -1) * effectiveR)} ${targetY}`,
         `L ${targetX} ${targetY}`
     ].join(' ');
     
     return [path, labelX, labelY];
  }

  // Fallback to library default for S-shapes or normal connections
  return getSmoothStepPath({ sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition, centerX, centerY, borderRadius });
};

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
  data,
}: EdgeProps) {
  const { setEdges } = useReactFlow();

  // 1. Determine interaction axis based on source position
  const interactionAxis = (sourcePosition === Position.Left || sourcePosition === Position.Right) ? 'x' : 'y';

  // 2. Read offsets
  const labelOffsetX = data?.labelX ?? 0;
  const labelOffsetY = data?.labelY ?? 0;
  const pathOffset = data?.pathOffset ?? 0;

  // 3. Calculate Path with Offset & Smart Defaults
  let defaultCenterX = (sourceX + targetX) / 2;
  let defaultCenterY = (sourceY + targetY) / 2;

  // Smart Defaults for U-shapes (Offset logic to match visual start)
  if (sourcePosition === Position.Bottom && targetPosition === Position.Bottom) {
      defaultCenterY = Math.max(sourceY, targetY) + 50; 
  } else if (sourcePosition === Position.Top && targetPosition === Position.Top) {
      defaultCenterY = Math.min(sourceY, targetY) - 50;
  }
  
  if (sourcePosition === Position.Right && targetPosition === Position.Right) {
      defaultCenterX = Math.max(sourceX, targetX) + 50;
  } else if (sourcePosition === Position.Left && targetPosition === Position.Left) {
      defaultCenterX = Math.min(sourceX, targetX) - 50;
  }

  const pathOptions: any = {
    sourceX, sourceY, sourcePosition,
    targetX, targetY, targetPosition,
    borderRadius: 10
  };

  if (interactionAxis === 'x') {
    pathOptions.centerX = defaultCenterX + pathOffset;
  } else {
    pathOptions.centerY = defaultCenterY + pathOffset;
  }

  // Use custom generator to ensure U-turns respect the custom center
  const [edgePath, labelX, labelY] = getSmartPath(pathOptions);

  // 4. Calculate Control Handle Position
  const handleX = interactionAxis === 'x' ? (defaultCenterX + pathOffset) : ((sourceX + targetX) / 2);
  const handleY = interactionAxis === 'x' ? ((sourceY + targetY) / 2) : (defaultCenterY + pathOffset);

  // Local state for dragging
  const [isLabelDragging, setIsLabelDragging] = useState(false);
  const [isPathDragging, setIsPathDragging] = useState(false);

  const onEdgeClick = (evt: React.MouseEvent) => {
    evt.stopPropagation();
  };

  const onDeleteClick = (evt: React.MouseEvent) => {
      evt.stopPropagation();
      setEdges((edges) => edges.filter((e) => e.id !== id));
  }

  // --- LABEL DRAG LOGIC ---
  const handleLabelMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setIsLabelDragging(true);

    const startX = e.clientX;
    const startY = e.clientY;
    const initialOffsetX = labelOffsetX;
    const initialOffsetY = labelOffsetY;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - startX;
      const deltaY = moveEvent.clientY - startY;

      setEdges((edges) =>
        edges.map((e) => {
          if (e.id === id) {
            return {
              ...e,
              data: {
                ...e.data,
                labelX: initialOffsetX + deltaX,
                labelY: initialOffsetY + deltaY,
              },
            };
          }
          return e;
        })
      );
    };

    const handleMouseUp = () => {
      setIsLabelDragging(false);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  // --- PATH (SPACING) DRAG LOGIC ---
  const handlePathMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setIsPathDragging(true);

    const startMouseX = e.clientX;
    const startMouseY = e.clientY;
    const initialPathOffset = pathOffset;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - startMouseX;
      const deltaY = moveEvent.clientY - startMouseY;
      
      const delta = interactionAxis === 'x' ? deltaX : deltaY;

      setEdges((edges) =>
        edges.map((e) => {
          if (e.id === id) {
            return {
              ...e,
              data: {
                ...e.data,
                pathOffset: initialPathOffset + delta,
              },
            };
          }
          return e;
        })
      );
    };

    const handleMouseUp = () => {
        setIsPathDragging(false);
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };


  // Enhance style when selected
  const edgeStyle = {
    ...style,
    stroke: selected ? '#3b82f6' : style.stroke,
    strokeWidth: selected ? (Number(style.strokeWidth) || 2) + 1 : style.strokeWidth,
    filter: selected ? 'drop-shadow(0 0 2px rgba(59, 130, 246, 0.5))' : 'none',
  };

  return (
    <>
      <BaseEdge path={edgePath} markerEnd={markerEnd} style={edgeStyle} interactionWidth={20} />
      <EdgeLabelRenderer>
        
        {/* 1. LABEL RENDERER */}
        <div
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX + labelOffsetX}px,${labelY + labelOffsetY}px)`,
            fontSize: 12,
            pointerEvents: 'all',
          }}
          className={`flex flex-col items-center group z-20 transition-transform ${isLabelDragging ? 'scale-110 cursor-grabbing' : ''}`}
        >
          {label && (
            <div
              onMouseDown={handleLabelMouseDown}
              className={`px-2 py-0.5 rounded shadow-sm border text-[10px] font-semibold mb-1 transition-colors flex items-center gap-1 cursor-grab active:cursor-grabbing select-none ${
                selected || isLabelDragging
                  ? 'bg-blue-100 border-blue-300 text-blue-800' 
                  : 'bg-slate-100 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
              }`}
            >
              <GripVertical className="w-2 h-2 opacity-30" />
              {label}
            </div>
          )}
          <button
            className={`w-5 h-5 bg-red-500 rounded-full text-white flex items-center justify-center transition-all shadow-sm hover:scale-110 cursor-pointer ${selected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
            onClick={onDeleteClick}
            title="Remover conexão"
          >
            <X className="w-3 h-3" />
          </button>
        </div>

        {/* 2. PATH ADJUSTMENT HANDLE */}
        <div
            style={{
                position: 'absolute',
                transform: `translate(-50%, -50%) translate(${handleX}px,${handleY}px)`,
                pointerEvents: 'all',
            }}
            className="z-10"
        >
            <div
                onMouseDown={handlePathMouseDown}
                className={`
                    w-6 h-6 rounded-full flex items-center justify-center shadow-sm border transition-all duration-200
                    ${interactionAxis === 'x' ? 'cursor-col-resize' : 'cursor-row-resize'}
                    ${isPathDragging || selected 
                        ? 'bg-blue-500 border-blue-600 text-white opacity-100 scale-100' 
                        : 'bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-600 text-slate-500 opacity-0 hover:opacity-100 hover:scale-110'
                    }
                `}
                title="Ajustar espaçamento da linha"
            >
                {interactionAxis === 'x' ? <ChevronsLeftRight className="w-3 h-3" /> : <ChevronsUpDown className="w-3 h-3" />}
            </div>
        </div>

      </EdgeLabelRenderer>
    </>
  );
}