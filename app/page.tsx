'use client';

import { useState, useCallback, useRef, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import ReactFlow, {
  Background,
  Controls,
  applyNodeChanges,
  applyEdgeChanges,
  addEdge,
  useReactFlow,
  useViewport,
  ReactFlowProvider,
  type Node,
  type Edge,
  type OnNodesChange,
  type OnEdgesChange,
  type OnConnect,
} from 'reactflow';
import 'reactflow/dist/style.css';
import DatabaseNode from './components/DatabaseNode';
import Sidebar from './components/Sidebar';
import { socket } from './lib/socket';

const nodeTypes = { database: DatabaseNode };

const initialNodes: Node[] = [
  { id: '1', position: { x: 100, y: 100 }, data: { label: 'Web Server' } },
  { id: '2', type: 'database', position: { x: 350, y: 100 }, data: { label: 'PostgreSQL' } },
];

const initialEdges: Edge[] = [];

type CursorMap = Record<string, { x: number; y: number }>;

function CursorOverlay({ cursors }: { cursors: CursorMap }) {
  const { x: viewX, y: viewY, zoom } = useViewport();

  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: 0,
        height: 0,
        pointerEvents: 'none',
        transform: `translate(${viewX}px, ${viewY}px) scale(${zoom})`,
        transformOrigin: '0 0',
        zIndex: 1000,
      }}
    >
      {Object.entries(cursors).map(([id, pos]) => (
        <div
          key={id}
          style={{
            position: 'absolute',
            left: pos.x,
            top: pos.y,
            transition: 'left 0.05s linear, top 0.05s linear',
          }}
        >
          <div style={{
            width: 12, height: 12, borderRadius: '50%',
            background: '#f97316', border: '2px solid white',
          }} />
          <div style={{
            fontSize: 11, background: '#f97316', color: 'white',
            padding: '2px 6px', borderRadius: 4, marginTop: 2, whiteSpace: 'nowrap',
          }}>
            {id.slice(0, 5)}
          </div>
        </div>
      ))}
    </div>
  );
}

