'use client';

import { useSkillBridge } from '@/lib/skillbridge-context';
import { RolePromptView, SignInPromptView, NoEvidenceView } from './prompts';

export default function GapsView() {
  const { currentUser, activeTargetRoleId, gaps, allRoles, handleRoleSelect } = useSkillBridge();

  if (!currentUser) {
    return (
      <SignInPromptView
        title="Sign in to see your personalized skill gaps"
        subtitle="Your skill gaps are computed against real evidence from the diagnostic, skill assessments, and sandbox challenges."
      />
    );
  }
  if (!activeTargetRoleId) return <RolePromptView />;
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
                  <div style={{ fontSize: '1.4rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: gap.priorityScore > 0.4 ? '#fda4af' : gap.priorityScore > 0.2 ? '#fcd34d' : '#6ee7b7' }}>
                    {gap.priorityScore.toFixed(3)}
                  </div>
                </div>
              </div>

              <div style={{ marginTop: '0.85rem', paddingTop: '0.85rem', borderTop: '1px solid var(--border-color)', display: 'flex', gap: '1.5rem', fontSize: '0.775rem', color: 'var(--text-secondary)' }}>
                <span>Role Weight: <strong>{Math.round(gap.roleWeight * 100)}%</strong></span>
                <span>Market Demand: <strong>{Math.round(gap.marketDemand * 100)}%</strong></span>
                <span>Demonstrated: <strong>{profPercentage}%</strong></span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
