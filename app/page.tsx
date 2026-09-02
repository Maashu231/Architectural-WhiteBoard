'use client';

import React, { Suspense } from 'react';
import { ReactFlowProvider } from 'reactflow';
import 'reactflow/dist/style.css';
import ErrorBoundary from './components/ErrorBoundary';
import Canvas from './components/Canvas';

export default function Home() {
  return (
    <ErrorBoundary>
      <Suspense fallback={
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100vw', height: '100vh', background: '#070d1a', color: '#64748b', fontFamily: 'Inter, sans-serif', fontSize: 14 }}>
          Loading Canvas...
        </div>
      }>
        <ReactFlowProvider>
          <Canvas />
        </ReactFlowProvider>
      </Suspense>
    </ErrorBoundary>
  );
}