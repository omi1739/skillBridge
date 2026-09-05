'use client';

import { useSkillBridge } from '@/lib/skillbridge-context';
import { BookOpen, CheckCircle2, AlertCircle } from 'lucide-react';

export default function CurriculumView() {
  const {
    curricula,
    selectedCurriculumId,
    handleCurriculumChange,
    curriculumAnalysis
  } = useSkillBridge();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">University Syllabi vs. Market Reality</h1>
          <p className="page-subtitle">
            Benchmarking academic computer science courses against modern backend production expectations.
          </p>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        {curricula.map(c => (
          <button
            key={c.id}
            className={`btn ${selectedCurriculumId === c.id ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => handleCurriculumChange(c.id)}
            style={{ fontSize: '0.825rem' }}
          >
            <BookOpen size={14} /> {c.institutionName}
          </button>
        ))}
      </div>

      {curriculumAnalysis && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="stat-grid-3">
            <div className="stat-card">
              <div className="stat-label">Syllabus Alignment Score</div>
              <div className="stat-value" style={{ color: curriculumAnalysis.marketAlignmentScore >= 65 ? '#10b981' : '#f59e0b' }}>
                {curriculumAnalysis.marketAlignmentScore}%
              </div>
              <div className="stat-sub">Coverage of Junior Backend Skills</div>
            </div>
            <div className="stat-card" style={{ gridColumn: 'span 2' }}>
              <div className="stat-label">Analysis Summary</div>
              <p style={{ fontSize: '0.875rem', color: '#e5e7eb', marginTop: '0.4rem', lineHeight: 1.5 }}>
                {curriculumAnalysis.summaryAnalysis}
              </p>
            </div>
          </div>

          <div className="grid-2">
            <div className="card">
              <h3 className="card-title" style={{ color: '#6ee7b7', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                <CheckCircle2 size={18} /> Strong Academic Foundation
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {curriculumAnalysis.strongAcademicAreas.map((item, idx) => (
                  <div key={idx} style={{ background: 'var(--bg-row)', border: '1px solid var(--border-faint)', padding: '0.85rem', borderRadius: '6px' }}>
                    <strong style={{ color: '#a7f3d0', fontSize: '0.9rem' }}>{item.skill}</strong>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                      {item.reason}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="card">
              <h3 className="card-title" style={{ color: '#fda4af', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                <AlertCircle size={18} /> Critical Market Omissions
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {curriculumAnalysis.criticalMarketOmissions.map((item, idx) => (
                  <div key={idx} style={{ background: 'rgba(251, 113, 133, 0.05)', border: '1px solid rgba(251, 113, 133, 0.16)', padding: '0.85rem', borderRadius: '6px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <strong style={{ color: '#fecdd3', fontSize: '0.9rem' }}>{item.skill}</strong>
                      <span className="badge badge-critical" style={{ fontSize: '0.675rem' }}>
                        Demanded by {item.marketDemand}% of Jobs
                      </span>
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#fb7185', fontWeight: 600, marginTop: '0.25rem' }}>
                      Academic Status: {item.academicStatus}
                    </div>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.35rem' }}>
                      Recommendation: {item.recommendation}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
