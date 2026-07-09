import React from 'react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('PG wala — Uncaught render error:', error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          padding: '40px 24px',
          textAlign: 'center',
          fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
          backgroundColor: 'var(--colors-canvas-parchment)',
          color: 'var(--colors-ink)'
        }}>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            backgroundColor: '#fee2e2',
            color: '#ff3b30',
            fontSize: '28px', 
            marginBottom: '24px' 
          }}>
            ⚠️
          </div>
          <h1 style={{ 
            fontFamily: "'Inter', sans-serif",
            fontSize: '24px', 
            fontWeight: 700, 
            letterSpacing: '-0.5px',
            color: 'var(--colors-ink)', 
            marginBottom: '12px' 
          }}>
            Something went wrong
          </h1>
          <p style={{ 
            fontSize: '15px', 
            color: 'var(--colors-muted)', 
            maxWidth: '380px', 
            lineHeight: 1.47, 
            marginBottom: '32px' 
          }}>
            We hit an unexpected error. Our system has logged the incident and our team is looking into it. Please try reloading the page.
          </p>
          <button
            onClick={this.handleReload}
            style={{
              backgroundColor: 'transparent',
              color: 'var(--colors-ink)',
              border: '1px solid var(--colors-hairline)',
              borderRadius: 'var(--rounded-sm)',
              padding: '11px 32px',
              fontSize: '14px',
              fontWeight: 400,
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              cursor: 'pointer',
              boxShadow: 'none',
              transition: 'transform 0.15s ease, border-color 0.2s ease'
            }}
            onMouseOver={(e) => {
              e.target.style.borderColor = 'var(--colors-ink)';
            }}
            onMouseOut={(e) => {
              e.target.style.borderColor = 'var(--colors-hairline)';
            }}
            onMouseDown={(e) => {
              e.target.style.transform = 'scale(0.97)';
            }}
            onMouseUp={(e) => {
              e.target.style.transform = 'none';
            }}
          >
            Reload Page
          </button>
          
          <details style={{ marginTop: '32px', textAlign: 'left', maxWidth: '500px', width: '100%', backgroundColor: 'var(--colors-surface-soft)', padding: '16px', borderRadius: '4px', border: '1px solid var(--colors-hairline)', fontSize: '12px', color: 'var(--colors-muted)', overflowX: 'auto', fontFamily: 'monospace' }}>
            <summary style={{ cursor: 'pointer', fontWeight: 700, marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Error Details (Developer info)</summary>
            <div style={{ fontWeight: 700, color: 'var(--colors-ink)', marginBottom: '4px' }}>{this.state.error?.toString()}</div>
            <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-all', lineHeight: 1.4 }}>{this.state.error?.stack}</pre>
          </details>
        </div>
      );
    }

    return this.props.children;
  }
}
