'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          width: '100vw', height: '100vh', background: '#0f172a', color: '#f8fafc',
          fontFamily: 'Inter, sans-serif'
        }}>
          <AlertTriangle size={48} color="#ef4444" style={{ marginBottom: 16 }} />
          <h1 style={{ fontSize: 24, marginBottom: 8 }}>Something went wrong</h1>
          <p style={{ color: '#94a3b8', marginBottom: 24 }}>The application encountered an unexpected error.</p>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: '10px 20px', background: '#3b82f6', color: '#fff',
              border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 14, fontWeight: 500
            }}
          >
            Reload application
          </button>
          
          {process.env.NODE_ENV === 'development' && this.state.error && (
            <pre style={{
              marginTop: 32, padding: 16, background: '#1e293b', borderRadius: 8,
              maxWidth: '80%', overflow: 'auto', fontSize: 12, color: '#fca5a5'
            }}>
              {this.state.error.toString()}
            </pre>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
