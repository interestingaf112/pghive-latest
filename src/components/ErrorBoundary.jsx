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
          fontFamily: "'Open Sans', sans-serif",
          backgroundColor: '#ffffff'
        }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>⚠️</div>
          <h1 style={{ fontSize: '22px', fontWeight: 600, color: '#222222', marginBottom: '8px' }}>
            Something went wrong
          </h1>
          <p style={{ fontSize: '15px', color: '#6a6a6a', maxWidth: '400px', lineHeight: 1.5, marginBottom: '24px' }}>
            We hit an unexpected error. Please try reloading the page. If the problem persists, clear your browser cache or contact support.
          </p>
          <button
            onClick={this.handleReload}
            style={{
              backgroundColor: '#1a73e8',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              padding: '12px 28px',
              fontSize: '16px',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'background-color 0.2s ease'
            }}
            onMouseOver={(e) => e.target.style.backgroundColor = '#1565d8'}
            onMouseOut={(e) => e.target.style.backgroundColor = '#1a73e8'}
          >
            Reload Page
          </button>
          {this.state.error && (
            <details style={{ marginTop: '32px', fontSize: '12px', color: '#999', maxWidth: '600px', textAlign: 'left' }}>
              <summary style={{ cursor: 'pointer', marginBottom: '8px' }}>Technical details</summary>
              <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all', background: '#f7f7f7', padding: '12px', borderRadius: '8px' }}>
                {this.state.error.toString()}
              </pre>
            </details>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}
