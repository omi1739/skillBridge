'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Terminal, TrendingUp, GraduationCap, BrainCircuit, BarChart3, FolderGit2,
  Briefcase, Sliders, LogOut, FileText, LucideIcon, PanelLeftClose, PanelLeftOpen
} from 'lucide-react';
import { useSkillBridge, AppTab } from '@/lib/skillbridge-context';
import Avatar from '@/components/ui/Avatar';

const TABS: { tab: AppTab; icon: LucideIcon; label: string }[] = [
  { tab: 'market', icon: TrendingUp, label: 'Job Market Demand' },
  { tab: 'curriculum', icon: GraduationCap, label: 'University Syllabi' },
  { tab: 'assessment', icon: BrainCircuit, label: 'Diagnostic Test' },
  { tab: 'sandbox', icon: Terminal, label: 'SQL & Code Sandbox' },
  { tab: 'gaps', icon: BarChart3, label: 'My Skill Gaps' },
  { tab: 'actions', icon: FolderGit2, label: 'Projects to Build' },
  { tab: 'jobs', icon: Briefcase, label: 'Matching Jobs' }
];

const SIDEBAR_STORAGE_KEY = 'skillbridge_sidebar';

export default function AppSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const {
    currentUser, currentProfile, role, activeTargetRoleId,
    handleLogout, handleOpenPassport, navigate
  } = useSkillBridge();
  const currentTab = pathname.split('/')[1];

  const [expanded, setExpanded] = useState(() => {
    if (typeof window === 'undefined') return true;
    return localStorage.getItem(SIDEBAR_STORAGE_KEY) !== 'collapsed';
  });

  const toggleSidebar = () => {
    const next = !expanded;
    setExpanded(next);
    localStorage.setItem(SIDEBAR_STORAGE_KEY, next ? 'expanded' : 'collapsed');
  };

  const goToProfile = () => {
    router.push('/profile');
  };

  return (
    <aside className={`app-sidebar ${expanded ? '' : 'collapsed'}`}>
      <div className="sidebar-header">
        <Link href="/" className="sidebar-brand" title="SkillBridge">
          <div className="sidebar-brand-icon">
            <Terminal size={17} />
          </div>
          <span>SkillBridge</span>
        </Link>
        <button
          className="sidebar-icon-btn sidebar-collapse-btn"
          onClick={toggleSidebar}
          title={expanded ? 'Collapse sidebar' : 'Expand sidebar'}
          aria-label={expanded ? 'Collapse sidebar' : 'Expand sidebar'}
        >
          {expanded ? <PanelLeftClose size={16} /> : <PanelLeftOpen size={16} />}
        </button>
      </div>

      {expanded && (
        <div className="sidebar-track-card">
          <div className="sidebar-track-label">Active Track</div>
          <div className="sidebar-track-title">
            <span>{activeTargetRoleId ? (role?.title || 'Select your track') : 'Select your track'}</span>
          </div>
        </div>
      )}

      <nav className="sidebar-nav">
        <div>
          {expanded && <div className="sidebar-section-title">Market Intelligence</div>}
          {TABS.filter(t => t.tab === 'market' || t.tab === 'curriculum').map(t => (
            <button
              key={t.tab}
              className={`sidebar-item ${currentTab === t.tab ? 'active' : ''}`}
              onClick={() => navigate(t.tab)}
              title={t.label}
              aria-label={t.label}
            >
              <span className="sidebar-item-content">
                <t.icon size={16} />
                <span>{t.label}</span>
              </span>
            </button>
          ))}
        </div>

        <div>
          {expanded && <div className="sidebar-section-title">Practical Benchmarks</div>}
          {TABS.filter(t => t.tab === 'assessment' || t.tab === 'sandbox').map(t => (
            <button
              key={t.tab}
              className={`sidebar-item ${currentTab === t.tab ? 'active' : ''}`}
              onClick={() => navigate(t.tab)}
              title={t.label}
              aria-label={t.label}
            >
              <span className="sidebar-item-content">
                <t.icon size={16} />
                <span>{t.label}</span>
              </span>
            </button>
          ))}
        </div>

        <div>
          {expanded && <div className="sidebar-section-title">Career Roadmap</div>}
          {TABS.filter(t => t.tab === 'gaps' || t.tab === 'actions' || t.tab === 'jobs').map(t => (
            <button
              key={t.tab}
              className={`sidebar-item ${currentTab === t.tab ? 'active' : ''}`}
              onClick={() => navigate(t.tab)}
              title={t.label}
              aria-label={t.label}
            >
              <span className="sidebar-item-content">
                <t.icon size={16} />
                <span>{t.label}</span>
              </span>
            </button>
          ))}
        </div>

        {currentUser?.role === 'ADMIN' && (
          <div>
            {expanded && <div className="sidebar-section-title">Platform</div>}
            <button
              className={`sidebar-item ${currentTab === 'admin' ? 'active' : ''}`}
              onClick={() => navigate('admin')}
              title="Admin & Weights"
              aria-label="Admin & Weights"
            >
              <span className="sidebar-item-content">
                <Sliders size={16} />
                <span>Admin & Weights</span>
              </span>
            </button>
          </div>
        )}
      </nav>

      <div className="sidebar-footer">
        <button
          className="sidebar-user-card"
          onClick={goToProfile}
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
            <div className="sidebar-user-info">
              <div className="sidebar-user-name">
                {currentProfile?.fullName || currentUser!.email.split('@')[0]}
              </div>
              <div className="sidebar-user-role">
                {currentUser!.role === 'ADMIN' ? 'Administrator' : currentUser!.role === 'RECRUITER' ? 'Recruiter' : 'Verified Candidate'}
              </div>
            </div>
          )}
        </button>

        <button className="btn btn-secondary sidebar-passport-btn" onClick={handleOpenPassport} title="Skill Passport">
          <FileText size={14} />
          {expanded && <span>Skill Passport</span>}
        </button>

        <button className="sidebar-icon-btn" onClick={handleLogout} title="Sign Out" aria-label="Sign Out">
          <LogOut size={15} />
        </button>
      </div>
    </aside>
  );
}