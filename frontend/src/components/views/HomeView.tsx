'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import {
  BookOpen, BarChart3, GraduationCap, Target, Code2, Wrench,
  Briefcase, ArrowRight, Compass
} from 'lucide-react';
import { useSkillBridge } from '@/lib/skillbridge-context';
import { RolePromptView } from './prompts';
import { PageHeader } from '@/components/ui/primitives';

export default function HomeView() {
  const router = useRouter();
  const { currentProfile, role, activeTargetRoleId, gaps, recommendations, jobMatches, skillProgress } = useSkillBridge();

  const go = (p: string) => router.push(p);

  const primaryActions = [
    {
      icon: BookOpen,
      title: 'Learning Resources',
      desc: '17 topics with curated docs, videos, job demand and sector insights.',
      href: '/learn',
      color: 'var(--accent-primary)'
    },
    {
      icon: Target,
      title: 'Diagnostic Test',
      desc: 'Timed, test-asserted benchmark of your SQL & Node.js fundamentals.',
      href: '/assessment',
      color: 'var(--info)'
    },
    {
      icon: Code2,
      title: 'SQL & Code Sandbox',
      desc: 'Solve production-style challenges with live grading.',
      href: '/sandbox',
      color: 'var(--success)'
    },
    {
      icon: BarChart3,
      title: 'Skill Gaps',
      desc: 'Your highest-leverage missing skills, prioritized for you.',
      href: '/gaps',
      color: 'var(--warning)'
    },
    {
      icon: Wrench,
      title: 'Projects to Build',
      desc: 'Evidence-backed portfolio projects matched to your target role.',
      href: '/actions',
      color: 'var(--teal)'
    },
    {
      icon: Briefcase,
      title: 'Matching Jobs',
      desc: 'Roles ranked by explainable match to your verified skills.',
      href: '/jobs',
      color: 'var(--danger)'
    }
  ];

  const learnerCounts = [
    { label: 'Skill gaps identified', value: gaps.length, href: '/gaps' },
    { label: 'Project recommendations', value: recommendations.length, href: '/actions' },
    { label: 'Matching jobs', value: jobMatches.length, href: '/jobs' }
  ];

  if (!activeTargetRoleId) {
    return (
      <div>
        <PageHeader
          title="Welcome back"
          subtitle="Set up your target role to unlock your personalized roadmap."
        />
        <RolePromptView />
      </div>
    );
  }

  return (
    <div className="stack stack-lg">
      <PageHeader
        title={`Welcome back${currentProfile?.fullName ? `, ${currentProfile.fullName.split(' ')[0]}` : ''}`}
        subtitle={<>Target role: <strong>{role?.title || 'Selected role'}</strong>. Here&apos;s your personalized roadmap.</>}
        actions={
          <button className="btn btn-secondary" onClick={() => go('/market')}>
            <GraduationCap size={14} /> Market Demand
          </button>
        }
      />

      <div className="stat-grid-3">
        {learnerCounts.map(stat => (
          <button
            key={stat.label}
            className="stat-card"
            onClick={() => go(stat.href)}
            style={{ textAlign: 'left', cursor: 'pointer' }}
          >
            <div className="stat-label">{stat.label}</div>
            <div className="stat-value">{stat.value}</div>
            <div className="stat-sub" style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', color: 'var(--accent-text)' }}>
              Open <ArrowRight size={12} />
            </div>
          </button>
        ))}
      </div>

      <section>
        <div className="learn-section-head" style={{ marginBottom: '0.75rem' }}>
          <Target size={18} />
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)' }}>Jump back in</h2>
        </div>
        <div className="home-actions-grid">
          {primaryActions.map(action => (
            <button
              key={action.title}
              className="home-action-card"
              onClick={() => go(action.href)}
            >
              <span className="home-action-icon" style={{ background: action.color }}>
                <action.icon size={18} color="#fff" />
              </span>
              <span className="flex-1 stack-sm" style={{ gap: '0.2rem' }}>
                <span className="home-action-title">{action.title}</span>
                <span className="home-action-desc">{action.desc}</span>
              </span>
              <ArrowRight size={16} className="home-action-arrow" />
            </button>
          ))}
        </div>
      </section>

      {skillProgress && (
        <section className="card">
          <div className="row-between" style={{ flexWrap: 'wrap' }}>
            <div className="row">
              <Compass size={20} style={{ color: 'var(--accent-text)', flexShrink: 0 }} />
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>Keep building evidence</div>
                <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>Continue your assessments to strengthen your Skill Passport.</div>
              </div>
            </div>
            <button className="btn btn-primary" onClick={() => go('/assessment')} style={{ fontSize: '0.82rem' }}>
              Continue Assessment <ArrowRight size={14} />
            </button>
          </div>
        </section>
      )}
    </div>
  );
}