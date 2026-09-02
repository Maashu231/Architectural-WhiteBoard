'use client';
import React from 'react';
import { Handle, Position } from 'reactflow';
import { motion } from 'framer-motion';
import {
  Globe, Smartphone, Zap, MapPin, Shield, Scale, Cpu,
  Container, Database, HardDrive, RefreshCw, MessageSquare,
  GitBranch, Lock, Layers, Box, Server, Activity,
} from 'lucide-react';
import { cn } from '@/app/lib/utils';

// ── Category config ───────────────────────────────────────────────────────────
interface CategoryConfig {
  color: string;
  glow: string;
  bg: string;
  label: string;
}

const CATEGORY: Record<string, CategoryConfig> = {
  edge:      { color: '#06b6d4', glow: 'rgba(6,182,212,0.4)',  bg: 'rgba(6,182,212,0.15)',  label: 'Edge' },
  gateway:   { color: '#8b5cf6', glow: 'rgba(139,92,246,0.4)', bg: 'rgba(139,92,246,0.15)', label: 'Gateway' },
  compute:   { color: '#10b981', glow: 'rgba(16,185,129,0.4)', bg: 'rgba(16,185,129,0.15)', label: 'Compute' },
  storage:   { color: '#f59e0b', glow: 'rgba(245,158,11,0.4)', bg: 'rgba(245,158,11,0.15)', label: 'Storage' },
  messaging: { color: '#ec4899', glow: 'rgba(236,72,153,0.4)', bg: 'rgba(236,72,153,0.15)', label: 'Messaging' },
  network:   { color: '#6366f1', glow: 'rgba(99,102,241,0.4)', bg: 'rgba(99,102,241,0.15)', label: 'Network' },
  default:   { color: '#94a3b8', glow: 'rgba(148,163,184,0.3)', bg: 'rgba(148,163,184,0.1)', label: 'Service' },
};

function getCategory(type: string): CategoryConfig {
  const map: Record<string, string> = {
    'client-web':     'edge',
    'client-mobile':  'edge',
    'cdn':            'edge',
    'dns':            'edge',
    'api-gateway':    'gateway',
    'alb':            'gateway',
    'waf':            'gateway',
    'microservice':   'compute',
    'serverless':     'compute',
    'kubernetes-pod': 'compute',
    'postgresql':     'storage',
    'mongodb':        'storage',
    's3':             'storage',
    'redis':          'messaging',
    'kafka':          'messaging',
    'rabbitmq':       'messaging',
    'vpc':            'network',
    'subnet':         'network',
  };
  return CATEGORY[map[type] || 'default'] ?? CATEGORY.default;
}

// ── Icon map ──────────────────────────────────────────────────────────────────
function getIcon(type: string, size = 18): React.ReactElement {
  const icons: Record<string, React.ReactElement> = {
    'client-web':     <Globe size={size} />,
    'client-mobile':  <Smartphone size={size} />,
    'cdn':            <Zap size={size} />,
    'dns':            <MapPin size={size} />,
    'api-gateway':    <Shield size={size} />,
    'alb':            <Scale size={size} />,
    'waf':            <Activity size={size} />,
    'microservice':   <Server size={size} />,
    'serverless':     <Cpu size={size} />,
    'kubernetes-pod': <Container size={size} />,
    'postgresql':     <Database size={size} />,
    'mongodb':        <Database size={size} />,
    's3':             <HardDrive size={size} />,
    'redis':          <RefreshCw size={size} />,
    'kafka':          <MessageSquare size={size} />,
    'rabbitmq':       <GitBranch size={size} />,
    'vpc':            <Lock size={size} />,
    'subnet':         <Layers size={size} />,
  };
  return icons[type] ?? <Box size={size} />;
}

// ── Short type labels ─────────────────────────────────────────────────────────
function getTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    'client-web':     'Web Client',
    'client-mobile':  'Mobile Client',
    'cdn':            'CDN',
    'dns':            'DNS',
    'api-gateway':    'API Gateway',
    'alb':            'Load Balancer',
    'waf':            'WAF / Firewall',
    'microservice':   'Microservice',
    'serverless':     'Serverless Fn',
    'kubernetes-pod': 'K8s Pod',
    'postgresql':     'PostgreSQL',
    'mongodb':        'MongoDB',
    's3':             'S3 Storage',
    'redis':          'Redis Cache',
    'kafka':          'Kafka',
    'rabbitmq':       'RabbitMQ',
    'vpc':            'VPC',
    'subnet':         'Subnet',
  };
  return labels[type] ?? type;
}

