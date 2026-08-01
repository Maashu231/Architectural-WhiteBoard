export default function Sidebar() {
    const onDragStart = (event: React.DragEvent, nodeType: string) => {
        event.dataTransfer.setData('application/reactflow', nodeType);
        event.dataTransfer.effectAllowed = 'move';
    };

    return (
        <aside style={{
            width: 200,
            padding: 16,
            borderRight: '1px solid #333',
            background: '#111',
            color: '#eee',
        }}>
            <p style={{ marginBottom: 12, fontSize: 13, opacity: 0.7 }}>
                Drag a component onto the canvas
            </p>

            <div
                draggable
                onDragStart={(e) => onDragStart(e, 'default')}
                style={sidebarItemStyle}
            >
                🖥️ Web Server
            </div>

            <div
                draggable
                onDragStart={(e) => onDragStart(e, 'database')}
                style={sidebarItemStyle}
            >
                🛢️ Database
            </div>
        </aside>
    );
}

const sidebarItemStyle: React.CSSProperties = {
    padding: '10px 12px',
    marginBottom: 8,
    border: '1px solid #555',
    borderRadius: 6,
    cursor: 'grab',
    fontSize: 13,
};