import React from 'react';
import {
  Globe, Smartphone, Zap, MapPin, Shield,
  Scale, UserCheck, Cpu, Container,
  Database, HardDrive,
  RefreshCw, MessageSquare, GitBranch,
  Lock, Layers, Box
} from 'lucide-react';

interface NodeIconProps {
  type: string;
  size?: number;
  className?: string;
}

const iconMap: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  // Edge / Ingress
  'client-web': Globe,
  'client-mobile': Smartphone,
  'cdn': Zap,
  'dns': MapPin,
  // Gateways
  'api-gateway': Shield,
  'alb': Scale,
  'waf': UserCheck,
  // Compute
  'microservice': Cpu,
  'serverless': Cpu,
  'kubernetes-pod': Container,
  // Storage & Databases
  'postgresql': Database,
  'mongodb': Database,
  's3': HardDrive,
  // Caching & Messaging
  'redis': RefreshCw,
  'kafka': MessageSquare,
  'rabbitmq': GitBranch,
  // Scope / Containers
  'vpc': Lock,
  'subnet': Layers,
  // Default
  'default': Box,
};

export const NodeIcon: React.FC<NodeIconProps> = ({ type, size = 16, className = '' }) => {
  const Icon = iconMap[type] || iconMap['default'];
  return <Icon size={size} className={className} />;
};

export const getNodeCategory = (type: string): string => {
  const categories: Record<string, string> = {
    'client-web': 'edge',
    'client-mobile': 'edge',
    'cdn': 'edge',
    'dns': 'edge',
    'api-gateway': 'gateway',
    'alb': 'gateway',
    'waf': 'gateway',
    'microservice': 'compute',
    'serverless': 'compute',
    'kubernetes-pod': 'compute',
    'postgresql': 'storage',
    'mongodb': 'storage',
    's3': 'storage',
    'redis': 'messaging',
    'kafka': 'messaging',
    'rabbitmq': 'messaging',
    'vpc': 'network',
    'subnet': 'network',
  };
  return categories[type] || 'default';
};

export const getCategoryColor = (category: string): string => {
  const colors: Record<string, string> = {
    'edge': '#06b6d4',       // Cyan
    'gateway': '#8b5cf6',    // Violet
    'compute': '#10b981',    // Emerald
    'storage': '#f59e0b',    // Amber
    'messaging': '#ec4899',  // Pink
    'network': '#6366f1',    // Indigo
    'default': '#64748b',    // Slate
  };
  return colors[category] || colors['default'];
};

export const getNodeDisplayName = (type: string): string => {
  const names: Record<string, string> = {
    'client-web': 'Web Client',
    'client-mobile': 'Mobile Client',
    'cdn': 'CDN',
    'dns': 'DNS',
    'api-gateway': 'API Gateway',
    'alb': 'Load Balancer',
    'waf': 'WAF',
    'microservice': 'Microservice',
    'serverless': 'Serverless Function',
    'kubernetes-pod': 'K8s Pod',
    'postgresql': 'PostgreSQL',
    'mongodb': 'MongoDB',
    's3': 'S3 Storage',
    'redis': 'Redis Cache',
    'kafka': 'Kafka',
    'rabbitmq': 'RabbitMQ',
    'vpc': 'VPC',
    'subnet': 'Subnet Group',
  };
  return names[type] || type;
};