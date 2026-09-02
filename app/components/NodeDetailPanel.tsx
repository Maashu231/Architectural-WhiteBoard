import React, { useState } from 'react';
import { X, Edit3, Trash2, Copy, Check } from 'lucide-react';

interface NodeData {
  label: string;
  subtext?: string;
  status?: 'healthy' | 'warning' | 'error';
  [key: string]: any;
}

interface NodeDetailPanelProps {
  node: {
    id: string;
    type: string | undefined;
    position: { x: number; y: number };
    data: NodeData;
  } | null;
  onClose: () => void;
  onUpdate: (nodeId: string, newData: Partial<NodeData>) => void;
  onDelete: (nodeId: string) => void;
  onDuplicate: (nodeId: string) => void;
}

export const NodeDetailPanel: React.FC<NodeDetailPanelProps> = ({
  node,
  onClose,
  onUpdate,
  onDelete,
  onDuplicate,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<Partial<NodeData>>({});

  if (!node) return null;

  const handleEdit = () => {
    setIsEditing(true);
    setEditData({ ...node.data });
  };

  const handleSave = () => {
    onUpdate(node.id, editData);
    setIsEditing(false);
  };

  const statusOptions = ['healthy', 'warning', 'error'] as const;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 3000,
      backdropFilter: 'blur(4px)',
    }}>
      <div style={{
        background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.95) 0%, rgba(30, 41, 59, 0.95) 100%)',
        backdropFilter: 'blur(15px)',
        borderRadius: '16px',
        border: '1px solid rgba(14, 165, 233, 0.3)',
        width: '100%',
        maxWidth: '520px',
        maxHeight: '85vh',
        overflow: 'auto',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 40px rgba(14, 165, 233, 0.15)',
        animation: 'slideUp 0.2s ease-out',
      }}>
        <style>{`
          @keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
          @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        `}</style>

        {/* Header */}
        <div style={{
          padding: '20px 24px',
          borderBottom: '1px solid rgba(14, 165, 233, 0.2)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <h2 style={{ color: '#f8fafc', fontSize: 18, fontWeight: 700 }}>
            Node Details
          </h2>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {isEditing && (
              <button
                onClick={handleSave}
                style={{
                  padding: '6px 12px',
                  background: 'rgba(16, 185, 129, 0.2)',
                  border: '1px solid #10b981',
                  borderRadius: '6px',
                  color: '#4ade80',
                  cursor: 'pointer',
                  fontSize: 12,
                }}
              >
                <Check size={14} />
              </button>
            )}
            {!isEditing && (
              <button
                onClick={handleEdit}
                style={{
                  padding: '6px 12px',
                  background: 'rgba(14, 165, 233, 0.15)',
                  border: '1px solid rgba(14, 165, 233, 0.4)',
                  borderRadius: '6px',
                  color: '#0ea5e9',
                  cursor: 'pointer',
                  fontSize: 12,
                }}
              >
                <Edit3 size={14} />
              </button>
            )}
            <button
              onClick={() => onDuplicate(node.id)}
              style={{
                padding: '6px 12px',
                background: 'rgba(14, 165, 233, 0.15)',
                border: '1px solid rgba(14, 165, 233, 0.4)',
                borderRadius: '6px',
                color: '#94a3b8',
                cursor: 'pointer',
                fontSize: 12,
              }}
              title="Duplicate"
            >
              <Copy size={14} />
            </button>
            <button
              onClick={() => onDelete(node.id)}
              style={{
                padding: '6px 12px',
                background: 'rgba(239, 68, 68, 0.2)',
                border: '1px solid #ef4444',
                borderRadius: '6px',
                color: '#ef4444',
                cursor: 'pointer',
                fontSize: 12,
              }}
              title="Delete"
            >
              <Trash2 size={14} />
            </button>
            <div style={{ width: 1, height: 24, background: 'rgba(14, 165, 233, 0.2)', margin: '0 8px' }} />
            <button
              onClick={onClose}
              style={{
                padding: '6px 12px',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '6px',
                color: '#94a3b8',
                cursor: 'pointer',
                fontSize: 12,
              }}
              title="Close"
            >
              <X size={14} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Node Type */}
          <div>
            <label style={{ color: '#94a3b8', fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 6 }}>
              Node Type
            </label>
            <div style={{
              padding: '10px 14px',
              background: 'rgba(30, 41, 59, 0.6)',
              border: '1px solid rgba(14, 165, 233, 0.2)',
              borderRadius: '8px',
              color: '#0ea5e9',
              fontSize: 14,
              fontWeight: 600,
              textTransform: 'capitalize',
            }}>
              {node.type ? node.type.replace('-', ' ') : 'default'}
            </div>
          </div>

          {/* Label */}
          <div>
            <label style={{ color: '#94a3b8', fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 6 }}>
              Label
            </label>
            {isEditing ? (
              <input
                type="text"
                value={editData.label || node.data.label}
                onChange={(e) => setEditData({ ...editData, label: e.target.value })}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  background: 'rgba(2, 6, 23, 0.5)',
                  border: '1px solid rgba(14, 165, 233, 0.3)',
                  borderRadius: '8px',
                  color: '#f8fafc',
                  fontSize: 14,
                  outline: 'none',
                }}
              />
            ) : (
              <div style={{
                padding: '10px 14px',
                background: 'rgba(2, 6, 23, 0.3)',
                border: '1px solid rgba(14, 165, 233, 0.15)',
                borderRadius: '8px',
                color: '#e2e8f0',
                fontSize: 14,
              }}>
                {node.data.label}
              </div>
            )}
          </div>

          {/* Status */}
          <div>
            <label style={{ color: '#94a3b8', fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 6 }}>
              Status
            </label>
            {isEditing ? (
              <select
                value={editData.status || node.data.status || 'healthy'}
                onChange={(e) => setEditData({ ...editData, status: e.target.value as any })}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  background: 'rgba(2, 6, 23, 0.5)',
                  border: '1px solid rgba(14, 165, 233, 0.3)',
                  borderRadius: '8px',
                  color: '#f8fafc',
                  fontSize: 14,
                  outline: 'none',
                }}
              >
                {statusOptions.map(s => (
                  <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                ))}
              </select>
            ) : (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '10px 14px',
                background: 'rgba(2, 6, 23, 0.3)',
                border: '1px solid rgba(14, 165, 233, 0.15)',
                borderRadius: '8px',
              }}>
                <div style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: node.data.status === 'warning' ? '#ffcc00' : node.data.status === 'error' ? '#ff4d4d' : '#00ff66',
                  boxShadow: `0 0 8px ${node.data.status === 'warning' ? '#ffcc00' : node.data.status === 'error' ? '#ff4d4d' : '#00ff66'}`,
                }} />
                <span style={{ color: '#e2e8f0', fontSize: 14, textTransform: 'capitalize' }}>
                  {node.data.status || 'healthy'}
                </span>
              </div>
            )}
          </div>

          {/* Subtext */}
          {node.data.subtext && (
            <div>
              <label style={{ color: '#94a3b8', fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 6 }}>
                Subtext
              </label>
              <div style={{
                padding: '10px 14px',
                background: 'rgba(2, 6, 23, 0.3)',
                border: '1px solid rgba(14, 165, 233, 0.15)',
                borderRadius: '8px',
                color: '#94a3b8',
                fontSize: 13,
              }}>
                {node.data.subtext}
              </div>
            </div>
          )}

          {/* Position */}
          <div>
            <label style={{ color: '#94a3b8', fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 6 }}>
              Position
            </label>
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 8,
            }}>
              <div>
                <label style={{ color: '#64748b', fontSize: 11, display: 'block', marginBottom: 2 }}>X</label>
                <div style={{
                  padding: '8px 12px',
                  background: 'rgba(2, 6, 23, 0.3)',
                  border: '1px solid rgba(14, 165, 233, 0.15)',
                  borderRadius: '6px',
                  color: '#94a3b8',
                  fontSize: 13,
                }}>{Math.round(node.position.x)}</div>
              </div>
              <div>
                <label style={{ color: '#64748b', fontSize: 11, display: 'block', marginBottom: 2 }}>Y</label>
                <div style={{
                  padding: '8px 12px',
                  background: 'rgba(2, 6, 23, 0.3)',
                  border: '1px solid rgba(14, 165, 233, 0.15)',
                  borderRadius: '6px',
                  color: '#94a3b8',
                  fontSize: 13,
                }}>{Math.round(node.position.y)}</div>
              </div>
            </div>
          </div>

          {/* Node ID */}
          <div>
            <label style={{ color: '#94a3b8', fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 6 }}>
              Node ID
            </label>
            <code style={{
              padding: '8px 12px',
              background: 'rgba(0, 0, 0, 0.3)',
              border: '1px solid rgba(14, 165, 233, 0.15)',
              borderRadius: '6px',
              color: '#0ea5e9',
              fontSize: 12,
              fontFamily: 'monospace',
              display: 'block',
              wordBreak: 'break-all',
            }}>{node.id}</code>
          </div>

          {/* Custom Properties (if any) */}
          {Object.keys(node.data).filter(k => !['label', 'subtext', 'status'].includes(k)).length > 0 && (
            <div>
              <label style={{ color: '#94a3b8', fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 8 }}>
                Custom Properties
              </label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {Object.entries(node.data)
                  .filter(([k]) => !['label', 'subtext', 'status'].includes(k))
                  .map(([key, value]) => (
                    <div key={key} style={{
                      padding: '8px 12px',
                      background: 'rgba(0, 0, 0, 0.2)',
                      border: '1px solid rgba(14, 165, 233, 0.1)',
                      borderRadius: '6px',
                    }}>
                      <code style={{ color: '#0ea5e9', fontSize: 11, fontWeight: 600 }}>{key}:</code>
                      <span style={{ color: '#94a3b8', fontSize: 12, marginLeft: 6 }}>
                        {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                      </span>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default NodeDetailPanel;