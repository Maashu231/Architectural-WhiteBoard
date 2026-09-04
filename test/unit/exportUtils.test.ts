import { describe, it, expect } from 'vitest';
import { generateMermaidDiagram } from '@/app/lib/exportUtils';

describe('exportUtils - Mermaid Generation', () => {
    it('returns placeholder for empty node list', () => {
        const result = generateMermaidDiagram([], []);
        expect(result).toContain('Empty Diagram');
    });

    it('correctly builds valid Mermaid diagram syntax from nodes and edges', () => {
        const nodes = [
            { id: 'web', data: { label: 'Web Server' } },
            { id: 'db', data: { label: 'PostgreSQL Database' } },
        ];

        const edges = [
            { id: 'e1', source: 'web', target: 'db', data: { protocol: 'TCP:5432' } },
        ];

        const mermaid = generateMermaidDiagram(nodes, edges);

        expect(mermaid).toContain('graph TD;');
        expect(mermaid).toContain('web["Web Server"]');
        expect(mermaid).toContain('db["PostgreSQL Database"]');
        expect(mermaid).toContain('web -->|TCP:5432| db');
    });
});