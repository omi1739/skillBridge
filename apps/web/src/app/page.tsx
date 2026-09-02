'use client';

import React, { useState, useEffect } from 'react';
import {
  Role,
  Assessment,
  AssessmentAttempt,
  SkillGap,
  ActionRecommendation,
  JobMatchResult
} from '@skillbridge/types';
import {
  TrendingUp,
  BrainCircuit,
  BarChart3,
  Rocket,
  Briefcase,
  CheckCircle2,
  AlertCircle,
  Clock,
  ArrowRight,
  ShieldCheck,
  Zap,
  ChevronRight,
  Database,
  Code2,
  Play,
  Terminal,
  Sparkles,
  Table
} from 'lucide-react';

const API_BASE = 'http://localhost:4000/api';

export default function SkillBridgeApp() {
  const [activeTab, setActiveTab] = useState<'market' | 'assessment' | 'sandbox' | 'gaps' | 'actions' | 'jobs'>('market');
  const [role, setRole] = useState<Role | null>(null);
  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [userAnswers, setUserAnswers] = useState<Record<string, string>>({});
  const [attemptResult, setAttemptResult] = useState<AssessmentAttempt | null>(null);
  const [detailedQuestions, setDetailedQuestions] = useState<any[]>([]);
  const [gaps, setGaps] = useState<SkillGap[]>([]);
  const [recommendations, setRecommendations] = useState<ActionRecommendation[]>([]);
  const [jobMatches, setJobMatches] = useState<JobMatchResult[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Sandbox states
  const [challenges, setChallenges] = useState<any[]>([]);
  const [selectedChallengeIdx, setSelectedChallengeIdx] = useState(0);
  const [sandboxCode, setSandboxCode] = useState<string>('');
  const [sandboxResult, setSandboxResult] = useState<any | null>(null);
  const [isExecutingSandbox, setIsExecutingSandbox] = useState(false);

  // Fetch initial data from API
  const refreshUserData = () => {
    fetch(`${API_BASE}/me/gaps?userId=demo_user_01&roleId=role_junior_backend`)
      .then(res => res.json())
      .then(data => setGaps(data))
      .catch(() => {});

    fetch(`${API_BASE}/jobs/matches?userId=demo_user_01`)
      .then(res => res.json())
      .then(data => setJobMatches(data))
      .catch(() => {});
  };

  useEffect(() => {
    fetch(`${API_BASE}/roles/role_junior_backend`)
      .then(res => res.json())
      .then(data => setRole(data))
      .catch(() => {});

    fetch(`${API_BASE}/assessments/assessment_backend_diagnostic`)
      .then(res => res.json())
      .then(data => setAssessment(data))
      .catch(() => {});

    fetch(`${API_BASE}/me/recommendations?userId=demo_user_01`)
      .then(res => res.json())
      .then(data => setRecommendations(data))
      .catch(() => {});

    fetch(`${API_BASE}/sandbox/challenges`)
      .then(res => res.json())
      .then(data => {
        setChallenges(data);
        if (data.length > 0) {
          setSandboxCode(data[0].starterCode);
        }
      })
      .catch(() => {});

    refreshUserData();
  }, []);

  const handleSelectAnswer = (questionId: string, option: string) => {
    setUserAnswers(prev => ({ ...prev, [questionId]: option }));
  };

  const handleSubmitAssessment = async () => {
    if (!assessment) return;
    setIsSubmitting(true);

    const answersPayload = Object.entries(userAnswers).map(([qId, ans]) => ({
      questionId: qId,
      selectedAnswer: ans
    }));

    try {
      const res = await fetch(`${API_BASE}/assessments/${assessment.id}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: 'demo_user_01',
          answers: answersPayload
        })
      });
      const data = await res.json();
      setAttemptResult(data.attempt);
      setGaps(data.gaps || []);
      setDetailedQuestions(data.detailedQuestions || []);
      refreshUserData();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSelectChallenge = (index: number) => {
    setSelectedChallengeIdx(index);
    setSandboxCode(challenges[index].starterCode);
    setSandboxResult(null);
  };

  const handleRunSandbox = async () => {
    const challenge = challenges[selectedChallengeIdx];
    if (!challenge) return;

    setIsExecutingSandbox(true);
    const endpoint = challenge.type === 'SQL' ? `${API_BASE}/sandbox/run-sql` : `${API_BASE}/sandbox/run-code`;
    const payload = challenge.type === 'SQL'
      ? { challengeId: challenge.id, query: sandboxCode, userId: 'demo_user_01' }
      : { challengeId: challenge.id, code: sandboxCode, userId: 'demo_user_01' };

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      setSandboxResult(data);

      if (data.passed) {
        refreshUserData();
      }
    } catch (err) {
      console.error(err);
      setSandboxResult({ passed: false, message: 'Execution failed: Network error connecting to sandbox.' });
    } finally {
      setIsExecutingSandbox(false);
    }
  };

  const activeChallenge = challenges[selectedChallengeIdx];

  return (
    <div>
      {/* Top Navbar */}
      <header className="navbar">
        <div className="container nav-container">
          <a href="#" className="brand">
            <span className="brand-badge">PROTOTYPE</span>
            <span>SkillBridge</span>
          </a>

          <nav className="nav-tabs">
            <button
              className={`nav-tab-btn ${activeTab === 'market' ? 'active' : ''}`}
              onClick={() => setActiveTab('market')}
            >
              <TrendingUp size={16} /> Market Demand
            </button>
            <button
              className={`nav-tab-btn ${activeTab === 'assessment' ? 'active' : ''}`}
              onClick={() => setActiveTab('assessment')}
            >
              <BrainCircuit size={16} /> Diagnostic Test
            </button>
            <button
              className={`nav-tab-btn ${activeTab === 'sandbox' ? 'active' : ''}`}
              onClick={() => setActiveTab('sandbox')}
            >
              <Code2 size={16} /> Code & SQL Sandbox
            </button>
            <button
              className={`nav-tab-btn ${activeTab === 'gaps' ? 'active' : ''}`}
              onClick={() => setActiveTab('gaps')}
            >
              <BarChart3 size={16} /> Gap Engine
            </button>
            <button
              className={`nav-tab-btn ${activeTab === 'actions' ? 'active' : ''}`}
              onClick={() => setActiveTab('actions')}
            >
              <Rocket size={16} /> Action Plan
            </button>
            <button
              className={`nav-tab-btn ${activeTab === 'jobs' ? 'active' : ''}`}
              onClick={() => setActiveTab('jobs')}
            >
              <Briefcase size={16} /> Job Match
            </button>
          </nav>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="container" style={{ paddingBottom: '5rem' }}>
        {/* Hero Header */}
        <section className="hero">
          <div className="hero-pill">
            <ShieldCheck size={14} /> Evidence-Based Labor Market Intelligence
          </div>
          <h1 className="hero-title">
            Target Role: <span className="hero-gradient">{role?.title || 'Junior Backend Engineer'}</span>
          </h1>
          <p className="hero-subtitle">
            Curated market requirements for Bangladesh & emerging hubs. Compare your verified diagnostic evidence against industry demand.
          </p>
        </section>

        {/* TAB 1: MARKET DEMAND EXPLORER */}
        {activeTab === 'market' && role && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div className="grid-3">
              <div className="stat-box">
                <div className="stat-label">Focus Region</div>
                <div className="stat-value" style={{ fontSize: '1.25rem', marginTop: '0.25rem' }}>
                  {role.marketContext.region}
                </div>
              </div>
              <div className="stat-box">
                <div className="stat-label">Experience Tier</div>
                <div className="stat-value" style={{ fontSize: '1.25rem', marginTop: '0.25rem' }}>
                  {role.marketContext.experienceLevel}
                </div>
              </div>
              <div className="stat-box">
                <div className="stat-label">Curated Sample Provenance</div>
                <div className="stat-value" style={{ fontSize: '1.25rem', marginTop: '0.25rem', color: 'var(--accent-cyan)' }}>
                  N = 142 Postings
                </div>
              </div>
            </div>

            <div className="card">
              <div className="card-header">
                <div>
                  <h2 className="card-title">Skill Demand Distribution</h2>
                  <p className="card-subtitle">
                    Frequency of technologies required or preferred in Junior Backend job listings.
                  </p>
                </div>
                <button className="btn btn-primary" onClick={() => setActiveTab('assessment')}>
                  Test Your Skills <ArrowRight size={16} />
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', marginTop: '1rem' }}>
                {role.roleSkills.map(rs => {
                  const pct = Math.round(rs.marketDemandFrequency * 100);
                  const isRequired = rs.required;
                  return (
                    <div key={rs.skillId} style={{ background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                          <span style={{ fontWeight: 600, fontSize: '1rem' }}>
                            {rs.skill?.canonicalName || rs.skillId}
                          </span>
                          <span className={`badge ${isRequired ? 'badge-required' : 'badge-preferred'}`}>
                            {isRequired ? 'Required' : 'Preferred'}
                          </span>
                        </div>
                        <div style={{ fontWeight: 700, fontFamily: 'var(--font-mono)', color: isRequired ? '#a5b4fc' : '#67e8f9' }}>
                          {pct}% of jobs
                        </div>
                      </div>

                      <div className="progress-container">
                        <div
                          className={`progress-bar ${isRequired ? 'progress-indigo' : 'progress-cyan'}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>

                      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.35rem' }}>
                        Target Proficiency: <strong>{rs.proficiencyTarget}</strong> • Role Weight: <strong>{rs.roleWeight * 100}%</strong>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: PRACTICAL DIAGNOSTIC ASSESSMENT */}
        {activeTab === 'assessment' && assessment && (
          <div>
            {!attemptResult ? (
              <div className="card">
                <div className="card-header">
                  <div>
                    <span className="badge badge-preferred" style={{ marginBottom: '0.5rem' }}>
                      Diagnostic Assessment V1
                    </span>
                    <h2 className="card-title">{assessment.title}</h2>
                    <p className="card-subtitle">{assessment.description}</p>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#fbbf24', fontSize: '0.9rem', fontWeight: 600 }}>
                    <Clock size={16} /> {assessment.timeLimitMinutes} mins
                  </div>
                </div>

                {assessment.questions && assessment.questions.length > 0 && (
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                      <span>Question {currentQuestionIdx + 1} of {assessment.questions.length}</span>
                      <span>Sub-Skill: <strong>{assessment.questions[currentQuestionIdx].subSkill}</strong></span>
                    </div>

                    <div className="progress-container" style={{ marginBottom: '1.5rem' }}>
                      <div
                        className="progress-bar progress-emerald"
                        style={{ width: `${((currentQuestionIdx + 1) / assessment.questions.length) * 100}%` }}
                      />
                    </div>

                    <div style={{ background: 'rgba(255,255,255,0.02)', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                      <h3 style={{ fontSize: '1.05rem', fontWeight: 600, marginBottom: '0.75rem' }}>
                        {assessment.questions[currentQuestionIdx].prompt}
                      </h3>

                      {assessment.questions[currentQuestionIdx].codeSnippet && (
                        <pre className="code-block">
                          <code>{assessment.questions[currentQuestionIdx].codeSnippet}</code>
                        </pre>
                      )}

                      <div style={{ marginTop: '1.25rem' }}>
                        {assessment.questions[currentQuestionIdx].options?.map((opt, i) => {
                          const isSelected = userAnswers[assessment.questions![currentQuestionIdx].id] === opt;
                          return (
                            <button
                              key={i}
                              className={`option-btn ${isSelected ? 'selected' : ''}`}
                              onClick={() => handleSelectAnswer(assessment.questions![currentQuestionIdx].id, opt)}
                            >
                              <span>{opt}</span>
                              {isSelected && <CheckCircle2 size={16} color="#818cf8" />}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1.5rem' }}>
                      <button
                        className="btn btn-secondary"
                        disabled={currentQuestionIdx === 0}
                        onClick={() => setCurrentQuestionIdx(prev => Math.max(prev - 1, 0))}
                      >
                        Previous
                      </button>

                      {currentQuestionIdx < assessment.questions.length - 1 ? (
                        <button
                          className="btn btn-primary"
                          onClick={() => setCurrentQuestionIdx(prev => prev + 1)}
                        >
                          Next Question <ChevronRight size={16} />
                        </button>
                      ) : (
                        <button
                          className="btn btn-primary"
                          disabled={isSubmitting}
                          onClick={handleSubmitAssessment}
                          style={{ background: 'var(--accent-emerald)' }}
                        >
                          {isSubmitting ? 'Evaluating...' : 'Submit & Analyze Gaps'} <CheckCircle2 size={16} />
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <div className="card" style={{ textAlign: 'center', padding: '2.5rem' }}>
                  <div style={{
                    width: '80px',
                    height: '80px',
                    borderRadius: '50%',
                    background: attemptResult.passed ? 'rgba(16, 185, 129, 0.15)' : 'rgba(244, 63, 94, 0.15)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 1.25rem auto',
                    border: `2px solid ${attemptResult.passed ? 'var(--accent-emerald)' : 'var(--accent-rose)'}`
                  }}>
                    <span style={{ fontSize: '1.75rem', fontWeight: 800, fontFamily: 'var(--font-mono)' }}>
                      {attemptResult.score}%
                    </span>
                  </div>

                  <h2 style={{ fontSize: '1.5rem', fontWeight: 700 }}>
                    {attemptResult.passed ? 'Diagnostic Benchmark Achieved' : 'Diagnostic Completed — Areas Identified'}
                  </h2>
                  <p style={{ color: 'var(--text-secondary)', maxWidth: '600px', margin: '0.5rem auto 1.5rem auto' }}>
                    Earned {attemptResult.totalPointsEarned} / {attemptResult.maxPoints} points across practical questions. Your verified evidence profile has been updated.
                  </p>

                  <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem' }}>
                    <button className="btn btn-primary" onClick={() => setActiveTab('gaps')}>
                      View Priority Gaps <BarChart3 size={16} />
                    </button>
                    <button className="btn btn-secondary" onClick={() => { setAttemptResult(null); setCurrentQuestionIdx(0); setUserAnswers({}); }}>
                      Retake Test
                    </button>
                  </div>
                </div>

                <div className="card">
                  <h3 className="card-title" style={{ marginBottom: '1rem' }}>Sub-Skill Diagnostic Breakdown</h3>
                  <div className="grid-2">
                    {attemptResult.subSkillScores?.map((sub, i) => (
                      <div key={i} style={{ background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontWeight: 600 }}>{sub.subSkill}</span>
                          <span className={`badge ${sub.status === 'STRENGTH' ? 'badge-strength' : sub.status === 'MODERATE' ? 'badge-gap' : 'badge-critical'}`}>
                            {sub.status === 'STRENGTH' ? 'Strength' : sub.status === 'MODERATE' ? 'Moderate' : 'Needs Practice'}
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
              </div>
            )}
          </div>
        )}

        {/* TAB 3: CODE & SQL SANDBOX RUNNER */}
        {activeTab === 'sandbox' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div className="card" style={{ background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.08), rgba(16, 185, 129, 0.05))' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                <Terminal size={20} color="#6ee7b7" />
                <h2 className="card-title">Interactive Practical Execution Sandbox</h2>
              </div>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                Solve real engineering queries and algorithmic problems against test datasets. Passing hands-on challenges elevates your skill evidence to <strong style={{ color: '#6ee7b7' }}>Verified (High Confidence)</strong>.
              </p>
            </div>

            {/* Challenge Picker Tabs */}
            <div style={{ display: 'flex', gap: '0.75rem', overflowX: 'auto', paddingBottom: '0.5rem' }}>
              {challenges.map((ch, idx) => (
                <button
                  key={ch.id}
                  className={`btn ${selectedChallengeIdx === idx ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => handleSelectChallenge(idx)}
                  style={{ whiteSpace: 'nowrap', fontSize: '0.85rem' }}
                >
                  {ch.type === 'SQL' ? <Database size={14} /> : <Code2 size={14} />}
                  {ch.title}
                </button>
              ))}
            </div>

            {activeChallenge && (
              <div className="grid-2">
                {/* Left: Problem & Schema */}
                <div className="card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                    <span className="badge badge-preferred">{activeChallenge.type} Challenge</span>
                    <span style={{ fontSize: '0.8rem', color: '#fbbf24', fontWeight: 600 }}>
                      Difficulty: {activeChallenge.difficulty}
                    </span>
                  </div>

                  <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '0.5rem' }}>
                    {activeChallenge.title}
                  </h3>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1rem' }}>
                    {activeChallenge.description}
                  </p>

                  {activeChallenge.schemaPreview && (
                    <div style={{ marginTop: '1rem' }}>
                      <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.35rem' }}>
                        Database Schema
                      </div>
                      <pre className="code-block" style={{ fontSize: '0.8rem' }}>
                        <code>{activeChallenge.schemaPreview}</code>
                      </pre>
                    </div>
                  )}

                  {activeChallenge.sampleDataDescription && (
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                      ℹ️ {activeChallenge.sampleDataDescription}
                    </p>
                  )}
                </div>

                {/* Right: Code Editor & Execution Console */}
                <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                      Solution Editor ({activeChallenge.type})
                    </span>
                    <button
                      className="btn btn-primary"
                      disabled={isExecutingSandbox}
                      onClick={handleRunSandbox}
                      style={{ padding: '0.45rem 1rem', fontSize: '0.85rem', background: 'var(--accent-emerald)' }}
                    >
                      <Play size={14} /> {isExecutingSandbox ? 'Executing...' : 'Run & Verify'}
                    </button>
                  </div>

                  <textarea
                    value={sandboxCode}
                    onChange={(e) => setSandboxCode(e.target.value)}
                    style={{
                      width: '100%',
                      height: '240px',
                      background: '#070b14',
                      color: '#38bdf8',
                      fontFamily: 'var(--font-mono)',
                      fontSize: '0.85rem',
                      padding: '1rem',
                      borderRadius: '8px',
                      border: '1px solid var(--border-color)',
                      resize: 'vertical',
                      outline: 'none',
                      lineHeight: '1.5'
                    }}
                  />

                  {/* Execution Results Console */}
                  {sandboxResult && (
                    <div style={{ marginTop: '1rem', padding: '1rem', borderRadius: '8px', background: sandboxResult.passed ? 'rgba(16, 185, 129, 0.1)' : 'rgba(244, 63, 94, 0.1)', border: `1px solid ${sandboxResult.passed ? 'var(--accent-emerald)' : 'var(--accent-rose)'}` }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                        <span style={{ fontWeight: 700, color: sandboxResult.passed ? '#6ee7b7' : '#fda4af', fontSize: '0.9rem' }}>
                          {sandboxResult.passed ? '✓ Tests Passed' : '✗ Tests Failed'}
                        </span>
                        <span style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                          {sandboxResult.executionTimeMs}ms execution time
                        </span>
                      </div>

                      <p style={{ fontSize: '0.85rem', color: '#e2e8f0', marginBottom: sandboxResult.outputRows ? '0.75rem' : 0 }}>
                        {sandboxResult.message}
                      </p>

                      {/* SQL Output Rows Table Preview */}
                      {sandboxResult.outputRows && (
                        <div style={{ overflowX: 'auto', marginTop: '0.5rem' }}>
                          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem', fontFamily: 'var(--font-mono)' }}>
                            <thead>
                              <tr style={{ background: 'rgba(255,255,255,0.05)', borderBottom: '1px solid var(--border-color)' }}>
                                {Object.keys(sandboxResult.outputRows[0] || {}).map(k => (
                                  <th key={k} style={{ padding: '0.4rem', textAlign: 'left', color: '#a5b4fc' }}>{k}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {sandboxResult.outputRows.map((row: any, rIdx: number) => (
                                <tr key={rIdx} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                                  {Object.values(row).map((val: any, cIdx: number) => (
                                    <td key={cIdx} style={{ padding: '0.4rem' }}>{String(val)}</td>
                                  ))}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}

                      {/* JS Assertion Results */}
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
            )}
          </div>
        )}

        {/* TAB 4: SKILL GAP ENGINE */}
        {activeTab === 'gaps' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div className="card" style={{ background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.08), rgba(6, 182, 212, 0.05))' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                <Sparkles size={20} color="#a5b4fc" />
                <h2 className="card-title">Deterministic Skill Gap Ranking</h2>
              </div>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                Computed using the transparent formula: <code style={{ fontFamily: 'var(--font-mono)', background: 'rgba(0,0,0,0.3)', padding: '0.2rem 0.5rem', borderRadius: '4px' }}>Priority = Role_Weight × Market_Demand × (1 − Demonstrated_Proficiency)</code>
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {gaps.map(gap => {
                const profPercentage = Math.round(gap.demonstratedProficiency * 100);

                return (
                  <div key={gap.id} className="card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                          <h3 style={{ fontSize: '1.15rem', fontWeight: 700 }}>{gap.skillName}</h3>
                          <span className={`badge ${gap.status === 'MAINTAIN' ? 'badge-strength' : gap.status === 'MINOR_GAP' ? 'badge-gap' : 'badge-critical'}`}>
                            {gap.status === 'MAINTAIN' ? 'Competency Verified' : gap.status === 'MINOR_GAP' ? 'Moderate Priority Gap' : 'Critical Priority Gap'}
                          </span>
                        </div>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: '0.5rem', maxWidth: '700px' }}>
                          {gap.explanation}
                        </p>
                      </div>

                      <div style={{ textAlign: 'right', minWidth: '150px' }}>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                          Gap Priority Score
                        </div>
                        <div style={{ fontSize: '1.5rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: gap.priorityScore > 0.4 ? '#fda4af' : gap.priorityScore > 0.2 ? '#fcd34d' : '#6ee7b7' }}>
                          {gap.priorityScore.toFixed(3)}
                        </div>
                      </div>
                    </div>

                    <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)', display: 'flex', gap: '2rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      <span>Role Weight: <strong>{Math.round(gap.roleWeight * 100)}%</strong></span>
                      <span>Market Demand: <strong>{Math.round(gap.marketDemand * 100)}%</strong></span>
                      <span>Demonstrated Proficiency: <strong>{profPercentage}%</strong></span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 5: ACTION PLAN & CAPSTONE PROJECTS */}
        {activeTab === 'actions' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div className="card">
              <h2 className="card-title">Multi-Skill Capstone Action Roadmap</h2>
              <p className="card-subtitle">
                Targeted projects designed to bridge multiple high-priority gaps simultaneously.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', marginTop: '1.5rem' }}>
                {recommendations.map(rec => (
                  <div key={rec.id} style={{ background: 'rgba(255,255,255,0.02)', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                      <div>
                        <span className="badge badge-critical" style={{ marginBottom: '0.35rem' }}>
                          {rec.type.replace('_', ' ')}
                        </span>
                        <h3 style={{ fontSize: '1.15rem', fontWeight: 700 }}>{rec.title}</h3>
                      </div>
                      <span style={{ fontSize: '0.85rem', color: '#a5b4fc', fontFamily: 'var(--font-mono)' }}>
                        ~{rec.estimatedHours} hrs effort
                      </span>
                    </div>

                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1rem' }}>
                      {rec.description}
                    </p>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
                      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                        {rec.targetSkillNames.map((name, i) => (
                          <span key={i} style={{ background: 'rgba(99, 102, 241, 0.1)', color: '#c7d2fe', fontSize: '0.75rem', padding: '0.2rem 0.6rem', borderRadius: '4px', border: '1px solid rgba(99, 102, 241, 0.2)' }}>
                            {name}
                          </span>
                        ))}
                      </div>

                      <button className="btn btn-primary" style={{ padding: '0.45rem 0.9rem', fontSize: '0.85rem' }}>
                        Start Project Guided Lab <ChevronRight size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 6: EXPLAINABLE JOB MATCHING */}
        {activeTab === 'jobs' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div className="card">
              <h2 className="card-title">Explainable Job Recommendations</h2>
              <p className="card-subtitle">
                Matches are computed directly against your demonstrated skill evidence with full requirement traceability.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', marginTop: '1.5rem' }}>
                {jobMatches.map(match => (
                  <div key={match.job.id} style={{ background: 'rgba(255,255,255,0.02)', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
                      <div>
                        <h3 style={{ fontSize: '1.2rem', fontWeight: 700 }}>{match.job.title}</h3>
                        <div style={{ color: 'var(--accent-cyan)', fontSize: '0.9rem', fontWeight: 500, marginTop: '0.2rem' }}>
                          {match.job.company} • <span style={{ color: 'var(--text-muted)' }}>{match.job.location}</span>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div style={{
                          padding: '0.4rem 0.85rem',
                          borderRadius: '8px',
                          background: match.matchScore >= 70 ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                          border: `1px solid ${match.matchScore >= 70 ? 'var(--accent-emerald)' : 'var(--accent-amber)'}`,
                          fontFamily: 'var(--font-mono)',
                          fontWeight: 800,
                          fontSize: '1.1rem'
                        }}>
                          {match.matchScore}% Match
                        </div>
                      </div>
                    </div>

                    <div style={{ background: 'rgba(0,0,0,0.25)', padding: '0.85rem', borderRadius: '8px', margin: '1rem 0', border: '1px solid rgba(255,255,255,0.04)' }}>
                      <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '0.25rem' }}>
                        Match Explanation
                      </div>
                      <div style={{ fontSize: '0.875rem', color: '#e2e8f0' }}>
                        {match.explanation}
                      </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                      <div style={{ display: 'flex', gap: '1rem', fontSize: '0.8rem' }}>
                        <div>
                          <span style={{ color: 'var(--text-muted)' }}>Verified Matches: </span>
                          <strong style={{ color: '#6ee7b7' }}>{match.matchedSkills.map(m => m.canonicalName).join(', ') || 'None yet'}</strong>
                        </div>
                      </div>

                      <button className="btn btn-secondary" style={{ padding: '0.45rem 0.85rem', fontSize: '0.85rem' }}>
                        Inspect Match Details
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
