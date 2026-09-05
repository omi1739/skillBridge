'use client';

import { useSkillBridge } from '@/lib/skillbridge-context';
import { RemoteBadge } from '@/components/ui/badges';
import { RolePromptView, SignInPromptView } from './prompts';

export default function JobsView() {
  const {
    currentUser,
    activeTargetRoleId,
    jobMatches,
    expandedMatchId,
    setExpandedMatchId,
    jobRemoteFilter,
    setJobRemoteFilter,
    jobRegionFilter,
    setJobRegionFilter,
    jobSort,
    setJobSort,
  } = useSkillBridge();

  if (!currentUser) {
    return (
      <SignInPromptView
        title="Sign in to see matching jobs"
        subtitle="Job matches are computed against your demonstrated skill evidence and ranked by compatibility for your target role."
      />
    );
  }
  if (!activeTargetRoleId) return <RolePromptView />;

  const bdCount = jobMatches.filter(m => m.job.isBangladesh).length;
  const internationalCount = jobMatches.length - bdCount;
  const bdOnsite = jobMatches.filter(m => m.job.isBangladesh && !m.job.isRemote).length;
  const bdRemote = jobMatches.filter(m => m.job.isBangladesh && m.job.isRemote).length;
  const remoteCount = jobMatches.filter(m => m.job.isRemote).length;

  const regionMatches = jobMatches.filter(match => {
    if (jobRegionFilter === 'BANGLADESH') return !!match.job.isBangladesh;
    if (jobRegionFilter === 'INTERNATIONAL') return !match.job.isBangladesh;
    return true;
  });

  const remoteFiltered = regionMatches.filter(match => {
    if (jobRemoteFilter === 'REMOTE') return !!match.job.isRemote;
    if (jobRemoteFilter === 'ONSITE') return !match.job.isRemote;
    return true;
  });

  const filteredMatches = [...remoteFiltered].sort((a, b) => {
    if (jobSort === 'recent') {
      return new Date(b.job.postedAt).getTime() - new Date(a.job.postedAt).getTime();
    }
    const pa = (a.job.isBangladesh && !a.job.isRemote) ? 0 : a.job.isRemote ? 1 : 2;
    const pb = (b.job.isBangladesh && !b.job.isRemote) ? 0 : b.job.isRemote ? 1 : 2;
    if (pa !== pb) return pa - pb;
    return (b.matchScore ?? 0) - (a.matchScore ?? 0);
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">Matching Backend Jobs</h1>
          <p className="page-subtitle">
            Bangladesh-first: on-site roles in Bangladesh are shown first, then remote / work-from-home, then other on-site postings. Compatibility scores are computed directly against your demonstrated skill evidence with full requirement traceability.
          </p>
        </div>
      </div>

      <div className="filter-bar">
        <div className="filter-row">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>Region:</span>
            <div className="filter-segment-group">
              {([
                { key: 'ALL', label: `All (${jobMatches.length})` },
                { key: 'BANGLADESH', label: `Bangladesh (${bdCount})` },
                { key: 'INTERNATIONAL', label: `International (${internationalCount})` }
              ] as const).map(o => (
                <button
                  key={o.key}
                  className={`filter-segment-btn ${jobRegionFilter === o.key ? 'active' : ''}`}
                  onClick={() => setJobRegionFilter(o.key)}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>Work Mode:</span>
            <div className="filter-segment-group">
              {([
                { key: 'ALL', label: 'All Modes' },
                { key: 'REMOTE', label: `Remote / WFH (${remoteCount})` },
                { key: 'ONSITE', label: `Onsite (${jobMatches.length - remoteCount})` }
              ] as const).map(o => (
                <button
                  key={o.key}
                  className={`filter-segment-btn ${jobRemoteFilter === o.key ? 'active' : ''}`}
                  onClick={() => setJobRemoteFilter(o.key)}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem', paddingTop: '0.65rem', borderTop: '1px solid var(--border-subtle)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>Sort by:</span>
            <div className="filter-segment-group">
              {([
                { key: 'priority', label: 'Prioritize BD Onsite → Remote' },
                { key: 'recent', label: 'Most Recent' }
              ] as const).map(o => (
                <button
                  key={o.key}
                  className={`filter-segment-btn ${jobSort === o.key ? 'active' : ''}`}
                  onClick={() => setJobSort(o.key)}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </div>
          {jobSort === 'priority' && bdCount > 0 && (
            <span style={{ color: 'var(--text-muted)', fontSize: '0.74rem' }}>
              {bdOnsite} on-site in BD · {bdRemote} remote in BD
            </span>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {filteredMatches.length === 0 && (
          <div className="card" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            {jobMatches.length === 0
              ? 'No matching jobs yet — sign in and take the diagnostic to see tailored backend postings.'
              : 'No jobs match the selected filter.'}
          </div>
        )}
        {filteredMatches.map(match => (
          <div key={match.job.id} className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 700 }}>{match.job.title}</h3>
                <div style={{ color: 'var(--accent-text)', fontSize: '0.85rem', fontWeight: 500, marginTop: '0.15rem', display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                  {match.job.company}
                  {match.job.location ? <span style={{ color: 'var(--text-muted)' }}>• {match.job.location}</span> : null}
                  {match.job.isBangladesh && (
                    <span className="badge-chip" style={{ background: 'rgba(20, 184, 166, 0.1)', color: 'var(--accent-text)', border: '1px solid rgba(45, 212, 191, 0.25)' }}>
                      <span className="badge-chip-dot" style={{ background: '#2dd4bf' }} />
                      Bangladesh
                    </span>
                  )}
                  <RemoteBadge isRemote={match.job.isRemote} location={match.job.location} />
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{
                  padding: '0.35rem 0.75rem',
                  borderRadius: '6px',
                  fontFamily: 'var(--font-mono)',
                  fontWeight: 700,
                  fontSize: '1.1rem',
                  background: match.matchScore >= 70 ? 'rgba(16, 185, 129, 0.1)' : 'rgba(59, 130, 246, 0.1)',
                  color: match.matchScore >= 70 ? '#6ee7b7' : '#93c5fd',
                  border: `1px solid ${match.matchScore >= 70 ? 'rgba(16, 185, 129, 0.3)' : 'rgba(59, 130, 246, 0.3)'}`
                }}>
                  {Math.round(match.matchScore)}% Match
                </div>
              </div>
            </div>

            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: '0.75rem 0' }}>
              {match.job.description}
            </p>

            <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
              <div style={{ fontSize: '0.775rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Verified Matches: </span>
                <strong style={{ color: '#6ee7b7' }}>{match.matchedSkills.map(m => m.canonicalName).join(', ') || 'None yet'}</strong>
              </div>

              <button
                className="btn btn-secondary"
                onClick={() => setExpandedMatchId(expandedMatchId === match.job.id ? null : match.job.id)}
                style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}
              >
                {expandedMatchId === match.job.id ? 'Hide Details' : 'View Role Details'}
              </button>
            </div>

            {expandedMatchId === match.job.id && (
              <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>{match.explanation}</div>
                {match.missingSkills.length > 0 && (
                  <div style={{ fontSize: '0.775rem', marginTop: '0.5rem' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Missing Skills: </span>
                    <span style={{ color: '#fda4af' }}>{match.missingSkills.map(m => m.canonicalName).join(', ')}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
