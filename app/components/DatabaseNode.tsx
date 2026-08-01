import { Handle, Position } from 'reactflow';

export default function Database({ data }: { data: { label: string } }) {
    return (
        <div style={{
            padding: '10px 20px',
            borderRadius: '50% / 15%',
            background: '#e0f2fe',
            border: '2px solid #0284c7',
            textAlign: 'center',
            fontSize: 12,
            fontWeight: 600,
            color: '#0c4a6e',
        }}>
            <Handle type="target" position={Position.Left} />
            {data.label}
            <Handle type="source" position={Position.Right} />
        </div>
    );
}