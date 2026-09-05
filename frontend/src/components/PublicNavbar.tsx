'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { TrendingUp, GraduationCap, LogIn } from 'lucide-react';
import { useSkillBridge } from '@/lib/skillbridge-context';

export default function PublicNavbar() {
  const pathname = usePathname();
  const { landingStats, allJobs, curricula, setAuthMode, setShowAuthModal, handleDemoLogin } = useSkillBridge();
  const totalJobsCount = landingStats?.jobPostings ?? allJobs.length;
  const totalCurriculaCount = landingStats?.curriculaCount ?? curricula.length;

  return (
    <header className="public-navbar">
      <div className="public-nav-container">
        <Link href="/" className="brand">
          <span>SkillBridge</span>
        </Link>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <Link
            href="/market"
            className={`btn btn-ghost ${pathname === '/market' ? 'active' : ''}`}
          >
            <TrendingUp size={15} /> Job Demand ({totalJobsCount})
          </Link>
          <Link
            href="/curriculum"
            className={`btn btn-ghost ${pathname === '/curriculum' ? 'active' : ''}`}
          >
            <GraduationCap size={15} /> University Syllabi ({totalCurriculaCount})
          </Link>

          <button
            className="btn btn-secondary"
            onClick={() => { setAuthMode('LOGIN'); setShowAuthModal(true); }}
          >
            <LogIn size={15} /> Sign In
          </button>
          <button
            className="btn btn-primary"
            onClick={handleDemoLogin}
          >
            Try Demo (1-Click)
          </button>
        </div>
      </div>
    </header>
  );
}