'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Database, ArrowRight, CheckCircle2, GraduationCap, Briefcase, RefreshCcw } from 'lucide-react';
import { VerificationBadge } from '@/components/ui/badges';
import { useSkillBridge } from '@/lib/skillbridge-context';

export default function PublicHomeView() {
  const { landingStats, allJobs, skills, curricula, role, marketProvenance, handleDemoLogin } = useSkillBridge();
  const router = useRouter();
  const totalJobsCount = landingStats?.jobPostings ?? allJobs.length;
  const totalSkillsCount = landingStats?.canonicalSkills ?? skills.length;
  const totalCurriculaCount = landingStats?.curriculaCount ?? curricula.length;
  const totalCompaniesCount = landingStats?.activeCompanies ?? new Set(allJobs.map(j => j.company)).size;
  const topSkills = (role?.roleSkills || [])
    .slice()
    .sort((a, b) => b.marketDemandFrequency - a.marketDemandFrequency)
    .slice(0, 8);

  const audienceCards = [
    {
      icon: GraduationCap,
      kicker: 'Students',
      title: 'Students finishing computer science',
      desc: 'Close the gap between your syllabus and what employers actually ask for.',
      cta: 'Explore the Market',
      onClick: () => router.push('/market')
    },
    {
      icon: Briefcase,
      kicker: 'Job Seekers',
      title: 'Job seekers targeting IT engineering roles',
      desc: 'Match against verified postings and prove your skills with evidence.',
      cta: 'Browse Matching Jobs',
      onClick: () => router.push('/jobs')
    },
    {
      icon: RefreshCcw,
      kicker: 'Career Switchers',
      title: 'Career switchers with a plan',
      desc: 'Follow a prioritized, evidence-backed roadmap — not generic tutorials.',
      cta: 'Take the Diagnostic',
      onClick: () => router.push('/assessment')
    }
  ];

  return (
    <div>
      <div className="dev-hero">
        <div className="dev-hero-tag">
          <Database size={13} /> {totalJobsCount} Engineering Jobs Analyzed
        </div>
        <h1 className="dev-hero-title">
          Real job requirements, measured against real skills.
        </h1>
        <p className="dev-hero-desc">
          SkillBridge ingests live IT job postings, benchmarks your skills in a real sandbox, and shows exactly what to learn next for frontend, backend, or full-stack roles.
        </p>

        <div className="landing-actions">
          <button className="btn btn-primary" onClick={handleDemoLogin} style={{ padding: '0.7rem 1.4rem', fontSize: '0.9rem' }}>
            Explore Live Demo <ArrowRight size={15} />
          </button>
          <button className="btn btn-secondary" onClick={() => router.push('/market')} style={{ padding: '0.7rem 1.4rem', fontSize: '0.9rem' }}>
            Market Demand ({totalJobsCount})
          </button>
          <button className="btn btn-secondary" onClick={() => router.push('/curriculum')} style={{ padding: '0.7rem 1.4rem', fontSize: '0.9rem' }}>
            University Syllabi ({totalCurriculaCount})
          </button>
        </div>

        <div style={{ marginTop: '1.5rem', display: 'flex', gap: '0.75rem', flexWrap: 'wrap', justifyContent: 'center' }}>
          <span className="trust-pill"><span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--teal)', display: 'inline-block' }} /> Verified Postings</span>
          <span className="trust-pill"><span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--success)', display: 'inline-block' }} /> Live Ingestion</span>
          <span className="trust-pill"><span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--info)', display: 'inline-block' }} /> Remote &amp; Onsite</span>
        </div>

        <div className="stat-grid-3" style={{ marginTop: '2.5rem', textAlign: 'left' }}>
          <div className="stat-card">
            <div className="stat-label">Active Job Postings</div>
            <div className="stat-value">{totalJobsCount}</div>
            <div className="stat-sub">Across {totalCompaniesCount} hiring companies</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Canonical Skills</div>
            <div className="stat-value">{totalSkillsCount}</div>
            <div className="stat-sub">Normalized ontology with synonyms</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Curricula Mapped</div>
            <div className="stat-value">{totalCurriculaCount}</div>
            <div className="stat-sub">University syllabi compared in detail</div>
          </div>
        </div>
      </div>

      {topSkills.length > 0 && (
        <div className="skills-section">
          <div className="skills-section-head">
            <div>
              <div className="about-kicker">Live Market Data</div>
              <h2 className="about-title">What employers ask for most</h2>
              {marketProvenance && marketProvenance.sources.length > 0 && (
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.4rem' }}>
                  Source: <strong style={{ color: 'var(--text-secondary)' }}>{marketProvenance.sources.join(' + ')}</strong>
                  {' · '}{marketProvenance.totalJobs} postings
                  {marketProvenance.lastIngestedAt ? ` · synced ${new Date(marketProvenance.lastIngestedAt).toLocaleDateString()}` : ''}
                  <span style={{ marginLeft: '0.5rem' }}><VerificationBadge status="SOURCE_VERIFIED" /></span>
                </div>
              )}
            </div>
            <button className="btn btn-secondary" onClick={() => router.push('/market')} style={{ fontSize: '0.82rem' }}>
              Full Market Demand <ArrowRight size={14} />
            </button>
          </div>

          <div className="skills-grid">
            {topSkills.map(rs => {
              const pct = Math.round(rs.marketDemandFrequency * 100);
              return (
                <div key={rs.skillId} className="skill-card">
                  <div className="skill-card-top">
                    <span className="skill-card-check">
                      <CheckCircle2 size={15} color="var(--accent-text)" />
                    </span>
                    <span className={`badge ${rs.required ? 'badge-critical' : 'badge-preferred'}`}>
                      {rs.required ? 'Required' : 'Preferred'}
                    </span>
                  </div>
                  <div className="skill-card-name">{rs.skill?.canonicalName || rs.skillId}</div>
                  <div className="skill-card-category">{rs.skill?.category || 'Engineering'}</div>
                  <div className="skill-card-demand">
                    <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Demand in postings</span>
                    <strong style={{ fontFamily: 'var(--font-mono)', fontSize: '1.05rem' }}>{pct}%</strong>
                  </div>
                  <div className="progress-container" style={{ margin: 0 }}>
                    <div className="progress-bar progress-indigo" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div style={{ marginTop: '3rem', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        <div className="about-section">
          <div className="about-heading">
            <span className="about-kicker">About SkillBridge</span>
            <h2 className="about-title">Built for developers ready for real software engineering work.</h2>
          </div>
          <div className="about-grid">
            <div className="about-card">
              <span className="about-card-kicker">Live Intelligence</span>
              <h3>Skills from verified postings</h3>
              <p>Requirements derived from live employer postings — not speculative advice.</p>
            </div>
            <div className="about-card">
              <span className="about-card-kicker">Empirical Baseline</span>
              <h3>Skills measured, not guessed</h3>
              <p>SQL and code judged against production-grade test assertions in a live sandbox.</p>
            </div>
            <div className="about-card">
              <span className="about-card-kicker">Transparent Matching</span>
              <h3>Evidence-backed applications</h3>
              <p>Explainable match scores with a verifiable skills passport for every role.</p>
            </div>
          </div>
        </div>

        <div className="audience-section">
          <div className="about-heading" style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
            <span className="about-kicker">Who it&apos;s for</span>
            <h2 className="about-title">Three kinds of developers get the most out of SkillBridge.</h2>
          </div>
          <div className="audience-grid">
            {audienceCards.map(card => (
              <div key={card.kicker} className="audience-card">
                <span className="audience-icon"><card.icon size={18} /></span>
                <span className="about-card-kicker">{card.kicker}</span>
                <h3>{card.title}</h3>
                <p>{card.desc}</p>
                <button className="btn btn-secondary" onClick={card.onClick} style={{ marginTop: '0.5rem', fontSize: '0.8rem' }}>
                  {card.cta} <ArrowRight size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="about-section">
          <div className="about-heading">
            <span className="about-kicker">How it works</span>
            <h2 className="about-title">Four steps from skill building to job matching.</h2>
          </div>
          <div className="steps-grid">
            {[
              { step: '01', title: 'Market Intelligence', desc: 'See exactly what IT employers ask for, updated live.' },
              { step: '02', title: 'Diagnostic Benchmarks', desc: 'Practical timed challenges with test-asserted grading in a real sandbox.' },
              { step: '03', title: 'Gap Prioritization', desc: 'Know the highest-leverage missing skills and what to build next.' },
              { step: '04', title: 'Matching Applications', desc: 'Browse matched roles with explainable scores and verified evidence.' }
            ].map(item => (
              <div key={item.step} className="step-card">
                <span className="step-number">{item.step}</span>
                <h3>{item.title}</h3>
                <p>{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}