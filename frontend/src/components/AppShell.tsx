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
  '/admin': 'Admin Console',
  '/profile': 'My Profile'
};

function roleLabel(userRole?: string) {
  if (userRole === 'ADMIN') return 'Administrator';
  if (userRole === 'RECRUITER') return 'Recruiter';
  return 'Candidate';
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const {
    currentUser, currentProfile, globalError, dismissGlobalError, handleLogout
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
    <div className="global-banner">
      <div className="global-banner-inner" role="alert">
        <span className="global-banner-msg">{globalError}</span>
        <button onClick={dismissGlobalError} aria-label="Dismiss" className="global-banner-close">
          <X size={15} />
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
        {showLanding ? (
          <PublicHomeView />
        ) : (
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
        )}
        <SiteFooter />
      </div>
    );
  }

  const pageTitle = PAGE_TITLES[pathname] || pathname.replace(/^\//, '');

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
            </div>
            <div className="topbar-actions">
              <ThemeToggle />
              <div className="topbar-user" ref={menuRef}>
                <button
                  className="topbar-user-trigger"
                  onClick={() => setUserMenuOpen(v => !v)}
                  aria-haspopup="menu"
                  aria-expanded={userMenuOpen}
                >
                  <Avatar
                    src={currentUser?.avatarUrl}
                    name={currentProfile?.fullName}
                    email={currentUser?.email}
                    size={30}
                  />
                  <div className="topbar-user-meta">
                    <div className="topbar-user-name">
                      {currentProfile?.fullName || currentUser.email.split('@')[0]}
                    </div>
                    <div className="topbar-user-role">{roleLabel(currentUser.role)}</div>
                  </div>
                  <ChevronDown size={14} className="topbar-user-caret" aria-hidden="true" />
                </button>
                {userMenuOpen && (
                  <div role="menu" className="topbar-menu">
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
