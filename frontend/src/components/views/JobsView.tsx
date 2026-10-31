'use client';

import { useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import type { JobMatchResult } from '@skillbridge/types';
import { useSkillBridge } from '@/lib/skillbridge-context';
import { safeExternalUrl } from '@/lib/safe-url';
import { RolePromptView, SignInPromptView } from './prompts';
import {
  Briefcase,
  Building2,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  ExternalLink,
  Globe2,
  Home,
  MapPin,
  Search,
  Sparkles,
  Target,
  X,
  XCircle
} from 'lucide-react';

const PAGE_SIZE = 8;
const DAY_MS = 24 * 60 * 60 * 1000;
const FRESHNESS_DAYS = 3;

type PageItem = number | 'gap-start' | 'gap-end';

function buildPageItems(current: number, total: number): PageItem[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  if (current <= 4) return [1, 2, 3, 4, 5, 'gap-end', total];
  if (current >= total - 3) {
    return [1, 'gap-start', total - 4, total - 3, total - 2, total - 1, total];
  }
  return [1, 'gap-start', current - 1, current, current + 1, 'gap-end', total];
}

function companyInitials(company: string): string {
  const words = company
    .trim()
    .split(/\s+/)
    .map(word => word.replace(/^[^A-Za-z0-9]+/, ''))
    .filter(Boolean);
  if (words.length === 0) return company.trim().slice(0, 2).toUpperCase() || '?';
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return `${words[0][0]}${words[1][0]}`.toUpperCase();
}

function postedDate(value: string): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function relativePostedLabel(value: string): string | null {
  const date = postedDate(value);
  if (!date) return null;
  const days = Math.floor((Date.now() - date.getTime()) / DAY_MS);
  if (days <= 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function longPostedLabel(value: string): string {
  const date = postedDate(value);
  return date
    ? date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
    : 'Unknown';
}

function isNewPosting(value: string): boolean {
  const date = postedDate(value);
  return !!date && Date.now() - date.getTime() < DAY_MS;
}

function matchesSearch(match: JobMatchResult, terms: string[]): boolean {
  if (terms.length === 0) return true;
  const job = match.job;
  const haystack = [
    job.title,
    job.company,
    job.location,
    job.description,
    job.sourceName,
    ...(job.requiredSkillIds || []),
    ...(job.preferredSkillIds || []),
    ...match.matchedSkills.map(s => s.canonicalName),
    ...match.missingSkills.map(s => s.canonicalName)
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  return terms.every(term => haystack.includes(term));
}

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
  const [query, setQuery] = useState('');

  const filteredMatches = useMemo(() => {
    const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
    const searched = jobMatches.filter(match => matchesSearch(match, terms));

    const regionMatches = searched.filter(match => {
      if (jobRegionFilter === 'BANGLADESH') return !!match.job.isBangladesh;
      if (jobRegionFilter === 'INTERNATIONAL') return !match.job.isBangladesh;
      return true;
    });

    const remoteFiltered = regionMatches.filter(match => {
      if (jobRemoteFilter === 'REMOTE') return !!match.job.isRemote;
      if (jobRemoteFilter === 'ONSITE') return !match.job.isRemote;
      return true;
    });

    const sorted = [...remoteFiltered];
    if (jobSort === 'recent') {
      sorted.sort((a, b) => {
        const aTime = postedDate(a.job.postedAt)?.getTime() || 0;
        const bTime = postedDate(b.job.postedAt)?.getTime() || 0;
        return bTime - aTime;
      });
    } else {
      sorted.sort((a, b) => {
        const pa = (a.job.isBangladesh && !a.job.isRemote) ? 0 : a.job.isRemote ? 1 : 2;
        const pb = (b.job.isBangladesh && !b.job.isRemote) ? 0 : b.job.isRemote ? 1 : 2;
        if (pa !== pb) return pa - pb;
        return (b.matchScore ?? 0) - (a.matchScore ?? 0);
      });
    }
    return sorted;
  }, [jobMatches, jobRegionFilter, jobRemoteFilter, jobSort, query]);

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
  const remoteCount = jobMatches.filter(m => m.job.isRemote).length;
  const onsiteCount = jobMatches.length - remoteCount;
  const hasActiveFilters = !!(query.trim() || jobRegionFilter !== 'ALL' || jobRemoteFilter !== 'ALL');

  const totalPages = Math.max(1, Math.ceil(filteredMatches.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const startIdx = (safePage - 1) * PAGE_SIZE;
  const pageMatches = filteredMatches.slice(startIdx, startIdx + PAGE_SIZE);
  const rangeStart = filteredMatches.length === 0 ? 0 : startIdx + 1;
  const rangeEnd = Math.min(startIdx + PAGE_SIZE, filteredMatches.length);
  const pageItems = buildPageItems(safePage, totalPages);

  const goToPage = (p: number) => {
    setPage(Math.max(1, Math.min(totalPages, p)));
  };

  const resetFilters = () => {
    setQuery('');
    setJobRegionFilter('ALL');
    setJobRemoteFilter('ALL');
    setJobSort('recent');
    setPage(1);
  };

  return (
    <div className="jobs-page">
      <div className="page-header jobs-header">
        <div>
          <div className="jobs-kicker">Job matches</div>
          <h1 className="page-title">Fresh engineering roles, ranked for you</h1>
          <p className="page-subtitle">
            Only roles posted in the last {FRESHNESS_DAYS} days make it here. Each one is ranked against
            your verified skills, with on-site roles in Bangladesh first, then remote, then other on-site postings.
          </p>
        </div>
        <div className="jobs-header-stat" aria-label={`${jobMatches.length} live roles`}>
          <span className="jobs-header-stat-num">{jobMatches.length}</span>
          <span className="jobs-header-stat-label">live roles</span>
        </div>
      </div>

      <section className="jobs-toolbar" aria-label="Search and filter jobs">
        <div className="jobs-toolbar-top">
          <label className="jobs-search">
            <Search size={16} aria-hidden="true" />
            <input
              type="search"
              value={query}
              onChange={event => { setQuery(event.target.value); setPage(1); }}
              placeholder="Search roles, companies, or skills..."
              aria-label="Search jobs"
            />
            {query && (
              <button
                type="button"
                className="jobs-search-clear"
                onClick={() => { setQuery(''); setPage(1); }}
                aria-label="Clear search"
              >
                <X size={14} />
              </button>
            )}
          </label>
          <span className="jobs-fresh-pill">
            <Sparkles size={13} aria-hidden="true" />
            Fresh for {FRESHNESS_DAYS} days
          </span>
        </div>

        <div className="jobs-filter-grid">
          <div className="jobs-filter-group">
            <span className="jobs-filter-label">Region</span>
            <div className="jobs-segment-group">
              {([
                { key: 'ALL', label: 'All', count: jobMatches.length },
                { key: 'BANGLADESH', label: 'Bangladesh', count: bdCount },
                { key: 'INTERNATIONAL', label: 'International', count: internationalCount }
              ] as const).map(o => (
                <button
                  key={o.key}
                  className={`jobs-segment-btn ${jobRegionFilter === o.key ? 'active' : ''}`}
                  onClick={() => { setJobRegionFilter(o.key); setPage(1); }}
                >
                  {o.label}
                  <span className="jobs-segment-count">{o.count}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="jobs-filter-group">
            <span className="jobs-filter-label">Work mode</span>
            <div className="jobs-segment-group">
              {([
                { key: 'ALL', label: 'All modes' },
                { key: 'REMOTE', label: 'Remote', count: remoteCount },
                { key: 'ONSITE', label: 'On-site', count: onsiteCount }
              ] as const).map(o => (
                <button
                  key={o.key}
                  className={`jobs-segment-btn ${jobRemoteFilter === o.key ? 'active' : ''}`}
                  onClick={() => { setJobRemoteFilter(o.key); setPage(1); }}
                >
                  {o.label}
                  {'count' in o && <span className="jobs-segment-count">{o.count}</span>}
                </button>
              ))}
            </div>
          </div>

          <div className="jobs-filter-group">
            <span className="jobs-filter-label">Sort by</span>
            <div className="jobs-segment-group">
              {([
                { key: 'recent', label: 'Newest' },
                { key: 'priority', label: 'Best fit' }
              ] as const).map(o => (
                <button
                  key={o.key}
                  className={`jobs-segment-btn ${jobSort === o.key ? 'active' : ''}`}
                  onClick={() => { setJobSort(o.key); setPage(1); }}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="jobs-toolbar-foot">
          <span className="jobs-result-summary">
            {filteredMatches.length === 0
              ? 'No roles found'
              : `Showing ${rangeStart}–${rangeEnd} of ${filteredMatches.length} role${filteredMatches.length === 1 ? '' : 's'}`}
          </span>
          <span className="jobs-window-note">
            <Clock size={12} aria-hidden="true" />
            Listings auto-remove after {FRESHNESS_DAYS} days
          </span>
        </div>
      </section>

      <div className="jobs-results">
        <div className="jobs-list">
          {filteredMatches.length === 0 && (
            <div className="card jobs-empty">
              <div className="jobs-empty-icon" aria-hidden="true">
                {jobMatches.length === 0 ? <Briefcase size={22} /> : <Search size={22} />}
              </div>
              <h3 className="jobs-empty-title">
                {jobMatches.length === 0 ? 'No fresh roles yet' : 'No roles match those filters'}
              </h3>
              <p className="jobs-empty-copy">
                {jobMatches.length === 0
                  ? 'New postings appear after the next ingestion run. Check back shortly — stale roles are removed automatically.'
                  : 'Try a different keyword, region, or work mode. Fresh roles are added throughout the day.'}
              </p>
              {jobMatches.length > 0 && hasActiveFilters && (
                <button className="btn btn-secondary jobs-empty-btn" onClick={resetFilters}>
                  Reset filters
                </button>
              )}
            </div>
          )}

          {pageMatches.map(match => {
            const score = Math.round(match.matchScore);
            const scoreTier = score >= 70 ? 'high' : score >= 45 ? 'mid' : 'low';
            const isExpanded = expandedMatchId === match.job.id;
            const dateLabel = relativePostedLabel(match.job.postedAt);
            const isNew = isNewPosting(match.job.postedAt);
            const applyUrl = safeExternalUrl(match.job.sourceUrl);
            const totalSkills = match.matchedSkills.length + match.missingSkills.length;
            const location = match.job.location?.trim();

            return (
              <article key={match.job.id} className={`card job-card ${isExpanded ? 'expanded' : ''}`}>
                <div className="job-card-head">
                  <div className="job-company-mark" aria-hidden="true">
                    {companyInitials(match.job.company)}
                  </div>

                  <div className="job-card-identity">
                    <div className="job-card-title-row">
                      <h3 className="job-card-title">{match.job.title}</h3>
                      {isNew && <span className="job-new-badge">New</span>}
                    </div>
                    <div className="job-card-company">
                      <span className="job-company-name">
                        <Building2 size={13} aria-hidden="true" />
                        {match.job.company}
                      </span>
                      {location && (
                        <span className="job-card-location">
                          <MapPin size={12} aria-hidden="true" />
                          {location}
                        </span>
                      )}
                    </div>
                  </div>

                  <div
                    className={`job-match-ring job-match-ring-${scoreTier}`}
                    style={{ '--match-pct': `${score}%` } as CSSProperties}
                    aria-label={`${score} percent match`}
                  >
                    <div className="job-match-ring-inner">
                      <span className="job-match-score">{score}%</span>
                      <span className="job-match-label">match</span>
                    </div>
                  </div>
                </div>

                <div className="job-card-badges">
                  <span className={`job-flag ${match.job.isRemote ? 'job-flag-remote' : 'job-flag-onsite'}`}>
                    {match.job.isRemote ? <Home size={11} aria-hidden="true" /> : <Briefcase size={11} aria-hidden="true" />}
                    {match.job.isRemote ? 'Remote' : 'On-site'}
                  </span>
                  {match.job.isBangladesh && (
                    <span className="job-flag job-flag-bd">
                      <Globe2 size={11} aria-hidden="true" />
                      Bangladesh
                    </span>
                  )}
                  {dateLabel && (
                    <span className="job-card-date">
                      <Calendar size={11} aria-hidden="true" />
                      Posted {dateLabel}
                    </span>
                  )}
                  {match.job.sourceName && (
                    <span className="job-card-source">{match.job.sourceName}</span>
                  )}
                </div>

                <p className="job-card-desc">{match.job.description}</p>

                <div className="job-card-skills">
                  <span className="job-card-skills-label">Verified matches</span>
                  <div className="job-card-skill-chips">
                    {match.matchedSkills.map(m => (
                      <span key={m.skillId} className="job-skill-chip">
                        <CheckCircle2 size={11} aria-hidden="true" />
                        {m.canonicalName}
                      </span>
                    ))}
                    {match.matchedSkills.length === 0 && (
                      <span className="job-skill-chip job-skill-chip-empty">None yet</span>
                    )}
                  </div>
                </div>

                <div className="job-card-footer">
                  <span className="job-card-match-note">
                    {match.matchedSkills.length} of {totalSkills} skill{totalSkills === 1 ? '' : 's'} matched
                  </span>
                  <div className="job-card-actions">
                    <button
                      className="btn btn-ghost job-card-toggle"
                      onClick={() => setExpandedMatchId(isExpanded ? null : match.job.id)}
                      aria-expanded={isExpanded}
                    >
                      {isExpanded ? 'Hide details' : 'View details'}
                      <ChevronDown size={14} className={isExpanded ? 'rotate-180' : ''} />
                    </button>
                    {applyUrl && (
                      <a
                        className="btn btn-primary job-card-apply"
                        href={applyUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Apply
                        <ExternalLink size={13} aria-hidden="true" />
                      </a>
                    )}
                  </div>
                </div>

                {isExpanded && (
                  <div className="job-card-details">
                    <div className="job-detail-section">
                      <div className="job-detail-heading">
                        <Target size={13} aria-hidden="true" />
                        Why this matches
                      </div>
                      <p className="job-card-explanation">{match.explanation}</p>
                    </div>

                    {match.missingSkills.length > 0 && (
                      <div className="job-card-missing">
                        <span className="job-card-missing-label">Skills to build next</span>
                        <div className="job-card-missing-chips">
                          {match.missingSkills.map(m => (
                            <span key={m.skillId} className="job-missing-chip">
                              <XCircle size={11} aria-hidden="true" />
                              {m.canonicalName}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="job-facts">
                      <div className="job-fact">
                        <span className="job-fact-label">Posted</span>
                        <span className="job-fact-value">{longPostedLabel(match.job.postedAt)}</span>
                      </div>
                      <div className="job-fact">
                        <span className="job-fact-label">Work mode</span>
                        <span className="job-fact-value">{match.job.isRemote ? 'Remote' : 'On-site'}</span>
                      </div>
                      <div className="job-fact">
                        <span className="job-fact-label">Location</span>
                        <span className="job-fact-value">{location || 'Not specified'}</span>
                      </div>
                      <div className="job-fact">
                        <span className="job-fact-label">Source</span>
                        <span className="job-fact-value">{match.job.sourceName || 'Direct posting'}</span>
                      </div>
                    </div>

                    {applyUrl && (
                      <div className="job-detail-actions">
                        <a
                          className="btn btn-secondary job-detail-link"
                          href={applyUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          View original posting
                          <ExternalLink size={13} aria-hidden="true" />
                        </a>
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
              className="jobs-page-btn jobs-page-arrow"
              onClick={() => goToPage(safePage - 1)}
              disabled={safePage === 1}
              aria-label="Previous page"
            >
              <ChevronLeft size={15} />
            </button>
            {pageItems.map(item =>
              typeof item === 'number' ? (
                <button
                  key={item}
                  className={`jobs-page-btn ${item === safePage ? 'active' : ''}`}
                  onClick={() => goToPage(item)}
                  aria-label={`Page ${item}`}
                  aria-current={item === safePage ? 'page' : undefined}
                >
                  {item}
                </button>
              ) : (
                <span key={item} className="jobs-page-gap" aria-hidden="true">…</span>
              )
            )}
            <button
              className="jobs-page-btn jobs-page-arrow"
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
