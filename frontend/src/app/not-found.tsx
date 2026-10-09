import Link from 'next/link';
import { Compass } from 'lucide-react';

export default function NotFound() {
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
        <Compass size={40} style={{ margin: '0 auto', color: 'var(--accent)' }} />
        <h1 style={{ fontSize: '1.4rem', fontWeight: 700 }}>Page not found</h1>
        <p style={{ color: 'var(--text-secondary)' }}>
          The page you are looking for does not exist or has moved.
        </p>
        <div className="row" style={{ justifyContent: 'center', gap: '0.75rem' }}>
          <Link className="btn btn-primary" href="/">
            Back to home
          </Link>
        </div>
      </div>
    </main>
  );
}
