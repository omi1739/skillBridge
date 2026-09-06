import React from 'react';
import Link from 'next/link';
import BrandMark from '@/components/ui/BrandMark';

export default function SiteFooter() {
  const year = new Date().getFullYear();

  const quickLinks = [
    { href: '/market', label: 'Job Market Demand' },
    { href: '/curriculum', label: 'University Syllabi' },
    { href: '/assessment', label: 'Diagnostic Test' },
    { href: '/sandbox', label: 'SQL & Code Sandbox' },
    { href: '/jobs', label: 'Browse Jobs' }
  ];

  return (
    <footer className="site-footer">
      <div className="site-footer-inner">
        <div className="site-footer-brand">
          <Link href="/" className="site-footer-logo">
            <BrandMark size={26} />
            <span>SkillBridge</span>
          </Link>
          <p className="site-footer-tagline">
            A benchmark-driven roadmap for junior engineers, built from live job postings.
          </p>
        </div>
        <nav className="site-footer-links" aria-label="Footer">
          {quickLinks.map(link => (
            <Link key={link.href} href={link.href}>{link.label}</Link>
          ))}
        </nav>
        <div className="site-footer-legal">
          © {year} SkillBridge
        </div>
      </div>
    </footer>
  );
}