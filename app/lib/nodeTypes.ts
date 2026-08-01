import DatabaseNode from '../components/DatabaseNode';

// In Next.js with Turbopack, HMR can sometimes cause even separate module exports 
// to be recreated, tripping React Flow's strict identity checks.
// We cache it on globalThis to guarantee the reference is completely immutable across reloads.
const globalNodeTypes = (globalThis as any).__nodeTypes || { database: DatabaseNode };

if (process.env.NODE_ENV !== 'production') {
    (globalThis as any).__nodeTypes = globalNodeTypes;
}

export const nodeTypes = globalNodeTypes;

const globalEdgeTypes = (globalThis as any).__edgeTypes || {};

if (process.env.NODE_ENV !== 'production') {
    (globalThis as any).__edgeTypes = globalEdgeTypes;
}

export const edgeTypes = globalEdgeTypes;
