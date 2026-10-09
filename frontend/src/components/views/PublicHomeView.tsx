'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, GraduationCap, Briefcase, RefreshCcw } from 'lucide-react';
import { useSkillBridge } from '@/lib/skillbridge-context';

export default function PublicHomeView() {
  const {
    landingStats, allJobs, skills, curricula, role, marketProvenance,
    handleDemoLogin, isDemoAccessEnabled
  } = useSkillBridge();
  const router = useRouter();

  const totalJobsCount = landingStats?.jobPostings ?? allJobs.length;
  const totalSkillsCount = landingStats?.canonicalSkills ?? skills.length;
  const totalCurriculaCount = landingStats?.curriculaCount ?? curricula.length;
  const totalCompaniesCount = landingStats?.activeCompanies ?? new Set(allJobs.map(j => j.company)).size;

  const topSkills = (role?.roleSkills || [])
    .slice()
    .sort((a, b) => b.marketDemandFrequency - a.marketDemandFrequency)
    .slice(0, 6);

  const steps = [
    { n: '01', title: 'Read the market', desc: 'See which skills appear in live postings for your target role.' },
    { n: '02', title: 'Test your skills', desc: 'Timed, auto-graded SQL and code challenges in a real sandbox.' },
    { n: '03', title: 'Find the gaps', desc: 'Rank the skills you are missing by demand and current level.' },
    { n: '04', title: 'Match and apply', desc: 'Browse roles scored against your verified evidence.' }
  ];

  const audiences = [
    {
      icon: GraduationCap,
      title: 'Students finishing a CS degree',
      desc: 'Close the gap between what your syllabus covers and what employers screen for.',
      cta: 'Explore the market',
      href: '/market'
    },
    {
      icon: Briefcase,
      title: 'Job seekers targeting IT roles',
      desc: 'Prove your skills against real requirements instead of relying on a resume.',
      cta: 'Browse matching jobs',
      href: '/jobs'
    },
    {
      icon: RefreshCcw,
      title: 'Career switchers with a plan',
      desc: 'Follow a prioritized path instead of working through endless tutorials.',
      cta: 'Start the diagnostic',
      href: '/assessment'
    }
  ];

  const provenance = marketProvenance && marketProvenance.sources.length > 0
    ? `Source: ${marketProvenance.sources.join(' + ')} · ${marketProvenance.totalJobs ?? totalJobsCount} postings`
      + (marketProvenance.lastIngestedAt ? ` · synced ${new Date(marketProvenance.lastIngestedAt).toLocaleDateString()}` : '')
    : `Drawn from ${totalCompaniesCount} hiring companies`;

  return (
    <div className="lp">
      <section className="lp-hero">
        <span className="lp-eyebrow">
          <span className="lp-eyebrow-dot" /> Live job-market data
        </span>
        <h1>Know which skills employers <em>actually</em> ask for.</h1>
        <p className="lp-lead">
          SkillBridge reads live IT job postings, benchmarks your skills in a real sandbox,
          and shows the highest-value thing to learn next.
        </p>
        <div className="lp-actions">
          <button className="btn btn-primary btn-lg" onClick={() => router.push('/market')}>
            Explore the job market <ArrowRight size={16} />
          </button>
          {isDemoAccessEnabled ? (
            <button className="btn btn-secondary btn-lg" onClick={handleDemoLogin}>
              Preview with sample data
            </button>
          ) : (
            <button className="btn btn-secondary btn-lg" onClick={() => router.push('/assessment')}>
              Start the diagnostic
            </button>
          )}
        </div>

        <div className="lp-stats">
          <div className="lp-stat">
            <div className="lp-stat-value">{totalJobsCount}</div>
            <div className="lp-stat-label">Job postings analyzed</div>
          </div>
          <div className="lp-stat">
            <div className="lp-stat-value">{totalSkillsCount}</div>
            <div className="lp-stat-label">Canonical skills tracked</div>
          </div>
          <div className="lp-stat">
            <div className="lp-stat-value">{totalCurriculaCount}</div>
            <div className="lp-stat-label">University syllabi mapped</div>
          </div>
        </div>
      </section>

      {topSkills.length > 0 && (
        <section className="lp-section">
          <div className="lp-section-head">
            <h2>What employers ask for most</h2>
            <p>
              Share of live postings that list each skill for {role?.title || 'your target role'}.
            </p>
          </div>
          <div className="lp-demand">
            {topSkills.map(rs => {
              const pct = Math.round(rs.marketDemandFrequency * 100);
              return (
                <div key={rs.skillId} className="lp-demand-row">
                  <div className="lp-demand-name">
                    <span>{rs.skill?.canonicalName || rs.skillId}</span>
                    {rs.required && <span className="lp-demand-tag">Required</span>}
                  </div>
                  <div className="lp-demand-bar">
                    <span style={{ width: `${pct}%` }} />
                  </div>
                  <div className="lp-demand-pct">{pct}%</div>
                </div>
              );
            })}
            <div className="lp-provenance">
              <span>{provenance}</span>
              <button className="btn btn-secondary btn-sm" onClick={() => router.push('/market')}>
                Full market demand
              </button>
            </div>
          </div>
        </section>
      )}

      <section className="lp-section">
        <div className="lp-section-head">
          <h2>How it works</h2>
          <p>Four steps from market signal to a matched application.</p>
        </div>
        <div className="lp-steps">
          {steps.map(step => (
            <div key={step.n} className="lp-step">
              <div className="lp-step-num">{step.n}</div>
              <h3>{step.title}</h3>
              <p>{step.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="lp-section">
        <div className="lp-section-head">
          <h2>Built for people starting their engineering career</h2>
        </div>
        <div className="lp-audience">
          {audiences.map(card => (
            <div key={card.title} className="lp-audience-card">
              <span className="lp-audience-icon"><card.icon size={19} aria-hidden="true" /></span>
              <h3>{card.title}</h3>
              <p>{card.desc}</p>
              <button className="btn btn-secondary btn-sm" onClick={() => router.push(card.href)}>
                {card.cta} <ArrowRight size={14} />
              </button>
            </div>
          ))}
        </div>
      </section>

      <section className="lp-cta">
        <h2>See where you stand</h2>
        <p>Run the diagnostic to measure your skills, then track your gaps against live demand.</p>
        <div className="lp-actions" style={{ marginTop: 0 }}>
          <button className="btn btn-primary btn-lg" onClick={() => router.push('/assessment')}>
            Start the diagnostic <ArrowRight size={16} />
          </button>
          <button className="btn btn-secondary btn-lg" onClick={() => router.push('/curriculum')}>
            Compare university syllabi
          </button>
        </div>
      </section>
    </div>
  );
}
