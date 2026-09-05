'use client';

import { useSkillBridge } from '@/lib/skillbridge-context';
import { BrainCircuit, CheckCircle2, ShieldCheck, Check, X } from 'lucide-react';

export default function SkillAssessmentView() {
  const {
    skillAssessAvailableSkills,
    skillAssessSelectedSkill,
    setSkillAssessSelectedSkill,
    skillAssessCfg,
    setSkillAssessCfg,
    skillSession,
    skillQuestionIdx,
    skillAnswers,
    setSkillAnswers,
    skillSavedCorrect,
    isStartingSkill,
    isSubmittingSkill,
    skillAssessError,
    skillResult,
    setSkillResult,
    skillHistory,
    skillProgress,
    setSkillProgress,
    viewingResultId,
    setViewingResultId,
    startSkillAssessment,
    submitSkillAnswer,
    goSkillQuestion,
    submitSkillAssessment,
    loadSkillAssessResult,
    loadSkillAssessHistory,
    loadSkillAssessProgress,
    resetSkillAssessment,
    cancelSkillAssessment,
  } = useSkillBridge();

  const skillName =
    skillAssessAvailableSkills.find((s: any) => s.id === skillAssessSelectedSkill)?.canonicalName ||
    skillAssessSelectedSkill;

  const renderConfig = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">Skill Assessment</h1>
          <p className="page-subtitle">
            Self-assess skills with difficulty-weighted questions. Your answers are evaluated securely on the
            server and feed your verified skill profile.
          </p>
        </div>
      </div>

      <div className="card">
        <h3 className="card-title" style={{ marginBottom: '1rem' }}>Configure Assessment</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label className="auth-label" style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
              Skill
            </label>
            <select
              value={skillAssessSelectedSkill}
              onChange={(e) => { setSkillAssessSelectedSkill(e.target.value); setSkillProgress(null); loadSkillAssessProgress(e.target.value); }}
              style={{ width: '100%', padding: '0.6rem 0.8rem', background: 'var(--bg-input)', border: '1px solid var(--border-color)', borderRadius: '7px', color: 'var(--text-primary)', fontSize: '0.85rem' }}
            >
              {(skillAssessAvailableSkills as any[]).map((s: any) => (
                <option key={s.id} value={s.id}>{s.canonicalName || s.id}</option>
              ))}
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem' }}>
            {(['easy', 'medium', 'hard'] as const).map((level) => (
              <div key={level}>
                <label className="auth-label" style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'capitalize', marginBottom: '0.3rem' }}>
                  {level}
                </label>
                <input
                  type="number"
                  min={0}
                  max={30}
                  value={skillAssessCfg[level]}
                  onChange={(e) => setSkillAssessCfg(prev => ({ ...prev, [level]: Math.max(0, Number(e.target.value)) }))}
                  style={{ width: '100%', padding: '0.6rem 0.8rem', background: 'var(--bg-input)', border: '1px solid var(--border-color)', borderRadius: '7px', color: 'var(--text-primary)', fontFamily: 'var(--font-mono)', fontSize: '0.9rem' }}
                />
              </div>
            ))}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            Total questions: <strong>{skillAssessCfg.easy + skillAssessCfg.medium + skillAssessCfg.hard}</strong>
          </div>

          {skillAssessError && <div className="error-banner" style={{ color: '#f87171', fontSize: '0.82rem' }}>{skillAssessError}</div>}

          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button className="btn btn-primary" onClick={startSkillAssessment} disabled={isStartingSkill || !skillAssessSelectedSkill}>
              <BrainCircuit size={15} /> {isStartingSkill ? 'Starting…' : 'Start Skill Assessment'}
            </button>
            <button className="btn btn-secondary" onClick={loadSkillAssessHistory}>Refresh History</button>
          </div>
        </div>
      </div>

      {skillProgress && (
        <div className="card">
          <h3 className="card-title" style={{ marginBottom: '0.75rem' }}>Progress · {skillProgress.skillName}</h3>
          <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', fontSize: '0.85rem' }}>
            <div><span style={{ color: 'var(--text-muted)' }}>Attempts</span> <strong>{skillProgress.attemptCount}</strong></div>
            <div><span style={{ color: 'var(--text-muted)' }}>Average</span> <strong>{skillProgress.averageScore}%</strong></div>
            <div><span style={{ color: 'var(--text-muted)' }}>Best</span> <strong>{skillProgress.bestScore}%</strong></div>
            <div><span style={{ color: 'var(--text-muted)' }}>Latest Level</span> <strong>{skillProgress.latestSkillLevel}</strong></div>
          </div>
        </div>
      )}

      {skillHistory && skillHistory.length > 0 && (
        <div className="card">
          <h3 className="card-title" style={{ marginBottom: '0.75rem' }}>Assessment History</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {skillHistory.map((h: any) => (
              <div key={h.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.6rem 0.7rem', background: 'var(--bg-row)', border: '1px solid var(--border-faint)', borderRadius: '6px', fontSize: '0.82rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                <div>
                  <strong>{h.skillName}</strong>
                  <span style={{ color: 'var(--text-muted)' }}> · {new Date(h.completedAt).toLocaleDateString()}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <span className="badge" style={{ background: 'rgba(16,185,129,0.1)', color: '#34d399', border: '1px solid rgba(16,185,129,0.2)' }}>{h.skillLevel}</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }}>{h.score}%</span>
                  <button className="btn btn-secondary" style={{ fontSize: '0.72rem', padding: '0.3rem 0.7rem' }} onClick={() => loadSkillAssessResult(h.id)}>
                    View Result
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  const renderQuiz = () => {
    const questions = skillSession?.questions || [];
    const idx = Math.min(skillQuestionIdx, questions.length - 1);
    const q = questions[idx];
    if (!q) return null;
    const answered = !!skillSavedCorrect[q.id];
    const selected = skillAnswers[q.id];

    const pick = (opt: string) => {
      if (q.questionType === 'multiple_select') {
        const current = Array.isArray(selected) ? selected : [];
        const next = current.includes(opt) ? current.filter(x => x !== opt) : [...current, opt];
        setSkillAnswers(prev => ({ ...prev, [q.id]: next }));
      } else {
        setSkillAnswers(prev => ({ ...prev, [q.id]: opt }));
      }
    };

    const confirmAnswer = () => {
      if (!selected || (Array.isArray(selected) && selected.length === 0)) return;
      submitSkillAnswer(q.id, selected);
    };

    const isSelected = (opt: string) =>
      q.questionType === 'multiple_select'
        ? Array.isArray(selected) && selected.includes(opt)
        : selected === opt;

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div className="card-header" style={{ alignItems: 'center' }}>
          <div>
            <h2 className="card-title">Skill Assessment · {skillName}</h2>
            <p className="card-subtitle">Question {idx + 1} of {questions.length} · {q.difficulty} · {q.topic}</p>
          </div>
          <button className="btn btn-secondary" onClick={cancelSkillAssessment} style={{ fontSize: '0.78rem' }}>Exit</button>
        </div>

        <div className="progress-container">
          <div className="progress-bar progress-cyan" style={{ width: `${((idx + 1) / questions.length) * 100}%` }} />
        </div>

        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span className={`badge ${q.difficulty === 'hard' ? 'badge-critical' : q.difficulty === 'medium' ? 'badge-required' : 'badge-preferred'}`}>
              <strong>{q.points}</strong> pt{q.points > 1 ? 's' : ''}
            </span>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'capitalize' }}>{q.questionType?.replace('_', ' ')}</span>
          </div>
          <p style={{ fontSize: '0.95rem', color: 'var(--text-primary)', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{q.questionText}</p>
          {q.codeSnippet && (
            <pre className="code-block" style={{ marginTop: '0.75rem' }}>{q.codeSnippet}</pre>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '1rem' }}>
            {(q.options || []).map((opt: string) => {
              const isSel = isSelected(opt);
              return (
                <button
                  key={opt}
                  className={`option-btn ${isSel ? 'option-btn-selected' : ''}`}
                  onClick={() => pick(opt)}
                >
                  <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', marginRight: '0.5rem' }}>{(q.options || []).indexOf(opt) + 1}</span>
                  <span style={{ whiteSpace: 'pre-wrap', textAlign: 'left' }}>{opt}</span>
                  {answered && isSel && <CheckCircle2 size={16} style={{ marginLeft: 'auto', color: '#34d399' }} />}
                </button>
              );
            })}
          </div>

          {q.questionType === 'code_output' && (
            <div style={{ marginTop: '0.75rem' }}>
              <input
                className="terminal-input"
                value={typeof selected === 'string' ? selected || '' : ''}
                onChange={(e) => setSkillAnswers(prev => ({ ...prev, [q.id]: e.target.value }))}
                placeholder="Enter the expected output…"
                style={{ width: '100%', padding: '0.6rem 0.8rem', background: 'var(--bg-input)', border: '1px solid var(--border-color)', borderRadius: '7px', color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}
              />
            </div>
          )}

          {q.questionType === 'true_false' && (
            <div style={{ marginTop: '0.75rem', display: 'flex', gap: '0.5rem' }}>
              {['True', 'False'].map(tf => (
                <button key={tf} className={`option-btn ${selected === tf ? 'option-btn-selected' : ''}`} onClick={() => pick(tf)}>
                  {tf}
                </button>
              ))}
            </div>
          )}

          {answered ? (
            <div className="confirmed-banner" style={{ marginTop: '1rem', padding: '0.6rem 0.8rem', background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.82rem', color: '#34d399' }}>
              <ShieldCheck size={14} /> Answer recorded and evaluated securely. You can change it before submitting the assessment.
            </div>
          ) : (
            <div style={{ marginTop: '1rem', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              Select an answer, then confirm it. You can revise before submitting.
            </div>
          )}

          <div style={{ marginTop: '1rem', display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
            <button className="btn btn-primary" onClick={confirmAnswer} disabled={!selected || (Array.isArray(selected) && selected.length === 0) || isSubmittingSkill}>
              {answered ? 'Update Answer' : 'Confirm Answer'}
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button className="btn btn-secondary" onClick={() => goSkillQuestion(idx - 1)} disabled={idx === 0}>← Previous</button>
          <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
            {questions.map((_q: any, i: number) => (
              <button
                key={i}
                className={`btn ${i === idx ? 'btn-primary' : skillSavedCorrect[_q.id] ? 'btn-success' : 'btn-secondary'}`}
                style={{ width: '2rem', height: '2rem', padding: '0', fontSize: '0.78rem' }}
                onClick={() => goSkillQuestion(i)}
              >
                {i + 1}
              </button>
            ))}
          </div>
          {idx === questions.length - 1 ? (
            <button className="btn btn-primary" onClick={submitSkillAssessment} disabled={isSubmittingSkill}>
              <Check size={15} /> {isSubmittingSkill ? 'Submitting…' : 'Submit Assessment'}
            </button>
          ) : (
            <button className="btn btn-secondary" onClick={() => goSkillQuestion(idx + 1)}>Next →</button>
          )}
        </div>
      </div>
    );
  };

  const renderResult = () => {
    const r = skillResult;
    if (!r) return null;
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <div className="page-header">
          <div>
            <h1 className="page-title">Assessment Results · {r.skillName}</h1>
            <p className="page-subtitle">Weighted score across difficulty levels and per-topic performance.</p>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '0.9fr 2fr', gap: '1.5rem' }}>
          <div className="card" style={{ textAlign: 'center', padding: '1.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.75rem' }}>
            <div style={{ width: '84px', height: '84px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', border: `3px solid ${r.score >= 70 ? '#10b981' : r.score >= 40 ? '#f59e0b' : '#f43f5e'}`, background: 'rgba(255,255,255,0.03)' }}>
              <span style={{ fontSize: '1.5rem', fontWeight: 800, fontFamily: 'var(--font-mono)' }}>{r.score}%</span>
            </div>
            <span className="badge" style={{ background: 'rgba(16,185,129,0.1)', color: '#34d399', border: '1px solid rgba(16,185,129,0.2)', fontSize: '0.85rem' }}>
              {r.skillLevel}
            </span>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              {r.correctCount} correct · {r.incorrectCount} incorrect · {r.totalQuestions} total
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              {r.durationSeconds != null ? `${Math.floor(r.durationSeconds / 60)}m ${r.durationSeconds % 60}s` : ''}
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
              <button className="btn btn-secondary" onClick={resetSkillAssessment}>New Assessment</button>
              <button className="btn btn-secondary" onClick={() => { setViewingResultId(null); setSkillResult(null); loadSkillAssessHistory(); }}>Back to Dashboard</button>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="card">
              <h3 className="card-title" style={{ marginBottom: '0.75rem' }}>Topic Performance</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.7rem' }}>
                {(r.topicResults || []).map((t: any) => {
                  const color = t.status === 'STRENGTH' ? '#10b981' : t.status === 'MODERATE' ? '#f59e0b' : '#f43f5e';
                  return (
                    <div key={t.topic}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: '0.3rem' }}>
                        <span><strong>{t.topic}</strong></span>
                        <span style={{ color: 'var(--text-muted)' }}>{t.earnedPoints}/{t.totalPoints} pts · {t.percentage}%</span>
                      </div>
                      <div className="progress-container">
                        <div className="progress-bar" style={{ width: `${t.percentage}%`, background: color }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="card">
                <h3 className="card-title" style={{ color: '#34d399', fontSize: '0.9rem', marginBottom: '0.5rem' }}>Strengths</h3>
                {r.strengths?.length ? r.strengths.map((s: string) => <div key={s} style={{ fontSize: '0.82rem', padding: '0.2rem 0' }}>• {s}</div>) : <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>None yet.</div>}
              </div>
              <div className="card">
                <h3 className="card-title" style={{ color: '#fb7185', fontSize: '0.9rem', marginBottom: '0.5rem' }}>Needs Work</h3>
                {r.needsImprovement?.length ? r.needsImprovement.map((s: string) => <div key={s} style={{ fontSize: '0.82rem', padding: '0.2rem 0' }}>• {s}</div>) : <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Nothing critical — great job.</div>}
              </div>
            </div>

            {r.detailedResults && r.detailedResults.length > 0 && (
              <div className="card">
                <h3 className="card-title" style={{ marginBottom: '0.75rem' }}>Question Review</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                  {r.detailedResults.map((d: any, i: number) => (
                    <div key={i} style={{ padding: '0.65rem 0.7rem', background: 'var(--bg-row)', border: '1px solid var(--border-faint)', borderRadius: '6px', fontSize: '0.82rem' }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
                        {d.correct ? <CheckCircle2 size={15} style={{ color: '#10b981', flexShrink: 0, marginTop: '2px' }} /> : <X size={15} style={{ color: '#f43f5e', flexShrink: 0, marginTop: '2px' }} />}
                        <div>
                          <div style={{ whiteSpace: 'pre-wrap' }}><strong>Q{i + 1}.</strong> {d.question?.prompt}</div>
                          {d.question?.codeSnippet && <pre className="code-block" style={{ marginTop: '0.4rem' }}>{d.question.codeSnippet}</pre>}
                          <div style={{ marginTop: '0.4rem', color: 'var(--text-secondary)' }}>Your answer: <span style={{ color: d.correct ? '#34d399' : '#fb7185' }}>{d.userAnswer || '(no answer)'}</span></div>
                          <div style={{ color: 'var(--text-secondary)' }}>Correct: <span style={{ color: '#34d399' }}>{d.correctAnswer}</span></div>
                          <div style={{ color: 'var(--text-muted)', marginTop: '0.2rem' }}>{d.explanation}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  if (skillSession) return renderQuiz();
  if (skillResult) return renderResult();
  return renderConfig();
}
