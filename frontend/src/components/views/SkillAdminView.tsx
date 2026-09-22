'use client';

import { useSkillBridge } from '@/lib/skillbridge-context';
import { Database } from 'lucide-react';
import { SectionCard, Field, Chip, Toolbar, EmptyState } from '@/components/ui/primitives';

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
  const statusChip = (status: string) => {
    if (status === 'approved') return <Chip tone="success">{String(status).replace('_', ' ')}</Chip>;
    if (status === 'rejected') return <Chip tone="danger">{String(status).replace('_', ' ')}</Chip>;
    return <Chip tone="warning">{String(status).replace('_', ' ')}</Chip>;
  };

  return (
    <div className="stack stack-lg">
      <SectionCard
        title={<><Database size={18} style={{ color: 'var(--violet)' }} /> Skill Question Bank</>}
        subtitle="Review AI-generated questions and manage the skill question bank."
      >
        <div className="list-item" style={{ padding: '1rem' }}>
          <h3 style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: '0.75rem' }}>Generate Questions with AI</h3>
          <div className="grid-5" style={{ alignItems: 'end' }}>
            <Field label="Skill">
              <select className="select" value={skillAssessSelectedSkill} onChange={(e) => setSkillAssessSelectedSkill(e.target.value)}>
                {(skillAssessAvailableSkills as any[]).map((s: any) => <option key={s.id} value={s.id}>{s.canonicalName || s.id}</option>)}
              </select>
            </Field>
            <Field label="Topic">
              <input className="input" value={adminGenForm.topic} onChange={(e) => setAdminGenForm(prev => ({ ...prev, topic: e.target.value }))} placeholder="e.g. Promises & Async" />
            </Field>
            <Field label="Difficulty">
              <select className="select" value={adminGenForm.difficulty} onChange={(e) => setAdminGenForm(prev => ({ ...prev, difficulty: e.target.value }))}>
                <option value="easy">easy</option><option value="medium">medium</option><option value="hard">hard</option>
              </select>
            </Field>
            <Field label="Type">
              <select className="select" value={adminGenForm.questionType} onChange={(e) => setAdminGenForm(prev => ({ ...prev, questionType: e.target.value }))}>
                <option value="MCQ">MCQ</option><option value="code_output">Code Output</option><option value="true_false">True/False</option><option value="multiple_select">Multi-Select</option>
              </select>
            </Field>
            <Field label="Count">
              <input type="number" className="input" min={1} max={20} value={adminGenForm.count} onChange={(e) => setAdminGenForm(prev => ({ ...prev, count: Number(e.target.value) }))} />
            </Field>
            <div>
              <button className="btn btn-primary" style={{ width: '100%' }} onClick={generateAdminQuestions} disabled={isGeneratingQuestions || !adminGenForm.topic}>
                {isGeneratingQuestions ? 'Generating…' : 'Generate'}
              </button>
            </div>
          </div>
          {adminQMsg && (
            <div className="small mt-4" style={{ color: adminQMsg.ok ? 'var(--success-text)' : 'var(--danger-text)' }}>{adminQMsg.text}</div>
          )}
        </div>

        <div className="toolbar mt-4">
          <span className="small text-secondary">View:</span>
          <div className="badge-group">
            {['pending_review', 'approved', 'rejected', ''].map(st => (
              <button key={st} className={`btn ${adminQStatusFilter === st ? 'btn-sm btn-primary' : 'btn-sm btn-secondary'}`}
                onClick={() => { setAdminQStatusFilter(st); loadAdminSkillQuestions(st); }}>
                {st ? st.replace('_', ' ') : 'all'}
              </button>
            ))}
          </div>
          <button className="btn btn-sm btn-secondary" style={{ marginLeft: 'auto' }} onClick={() => loadAdminSkillQuestions()}>Refresh</button>
        </div>

        <div style={{ marginTop: '1rem' }}>
          {questions.length === 0 ? (
            <EmptyState icon={Database} tone="info" compact title="No questions in this view." />
          ) : (
            <div className="stack stack-sm">
              {questions.map((q: any) => (
                <div key={q.id} className="list-item">
                  <div className="row-between" style={{ alignItems: 'flex-start' }}>
                    <div className="flex-1" style={{ whiteSpace: 'pre-wrap' }}><strong>{q.questionText}</strong></div>
                    <div className="toolbar shrink-0">
                      <Chip tone={q.difficulty === 'hard' ? 'danger' : q.difficulty === 'medium' ? 'warning' : 'info'}>{q.difficulty}</Chip>
                      <Chip tone="accent">{q.questionType}</Chip>
                      {statusChip(q.verificationStatus)}
                    </div>
                  </div>
                  <div className="small text-muted mt-3">
                    <span className="text-secondary">{q.skillName || q.skillId}</span> · Topic: {q.topic}
                    {q.codeSnippet && <pre className="code-block" style={{ marginTop: '0.35rem' }}>{q.codeSnippet}</pre>}
                  </div>
                  <div className="toolbar mt-3">
                    {q.verificationStatus !== 'approved' && (
                      <button className="btn btn-sm btn-success" onClick={() => setAdminQuestionStatus(q.id, 'approved')}>Approve</button>
                    )}
                    {q.verificationStatus !== 'rejected' && (
                      <button className="btn btn-sm btn-secondary" onClick={() => setAdminQuestionStatus(q.id, 'rejected')}>Reject</button>
                    )}
                    <span className="tiny text-muted" style={{ marginLeft: 'auto', alignSelf: 'center' }}>by {q.createdBy || 'seed'}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </SectionCard>
    </div>
  );
}