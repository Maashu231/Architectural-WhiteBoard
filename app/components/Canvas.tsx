'use client';

import React, { useState, useCallback, useRef, useEffect, Suspense, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import ReactFlow, {
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
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
  type Connection,
} from 'reactflow';
import 'reactflow/dist/style.css';
import dynamic from 'next/dynamic';
import { motion } from 'framer-motion';
import { cn } from '@/app/lib/utils';
import Sidebar from './Sidebar';

const AnalysisPanel = dynamic(() => import('./AnalysisPanel'));
const NodeDetailPanel = dynamic(() => import('./NodeDetailPanel'));
const ExportModal = dynamic(() => import('./ExportModal'));
const AiPromptModal = dynamic(() => import('./AiPromptModal'));
const LoadModal = dynamic(() => import('./LoadModal'));
const CustomNodeModal = dynamic(() => import('./CustomNodeModal'));
import { nodeTypes, edgeTypes } from '../lib/nodeTypes';
import { createClient } from '@/lib/supabase/client';
import { createSocket, type UserMetadata, type CursorMoveEmitPayload, type CursorMoveListenPayload } from '../lib/socket';
import { type Socket } from 'socket.io-client';
import { useRouter } from 'next/navigation';
import {
  Sparkles,
  ScanSearch,
  Undo2,
  Redo2,
  Download,
  Cpu,
  X,
  CheckCircle2,
  AlertTriangle,
  Save,
  FolderOpen,
  LogOut,
  Play,
  Plus,
  Settings,
  Trash2,
  Copy,
  ShieldAlert
} from 'lucide-react';

// ── Initial state ─────────────────────────────────────────────────────────────
const initialNodes: Node[] = [
  { id: '1', type: 'microservice', position: { x: 200, y: 180 }, data: { label: 'API Server', subtext: 'Node.js / Express' } },
  { id: '2', type: 'postgresql',   position: { x: 550, y: 180 }, data: { label: 'PostgreSQL', subtext: 'Primary database' } },
];
const initialEdges: Edge[] = [];

type CursorMap = Record<string, { x: number; y: number; user?: UserMetadata }>;

// ── Toast component ───────────────────────────────────────────────────────────
interface Toast {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
  sub?: string;
}

function ToastContainer({ toasts, onRemove }: { toasts: Toast[]; onRemove: (id: string) => void }) {
  return (
    <div style={{
      position: 'fixed', bottom: 24, right: 24,
      zIndex: 9000,
      display: 'flex', flexDirection: 'column', gap: 10,
      pointerEvents: 'none',
    }}>
      {toasts.map(t => (
        <div
          key={t.id}
          style={{
            pointerEvents: 'all',
            display: 'flex', alignItems: 'flex-start', gap: 12,
            padding: '14px 18px',
            minWidth: 280, maxWidth: 380,
            background: 'rgba(15,23,42,0.95)',
            border: `1px solid ${t.type === 'success' ? 'rgba(16,185,129,0.4)' : t.type === 'error' ? 'rgba(239,68,68,0.4)' : 'rgba(14,165,233,0.4)'}`,
            borderRadius: 12,
            backdropFilter: 'blur(16px)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
            animation: 'toast-in 0.3s cubic-bezier(0.16, 1, 0.3, 1) both',
            cursor: 'pointer',
          }}
          onClick={() => onRemove(t.id)}
        >
          {t.type === 'success' && <CheckCircle2 size={18} color="#10b981" style={{ flexShrink: 0, marginTop: 1 }} />}
          {t.type === 'error'   && <AlertTriangle size={18} color="#ef4444" style={{ flexShrink: 0, marginTop: 1 }} />}
          {t.type === 'info'    && <Sparkles size={18} color="#0ea5e9" style={{ flexShrink: 0, marginTop: 1 }} />}
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#f1f5f9', lineHeight: 1.3 }}>{t.message}</div>
            {t.sub && <div style={{ fontSize: 11, color: '#64748b', marginTop: 3 }}>{t.sub}</div>}
          </div>
          <button onClick={e => { e.stopPropagation(); onRemove(t.id); }}
            style={{ color: '#475569', cursor: 'pointer', padding: 2, flexShrink: 0 }}>
            <X size={13} />
          </button>
        </div>
      ))}
    </div>
  );
}

// ── Cursor overlay ────────────────────────────────────────────────────────────
const CursorOverlay = React.memo(function CursorOverlay({ cursors }: { cursors: CursorMap }) {
  const { x: viewX, y: viewY, zoom } = useViewport();
  return (
    <div style={{
      position: 'absolute', top: 0, left: 0, width: 0, height: 0,
      pointerEvents: 'none',
      transform: `translate(${viewX}px, ${viewY}px) scale(${zoom})`,
      transformOrigin: '0 0', zIndex: 1000,
    }}>
      {Object.entries(cursors).map(([id, pos]) => (
        <div key={id} style={{ position: 'absolute', left: pos.x, top: pos.y, transition: 'left 0.05s linear, top 0.05s linear' }}>
          {pos.user?.avatar ? (
            <img 
              src={pos.user.avatar} 
              alt={pos.user.name}
              style={{ width: 24, height: 24, borderRadius: '50%', border: '2px solid #f97316', objectFit: 'cover', transform: 'translate(-12px, -12px)' }} 
            />
          ) : (
            <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#f97316', border: '2px solid white', transform: 'translate(-6px, -6px)' }} />
          )}
          <div style={{ 
            fontSize: 11, background: '#f97316', color: 'white', 
            padding: '3px 6px', borderRadius: 6, marginTop: pos.user?.avatar ? -8 : 2, 
            whiteSpace: 'nowrap', fontWeight: 600,
            boxShadow: '0 2px 4px rgba(0,0,0,0.15)' 
          }}>
            {pos.user?.name || id.slice(0, 5)}
          </div>
        </div>
      ))}
    </div>
  );
});

// ── Top toolbar ───────────────────────────────────────────────────────────────
interface ToolbarProps {
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  isAnalyzing: boolean;
  onAnalyze: () => void;
  onOpenAI: () => void;
  onExport: () => void;
  onSave: () => void;
  onLoad: () => void;
  onLogout: () => void;
  nodeCount: number;
}

const Toolbar = React.memo(({ canUndo, canRedo, onUndo, onRedo, isAnalyzing, onAnalyze, onOpenAI, onExport, onSave, onLoad, onLogout, nodeCount }: ToolbarProps) => {
  return (
    <motion.div 
      initial={{ opacity: 0, y: -20, x: '-50%' }}
      animate={{ opacity: 1, y: 0, x: '-50%' }}
      transition={{ type: "spring", stiffness: 300, damping: 25 }}
      className="absolute top-4 left-1/2 z-[1001] flex items-center gap-1 p-1.5 bg-card/80 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl"
    >
      {/* Logo chip */}
      <div className="flex items-center gap-2 px-3 py-1.5 border-r border-white/10 mr-1">
        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-cyan-500 to-indigo-500 flex items-center justify-center shadow-inner">
          <Cpu size={14} className="text-white" />
        </div>
        <span className="text-[13px] font-bold text-foreground tracking-tight">
          Cloud Architect
        </span>
      </div>

      {/* Undo / Redo */}
      <ToolbarBtn onClick={onUndo} disabled={!canUndo} title="Undo (Ctrl+Z)">
        <Undo2 size={15} />
      </ToolbarBtn>
      <ToolbarBtn onClick={onRedo} disabled={!canRedo} title="Redo (Ctrl+Shift+Z)">
        <Redo2 size={15} />
      </ToolbarBtn>

      <div className="w-px h-6 bg-white/10 mx-1" />

      {/* Node count badge */}
      <div className="px-2.5 py-1 rounded-lg bg-sky-500/10 border border-sky-500/20 text-[11px] font-bold text-sky-400 mr-0.5">
        {nodeCount} node{nodeCount !== 1 ? 's' : ''}
      </div>

      <div className="w-px h-6 bg-white/10 mx-1" />

      {/* AI Generate */}
      <motion.button
        id="toolbar-ai-generate"
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={onOpenAI}
        className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-[13px] font-bold transition-colors bg-gradient-to-r from-sky-500/20 to-indigo-500/20 border border-sky-500/30 text-sky-300 hover:from-sky-500/30 hover:to-indigo-500/30 hover:text-sky-200"
      >
        <Sparkles size={14} />
        AI Generate
      </motion.button>

      {/* Analyze */}
      <motion.button
        id="toolbar-analyze"
        whileHover={!isAnalyzing ? { scale: 1.02 } : {}}
        whileTap={!isAnalyzing ? { scale: 0.98 } : {}}
        onClick={onAnalyze}
        disabled={isAnalyzing}
        className={cn(
          "flex items-center gap-2 px-3.5 py-2 rounded-xl text-[13px] font-bold transition-colors border",
          isAnalyzing 
            ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400 opacity-70 cursor-not-allowed"
            : "bg-emerald-500/15 border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/25 hover:text-emerald-200 cursor-pointer"
        )}
      >
        <ScanSearch size={14} />
        {isAnalyzing ? 'Analyzing…' : 'Analyze'}
      </motion.button>

      {/* Export */}
      <motion.button
        id="toolbar-export"
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={onExport}
        className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-[13px] font-bold transition-colors bg-white/5 border border-white/10 text-muted-foreground hover:bg-white/10 hover:text-foreground"
      >
        <Download size={14} />
        Export
      </motion.button>

      <div className="w-px h-6 bg-white/10 mx-1" />

      {/* Save */}
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={onSave}
        className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-[13px] font-bold transition-colors bg-white/5 border border-white/10 text-muted-foreground hover:bg-white/10 hover:text-foreground"
      >
        <Save size={14} />
        Save
      </motion.button>

      {/* Load */}
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={onLoad}
        className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-[13px] font-bold transition-colors bg-white/5 border border-white/10 text-muted-foreground hover:bg-white/10 hover:text-foreground"
      >
        <FolderOpen size={14} />
        Load
      </motion.button>

      <div className="w-px h-6 bg-white/10 mx-1" />

      {/* Logout */}
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={onLogout}
        className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-[13px] font-bold transition-colors bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 hover:text-red-300"
      >
        <LogOut size={14} />
        Logout
      </motion.button>
    </motion.div>
  );
});

function ToolbarBtn({
  onClick, disabled, title, children,
}: {
  onClick: () => void; disabled?: boolean; title?: string; children: React.ReactNode;
}) {
  return (
    <motion.button
      whileHover={!disabled ? { scale: 1.05 } : {}}
      whileTap={!disabled ? { scale: 0.95 } : {}}
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={cn(
        "w-8 h-8 rounded-lg flex items-center justify-center transition-colors border border-transparent",
        disabled 
          ? "text-slate-600 cursor-not-allowed" 
          : "text-muted-foreground cursor-pointer hover:bg-white/10 hover:text-foreground hover:border-white/10"
      )}
    >
      {children}
    </motion.button>
  );
}

// ── Canvas ────────────────────────────────────────────────────────────────────
function Canvas() {
  const searchParams = useSearchParams();
  const roomId = searchParams.get('room') || 'default-room';

  const [nodes, setNodes] = useState<Node[]>(initialNodes);
  const [edges, setEdges] = useState<Edge[]>(initialEdges);
  const [past,   setPast]   = useState<{ nodes: Node[]; edges: Edge[] }[]>([]);
  const [future, setFuture] = useState<{ nodes: Node[]; edges: Edge[] }[]>([]);
  const [cursors, setCursors] = useState<CursorMap>({});
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [showAiPrompt, setShowAiPrompt] = useState(false);
  const [showLoad, setShowLoad] = useState(false);
  const [showCustomNode, setShowCustomNode] = useState(false);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [currentDiagramId, setCurrentDiagramId] = useState<string | null>(null);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  const router = useRouter();
  // createClient() is stable for the lifetime of the component — only create once.
  const supabase = useMemo(() => createClient(), []);
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const socketRef = useRef<Socket | null>(null);
  const lastEmitRef = useRef(0);
  const { screenToFlowPosition, fitView } = useReactFlow();

  // ── Toast helpers ──
  const addToast = useCallback((t: Omit<Toast, 'id'>) => {
    const id = crypto.randomUUID();
    setToasts(prev => [...prev, { ...t, id }]);
    setTimeout(() => setToasts(prev => prev.filter(x => x.id !== id)), 5000);
  }, []);
  const removeToast = useCallback((id: string) => setToasts(prev => prev.filter(x => x.id !== id)), []);

  // ── Auth & Socket ──
  useEffect(() => {
    let activeSocket: any = null;

    const initSocket = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      activeSocket = createSocket(session?.access_token);
      socketRef.current = activeSocket;
      
      activeSocket.on('connect', () => {
        setIsConnected(true);
        activeSocket.emit('join-room', roomId);
      });
      activeSocket.on('disconnect', () => setIsConnected(false));
      
      activeSocket.connect();
      setSocket(activeSocket);
    };

    initSocket();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (activeSocket && event === 'TOKEN_REFRESHED') {
        activeSocket.auth = { token: session?.access_token };
        activeSocket.disconnect().connect();
      }
    });

    return () => {
      if (activeSocket) activeSocket.disconnect();
      subscription.unsubscribe();
    };
  }, [roomId, supabase]);

  useEffect(() => {
    if (!socket) return;
    
    const onNodeChange = (changes: any) => setNodes(nds => applyNodeChanges(changes, nds));
    const onNodeAdd    = (node: Node)  => setNodes(nds => nds.some(n => n.id === node.id) ? nds : nds.concat(node));
    const onEdgeAdd    = (edge: Edge)  => setEdges(eds => eds.some(e => e.id === edge.id) ? eds : eds.concat(edge));
    const onEdgeChange = (changes: any) => setEdges(eds => applyEdgeChanges(changes, eds));
    const onDiagramState = ({ nodes: nextNodes, edges: nextEdges }: { nodes: Node[]; edges: Edge[] }) => {
      setNodes(nextNodes);
      setEdges(nextEdges);
    };
    const onCursorMove = (payload: CursorMoveListenPayload) => setCursors(p => ({ ...p, [payload.id]: { x: payload.x, y: payload.y, user: payload.user } }));
    const onUserLeft   = (id: string)  => setCursors(p => { const n = { ...p }; delete n[id]; return n; });

    socket.on('node-change',   onNodeChange);
    socket.on('node-add',      onNodeAdd);
    socket.on('edge-add',      onEdgeAdd);
    socket.on('edge-change',   onEdgeChange);
    socket.on('diagram-state', onDiagramState);
    socket.on('cursor-move',   onCursorMove);
    socket.on('user-left',     onUserLeft);
    return () => {
      socket.off('node-change', onNodeChange);
      socket.off('node-add',    onNodeAdd);
      socket.off('edge-add',    onEdgeAdd);
      socket.off('edge-change', onEdgeChange);
      socket.off('diagram-state', onDiagramState);
      socket.off('cursor-move', onCursorMove);
      socket.off('user-left',   onUserLeft);
    };
  }, [socket]);

  useEffect(() => {
    const onAI     = () => setShowAiPrompt(true);
    const onExport = () => setShowExport(true);
    const onCustom = () => setShowCustomNode(true);
    window.addEventListener('open-ai-modal',     onAI);
    window.addEventListener('open-export-modal', onExport);
    window.addEventListener('open-custom-node-modal', onCustom);
    return () => {
      window.removeEventListener('open-ai-modal',     onAI);
      window.removeEventListener('open-export-modal', onExport);
      window.removeEventListener('open-custom-node-modal', onCustom);
    };
  }, []);

  // ── History ──
  const takeSnapshot = useCallback(() => {
    setPast(p => [...p.slice(-19), { nodes, edges }]);
    setFuture([]);
  }, [nodes, edges]);

  const undo = useCallback(() => {
    if (past.length === 0) return;
    const prev = past[past.length - 1];
    setFuture(f => [{ nodes, edges }, ...f]);
    setPast(p => p.slice(0, -1));
    setNodes(prev.nodes);
    setEdges(prev.edges);
    socketRef.current?.emit('diagram-state', { roomId, nodes: prev.nodes, edges: prev.edges });
  }, [past, nodes, edges, roomId]);

  const redo = useCallback(() => {
    if (future.length === 0) return;
    const next = future[0];
    setPast(p => [...p, { nodes, edges }]);
    setFuture(f => f.slice(1));
    setNodes(next.nodes);
    setEdges(next.edges);
    socketRef.current?.emit('diagram-state', { roomId, nodes: next.nodes, edges: next.edges });
  }, [future, nodes, edges, roomId]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [undo, redo]);

  // ── ReactFlow handlers ──
  const onNodesChange: OnNodesChange = useCallback(
    changes => { setNodes(nds => applyNodeChanges(changes, nds)); socketRef.current?.emit('node-change', { roomId, changes }); },
    [roomId]
  );
  const onEdgesChange: OnEdgesChange = useCallback(
    changes => {
      setEdges(eds => applyEdgeChanges(changes, eds));
      socketRef.current?.emit('edge-change', { roomId, changes });
    },
    [roomId]
  );
  const onConnect: OnConnect = useCallback((conn: Connection) => {
    takeSnapshot();
    setEdges(eds => {
      const newEdge = { ...conn, id: `edge-${Date.now()}`, type: 'animated', data: { protocol: 'HTTPS' } };
      const newEdges = addEdge(newEdge, eds);
      socketRef.current?.emit('edge-add', { roomId, edge: newEdges[newEdges.length - 1] });
      return newEdges;
    });
  }, [roomId, takeSnapshot]);

  const onDragOver = useCallback((e: React.DragEvent) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; }, []);
  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const type = e.dataTransfer.getData('application/reactflow');
    if (!type) return;
    const position = screenToFlowPosition({ x: e.clientX, y: e.clientY });
    const newNode: Node = {
      id: crypto.randomUUID(), type, position,
      data: { label: type.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) },
    };
    takeSnapshot();
    setNodes(nds => nds.concat(newNode));
    socketRef.current?.emit('node-add', { roomId, node: newNode });
  }, [screenToFlowPosition, roomId, takeSnapshot]);

  const onMouseMove = useCallback((e: React.MouseEvent) => {
    const now = Date.now();
    if (now - lastEmitRef.current < 50) return;
    lastEmitRef.current = now;
    const pos = screenToFlowPosition({ x: e.clientX, y: e.clientY });
    const payload: CursorMoveEmitPayload = { roomId, x: pos.x, y: pos.y };
    socketRef.current?.emit('cursor-move', payload);
  }, [roomId, screenToFlowPosition]);

  // ── AI ──
  const handleAnalyze = useCallback(async () => {
    setIsAnalyzing(true);
    setAnalysis(null);
    try {
      const res = await fetch('/api/analyze', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nodes, edges }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || 'Analysis failed');
      setAnalysis(data.suggestions);
      addToast({ type: 'info', message: 'Audit complete', sub: 'Architecture analysis ready' });
    } catch {
      addToast({ type: 'error', message: 'Analysis failed', sub: 'Please try again' });
    } finally {
      setIsAnalyzing(false);
    }
  }, [nodes, edges, addToast]);

  const handleGenerateFromPrompt = useCallback(async (prompt: string) => {
    try {
      const res = await fetch('/api/generate', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      
      if (data.nodes) {
        takeSnapshot();
        setNodes(data.nodes);
        setEdges(data.edges ?? []);
        setCurrentDiagramId(null); // Reset when generating a new one
        setTimeout(() => fitView({ padding: 0.15, duration: 600 }), 80);
        addToast({
          type: 'success',
          message: data.blueprintName ?? 'Architecture generated',
          sub: `${data.stats?.nodes ?? data.nodes.length} nodes · ${data.stats?.edges ?? data.edges?.length ?? 0} connections`,
        });
      }
      return data;
    } catch (error: any) {
      addToast({ type: 'error', message: 'Generation failed', sub: error.message || 'Please try again' });
      return null;
    }
  }, [takeSnapshot, fitView, addToast]);

  const handleSave = useCallback(async () => {
    if (!supabase) {
      addToast({ type: 'error', message: 'Save unavailable', sub: 'Supabase is not configured' });
      return;
    }
    let name = 'Architecture Diagram';
    if (!currentDiagramId) {
      name = `Architecture ${new Date().toLocaleDateString()}`;
    }

    try {
      if (currentDiagramId) {
        const { error } = await supabase.from('diagrams').update({ nodes, edges, updated_at: new Date().toISOString() }).eq('id', currentDiagramId);
        if (error) throw error;
        addToast({ type: 'success', message: 'Diagram saved', sub: 'Successfully updated' });
      } else {
        const { data, error } = await supabase.from('diagrams').insert([{ name, nodes, edges }]).select().single();
        if (error) throw error;
        if (data) setCurrentDiagramId(data.id);
        addToast({ type: 'success', message: 'Diagram saved', sub: 'Successfully created' });
      }
    } catch (error: any) {
      addToast({ type: 'error', message: 'Save failed', sub: error.message || 'Check console' });
    }
  }, [supabase, currentDiagramId, nodes, edges, addToast]);

  const handleLoadDiagram = useCallback((loadedNodes: Node[], loadedEdges: Edge[], name: string, id: string) => {
    takeSnapshot();
    setNodes(loadedNodes);
    setEdges(loadedEdges);
    setCurrentDiagramId(id);
    setShowLoad(false);
    setTimeout(() => fitView({ padding: 0.15, duration: 600 }), 80);
    addToast({ type: 'success', message: 'Diagram loaded', sub: name });
  }, [takeSnapshot, addToast, fitView]);

  const handleCreateCustomNode = useCallback((nodeData: any) => {
    takeSnapshot();
    const position = screenToFlowPosition({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
    const newNode: Node = { id: crypto.randomUUID(), position, ...nodeData };
    setNodes(nds => nds.concat(newNode));
    socketRef.current?.emit('node-add', { roomId, node: newNode });
    addToast({ type: 'success', message: 'Custom node created', sub: nodeData.data.label });
  }, [takeSnapshot, screenToFlowPosition, roomId, addToast]);

  // ── Node ops ──
  const handleUpdateNode = useCallback((nodeId: string, newData: any) => {
    takeSnapshot();
    setNodes(nds => nds.map(n => n.id === nodeId ? { ...n, data: { ...n.data, ...newData } } : n));
    const updatedNode = nodes.find(node => node.id === nodeId);
    if (updatedNode) {
      socketRef.current?.emit('node-change', {
        roomId,
        changes: [{ type: 'replace' as const, item: { ...updatedNode, data: { ...updatedNode.data, ...newData } } }],
      });
    }
  }, [nodes, roomId, takeSnapshot]);

  const handleDeleteNode = useCallback((nodeId: string) => {
    takeSnapshot();
    setNodes(nds => nds.filter(n => n.id !== nodeId));
    setEdges(eds => eds.filter(e => e.source !== nodeId && e.target !== nodeId));
    socketRef.current?.emit('node-change', { roomId, changes: [{ type: 'remove' as const, id: nodeId }] });
    setSelectedNode(null);
  }, [roomId, takeSnapshot]);

  const handleDuplicateNode = useCallback((nodeId: string) => {
    const src = nodes.find(n => n.id === nodeId);
    if (!src) return;
    const newNode: Node = { ...src, id: crypto.randomUUID(), position: { x: src.position.x + 40, y: src.position.y + 40 } };
    takeSnapshot();
    setNodes(nds => nds.concat(newNode));
    socketRef.current?.emit('node-add', { roomId, node: newNode });
  }, [nodes, roomId, takeSnapshot]);

  return (
    <div className="flex w-screen h-screen bg-background text-foreground overflow-hidden">
      <Sidebar />

      {!isConnected && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute top-0 left-0 right-0 bg-destructive/90 text-destructive-foreground text-center py-1.5 text-[13px] font-semibold z-[3000] flex justify-center items-center gap-2 backdrop-blur-sm"
        >
          <AlertTriangle size={14} /> Disconnected. Reconnecting...
        </motion.div>
      )}

      <div
        ref={reactFlowWrapper}
        className="flex-1 relative"
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
          edgeTypes={edgeTypes}
          onNodeClick={(_, node) => setSelectedNode(node)}
          onNodeDragStart={() => takeSnapshot()}
          onPaneClick={() => setSelectedNode(null)}
          fitView
          minZoom={0.08}
          maxZoom={2.5}
          defaultEdgeOptions={{ type: 'animated' }}
        >
          <Background
            variant={BackgroundVariant.Dots}
            gap={24} size={1.5}
            color="rgba(255, 255, 255, 0.08)"
          />
          <Controls position="bottom-right" className="bg-card border-border shadow-xl rounded-lg overflow-hidden" />
          <MiniMap
            position="bottom-right"
            className="!bg-card/90 !backdrop-blur-md !border !border-white/10 !rounded-xl !mb-14 overflow-hidden shadow-2xl"

            nodeColor={n => {
              const cats: Record<string, string> = {
                'client-web': '#06b6d4', 'client-mobile': '#06b6d4', cdn: '#06b6d4', dns: '#06b6d4',
                'api-gateway': '#8b5cf6', alb: '#8b5cf6', waf: '#8b5cf6',
                microservice: '#10b981', serverless: '#10b981', 'kubernetes-pod': '#10b981',
                postgresql: '#f59e0b', mongodb: '#f59e0b', s3: '#f59e0b',
                redis: '#ec4899', kafka: '#ec4899', rabbitmq: '#ec4899',
                vpc: '#6366f1', subnet: '#6366f1',
              };
              return cats[n.type ?? ''] ?? '#475569';
            }}
            maskColor="rgba(7,13,26,0.8)"
          />
        </ReactFlow>

        <CursorOverlay cursors={cursors} />

        {/* Central toolbar */}
        <Toolbar
          canUndo={past.length > 0}
          canRedo={future.length > 0}
          onUndo={undo}
          onRedo={redo}
          isAnalyzing={isAnalyzing}
          onAnalyze={handleAnalyze}
          onOpenAI={() => setShowAiPrompt(true)}
          onExport={() => setShowExport(true)}
          onSave={handleSave}
          onLoad={() => setShowLoad(true)}
          onLogout={async () => {
            await supabase.auth.signOut();
            router.push('/login');
          }}
          nodeCount={nodes.length}
        />

        {/* Analysis panel */}
        {analysis && <AnalysisPanel analysis={analysis} onClose={() => setAnalysis(null)} />}
      </div>

      {/* Toasts */}
      <ToastContainer toasts={toasts} onRemove={removeToast} />

      {/* Modals */}
      <ExportModal isOpen={showExport} onClose={() => setShowExport(false)} nodes={nodes} edges={edges} />
      <AiPromptModal isOpen={showAiPrompt} onClose={() => setShowAiPrompt(false)} onGenerate={handleGenerateFromPrompt} />
      <LoadModal isOpen={showLoad} onClose={() => setShowLoad(false)} onLoad={handleLoadDiagram} />
      <CustomNodeModal isOpen={showCustomNode} onClose={() => setShowCustomNode(false)} onCreate={handleCreateCustomNode} />
      <NodeDetailPanel
        node={selectedNode ? { ...selectedNode, type: selectedNode.type as string | undefined } : null}
        onClose={() => setSelectedNode(null)}
        onUpdate={(newData) => selectedNode && handleUpdateNode(selectedNode.id, newData)}
        onDelete={handleDeleteNode}
        onDuplicate={handleDuplicateNode}
      />
    </div>
  );
}

export default Canvas;