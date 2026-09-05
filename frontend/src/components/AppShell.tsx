'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { useSkillBridge } from '@/lib/skillbridge-context';
import AppSidebar from './AppSidebar';
import PublicNavbar from './PublicNavbar';
import { SignInPromptView } from '@/components/views/prompts';

const PROTECTED_LABELS: Record<string, { title: string }> = {
  '/assessment': { title: 'Sign in to take assessments' },
  '/sandbox': { title: 'Sign in to use the SQL & Code Sandbox' },
  '/gaps': { title: 'Sign in to see your personalized skill gaps' },
  '/actions': { title: 'Sign in to see project recommendations' },
  '/jobs': { title: 'Sign in to see matching jobs' },
  '/admin': { title: 'Sign in to access admin tools' }
};

export default function AppShell({ children }: { children: React.ReactNode }) {
  const { currentUser } = useSkillBridge();
  const pathname = usePathname() || '/';
  const isPublicPage = pathname === '/market' || pathname === '/curriculum';

  if (!currentUser) {
    const protectedLabel = PROTECTED_LABELS[pathname];
    return (
      <div>
        <PublicNavbar />
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
      <main className="app-main">{children}</main>
    </div>
  );
}