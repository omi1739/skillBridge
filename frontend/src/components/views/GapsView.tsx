'use client';

import { useSkillBridge } from '@/lib/skillbridge-context';
import { RolePromptView, SignInPromptView, NoEvidenceView } from './prompts';
import { BarChart3, BookOpen } from 'lucide-react';
import Link from 'next/link';
import { resolveResources } from '@/lib/learning-resources';
import { safeExternalUrl } from '@/lib/safe-url';

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
      <div className="card" style={{ textAlign: 'center', padding: '2.5rem', maxWidth: '560px', margin: '2rem auto' }}>
        <div style={{
          width: '52px', height: '52px', borderRadius: '50%', margin: '0 auto 1rem',
          background: 'var(--danger-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <BarChart3 size={22} style={{ color: 'var(--danger)' }} />
        </div>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: '0 0 0.6rem' }}>Could not load your skill gaps</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: '0 auto 1.5rem', maxWidth: '420px' }}>
          We hit an error while fetching your personalized gap analysis. Please try again.
        </p>
      </div>
    );
  }
  if (gaps.length === 0) return <NoEvidenceView />;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">My Skill Gaps & Prioritization</h1>
          <p className="page-subtitle">
            Gaps prioritized mathematically using role weight, market demand frequency, and demonstrated proficiency:
            Priority = Role Weight × Market Demand × (1 - Demonstrated Proficiency).
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span className="badge" style={{ fontSize: '0.7rem', whiteSpace: 'nowrap' }}>Target role</span>
          <select
            value={activeTargetRoleId}
            onChange={e => handleRoleSelect(e.target.value)}
            title="Change your target role"
            style={{ width: 'auto' }}
          >
            {allRoles.map(r => (
              <option key={r.id} value={r.id}>{r.title}</option>
            ))}
          </select>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {gaps.map(gap => {
          const profPercentage = Math.round(gap.demonstratedProficiency * 100);
          return (
            <div key={gap.skillId} className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
                <div style={{ flex: 1, minWidth: '240px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
                    <h3 style={{ fontSize: '1.05rem', fontWeight: 600 }}>{gap.skillName}</h3>
                    <span className={`badge ${gap.status === 'MAJOR_GAP' ? 'badge-critical' : gap.status === 'MINOR_GAP' ? 'badge-gap' : 'badge-strength'}`}>
                      {gap.status === 'MAJOR_GAP' ? 'Critical Gap' : gap.status === 'MINOR_GAP' ? 'Moderate Gap' : 'Target Achieved'}
                    </span>
                  </div>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.825rem' }}>
                    {gap.explanation}
                  </p>
                </div>

                <div style={{ textAlign: 'right', minWidth: '130px' }}>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                    Priority Score
                  </div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: gap.priorityScore > 0.4 ? 'var(--danger-text)' : gap.priorityScore > 0.2 ? 'var(--warning-text)' : 'var(--success-text)' }}>
                    {gap.priorityScore.toFixed(3)}
                  </div>
                </div>
              </div>

              <div style={{ marginTop: '0.85rem', paddingTop: '0.85rem', borderTop: '1px solid var(--border-color)', display: 'flex', gap: '1.5rem', fontSize: '0.775rem', color: 'var(--text-secondary)' }}>
                <span>Role Weight: <strong>{Math.round(gap.roleWeight * 100)}%</strong></span>
                <span>Market Demand: <strong>{Math.round(gap.marketDemand * 100)}%</strong></span>
                <span>Demonstrated: <strong>{profPercentage}%</strong></span>
              </div>

              {gap.status !== 'MAINTAIN' && (() => {
                const topics = resolveResources(gap.skillName);
                const topic = topics[0];
                if (!topic) return null;
                return (
                  <div style={{ marginTop: '0.85rem', paddingTop: '0.85rem', borderTop: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <BookOpen size={13} style={{ color: 'var(--accent-text)', flexShrink: 0 }} />
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Improve with:</span>
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
