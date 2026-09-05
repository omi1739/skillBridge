'use client';

import { usePathname } from 'next/navigation';
import {
  Terminal, TrendingUp, GraduationCap, BrainCircuit, BarChart3, FolderGit2,
  Briefcase, Sliders, LogOut, FileText, LucideIcon
} from 'lucide-react';
import { useSkillBridge, AppTab } from '@/lib/skillbridge-context';

const TABS: { tab: AppTab; icon: LucideIcon; label: string }[] = [
  { tab: 'market', icon: TrendingUp, label: 'Job Market Demand' },
  { tab: 'curriculum', icon: GraduationCap, label: 'University Syllabi' },
  { tab: 'assessment', icon: BrainCircuit, label: 'Diagnostic Test' },
  { tab: 'sandbox', icon: Terminal, label: 'SQL & Code Sandbox' },
  { tab: 'gaps', icon: BarChart3, label: 'My Skill Gaps' },
  { tab: 'actions', icon: FolderGit2, label: 'Projects to Build' },
  { tab: 'jobs', icon: Briefcase, label: 'Matching Jobs' }
];

export default function AppSidebar() {
  const pathname = usePathname();
  const { currentUser, currentProfile, role, activeTargetRoleId, handleLogout, handleOpenPassport, navigate } = useSkillBridge();
  const currentTab = pathname.split('/')[1];

  return (
    <aside className="app-sidebar">
      <div className="sidebar-header">
        <div className="sidebar-brand">
          <div className="sidebar-brand-icon">
            <Terminal size={17} />
          </div>
          <span>SkillBridge</span>
        </div>
        <div className="sidebar-track-card">
          <div className="sidebar-track-label">Active Track</div>
          <div className="sidebar-track-title">
            <span>{activeTargetRoleId ? (role?.title || 'Select your track') : 'Select your track'}</span>
          </div>
        </div>
      </div>

      <nav className="sidebar-nav">
        <div>
          <div className="sidebar-section-title">Market Intelligence</div>
          {TABS.filter(t => t.tab === 'market' || t.tab === 'curriculum').map(t => (
            <button
              key={t.tab}
              className={`sidebar-item ${currentTab === t.tab ? 'active' : ''}`}
              onClick={() => navigate(t.tab)}
            >
              <span className="sidebar-item-content">
                <t.icon size={16} />
                <span>{t.label}</span>
              </span>
            </button>
          ))}
        </div>

        <div>
          <div className="sidebar-section-title">Practical Benchmarks</div>
          {TABS.filter(t => t.tab === 'assessment' || t.tab === 'sandbox').map(t => (
            <button
              key={t.tab}
              className={`sidebar-item ${currentTab === t.tab ? 'active' : ''}`}
              onClick={() => navigate(t.tab)}
            >
              <span className="sidebar-item-content">
                <t.icon size={16} />
                <span>{t.label}</span>
              </span>
            </button>
          ))}
        </div>

        <div>
          <div className="sidebar-section-title">Career Roadmap</div>
          {TABS.filter(t => t.tab === 'gaps' || t.tab === 'actions' || t.tab === 'jobs').map(t => (
            <button
              key={t.tab}
              className={`sidebar-item ${currentTab === t.tab ? 'active' : ''}`}
              onClick={() => navigate(t.tab)}
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
            <div className="sidebar-section-title">Platform</div>
            <button
              className={`sidebar-item ${currentTab === 'admin' ? 'active' : ''}`}
              onClick={() => navigate('admin')}
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
        <div className="sidebar-user-card">
          <div className="sidebar-avatar">
            {(currentProfile?.fullName || currentUser!.email).substring(0, 2).toUpperCase()}
          </div>
          <div className="sidebar-user-info">
            <div className="sidebar-user-name">
              {currentProfile?.fullName || currentUser!.email.split('@')[0]}
            </div>
            <div className="sidebar-user-role">
              {currentUser!.role === 'ADMIN' ? 'Administrator' : currentUser!.role === 'RECRUITER' ? 'Recruiter' : 'Verified Candidate'}
            </div>
          </div>
          <button className="sidebar-icon-btn" onClick={handleLogout} title="Sign Out">
            <LogOut size={15} />
          </button>
        </div>
        <button className="btn btn-secondary sidebar-passport-btn" onClick={handleOpenPassport}>
          <FileText size={14} />
          <span>Skill Passport</span>
        </button>
      </div>
    </aside>
  );
}