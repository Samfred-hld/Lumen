// ══════════════════════════════════════════
// LÚMEN — Global Error Boundary
// ══════════════════════════════════════════

import React from 'react';
import MsIcon from '@/components/ui/ms-icon';

window.addEventListener('error', (event) => {
  const payload = {
    component: 'window.onerror',
    message: event.message || event.error?.message || 'Unknown error',
    stack: event.error?.stack || '',
    timestamp: new Date().toISOString(),
    url: window.location.href,
    userAgent: navigator.userAgent,
    source: event.filename || '',
    line: event.lineno || 0,
    col: event.colno || 0,
  };
  console.error('[CRASH]', JSON.stringify(payload));
});

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    const crashPayload = {
      component: errorInfo?.componentStack?.split('\n')?.[0]?.trim() || 'Unknown',
      message: error?.message || 'Unknown error',
      stack: error?.stack || '',
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
    };
    console.error('[CRASH]', JSON.stringify(crashPayload));
    console.error('[CRASH]', error?.message, errorInfo?.componentStack?.split('\n')?.slice(0, 3)?.join(' → '));
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="fixed inset-0 flex items-center justify-center bg-background p-4">
          <div className="text-center max-w-md">
            <MsIcon name="error" size={48} className="text-muted-foreground mb-4" />
            <h1 className="text-xl font-semibold mb-2">Algo deu errado</h1>
            <p className="text-muted-foreground text-sm mb-4">
              Ocorreu um erro inesperado. Tente recarregar a página.
            </p>
            {this.state.error && (
              <pre className="text-xs text-red-500 bg-red-50 rounded p-3 mb-4 overflow-auto max-h-32 text-left">
                {this.state.error.message}
              </pre>
            )}
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:opacity-90 transition-opacity"
            >
              Recarregar Página
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
