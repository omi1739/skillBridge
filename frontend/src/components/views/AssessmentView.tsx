'use client';

import { useSkillBridge } from '@/lib/skillbridge-context';
import { BarChart3, RotateCcw, Clock, Check, ArrowRight, BrainCircuit, ExternalLink } from 'lucide-react';
import Link from 'next/link';
import { resolveResources } from '@/lib/learning-resources';
import { safeExternalUrl } from '@/lib/safe-url';
import { EmptyState, PageHeader, Chip } from '@/components/ui/primitives';

export default function AssessmentView() {
  const {
    assessment,
    attemptResult,
    loadDiagnostic,
    navigate,
    currentQuestionIdx,
    setCurrentQuestionIdx,
    userAnswers,
    handleAnswerSelect,
    isSubmittingAssessment,
    handleSubmitAssessment,
    timeRemaining,
  } = useSkillBridge();

  if (!assessment) {
    return (
      <EmptyState
        icon={BrainCircuit}
        tone="info"
        title="Loading Diagnostic Test…"
        subtitle="Preparing your practical Node.js, SQL, and HTTP engineering benchmark. This can take a moment."
        actions={<button className="btn btn-secondary" onClick={() => loadDiagnostic(12)}><RotateCcw size={14} /> Retry</button>}
      />
    );
  }

  if (attemptResult) {
    return (
      <div className="stack stack-lg">
        <PageHeader
          title="Diagnostic Test Results"
          subtitle="Your benchmark score across Node.js, SQL, and HTTP architecture."
        />

        <div className="card">
          <div className="stack stack-sm" style={{ alignItems: 'center', textAlign: 'center' }}>
            <div
              className={`score-ring ${attemptResult.passed ? 'score-ring-pass' : 'score-ring-fail'}`}
              style={{ marginTop: '0.5rem' }}
            >
              <span className="score-ring-value">{attemptResult.score}%</span>
            </div>

            <h2 style={{ fontSize: '1.3rem', fontWeight: 700 }}>
              {attemptResult.passed ? 'Benchmark Achieved' : 'Benchmark Completed — Focus Areas Identified'}
            </h2>
            <p style={{ color: 'var(--text-secondary)', maxWidth: '520px', margin: '0 auto', fontSize: '0.9rem' }}>
              Earned {attemptResult.totalPointsEarned} of {attemptResult.maxPoints} points across practical questions. Your verified skill profile has been updated.
            </p>

            <div className="toolbar">
              <button className="btn btn-primary" onClick={() => navigate('gaps')}>
                View My Skill Gaps <BarChart3 size={15} />
              </button>
              <button className="btn btn-secondary" onClick={() => loadDiagnostic(12)}>
                <RotateCcw size={14} /> Retake Test (New Questions)
              </button>
            </div>
          </div>
        </div>

        <div className="card">
          <h3 className="card-title mb-4">Sub-Skill Breakdown</h3>
          <div className="grid-2">
            {attemptResult.subSkillScores?.map((sub, i) => (
              <div key={i} className="list-item" style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <div className="row-between" style={{ alignItems: 'center' }}>
                  <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>{sub.subSkill}</span>
                  <Chip tone={sub.status === 'STRENGTH' ? 'success' : sub.status === 'MODERATE' ? 'warning' : 'danger'}>
                    {sub.status === 'STRENGTH' ? 'Strength' : sub.status === 'MODERATE' ? 'Moderate' : 'Needs Work'}
                  </Chip>
                </div>
                <div className="progress-container" style={{ margin: 0 }}>
                  <div
                    className={`progress-bar ${sub.status === 'STRENGTH' ? 'progress-emerald' : sub.status === 'MODERATE' ? 'progress-amber' : 'progress-rose'}`}
                    style={{ width: `${sub.percentage}%` }}
                  />
                </div>
                <div className="tiny text-muted">
                  {sub.earnedPoints} / {sub.totalPoints} points ({sub.percentage}%)
                </div>
                {sub.status !== 'STRENGTH' && (() => {
                  const topics = resolveResources(sub.subSkill);
                  const topic = topics[0];
                  if (!topic) return null;
                  return (
                    <div className="list-divider-subtle" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap', fontSize: '0.75rem' }}>
                      <span className="text-muted">Improve:</span>
                      {topic.resources.slice(0, 2).map((res, i) => (
                        <a key={i} href={safeExternalUrl(res.url)} target="_blank" rel="noreferrer" className="badge" style={{ fontSize: '0.65rem', padding: '0.15rem 0.5rem', color: 'var(--accent-text)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                          {res.source} <ExternalLink size={9} />
                        </a>
                      ))}
                      <Link href={`/learn#${topic.key}`} className="badge badge-preferred" style={{ fontSize: '0.65rem', textDecoration: 'none', cursor: 'pointer' }}>
                        All resources →
                      </Link>
                    </div>
                  );
                })()}
              </div>
            ))}
          </div>
        </div>

        {attemptResult.detailedResults && attemptResult.detailedResults.length > 0 && (
          <div className="card">
            <h3 className="card-title mb-1">Question-by-Question Review</h3>
            <p className="card-subtitle mb-4">
              Compare your answers against the correct solutions with explanations.
            </p>
            <div className="stack stack-sm">
              {attemptResult.detailedResults.map((r, idx) => (
                <div key={idx} className="list-item list-item-hover">
                  <div className="row-between" style={{ alignItems: 'center', marginBottom: '0.5rem' }}>
                    <span className="quiz-progress-label">
                      Q{idx + 1} · {r.question.subSkill}
                    </span>
                    <Chip tone={r.correct ? 'success' : 'danger'}>{r.correct ? 'Correct' : 'Incorrect'}</Chip>
                  </div>

                  <div style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: '0.5rem' }}>
                    {r.question.prompt}
                  </div>
                  {r.question.codeSnippet && (
                    <pre className="code-block" style={{ fontSize: '0.75rem' }}>
                      <code>{r.question.codeSnippet}</code>
                    </pre>
                  )}

                  <div className="stack stack-sm" style={{ fontSize: '0.8rem', marginTop: '0.5rem' }} >
                    <div>
                      <span className="text-muted">Your answer: </span>
                      <span style={{ color: r.correct ? 'var(--success-text)' : 'var(--danger-text)', fontWeight: 600 }}>
                        {r.userAnswer || '(not answered)'}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted">Correct answer: </span>
                      <span style={{ color: 'var(--success-text)', fontWeight: 600 }}>{r.correctAnswer}</span>
                    </div>
                  </div>

                  {r.explanation && (
                    <div
                      className="list-divider-subtle"
                      style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}
                    >
                      <strong style={{ color: 'var(--info-text)' }}>Explanation: </strong>
                      {r.explanation}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  const questions = assessment.questions || [];
  if (questions.length === 0) {
    return (
      <EmptyState
        icon={BrainCircuit}
        tone="info"
        title="No questions available"
        subtitle="The diagnostic question bank is empty right now. Please try again later."
        actions={<button className="btn btn-secondary" onClick={() => loadDiagnostic(12)}><RotateCcw size={14} /> Retry</button>}
      />
    );
  }

  const currentQuestion = questions[currentQuestionIdx];
  const isAnswered = currentQuestion && !!userAnswers[currentQuestion.id];
  const isLastQuestion = currentQuestionIdx === questions.length - 1;

  return (
    <div className="stack stack-lg">
      <PageHeader
        title={assessment.title}
        subtitle={`${questions.length} multi-part questions testing practical Node.js, SQL, and HTTP engineering skills.`}
        actions={
          <span className="chip chip-info mono">{`${Math.floor(timeRemaining / 60).toString().padStart(2, '0')}:${(timeRemaining % 60).toString().padStart(2, '0')}`}</span>
        }
      />

      <div className="card">
        <div className="row-between" style={{ alignItems: 'center', marginBottom: '0.75rem' }}>
          <span className="quiz-progress-label">
            QUESTION {currentQuestionIdx + 1} OF {questions.length}
          </span>
          <Chip tone="accent">{currentQuestion.points} POINTS</Chip>
        </div>

        <div className="progress-container mb-5" style={{ margin: 0 }}>
          <div
            className="progress-bar progress-indigo"
            style={{ width: `${((currentQuestionIdx + 1) / questions.length) * 100}%` }}
          />
        </div>

        <h2 style={{ fontSize: '1.15rem', fontWeight: 600, marginBottom: '1rem', color: 'var(--text-primary)' }}>
          {currentQuestion.prompt}
        </h2>

        {currentQuestion.codeSnippet && (
          <pre className="code-block" style={{ marginBottom: '1.25rem' }}>
            <code>{currentQuestion.codeSnippet}</code>
          </pre>
        )}

        <div className="stack stack-sm" style={{ marginTop: '1rem'}} >
          {currentQuestion.options?.map((opt, idx) => {
            const isSelected = userAnswers[currentQuestion.id] === opt;
            return (
              <button
                key={idx}
                className={`option-btn ${isSelected ? 'selected' : ''}`}
                onClick={() => handleAnswerSelect(currentQuestion.id, opt)}
              >
                <span className="option-mark" aria-hidden="true">{idx + 1}</span>
                <span className="flex-1">{opt}</span>
                {isSelected && <Check size={16} color="var(--info)" />}
              </button>
            );
          })}
        </div>

        <div className="row-between list-divider" style={{ alignItems: 'center' }}>
          <button
            className="btn btn-secondary"
            disabled={currentQuestionIdx === 0}
            onClick={() => setCurrentQuestionIdx(prev => prev - 1)}
          >
            Previous
          </button>

          {isLastQuestion ? (
            <button
              className="btn btn-primary"
              disabled={!isAnswered || isSubmittingAssessment}
              onClick={handleSubmitAssessment}
            >
              {isSubmittingAssessment ? 'Grading Answers...' : 'Submit Assessment'}
            </button>
          ) : (
            <button
              className="btn btn-primary"
              disabled={!isAnswered}
              onClick={() => setCurrentQuestionIdx(prev => prev + 1)}
            >
              Next Question <ArrowRight size={15} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}