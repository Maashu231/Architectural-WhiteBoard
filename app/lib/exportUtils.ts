export interface DiagramNode {
    id: string;
    data?: {
        label?: string;
    };
}

export interface DiagramEdge {
    id?: string;
    source: string;
    target: string;
    data?: {
        protocol?: string;
    };
}

/**
 * Converts React Flow nodes and edges into a clean Mermaid.js syntax string.
 */
export function generateMermaidDiagram(nodes: DiagramNode[], edges: DiagramEdge[]): string {
    if (!nodes || nodes.length === 0) return 'graph TD;\n  Empty["Empty Diagram"]';

    const lines: string[] = ['graph TD;'];

    // Add node definitions
    nodes.forEach((node) => {
        const label = node.data?.label || node.id;
        lines.push(`  ${node.id}["${label}"]`);
    });

    // Add edge connections
    edges.forEach((edge) => {
        const protocol = edge.data?.protocol ? `|${edge.data.protocol}|` : '';
        lines.push(`  ${edge.source} -->${protocol} ${edge.target}`);
    });

    return lines.join('\n');
}