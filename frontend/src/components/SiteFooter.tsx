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
            Live job-market demand mapped to your verified skills, with a clear path to the
            next thing worth learning.
          </p>
        </div>

        <div className="site-footer-col">
          <div className="site-footer-col-title">Product</div>
          <nav className="site-footer-links" aria-label="Product">
            <Link href="/market">Job Market</Link>
            <Link href="/curriculum">University Syllabi</Link>
            <Link href="/assessment">Diagnostic Test</Link>
            <Link href="/sandbox">SQL &amp; Code Sandbox</Link>
          </nav>
        </div>

        <div className="site-footer-col">
          <div className="site-footer-col-title">Learn</div>
          <nav className="site-footer-links" aria-label="Learn">
            <Link href="/learn?topic=sql">SQL</Link>
            <Link href="/learn?topic=javascript">JavaScript</Link>
            <Link href="/learn?topic=python">Python</Link>
            <Link href="/learn?topic=java">Java</Link>
            <Link href="/learn?topic=docker">Docker</Link>
            <Link href="/learn?topic=dsa">Data Structures</Link>
          </nav>
        </div>

        <div className="site-footer-col">
          <div className="site-footer-col-title">Account</div>
          <nav className="site-footer-links" aria-label="Account">
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
        <span>Evidence-based career growth for engineers</span>
      </div>
    </footer>
  );
}
