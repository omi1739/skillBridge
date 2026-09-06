'use client';

import { usePathname } from 'next/navigation';
import {
  Terminal, TrendingUp, GraduationCap, BrainCircuit, BarChart3, FolderGit2,
  Briefcase, Sliders, LogOut, FileText, LucideIcon
} from 'lucide-react';
import { useSkillBridge, AppTab } from '@/lib/skillbridge-context';
import ThemeToggle from './ThemeToggle';

const GROUPS: { title: string; tabs: AppTab[] }[] = [
  { title: 'Market Intelligence', tabs: ['market', 'curriculum'] },
  { title: 'Practical Benchmarks', tabs: ['assessment', 'sandbox'] },
  { title: 'Career Roadmap', tabs: ['gaps', 'actions', 'jobs'] }
];

const TABS: Record<AppTab, { icon: LucideIcon; label: string }> = {
  market: { icon: TrendingUp, label: 'Job Market Demand' },
  curriculum: { icon: GraduationCap, label: 'University Syllabi' },
  assessment: { icon: BrainCircuit, label: 'Diagnostic Test' },
  sandbox: { icon: Terminal, label: 'SQL & Code Sandbox' },
  gaps: { icon: BarChart3, label: 'My Skill Gaps' },
  actions: { icon: FolderGit2, label: 'Projects to Build' },
  jobs: { icon: Briefcase, label: 'Matching Jobs' },
  admin: { icon: Sliders, label: 'Admin & Weights' }
};

export default function AppSidebar() {
  const pathname = usePathname();
  const { currentUser, handleLogout, handleOpenPassport, navigate } = useSkillBridge();
  const currentTab = pathname.split('/')[1] as AppTab;

  return (
    <aside className="app-sidebar">
      <div className="sidebar-header">
        <div className="sidebar-brand" title="SkillBridge">
          <div className="sidebar-brand-icon">
            <Terminal size={17} />
          </div>
          <span>SkillBridge</span>
        </div>
      </div>

      <nav className="sidebar-nav" aria-label="Main navigation">
        {GROUPS.map((group, gi) => (
          <div key={group.title} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.2rem' }}>
            {gi > 0 && <div className="sidebar-divider" />}
            {group.tabs.map(tab => {
              const t = TABS[tab];
              return (
                <button
                  key={tab}
                  className={`sidebar-item ${currentTab === tab ? 'active' : ''}`}
                  onClick={() => navigate(tab)}
                  title={t.label}
                  aria-label={t.label}
                >
                  <span className="sidebar-item-content">
                    <t.icon size={18} />
                    <span>{t.label}</span>
                  </span>
                </button>
              );
            })}
          </div>
        ))}

        {currentUser?.role === 'ADMIN' && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.2rem' }}>
            <div className="sidebar-divider" />
            <button
              className={`sidebar-item ${currentTab === 'admin' ? 'active' : ''}`}
              onClick={() => navigate('admin')}
              title={TABS.admin.label}
              aria-label={TABS.admin.label}
            >
              <span className="sidebar-item-content">
                <TABS.admin.icon size={18} />
                <span>{TABS.admin.label}</span>
              </span>
            </button>
          </div>
        )}
      </nav>

      <div className="sidebar-footer">
        <button className="sidebar-icon-btn" onClick={handleOpenPassport} title="Skill Passport" aria-label="Skill Passport">
          <FileText size={17} />
        </button>
        <ThemeToggle />
        <button className="sidebar-icon-btn" onClick={handleLogout} title="Sign Out" aria-label="Sign Out">
          <LogOut size={17} />
        </button>
      </div>
    </aside>
  );
}