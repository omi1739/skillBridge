'use client';

import { useEffect, useRef, useState } from 'react';
import { useSkillBridge } from '@/lib/skillbridge-context';
import { BrainCircuit, CheckCircle2, ShieldCheck, Check, X } from 'lucide-react';
import { EmptyState, PageHeader, SectionCard, Field, Chip, Toolbar, Alert } from '@/components/ui/primitives';

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
    skillAnswered,
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

  // Server-enforced time budget: count down from the session's hard limit and
  // auto-submit when it runs out so the server and client stay in agreement.
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const submittedRef = useRef(false);

  useEffect(() => {
    if (!skillSession?.startedAt || skillSession.status !== 'in_progress' || !skillSession.timeLimitMinutes) return;
    const started = new Date(skillSession.startedAt).getTime();
    const budgetMs = skillSession.timeLimitMinutes * 60 * 1000;
    const tick = () => {
      const remaining = Math.max(0, Math.round((started + budgetMs - Date.now()) / 1000));
      setTimeLeft(remaining);
      if (remaining <= 0 && !submittedRef.current) {
        submittedRef.current = true;
        submitSkillAssessment();
      }
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [skillSession?.id]);

  const renderConfig = () => (
    <div className="stack stack-lg">
      <PageHeader
        title="Skill Assessment"
        subtitle="Self-assess skills with difficulty-weighted questions. Your answers are evaluated securely on the server and feed your verified skill profile."
      />

      <SectionCard title="Configure Assessment">
        <div className="stack stack-sm">
          <Field label="Skill">
            <select
              className="select"
              value={skillAssessSelectedSkill}
              onChange={(e) => { setSkillAssessSelectedSkill(e.target.value); setSkillProgress(null); loadSkillAssessProgress(e.target.value); }}
            >
              {(skillAssessAvailableSkills as any[]).map((s: any) => (
                <option key={s.id} value={s.id}>{s.canonicalName || s.id}</option>
              ))}
            </select>
          </Field>

          <div className="grid-3">
            {(['easy', 'medium', 'hard'] as const).map((level) => (
              <Field key={level} label={`${level} ${level === 'easy' ? '(min 1)' : ''}`}>
                <input
                  className="select"
                  type="number"
                  min={level === 'easy' ? 1 : 0}
                  max={30}
                  value={skillAssessCfg[level]}
                  onChange={(e) => setSkillAssessCfg(prev => ({ ...prev, [level]: Math.max(level === 'easy' ? 1 : 0, Number(e.target.value)) }))}
                  style={{ fontFamily: 'var(--font-mono)', fontSize: '0.9rem' }}
                />
              </Field>
            ))}
          </div>
          <div className="small text-muted">
            Total questions: <strong>{skillAssessCfg.easy + skillAssessCfg.medium + skillAssessCfg.hard}</strong>
          </div>

          {skillAssessError && <Alert tone="danger">{skillAssessError}</Alert>}

          <Toolbar>
            <button className="btn btn-primary" onClick={startSkillAssessment} disabled={isStartingSkill || !skillAssessSelectedSkill}>
              <BrainCircuit size={15} /> {isStartingSkill ? 'Starting…' : 'Start Skill Assessment'}
            </button>
            <button className="btn btn-secondary" onClick={loadSkillAssessHistory}>Refresh History</button>
          </Toolbar>
        </div>
      </SectionCard>

      {skillProgress && (
        <SectionCard title={`Progress · ${skillProgress.skillName}`}>
          <div className="stat-grid-4" style={{ margin: 0 }}>
            <div className="metric"><span className="metric-label">Attempts</span><span className="metric-value">{skillProgress.attemptCount}</span></div>
            <div className="metric"><span className="metric-label">Average</span><span className="metric-value">{skillProgress.averageScore}%</span></div>
            <div className="metric"><span className="metric-label">Best</span><span className="metric-value">{skillProgress.bestScore}%</span></div>
            <div className="metric"><span className="metric-label">Latest Level</span><span className="metric-value">{skillProgress.latestSkillLevel}</span></div>
          </div>
        </SectionCard>
      )}

      {skillHistory && skillHistory.length > 0 && (
        <SectionCard title="Assessment History">
          <div className="stack stack-sm">
            {skillHistory.map((h: any) => (
              <div key={h.id} className="list-item row-between">
                <div>
                  <strong>{h.skillName}</strong>
                  <span className="text-muted"> · {new Date(h.completedAt).toLocaleDateString()}</span>
                </div>
                <div className="toolbar">
                  <Chip tone="success">{h.skillLevel}</Chip>
                  <span className="mono" style={{ fontWeight: 700 }}>{h.score}%</span>
                  <button className="btn btn-secondary btn-sm" onClick={() => loadSkillAssessResult(h.id)}>
                    View Result
                  </button>
                </div>
              </div>
            ))}
          </div>
        </SectionCard>
      )}
    </div>
  );

  const renderQuiz = () => {
    const questions = skillSession?.questions || [];
    const idx = Math.min(skillQuestionIdx, questions.length - 1);
    const q = questions[idx];
    if (!q) return null;
    const answered = !!skillAnswered[q.id];
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
      <div className="stack stack-sm">
        <div className="card-header" style={{ alignItems: 'center' }}>
          <div>
            <h2 className="card-title">Skill Assessment · {skillName}</h2>
            <p className="card-subtitle">Question {idx + 1} of {questions.length} · {q.difficulty} · {q.topic}</p>
          </div>
          <Toolbar>
            {timeLeft != null && (
              <Chip tone={timeLeft <= 60 ? 'danger' : 'neutral'}>
                <span className="mono">{Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, '0')} left</span>
              </Chip>
            )}
            <button className="btn btn-secondary" onClick={cancelSkillAssessment}>Exit</button>
          </Toolbar>
        </div>

        <div className="progress-container">
          <div className="progress-bar progress-cyan" style={{ width: `${((idx + 1) / questions.length) * 100}%` }} />
        </div>

        <div className="card">
          <div className="row-between" style={{ marginBottom: '0.5rem' }}>
            <Chip tone={q.difficulty === 'hard' ? 'danger' : q.difficulty === 'medium' ? 'warning' : 'accent'}>
              <strong>{q.points}</strong> pt{q.points > 1 ? 's' : ''}
            </Chip>
            <span className="tiny text-muted" style={{ textTransform: 'capitalize' }}>{q.questionType?.replace('_', ' ')}</span>
          </div>
          <p style={{ fontSize: '0.95rem', color: 'var(--text-primary)', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{q.questionText}</p>
          {q.codeSnippet && (
            <pre className="code-block" style={{ marginTop: '0.75rem' }}>{q.codeSnippet}</pre>
          )}

          <div className="stack stack-sm" style={{ marginTop: '1rem' }}>
            {(q.options || []).map((opt: string) => {
              const isSel = isSelected(opt);
              return (
                <button
                  key={opt}
                  className={`option-btn ${isSel ? 'selected' : ''}`}
                  onClick={() => pick(opt)}
                >
                  <span className="option-mark" aria-hidden="true">{(q.options || []).indexOf(opt) + 1}</span>
                  <span className="flex-1" style={{ whiteSpace: 'pre-wrap', textAlign: 'left' }}>{opt}</span>
                  {answered && isSel && <CheckCircle2 size={16} style={{ color: 'var(--success)', flexShrink: 0 }} />}
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
              />
            </div>
          )}

          {q.questionType === 'true_false' && (
            <div className="toolbar" style={{ marginTop: '0.75rem' }}>
              {['True', 'False'].map(tf => (
                <button key={tf} className={`option-btn ${selected === tf ? 'selected' : ''}`} style={{ width: 'auto' }} onClick={() => pick(tf)}>
                  {tf}
                </button>
              ))}
            </div>
          )}

          {answered ? (
            <Alert tone="success" className="mt-4">
              <ShieldCheck size={14} /> Answer recorded and evaluated securely. You can change it before submitting the assessment.
            </Alert>
          ) : (
            <div className="small text-muted mt-4">
              Select an answer, then confirm it. You can revise before submitting.
            </div>
          )}

          <div className="toolbar mt-4" style={{ justifyContent: 'flex-end' }}>
            <button className="btn btn-primary" onClick={confirmAnswer} disabled={!selected || (Array.isArray(selected) && selected.length === 0) || isSubmittingSkill}>
              {answered ? 'Update Answer' : 'Confirm Answer'}
            </button>
          </div>
        </div>

        <div className="row-between">
          <button className="btn btn-secondary" onClick={() => goSkillQuestion(idx - 1)} disabled={idx === 0}>← Previous</button>
          <div className="toolbar">
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
    const tone = r.score >= 70 ? 'success' : r.score >= 40 ? 'warning' : 'danger' as 'success' | 'warning' | 'danger';
    return (
      <div className="stack stack-lg">
        <PageHeader
          title={`Assessment Results · ${r.skillName}`}
          subtitle="Weighted score across difficulty levels and per-topic performance."
        />

        <div className="result-layout">
          <div className="card" style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.75rem' }}>
            <div className={`score-ring score-ring-${tone}`}>
              <span className="score-ring-value">{r.score}%</span>
            </div>
            <Chip tone={tone}>{r.skillLevel}</Chip>
            <div className="small text-muted">
              {r.correctCount} correct · {r.incorrectCount} incorrect · {r.totalQuestions} total
            </div>
            <div className="small text-muted">
              {r.durationSeconds != null ? `${Math.floor(r.durationSeconds / 60)}m ${r.durationSeconds % 60}s` : ''}
            </div>
            <div className="toolbar">
              <button className="btn btn-secondary" onClick={resetSkillAssessment}>New Assessment</button>
              <button className="btn btn-secondary" onClick={() => { setViewingResultId(null); setSkillResult(null); loadSkillAssessHistory(); }}>Back to Dashboard</button>
            </div>
          </div>

          <div className="stack stack-sm">
            <SectionCard title="Topic Performance">
              <div className="stack stack-sm">
                {(r.topicResults || []).map((t: any) => {
                  const tTone = t.status === 'STRENGTH' ? 'success' : t.status === 'MODERATE' ? 'warning' : 'danger' as 'success' | 'warning' | 'danger';
                  return (
                    <div key={t.topic} className="progress-row">
                      <div className="progress-row-head">
                        <span><strong>{t.topic}</strong></span>
                        <span className="text-muted">{t.earnedPoints}/{t.totalPoints} pts · {t.percentage}%</span>
                      </div>
                      <div className="progress-container" style={{ margin: 0 }}>
                        <div className={`progress-bar progress-${tTone === 'success' ? 'emerald' : tTone === 'warning' ? 'amber' : 'rose'}`} style={{ width: `${t.percentage}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </SectionCard>

            <div className="grid-2">
              <SectionCard title={<span className="text-accent">Strengths</span>}>
                {r.strengths?.length ? r.strengths.map((s: string) => <div key={s} className="small" style={{ padding: '0.2rem 0' }}>• {s}</div>) : <div className="small text-muted">None yet.</div>}
              </SectionCard>
              <SectionCard title={<span style={{ color: 'var(--danger-text)' }}>Needs Work</span>}>
                {r.needsImprovement?.length ? r.needsImprovement.map((s: string) => <div key={s} className="small" style={{ padding: '0.2rem 0' }}>• {s}</div>) : <div className="small text-muted">Nothing critical — great job.</div>}
              </SectionCard>
            </div>

            {r.detailedResults && r.detailedResults.length > 0 && (
              <SectionCard title="Question Review">
                <div className="stack stack-sm">
                  {r.detailedResults.map((d: any, i: number) => (
                    <div key={i} className="list-item">
                      <div className="row" style={{ alignItems: 'flex-start' }}>
                        {d.correct ? <CheckCircle2 size={15} className="shrink-0" style={{ color: 'var(--success)', marginTop: '2px' }} /> : <X size={15} className="shrink-0" style={{ color: 'var(--danger)', marginTop: '2px' }} />}
                        <div className="flex-1">
                          <div style={{ whiteSpace: 'pre-wrap' }}><strong>Q{i + 1}.</strong> {d.question?.prompt}</div>
                          {d.question?.codeSnippet && <pre className="code-block" style={{ marginTop: '0.4rem' }}>{d.question.codeSnippet}</pre>}
                          <div className="small text-secondary" style={{ marginTop: '0.4rem' }}>Your answer: <span style={{ color: d.correct ? 'var(--success-text)' : 'var(--danger-text)' }}>{d.userAnswer || '(no answer)'}</span></div>
                          {d.correctAnswer ? (
                            <>
                              <div className="small text-secondary">Correct: <span style={{ color: 'var(--success-text)' }}>{d.correctAnswer}</span></div>
                              {d.explanation && <div className="small text-muted" style={{ marginTop: '0.2rem' }}>{d.explanation}</div>}
                            </>
                          ) : (
                            <div className="small text-muted">Not answered — correct answer withheld.</div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </SectionCard>
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