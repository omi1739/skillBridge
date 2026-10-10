'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, X } from 'lucide-react';
import { useSkillBridge } from '@/lib/skillbridge-context';
import ThemeToggle from './ThemeToggle';
import BrandMark from '@/components/ui/BrandMark';

export default function PublicNavbar() {
  const pathname = usePathname();
  const { setAuthMode, setShowAuthModal, handleDemoLogin, isDemoAccessEnabled } = useSkillBridge();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [menuOpen]);

  const openLogin = () => {
    setMenuOpen(false);
    setAuthMode('LOGIN');
    setShowAuthModal(true);
  };

  const navLinks = (
    <>
      <Link href="/market" className={`public-nav-link ${pathname === '/market' ? 'active' : ''}`} onClick={() => setMenuOpen(false)}>Job Market</Link>
      <Link href="/curriculum" className={`public-nav-link ${pathname === '/curriculum' ? 'active' : ''}`} onClick={() => setMenuOpen(false)}>Syllabi</Link>
      <Link href="/learn" className={`public-nav-link ${pathname === '/learn' ? 'active' : ''}`} onClick={() => setMenuOpen(false)}>Learn</Link>
    </>
  );

  return (
    <header className="public-navbar">
      <div className="public-nav-container">
        <Link href="/" className="brand">
          <BrandMark size={28} />
          <span>SkillBridge</span>
        </Link>

        <nav className="public-nav-links" aria-label="Primary">
          {navLinks}
        </nav>

        <div className="public-nav-actions">
          <ThemeToggle />
          <button
            className="btn btn-ghost public-nav-signin"
            onClick={openLogin}
          >
            Sign In
          </button>
          {isDemoAccessEnabled && (
            <button className="btn btn-primary public-nav-demo" onClick={() => { setMenuOpen(false); handleDemoLogin(); }}>
              Try Demo
            </button>
          )}
          <button
            className="public-nav-toggle"
            onClick={() => setMenuOpen(v => !v)}
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={menuOpen}
          >
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {menuOpen && (
        <div className="public-mobile-menu">
          <nav className="public-mobile-menu-links" aria-label="Mobile">
            {navLinks}
          </nav>
          <div className="public-mobile-menu-actions">
            <button className="btn btn-secondary" onClick={openLogin}>
              Sign In
            </button>
            {isDemoAccessEnabled && (
              <button className="btn btn-primary" onClick={() => { setMenuOpen(false); handleDemoLogin(); }}>
                Try Demo
              </button>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
