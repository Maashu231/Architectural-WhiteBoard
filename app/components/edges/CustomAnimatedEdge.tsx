import React from 'react';
import { EdgeProps, getBezierPath, EdgeLabelRenderer } from 'reactflow';

const CustomAnimatedEdge: React.FC<EdgeProps> = ({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
  data,
}) => {
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const protocol = data?.protocol || 'HTTP';

  return (
    <>
      <path
        id={id}
        style={{
          ...style,
          stroke: '#0ea5e9',
          strokeWidth: 2,
          strokeDasharray: '8 4',
          animation: 'dashdraw 1s linear infinite',
        }}
        className="react-flow__edge-path"
        d={edgePath}
        markerEnd={markerEnd}
      />
      <defs>
        <style>{`
          @keyframes dashdraw {
            to {
              stroke-dashoffset: -24;
            }
          }
        `}</style>
      </defs>
      <EdgeLabelRenderer>
        <div
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            background: '#0f172a',
            border: '1px solid #0ea5e9',
            borderRadius: '4px',
            padding: '2px 8px',
            fontSize: '11px',
            color: '#0ea5e9',
            fontWeight: 600,
            fontFamily: 'monospace',
            pointerEvents: 'all',
            backdropFilter: 'blur(4px)',
          }}
          className="nodrag nopan"
        >
          {protocol}
        </div>
      </EdgeLabelRenderer>
    </>
  );
};

export default CustomAnimatedEdge;