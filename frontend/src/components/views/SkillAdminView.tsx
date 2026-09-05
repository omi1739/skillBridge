'use client';

import { useSkillBridge } from '@/lib/skillbridge-context';
import { Database } from 'lucide-react';

export default function SkillAdminView() {
  const {
    adminSkillQuestions,
    skillAssessSelectedSkill,
    setSkillAssessSelectedSkill,
    skillAssessAvailableSkills,
    adminGenForm,
    setAdminGenForm,
    generateAdminQuestions,
    isGeneratingQuestions,
    adminQMsg,
    adminQStatusFilter,
    setAdminQStatusFilter,
    loadAdminSkillQuestions,
    setAdminQuestionStatus,
  } = useSkillBridge();

  const questions = adminSkillQuestions || [];
  return (
    <div className="card" style={{ marginBottom: '1.5rem', overflow: 'hidden', padding: '0' }}>
      <div className="card-header" style={{ alignItems: 'center', background: 'rgba(167,139,250,0.06)' }}>
        <div>
          <h2 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Database size={18} style={{ color: '#a78bfa' }} /> Skill Question Bank
          </h2>
          <p className="card-subtitle">Review AI-generated questions and manage the skill question bank.</p>
        </div>
      </div>

      <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        <div className="card" style={{ padding: '1rem' }}>
          <h3 style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: '0.75rem' }}>Generate Questions with AI</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 0.7fr auto', gap: '0.6rem', alignItems: 'end', flexWrap: 'wrap' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.72rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Skill</label>
              <select value={skillAssessSelectedSkill} onChange={(e) => setSkillAssessSelectedSkill(e.target.value)} style={{ width: '100%', padding: '0.5rem 0.6rem', background: 'var(--bg-input)', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'var(--text-primary)', fontSize: '0.8rem' }}>
                {(skillAssessAvailableSkills as any[]).map((s: any) => <option key={s.id} value={s.id}>{s.canonicalName || s.id}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.72rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Topic</label>
              <input value={adminGenForm.topic} onChange={(e) => setAdminGenForm(prev => ({ ...prev, topic: e.target.value }))} placeholder="e.g. Promises & Async" style={{ width: '100%', padding: '0.5rem 0.6rem', background: 'var(--bg-input)', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'var(--text-primary)', fontSize: '0.8rem' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.72rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Difficulty</label>
              <select value={adminGenForm.difficulty} onChange={(e) => setAdminGenForm(prev => ({ ...prev, difficulty: e.target.value }))} style={{ width: '100%', padding: '0.5rem 0.6rem', background: 'var(--bg-input)', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'var(--text-primary)', fontSize: '0.8rem' }}>
                <option value="easy">easy</option><option value="medium">medium</option><option value="hard">hard</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.72rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Type</label>
              <select value={adminGenForm.questionType} onChange={(e) => setAdminGenForm(prev => ({ ...prev, questionType: e.target.value }))} style={{ width: '100%', padding: '0.5rem 0.6rem', background: 'var(--bg-input)', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'var(--text-primary)', fontSize: '0.8rem' }}>
                <option value="MCQ">MCQ</option><option value="code_output">Code Output</option><option value="true_false">True/False</option><option value="multiple_select">Multi-Select</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.72rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Count</label>
              <input type="number" min={1} max={20} value={adminGenForm.count} onChange={(e) => setAdminGenForm(prev => ({ ...prev, count: Number(e.target.value) }))} style={{ width: '100%', padding: '0.5rem 0.6rem', background: 'var(--bg-input)', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'var(--text-primary)', fontSize: '0.8rem' }} />
            </div>
            <div>
              <button className="btn btn-primary" style={{ width: '100%' }} onClick={generateAdminQuestions} disabled={isGeneratingQuestions || !adminGenForm.topic}>
                {isGeneratingQuestions ? 'Generating…' : 'Generate'}
              </button>
            </div>
          </div>
          {adminQMsg && (
            <div style={{ marginTop: '0.6rem', fontSize: '0.82rem', color: adminQMsg.ok ? '#34d399' : '#fb7185' }}>{adminQMsg.text}</div>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>View:</span>
          <div className="badge-group" style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
            {['pending_review', 'approved', 'rejected', ''].map(st => (
              <button key={st} className={`btn ${adminQStatusFilter === st ? 'btn-primary' : 'btn-secondary'}`} style={{ fontSize: '0.75rem', padding: '0.3rem 0.7rem' }}
                onClick={() => { setAdminQStatusFilter(st); loadAdminSkillQuestions(st); }}>
                {st ? st.replace('_', ' ') : 'all'}
              </button>
            ))}
          </div>
          <button className="btn btn-secondary" style={{ marginLeft: 'auto', fontSize: '0.75rem' }} onClick={() => loadAdminSkillQuestions()}>Refresh</button>
        </div>

        {questions.length === 0 ? (
          <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', padding: '1rem 0' }}>No questions in this view.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            {questions.map((q: any) => (
              <div key={q.id} style={{ padding: '0.7rem 0.8rem', background: 'var(--bg-row)', border: '1px solid var(--border-faint)', borderRadius: '6px', fontSize: '0.82rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.6rem', flexWrap: 'wrap' }}>
                  <div style={{ whiteSpace: 'pre-wrap' }}><strong>{q.questionText}</strong></div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <span className="badge" style={{ background: 'rgba(167,139,250,0.1)', color: '#a78bfa', border: '1px solid rgba(167,139,250,0.2)' }}>{q.difficulty}</span>
                    <span className="badge badge-preferred" style={{ fontSize: '0.65rem' }}>{q.questionType}</span>
                    <span className="badge" style={{ background: q.verificationStatus === 'pending_review' ? 'rgba(245,158,11,0.1)' : 'rgba(148,163,184,0.1)', color: '#94a3b8', border: '1px solid rgba(148,163,184,0.2)', fontSize: '0.65rem', textTransform: 'capitalize' }}>{String(q.verificationStatus).replace('_', ' ')}</span>
                  </div>
                </div>
                <div style={{ marginTop: '0.4rem', color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>{q.skillName || q.skillId}</span> · Topic: {q.topic}
                  {q.codeSnippet && <pre className="code-block" style={{ marginTop: '0.35rem' }}>{q.codeSnippet}</pre>}
                </div>
                <div style={{ marginTop: '0.5rem', display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                  {q.verificationStatus !== 'approved' && (
                    <button className="btn btn-success" style={{ fontSize: '0.72rem', padding: '0.3rem 0.7rem' }} onClick={() => setAdminQuestionStatus(q.id, 'approved')}>Approve</button>
                  )}
                  {q.verificationStatus !== 'rejected' && (
                    <button className="btn btn-secondary" style={{ fontSize: '0.72rem', padding: '0.3rem 0.7rem' }} onClick={() => setAdminQuestionStatus(q.id, 'rejected')}>Reject</button>
                  )}
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginLeft: 'auto', alignSelf: 'center' }}>by {q.createdBy || 'seed'}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