function Canvas() {
  const searchParams = useSearchParams();
  const roomId = searchParams.get('room') || 'default-room';

  const [nodes, setNodes] = useState<Node[]>(initialNodes);
  const [edges, setEdges] = useState<Edge[]>(initialEdges);
  const [cursors, setCursors] = useState<CursorMap>({});
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const lastEmitRef = useRef(0);
  const { screenToFlowPosition } = useReactFlow();

  useEffect(() => {
    socket.connect();
    socket.emit('join-room', roomId);
    console.log('Connected?', socket.connected);

    return () => {
      socket.disconnect();
    };
  }, [roomId]);

  useEffect(() => {
    const handleRemoteNodeChange = (changes: any) => {
      setNodes((nds) => applyNodeChanges(changes, nds));
    };

    const handleRemoteNodeAdd = (node: Node) => {
      setNodes((nds) => {
        if (nds.some((n) => n.id === node.id)) return nds;
        return nds.concat(node);
      });
    };

    const handleRemoteEdgeAdd = (edge: Edge) => {
      setEdges((eds) => {
        if (eds.some((e) => e.id === edge.id)) return eds;
        return eds.concat(edge);
      });
    };

    const handleRemoteCursorMove = ({ id, x, y }: { id: string; x: number; y: number }) => {
      setCursors((prev) => ({ ...prev, [id]: { x, y } }));
    };

    const handleUserLeft = (id: string) => {
      setCursors((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    };

    socket.on('node-change', handleRemoteNodeChange);
    socket.on('node-add', handleRemoteNodeAdd);
    socket.on('edge-add', handleRemoteEdgeAdd);
    socket.on('cursor-move', handleRemoteCursorMove);
    socket.on('user-left', handleUserLeft);

    return () => {
      socket.off('node-change', handleRemoteNodeChange);
      socket.off('node-add', handleRemoteNodeAdd);
      socket.off('edge-add', handleRemoteEdgeAdd);
      socket.off('cursor-move', handleRemoteCursorMove);
      socket.off('user-left', handleUserLeft);
    };
  }, []);

  const onNodesChange: OnNodesChange = useCallback(
    (changes) => {
      setNodes((nds) => applyNodeChanges(changes, nds));
      socket.emit('node-change', { roomId, changes });
    },
    [roomId]
  );

  const onEdgesChange: OnEdgesChange = useCallback(
    (changes) => setEdges((eds) => applyEdgeChanges(changes, eds)),
    []
  );

  const onConnect: OnConnect = useCallback(
    (connection) => {
      setEdges((eds) => {
        const newEdges = addEdge(connection, eds);
        const newEdge = newEdges[newEdges.length - 1];
        socket.emit('edge-add', { roomId, edge: newEdge });
        return newEdges;
      });
    },
    [roomId]
  );

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      const type = event.dataTransfer.getData('application/reactflow');
      if (!type) return;

      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      const newNode: Node = {
        id: crypto.randomUUID(),
        type: type === 'default' ? undefined : type,
        position,
        data: { label: type === 'database' ? 'New Database' : 'New Server' },
      };

      setNodes((nds) => nds.concat(newNode));
      socket.emit('node-add', { roomId, node: newNode });
    },
    [screenToFlowPosition, roomId]
  );

  const onMouseMove = useCallback(
    (event: React.MouseEvent) => {
      const now = Date.now();
      if (now - lastEmitRef.current < 50) return;
      lastEmitRef.current = now;

      const position = screenToFlowPosition({ x: event.clientX, y: event.clientY });
      socket.emit('cursor-move', { roomId, x: position.x, y: position.y });
    },
    [roomId, screenToFlowPosition]
  );

  const handleAnalyze = useCallback(async () => {
    setIsAnalyzing(true);
    setAnalysis(null);

    try {
      const res = await fetch('http://localhost:4000/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nodes, edges }),
      });
      const data = await res.json();
      setAnalysis(data.suggestions);
    } catch (err) {
      setAnalysis('Failed to analyze diagram. Please try again.');
    } finally {
      setIsAnalyzing(false);
    }
  }, [nodes, edges]);

  return (
    <div style={{ display: 'flex', width: '100vw', height: '100vh' }}>
      <Sidebar />
      <div
        ref={reactFlowWrapper}
        style={{ flex: 1, position: 'relative' }}
        onMouseMove={onMouseMove}
      >
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onDrop={onDrop}
          onDragOver={onDragOver}
          nodeTypes={nodeTypes}
          fitView
        >
          <Background />
          <Controls />
        </ReactFlow>
        <CursorOverlay cursors={cursors} />

        <button
          onClick={handleAnalyze}
          disabled={isAnalyzing}
          style={{
            position: 'absolute',
            top: 16,
            right: 16,
            zIndex: 1001,
            padding: '10px 20px',
            background: isAnalyzing ? '#666' : '#0284c7',
            color: 'white',
            border: 'none',
            borderRadius: 8,
            fontWeight: 600,
            cursor: isAnalyzing ? 'not-allowed' : 'pointer',
          }}
        >
          {isAnalyzing ? 'Analyzing...' : '✨ Analyze Architecture'}
        </button>

        {analysis && (
          <div
            style={{
              position: 'absolute',
              top: 70,
              right: 16,
              width: 320,
              maxHeight: '60vh',
              overflowY: 'auto',
              background: '#1a1a1a',
              border: '1px solid #333',
              borderRadius: 8,
              padding: 16,
              color: '#eee',
              zIndex: 1001,
              whiteSpace: 'pre-wrap',
              fontSize: 13,
              lineHeight: 1.6,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <strong>AI Suggestions</strong>
              <span
                onClick={() => setAnalysis(null)}
                style={{ cursor: 'pointer', opacity: 0.6 }}
              >
                ✕
              </span>
            </div>
            {analysis}
          </div>
        )}
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ReactFlowProvider>
        <Canvas />
      </ReactFlowProvider>
    </Suspense>
  );
}