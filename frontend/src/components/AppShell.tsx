'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
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

export default function AppShell({ children }: { children: React.ReactNode }) {
  const { currentUser, globalError, dismissGlobalError } = useSkillBridge();
  const pathname = usePathname() || '/';
  const isPublicPage = pathname === '/market' || pathname === '/curriculum';

  const errorBanner = globalError ? (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 1000, display: 'flex', justifyContent: 'center', padding: '0.75rem 1rem' }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.65rem 1rem', borderRadius: '8px',
        background: 'rgba(244, 63, 94, 0.12)', border: '1px solid rgba(244, 63, 94, 0.35)',
        color: '#fda4af', fontSize: '0.85rem', maxWidth: '640px', boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
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

  return (
    <div className="app-shell">
      <AppSidebar />
      {errorBanner}
      <main className="app-main">{children}</main>
    </div>
  );
}