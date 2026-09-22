'use client';

import { useSkillBridge } from '@/lib/skillbridge-context';
import { BrainCircuit, Database, Code2, Play, CheckCircle2, AlertCircle, FlaskConical } from 'lucide-react';
import { EmptyState, Toolbar, Alert, Chip } from '@/components/ui/primitives';

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
    <div className="stack stack-lg">
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

      {generateError && <Alert tone="danger">{generateError}</Alert>}

      <div className="row" style={{ gap: '0.5rem', overflowX: 'auto', paddingBottom: '0.25rem' }}>
        {challenges.map((ch, idx) => (
          <button
            key={ch.id}
            className={`btn ${selectedChallengeIdx === idx ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => handleSelectChallenge(idx)}
            style={{ fontSize: '0.825rem', flexShrink: 0 }}
          >
            {ch.type === 'SQL' ? <Database size={13} /> : <Code2 size={13} />}
            <span>{ch.title}</span>
          </button>
        ))}
      </div>

      {!activeChallenge && challenges.length === 0 && (
        <EmptyState
          icon={FlaskConical}
          tone="info"
          title="No challenge selected"
          subtitle="Generate a new challenge or pick one from the list to start solving."
        />
      )}

      {activeChallenge && (
        <div className="grid-2">
          <div className="stack stack-sm">
            <div className="card">
              <div className="row-between" style={{ marginBottom: '0.5rem' }}>
                <span className="badge badge-preferred">{activeChallenge.type}</span>
                <Chip tone="neutral">{activeChallenge.difficulty}</Chip>
              </div>
              <h2 className="card-title" style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>
                {activeChallenge.title}
              </h2>
              <p className="text-secondary" style={{ fontSize: '0.85rem', lineHeight: 1.55 }}>
                {activeChallenge.description}
              </p>

              {activeChallenge.schemaPreview && (
                <div style={{ marginTop: '1.25rem' }}>
                  <div className="tiny text-muted" style={{ fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.35rem' }}>
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
                    <div className="tiny text-muted" style={{ fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.35rem' }}>
                      Reference Solution
                    </div>
                    <pre
                      className="code-block"
                      style={{ fontSize: '0.75rem', whiteSpace: 'pre-wrap', color: 'var(--success-text)' }}
                    >
                      <code>{referenceSolution}</code>
                    </pre>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="stack stack-sm">
            <div className="card">
              <div className="row-between" style={{ marginBottom: '0.75rem' }}>
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
                className="textarea"
                value={sandboxCode}
                onChange={e => setSandboxCode(e.target.value)}
                rows={10}
                style={{ fontFamily: 'var(--font-mono)', fontSize: '0.825rem', background: 'var(--bg-inset)', height: '240px', resize: 'vertical' }}
              />

              {sandboxResult && (
                <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
                  <div className="row" style={{ gap: '0.5rem', marginBottom: '0.5rem' }}>
                    {sandboxResult.passed ? (
                      <CheckCircle2 size={16} color="var(--success)" />
                    ) : (
                      <AlertCircle size={16} color="var(--danger)" />
                    )}
                    <span style={{ fontWeight: 600, fontSize: '0.85rem', color: sandboxResult.passed ? 'var(--success-text)' : 'var(--danger-text)' }}>
                      {sandboxResult.passed ? 'All Test Assertions Passed' : 'Tests Failed'}
                    </span>
                  </div>

                  {(sandboxResult.error || sandboxResult.message) && (
                    <p className="small" style={{ color: 'var(--danger-text)' }}>{sandboxResult.error || sandboxResult.message}</p>
                  )}

                  {sandboxResult.testResults && (
                    <div className="stack stack-sm" style={{ marginTop: '0.5rem' }}>
                      {sandboxResult.testResults.map((t: any, idx: number) => (
                        <div key={idx} className="small" style={{ color: t.passed ? 'var(--success-text)' : 'var(--danger-text)' }}>
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