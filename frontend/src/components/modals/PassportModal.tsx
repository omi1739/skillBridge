'use client';

import { X, Printer, Check, Copy } from 'lucide-react';
import { useSkillBridge } from '@/lib/skillbridge-context';

export default function PassportModal() {
  const { showPassportModal, passportData, setShowPassportModal, copySuccess, handleCopyPassportMarkdown } = useSkillBridge();

  if (!showPassportModal || !passportData) return null;

  return (
    <div className="modal-backdrop">
      <div className="modal-box passport-modal-content" style={{ maxWidth: '680px', maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Verified Skills Passport</h2>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
              ID: {passportData.passportId || passportData.candidate?.candidateId || 'SKILLBRIDGE-VERIFIED'}
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button className="btn btn-secondary" onClick={() => window.print()} title="Print or Save as PDF" style={{ padding: '0.4rem 0.6rem' }}>
              <Printer size={15} /> Print
            </button>
            <button className="btn btn-secondary" onClick={handleCopyPassportMarkdown} title="Copy Markdown" style={{ padding: '0.4rem 0.6rem' }}>
              {copySuccess ? <Check size={15} color="#10b981" /> : <Copy size={15} />}
            </button>
            <button className="btn btn-ghost" onClick={() => setShowPassportModal(false)} style={{ padding: '0.4rem' }}>
              <X size={18} />
            </button>
          </div>
        </div>

        <div style={{ background: 'var(--bg-inset-panel)', padding: '1.25rem', borderRadius: '8px', border: '1px solid var(--border-color)', marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>{passportData.candidate?.name || passportData.candidate?.fullName || 'Candidate'}</h3>
              <div style={{ fontSize: '0.85rem', color: '#60a5fa' }}>{passportData.candidate?.targetRole || 'Not selected'}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Target Alignment</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#10b981', fontFamily: 'var(--font-mono)' }}>
                {passportData.metrics?.overallAlignment ?? passportData.alignmentScore ?? 0}%
              </div>
            </div>
          </div>
        </div>

        <div style={{ marginBottom: '1.25rem' }}>
          <h4 style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
            Demonstrated Competencies
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {(passportData.evidence || passportData.competencies || []).map((comp: any, idx: number) => {
              const score = comp.proficiencyScore ?? comp.proficiency ?? 0;
              return (
                <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-inset-panel)', padding: '0.75rem', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                  <div>
                    <strong style={{ fontSize: '0.875rem' }}>{comp.skillName || comp.skill || comp.skillId}</strong>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>via {comp.sourceType || comp.provenance || 'PRACTICAL_EVALUATION'}</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span className="badge badge-strength">{score >= 0.7 ? 'Proficient' : 'Competent'}</span>
                    <span style={{ fontSize: '0.8rem', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{Math.round(score * 100)}%</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          <span>Verified by SkillBridge Labor Platform</span>
          <span>Issued: {new Date().toLocaleDateString()}</span>
        </div>
      </div>
    </div>
  );
}