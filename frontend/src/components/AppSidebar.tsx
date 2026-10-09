'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LogOut, FileText, PanelLeftClose, PanelLeftOpen, Home as HomeIcon,
  TrendingUp, GraduationCap, BookOpen, ClipboardCheck, Terminal,
  Target, Wrench, Briefcase, ShieldCheck, LucideIcon
} from 'lucide-react';
import { useSkillBridge } from '@/lib/skillbridge-context';
import Avatar from '@/components/ui/Avatar';
import BrandMark from '@/components/ui/BrandMark';

type NavItem = { tab: string; label: string; icon: LucideIcon };

const NAV_SECTIONS: { title: string; items: NavItem[] }[] = [
  {
    title: 'Explore',
    items: [
      { tab: 'market', label: 'Job Market Demand', icon: TrendingUp },
      { tab: 'curriculum', label: 'University Syllabi', icon: GraduationCap },
      { tab: 'learn', label: 'Learning Resources', icon: BookOpen }
    ]
  },
  {
    title: 'Practice',
    items: [
      { tab: 'assessment', label: 'Diagnostic Test', icon: ClipboardCheck },
      { tab: 'sandbox', label: 'SQL & Code Sandbox', icon: Terminal }
    ]
  },
  {
    title: 'Your progress',
    items: [
      { tab: 'gaps', label: 'Skill Gaps', icon: Target },
      { tab: 'actions', label: 'Projects to Build', icon: Wrench },
      { tab: 'jobs', label: 'Matching Jobs', icon: Briefcase }
    ]
  }
];

const SIDEBAR_STORAGE_KEY = 'skillbridge_sidebar';

function roleLabel(userRole?: string) {
  if (userRole === 'ADMIN') return 'Administrator';
  if (userRole === 'RECRUITER') return 'Recruiter';
  return 'Candidate';
}

export default function AppSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const {
    currentUser, currentProfile, handleLogout, handleOpenPassport
  } = useSkillBridge();
  const activeTab = pathname === '/' ? 'home' : pathname.split('/')[1];
  const goTab = (tab: string) => router.push(tab === 'home' ? '/' : `/${tab}`);

  // Expanded is the server's answer too — reading localStorage in the state
  // initializer made the first client render differ from SSR whenever the
  // preference was 'collapsed', and hydration failed. The stored value is
  // applied once on mount instead.
  const [expanded, setExpanded] = useState(true);

  useEffect(() => {
    setExpanded(localStorage.getItem(SIDEBAR_STORAGE_KEY) !== 'collapsed');
  }, []);

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

      <nav className="sidebar-nav">
        <button
          className={`sidebar-item ${activeTab === 'home' ? 'active' : ''}`}
          onClick={() => goTab('home')}
          title="Home"
          aria-label="Home"
        >
          <span className="sidebar-item-icon"><HomeIcon size={17} aria-hidden="true" /></span>
          <span className="sidebar-item-label">Home</span>
        </button>

        {NAV_SECTIONS.map((section, idx) => (
          <div key={section.title} className={idx === 0 ? '' : 'sidebar-group'}>
            <div className="sidebar-section-title">{section.title}</div>
            {section.items.map(item => (
              <button
                key={item.tab}
                className={`sidebar-item ${activeTab === item.tab ? 'active' : ''}`}
                onClick={() => goTab(item.tab)}
                title={item.label}
                aria-label={item.label}
              >
                <span className="sidebar-item-icon"><item.icon size={17} aria-hidden="true" /></span>
                <span className="sidebar-item-label">{item.label}</span>
              </button>
            ))}
          </div>
        ))}

        {currentUser?.role === 'ADMIN' && (
          <div className="sidebar-group">
            <div className="sidebar-section-title">Platform</div>
            <button
              className={`sidebar-item ${activeTab === 'admin' ? 'active' : ''}`}
              onClick={() => goTab('admin')}
              title="Admin Console"
              aria-label="Admin Console"
            >
              <span className="sidebar-item-icon"><ShieldCheck size={17} aria-hidden="true" /></span>
              <span className="sidebar-item-label">Admin Console</span>
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
          <span className="sidebar-user-info">
            <span className="sidebar-user-name">
              {currentProfile?.fullName || currentUser!.email.split('@')[0]}
            </span>
            <span className="sidebar-user-role">{roleLabel(currentUser!.role)}</span>
          </span>
        </button>

        <button className="sidebar-text-btn" onClick={handleOpenPassport} title="Skill Passport" aria-label="Skill Passport">
          <span className="sidebar-text-btn-label">
            <FileText size={14} aria-hidden="true" /> Skill Passport
          </span>
          <span className="sidebar-icon-only"><FileText size={15} aria-hidden="true" /></span>
        </button>

        <button className="sidebar-text-btn" onClick={handleLogout} title="Sign Out" aria-label="Sign Out">
          <span className="sidebar-text-btn-label">
            <LogOut size={14} aria-hidden="true" /> Sign Out
          </span>
          <span className="sidebar-icon-only"><LogOut size={15} aria-hidden="true" /></span>
        </button>
      </div>
    </aside>
  );
}
