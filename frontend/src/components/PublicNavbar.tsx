'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSkillBridge } from '@/lib/skillbridge-context';
import ThemeToggle from './ThemeToggle';
import BrandMark from '@/components/ui/BrandMark';

export default function PublicNavbar() {
  const pathname = usePathname();
  const { setAuthMode, setShowAuthModal, handleDemoLogin, isDemoAccessEnabled } = useSkillBridge();

  return (
    <header className="public-navbar">
      <div className="public-nav-container">
        <Link href="/" className="brand">
          <BrandMark size={28} />
          <span>SkillBridge</span>
        </Link>

        <nav className="public-nav-links" aria-label="Primary">
          <Link href="/market" className={`public-nav-link ${pathname === '/market' ? 'active' : ''}`}>Job Market</Link>
          <Link href="/curriculum" className={`public-nav-link ${pathname === '/curriculum' ? 'active' : ''}`}>Syllabi</Link>
          <Link href="/learn" className={`public-nav-link ${pathname === '/learn' ? 'active' : ''}`}>Learn</Link>
        </nav>

        <div className="public-nav-actions">
          <ThemeToggle />
          <button
            className="btn btn-ghost"
            onClick={() => { setAuthMode('LOGIN'); setShowAuthModal(true); }}
          >
            Sign In
          </button>
          {isDemoAccessEnabled && (
            <button className="btn btn-primary" onClick={handleDemoLogin}>
              Try Demo
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
