'use client';

import { useSkillBridge } from '@/lib/skillbridge-context';
import { BrainCircuit, Database, Code2, Play, CheckCircle2, AlertCircle } from 'lucide-react';

export default function SandboxView() {
  const {
    challenges,
    selectedChallengeIdx,
    setSelectedChallengeIdx,
    sandboxCode,
    setSandboxCode,
    isRunningSandbox,
    sandboxResult,
    isGeneratingChallenge,
    generateError,
    referenceSolution,
    isLoadingSolution,
    activeChallenge,
    handleSelectChallenge,
    handleGenerateChallenge,
    handleShowSolution,
    handleRunSandbox,
  } = useSkillBridge();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">SQL & Code Sandbox</h1>
          <p className="page-subtitle">
            Solve real engineering queries and algorithmic problems against test datasets. Passing hands-on challenges elevates your skill evidence to Verified.
          </p>
        </div>
        <button
          className="btn btn-primary"
          disabled={isGeneratingChallenge}
          onClick={handleGenerateChallenge}
        >
          <BrainCircuit size={15} /> {isGeneratingChallenge ? 'Generating...' : 'Generate New Challenge'}
        </button>
      </div>

      {generateError && (
        <div style={{ fontSize: '0.8rem', color: '#fda4af', background: 'rgba(244, 63, 94, 0.08)', border: '1px solid rgba(244, 63, 94, 0.2)', padding: '0.7rem 0.9rem', borderRadius: '6px' }}>
          {generateError}
        </div>
      )}

      <div style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', paddingBottom: '0.25rem' }}>
        {challenges.map((ch, idx) => (
          <button
            key={ch.id}
            className={`btn ${selectedChallengeIdx === idx ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => handleSelectChallenge(idx)}
            style={{ fontSize: '0.825rem' }}
          >
            {ch.type === 'SQL' ? <Database size={13} /> : <Code2 size={13} />}
            <span>{ch.title}</span>
          </button>
        ))}
      </div>

      {activeChallenge && (
        <div className="grid-2">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <span className="badge badge-preferred">{activeChallenge.type}</span>
                <span style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                  Difficulty: {activeChallenge.difficulty}
                </span>
              </div>
              <h2 className="card-title" style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>
                {activeChallenge.title}
              </h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', lineHeight: 1.55 }}>
                {activeChallenge.description}
              </p>

              {activeChallenge.schemaPreview && (
                <div style={{ marginTop: '1.25rem' }}>
                  <div style={{ fontSize: '0.725rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.35rem' }}>
                    Schema Tables
                  </div>
                  <pre className="code-block" style={{ fontSize: '0.75rem' }}>
                    <code>{activeChallenge.schemaPreview}</code>
                  </pre>
                </div>
              )}

              <div style={{ marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid var(--border-faint)' }}>
                <button
                  className="btn btn-secondary"
                  disabled={isLoadingSolution}
                  onClick={handleShowSolution}
                  style={{ fontSize: '0.8rem', padding: '0.4rem 0.85rem' }}
                >
                  {isLoadingSolution ? 'Loading...' : 'Show Reference Solution'}
                </button>
                {referenceSolution && (
                  <div style={{ marginTop: '0.75rem' }}>
                    <div style={{ fontSize: '0.725rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.35rem' }}>
                      Reference Solution
                    </div>
                    <pre
                      className="code-block"
                      style={{ fontSize: '0.75rem', whiteSpace: 'pre-wrap', color: '#6ee7b7' }}
                    >
                      <code>{referenceSolution}</code>
                    </pre>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                  {activeChallenge.type === 'SQL' ? 'Query Editor' : 'Code Editor'}
                </span>
                <button
                  className="btn btn-primary"
                  disabled={isRunningSandbox}
                  onClick={handleRunSandbox}
                  style={{ padding: '0.4rem 0.85rem', fontSize: '0.825rem' }}
                >
                  <Play size={14} /> {isRunningSandbox ? 'Running Tests...' : 'Run Solution'}
                </button>
              </div>

              <textarea
                value={sandboxCode}
                onChange={e => setSandboxCode(e.target.value)}
                style={{
                  width: '100%',
                  height: '240px',
                  background: 'var(--bg-inset)',
                  color: '#5eead4',
                  border: '1px solid var(--border-color)',
                  borderRadius: '6px',
                  padding: '0.85rem',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.825rem',
                  lineHeight: 1.5,
                  resize: 'vertical'
                }}
              />

              {sandboxResult && (
                <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    {sandboxResult.passed ? (
                      <CheckCircle2 size={16} color="#10b981" />
                    ) : (
                      <AlertCircle size={16} color="#f43f5e" />
                    )}
                    <span style={{ fontWeight: 600, fontSize: '0.85rem', color: sandboxResult.passed ? '#6ee7b7' : '#fda4af' }}>
                      {sandboxResult.passed ? 'All Test Assertions Passed' : 'Tests Failed'}
                    </span>
                  </div>

                  {(sandboxResult.error || sandboxResult.message) && (
                    <p style={{ color: '#fda4af', fontSize: '0.8rem' }}>{sandboxResult.error || sandboxResult.message}</p>
                  )}

                  {sandboxResult.testResults && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', marginTop: '0.5rem' }}>
                      {sandboxResult.testResults.map((t: any, idx: number) => (
                        <div key={idx} style={{ fontSize: '0.8rem', color: t.passed ? '#6ee7b7' : '#fda4af' }}>
                          {t.passed ? '✓' : '✗'} {t.testName}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
