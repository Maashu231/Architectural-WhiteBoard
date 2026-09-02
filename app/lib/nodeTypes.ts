import BaseNode from '@/components/nodes/BaseNode';
import CustomAnimatedEdge from '@/components/edges/CustomAnimatedEdge';

// In Next.js with Turbopack, HMR can sometimes cause even separate module exports
// to be recreated, tripping React Flow's strict identity checks.
// We cache it on globalThis to guarantee the reference is completely immutable across reloads.
const globalNodeTypes = (globalThis as any).__nodeTypes || {
  base: BaseNode,
  // All node types map to BaseNode for now
  'client-web': BaseNode,
  'client-mobile': BaseNode,
  cdn: BaseNode,
  dns: BaseNode,
  'api-gateway': BaseNode,
  alb: BaseNode,
  waf: BaseNode,
  microservice: BaseNode,
  serverless: BaseNode,
  'kubernetes-pod': BaseNode,
  postgresql: BaseNode,
  mongodb: BaseNode,
  s3: BaseNode,
  redis: BaseNode,
  kafka: BaseNode,
  rabbitmq: BaseNode,
  vpc: BaseNode,
  subnet: BaseNode,
};

if (process.env.NODE_ENV !== 'production') {
    (globalThis as any).__nodeTypes = globalNodeTypes;
}

export const nodeTypes = globalNodeTypes;

const globalEdgeTypes = (globalThis as any).__edgeTypes || {
  animated: CustomAnimatedEdge,
  default: CustomAnimatedEdge,
};

if (process.env.NODE_ENV !== 'production') {
    (globalThis as any).__edgeTypes = globalEdgeTypes;
}

export const edgeTypes = globalEdgeTypes;