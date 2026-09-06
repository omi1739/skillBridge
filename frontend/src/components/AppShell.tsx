'use client';

import React, { useState, useEffect, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { ChevronDown, Menu, X } from 'lucide-react';
import { useSkillBridge } from '@/lib/skillbridge-context';
import AppSidebar from './AppSidebar';
import PublicNavbar from './PublicNavbar';
import ThemeToggle from './ThemeToggle';
import Avatar from '@/components/ui/Avatar';
import { SignInPromptView } from '@/components/views/prompts';
import PublicHomeView from '@/components/views/PublicHomeView';
import SiteFooter from './SiteFooter';

const PROTECTED_LABELS: Record<string, { title: string }> = {
  '/assessment': { title: 'Sign in to take assessments' },
  '/sandbox': { title: 'Sign in to use the SQL & Code Sandbox' },
  '/gaps': { title: 'Sign in to see your personalized skill gaps' },
  '/actions': { title: 'Sign in to see project recommendations' },
  '/jobs': { title: 'Sign in to see matching jobs' },
  '/admin': { title: 'Sign in to access admin tools' },
  '/profile': { title: 'Sign in to view your profile' }
};

const PAGE_TITLES: Record<string, string> = {
  '/': 'Home',
  '/market': 'Job Market Demand',
  '/curriculum': 'University Syllabi',
  '/learn': 'Learning Resources',
  '/assessment': 'Diagnostic Test',
  '/sandbox': 'SQL & Code Sandbox',
  '/gaps': 'My Skill Gaps',
  '/actions': 'Projects to Build',
  '/jobs': 'Matching Jobs',
  '/admin': 'Admin & Ontology Console',
  '/profile': 'My Profile'
};

export default function AppShell({ children }: { children: React.ReactNode }) {
  const {
    currentUser, currentProfile, role, activeTargetRoleId,
    globalError, dismissGlobalError, handleLogout
  } = useSkillBridge();
  const pathname = usePathname() || '/';
  const router = useRouter();
  const isPublicPage = pathname === '/' || pathname === '/market' || pathname === '/curriculum' || pathname === '/learn';

  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!userMenuOpen) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [userMenuOpen]);

  useEffect(() => {
    document.body.classList.toggle('mobile-sidebar-open', mobileSidebarOpen);
    return () => document.body.classList.remove('mobile-sidebar-open');
  }, [mobileSidebarOpen]);

  useEffect(() => {
    setMobileSidebarOpen(false);
    setUserMenuOpen(false);
  }, [pathname]);

  const errorBanner = globalError ? (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 1000, display: 'flex', justifyContent: 'center', padding: '0.75rem 1rem' }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.65rem 1rem', borderRadius: '8px',
        background: 'var(--danger-bg)', border: '1px solid var(--danger-border)',
        color: 'var(--danger-text)', fontSize: '0.85rem', maxWidth: '640px', boxShadow: 'var(--shadow-dropdown)',
        backdropFilter: 'blur(6px)'
      }}>
        <span style={{ flex: 1 }}>{globalError}</span>
        <button onClick={dismissGlobalError} aria-label="Dismiss" className="btn btn-ghost" style={{ padding: '0.2rem' }}>
          <X size={14} />
        </button>
      </div>
    </div>
  ) : null;

  if (!currentUser) {
    const protectedLabel = PROTECTED_LABELS[pathname];
    const showLanding = pathname === '/';
    return (
      <div>
        <PublicNavbar />
        {errorBanner}
        <div className="public-container">
          {showLanding ? (
            <PublicHomeView />
          ) : !isPublicPage && protectedLabel ? (
            <SignInPromptView
              title={protectedLabel.title}
              subtitle="Your assessments, skill evidence, and recommendations are linked to a verified account."
            />
          ) : (
            children
          )}
        </div>
        <SiteFooter />
      </div>
    );
  }

  const pageTitle = PAGE_TITLES[pathname] || pathname.replace(/^\//, '');
  const trackLabel = activeTargetRoleId ? (role?.title || 'Select your track') : null;

  return (
    <div className="app-shell">
      <AppSidebar />
      {mobileSidebarOpen && <div className="mobile-sidebar-overlay" onClick={() => setMobileSidebarOpen(false)} />}
      {errorBanner}
      <div className="app-main-col">
        <header className="topbar">
          <div className="topbar-inner">
            <button className="btn btn-ghost topbar-menu-btn" onClick={() => setMobileSidebarOpen(true)} aria-label="Open menu">
              <Menu size={18} />
            </button>
            <div className="topbar-title">
              <span>{pageTitle}</span>
              {trackLabel && <span className="topbar-track">{trackLabel}</span>}
            </div>
            <div className="topbar-actions">
              <ThemeToggle />
              <div className="topbar-user" ref={menuRef} style={{ position: 'relative' }}>
                <button
                  className="topbar-user-trigger"
                  onClick={() => setUserMenuOpen(v => !v)}
                  aria-haspopup="menu"
                  aria-expanded={userMenuOpen}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', padding: '0.2rem 0.1rem 0.2rem 0.5rem', borderRadius: '8px' }}
                >
                  <Avatar
                    src={currentUser?.avatarUrl}
                    name={currentProfile?.fullName}
                    email={currentUser?.email}
                    size={32}
                  />
                  <div style={{ textAlign: 'left' }}>
                    <div className="topbar-user-name">
                      {currentProfile?.fullName || currentUser.email.split('@')[0]}
                    </div>
                    <div className="topbar-user-role">
                      {currentUser.role === 'ADMIN' ? 'Administrator' : currentUser.role === 'RECRUITER' ? 'Recruiter' : 'Verified Candidate'}
                    </div>
                  </div>
                  <ChevronDown size={14} color="var(--text-muted)" style={{ marginLeft: '0.15rem' }} />
                </button>
                {userMenuOpen && (
                  <div
                    role="menu"
                    style={{
                      position: 'absolute', top: 'calc(100% + 6px)', right: 0, zIndex: 50,
                      minWidth: 180, background: 'var(--bg-surface)', border: '1px solid var(--border-color)',
                      borderRadius: '8px', boxShadow: 'var(--shadow-dropdown)', padding: '0.3rem'
                    }}
                  >
                    <button
                      role="menuitem"
                      className="topbar-menu-item"
                      onClick={() => { setUserMenuOpen(false); router.push('/profile'); }}
                    >
                      View Profile
                    </button>
                    <button
                      role="menuitem"
                      className="topbar-menu-item"
                      onClick={() => { setUserMenuOpen(false); handleLogout(); }}
                    >
                      Sign Out
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>
        <main className="app-main">{children}</main>
        <SiteFooter />
      </div>
    </div>
  );
}