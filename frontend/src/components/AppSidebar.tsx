'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LogOut, FileText, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { useSkillBridge } from '@/lib/skillbridge-context';
import Avatar from '@/components/ui/Avatar';
import BrandMark from '@/components/ui/BrandMark';

const NAV_SECTIONS: { title: string; items: { tab: string; label: string }[] }[] = [
  {
    title: 'Explore',
    items: [
      { tab: 'learn', label: 'Learning Resources' },
      { tab: 'market', label: 'Job Market Demand' },
      { tab: 'curriculum', label: 'University Syllabi' }
    ]
  },
  {
    title: 'Benchmarks',
    items: [
      { tab: 'assessment', label: 'Diagnostic Test' },
      { tab: 'sandbox', label: 'SQL & Code Sandbox' }
    ]
  },
  {
    title: 'Career',
    items: [
      { tab: 'gaps', label: 'My Skill Gaps' },
      { tab: 'actions', label: 'Projects to Build' },
      { tab: 'jobs', label: 'Matching Jobs' }
    ]
  }
];

const SIDEBAR_STORAGE_KEY = 'skillbridge_sidebar';

export default function AppSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const {
    currentUser, currentProfile, role, activeTargetRoleId,
    handleLogout, handleOpenPassport
  } = useSkillBridge();
  const activeTab = pathname === '/' ? 'home' : pathname.split('/')[1];
  const goTab = (tab: string) => router.push(tab === 'home' ? '/' : `/${tab}`);

  const [expanded, setExpanded] = useState(() => {
    if (typeof window === 'undefined') return true;
    return localStorage.getItem(SIDEBAR_STORAGE_KEY) !== 'collapsed';
  });

  const toggleSidebar = () => {
    const next = !expanded;
    setExpanded(next);
    localStorage.setItem(SIDEBAR_STORAGE_KEY, next ? 'expanded' : 'collapsed');
  };

  return (
    <aside className={`app-sidebar ${expanded ? '' : 'collapsed'}`}>
      <div className="sidebar-header">
        <Link href="/" className="sidebar-brand" title="SkillBridge">
          <BrandMark size={30} className="sidebar-brand-icon" />
          <span>SkillBridge</span>
        </Link>
        <button
          className="sidebar-icon-btn sidebar-collapse-btn"
          onClick={toggleSidebar}
          title={expanded ? 'Hide sidebar' : 'Show sidebar'}
          aria-label={expanded ? 'Hide sidebar' : 'Show sidebar'}
        >
          {expanded ? <PanelLeftClose size={16} /> : <PanelLeftOpen size={16} />}
        </button>
      </div>

      {expanded && activeTargetRoleId && (
        <div className="sidebar-track-card">
          <div className="sidebar-track-label">Active track</div>
          <div className="sidebar-track-title">{role?.title || 'Select your track'}</div>
        </div>
      )}

      <nav className="sidebar-nav">
        <button
          className={`sidebar-item ${activeTab === 'home' ? 'active' : ''}`}
          onClick={() => goTab('home')}
          title="Home"
          aria-label="Home"
        >
          <span>Home</span>
        </button>

        {NAV_SECTIONS.map(section => (
          <div key={section.title}>
            {expanded && <div className="sidebar-section-title">{section.title}</div>}
            {section.items.map(item => (
              <button
                key={item.tab}
                className={`sidebar-item ${activeTab === item.tab ? 'active' : ''}`}
                onClick={() => goTab(item.tab)}
                title={item.label}
                aria-label={item.label}
              >
                <span>{item.label}</span>
              </button>
            ))}
          </div>
        ))}

        {currentUser?.role === 'ADMIN' && (
          <div>
            {expanded && <div className="sidebar-section-title">Platform</div>}
            <button
              className={`sidebar-item ${activeTab === 'admin' ? 'active' : ''}`}
              onClick={() => goTab('admin')}
              title="Admin & Weights"
              aria-label="Admin & Weights"
            >
              <span>Admin & Weights</span>
            </button>
          </div>
        )}
      </nav>

      <div className="sidebar-footer">
        <button
          className="sidebar-user-card"
          onClick={() => router.push('/profile')}
          title="View profile"
          aria-label="View profile"
        >
          <Avatar
            src={currentUser?.avatarUrl}
            name={currentProfile?.fullName}
            email={currentUser?.email}
            size={30}
          />
          {expanded && (
            <span className="sidebar-user-info">
              <span className="sidebar-user-name">
                {currentProfile?.fullName || currentUser!.email.split('@')[0]}
              </span>
              <span className="sidebar-user-role">
                {currentUser!.role === 'ADMIN' ? 'Administrator' : currentUser!.role === 'RECRUITER' ? 'Recruiter' : 'Verified Candidate'}
              </span>
            </span>
          )}
        </button>

        <button className="sidebar-text-btn" onClick={handleOpenPassport} title="Skill Passport">
          <span className="sidebar-text-btn-label">
            <FileText size={14} /> Skill Passport
          </span>
          <span className="sidebar-icon-only"><FileText size={15} /></span>
        </button>

        <button className="sidebar-text-btn" onClick={handleLogout} title="Sign Out" aria-label="Sign Out">
          <span className="sidebar-text-btn-label">
            <LogOut size={14} /> Sign Out
          </span>
          <span className="sidebar-icon-only"><LogOut size={15} /></span>
        </button>
      </div>
    </aside>
  );
}