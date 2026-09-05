'use client';

import { useSkillBridge } from '@/lib/skillbridge-context';
import { BarChart3, RotateCcw, Clock, Check, ArrowRight } from 'lucide-react';

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

  if (!assessment) return null;

  if (attemptResult) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <div className="page-header">
          <div>
            <h1 className="page-title">Diagnostic Test Results</h1>
            <p className="page-subtitle">Your benchmark score across Node.js, SQL, and HTTP architecture.</p>
          </div>
        </div>

        <div className="card" style={{ textAlign: 'center', padding: '2.5rem' }}>
          <div style={{
            width: '72px',
            height: '72px',
            borderRadius: '50%',
            background: attemptResult.passed ? 'rgba(16, 185, 129, 0.15)' : 'rgba(244, 63, 94, 0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1rem auto',
            border: `2px solid ${attemptResult.passed ? '#10b981' : '#f43f5e'}`
          }}>
            <span style={{ fontSize: '1.6rem', fontWeight: 800, fontFamily: 'var(--font-mono)' }}>
              {attemptResult.score}%
            </span>
          </div>

          <h2 style={{ fontSize: '1.35rem', fontWeight: 700 }}>
            {attemptResult.passed ? 'Benchmark Achieved' : 'Benchmark Completed — Focus Areas Identified'}
          </h2>
          <p style={{ color: 'var(--text-secondary)', maxWidth: '500px', margin: '0.5rem auto 1.5rem auto', fontSize: '0.9rem' }}>
            Earned {attemptResult.totalPointsEarned} of {attemptResult.maxPoints} points across practical questions. Your verified skill profile has been updated.
          </p>

          <div style={{ display: 'flex', justifyContent: 'center', gap: '0.75rem' }}>
            <button className="btn btn-primary" onClick={() => navigate('gaps')}>
              View My Skill Gaps <BarChart3 size={15} />
            </button>
            <button className="btn btn-secondary" onClick={() => loadDiagnostic(12)}>
              <RotateCcw size={14} /> Retake Test (New Questions)
            </button>
          </div>
        </div>

        <div className="card">
          <h3 className="card-title" style={{ marginBottom: '1rem' }}>Sub-Skill Breakdown</h3>
          <div className="grid-2">
            {attemptResult.subSkillScores?.map((sub, i) => (
              <div key={i} style={{ background: 'var(--bg-inset-panel)', padding: '1rem', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>{sub.subSkill}</span>
                  <span className={`badge ${sub.status === 'STRENGTH' ? 'badge-strength' : sub.status === 'MODERATE' ? 'badge-gap' : 'badge-critical'}`}>
                    {sub.status === 'STRENGTH' ? 'Strength' : sub.status === 'MODERATE' ? 'Moderate' : 'Needs Work'}
                  </span>
                </div>
                <div className="progress-container">
                  <div
                    className={`progress-bar ${sub.status === 'STRENGTH' ? 'progress-emerald' : sub.status === 'MODERATE' ? 'progress-amber' : 'progress-rose'}`}
                    style={{ width: `${sub.percentage}%` }}
                  />
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  {sub.earnedPoints} / {sub.totalPoints} points ({sub.percentage}%)
                </div>
              </div>
            ))}
          </div>
        </div>

        {attemptResult.detailedResults && attemptResult.detailedResults.length > 0 && (
          <div className="card">
            <h3 className="card-title" style={{ marginBottom: '0.25rem' }}>Question-by-Question Review</h3>
            <p className="card-subtitle" style={{ marginBottom: '1rem' }}>
              Compare your answers against the correct solutions with explanations.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {attemptResult.detailedResults.map((r, idx) => (
                <div
                  key={idx}
                  style={{
                    border: '1px solid var(--border-faint)',
                    borderRadius: '6px',
                    padding: '1rem',
                    background: 'var(--bg-row)'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                    <span style={{ fontSize: '0.72rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                      Q{idx + 1} · {r.question.subSkill}
                    </span>
                    <span
                      className={`badge ${r.correct ? 'badge-strength' : 'badge-critical'}`}
                      style={{ fontSize: '0.675rem' }}
                    >
                      {r.correct ? 'Correct' : 'Incorrect'}
                    </span>
                  </div>

                  <div style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: '0.5rem' }}>
                    {r.question.prompt}
                  </div>
                  {r.question.codeSnippet && (
                    <pre className="code-block" style={{ fontSize: '0.75rem' }}>
                      <code>{r.question.codeSnippet}</code>
                    </pre>
                  )}

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', fontSize: '0.8rem', marginTop: '0.5rem' }}>
                    <div>
                      <span style={{ color: 'var(--text-muted)' }}>Your answer: </span>
                      <span style={{ color: r.correct ? '#6ee7b7' : '#fda4af', fontWeight: 600 }}>
                        {r.userAnswer || '(not answered)'}
                      </span>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-muted)' }}>Correct answer: </span>
                      <span style={{ color: '#6ee7b7', fontWeight: 600 }}>{r.correctAnswer}</span>
                    </div>
                  </div>

                  {r.explanation && (
                    <div
                      style={{
                        marginTop: '0.6rem',
                        padding: '0.6rem 0.75rem',
                        borderRadius: '5px',
                        background: 'var(--bg-inset-panel)',
                        border: '1px solid var(--border-faint)',
                        fontSize: '0.8rem',
                        color: 'var(--text-secondary)',
                        lineHeight: 1.5
                      }}
                    >
                      <strong style={{ color: '#93c5fd' }}>Explanation: </strong>
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
  if (questions.length === 0) return null;

  const currentQuestion = questions[currentQuestionIdx];
  const isAnswered = currentQuestion && !!userAnswers[currentQuestion.id];
  const isLastQuestion = currentQuestionIdx === questions.length - 1;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">{assessment.title}</h1>
          <p className="page-subtitle">{questions.length} multi-part questions testing practical Node.js, SQL, and HTTP engineering skills.</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--bg-chip)', border: '1px solid var(--border-color)', padding: '0.45rem 0.85rem', borderRadius: '6px', fontFamily: 'var(--font-mono)', fontSize: '0.85rem' }}>
          <Clock size={15} color="#93c5fd" />
          <span>{`${Math.floor(timeRemaining / 60).toString().padStart(2, '0')}:${(timeRemaining % 60).toString().padStart(2, '0')}`}</span>
        </div>
      </div>

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
          <span style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
            QUESTION {currentQuestionIdx + 1} OF {questions.length}
          </span>
          <span className="badge badge-preferred">
            {currentQuestion.points} POINTS
          </span>
        </div>

        <div className="progress-container" style={{ marginBottom: '1.5rem' }}>
          <div
            className="progress-bar progress-indigo"
            style={{ width: `${((currentQuestionIdx + 1) / questions.length) * 100}%` }}
          />
        </div>

        <h2 style={{ fontSize: '1.15rem', fontWeight: 600, marginBottom: '1rem', color: '#f3f4f6' }}>
          {currentQuestion.prompt}
        </h2>

        {currentQuestion.codeSnippet && (
          <pre className="code-block" style={{ marginBottom: '1.25rem' }}>
            <code>{currentQuestion.codeSnippet}</code>
          </pre>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '1rem' }}>
          {currentQuestion.options?.map((opt, idx) => {
            const isSelected = userAnswers[currentQuestion.id] === opt;
            return (
              <button
                key={idx}
                className={`option-btn ${isSelected ? 'selected' : ''}`}
                onClick={() => handleAnswerSelect(currentQuestion.id, opt)}
              >
                <span>{opt}</span>
                {isSelected && <Check size={16} color="#60a5fa" />}
              </button>
            );
          })}
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '2rem', paddingTop: '1.25rem', borderTop: '1px solid var(--border-color)' }}>
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
