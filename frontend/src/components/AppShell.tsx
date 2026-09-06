'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { FileText } from 'lucide-react';
import { useSkillBridge } from '@/lib/skillbridge-context';
import AppSidebar from './AppSidebar';
import PublicNavbar from './PublicNavbar';
import { SignInPromptView } from '@/components/views/prompts';
import { X } from 'lucide-react';

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
  const { currentUser, currentProfile, role, activeTargetRoleId, globalError, dismissGlobalError, handleOpenPassport } = useSkillBridge();
  const pathname = usePathname() || '/';
  const isPublicPage = pathname === '/market' || pathname === '/curriculum';

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
              <button className="btn btn-secondary" onClick={handleOpenPassport} style={{ gap: '0.4rem' }}>
                <FileText size={14} />
                <span>Skill Passport</span>
              </button>
              <div className="topbar-user">
                <div className="topbar-avatar">
                  {(currentProfile?.fullName || currentUser.email).substring(0, 2).toUpperCase()}
                </div>
                <div>
                  <div className="topbar-user-name">
                    {currentProfile?.fullName || currentUser.email.split('@')[0]}
                  </div>
                  <div className="topbar-user-role">
                    {currentUser.role === 'ADMIN' ? 'Administrator' : currentUser.role === 'RECRUITER' ? 'Recruiter' : 'Verified Candidate'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </header>
        <main className="app-main">{children}</main>
      </div>
    </div>
  );
}