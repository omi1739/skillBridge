'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Database, ArrowRight, CheckCircle2 } from 'lucide-react';
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
    .slice(0, 6);

  return (
    <div>
      <div className="dev-hero">
        <div className="dev-hero-tag">
          <Database size={13} /> {totalJobsCount} Junior Backend Jobs Analyzed
        </div>
        <h1 className="dev-hero-title">
          Real job requirements, measured against real skills.
        </h1>
        <p className="dev-hero-desc">
          SkillBridge continuously analyzes junior backend job postings from verified employers — including remote / work-from-home roles — then tests your SQL and Node.js skills in a live sandbox to show exactly what to learn next.
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
          <span className="trust-pill"><span style={{ width: 6, height: 6, borderRadius: '50%', background: '#2dd4bf', display: 'inline-block' }} /> Verified Postings</span>
          <span className="trust-pill"><span style={{ width: 6, height: 6, borderRadius: '50%', background: '#34d399', display: 'inline-block' }} /> Live Ingestion</span>
          <span className="trust-pill"><span style={{ width: 6, height: 6, borderRadius: '50%', background: '#38bdf8', display: 'inline-block' }} /> Remote &amp; Onsite Roles</span>
          <span className="trust-pill"><span style={{ width: 6, height: 6, borderRadius: '50%', background: '#a78bfa', display: 'inline-block' }} /> Verifiable Evidence</span>
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

        {topSkills.length > 0 && (
          <div className="demand-panel">
            <div className="demand-panel-title">Live Market Data</div>
            <h2 className="demand-panel-heading">What employers ask for most</h2>
            {marketProvenance && marketProvenance.sources.length > 0 && (
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                Source: <strong style={{ color: 'var(--text-secondary)' }}>{marketProvenance.sources.join(' + ')}</strong>
                {' · '}{marketProvenance.totalJobs} postings
                {marketProvenance.lastIngestedAt ? ` · synced ${new Date(marketProvenance.lastIngestedAt).toLocaleDateString()}` : ''}
                <span style={{ marginLeft: '0.5rem' }}><VerificationBadge status="SOURCE_VERIFIED" /></span>
              </div>
            )}
            <div className="demand-list">
              {topSkills.map(rs => {
                const pct = Math.round(rs.marketDemandFrequency * 100);
                return (
                  <div key={rs.skillId}>
                    <div className="demand-row-label">
                      <span className="demand-skill">
                        <CheckCircle2 size={14} color="#5eead4" />
                        <span>{rs.skill?.canonicalName || rs.skillId}</span>
                      </span>
                      <span className="demand-pct">{pct}% of jobs</span>
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
      </div>

      <div style={{ marginTop: '3rem', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        <div className="about-section">
          <div className="about-heading">
            <span className="about-kicker">About SkillBridge</span>
            <h2 className="about-title">Built for developers ready for real backend work.</h2>
          </div>
          <div className="about-grid">
            <div className="about-card">
              <span className="about-card-kicker">Live Intelligence</span>
              <h3>Real, verified job postings</h3>
              <p>
                Continuously ingested junior backend roles — remote / work-from-home and onsite — from verified employers. Skills are derived from production requirements rather than speculative advice.
              </p>
            </div>
            <div className="about-card">
              <span className="about-card-kicker">Empirical Baseline</span>
              <h3>Skills measured, not guessed</h3>
              <p>
                Benchmark your SQL queries and Node.js code against production test assertions, pinpointing deterministic gaps standing between you and target roles.
              </p>
            </div>
            <div className="about-card">
              <span className="about-card-kicker">Transparent Matching</span>
              <h3>Verifiable evidence passport</h3>
              <p>
                Traceable match scores with full requirement breakdown. Export verified skill passports backed by live sandbox results and GitHub code verification.
              </p>
            </div>
          </div>
        </div>

        <div className="about-section">
          <div className="about-heading">
            <span className="about-kicker">How it works</span>
            <h2 className="about-title">Four steps from “what should I learn?” to “I got the job”.</h2>
          </div>
          <div className="steps-grid">
            {[
              { step: '01', title: 'Market Intelligence', desc: 'Explore exact technologies junior backend employers ask for, derived dynamically from live postings.' },
              { step: '02', title: 'Diagnostic Benchmarks', desc: 'Take practical timed challenges and run SQL & code queries against test assertions in a live sandbox.' },
              { step: '03', title: 'Gap Prioritization', desc: 'Identify high-leverage missing skills prioritized by role weight, employer frequency, and demonstrated proficiency.' },
              { step: '04', title: 'Matching Applications', desc: 'Browse matched remote and onsite postings with explainable compatibility scores and verified skill passports.' }
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
