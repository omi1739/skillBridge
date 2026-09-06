'use client';

import React, { useState, useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { ChevronDown, X } from 'lucide-react';
import { useSkillBridge } from '@/lib/skillbridge-context';
import AppSidebar from './AppSidebar';
import PublicNavbar from './PublicNavbar';
import ThemeToggle from './ThemeToggle';
import { SignInPromptView } from '@/components/views/prompts';

const PROTECTED_LABELS: Record<string, { title: string }> = {
  '/assessment': { title: 'Sign in to take assessments' },
  '/sandbox': { title: 'Sign in to use the SQL & Code Sandbox' },
  '/gaps': { title: 'Sign in to see your personalized skill gaps' },
  '/actions': { title: 'Sign in to see project recommendations' },
  '/jobs': { title: 'Sign in to see matching jobs' },
  '/admin': { title: 'Sign in to access admin tools' }
};

const PAGE_TITLES: Record<string, string> = {
  '/market': 'Job Market Demand',
  '/curriculum': 'University Syllabi',
  '/assessment': 'Diagnostic Test',
  '/sandbox': 'SQL & Code Sandbox',
  '/gaps': 'My Skill Gaps',
  '/actions': 'Projects to Build',
  '/jobs': 'Matching Jobs',
  '/admin': 'Admin & Ontology Console'
};

export default function AppShell({ children }: { children: React.ReactNode }) {
  const {
    currentUser, currentProfile, role, activeTargetRoleId,
    globalError, dismissGlobalError, handleLogout,
    setShowProfileModal, setProfileForm
  } = useSkillBridge();
  const pathname = usePathname() || '/';
  const isPublicPage = pathname === '/market' || pathname === '/curriculum';

  const [userMenuOpen, setUserMenuOpen] = useState(false);
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

  const openProfile = () => {
    setProfileForm({
      fullName: currentProfile?.fullName || currentUser!.email.split('@')[0],
      githubUrl: currentProfile?.githubUrl || '',
      portfolioUrl: currentProfile?.portfolioUrl || '',
      bio: currentProfile?.bio || '',
      targetRoleId: currentProfile?.targetRoleId || activeTargetRoleId || ''
    });
    setShowProfileModal(true);
    setUserMenuOpen(false);
  };

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
    return (
      <div>
        <PublicNavbar />
        {errorBanner}
        <div className="public-container">
          {!isPublicPage && protectedLabel ? (
            <SignInPromptView
              title={protectedLabel.title}
              subtitle="Your assessments, skill evidence, and recommendations are linked to a verified account."
            />
          ) : (
            children
          )}
        </div>
      </div>
    );
  }

  const pageTitle = PAGE_TITLES[pathname] || pathname.replace(/^\//, '');
  const trackLabel = activeTargetRoleId ? (role?.title || 'Select your track') : null;

  return (
    <div className="app-shell">
      <AppSidebar />
      {errorBanner}
      <div className="app-main-col">
        <header className="topbar">
          <div className="topbar-inner">
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
                  <div className="topbar-avatar">
                    {(currentProfile?.fullName || currentUser.email).substring(0, 2).toUpperCase()}
                  </div>
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
                      onClick={openProfile}
                    >
                      Edit Profile
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
      </div>
    </div>
  );
}
