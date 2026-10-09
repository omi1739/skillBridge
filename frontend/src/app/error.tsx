'use client';

import { AlertTriangle, RotateCcw } from 'lucide-react';

/**
 * Global error boundary for every route under the app. Anything thrown while
 * rendering lands here instead of a blank white screen.
 *
 * Deliberately dependency-free — no context, no data hooks — because it also
 * has to work when the failure came from the providers that wrap the rest of
 * the tree.
 */
export default function ErrorBoundary({
  error,
  reset
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        padding: '2rem',
        background: 'var(--bg-primary)',
        color: 'var(--text-primary)'
      }}
    >
      <div className="stack stack-lg" style={{ maxWidth: '32rem', textAlign: 'center' }}>
        <AlertTriangle size={40} style={{ margin: '0 auto', color: 'var(--danger)' }} />
        <h1 style={{ fontSize: '1.4rem', fontWeight: 700 }}>Something went wrong</h1>
        <p style={{ color: 'var(--text-secondary)' }}>
          This page failed to render. Your data is safe — try again, or head back to the start.
        </p>
        {error?.digest ? (
          <p className="mono" style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
            Error reference: {error.digest}
          </p>
        ) : null}
        <div className="row" style={{ justifyContent: 'center', gap: '0.75rem' }}>
          <button className="btn btn-primary" onClick={reset}>
            <RotateCcw size={14} /> Try again
          </button>
          <a className="btn btn-secondary" href="/">
            Back to home
          </a>
        </div>
      </div>
    </main>
  );
}
