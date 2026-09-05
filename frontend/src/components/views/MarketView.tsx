'use client';

import { useSkillBridge } from '@/lib/skillbridge-context';
import { RolePromptView } from './prompts';
import { VerificationBadge } from '@/components/ui/badges';
import { ArrowRight } from 'lucide-react';

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
    if (!role) return null;
    const totalJobsCount = landingStats?.jobPostings ?? allJobs.length;
    const employerCount = new Set(allJobs.map(j => j.company)).size;
    const sourceList = marketProvenance?.sources?.length
      ? marketProvenance.sources.join(' + ')
      : 'Public job APIs';
    const lastSync = marketProvenance?.lastIngestedAt
      ? new Date(marketProvenance.lastIngestedAt).toLocaleDateString()
      : 'pending';
    const sourcesText = employerCount > 0
      ? `${employerCount} tech employers ${sourceList ? `• Source: ${sourceList}` : ''} • Synced ${lastSync}`
      : 'Live data loading…';

    const remoteCount = allJobs.filter(j => j.isRemote).length;
    const remoteSplit = currentUser
      ? `• ${remoteCount} remote/WFH • ${allJobs.length - remoteCount} onsite`
      : '• Login to see remote/WFH vs onsite breakout';

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <div className="page-header">
          <div>
            <h1 className="page-title">Junior Backend Job Market Demand</h1>
            <p className="page-subtitle">
              Empirical market requirements derived dynamically from {totalJobsCount} verified junior backend job postings — remote / work-from-home and onsite — in {role.marketContext.region}.
            </p>
          </div>
        </div>

        <div className="stat-grid-3">
          <div className="stat-card">
            <div className="stat-label">Focus Region</div>
            <div className="stat-value" style={{ fontSize: '1.25rem' }}>{role.marketContext.region}</div>
            <div className="stat-sub">Dhaka, Chittagong & Remote Hubs</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Experience Tier</div>
            <div className="stat-value" style={{ fontSize: '1.25rem' }}>{role.marketContext.experienceLevel}</div>
            <div className="stat-sub">Primary hiring tier for this track</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Live Postings Catalog</div>
            <div className="stat-value" style={{ fontSize: '1.25rem', color: 'var(--text-link)' }}>N = {totalJobsCount} Postings</div>
            <div className="stat-sub">{sourcesText}</div>
            <div className="stat-sub">{remoteSplit}</div>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <div>
              <h2 className="card-title">Required Backend Technologies by Frequency</h2>
              <p className="card-subtitle">
                How frequently each technology appears in actual job requirements for junior backend roles.
              </p>
            </div>
            {currentUser && (
              <button className="btn btn-primary" onClick={() => navigate('assessment')}>
                Take Diagnostic Test <ArrowRight size={15} />
              </button>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.15rem' }}>
            {role?.roleSkills ? role.roleSkills.map(rs => {
              const pct = Math.round(rs.marketDemandFrequency * 100);
              const isRequired = rs.required;
              const matchingPostings = allJobs.filter(j =>
                (j.requiredSkillIds || []).includes(rs.skillId) ||
                (j.preferredSkillIds || []).includes(rs.skillId)
              );
              const isExpanded = expandedSkillPostings?.skillId === rs.skillId;

              return (
                <div key={rs.skillId}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ fontWeight: 600, fontSize: '0.925rem' }}>
                        {rs.skill?.canonicalName || rs.skillId}
                      </span>
                      <span className={`badge ${isRequired ? 'badge-required' : 'badge-preferred'}`}>
                        {isRequired ? 'Required' : 'Preferred'}
                      </span>
                    </div>
                    <button
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
                      style={{
                        fontWeight: 700,
                        fontFamily: 'var(--font-mono)',
                        color: isRequired ? '#f87171' : '#60a5fa',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        textDecoration: 'underline dotted'
                      }}
                      title={currentUser ? "Show the real postings used to compute this value" : "Sign in to see the real postings behind this percentage"}
                    >
                      {pct}% of jobs
                    </button>
                  </div>

                  <div className="progress-container">
                    <div
                      className={`progress-bar ${isRequired ? 'progress-indigo' : 'progress-cyan'}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>

                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                    Target Level: <strong>{rs.proficiencyTarget}</strong> • Role Weight: <strong>{rs.roleWeight * 100}%</strong>
                    {currentUser ? <> • {matchingPostings.length} of {totalJobsCount} postings</> : null}
                  </div>

                  {isExpanded && !currentUser && (
                    <div style={{ marginTop: '0.6rem', border: '1px solid var(--border-faint)', borderRadius: '6px', padding: '1rem', background: 'var(--bg-row)', textAlign: 'center' }}>
                      <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.35rem' }}>
                        See the individual job postings
                      </div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
                        Create a free account or log in to view the real, verified postings behind each percentage.
                      </div>
                      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                        <button className="btn btn-primary" style={{ fontSize: '0.8rem', padding: '0.4rem 0.9rem' }} onClick={handleDemoLogin}>
                          Explore Demo <ArrowRight size={13} />
                        </button>
                        <button className="btn btn-secondary" style={{ fontSize: '0.8rem', padding: '0.4rem 0.9rem' }} onClick={() => { setAuthMode('REGISTER'); setShowAuthModal(true); }}>
                          Register Free
                        </button>
                      </div>
                    </div>
                  )}

                  {isExpanded && currentUser && (
                    <div style={{ marginTop: '0.6rem', border: '1px solid var(--border-faint)', borderRadius: '6px', padding: '0.7rem', background: 'var(--bg-row)' }}>
                      <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                        Verifiable source postings
                      </div>
                      {matchingPostings.length === 0 && (
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>No live postings matched yet — run ingestion.</div>
                      )}
                      {(matchingPostings.slice(0, 8)).map(j => (
                        <div key={j.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem', padding: '0.35rem 0', borderBottom: '1px solid var(--border-faint)', fontSize: '0.8rem' }}>
                          <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            <strong>{j.title}</strong>
                            <span style={{ color: 'var(--text-muted)' }}> — {j.company}{j.location ? ` (${j.location})` : ''}</span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
                            <span style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>{j.sourceName || 'Manual'}</span>
                            <VerificationBadge status={j.verificationStatus} />
                            {j.sourceUrl ? (
                              <a href={j.sourceUrl} target="_blank" rel="noopener noreferrer" className="btn btn-secondary" style={{ fontSize: '0.7rem', padding: '0.2rem 0.6rem' }}>
                                Open ↗
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
              <div style={{ color: 'var(--text-muted)', padding: '1rem 0' }}>Loading market demand data...</div>
            )}
          </div>

          <div style={{ marginTop: '1rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border-faint)', fontSize: '0.72rem', color: 'var(--text-muted)', display: 'flex', flexWrap: 'wrap', gap: '0.5rem 1.25rem', alignItems: 'center' }}>
            <span><strong style={{ color: 'var(--text-secondary)' }}>Computed from</strong> {totalJobsCount} live postings</span>
            <span><strong style={{ color: 'var(--text-secondary)' }}>Source</strong> {sourceList}</span>
            <span><strong style={{ color: 'var(--text-secondary)' }}>Last synced</strong> {lastSync}</span>
            <span><VerificationBadge status="SOURCE_VERIFIED" /></span>
            <span>Percentages are occurrence counts across real, verifiable postings — click a value to open them.</span>
          </div>
        </div>
      </div>
    );
}