// ── Status ────────────────────────────────────────────────────────────────────
const STATUS_COLOR = {
  healthy: '#22c55e',
  warning: '#eab308',
  error:   '#ef4444',
} as const;

// ── Component ─────────────────────────────────────────────────────────────────
interface BaseNodeData {
  label: string;
  subtext?: string;
  status?: 'healthy' | 'warning' | 'error';
}

interface NodeProps {
  data: BaseNodeData;
  type: string;
  selected?: boolean;
}

const BaseNode: React.FC<NodeProps> = ({ data, type, selected }) => {
  const cat      = getCategory(type);
  const status   = data.status ?? 'healthy';
  const statusClr = STATUS_COLOR[status];

  const handleStyle: React.CSSProperties = {
    width: 12,
    height: 12,
    background: cat.color,
    border: `2px solid hsl(var(--background))`,
    borderRadius: '50%',
    transition: 'all 0.2s',
    opacity: selected ? 1 : 0,
    transform: selected ? 'scale(1.2)' : 'scale(1)',
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      whileHover={{ scale: 1.02 }}
      transition={{ type: "spring", stiffness: 350, damping: 25 }}
      className={cn(
        "relative min-w-[220px] rounded-2xl p-4 cursor-default transition-all duration-300",
        "bg-card/80 backdrop-blur-xl border border-white/5",
        "shadow-lg",
        selected && "ring-1 ring-offset-2 ring-offset-background"
      )}
      style={{
        boxShadow: selected ? `0 0 24px ${cat.glow}, 0 8px 32px rgba(0,0,0,0.6)` : '0 4px 16px rgba(0,0,0,0.4)',
        borderColor: selected ? cat.color : 'rgba(255,255,255,0.08)',
        ...(selected && { ringColor: cat.color })
      }}
    >
      {/* Left Accent Glow Bar */}
      <div 
        className={cn(
          "absolute left-0 top-[20%] bottom-[20%] w-[3px] rounded-r-md transition-all duration-300",
          selected ? "opacity-100" : "opacity-40"
        )}
        style={{
          background: cat.color,
          boxShadow: `0 0 12px ${cat.glow}`,
        }}
      />

      {/* Handles */}
      <div className={cn("transition-opacity duration-200", selected ? "opacity-100" : "opacity-0 hover:opacity-100")}>
        <Handle type="target" position={Position.Top}    style={{ ...handleStyle, top: -6 }} />
        <Handle type="source" position={Position.Right}  style={{ ...handleStyle, right: -6 }} />
        <Handle type="source" position={Position.Bottom} style={{ ...handleStyle, bottom: -6 }} />
        <Handle type="target" position={Position.Left}   style={{ ...handleStyle, left: -6 }} />
      </div>

      {/* Content Layout */}
      <div className="flex items-start gap-3">
        {/* Icon Badge */}
        <div 
          className={cn(
            "flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center transition-transform duration-300",
            selected ? "scale-110" : "scale-100"
          )}
          style={{
            background: cat.bg,
            border: `1px solid ${cat.color}40`,
            color: cat.color,
            boxShadow: selected ? `0 0 16px ${cat.glow}` : 'none',
          }}
        >
          {getIcon(type, 20)}
        </div>

        {/* Text Container */}
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-[14px] text-foreground leading-snug mb-[2px] truncate">
            {data.label}
          </div>
          {data.subtext ? (
            <div className="text-[12px] text-muted-foreground leading-snug truncate">
              {data.subtext}
            </div>
          ) : (
            <div 
              className="text-[10px] font-bold uppercase tracking-wider opacity-80"
              style={{ color: cat.color }}
            >
              {getTypeLabel(type)}
            </div>
          )}
        </div>

        {/* Status Indicator */}
        <div 
          className="flex-shrink-0 w-2 h-2 rounded-full mt-1.5 transition-all duration-300"
          style={{
            background: statusClr,
            boxShadow: `0 0 8px ${statusClr}`,
          }} 
        />
      </div>

      {/* Floating Category Chip (Only visible when selected) */}
      <motion.div 
        initial={{ opacity: 0, y: 5 }}
        animate={{ opacity: selected ? 1 : 0, y: selected ? 0 : 5 }}
        transition={{ duration: 0.2 }}
        className="absolute -bottom-3 left-1/2 -translate-x-1/2 px-2.5 py-0.5 rounded-full text-[9px] font-bold tracking-widest uppercase pointer-events-none"
        style={{
          background: cat.bg,
          border: `1px solid ${cat.color}50`,
          color: cat.color,
          backdropFilter: 'blur(8px)',
        }}
      >
        {cat.label}
      </motion.div>
    </motion.div>
  );
};

export default BaseNode;