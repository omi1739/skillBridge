'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import {
  BookOpen, BarChart3, GraduationCap, Target, Code2, Wrench,
  Briefcase, ArrowRight, Compass
} from 'lucide-react';
import { useSkillBridge } from '@/lib/skillbridge-context';
import { RolePromptView } from './prompts';

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
      color: 'var(--danger-shadow, var(--danger))'
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
        <div className="page-header">
          <div>
            <h1 className="page-title">Welcome back</h1>
            <p className="page-subtitle">Set up your target role to unlock your personalized roadmap.</p>
          </div>
        </div>
        <RolePromptView />
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">Welcome back{currentProfile?.fullName ? `, ${currentProfile.fullName.split(' ')[0]}` : ''}</h1>
          <p className="page-subtitle">
            Target role: <strong>{role?.title || 'Selected role'}</strong>. Here&apos;s your personalized roadmap.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <button className="btn btn-secondary" onClick={() => go('/market')}>
            <GraduationCap size={14} /> Market Demand
          </button>
        </div>
      </div>

      <div className="stat-grid-3">
        {learnerCounts.map(stat => (
          <button
            key={stat.label}
            className="stat-card"
            onClick={() => go(stat.href)}
            style={{ textAlign: 'left', cursor: 'pointer', border: '1px solid var(--border-color)', background: 'var(--bg-card)', borderRadius: 'var(--radius-md)', padding: '1.25rem 1.5rem', transition: 'border-color 0.14s ease' }}
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
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem', minWidth: 0 }}>
                <span className="home-action-title">{action.title}</span>
                <span className="home-action-desc">{action.desc}</span>
              </div>
              <ArrowRight size={16} className="home-action-arrow" />
            </button>
          ))}
        </div>
      </section>

      {skillProgress && (
        <section className="card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Compass size={20} style={{ color: 'var(--accent-text)' }} />
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>Keep building evidence</div>
              <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>Continue your assessments to strengthen your Skill Passport.</div>
            </div>
          </div>
          <button className="btn btn-primary" onClick={() => go('/assessment')} style={{ fontSize: '0.82rem' }}>
            Continue Assessment <ArrowRight size={14} />
          </button>
        </section>
      )}
    </div>
  );
}