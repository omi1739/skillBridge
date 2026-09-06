'use client';

import { useMemo, useState } from 'react';
import { useSkillBridge } from '@/lib/skillbridge-context';
import { RemoteBadge } from '@/components/ui/badges';
import { RolePromptView, SignInPromptView } from './prompts';
import {
  ChevronLeft, ChevronRight, Building2, MapPin, CheckCircle2, XCircle,
  Calendar, ChevronDown, Layers
} from 'lucide-react';

const PAGE_SIZE = 6;

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

  const [page, setPage] = useState(1);

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

  const filteredMatches = useMemo(() => {
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

    let sorted = [...remoteFiltered];
    if (jobSort === 'recent') {
      sorted.sort((a, b) => new Date(b.job.postedAt).getTime() - new Date(a.job.postedAt).getTime());
    } else {
      sorted.sort((a, b) => {
        const pa = (a.job.isBangladesh && !a.job.isRemote) ? 0 : a.job.isRemote ? 1 : 2;
        const pb = (b.job.isBangladesh && !b.job.isRemote) ? 0 : b.job.isRemote ? 1 : 2;
        if (pa !== pb) return pa - pb;
        return (b.matchScore ?? 0) - (a.matchScore ?? 0);
      });
    }
    return sorted;
  }, [jobMatches, jobRegionFilter, jobRemoteFilter, jobSort]);

  const totalPages = Math.max(1, Math.ceil(filteredMatches.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const startIdx = (safePage - 1) * PAGE_SIZE;
  const pageMatches = filteredMatches.slice(startIdx, startIdx + PAGE_SIZE);

  const goToPage = (p: number) => {
    setPage(Math.max(1, Math.min(totalPages, p)));
  };

  const showDate = (m: any) => {
    const d = new Date(m.job.postedAt);
    if (isNaN(d.getTime())) return null;
    const today = new Date();
    const diffDays = Math.floor((today.getTime() - d.getTime()) / 86400000);
    if (diffDays <= 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  };

  return (
    <div className="jobs-page">
      <div className="page-header">
        <div>
          <div className="jobs-kicker">Verified Compatibility</div>
          <h1 className="page-title">Matching Backend Jobs</h1>
          <p className="page-subtitle">
            Bangladesh-first: on-site roles in Bangladesh are shown first, then remote, then other on-site postings. Scores are computed against your verified skill evidence with full requirement traceability.
          </p>
        </div>
      </div>

      <div className="filter-bar">
        <div className="filter-row">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
            <span className="filter-label">Region:</span>
            <div className="filter-segment-group">
              {([
                { key: 'ALL', label: `All (${jobMatches.length})` },
                { key: 'BANGLADESH', label: `Bangladesh (${bdCount})` },
                { key: 'INTERNATIONAL', label: `International (${internationalCount})` }
              ] as const).map(o => (
                <button
                  key={o.key}
                  className={`filter-segment-btn ${jobRegionFilter === o.key ? 'active' : ''}`}
                  onClick={() => { setJobRegionFilter(o.key); setPage(1); }}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
            <span className="filter-label">Work Mode:</span>
            <div className="filter-segment-group">
              {([
                { key: 'ALL', label: 'All Modes' },
                { key: 'REMOTE', label: `Remote / WFH (${remoteCount})` },
                { key: 'ONSITE', label: `Onsite (${jobMatches.length - remoteCount})` }
              ] as const).map(o => (
                <button
                  key={o.key}
                  className={`filter-segment-btn ${jobRemoteFilter === o.key ? 'active' : ''}`}
                  onClick={() => { setJobRemoteFilter(o.key); setPage(1); }}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="filter-bar-bottom">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            <span className="filter-label">Sort by:</span>
            <div className="filter-segment-group">
              {([
                { key: 'recent', label: 'Most Recent' },
                { key: 'priority', label: 'Prioritize BD Onsite → Remote' }
              ] as const).map(o => (
                <button
                  key={o.key}
                  className={`filter-segment-btn ${jobSort === o.key ? 'active' : ''}`}
                  onClick={() => { setJobSort(o.key); setPage(1); }}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </div>
          <span className="filter-summary">
            {filteredMatches.length} result{filteredMatches.length === 1 ? '' : 's'}
          </span>
        </div>
      </div>

      <div className="jobs-results">
        <div className="jobs-list">
          {filteredMatches.length === 0 && (
            <div className="card jobs-empty">
              {jobMatches.length === 0
                ? 'No matching jobs yet — sign in and take the diagnostic to see tailored backend postings.'
                : 'No jobs match the selected filter.'}
            </div>
          )}
          {pageMatches.map(match => {
            const score = Math.round(match.matchScore);
            const scoreTier = score >= 70 ? 'high' : score >= 45 ? 'mid' : 'low';
            const isExpanded = expandedMatchId === match.job.id;
            const dateLabel = showDate(match);
            return (
              <article key={match.job.id} className={`card job-card ${isExpanded ? 'expanded' : ''}`}>
                <div className="job-card-head">
                  <div className="job-card-identity">
                    <h3 className="job-card-title">{match.job.title}</h3>
                    <div className="job-card-company">
                      <Building2 size={13} />
                      <span>{match.job.company}</span>
                      {match.job.location ? (
                        <>
                          <span className="job-card-dot" />
                          <MapPin size={12} />
                          <span className="job-card-location">{match.job.location}</span>
                        </>
                      ) : null}
                    </div>
                    <div className="job-card-badges">
                      {match.job.isBangladesh && (
                        <span className="badge-chip" style={{ background: 'var(--teal-bg)', color: 'var(--accent-text)', border: '1px solid var(--teal-border)' }}>
                          <span className="badge-chip-dot" style={{ background: 'var(--teal)' }} />
                          Bangladesh
                        </span>
                      )}
                      <RemoteBadge isRemote={match.job.isRemote} location={match.job.location} />
                      {dateLabel && (
                        <span className="job-card-date">
                          <Calendar size={11} /> {dateLabel}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className={`match-score match-score-${scoreTier}`}>
                    <span className="match-score-num">{score}%</span>
                    <span className="match-score-label">Match</span>
                  </div>
                </div>

                <p className="job-card-desc">{match.job.description}</p>

                <div className="job-card-skills">
                  <span className="job-card-skills-label">Verified matches</span>
                  <div className="job-card-skill-chips">
                    {match.matchedSkills.map(m => (
                      <span key={m.skillId} className="job-skill-chip">
                        <CheckCircle2 size={11} />
                        {m.canonicalName}
                      </span>
                    ))}
                    {match.matchedSkills.length === 0 && (
                      <span className="job-skill-chip job-skill-chip-empty">None yet</span>
                    )}
                  </div>
                </div>

                <div className="job-card-footer">
                  <button
                    className="btn btn-secondary job-card-toggle"
                    onClick={() => setExpandedMatchId(isExpanded ? null : match.job.id)}
                    aria-expanded={isExpanded}
                  >
                    {isExpanded ? 'Hide Details' : 'View Role Details'}
                    <ChevronDown size={14} className={isExpanded ? 'rotate-180' : ''} />
                  </button>
                </div>

                {isExpanded && (
                  <div className="job-card-details">
                    <p className="job-card-explanation">{match.explanation}</p>
                    {match.missingSkills.length > 0 && (
                      <div className="job-card-missing">
                        <span className="job-card-missing-label">Missing skills</span>
                        <div className="job-card-missing-chips">
                          {match.missingSkills.map(m => (
                            <span key={m.skillId} className="job-missing-chip">
                              <XCircle size={11} />
                              {m.canonicalName}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </article>
            );
          })}
        </div>

        {filteredMatches.length > PAGE_SIZE && (
          <nav className="jobs-pagination" aria-label="Job results pagination">
            <button
              className="jobs-page-btn"
              onClick={() => goToPage(safePage - 1)}
              disabled={safePage === 1}
              aria-label="Previous page"
            >
              <ChevronLeft size={15} />
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
              <button
                key={p}
                className={`jobs-page-btn ${p === safePage ? 'active' : ''}`}
                onClick={() => goToPage(p)}
                aria-label={`Page ${p}`}
                aria-current={p === safePage ? 'page' : undefined}
              >
                {p}
              </button>
            ))}
            <button
              className="jobs-page-btn"
              onClick={() => goToPage(safePage + 1)}
              disabled={safePage === totalPages}
              aria-label="Next page"
            >
              <ChevronRight size={15} />
            </button>
          </nav>
        )}
      </div>
    </div>
  );
}