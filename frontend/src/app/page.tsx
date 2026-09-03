'use client';

import React, { useState, useEffect } from 'react';
import {
  Role,
  Assessment,
  AssessmentAttempt,
  SkillGap,
  ActionRecommendation,
  JobMatchResult,
  ProjectEvidence,
  CurriculumProfile,
  CurriculumComparisonResult,
  Skill,
  User,
  Profile
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
  Database,
  Code2,
  Play,
  Terminal,
  Sparkles,
  Github,
  FolderGit2,
  ExternalLink,
  PlusCircle,
  FileText,
  Printer,
  Copy,
  Check,
  X,
  GraduationCap,
  BookOpen,
  Sliders,
  LogIn,
  LogOut,
  RotateCcw
} from 'lucide-react';

const API_BASE = (process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:4000/api').replace(/\/$/, '');

export default function SkillBridgeApp() {
  type AppTab = 'market' | 'curriculum' | 'assessment' | 'sandbox' | 'gaps' | 'actions' | 'jobs' | 'admin';
  const [activeTab, setActiveTab] = useState<AppTab>('market');
  const [publicView, setPublicView] = useState<'home' | 'market' | 'curriculum'>('home');

  // Auth state
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentProfile, setCurrentProfile] = useState<Profile | null>(null);
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState<'LOGIN' | 'REGISTER'>('LOGIN');
  const [authForm, setAuthForm] = useState({
    email: '',
    password: '',
    fullName: '',
    targetRoleId: 'role_junior_backend'
  });
  const [authError, setAuthError] = useState('');
  const [isAuthLoading, setIsAuthLoading] = useState(false);

  // Core domain data
  const [role, setRole] = useState<Role | null>(null);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [challenges, setChallenges] = useState<any[]>([]);
  const [curricula, setCurricula] = useState<CurriculumProfile[]>([]);
  const [selectedCurriculumId, setSelectedCurriculumId] = useState<string>('curr_bsc_cse');
  const [curriculumAnalysis, setCurriculumAnalysis] = useState<CurriculumComparisonResult | null>(null);

  // Candidate assessment session state
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [userAnswers, setUserAnswers] = useState<Record<string, string>>({});
  const [isSubmittingAssessment, setIsSubmittingAssessment] = useState(false);
  const [attemptResult, setAttemptResult] = useState<AssessmentAttempt | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<number>(30 * 60);

  // Sandbox runner state
  const [selectedChallengeIdx, setSelectedChallengeIdx] = useState(0);
  const [sandboxCode, setSandboxCode] = useState('');
  const [isRunningSandbox, setIsRunningSandbox] = useState(false);
  const [sandboxResult, setSandboxResult] = useState<any | null>(null);

  // Candidate personalized data
  const [gaps, setGaps] = useState<SkillGap[]>([]);
  const [recommendations, setRecommendations] = useState<ActionRecommendation[]>([]);
  const [jobMatches, setJobMatches] = useState<JobMatchResult[]>([]);
  const [expandedMatchId, setExpandedMatchId] = useState<string | null>(null);
  const [userProjects, setUserProjects] = useState<ProjectEvidence[]>([]);

  // Project submission modal state
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [projectForm, setProjectForm] = useState({
    title: '',
    repoUrl: '',
    description: '',
    primarySkills: [] as string[]
  });
  const [isSubmittingProject, setIsSubmittingProject] = useState(false);
  const [projectSuccessMsg, setProjectSuccessMsg] = useState('');

  // Skill passport state
  const [showPassportModal, setShowPassportModal] = useState(false);
  const [passportData, setPassportData] = useState<any | null>(null);
  const [copySuccess, setCopySuccess] = useState(false);

  // Admin state
  const [adminOverview, setAdminOverview] = useState<any | null>(null);
  const [editingSkillWeight, setEditingSkillWeight] = useState<{ skillId: string; roleWeight: number; marketDemandFrequency: number } | null>(null);
  const [aliasForm, setAliasForm] = useState({ rawAlias: '', canonicalSkillId: '' });
  const [weightSaveSuccess, setWeightSaveSuccess] = useState(false);
  const [aliasSaveSuccess, setAliasSaveSuccess] = useState(false);

  const activeUserId = currentUser ? currentUser.id : 'demo_user_01';

  const authHeaders = () => {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (authToken) headers['Authorization'] = `Bearer ${authToken}`;
    return headers;
  };

  const refreshUserData = (userId = activeUserId) => {
    fetch(`${API_BASE}/me/gaps?userId=${userId}&roleId=role_junior_backend`)
      .then(res => res.json())
      .then(data => { if (Array.isArray(data)) setGaps(data); })
      .catch((err) => console.error('[SkillBridge] Data load failed:', err));

    fetch(`${API_BASE}/me/recommendations?userId=${userId}&roleId=role_junior_backend`)
      .then(res => res.json())
      .then(data => { if (Array.isArray(data)) setRecommendations(data); })
      .catch((err) => console.error('[SkillBridge] Data load failed:', err));

    fetch(`${API_BASE}/jobs/matches?userId=${userId}&roleId=role_junior_backend`)
      .then(res => res.json())
      .then(data => { if (Array.isArray(data)) setJobMatches(data); })
      .catch((err) => console.error('[SkillBridge] Data load failed:', err));

    fetch(`${API_BASE}/me/projects?userId=${userId}`)
      .then(res => res.json())
      .then(data => setUserProjects(data))
      .catch((err) => console.error('[SkillBridge] Data load failed:', err));

    fetch(`${API_BASE}/admin/overview`)
      .then(res => res.json())
      .then(data => setAdminOverview(data))
      .catch((err) => console.error('[SkillBridge] Data load failed:', err));
  };

  const fetchRoleAndSkills = () => {
    fetch(`${API_BASE}/roles/role_junior_backend`)
      .then(res => res.json())
      .then(data => {
        setRole(data);
        if (data.roleSkills && data.roleSkills.length > 0 && !editingSkillWeight) {
          setEditingSkillWeight({
            skillId: data.roleSkills[0].skillId,
            roleWeight: data.roleSkills[0].roleWeight,
            marketDemandFrequency: data.roleSkills[0].marketDemandFrequency
          });
        }
      })
      .catch((err) => console.error('[SkillBridge] Data load failed:', err));

    fetch(`${API_BASE}/skills`)
      .then(res => res.json())
      .then(data => setSkills(data))
      .catch((err) => console.error('[SkillBridge] Data load failed:', err));
  };

  useEffect(() => {
    fetchRoleAndSkills();

    fetch(`${API_BASE}/assessments/assessment_backend_diagnostic`)
      .then(res => res.json())
      .then(data => {
        setAssessment(data);
        if (data && data.timeLimitMinutes) {
          setTimeRemaining(data.timeLimitMinutes * 60);
        }
      })
      .catch((err) => console.error('[SkillBridge] Data load failed:', err));

    fetch(`${API_BASE}/sandbox/challenges`)
      .then(res => res.json())
      .then(data => {
        setChallenges(data);
        if (data.length > 0) {
          setSandboxCode(data[0].starterCode);
        }
      })
      .catch((err) => console.error('[SkillBridge] Data load failed:', err));

    fetch(`${API_BASE}/curriculum/institutions`)
      .then(res => res.json())
      .then(data => setCurricula(data))
      .catch((err) => console.error('[SkillBridge] Data load failed:', err));

    fetch(`${API_BASE}/curriculum/analyze?institutionId=curr_bsc_cse&roleId=role_junior_backend`)
      .then(res => res.json())
      .then(data => setCurriculumAnalysis(data))
      .catch((err) => console.error('[SkillBridge] Data load failed:', err));

    // Restore saved session if available
    const savedToken = localStorage.getItem('skillbridge_token');
    const savedUser = localStorage.getItem('skillbridge_user');
    const savedProfile = localStorage.getItem('skillbridge_profile');
    if (savedToken && savedUser && savedProfile) {
      try {
        setCurrentUser(JSON.parse(savedUser));
        setCurrentProfile(JSON.parse(savedProfile));
        setAuthToken(savedToken);
      } catch {
        localStorage.removeItem('skillbridge_token');
        localStorage.removeItem('skillbridge_user');
        localStorage.removeItem('skillbridge_profile');
      }
    }

    refreshUserData();
  }, []);

  useEffect(() => {
    if (!assessment || timeRemaining <= 0) return;
    const interval = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [assessment, timeRemaining > 0]);

  const handleDemoLogin = async () => {
    setIsAuthLoading(true);
    try {
      const res = await fetch(`${API_BASE}/me?userId=demo_user_01`);
      const data = await res.json();
      if (data.user && data.profile) {
        const token = 'demo_token_demo_user_01';
        setCurrentUser(data.user);
        setCurrentProfile(data.profile);
        setAuthToken(token);
        localStorage.setItem('skillbridge_token', token);
        localStorage.setItem('skillbridge_user', JSON.stringify(data.user));
        localStorage.setItem('skillbridge_profile', JSON.stringify(data.profile));
        setShowAuthModal(false);
        setActiveTab('market');
        refreshUserData('demo_user_01');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setIsAuthLoading(true);

    const endpoint = authMode === 'REGISTER' ? `${API_BASE}/auth/register` : `${API_BASE}/auth/login`;
    const payload = authMode === 'REGISTER'
      ? {
          email: authForm.email,
          password: authForm.password,
          fullName: authForm.fullName,
          targetRoleId: authForm.targetRoleId
        }
      : {
          email: authForm.email,
          password: authForm.password
        };

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Authentication failed.');
      }

      setCurrentUser(data.user);
      setCurrentProfile(data.profile);
      setAuthToken(data.token);

      localStorage.setItem('skillbridge_token', data.token);
      localStorage.setItem('skillbridge_user', JSON.stringify(data.user));
      localStorage.setItem('skillbridge_profile', JSON.stringify(data.profile));

      setShowAuthModal(false);
      setAuthForm({ email: '', password: '', fullName: '', targetRoleId: 'role_junior_backend' });
      setActiveTab('market');
      refreshUserData(data.user.id);
    } catch (err: any) {
      setAuthError(err.message || 'An error occurred.');
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('skillbridge_token');
    localStorage.removeItem('skillbridge_user');
    localStorage.removeItem('skillbridge_profile');
    setCurrentUser(null);
    setCurrentProfile(null);
    setAuthToken(null);
    setPublicView('home');
    setActiveTab('market');
  };

  const handleCurriculumChange = (currId: string) => {
    setSelectedCurriculumId(currId);
    fetch(`${API_BASE}/curriculum/analyze?institutionId=${currId}&roleId=role_junior_backend`)
      .then(res => res.json())
      .then(data => setCurriculumAnalysis(data))
      .catch((err) => console.error('[SkillBridge] Data load failed:', err));
  };

  const handleOpenPassport = async () => {
    if (!currentUser) {
      setAuthMode('LOGIN');
      setShowAuthModal(true);
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/me/report?userId=${activeUserId}`, { headers: authHeaders() });
      const data = await res.json();
      setPassportData(data);
      setShowPassportModal(true);
    } catch (err) {
      console.error(err);
    }
  };

  const handleCopyPassportMarkdown = () => {
    if (!passportData) return;
    const candidate = passportData.candidate || {};
    const alignment = passportData.metrics?.overallAlignment ?? passportData.alignmentScore ?? 0;
    const lines = [
      `# SkillBridge Evidence Passport`,
      ``,
      `**Candidate:** ${candidate.name || candidate.fullName || 'Candidate'}`,
      `**Target Role:** ${candidate.targetRole || 'Junior Backend Engineer'}`,
      `**Passport ID:** ${passportData.passportId || 'SKILLBRIDGE-VERIFIED'}`,
      `**Target Alignment:** ${alignment}%`,
      ``,
      `## Demonstrated Competencies`,
      ...(passportData.evidence || passportData.competencies || []).map(
        (comp: any) => `- ${comp.skillName || comp.skill || comp.skillId} — ${Math.round((comp.proficiencyScore ?? comp.proficiency ?? 0) * 100)}% via ${comp.sourceType || comp.provenance || 'PRACTICAL_EVALUATION'}`
      )
    ];
    navigator.clipboard.writeText(lines.join('\n'));
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2500);
  };

  const handleAnswerSelect = (questionId: string, optionText: string) => {
    setUserAnswers(prev => ({ ...prev, [questionId]: optionText }));
  };

  const handleSubmitAssessment = async () => {
    if (!assessment) return;
    setIsSubmittingAssessment(true);

    const answersPayload = Object.entries(userAnswers).map(([questionId, selectedAnswer]) => ({
      questionId,
      selectedAnswer
    }));

    try {
      const res = await fetch(`${API_BASE}/assessments/${assessment.id}/submit`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          userId: activeUserId,
          timeSpentSeconds: assessment.timeLimitMinutes * 60 - timeRemaining,
          answers: answersPayload
        })
      });

      const attempt = await res.json();
      setAttemptResult(attempt);
      refreshUserData();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmittingAssessment(false);
    }
  };

  useEffect(() => {
    if (assessment && timeRemaining === 0 && Object.keys(userAnswers).length > 0 && !attemptResult) {
      handleSubmitAssessment();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeRemaining]);

  const handleSelectChallenge = (idx: number) => {
    setSelectedChallengeIdx(idx);
    setSandboxCode(challenges[idx].starterCode);
    setSandboxResult(null);
  };

  const handleRunSandbox = async () => {
    const challenge = challenges[selectedChallengeIdx];
    if (!challenge) return;

    setIsRunningSandbox(true);
    setSandboxResult(null);

    const endpoint = challenge.type === 'SQL' ? `${API_BASE}/sandbox/run-sql` : `${API_BASE}/sandbox/run-code`;
    const payload = challenge.type === 'SQL'
      ? { challengeId: challenge.id, query: sandboxCode, userId: activeUserId }
      : { challengeId: challenge.id, code: sandboxCode, userId: activeUserId };

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      setSandboxResult(data);
      if (data.passed) {
        refreshUserData();
      }
    } catch (err) {
      console.error(err);
      setSandboxResult({ passed: false, error: 'Failed to run code.' });
    } finally {
      setIsRunningSandbox(false);
    }
  };

  const handleProjectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectForm.title || !projectForm.repoUrl) return;

    setIsSubmittingProject(true);
    setProjectSuccessMsg('');

    try {
      const res = await fetch(`${API_BASE}/me/projects`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          userId: activeUserId,
          title: projectForm.title,
          repoUrl: projectForm.repoUrl,
          description: projectForm.description,
          primarySkills: projectForm.primarySkills
        })
      });

      const data = await res.json();
      if (data.project) {
        const status = data.project.verificationStatus;
        const statusMsg =
          status === 'VERIFIED'
            ? `Successfully verified ${data.project.title}! Detected stack: ${data.project.detectedStack.join(', ')}.`
            : status === 'NEEDS_REVIEW'
              ? `${data.project.title} was received, but no test suite was detected — status: Needs Review.`
              : `${data.project.title} could not be verified against GitHub — status: Pending Review.`;
        setProjectSuccessMsg(statusMsg);
        setProjectForm({ title: '', repoUrl: '', description: '', primarySkills: [] });
        refreshUserData();
        setTimeout(() => {
          setShowProjectModal(false);
          setProjectSuccessMsg('');
        }, 3000);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmittingProject(false);
    }
  };

  const handleCreateAlias = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aliasForm.rawAlias || !aliasForm.canonicalSkillId) return;

    try {
      const res = await fetch(`${API_BASE}/admin/skills/alias`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          alias: aliasForm.rawAlias,
          skillId: aliasForm.canonicalSkillId
        })
      });
      const data = await res.json();
      if (data.success) {
        setAliasSaveSuccess(true);
        setAliasForm({ rawAlias: '', canonicalSkillId: '' });
        refreshUserData();
        setTimeout(() => setAliasSaveSuccess(false), 3000);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateRoleWeight = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!role || !editingSkillWeight) return;

    try {
      const res = await fetch(`${API_BASE}/admin/roles/${role.id}/weights`, {
        method: 'PATCH',
        headers: authHeaders(),
        body: JSON.stringify(editingSkillWeight)
      });
      const data = await res.json();
      if (data.success) {
        setWeightSaveSuccess(true);
        fetchRoleAndSkills();
        refreshUserData();
        setTimeout(() => setWeightSaveSuccess(false), 3000);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const activeChallenge = challenges[selectedChallengeIdx];

  // ==========================================
  // VIEW RENDERERS
  // ==========================================

  const renderMarketView = () => {
    if (!role) return null;
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <div className="page-header">
          <div>
            <h1 className="page-title">Junior Backend Job Market Demand</h1>
            <p className="page-subtitle">
              Empirical data from 142 junior backend job postings in Bangladesh (Dhaka, Chittagong, and remote positions).
            </p>
          </div>
        </div>

        <div className="stat-grid-3">
          <div className="stat-card">
            <div className="stat-label">Focus Region</div>
            <div className="stat-value" style={{ fontSize: '1.3rem' }}>{role.marketContext.region}</div>
            <div className="stat-sub">Dhaka & Regional Tech Hubs</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Experience Tier</div>
            <div className="stat-value" style={{ fontSize: '1.3rem' }}>{role.marketContext.experienceLevel}</div>
            <div className="stat-sub">0 - 2 Years Experience</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Sample Size</div>
            <div className="stat-value" style={{ fontSize: '1.3rem', color: '#60a5fa' }}>N = 142 Postings</div>
            <div className="stat-sub">Bdjobs, LinkedIn & GitHub</div>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <div>
              <h2 className="card-title">Required Backend Technologies by Frequency</h2>
              <p className="card-subtitle">
                How frequently each technology appears in actual job requirements for junior backend roles.
              </p>
            </div>
            {currentUser && (
              <button className="btn btn-primary" onClick={() => setActiveTab('assessment')}>
                Take Diagnostic Test <ArrowRight size={15} />
              </button>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.15rem' }}>
            {role?.roleSkills ? role.roleSkills.map(rs => {
              const pct = Math.round(rs.marketDemandFrequency * 100);
              const isRequired = rs.required;

              return (
                <div key={rs.skillId}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ fontWeight: 600, fontSize: '0.925rem' }}>
                        {rs.skill?.canonicalName || rs.skillId}
                      </span>
                      <span className={`badge ${isRequired ? 'badge-required' : 'badge-preferred'}`}>
                        {isRequired ? 'Required' : 'Preferred'}
                      </span>
                    </div>
                    <div style={{ fontWeight: 700, fontFamily: 'var(--font-mono)', color: isRequired ? '#f87171' : '#60a5fa' }}>
                      {pct}% of jobs
                    </div>
                  </div>

                  <div className="progress-container">
                    <div
                      className={`progress-bar ${isRequired ? 'progress-indigo' : 'progress-cyan'}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>

                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                    Target Level: <strong>{rs.proficiencyTarget}</strong> • Role Weight: <strong>{rs.roleWeight * 100}%</strong>
                  </div>
                </div>
              );
            }) : (
              <div style={{ color: 'var(--text-muted)', padding: '1rem 0' }}>Loading market demand data...</div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderCurriculumView = () => {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <div className="page-header">
          <div>
            <h1 className="page-title">University Syllabi vs. Market Reality</h1>
            <p className="page-subtitle">
              Benchmarking academic computer science courses against modern backend production expectations.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {curricula.map(c => (
            <button
              key={c.id}
              className={`btn ${selectedCurriculumId === c.id ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => handleCurriculumChange(c.id)}
              style={{ fontSize: '0.825rem' }}
            >
              <BookOpen size={14} /> {c.institutionName}
            </button>
          ))}
        </div>

        {curriculumAnalysis && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div className="stat-grid-3">
              <div className="stat-card">
                <div className="stat-label">Syllabus Alignment Score</div>
                <div className="stat-value" style={{ color: curriculumAnalysis.marketAlignmentScore >= 65 ? '#10b981' : '#f59e0b' }}>
                  {curriculumAnalysis.marketAlignmentScore}%
                </div>
                <div className="stat-sub">Coverage of Junior Backend Skills</div>
              </div>
              <div className="stat-card" style={{ gridColumn: 'span 2' }}>
                <div className="stat-label">Analysis Summary</div>
                <p style={{ fontSize: '0.875rem', color: '#e5e7eb', marginTop: '0.4rem', lineHeight: 1.5 }}>
                  {curriculumAnalysis.summaryAnalysis}
                </p>
              </div>
            </div>

            <div className="grid-2">
              <div className="card">
                <h3 className="card-title" style={{ color: '#6ee7b7', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                  <CheckCircle2 size={18} /> Strong Academic Foundation
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {curriculumAnalysis.strongAcademicAreas.map((item, idx) => (
                    <div key={idx} style={{ background: '#0e141a', border: '1px solid #1c2b24', padding: '0.85rem', borderRadius: '6px' }}>
                      <strong style={{ color: '#a7f3d0', fontSize: '0.9rem' }}>{item.skill}</strong>
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                        {item.reason}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="card">
                <h3 className="card-title" style={{ color: '#fda4af', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                  <AlertCircle size={18} /> Critical Market Omissions
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {curriculumAnalysis.criticalMarketOmissions.map((item, idx) => (
                    <div key={idx} style={{ background: '#160e12', border: '1px solid #331d25', padding: '0.85rem', borderRadius: '6px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <strong style={{ color: '#fecdd3', fontSize: '0.9rem' }}>{item.skill}</strong>
                        <span className="badge badge-critical" style={{ fontSize: '0.675rem' }}>
                          Demanded by {item.marketDemand}% of Jobs
                        </span>
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#fb7185', fontWeight: 600, marginTop: '0.25rem' }}>
                        Academic Status: {item.academicStatus}
                      </div>
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.35rem' }}>
                        Recommendation: {item.recommendation}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderAssessmentView = () => {
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
              <button className="btn btn-primary" onClick={() => setActiveTab('gaps')}>
                View My Skill Gaps <BarChart3 size={15} />
              </button>
              <button className="btn btn-secondary" onClick={() => { setAttemptResult(null); setCurrentQuestionIdx(0); setUserAnswers({}); }}>
                <RotateCcw size={14} /> Retake Test
              </button>
            </div>
          </div>

          <div className="card">
            <h3 className="card-title" style={{ marginBottom: '1rem' }}>Sub-Skill Breakdown</h3>
            <div className="grid-2">
              {attemptResult.subSkillScores?.map((sub, i) => (
                <div key={i} style={{ background: '#0e1118', padding: '1rem', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
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
            <p className="page-subtitle">6 multi-part questions testing practical Node.js, SQL, and HTTP engineering skills.</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#131722', border: '1px solid var(--border-color)', padding: '0.45rem 0.85rem', borderRadius: '6px', fontFamily: 'var(--font-mono)', fontSize: '0.85rem' }}>
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
  };

  const renderSandboxView = () => {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <div className="page-header">
          <div>
            <h1 className="page-title">SQL & Code Sandbox</h1>
            <p className="page-subtitle">
              Solve real engineering queries and algorithmic problems against test datasets. Passing hands-on challenges elevates your skill evidence to Verified.
            </p>
          </div>
        </div>

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
                    background: '#080a0e',
                    color: '#93c5fa',
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
  };

  const renderGapsView = () => {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <div className="page-header">
          <div>
            <h1 className="page-title">My Skill Gaps & Prioritization</h1>
            <p className="page-subtitle">
              Gaps prioritized mathematically using role weight, market demand frequency, and demonstrated proficiency:
              Priority = Role Weight × Market Demand × (1 - Demonstrated Proficiency).
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {gaps.map(gap => {
            const profPercentage = Math.round(gap.demonstratedProficiency * 100);
            return (
              <div key={gap.skillId} className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
                  <div style={{ flex: 1, minWidth: '240px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
                      <h3 style={{ fontSize: '1.05rem', fontWeight: 600 }}>{gap.skillName}</h3>
                      <span className={`badge ${gap.status === 'MAJOR_GAP' ? 'badge-critical' : gap.status === 'MINOR_GAP' ? 'badge-gap' : 'badge-strength'}`}>
                        {gap.status === 'MAJOR_GAP' ? 'Critical Gap' : gap.status === 'MINOR_GAP' ? 'Moderate Gap' : 'Target Achieved'}
                      </span>
                    </div>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.825rem' }}>
                      {gap.explanation}
                    </p>
                  </div>

                  <div style={{ textAlign: 'right', minWidth: '130px' }}>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                      Priority Score
                    </div>
                    <div style={{ fontSize: '1.4rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: gap.priorityScore > 0.4 ? '#fda4af' : gap.priorityScore > 0.2 ? '#fcd34d' : '#6ee7b7' }}>
                      {gap.priorityScore.toFixed(3)}
                    </div>
                  </div>
                </div>

                <div style={{ marginTop: '0.85rem', paddingTop: '0.85rem', borderTop: '1px solid var(--border-color)', display: 'flex', gap: '1.5rem', fontSize: '0.775rem', color: 'var(--text-secondary)' }}>
                  <span>Role Weight: <strong>{Math.round(gap.roleWeight * 100)}%</strong></span>
                  <span>Market Demand: <strong>{Math.round(gap.marketDemand * 100)}%</strong></span>
                  <span>Demonstrated: <strong>{profPercentage}%</strong></span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderActionsView = () => {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
        <div className="page-header">
          <div>
            <h1 className="page-title">Recommended Projects to Build</h1>
            <p className="page-subtitle">
              Targeted projects designed to bridge multiple high-priority gaps simultaneously. Submit your GitHub repository URL for automated signal extraction.
            </p>
          </div>
          <button className="btn btn-primary" onClick={() => setShowProjectModal(true)}>
            <PlusCircle size={15} /> Submit GitHub Project
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {recommendations.map(rec => (
            <div key={rec.id} className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                <div>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 600 }}>{rec.title}</h3>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginTop: '0.2rem' }}>
                    Type: {rec.type} • Est. Time: {rec.estimatedHours} hours
                  </div>
                </div>
                <button className="btn btn-secondary" onClick={() => setShowProjectModal(true)} style={{ fontSize: '0.8rem', padding: '0.4rem 0.75rem' }}>
                  <FolderGit2 size={13} /> Submit Solution
                </button>
              </div>

              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: '0.5rem 0' }}>
                {rec.description}
              </p>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Target Skills:</span>
                {rec.targetSkillNames?.map((skillName, idx) => (
                  <span key={idx} className="badge badge-preferred" style={{ fontSize: '0.675rem' }}>
                    {skillName}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="card">
          <div className="card-header">
            <div>
              <h2 className="card-title">Verified Project Portfolio</h2>
              <p className="card-subtitle">
                GitHub repositories submitted and scanned for Dockerfiles, tests, and database migrations.
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {userProjects.map(proj => (
              <div key={proj.id} style={{ background: '#0e1118', padding: '1rem', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <a href={proj.repoUrl} target="_blank" rel="noreferrer" style={{ color: '#60a5fa', fontWeight: 600, fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.4rem', textDecoration: 'none' }}>
                    <Github size={14} /> {proj.title} <ExternalLink size={12} />
                  </a>
                  <span style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                    ~{proj.commitCountEstimate} commits
                  </span>
                </div>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', margin: '0.5rem 0' }}>
                  {proj.description}
                </p>
                <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                  {proj.detectedStack.map((tech, idx) => (
                    <span key={idx} style={{ background: '#1c2336', color: '#93c5fd', fontSize: '0.7rem', padding: '0.15rem 0.45rem', borderRadius: '4px' }}>
                      {tech}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const renderJobsView = () => {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <div className="page-header">
          <div>
            <h1 className="page-title">Matching Backend Jobs</h1>
            <p className="page-subtitle">
              Compatibility scores computed directly against your demonstrated skill evidence with full requirement traceability.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {jobMatches.map(match => (
            <div key={match.job.id} className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 700 }}>{match.job.title}</h3>
                  <div style={{ color: '#60a5fa', fontSize: '0.85rem', fontWeight: 500, marginTop: '0.15rem' }}>
                    {match.job.company} • <span style={{ color: 'var(--text-muted)' }}>{match.job.location}</span>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{
                    padding: '0.35rem 0.75rem',
                    borderRadius: '6px',
                    fontFamily: 'var(--font-mono)',
                    fontWeight: 700,
                    fontSize: '1.1rem',
                    background: match.matchScore >= 70 ? 'rgba(16, 185, 129, 0.1)' : 'rgba(59, 130, 246, 0.1)',
                    color: match.matchScore >= 70 ? '#6ee7b7' : '#93c5fd',
                    border: `1px solid ${match.matchScore >= 70 ? 'rgba(16, 185, 129, 0.3)' : 'rgba(59, 130, 246, 0.3)'}`
                  }}>
                    {Math.round(match.matchScore)}% Match
                  </div>
                </div>
              </div>

              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: '0.75rem 0' }}>
                {match.job.description}
              </p>

              <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                <div style={{ fontSize: '0.775rem' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Verified Matches: </span>
                  <strong style={{ color: '#6ee7b7' }}>{match.matchedSkills.map(m => m.canonicalName).join(', ') || 'None yet'}</strong>
                </div>

                <button
                  className="btn btn-secondary"
                  onClick={() => setExpandedMatchId(expandedMatchId === match.job.id ? null : match.job.id)}
                  style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}
                >
                  {expandedMatchId === match.job.id ? 'Hide Details' : 'View Role Details'}
                </button>
              </div>

              {expandedMatchId === match.job.id && (
                <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>{match.explanation}</div>
                  {match.missingSkills.length > 0 && (
                    <div style={{ fontSize: '0.775rem', marginTop: '0.5rem' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Missing Skills: </span>
                      <span style={{ color: '#fda4af' }}>{match.missingSkills.map(m => m.canonicalName).join(', ')}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderAdminView = () => {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <div className="page-header">
          <div>
            <h1 className="page-title">Admin & Ontology Console</h1>
            <p className="page-subtitle">
              Manage canonical skill ontologies, merge synonyms, tune role skill importance weights, and inspect ingestion coverage.
            </p>
          </div>
        </div>

        {adminOverview && (
          <div className="stat-grid-3">
            <div className="stat-card">
              <div className="stat-label">Total Jobs Ingested</div>
              <div className="stat-value">{adminOverview.totalJobsCount}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Canonical Skills</div>
              <div className="stat-value">{adminOverview.canonicalSkillsCount}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Recognized Aliases</div>
              <div className="stat-value">{adminOverview.totalAliasesCount}</div>
            </div>
          </div>
        )}

        <div className="grid-2">
          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
              <Sliders size={18} color="#60a5fa" />
              <h2 className="card-title">Add Skill Alias Mapping</h2>
            </div>
            <form onSubmit={handleCreateAlias} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.3rem' }}>
                  Raw Job Alias / Synonym
                </label>
                <input
                  type="text"
                  placeholder="e.g. Postgres, PSQL, Node"
                  value={aliasForm.rawAlias}
                  onChange={e => setAliasForm({ ...aliasForm, rawAlias: e.target.value })}
                  style={{ width: '100%', padding: '0.65rem', background: '#0a0c10', border: '1px solid var(--border-color)', borderRadius: '6px', color: '#fff', fontSize: '0.85rem' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.3rem' }}>
                  Maps To Canonical Skill
                </label>
                <select
                  value={aliasForm.canonicalSkillId}
                  onChange={e => setAliasForm({ ...aliasForm, canonicalSkillId: e.target.value })}
                  style={{ width: '100%', padding: '0.65rem', background: '#0a0c10', border: '1px solid var(--border-color)', borderRadius: '6px', color: '#fff', fontSize: '0.85rem' }}
                >
                  <option value="">Select canonical skill...</option>
                  {skills.map(s => (
                    <option key={s.id} value={s.id}>{s.canonicalName}</option>
                  ))}
                </select>
              </div>

              <button type="submit" className="btn btn-primary" style={{ marginTop: '0.5rem' }}>
                Add Synonym Mapping
              </button>

              {aliasSaveSuccess && (
                <div style={{ color: '#6ee7b7', fontSize: '0.8rem' }}>✓ Alias mapping registered.</div>
              )}
            </form>
          </div>

          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
              <Sliders size={18} color="#f59e0b" />
              <h2 className="card-title">Role Skill Importance Tuner</h2>
            </div>
            {role && editingSkillWeight && (
              <form onSubmit={handleUpdateRoleWeight} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.3rem' }}>
                    Select Role Skill
                  </label>
                  <select
                    value={editingSkillWeight.skillId}
                    onChange={e => {
                      const found = role.roleSkills.find(rs => rs.skillId === e.target.value);
                      if (found) {
                        setEditingSkillWeight({
                          skillId: found.skillId,
                          roleWeight: found.roleWeight,
                          marketDemandFrequency: found.marketDemandFrequency
                        });
                      }
                    }}
                    style={{ width: '100%', padding: '0.65rem', background: '#0a0c10', border: '1px solid var(--border-color)', borderRadius: '6px', color: '#fff', fontSize: '0.85rem' }}
                  >
                    {(role?.roleSkills || []).map(rs => (
                      <option key={rs.skillId} value={rs.skillId}>
                        {rs.skill?.canonicalName || rs.skillId}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '0.3rem' }}>
                    <span>Role Importance Weight:</span>
                    <strong>{Math.round(editingSkillWeight.roleWeight * 100)}%</strong>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={editingSkillWeight.roleWeight}
                    onChange={e => setEditingSkillWeight({ ...editingSkillWeight, roleWeight: parseFloat(e.target.value) })}
                    style={{ width: '100%' }}
                  />
                </div>

                <button type="submit" className="btn btn-primary" style={{ marginTop: '0.5rem' }}>
                  Save Updated Weight
                </button>

                {weightSaveSuccess && (
                  <div style={{ color: '#6ee7b7', fontSize: '0.8rem' }}>✓ Role weight updated and gaps recalculated.</div>
                )}
              </form>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderPublicHome = () => {
    return (
      <div>
        <div className="dev-hero">
          <div className="dev-hero-tag">
            <Database size={13} /> 142 Junior Backend Jobs Analyzed in Bangladesh
          </div>
          <h1 className="dev-hero-title">
            Real job requirements vs what you can actually build.
          </h1>
          <p className="dev-hero-desc">
            We analyzed 142 junior backend engineer job postings in Dhaka and regional tech hubs. Test your SQL and Node.js skills in live sandboxes, see your exact gaps, and build projects that hire.
          </p>

          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button className="btn btn-primary" onClick={handleDemoLogin} style={{ padding: '0.65rem 1.25rem', fontSize: '0.9rem' }}>
              <Sparkles size={16} /> Continue as Demo Candidate (1-Click)
            </button>
            <button className="btn btn-secondary" onClick={() => setPublicView('market')} style={{ padding: '0.65rem 1.25rem', fontSize: '0.9rem' }}>
              <TrendingUp size={16} /> View Market Demand
            </button>
            <button className="btn btn-secondary" onClick={() => setPublicView('curriculum')} style={{ padding: '0.65rem 1.25rem', fontSize: '0.9rem' }}>
              <GraduationCap size={16} /> University vs Reality
            </button>
          </div>

          <div className="stat-grid-3" style={{ marginTop: '2.5rem', textAlign: 'left' }}>
            <div className="stat-card">
              <div className="stat-label">Active Job Postings</div>
              <div className="stat-value">142</div>
              <div className="stat-sub">Scraped from Bdjobs, LinkedIn & GitHub</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Canonical Backend Skills</div>
              <div className="stat-value">9</div>
              <div className="stat-sub">Mapped with all alias synonyms</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Practical Validation</div>
              <div className="stat-value">100%</div>
              <div className="stat-sub">Live SQL & concurrency test cases</div>
            </div>
          </div>

          <div className="dev-pipeline-grid">
            <div className="dev-pipeline-card">
              <div className="dev-pipeline-step">01 / MARKET DATA</div>
              <h3>Real Job Demands</h3>
              <p>Frequencies of technologies required by companies in Bangladesh. Know whether Docker or Redis is asked for more often.</p>
            </div>
            <div className="dev-pipeline-card">
              <div className="dev-pipeline-step">02 / PRACTICAL TEST</div>
              <h3>Live Coding & SQL</h3>
              <p>Not multiple-choice guessing. Write real queries and solve async concurrency puzzles evaluated against test cases.</p>
            </div>
            <div className="dev-pipeline-card">
              <div className="dev-pipeline-step">03 / GAP ANALYSIS</div>
              <h3>What to Learn Next</h3>
              <p>Transparent gap priorities based on role importance and employer demand. Focus on the high-leverage missing skills.</p>
            </div>
            <div className="dev-pipeline-card">
              <div className="dev-pipeline-step">04 / PROOF OF SKILL</div>
              <h3>Verified Talent Passport</h3>
              <p>Submit your GitHub repo for automated checks and export a printable, verifiable skills report for your resume.</p>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // ==========================================
  // MAIN RETURN
  // ==========================================

  return (
    <div>
      {/* CASE A: LOGGED IN CANDIDATE -> FULL SIDEBAR APP LAYOUT */}
      {currentUser ? (
        <div className="app-shell">
          {/* Vertical Sidebar */}
          {/* Modern Polished Sidebar */}
          <aside className="app-sidebar">
            <div className="sidebar-header">
              <div className="sidebar-brand-row">
                <div className="sidebar-brand">
                  <div className="sidebar-brand-icon">
                    <Terminal size={17} />
                  </div>
                  <span>SkillBridge</span>
                </div>
                <div className="sidebar-status-pill">
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981', display: 'inline-block' }} />
                  <span>v2.0</span>
                </div>
              </div>

              <div className="sidebar-track-card">
                <div className="sidebar-track-label">ACTIVE ROLE TRACK</div>
                <div className="sidebar-track-title">
                  <span>{role?.title || 'Junior Backend Engineer'}</span>
                </div>
                <div className="sidebar-track-meta">
                  <span className="sidebar-meta-chip">Bangladesh</span>
                  <span className="sidebar-meta-chip">N = 142 Jobs</span>
                </div>
              </div>
            </div>

            <nav className="sidebar-nav">
              <div>
                <div className="sidebar-section-title">Market Intelligence</div>
                <button
                  className={`sidebar-item ${activeTab === 'market' ? 'active' : ''}`}
                  onClick={() => setActiveTab('market')}
                >
                  <span className="sidebar-item-content">
                    <TrendingUp size={16} />
                    <span>Job Market Demand</span>
                  </span>
                  <span className="sidebar-item-badge">142</span>
                </button>
                <button
                  className={`sidebar-item ${activeTab === 'curriculum' ? 'active' : ''}`}
                  onClick={() => setActiveTab('curriculum')}
                >
                  <span className="sidebar-item-content">
                    <GraduationCap size={16} />
                    <span>University Syllabi</span>
                  </span>
                  <span className="sidebar-item-badge">Gap</span>
                </button>
              </div>

              <div>
                <div className="sidebar-section-title">Practical Benchmarks</div>
                <button
                  className={`sidebar-item ${activeTab === 'assessment' ? 'active' : ''}`}
                  onClick={() => setActiveTab('assessment')}
                >
                  <span className="sidebar-item-content">
                    <BrainCircuit size={16} />
                    <span>Diagnostic Test</span>
                  </span>
                  <span className="sidebar-item-badge">6 Qs</span>
                </button>
                <button
                  className={`sidebar-item ${activeTab === 'sandbox' ? 'active' : ''}`}
                  onClick={() => setActiveTab('sandbox')}
                >
                  <span className="sidebar-item-content">
                    <Terminal size={16} />
                    <span>SQL & Code Sandbox</span>
                  </span>
                  <span className="sidebar-item-badge">Interactive</span>
                </button>
              </div>

              <div>
                <div className="sidebar-section-title">Career Roadmap</div>
                <button
                  className={`sidebar-item ${activeTab === 'gaps' ? 'active' : ''}`}
                  onClick={() => setActiveTab('gaps')}
                >
                  <span className="sidebar-item-content">
                    <BarChart3 size={16} />
                    <span>My Skill Gaps</span>
                  </span>
                  <span className="sidebar-item-badge" style={{ color: '#fb7185', background: 'rgba(244,63,94,0.12)' }}>
                    {gaps.length > 0 ? `${gaps.length} Gaps` : 'Priority'}
                  </span>
                </button>
                <button
                  className={`sidebar-item ${activeTab === 'actions' ? 'active' : ''}`}
                  onClick={() => setActiveTab('actions')}
                >
                  <span className="sidebar-item-content">
                    <Rocket size={16} />
                    <span>Projects to Build</span>
                  </span>
                  <span className="sidebar-item-badge">Portfolio</span>
                </button>
                <button
                  className={`sidebar-item ${activeTab === 'jobs' ? 'active' : ''}`}
                  onClick={() => setActiveTab('jobs')}
                >
                  <span className="sidebar-item-content">
                    <Briefcase size={16} />
                    <span>Matching Jobs</span>
                  </span>
                  <span className="sidebar-item-badge" style={{ color: '#6ee7b7', background: 'rgba(16,185,129,0.12)' }}>
                    {jobMatches.length > 0 ? `${jobMatches.length} Roles` : 'Live'}
                  </span>
                </button>
              </div>

              <div>
                <div className="sidebar-section-title">Platform</div>
                <button
                  className={`sidebar-item ${activeTab === 'admin' ? 'active' : ''}`}
                  onClick={() => setActiveTab('admin')}
                >
                  <span className="sidebar-item-content">
                    <Sliders size={16} />
                    <span>Admin & Weights</span>
                  </span>
                  <span className="sidebar-item-badge">Tuner</span>
                </button>
              </div>
            </nav>

            {/* Quick Readiness Widget */}
            <div className="sidebar-progress-box">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Diagnostic Benchmark</span>
                <span style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', fontWeight: 700, color: attemptResult ? (attemptResult.passed ? '#10b981' : '#f59e0b') : '#60a5fa' }}>
                  {attemptResult ? `${attemptResult.score}%` : 'Not Taken'}
                </span>
              </div>
              <div className="progress-container" style={{ margin: 0, height: '4px', background: '#0a0c12' }}>
                <div
                  className="progress-bar progress-indigo"
                  style={{ width: attemptResult ? `${attemptResult.score}%` : '20%' }}
                />
              </div>
            </div>

            <div className="sidebar-footer">
              <div className="sidebar-user-card">
                <div className="sidebar-avatar">
                  {(currentProfile?.fullName || currentUser.email).substring(0, 2).toUpperCase()}
                </div>
                <div className="sidebar-user-info">
                  <div className="sidebar-user-name">
                    {currentProfile?.fullName || currentUser.email.split('@')[0]}
                  </div>
                  <div className="sidebar-user-role">
                    <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#10b981', display: 'inline-block' }} />
                    <span>{currentUser.email === 'candidate@skillbridge.org' ? 'Demo Candidate' : 'Verified Candidate'}</span>
                  </div>
                </div>
              </div>

              <div className="sidebar-actions-row">
                <button
                  className="btn btn-secondary"
                  onClick={handleOpenPassport}
                  style={{ flex: 1, padding: '0.45rem 0.65rem', fontSize: '0.775rem' }}
                >
                  <FileText size={14} color="#60a5fa" />
                  <span>Skill Passport</span>
                </button>
                <button
                  className="btn btn-secondary"
                  onClick={handleLogout}
                  title="Sign Out"
                  style={{ padding: '0.45rem 0.65rem' }}
                >
                  <LogOut size={14} />
                </button>
              </div>
            </div>
          </aside>

          {/* Main Content Area */}
          <main className="app-main">
            {activeTab === 'market' && renderMarketView()}
            {activeTab === 'curriculum' && renderCurriculumView()}
            {activeTab === 'assessment' && renderAssessmentView()}
            {activeTab === 'sandbox' && renderSandboxView()}
            {activeTab === 'gaps' && renderGapsView()}
            {activeTab === 'actions' && renderActionsView()}
            {activeTab === 'jobs' && renderJobsView()}
            {activeTab === 'admin' && renderAdminView()}
          </main>
        </div>
      ) : (
        /* CASE B: PUBLIC VISITOR (UNAUTHENTICATED) -> CLEAN TOP NAV & LANDING */
        <div>
          <header className="public-navbar">
            <div className="public-nav-container">
              <a href="#" className="brand" onClick={(e) => { e.preventDefault(); setPublicView('home'); }}>
                <span>SkillBridge</span>
                <span className="brand-badge-pill">BENCHMARK</span>
              </a>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <button
                  className={`btn btn-ghost ${publicView === 'market' ? 'active' : ''}`}
                  onClick={() => setPublicView('market')}
                >
                  <TrendingUp size={15} /> Job Demand (N=142)
                </button>
                <button
                  className={`btn btn-ghost ${publicView === 'curriculum' ? 'active' : ''}`}
                  onClick={() => setPublicView('curriculum')}
                >
                  <GraduationCap size={15} /> University Syllabi
                </button>

                <button
                  className="btn btn-secondary"
                  onClick={() => { setAuthMode('LOGIN'); setShowAuthModal(true); }}
                >
                  <LogIn size={15} /> Sign In
                </button>
                <button
                  className="btn btn-primary"
                  onClick={handleDemoLogin}
                >
                  <Sparkles size={15} /> Try Demo (1-Click)
                </button>
              </div>
            </div>
          </header>

          <div className="public-container">
            {publicView === 'home' && renderPublicHome()}
            {publicView === 'market' && renderMarketView()}
            {publicView === 'curriculum' && renderCurriculumView()}
          </div>
        </div>
      )}

      {/* MODAL: SUBMIT PROJECT GITHUB REPOSITORY */}
      {showProjectModal && (
        <div className="modal-backdrop">
          <div className="modal-box">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 700 }}>Submit Project Repository</h2>
              <button className="btn btn-ghost" onClick={() => setShowProjectModal(false)} style={{ padding: '0.25rem' }}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleProjectSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.3rem' }}>
                  Project Title
                </label>
                <input
                  type="text"
                  placeholder="e.g. Scalable Multi-Tenant REST API"
                  value={projectForm.title}
                  onChange={e => setProjectForm({ ...projectForm, title: e.target.value })}
                  required
                  style={{ width: '100%', padding: '0.65rem', background: '#0a0c10', border: '1px solid var(--border-color)', borderRadius: '6px', color: '#fff', fontSize: '0.85rem' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.3rem' }}>
                  GitHub Repository URL
                </label>
                <input
                  type="url"
                  placeholder="https://github.com/username/repo-name"
                  value={projectForm.repoUrl}
                  onChange={e => setProjectForm({ ...projectForm, repoUrl: e.target.value })}
                  required
                  style={{ width: '100%', padding: '0.65rem', background: '#0a0c10', border: '1px solid var(--border-color)', borderRadius: '6px', color: '#fff', fontSize: '0.85rem' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.3rem' }}>
                  Brief Technical Architecture Summary
                </label>
                <textarea
                  placeholder="Implemented PostgreSQL connection pooling, Redis caching layer, Docker containerization..."
                  value={projectForm.description}
                  onChange={e => setProjectForm({ ...projectForm, description: e.target.value })}
                  rows={3}
                  style={{ width: '100%', padding: '0.65rem', background: '#0a0c10', border: '1px solid var(--border-color)', borderRadius: '6px', color: '#fff', fontSize: '0.85rem', resize: 'vertical' }}
                />
              </div>

              {projectSuccessMsg && (
                <div style={{ color: '#6ee7b7', fontSize: '0.85rem', background: 'rgba(16, 185, 129, 0.1)', padding: '0.75rem', borderRadius: '6px' }}>
                  {projectSuccessMsg}
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowProjectModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={isSubmittingProject}>
                  {isSubmittingProject ? 'Scanning Signals...' : 'Verify Repository'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: SKILL PASSPORT */}
      {showPassportModal && passportData && (
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

            <div style={{ background: '#090b10', padding: '1.25rem', borderRadius: '8px', border: '1px solid var(--border-color)', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>{passportData.candidate?.name || passportData.candidate?.fullName || 'Candidate'}</h3>
                  <div style={{ fontSize: '0.85rem', color: '#60a5fa' }}>{passportData.candidate?.targetRole || 'Junior Backend Engineer'}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Target Alignment</div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#10b981', fontFamily: 'var(--font-mono)' }}>
                    {passportData.metrics?.overallAlignment ?? passportData.alignmentScore ?? 74}%
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
                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#0e1118', padding: '0.75rem', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
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
      )}

      {/* MODAL: AUTHENTICATION (SIGN IN / REGISTER) */}
      {showAuthModal && (
        <div className="modal-backdrop">
          <div className="modal-box">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>
                {authMode === 'LOGIN' ? 'Sign In' : 'Create Account'}
              </h2>
              <button className="btn btn-ghost" onClick={() => setShowAuthModal(false)} style={{ padding: '0.25rem' }}>
                <X size={18} />
              </button>
            </div>

            {authError && (
              <div style={{ color: '#fda4af', background: 'rgba(244, 63, 94, 0.1)', padding: '0.75rem', borderRadius: '6px', fontSize: '0.825rem', marginBottom: '1rem', border: '1px solid rgba(244, 63, 94, 0.2)' }}>
                {authError}
              </div>
            )}

            <form onSubmit={handleAuthSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {authMode === 'REGISTER' && (
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.3rem' }}>
                    Full Name
                  </label>
                  <input
                    type="text"
                    placeholder="Ayman Rahman"
                    value={authForm.fullName}
                    onChange={e => setAuthForm({ ...authForm, fullName: e.target.value })}
                    required
                    style={{ width: '100%', padding: '0.65rem', background: '#0a0c10', border: '1px solid var(--border-color)', borderRadius: '6px', color: '#fff', fontSize: '0.85rem' }}
                  />
                </div>
              )}

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.3rem' }}>
                  Email Address
                </label>
                <input
                  type="email"
                  placeholder="engineer@domain.com"
                  value={authForm.email}
                  onChange={e => setAuthForm({ ...authForm, email: e.target.value })}
                  required
                  style={{ width: '100%', padding: '0.65rem', background: '#0a0c10', border: '1px solid var(--border-color)', borderRadius: '6px', color: '#fff', fontSize: '0.85rem' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.3rem' }}>
                  Password
                </label>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={authForm.password}
                  onChange={e => setAuthForm({ ...authForm, password: e.target.value })}
                  required
                  style={{ width: '100%', padding: '0.65rem', background: '#0a0c10', border: '1px solid var(--border-color)', borderRadius: '6px', color: '#fff', fontSize: '0.85rem' }}
                />
              </div>

              <button type="submit" className="btn btn-primary" disabled={isAuthLoading} style={{ marginTop: '0.5rem' }}>
                {isAuthLoading ? 'Authenticating...' : authMode === 'LOGIN' ? 'Sign In' : 'Create Account'}
              </button>

              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleDemoLogin}
                style={{ borderColor: '#3b82f6', color: '#93c5fd', marginTop: '0.25rem' }}
              >
                <Sparkles size={14} /> Try Demo Account (1-Click)
              </button>
            </form>

            <div style={{ marginTop: '1.25rem', textAlign: 'center', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              {authMode === 'LOGIN' ? (
                <span>
                  Need an account?{' '}
                  <button
                    onClick={() => { setAuthMode('REGISTER'); setAuthError(''); }}
                    style={{ background: 'transparent', border: 'none', color: '#60a5fa', fontWeight: 600, cursor: 'pointer', textDecoration: 'underline' }}
                  >
                    Register
                  </button>
                </span>
              ) : (
                <span>
                  Already registered?{' '}
                  <button
                    onClick={() => { setAuthMode('LOGIN'); setAuthError(''); }}
                    style={{ background: 'transparent', border: 'none', color: '#60a5fa', fontWeight: 600, cursor: 'pointer', textDecoration: 'underline' }}
                  >
                    Sign In
                  </button>
                </span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
