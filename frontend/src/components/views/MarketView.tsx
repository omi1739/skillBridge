'use client';

import { useSkillBridge } from '@/lib/skillbridge-context';
import { safeExternalUrl } from '@/lib/safe-url';
import { RolePromptView } from './prompts';
import { VerificationBadge } from '@/components/ui/badges';
import {
  ArrowRight, MapPin, TrendingUp, Database, Lock, ExternalLink,
  BarChart3, Clock, CheckCircle2
} from 'lucide-react';

export default function MarketView() {
  const {
    currentUser,
    activeTargetRoleId,
    role,
    landingStats,
    allJobs,
    marketProvenance,
    expandedSkillPostings,
    setExpandedSkillPostings,
    setAuthMode,
    setShowAuthModal,
    handleDemoLogin,
    navigate
  } = useSkillBridge();

  if (currentUser && !activeTargetRoleId) return <RolePromptView />;
  if (!role) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: '2.5rem', maxWidth: '560px', margin: '2rem auto' }}>
        <div style={{
          width: '52px', height: '52px', borderRadius: '50%', margin: '0 auto 1rem',
          background: 'var(--info-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <TrendingUp size={22} style={{ color: 'var(--info)' }} />
        </div>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: '0 0 0.6rem' }}>Loading Job Market Demand…</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: '0 auto', maxWidth: '420px' }}>
          Fetching live market requirement data for the selected IT track.
        </p>
      </div>
    );
  }

  const totalJobsCount = landingStats?.jobPostings ?? allJobs.length;
  const employerCount = new Set(allJobs.map(j => j.company)).size;
  const sourceList = marketProvenance?.sources?.length
    ? marketProvenance.sources.join(' + ')
    : 'Public job APIs';
  const lastSync = marketProvenance?.lastIngestedAt
    ? new Date(marketProvenance.lastIngestedAt).toLocaleDateString()
    : 'Pending';
  const remoteCount = allJobs.filter(j => j.isRemote).length;

  const statusTiles = [
    {
      icon: MapPin,
      accent: 'info',
      label: 'Focus Region',
      value: role.marketContext.region,
      sub: 'Dhaka, Chittagong & remote hubs',
      valueClass: 'tile-value'
    },
    {
      icon: BarChart3,
      accent: 'success',
      label: 'Experience Tier',
      value: role.marketContext.experienceLevel,
      sub: 'Primary hiring tier for this track'
    },
    {
      icon: Database,
      accent: 'accent',
      label: 'Live Postings Catalog',
      value: `N = ${totalJobsCount}`,
      sub: `${employerCount} employers • ${remoteCount} remote / WFH`,
      mono: true
    }
  ];

  return (
    <div className="market-page">
      <div className="page-header">
        <div>
          <div className="market-kicker">Live Market Intelligence</div>
          <h1 className="page-title">{role.title} Job Market Demand</h1>
          <p className="page-subtitle">
            Empirical requirements derived from {totalJobsCount} verified engineering postings — remote and onsite — across the {role.marketContext.region} market.
          </p>
        </div>
      </div>

      <div className="market-meta-strip">
        <span className="market-meta-item">
          <VerificationBadge status="SOURCE_VERIFIED" />
        </span>
        <span className="market-meta-item">
          <span className="market-meta-dot market-meta-dot-teal" /> Source — {sourceList}
        </span>
        <span className="market-meta-item">
          <span className="market-meta-dot market-meta-dot-success" /> Synced {lastSync}
        </span>
        <span className="market-meta-item">
          {currentUser
            ? <><span className="market-meta-dot market-meta-dot-amber" /> {remoteCount} remote/WFH, {allJobs.length - remoteCount} onsite</>
            : <><Lock size={12} /> Sign in for the remote/onsite breakout</>}
        </span>
      </div>

      <div className="stat-grid-3 market-status-grid">
        {statusTiles.map((tile, idx) => (
          <div key={idx} className="stat-card market-status-card">
            <div className="market-status-head">
              <span className={`market-status-icon market-status-icon-${tile.accent}`}>
                <tile.icon size={16} />
              </span>
              <span className="stat-label">{tile.label}</span>
            </div>
            <div
              className={`stat-value ${tile.mono ? '' : ''}`}
              style={{ fontSize: '1.3rem', color: tile.accent !== 'accent' ? undefined : 'var(--text-link)' }}
            >
              {tile.value}
            </div>
            <div className="stat-sub">{tile.sub}</div>
          </div>
        ))}
      </div>

      <section className="card market-section">
        <div className="card-header market-section-header">
          <div>
            <div className="market-section-eyebrow">Demand by Technology</div>
            <h2 className="card-title">Required Technologies by Frequency</h2>
            <p className="card-subtitle">
              How often each technology appears in actual job requirements for {role.title.toLowerCase()} roles.
            </p>
          </div>
          {currentUser && (
            <button className="btn btn-primary" onClick={() => navigate('assessment')}>
              Take Diagnostic Test <ArrowRight size={15} />
            </button>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {role?.roleSkills ? role.roleSkills.map(rs => {
            const pct = Math.round(rs.marketDemandFrequency * 100);
            const isRequired = rs.required;
            const matchingPostings = allJobs.filter(j =>
              (j.requiredSkillIds || []).includes(rs.skillId) ||
              (j.preferredSkillIds || []).includes(rs.skillId)
            );
            const isExpanded = expandedSkillPostings?.skillId === rs.skillId;

            return (
              <div key={rs.skillId} className="market-skill-row">
                <div className="market-skill-top">
                  <div className="market-skill-name-wrap">
                    <span className="market-skill-name">
                      {rs.skill?.canonicalName || rs.skillId}
                    </span>
                    <span className={`badge ${isRequired ? 'badge-required' : 'badge-preferred'}`}>
                      {isRequired ? 'Required' : 'Preferred'}
                    </span>
                    {currentUser && (
                      <span className="market-skill-count">
                        {matchingPostings.length} of {totalJobsCount} postings
                      </span>
                    )}
                  </div>
                  <button
                    className="market-skill-pct"
                    onClick={() => {
                      if (!currentUser) {
                        setAuthMode('LOGIN');
                        setShowAuthModal(true);
                        return;
                      }
                      setExpandedSkillPostings(
                        isExpanded ? null : { skillId: rs.skillId, postings: matchingPostings }
                      );
                    }}
                    title={currentUser ? "Show the real postings used to compute this value" : "Sign in to see the real postings behind this percentage"}
                  >
                    <span className="market-skill-pct-num">{pct}%</span>
                    <span className="market-skill-pct-label">of jobs</span>
                    <ArrowRight size={12} className={isExpanded ? 'rotate-90' : ''} />
                  </button>
                </div>

                <div className="progress-container market-skill-bar">
                  <div
                    className={`progress-bar ${isRequired ? 'progress-indigo' : 'progress-cyan'}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>

                <div className="market-skill-meta">
                  <span><Clock size={12} /> Target Level: <strong>{rs.proficiencyTarget}</strong></span>
                  <span><CheckCircle2 size={12} /> Role Weight: <strong>{Math.round(rs.roleWeight * 100)}%</strong></span>
                </div>

                {isExpanded && !currentUser && (
                  <div className="market-lock-row">
                    <Lock size={16} />
                    <div>
                      <div className="market-lock-title">See the individual job postings</div>
                      <div className="market-lock-sub">
                        Create a free account or log in to view the real, verified postings behind each percentage.
                      </div>
                    </div>
                    <button className="btn btn-primary" style={{ fontSize: '0.8rem', padding: '0.4rem 0.9rem' }} onClick={handleDemoLogin}>
                      Explore Demo <ArrowRight size={13} />
                    </button>
                    <button className="btn btn-secondary" style={{ fontSize: '0.8rem', padding: '0.4rem 0.9rem' }} onClick={() => { setAuthMode('REGISTER'); setShowAuthModal(true); }}>
                      Register Free
                    </button>
                  </div>
                )}

                {isExpanded && currentUser && (
                  <div className="market-postings">
                    <div className="market-postings-title">Verifiable source postings</div>
                    {matchingPostings.length === 0 && (
                      <div className="market-postings-empty">No live postings matched yet — run ingestion.</div>
                    )}
                    {matchingPostings.slice(0, 8).map(j => (
                      <div key={j.id} className="market-posting-row">
                        <div className="market-posting-main">
                          <strong>{j.title}</strong>
                          <span className="market-posting-meta">
                            {j.company}{j.location ? ` (${j.location})` : ''}
                          </span>
                        </div>
                        <div className="market-posting-actions">
                          <span className="market-posting-source">{j.sourceName || 'Manual'}</span>
                          <VerificationBadge status={j.verificationStatus} />
                          {j.sourceUrl ? (
                            <a href={safeExternalUrl(j.sourceUrl)} target="_blank" rel="noopener noreferrer" className="btn btn-secondary market-posting-open">
                              Open <ExternalLink size={11} />
                            </a>
                          ) : null}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          }) : (
            <div className="market-loading">Loading market demand data…</div>
          )}
        </div>

        <div className="market-footnote">
          <span><strong>Computed from</strong> {totalJobsCount} live postings</span>
          <span className="market-footnote-sep" />
          <span><strong>Source</strong> {sourceList}</span>
          <span className="market-footnote-sep" />
          <span><strong>Last synced</strong> {lastSync}</span>
          <span className="market-footnote-sep" />
          <VerificationBadge status="SOURCE_VERIFIED" />
          <span className="market-footnote-note">Percentages are occurrence counts across real postings — click a value to open them.</span>
        </div>
      </section>
    </div>
  );
}