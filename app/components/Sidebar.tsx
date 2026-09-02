'use client';
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/app/lib/utils';
import {
  ChevronDown, Search, Zap, Database as DbIcon,
  Globe, Smartphone, CloudLightning, MapPin,
  Shield, Scale, Activity,
  Server, Cpu, Container,
  HardDrive,
  RefreshCw, MessageSquare, GitBranch,
  Lock, Layers,
  Download, Plus
} from 'lucide-react';

// ── Category accent colors (match BaseNode) ───────────────────────────────────
const CAT_COLORS: Record<string, string> = {
  edge:      '#06b6d4',
  gateway:   '#8b5cf6',
  compute:   '#10b981',
  storage:   '#f59e0b',
  messaging: '#ec4899',
  network:   '#6366f1',
};

interface SidebarNode {
  id: string; label: string; type: string;
  Icon: React.ComponentType<{ size?: number; className?: string }>;
  category: string;
}

interface NodeGroup {
  title: string;
  category: string;
  nodes: SidebarNode[];
}

const groups: NodeGroup[] = [
  {
    title: 'Edge / Ingress', category: 'edge',
    nodes: [
      { id: 'client-web',    label: 'Web App',         type: 'client-web',    Icon: Globe,          category: 'edge' },
      { id: 'client-mobile', label: 'Mobile App',      type: 'client-mobile', Icon: Smartphone,     category: 'edge' },
      { id: 'cdn',           label: 'CDN',             type: 'cdn',           Icon: CloudLightning, category: 'edge' },
      { id: 'dns',           label: 'DNS (Route 53)',  type: 'dns',           Icon: MapPin,         category: 'edge' },
    ],
  },
  {
    title: 'Gateways', category: 'gateway',
    nodes: [
      { id: 'api-gateway', label: 'API Gateway', type: 'api-gateway', Icon: Shield,   category: 'gateway' },
      { id: 'alb',         label: 'Load Balancer (ALB)', type: 'alb', Icon: Scale,    category: 'gateway' },
      { id: 'waf',         label: 'WAF / Firewall', type: 'waf',     Icon: Activity, category: 'gateway' },
    ],
  },
  {
    title: 'Compute', category: 'compute',
    nodes: [
      { id: 'microservice',   label: 'Microservice',          type: 'microservice',   Icon: Server,    category: 'compute' },
      { id: 'serverless',     label: 'Serverless (Lambda)',   type: 'serverless',     Icon: Cpu,       category: 'compute' },
      { id: 'kubernetes-pod', label: 'Kubernetes Pod',        type: 'kubernetes-pod', Icon: Container, category: 'compute' },
    ],
  },
  {
    title: 'Storage & Databases', category: 'storage',
    nodes: [
      { id: 'postgresql', label: 'PostgreSQL',   type: 'postgresql', Icon: DbIcon,     category: 'storage' },
      { id: 'mongodb',    label: 'MongoDB',      type: 'mongodb',    Icon: DbIcon,     category: 'storage' },
      { id: 's3',         label: 'S3 Storage',   type: 's3',         Icon: HardDrive,  category: 'storage' },
    ],
  },
  {
    title: 'Caching & Messaging', category: 'messaging',
    nodes: [
      { id: 'redis',    label: 'Redis Cache', type: 'redis',    Icon: RefreshCw,    category: 'messaging' },
      { id: 'kafka',    label: 'Kafka',       type: 'kafka',    Icon: MessageSquare, category: 'messaging' },
      { id: 'rabbitmq', label: 'RabbitMQ',    type: 'rabbitmq', Icon: GitBranch,    category: 'messaging' },
    ],
  },
  {
    title: 'Network / Containers', category: 'network',
    nodes: [
      { id: 'vpc',    label: 'VPC',          type: 'vpc',    Icon: Lock,   category: 'network' },
      { id: 'subnet', label: 'Subnet Group', type: 'subnet', Icon: Layers, category: 'network' },
    ],
  },
];

