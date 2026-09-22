'use client';

import { useSkillBridge } from '@/lib/skillbridge-context';
import { RolePromptView, SignInPromptView, NoEvidenceView } from './prompts';
import { BarChart3, BookOpen } from 'lucide-react';
import Link from 'next/link';
import { resolveResources } from '@/lib/learning-resources';
import { safeExternalUrl } from '@/lib/safe-url';
import { EmptyState, Chip, Toolbar } from '@/components/ui/primitives';

export default function GapsView() {
  const { currentUser, activeTargetRoleId, gaps, allRoles, handleRoleSelect, personalDataError } = useSkillBridge();

  if (!currentUser) {
    return (
      <SignInPromptView
        title="Sign in to see your personalized skill gaps"
        subtitle="Your skill gaps are computed against real evidence from the diagnostic, skill assessments, and sandbox challenges."
      />
    );
  }
  if (!activeTargetRoleId) return <RolePromptView />;
  if (personalDataError) {
    return (
      <EmptyState
        icon={BarChart3}
        tone="danger"
        title="Could not load your skill gaps"
        subtitle="We hit an error while fetching your personalized gap analysis. Please try again."
      />
    );
  }
  if (gaps.length === 0) return <NoEvidenceView />;

  return (
    <div className="stack stack-lg">
      <div className="page-header">
        <div>
          <h1 className="page-title">My Skill Gaps & Prioritization</h1>
          <p className="page-subtitle">
            Gaps prioritized mathematically using role weight, market demand frequency, and demonstrated proficiency:
            Priority = Role Weight × Market Demand × (1 - Demonstrated Proficiency).
          </p>
        </div>
        <Toolbar>
          <span className="badge" style={{ fontSize: '0.7rem', whiteSpace: 'nowrap' }}>Target role</span>
          <select
            className="select"
            value={activeTargetRoleId}
            onChange={e => handleRoleSelect(e.target.value)}
            title="Change your target role"
          >
            {allRoles.map(r => (
              <option key={r.id} value={r.id}>{r.title}</option>
            ))}
          </select>
        </Toolbar>
      </div>

      <div className="stack stack-sm">
        {gaps.map(gap => {
          const profPercentage = Math.round(gap.demonstratedProficiency * 100);
          const statusTone = gap.status === 'MAJOR_GAP' ? 'danger' : gap.status === 'MINOR_GAP' ? 'warning' : 'success' as 'danger' | 'warning' | 'success';
          const scoreTone = gap.priorityScore > 0.4 ? 'var(--danger-text)' : gap.priorityScore > 0.2 ? 'var(--warning-text)' : 'var(--success-text)';
          return (
            <div key={gap.skillId} className="card">
              <div className="row-between" style={{ alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
                <div className="flex-1" style={{ minWidth: '240px' }}>
                  <div className="row" style={{ gap: '0.5rem', marginBottom: '0.35rem' }}>
                    <h3 style={{ fontSize: '1.05rem', fontWeight: 600 }}>{gap.skillName}</h3>
                    <Chip tone={statusTone}>
                      {gap.status === 'MAJOR_GAP' ? 'Critical Gap' : gap.status === 'MINOR_GAP' ? 'Moderate Gap' : 'Target Achieved'}
                    </Chip>
                  </div>
                  <p className="text-secondary" style={{ fontSize: '0.825rem' }}>{gap.explanation}</p>
                </div>

                <div style={{ textAlign: 'right', minWidth: '130px' }}>
                  <div className="tiny text-muted" style={{ textTransform: 'uppercase' }}>Priority Score</div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: scoreTone }}>
                    {gap.priorityScore.toFixed(3)}
                  </div>
                </div>
              </div>

              <div className="row" style={{ marginTop: '0.85rem', paddingTop: '0.85rem', borderTop: '1px solid var(--border-color)', gap: '1.5rem', fontSize: '0.775rem', color: 'var(--text-secondary)' }}>
                <span>Role Weight: <strong>{Math.round(gap.roleWeight * 100)}%</strong></span>
                <span>Market Demand: <strong>{Math.round(gap.marketDemand * 100)}%</strong></span>
                <span>Demonstrated: <strong>{profPercentage}%</strong></span>
              </div>

              {gap.status !== 'MAINTAIN' && (() => {
                const topics = resolveResources(gap.skillName);
                const topic = topics[0];
                if (!topic) return null;
                return (
                  <div className="row" style={{ marginTop: '0.85rem', paddingTop: '0.85rem', borderTop: '1px solid var(--border-subtle)', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <BookOpen size={13} style={{ color: 'var(--accent-text)', flexShrink: 0 }} />
                    <span className="small text-secondary">Improve with:</span>
                    {topic.resources.slice(0, 2).map((res, i) => (
                      <a key={i} href={safeExternalUrl(res.url)} target="_blank" rel="noreferrer" className="badge" style={{ fontSize: '0.7rem', padding: '0.2rem 0.55rem', color: 'var(--accent-text)', textDecoration: 'none' }}>
                        {res.source}
                      </a>
                    ))}
                    <Link href={`/learn#${topic.key}`} className="badge badge-preferred" style={{ fontSize: '0.7rem', textDecoration: 'none', cursor: 'pointer' }}>
                      All resources →
                    </Link>
                  </div>
                );
              })()}
            </div>
          );
        })}
      </div>
    </div>
  );
}