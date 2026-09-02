'use client';
import React from 'react';
import { ScanSearch, X } from 'lucide-react';

export default function AnalysisPanel({ analysis, onClose }: { analysis: string; onClose: () => void }) {
  return (
    <div style={{
      position: 'absolute', top: 76, right: 16,
      width: 380, maxHeight: '65vh',
      overflowY: 'auto',
      background: 'rgba(10,17,35,0.95)',
      backdropFilter: 'blur(16px)',
      border: '1px solid rgba(14,165,233,0.2)',
      borderRadius: 14,
      padding: '18px 20px',
      color: '#e2e8f0',
      zIndex: 1001,
      animation: 'slide-down 0.2s ease-out both',
      boxShadow: '0 12px 40px rgba(0,0,0,0.6)',
    }}>
      <style>{`
        @keyframes slide-down { from { opacity: 0; transform: translateY(-8px) } to { opacity: 1; transform: translateY(0) } }
      `}</style>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <ScanSearch size={16} color="#10b981" />
          <span style={{ fontWeight: 700, fontSize: 14, color: '#f1f5f9' }}>Architecture Audit</span>
        </div>
        <button
          onClick={onClose}
          style={{ color: '#475569', cursor: 'pointer', padding: 4 }}
          onMouseEnter={e => e.currentTarget.style.color = '#94a3b8'}
          onMouseLeave={e => e.currentTarget.style.color = '#475569'}
        >
          <X size={14} />
        </button>
      </div>
      <pre style={{
        whiteSpace: 'pre-wrap', fontSize: 12, lineHeight: 1.7,
        color: '#94a3b8', fontFamily: 'inherit',
      }}>
        {analysis}
      </pre>
    </div>
  );
}