const Sidebar: React.FC = React.memo(() => {
  const [expanded, setExpanded] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const filtered = groups
    .map(g => ({ ...g, nodes: g.nodes.filter(n => n.label.toLowerCase().includes(search.toLowerCase())) }))
    .filter(g => g.nodes.length > 0);

  const onDragStart = (e: React.DragEvent, type: string) => {
    e.dataTransfer.setData('application/reactflow', type);
    e.dataTransfer.effectAllowed = 'move';
  };

  return (
    <aside className="w-64 flex flex-col h-screen bg-card/70 backdrop-blur-2xl border-r border-border shrink-0 z-50">
      {/* Header */}
      <div className="px-4 pt-5 pb-4 border-b border-white/5">
        <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest mb-3">
          Components
        </div>

        {/* Search */}
        <div className="relative group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-sky-400 transition-colors" />
          <input
            type="text"
            placeholder="Search components..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-white/5 border border-white/10 rounded-lg text-foreground text-xs outline-none transition-all focus:border-sky-500/50 focus:ring-2 focus:ring-sky-500/20"
          />
        </div>
      </div>

      {/* Node groups */}
      <div className="flex-1 overflow-y-auto py-2 custom-scrollbar">
        {filtered.map(group => {
          const color = CAT_COLORS[group.category] ?? '#64748b';
          const isOpen = expanded === group.title || !!search;
          return (
            <div key={group.title}>
              <div
                onClick={() => setExpanded(isOpen && !search ? null : group.title)}
                className="flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors hover:bg-white/5 select-none"
              >
                {/* Category dot */}
                <div 
                  className="w-1.5 h-1.5 rounded-full shrink-0" 
                  style={{ background: color, boxShadow: `0 0 8px ${color}` }} 
                />
                <span className="flex-1 text-xs font-semibold text-muted-foreground">
                  {group.title}
                </span>
                <ChevronDown
                  className={cn("w-3.5 h-3.5 text-muted-foreground transition-transform duration-300", isOpen && "-rotate-180")}
                />
              </div>

              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden pb-1"
                  >
                    {group.nodes.map(node => (
                      <motion.div
                        key={node.id}
                        draggable
                        onDragStart={(e: any) => onDragStart(e, node.type)}
                        whileHover={{ x: 4 }}
                        className="flex items-center gap-3 mx-2.5 my-0.5 px-2.5 py-2 rounded-lg cursor-grab active:cursor-grabbing bg-white/[0.02] border border-white/5 transition-all text-xs font-medium text-muted-foreground group"
                        style={{
                          // Using raw variables for dynamic hover colors
                          '--hover-bg': `${color}15`,
                          '--hover-border': `${color}40`,
                        } as React.CSSProperties}
                        onMouseEnter={e => {
                          e.currentTarget.style.background = e.currentTarget.style.getPropertyValue('--hover-bg');
                          e.currentTarget.style.borderColor = e.currentTarget.style.getPropertyValue('--hover-border');
                          e.currentTarget.style.color = '#f8fafc';
                        }}
                        onMouseLeave={e => {
                          e.currentTarget.style.background = 'rgba(255,255,255,0.02)';
                          e.currentTarget.style.borderColor = 'rgba(255,255,255,0.05)';
                          e.currentTarget.style.color = '#94a3b8';
                        }}
                      >
                        <div 
                          className="w-7 h-7 rounded-md shrink-0 flex items-center justify-center transition-colors"
                          style={{ background: `${color}15`, border: `1px solid ${color}35`, color }}
                        >
                          <node.Icon size={14} />
                        </div>
                        <span className="flex-1 overflow-hidden text-ellipsis whitespace-nowrap">
                          {node.label}
                        </span>
                      </motion.div>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}

        {filtered.length === 0 && (
          <div className="text-center py-8 text-muted-foreground text-xs">
            No components match "{search}"
          </div>
        )}
      </div>

      {/* Footer actions */}
      <div className="p-4 border-t border-white/5 flex flex-col gap-2.5">
        <motion.button
          id="sidebar-ai-generate"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => window.dispatchEvent(new CustomEvent('open-ai-modal'))}
          className="w-full py-2.5 flex items-center justify-center gap-2.5 rounded-xl text-[13px] font-bold text-sky-300 bg-gradient-to-r from-sky-500/10 to-indigo-500/10 border border-sky-500/30 hover:from-sky-500/20 hover:to-indigo-500/20 hover:text-sky-200 transition-colors shadow-[0_0_15px_rgba(14,165,233,0.1)]"
        >
          <Zap size={15} />
          AI Architecture Gen
        </motion.button>

        <motion.button
          id="sidebar-export"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => window.dispatchEvent(new CustomEvent('open-export-modal'))}
          className="w-full py-2.5 flex items-center justify-center gap-2 rounded-xl text-[13px] font-semibold text-muted-foreground bg-white/5 border border-white/10 hover:bg-white/10 hover:text-foreground transition-colors"
        >
          <Download size={14} />
          Export Infrastructure
        </motion.button>
        
        <motion.button
          id="sidebar-custom-node"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => window.dispatchEvent(new CustomEvent('open-custom-node-modal'))}
          className="w-full py-2.5 flex items-center justify-center gap-2 rounded-xl text-[13px] font-semibold text-slate-300 bg-white/5 border border-dashed border-white/20 hover:bg-white/10 hover:border-white/30 transition-colors"
        >
          <Plus size={14} />
          Create Custom Node
        </motion.button>
      </div>
    </aside>
  );
});

export default Sidebar;