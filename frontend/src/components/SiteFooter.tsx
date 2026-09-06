import React from 'react';
import Link from 'next/link';
import BrandMark from '@/components/ui/BrandMark';

export default function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="site-footer">
      <div className="site-footer-inner">
        <div className="site-footer-col site-footer-brand-col">
          <Link href="/" className="site-footer-logo">
            <BrandMark size={28} />
            <span>SkillBridge</span>
          </Link>
          <p className="site-footer-tagline">
            Benchmark your skills against real job requirements. A data-driven roadmap for junior engineers.
          </p>
          <div className="site-footer-badge">
            <span className="badge badge-preferred" style={{ fontSize: '0.65rem' }}>Open Source</span>
            <span className="badge" style={{ fontSize: '0.65rem' }}>Free for Students</span>
          </div>
        </div>

        <div className="site-footer-col">
          <div className="site-footer-col-title">Tools</div>
          <nav className="site-footer-links" aria-label="Tools">
            <Link href="/market">Job Market Demand</Link>
            <Link href="/assessment">Diagnostic Test</Link>
            <Link href="/sandbox">SQL &amp; Code Sandbox</Link>
            <Link href="/curriculum">University Syllabi</Link>
            <Link href="/jobs">Browse Jobs</Link>
          </nav>
        </div>

        <div className="site-footer-col">
          <div className="site-footer-col-title">Learning</div>
          <nav className="site-footer-links" aria-label="Learning">
            <Link href="/learn?topic=sql">SQL</Link>
            <Link href="/learn?topic=javascript">JavaScript</Link>
            <Link href="/learn?topic=python">Python</Link>
            <Link href="/learn?topic=java">Java</Link>
            <Link href="/learn?topic=docker">Docker</Link>
            <Link href="/learn?topic=dsa">Data Structures</Link>
          </nav>
        </div>

        <div className="site-footer-col">
          <div className="site-footer-col-title">Platform</div>
          <nav className="site-footer-links" aria-label="Platform">
            <Link href="/gaps">Skill Gaps</Link>
            <Link href="/actions">Projects to Build</Link>
            <Link href="/profile">My Profile</Link>
            <a href="https://github.com/omi1739/skillBridge" target="_blank" rel="noreferrer">GitHub</a>
          </nav>
        </div>
      </div>
      <div className="site-footer-bottom">
        <span>&copy; {year} SkillBridge</span>
        <span className="site-footer-bottom-sep">&middot;</span>
        <span>Built for engineers who want evidence-backed career growth</span>
      </div>
    </footer>
  );
}