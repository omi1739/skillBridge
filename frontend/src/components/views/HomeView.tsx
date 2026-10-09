'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import {
  BookOpen, Target, Code2, Wrench, Briefcase, ArrowRight, BarChart3, Compass
} from 'lucide-react';
import { useSkillBridge } from '@/lib/skillbridge-context';
import { RolePromptView } from './prompts';
import { PageHeader } from '@/components/ui/primitives';

export default function HomeView() {
  const router = useRouter();
  const { currentProfile, role, activeTargetRoleId, gaps, recommendations, jobMatches, skillProgress } = useSkillBridge();

  const go = (p: string) => router.push(p);

  if (!activeTargetRoleId) {
    return (
      <div>
        <PageHeader
          title="Welcome"
          subtitle="Choose the role you're preparing for to unlock your roadmap."
        />
        <RolePromptView />
      </div>
    );
  }

  const actions = [
    { icon: BarChart3, title: 'Skill Gaps', desc: 'The skills missing from your target role, ranked by demand.', href: '/gaps' },
    { icon: BookOpen, title: 'Learning Resources', desc: 'Curated docs and videos for the topics that matter.', href: '/learn' },
    { icon: Code2, title: 'SQL & Code Sandbox', desc: 'Solve production-style challenges with live grading.', href: '/sandbox' },
    { icon: Target, title: 'Diagnostic Test', desc: 'A timed, auto-graded check of your SQL & Node fundamentals.', href: '/assessment' },
    { icon: Wrench, title: 'Projects to Build', desc: 'Portfolio projects matched to your target role.', href: '/actions' },
    { icon: Briefcase, title: 'Matching Jobs', desc: 'Roles ranked against your verified skills.', href: '/jobs' }
  ];

  const stats = [
    { label: 'Skill gaps', value: gaps.length, href: '/gaps' },
    { label: 'Project ideas', value: recommendations.length, href: '/actions' },
    { label: 'Matching jobs', value: jobMatches.length, href: '/jobs' }
  ];

  return (
    <div className="stack stack-lg">
      <PageHeader
        title={`Welcome back${currentProfile?.fullName ? `, ${currentProfile.fullName.split(' ')[0]}` : ''}`}
        subtitle={<>Target role: <strong>{role?.title || 'Selected role'}</strong></>}
      />

      <div className="dash-next">
        <span className="dash-next-icon"><Compass size={20} aria-hidden="true" /></span>
        <div className="dash-next-body">
          <div className="dash-next-title">
            {skillProgress ? 'Keep building evidence' : 'Start with the diagnostic'}
          </div>
          <div className="dash-next-sub">
            {skillProgress
              ? 'Continue the assessment to strengthen your Skill Passport.'
              : 'Measure your SQL & Node fundamentals to unlock gaps and job matches.'}
          </div>
        </div>
        <button className="btn btn-primary" onClick={() => go('/assessment')}>
          {skillProgress ? 'Continue assessment' : 'Take the diagnostic'} <ArrowRight size={14} />
        </button>
      </div>

      <div className="dash-stats">
        {stats.map(s => (
          <button key={s.label} className="dash-stat" onClick={() => go(s.href)}>
            <span className="dash-stat-value">{s.value}</span>
            <span className="dash-stat-label">{s.label}</span>
          </button>
        ))}
      </div>

      <section>
        <div className="section-head" style={{ marginBottom: '0.75rem' }}>
          <h2 className="section-title">Jump back in</h2>
        </div>
        <div className="dash-grid">
          {actions.map(a => (
            <button key={a.title} className="dash-action" onClick={() => go(a.href)}>
              <span className="dash-action-icon"><a.icon size={18} aria-hidden="true" /></span>
              <span className="dash-action-body">
                <span className="dash-action-title">{a.title}</span>
                <span className="dash-action-desc">{a.desc}</span>
              </span>
              <ArrowRight size={16} className="dash-action-arrow" aria-hidden="true" />
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
