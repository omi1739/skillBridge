'use client';

import React, { useState, useEffect, useRef } from 'react';
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
  Profile,
  VerificationStatus
} from '@skillbridge/types';
import {
  TrendingUp,
  BrainCircuit,
  BarChart3,
  Briefcase,
  CheckCircle2,
  AlertCircle,
  Clock,
  ArrowRight,
  Database,
  Code2,
  Play,
  Terminal,
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
  RotateCcw,
  ShieldCheck,
  Lock,
  MapPin,
  Mail,
  Users
} from 'lucide-react';

const API_BASE = (process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:4000/api').replace(/\/$/, '');
const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '';

const CURRENT_STATUS_OPTIONS = [
  { value: 'STUDENT', label: 'Student' },
  { value: 'JOB_HOLDER', label: 'Job Holder / Employed' },
  { value: 'JOB_SEEKER', label: 'Job Seeker' },
  { value: 'OTHER', label: 'Other' }
] as const;

const VERIFICATION_BADGES: Record<VerificationStatus, { label: string; color: string; bg: string; border: string }> = {
  EMPLOYER_VERIFIED: { label: 'Employer Verified', color: '#34d399', bg: 'rgba(16, 185, 129, 0.1)', border: 'rgba(16, 185, 129, 0.25)' },
  SOURCE_VERIFIED:   { label: 'Source Verified',   color: '#5eead4', bg: 'rgba(45, 212, 191, 0.1)', border: 'rgba(45, 212, 191, 0.25)' },
  RECENTLY_CHECKED:  { label: 'Recently Checked',  color: '#38bdf8', bg: 'rgba(56, 189, 248, 0.1)', border: 'rgba(56, 189, 248, 0.25)' },
  EXTERNAL_SOURCE:   { label: 'External Source',   color: '#a78bfa', bg: 'rgba(167, 139, 250, 0.1)', border: 'rgba(167, 139, 250, 0.25)' },
  EXPIRED:           { label: 'Expired',           color: '#f87171', bg: 'rgba(248, 113, 113, 0.1)', border: 'rgba(248, 113, 113, 0.25)' },
  UNVERIFIED:        { label: 'Unverified',        color: '#94a3b8', bg: 'rgba(255, 255, 255, 0.05)', border: 'rgba(255, 255, 255, 0.08)' },
};

function VerificationBadge({ status }: { status?: VerificationStatus }) {
  const s = status || 'UNVERIFIED';
  const badge = VERIFICATION_BADGES[s];
  return (
    <span className="badge-chip" style={{ background: badge.bg, color: badge.color, border: `1px solid ${badge.border}` }}>
      <span className="badge-chip-dot" style={{ background: badge.color }} />
      {badge.label}
    </span>
  );
}

function RemoteBadge({ isRemote, location }: { isRemote?: boolean; location?: string }) {
  const remote = !!isRemote;
  const loc = remote ? (location && !/remote|work from home|wfh/i.test(location) ? location : 'Work from Home') : (location || 'Onsite');
  return (
    <span className="badge-chip" style={{
      background: remote ? 'rgba(45, 212, 191, 0.1)' : 'rgba(255, 255, 255, 0.05)',
      color: remote ? '#5eead4' : 'var(--text-secondary)',
      border: remote ? '1px solid rgba(45, 212, 191, 0.25)' : '1px solid var(--border-color)'
    }}>
      <span className="badge-chip-dot" style={{ background: remote ? '#2dd4bf' : 'var(--text-muted)' }} />
      {remote ? 'Remote · WFH' : loc}
    </span>
  );
}

const AUTH_INPUT_STYLE: React.CSSProperties = {
  width: '100%',
  padding: '0.65rem 0.85rem',
  background: 'var(--bg-input)',
  border: '1px solid var(--border-color)',
  borderRadius: '7px',
  color: 'var(--text-primary)',
  fontSize: '0.85rem'
};

const AUTH_LABEL_STYLE: React.CSSProperties = {
  display: 'block',
  fontSize: '0.75rem',
  color: 'var(--text-secondary)',
  fontWeight: 500,
  marginBottom: '0.35rem'
};

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
    confirmPassword: '',
    fullName: '',
    currentStatus: '',
    targetRoleId: 'role_junior_backend'
  });
  const [authError, setAuthError] = useState('');
  const [isAuthLoading, setIsAuthLoading] = useState(false);

  // Core domain data
  const [role, setRole] = useState<Role | null>(null);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [allJobs, setAllJobs] = useState<any[]>([]);
  const [marketProvenance, setMarketProvenance] = useState<{
    sources: string[];
    lastIngestedAt: string | null;
    totalJobs: number;
  } | null>(null);
  const [expandedSkillPostings, setExpandedSkillPostings] = useState<{
    skillId: string;
    postings: any[];
  } | null>(null);
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
  const [jobRemoteFilter, setJobRemoteFilter] = useState<'ALL' | 'REMOTE' | 'ONSITE'>('ALL');
  const [jobRegionFilter, setJobRegionFilter] = useState<'ALL' | 'BANGLADESH' | 'INTERNATIONAL'>('ALL');
  const [jobSort, setJobSort] = useState<'priority' | 'recent'>('priority');
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
  const [adminDashboard, setAdminDashboard] = useState<any | null>(null);
  const [adminUsers, setAdminUsers] = useState<any[]>([]);
  const [adminUsersTotal, setAdminUsersTotal] = useState(0);
  const [adminUsersPage, setAdminUsersPage] = useState(1);
  const [adminUsersTotalPages, setAdminUsersTotalPages] = useState(1);
  const [adminUsersPageSize, setAdminUsersPageSize] = useState(10);
  const [adminUsersSearch, setAdminUsersSearch] = useState('');
  const [adminUserMsg, setAdminUserMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [editingSkillWeight, setEditingSkillWeight] = useState<{ skillId: string; roleWeight: number; marketDemandFrequency: number } | null>(null);
  const [aliasForm, setAliasForm] = useState({ rawAlias: '', canonicalSkillId: '' });
  const [weightSaveSuccess, setWeightSaveSuccess] = useState(false);
  const [aliasSaveSuccess, setAliasSaveSuccess] = useState(false);

  // Landing page market stats (dynamic counts)
  const [landingStats, setLandingStats] = useState<{
    jobPostings: number;
    canonicalSkills: number;
    validationPercent: number;
    curriculaCount?: number;
    activeCompanies?: number;
  } | null>(null);

  const activeUserId = currentUser ? currentUser.id : 'demo_user_01';

  const authHeaders = () => {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (authToken) headers['Authorization'] = `Bearer ${authToken}`;
    return headers;
  };

  const headersFor = (t?: string | null) => {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    const token = t || authToken;
    if (token) headers['Authorization'] = `Bearer ${token}`;
    return headers;
  };

  // Raw job postings are only served to authenticated members. This also
  // powers the public market view's posting drilldown once a user signs in.
  const fetchJobs = (t?: string | null) => {
    if (!(t || authToken)) {
      setAllJobs([]);
      return;
    }
    fetch(`${API_BASE}/jobs`, { headers: headersFor(t) })
      .then(res => (res.ok ? res.json() : Promise.reject(res)))
      .then(data => {
        if (Array.isArray(data)) {
          setAllJobs(data);
          setExpandedSkillPostings(null);
        }
      })
      .catch(() => setAllJobs([]));
  };

  const refreshUserData = (userId = activeUserId, role?: string, t?: string | null) => {
    if (!(t || authToken)) {
      setGaps([]);
      setRecommendations([]);
      setJobMatches([]);
      setUserProjects([]);
      setAdminOverview(null);
      return;
    }
    const token = t || authToken;

    fetch(`${API_BASE}/me/gaps?userId=${userId}&roleId=role_junior_backend`, { headers: headersFor(token) })
      .then(res => res.json())
      .then(data => { if (Array.isArray(data)) setGaps(data); })
      .catch((err) => console.error('[SkillBridge] Data load failed:', err));

    fetch(`${API_BASE}/me/recommendations?userId=${userId}&roleId=role_junior_backend`, { headers: headersFor(token) })
      .then(res => res.json())
      .then(data => { if (Array.isArray(data)) setRecommendations(data); })
      .catch((err) => console.error('[SkillBridge] Data load failed:', err));

    fetch(`${API_BASE}/jobs/matches?userId=${userId}&roleId=role_junior_backend`, { headers: headersFor(token) })
      .then(res => res.json())
      .then(data => { if (Array.isArray(data)) setJobMatches(data); })
      .catch((err) => console.error('[SkillBridge] Data load failed:', err));

    fetch(`${API_BASE}/me/projects?userId=${userId}`, { headers: headersFor(token) })
      .then(res => res.json())
      .then(data => setUserProjects(data))
      .catch((err) => console.error('[SkillBridge] Data load failed:', err));

    if (role === 'ADMIN') {
      fetch(`${API_BASE}/admin/overview`, { headers: headersFor(token) })
        .then(res => (res.ok ? res.json() : Promise.reject(res)))
        .then(data => setAdminOverview(data))
        .catch((err) => {
          console.error('[SkillBridge] Admin overview load failed:', err);
          setAdminOverview(null);
        });
      fetch(`${API_BASE}/admin/dashboard`, { headers: headersFor(token) })
        .then(res => (res.ok ? res.json() : Promise.reject(res)))
        .then(data => setAdminDashboard(data))
        .catch((err) => {
          console.error('[SkillBridge] Admin dashboard load failed:', err);
          setAdminDashboard(null);
        });
      loadUsers();
    } else {
      setAdminOverview(null);
      setAdminDashboard(null);
      setAdminUsers([]);
    }

    fetchJobs(token);
  };

  const loadUsers = (opts?: { page?: number; pageSize?: number; search?: string }) => {
    const token = authToken;
    if (!token) {
      setAdminUsers([]);
      setAdminUsersTotal(0);
      setAdminUsersTotalPages(1);
      return;
    }
    const page = opts?.page ?? adminUsersPage;
    const pageSize = opts?.pageSize ?? adminUsersPageSize;
    const search = opts?.search !== undefined ? opts.search : adminUsersSearch;
    const qs = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
    if (search) qs.set('search', search);
    fetch(`${API_BASE}/admin/users?${qs.toString()}`, { headers: headersFor(token) })
      .then(res => (res.ok ? res.json() : Promise.reject(res)))
      .then((data: any) => {
        if (data && Array.isArray(data.items)) {
          setAdminUsers(data.items);
          setAdminUsersTotal(data.total);
          setAdminUsersPage(data.page);
          setAdminUsersTotalPages(data.totalPages);
        }
      })
      .catch((err) => {
        console.error('[SkillBridge] Admin users load failed:', err);
        setAdminUsers([]);
      });
  };

  const handleChangeUserRole = (userId: string, role: string) => {
    setAdminUserMsg(null);
    fetch(`${API_BASE}/admin/users/${userId}/role`, {
      method: 'PATCH',
      headers: authHeaders(),
      body: JSON.stringify({ role })
    })
      .then(res => res.json().then((data: any) => ({ ok: res.ok, data })))
      .then(({ ok, data }) => {
        if (ok && data?.success) {
          setAdminUserMsg({ ok: true, text: 'Role updated.' });
          loadUsers();
        } else {
          setAdminUserMsg({ ok: false, text: (data?.message) || 'Could not update role.' });
        }
      })
      .catch(() => setAdminUserMsg({ ok: false, text: 'Update failed.' }));
  };

  const handleDeleteUser = (userId: string, email: string) => {
    if (!window.confirm(`Delete user ${email}? This is permanent.`)) return;
    setAdminUserMsg(null);
    fetch(`${API_BASE}/admin/users/${userId}`, {
      method: 'DELETE',
      headers: authHeaders()
    })
      .then(res => res.json().then((data: any) => ({ ok: res.ok, data })))
      .then(({ ok, data }) => {
        if (ok && data?.success) {
          setAdminUserMsg({ ok: true, text: 'User deleted.' });
          if (adminUsers.length === 1 && adminUsersPage > 1) {
            loadUsers({ page: adminUsersPage - 1 });
          } else {
            loadUsers();
          }
        } else {
          setAdminUserMsg({ ok: false, text: (data?.message) || 'Could not delete user.' });
        }
      })
      .catch(() => setAdminUserMsg({ ok: false, text: 'Delete failed.' }));
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

    fetch(`${API_BASE}/stats`)
      .then(res => res.json())
      .then(data => setLandingStats(data))
      .catch((err) => console.error('[SkillBridge] Data load failed:', err));

    fetch(`${API_BASE}/market/demand?roleId=role_junior_backend`)
      .then(res => res.json())
      .then(data => {
        if (data && typeof data.totalJobs === 'number') {
          setMarketProvenance({
            sources: Array.isArray(data.sources) ? data.sources : [],
            lastIngestedAt: data.lastIngestedAt || null,
            totalJobs: data.totalJobs
          });
        }
      })
      .catch((err) => console.error('[SkillBridge] Market demand load failed:', err));

    // Restore saved session if available
    const savedToken = localStorage.getItem('skillbridge_token');
    const savedUser = localStorage.getItem('skillbridge_user');
    const savedProfile = localStorage.getItem('skillbridge_profile');
    if (savedToken && savedUser && savedProfile) {
      try {
        const restoredUser = JSON.parse(savedUser);
        const restoredProfile = JSON.parse(savedProfile);
        setCurrentUser(restoredUser);
        setCurrentProfile(restoredProfile);
        setAuthToken(savedToken);
        refreshUserData(restoredUser.id, restoredUser.role, savedToken);
      } catch {
        localStorage.removeItem('skillbridge_token');
        localStorage.removeItem('skillbridge_user');
        localStorage.removeItem('skillbridge_profile');
      }
    } else {
      setAllJobs([]);
      setJobMatches([]);
    }
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
        refreshUserData('demo_user_01', data.user.role, token);
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
          confirmPassword: authForm.confirmPassword,
          fullName: authForm.fullName,
          currentStatus: authForm.currentStatus || undefined,
          targetRoleId: authForm.targetRoleId
        }
      : {
          email: authForm.email,
          password: authForm.password
        };

    if (authMode === 'REGISTER' && authForm.password !== authForm.confirmPassword) {
      setIsAuthLoading(false);
      setAuthError('Passwords do not match.');
      return;
    }

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

      applyAuthResult(data);
    } catch (err: any) {
      setAuthError(err.message || 'An error occurred.');
    } finally {
      setIsAuthLoading(false);
    }
  };

  const applyAuthResult = (data: any) => {
    setCurrentUser(data.user);
    setCurrentProfile(data.profile);
    setAuthToken(data.token);
    localStorage.setItem('skillbridge_token', data.token);
    localStorage.setItem('skillbridge_user', JSON.stringify(data.user));
    localStorage.setItem('skillbridge_profile', JSON.stringify(data.profile));
    setShowAuthModal(false);
    setAuthForm({ email: '', password: '', confirmPassword: '', fullName: '', currentStatus: '', targetRoleId: 'role_junior_backend' });
    setActiveTab('market');
    refreshUserData(data.user.id, data.user.role, data.token);
  };

  const handleGoogleCredential = async (credential: string) => {
    setIsAuthLoading(true);
    setAuthError('');
    try {
      const res = await fetch(`${API_BASE}/auth/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          idToken: credential,
          currentStatus: authForm.currentStatus || undefined
        })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Google sign-in failed.');
      }
      applyAuthResult(data);
    } catch (err: any) {
      setAuthError(err.message || 'Google sign-in failed.');
    } finally {
      setIsAuthLoading(false);
    }
  };

  const googleBtnRef = useRef<HTMLDivElement>(null);
  const googleBtnHiddenRef = useRef<HTMLDivElement>(null);

  const handleGoogleClick = () => {
    const host = googleBtnHiddenRef.current;
    if (!host) return;
    const iframe = host.querySelector('iframe');
    if (iframe?.contentWindow) {
      const innerDoc = iframe.contentWindow.document;
      const b = innerDoc?.querySelector('button, [role="button"]');
      if (b) { (b as HTMLElement).click(); return; }
    }
    host.click?.();
  };

  const handleLogout = () => {
    localStorage.removeItem('skillbridge_token');
    localStorage.removeItem('skillbridge_user');
    localStorage.removeItem('skillbridge_profile');
    setCurrentUser(null);
    setCurrentProfile(null);
    setAuthToken(null);
    setAllJobs([]);
    setJobMatches([]);
    setGaps([]);
    setRecommendations([]);
    setUserProjects([]);
    setExpandedSkillPostings(null);
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

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID || !showAuthModal) return;
    const w = window as any;
    const initGoogle = () => {
      w.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: (resp: any) => { if (resp?.credential) handleGoogleCredential(resp.credential); },
        auto_select: false,
      });
      if (googleBtnHiddenRef.current) {
        googleBtnHiddenRef.current.innerHTML = '';
        w.google.accounts.id.renderButton(googleBtnHiddenRef.current, {
          theme: 'outline',
          size: 'large',
          text: 'continue_with',
          type: 'icon',
          shape: 'circle',
          width: 300,
        });
      }
    };
    if (w.google?.accounts?.id) { initGoogle(); return; }
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.onload = initGoogle;
    document.body.appendChild(script);
    return () => { script.remove(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showAuthModal]);

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
    const totalJobsCount = landingStats?.jobPostings ?? allJobs.length;
    const employerCount = new Set(allJobs.map(j => j.company)).size;
    const sourceList = marketProvenance?.sources?.length
      ? marketProvenance.sources.join(' + ')
      : 'Public job APIs';
    const lastSync = marketProvenance?.lastIngestedAt
      ? new Date(marketProvenance.lastIngestedAt).toLocaleDateString()
      : 'pending';
    const sourcesText = employerCount > 0
      ? `${employerCount} tech employers ${sourceList ? `• Source: ${sourceList}` : ''} • Synced ${lastSync}`
      : 'Live data loading…';

    const remoteCount = allJobs.filter(j => j.isRemote).length;
    const remoteSplit = currentUser
      ? `• ${remoteCount} remote/WFH • ${allJobs.length - remoteCount} onsite`
      : '• Login to see remote/WFH vs onsite breakout';

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <div className="page-header">
          <div>
            <h1 className="page-title">Junior Backend Job Market Demand</h1>
            <p className="page-subtitle">
              Empirical market requirements derived dynamically from {totalJobsCount} verified junior backend job postings — remote / work-from-home and onsite — in {role.marketContext.region}.
            </p>
          </div>
        </div>

        <div className="stat-grid-3">
          <div className="stat-card">
            <div className="stat-label">Focus Region</div>
            <div className="stat-value" style={{ fontSize: '1.25rem' }}>{role.marketContext.region}</div>
            <div className="stat-sub">Dhaka, Chittagong & Remote Hubs</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Experience Tier</div>
            <div className="stat-value" style={{ fontSize: '1.25rem' }}>{role.marketContext.experienceLevel}</div>
            <div className="stat-sub">Primary hiring tier for this track</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Live Postings Catalog</div>
            <div className="stat-value" style={{ fontSize: '1.25rem', color: 'var(--text-link)' }}>N = {totalJobsCount} Postings</div>
            <div className="stat-sub">{sourcesText}</div>
            <div className="stat-sub">{remoteSplit}</div>
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
              const matchingPostings = allJobs.filter(j =>
                (j.requiredSkillIds || []).includes(rs.skillId) ||
                (j.preferredSkillIds || []).includes(rs.skillId)
              );
              const isExpanded = expandedSkillPostings?.skillId === rs.skillId;

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
                    <button
                      onClick={() => {
                        if (!currentUser) {
                          setAuthMode('LOGIN');
                          setShowAuthModal(true);
                          return;
                        }
                        setExpandedSkillPostings(
                          isExpanded ? null : { skillId: rs.skillId, postings: matchingPostings }
                        );
                      }}
                      style={{
                        fontWeight: 700,
                        fontFamily: 'var(--font-mono)',
                        color: isRequired ? '#f87171' : '#60a5fa',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        textDecoration: 'underline dotted'
                      }}
                      title={currentUser ? "Show the real postings used to compute this value" : "Sign in to see the real postings behind this percentage"}
                    >
                      {pct}% of jobs
                    </button>
                  </div>

                  <div className="progress-container">
                    <div
                      className={`progress-bar ${isRequired ? 'progress-indigo' : 'progress-cyan'}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>

                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                    Target Level: <strong>{rs.proficiencyTarget}</strong> • Role Weight: <strong>{rs.roleWeight * 100}%</strong>
                    {currentUser ? <> • {matchingPostings.length} of {totalJobsCount} postings</> : null}
                  </div>

                  {isExpanded && !currentUser && (
                    <div style={{ marginTop: '0.6rem', border: '1px solid var(--border-faint)', borderRadius: '6px', padding: '1rem', background: 'var(--bg-row)', textAlign: 'center' }}>
                      <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.35rem' }}>
                        See the individual job postings
                      </div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
                        Create a free account or log in to view the real, verified postings behind each percentage.
                      </div>
                      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                        <button className="btn btn-primary" style={{ fontSize: '0.8rem', padding: '0.4rem 0.9rem' }} onClick={handleDemoLogin}>
                          Explore Demo <ArrowRight size={13} />
                        </button>
                        <button className="btn btn-secondary" style={{ fontSize: '0.8rem', padding: '0.4rem 0.9rem' }} onClick={() => { setAuthMode('REGISTER'); setShowAuthModal(true); }}>
                          Register Free
                        </button>
                      </div>
                    </div>
                  )}

                  {isExpanded && currentUser && (
                    <div style={{ marginTop: '0.6rem', border: '1px solid var(--border-faint)', borderRadius: '6px', padding: '0.7rem', background: 'var(--bg-row)' }}>
                      <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                        Verifiable source postings
                      </div>
                      {matchingPostings.length === 0 && (
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>No live postings matched yet — run ingestion.</div>
                      )}
                      {(matchingPostings.slice(0, 8)).map(j => (
                        <div key={j.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem', padding: '0.35rem 0', borderBottom: '1px solid var(--border-faint)', fontSize: '0.8rem' }}>
                          <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            <strong>{j.title}</strong>
                            <span style={{ color: 'var(--text-muted)' }}> — {j.company}{j.location ? ` (${j.location})` : ''}</span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
                            <span style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>{j.sourceName || 'Manual'}</span>
                            <VerificationBadge status={j.verificationStatus} />
                            {j.sourceUrl ? (
                              <a href={j.sourceUrl} target="_blank" rel="noopener noreferrer" className="btn btn-secondary" style={{ fontSize: '0.7rem', padding: '0.2rem 0.6rem' }}>
                                Open ↗
                              </a>
                            ) : null}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            }) : (
              <div style={{ color: 'var(--text-muted)', padding: '1rem 0' }}>Loading market demand data...</div>
            )}
          </div>

          <div style={{ marginTop: '1rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border-faint)', fontSize: '0.72rem', color: 'var(--text-muted)', display: 'flex', flexWrap: 'wrap', gap: '0.5rem 1.25rem', alignItems: 'center' }}>
            <span><strong style={{ color: 'var(--text-secondary)' }}>Computed from</strong> {totalJobsCount} live postings</span>
            <span><strong style={{ color: 'var(--text-secondary)' }}>Source</strong> {sourceList}</span>
            <span><strong style={{ color: 'var(--text-secondary)' }}>Last synced</strong> {lastSync}</span>
            <span><VerificationBadge status="SOURCE_VERIFIED" /></span>
            <span>Percentages are occurrence counts across real, verifiable postings — click a value to open them.</span>
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
                    <div key={idx} style={{ background: 'var(--bg-row)', border: '1px solid var(--border-faint)', padding: '0.85rem', borderRadius: '6px' }}>
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
                    <div key={idx} style={{ background: 'rgba(251, 113, 133, 0.05)', border: '1px solid rgba(251, 113, 133, 0.16)', padding: '0.85rem', borderRadius: '6px' }}>
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
              <div key={proj.id} style={{ background: 'var(--bg-inset-panel)', padding: '1rem', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
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
                    <span key={idx} style={{ background: 'var(--bg-chip)', color: '#93c5fd', fontSize: '0.7rem', padding: '0.15rem 0.45rem', borderRadius: '4px' }}>
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
    const bdCount = jobMatches.filter(m => m.job.isBangladesh).length;
    const internationalCount = jobMatches.length - bdCount;
    const bdOnsite = jobMatches.filter(m => m.job.isBangladesh && !m.job.isRemote).length;
    const bdRemote = jobMatches.filter(m => m.job.isBangladesh && m.job.isRemote).length;
    const remoteCount = jobMatches.filter(m => m.job.isRemote).length;

    const regionMatches = jobMatches.filter(match => {
      if (jobRegionFilter === 'BANGLADESH') return !!match.job.isBangladesh;
      if (jobRegionFilter === 'INTERNATIONAL') return !match.job.isBangladesh;
      return true;
    });

    const remoteFiltered = regionMatches.filter(match => {
      if (jobRemoteFilter === 'REMOTE') return !!match.job.isRemote;
      if (jobRemoteFilter === 'ONSITE') return !match.job.isRemote;
      return true;
    });

    const filteredMatches = [...remoteFiltered].sort((a, b) => {
      if (jobSort === 'recent') {
        return new Date(b.job.postedAt).getTime() - new Date(a.job.postedAt).getTime();
      }
      const pa = (a.job.isBangladesh && !a.job.isRemote) ? 0 : a.job.isRemote ? 1 : 2;
      const pb = (b.job.isBangladesh && !b.job.isRemote) ? 0 : b.job.isRemote ? 1 : 2;
      if (pa !== pb) return pa - pb;
      return (b.matchScore ?? 0) - (a.matchScore ?? 0);
    });

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <div className="page-header">
          <div>
            <h1 className="page-title">Matching Backend Jobs</h1>
            <p className="page-subtitle">
              Bangladesh-first: on-site roles in Bangladesh are shown first, then remote / work-from-home, then other on-site postings. Compatibility scores are computed directly against your demonstrated skill evidence with full requirement traceability.
            </p>
          </div>
        </div>

        <div className="filter-bar">
          <div className="filter-row">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>Region:</span>
              <div className="filter-segment-group">
                {([
                  { key: 'ALL', label: `All (${jobMatches.length})` },
                  { key: 'BANGLADESH', label: `Bangladesh (${bdCount})` },
                  { key: 'INTERNATIONAL', label: `International (${internationalCount})` }
                ] as const).map(o => (
                  <button
                    key={o.key}
                    className={`filter-segment-btn ${jobRegionFilter === o.key ? 'active' : ''}`}
                    onClick={() => setJobRegionFilter(o.key)}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>Work Mode:</span>
              <div className="filter-segment-group">
                {([
                  { key: 'ALL', label: 'All Modes' },
                  { key: 'REMOTE', label: `Remote / WFH (${remoteCount})` },
                  { key: 'ONSITE', label: `Onsite (${jobMatches.length - remoteCount})` }
                ] as const).map(o => (
                  <button
                    key={o.key}
                    className={`filter-segment-btn ${jobRemoteFilter === o.key ? 'active' : ''}`}
                    onClick={() => setJobRemoteFilter(o.key)}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem', paddingTop: '0.65rem', borderTop: '1px solid var(--border-subtle)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>Sort by:</span>
              <div className="filter-segment-group">
                {([
                  { key: 'priority', label: 'Prioritize BD Onsite → Remote' },
                  { key: 'recent', label: 'Most Recent' }
                ] as const).map(o => (
                  <button
                    key={o.key}
                    className={`filter-segment-btn ${jobSort === o.key ? 'active' : ''}`}
                    onClick={() => setJobSort(o.key)}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            </div>
            {jobSort === 'priority' && bdCount > 0 && (
              <span style={{ color: 'var(--text-muted)', fontSize: '0.74rem' }}>
                {bdOnsite} on-site in BD · {bdRemote} remote in BD
              </span>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {filteredMatches.length === 0 && (
            <div className="card" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
              {jobMatches.length === 0
                ? 'No matching jobs yet — sign in and take the diagnostic to see tailored backend postings.'
                : 'No jobs match the selected filter.'}
            </div>
          )}
          {filteredMatches.map(match => (
            <div key={match.job.id} className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 700 }}>{match.job.title}</h3>
                  <div style={{ color: 'var(--accent-text)', fontSize: '0.85rem', fontWeight: 500, marginTop: '0.15rem', display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                    {match.job.company}
                    {match.job.location ? <span style={{ color: 'var(--text-muted)' }}>• {match.job.location}</span> : null}
                    {match.job.isBangladesh && (
                      <span className="badge-chip" style={{ background: 'rgba(20, 184, 166, 0.1)', color: 'var(--accent-text)', border: '1px solid rgba(45, 212, 191, 0.25)' }}>
                        <span className="badge-chip-dot" style={{ background: '#2dd4bf' }} />
                        Bangladesh
                      </span>
                    )}
                    <RemoteBadge isRemote={match.job.isRemote} location={match.job.location} />
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
    const dash = adminDashboard || null;
    const roleColor: Record<string, string> = { ADMIN: '#f59e0b', RECRUITER: '#22d3ee', USER: '#14b8a6' };

    const roleCount = (r: string) =>
      dash && Array.isArray(dash.byRole)
        ? dash.byRole.find((x: any) => x.role === r)?.count ?? 0
        : 0;

    const donutTotal = dash?.totalUsers ?? 0;
    let cursor = 0;
    const gradients: string[] = (dash?.byRole || []).map((x: any) => {
      const frac = donutTotal ? x.count / donutTotal : 0;
      const start = cursor;
      const end = cursor + frac * 360;
      cursor = end;
      return `${roleColor[x.role] || '#64748b'} ${start}deg ${end}deg`;
    });
    const donutBg = gradients.length
      ? `conic-gradient(${gradients.join(', ')})`
      : `conic-gradient(#14b8a6 0deg 360deg)`;

    const signupData = dash?.recentSignups || [];
    const maxSignups = Math.max(1, ...signupData.map((s: any) => s.count));
    const dayLabel = (iso: string) => {
      const d = new Date(iso + 'T00:00:00');
      return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    };

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

        {/* ---- User Dashboard ---- */}
        {(dash || !adminUsers.length) && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <h2 className="card-title" style={{ marginBottom: 0 }}>User Dashboard</h2>

            <div className="stat-grid-4">
              <div className="stat-card">
                <div className="stat-label">Total Users</div>
                <div className="stat-value">{dash?.totalUsers ?? '—'}</div>
              </div>
              <div className="stat-card">
                <div className="stat-label">Admins</div>
                <div className="stat-value" style={{ color: '#f59e0b' }}>{dash ? roleCount('ADMIN') : '—'}</div>
              </div>
              <div className="stat-card">
                <div className="stat-label">Recruiters</div>
                <div className="stat-value" style={{ color: '#22d3ee' }}>{dash ? roleCount('RECRUITER') : '—'}</div>
              </div>
              <div className="stat-card">
                <div className="stat-label">Regular Users</div>
                <div className="stat-value" style={{ color: '#14b8a6' }}>{dash ? roleCount('USER') : '—'}</div>
              </div>
            </div>

            <div className="grid-2">
              <div className="card">
                <h3 className="card-title" style={{ marginBottom: '1rem' }}>Users by role</h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
                  <div
                    className="admin-donut"
                    style={{ background: donutBg }}
                  >
                    <div className="admin-donut-hole">
                      <div className="admin-donut-value">{dash?.totalUsers ?? 0}</div>
                      <div className="admin-donut-label">users</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', minWidth: 140 }}>
                    {(dash?.byRole || []).map((x: any) => (
                      <div key={x.role} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.82rem' }}>
                        <span style={{ width: 10, height: 10, borderRadius: 3, background: roleColor[x.role] || '#64748b' }} />
                        <span style={{ color: 'var(--text-secondary)' }}>{x.role}</span>
                        <strong style={{ color: 'var(--text-primary)', marginLeft: 'auto' }}>{x.count}</strong>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="card">
                <h3 className="card-title" style={{ marginBottom: '1rem' }}>New users · last 14 days</h3>
                {signupData.length === 0 ? (
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>No signups recorded in this window.</div>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'flex-end', gap: '3px', height: 130 }}>
                    {signupData.map((s: any) => (
                      <div key={s.day} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.25rem', flex: 1 }}>
                        <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>{s.count}</span>
                        <div
                          className="admin-bar"
                          style={{ height: `${Math.max(4, (s.count / maxSignups) * 86)}px` }}
                        />
                        <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>{dayLabel(s.day)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="grid-2">
              <div className="card">
                <h3 className="card-title" style={{ marginBottom: '1rem' }}>By provider</h3>
                {(dash?.byProvider || []).map((x: any) => {
                  const pct = donutTotal ? Math.round((x.count / donutTotal) * 100) : 0;
                  return (
                    <div key={x.provider} style={{ marginBottom: '0.85rem' }}>
                      <div className="demand-row-label">
                        <span className="demand-skill">
                          <span style={{ textTransform: 'capitalize' }}>{x.provider}</span>
                        </span>
                        <span className="demand-pct">{x.count} · {pct}%</span>
                      </div>
                      <div className="progress-container" style={{ margin: 0 }}>
                        <div className="progress-bar progress-indigo" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="card">
                <h3 className="card-title" style={{ marginBottom: '1rem' }}>By status</h3>
                {(dash?.byStatus || []).map((x: any) => {
                  const pct = donutTotal ? Math.round((x.count / donutTotal) * 100) : 0;
                  return (
                    <div key={x.status} style={{ marginBottom: '0.85rem' }}>
                      <div className="demand-row-label">
                        <span className="demand-skill">
                          <span style={{ textTransform: 'capitalize' }}>{x.status.toLowerCase()}</span>
                        </span>
                        <span className="demand-pct">{x.count} · {pct}%</span>
                      </div>
                      <div className="progress-container" style={{ margin: 0 }}>
                        <div className="progress-bar progress-amber" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        <div className="grid-2">
          <div className="card">
            <h2 className="card-title" style={{ marginBottom: '1rem' }}>Add Skill Alias Mapping</h2>
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
                  style={{ width: '100%', padding: '0.65rem', background: 'var(--bg-input)', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'var(--text-primary)', fontSize: '0.85rem' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.3rem' }}>
                  Maps To Canonical Skill
                </label>
                <select
                  value={aliasForm.canonicalSkillId}
                  onChange={e => setAliasForm({ ...aliasForm, canonicalSkillId: e.target.value })}
                  style={{ width: '100%', padding: '0.65rem', background: 'var(--bg-input)', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'var(--text-primary)', fontSize: '0.85rem' }}
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
            <h2 className="card-title" style={{ marginBottom: '1rem' }}>Role Skill Importance Tuner</h2>
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
                    style={{ width: '100%', padding: '0.65rem', background: 'var(--bg-input)', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'var(--text-primary)', fontSize: '0.85rem' }}
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

        <div className="card" style={{ padding: '1.25rem' }}>
          <h2 className="card-title" style={{ marginBottom: '0.25rem' }}>User Management</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', marginBottom: '1rem' }}>
            List, change roles, and remove registered accounts. You cannot change your own role or delete your own account.
          </p>

          {adminUserMsg && (
            <div style={{ marginBottom: '0.9rem', padding: '0.6rem 0.8rem', borderRadius: '6px', fontSize: '0.82rem', background: adminUserMsg.ok ? 'rgba(16,185,129,0.12)' : 'rgba(248,113,113,0.14)', color: adminUserMsg.ok ? '#6ee7b7' : '#fca5a5' }}>
              {adminUserMsg.text}
            </div>
          )}

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.9rem' }}>
            <input
              type="text"
              placeholder="Search by name or email…"
              value={adminUsersSearch}
              onChange={e => {
                setAdminUsersSearch(e.target.value);
                if (!e.target.value) loadUsers({ search: '', page: 1 });
              }}
              onKeyDown={e => { if (e.key === 'Enter') loadUsers({ search: adminUsersSearch, page: 1 }); }}
              style={{ padding: '0.5rem 0.7rem', background: 'var(--bg-input)', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'var(--text-primary)', fontSize: '0.82rem', minWidth: 220 }}
            />
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              <span>Show</span>
              <select
                value={adminUsersPageSize}
                onChange={e => {
                  const size = Number(e.target.value);
                  setAdminUsersPageSize(size);
                  loadUsers({ page: 1, pageSize: size });
                }}
                style={{ padding: '0.35rem 0.5rem', background: 'var(--bg-input)', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'var(--text-primary)', fontSize: '0.78rem' }}
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
              </select>
              <span>per page</span>
            </div>
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
            <thead>
              <tr style={{ textAlign: 'left', color: 'var(--text-muted)', borderBottom: '1px solid var(--border-color)' }}>
                <th style={{ padding: '0.5rem 0.5rem 0.5rem 0' }}>Name / Email</th>
                <th style={{ padding: '0.5rem' }}>Provider</th>
                <th style={{ padding: '0.5rem' }}>Status</th>
                <th style={{ padding: '0.5rem' }}>Role</th>
                <th style={{ padding: '0.5rem' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {adminUsers.map(u => {
                const isSelf = currentUser?.id === u.id;
                return (
                  <tr key={u.id} style={{ borderBottom: '1px solid var(--border-faint)' }}>
                    <td style={{ padding: '0.6rem 0.5rem 0.6rem 0' }}>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                        {u.fullName || '—'} {isSelf && <span style={{ color: '#5eead4', fontSize: '0.72rem' }}>(you)</span>}
                      </div>
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>{u.email}</div>
                    </td>
                    <td style={{ padding: '0.6rem 0.5rem' }}>
                      <span style={{ textTransform: 'capitalize', color: 'var(--text-secondary)' }}>{u.provider || 'EMAIL'}</span>
                    </td>
                    <td style={{ padding: '0.6rem 0.5rem' }}>
                      <span style={{ textTransform: 'capitalize', color: 'var(--text-secondary)' }}>{u.currentStatus ? u.currentStatus.toLowerCase() : '—'}</span>
                    </td>
                    <td style={{ padding: '0.6rem 0.5rem' }}>
                      {isSelf ? (
                        <span style={{ color: 'var(--text-secondary)' }}>{u.role}</span>
                      ) : (
                        <select
                          value={u.role}
                          onChange={e => handleChangeUserRole(u.id, e.target.value)}
                          style={{ padding: '0.35rem 0.5rem', background: 'var(--bg-input)', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'var(--text-primary)', fontSize: '0.78rem' }}
                        >
                          <option value="USER">USER</option>
                          <option value="RECRUITER">RECRUITER</option>
                          <option value="ADMIN">ADMIN</option>
                        </select>
                      )}
                    </td>
                    <td style={{ padding: '0.6rem 0.5rem' }}>
                      <button
                        disabled={isSelf}
                        onClick={() => handleDeleteUser(u.id, u.email)}
                        className="btn"
                        style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem', background: 'rgba(248,113,113,0.12)', color: '#fca5a5', border: '1px solid rgba(248,113,113,0.35)' }}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                );
              })}
              {adminUsers.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ padding: '1rem', color: 'var(--text-muted)' }}>
                    {adminUsersSearch ? `No users match "${adminUsersSearch}".` : 'No users loaded.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          {/* Pagination */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center', justifyContent: 'space-between', marginTop: '0.9rem' }}>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>
              {adminUsersTotal === 0 ? '0 users' : `Page ${adminUsersPage} of ${adminUsersTotalPages} · ${adminUsersTotal} user${adminUsersTotal === 1 ? '' : 's'}`}
            </span>
            <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'center', flexWrap: 'wrap' }}>
              <button
                className="btn"
                disabled={adminUsersPage <= 1}
                onClick={() => loadUsers({ page: adminUsersPage - 1 })}
                style={{ padding: '0.4rem 0.8rem', fontSize: '0.78rem' }}
              >
                ← Prev
              </button>
              {Array.from({ length: adminUsersTotalPages }, (_, i) => i + 1).map(p => (
                <button
                  key={p}
                  className="btn"
                  disabled={p === adminUsersPage}
                  onClick={() => loadUsers({ page: p })}
                  style={{ padding: '0.4rem 0.68rem', fontSize: '0.78rem', opacity: p === adminUsersPage ? 0.6 : 1 }}
                >
                  {p}
                </button>
              ))}
              <button
                className="btn"
                disabled={adminUsersPage >= adminUsersTotalPages}
                onClick={() => loadUsers({ page: adminUsersPage + 1 })}
                style={{ padding: '0.4rem 0.8rem', fontSize: '0.78rem' }}
              >
                Next →
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderPublicHome = () => {
    const totalJobsCount = landingStats?.jobPostings ?? allJobs.length;
    const totalSkillsCount = landingStats?.canonicalSkills ?? skills.length;
    const totalCurriculaCount = landingStats?.curriculaCount ?? curricula.length;
    const totalCompaniesCount = landingStats?.activeCompanies ?? new Set(allJobs.map(j => j.company)).size;
    const topSkills = (role?.roleSkills || [])
      .slice()
      .sort((a, b) => b.marketDemandFrequency - a.marketDemandFrequency)
      .slice(0, 6);

    return (
      <div>
        <div className="dev-hero">
          <div className="dev-hero-tag">
            <Database size={13} /> {totalJobsCount} Junior Backend Jobs Analyzed
          </div>
          <h1 className="dev-hero-title">
            Real job requirements, measured against real skills.
          </h1>
          <p className="dev-hero-desc">
            SkillBridge continuously analyzes junior backend job postings from verified employers — including remote / work-from-home roles — then tests your SQL and Node.js skills in a live sandbox to show exactly what to learn next.
          </p>

          <div className="landing-actions">
            <button className="btn btn-primary" onClick={handleDemoLogin} style={{ padding: '0.7rem 1.4rem', fontSize: '0.9rem' }}>
              Explore Live Demo <ArrowRight size={15} />
            </button>
            <button className="btn btn-secondary" onClick={() => setPublicView('market')} style={{ padding: '0.7rem 1.4rem', fontSize: '0.9rem' }}>
              Market Demand ({totalJobsCount})
            </button>
            <button className="btn btn-secondary" onClick={() => setPublicView('curriculum')} style={{ padding: '0.7rem 1.4rem', fontSize: '0.9rem' }}>
              University Syllabi ({totalCurriculaCount})
            </button>
          </div>

          <div style={{ marginTop: '1.5rem', display: 'flex', gap: '0.75rem', flexWrap: 'wrap', justifyContent: 'center' }}>
            <span className="trust-pill"><span style={{ width: 6, height: 6, borderRadius: '50%', background: '#2dd4bf', display: 'inline-block' }} /> Verified Postings</span>
            <span className="trust-pill"><span style={{ width: 6, height: 6, borderRadius: '50%', background: '#34d399', display: 'inline-block' }} /> Live Ingestion</span>
            <span className="trust-pill"><span style={{ width: 6, height: 6, borderRadius: '50%', background: '#38bdf8', display: 'inline-block' }} /> Remote &amp; Onsite Roles</span>
            <span className="trust-pill"><span style={{ width: 6, height: 6, borderRadius: '50%', background: '#a78bfa', display: 'inline-block' }} /> Verifiable Evidence</span>
          </div>

          <div className="stat-grid-3" style={{ marginTop: '2.5rem', textAlign: 'left' }}>
            <div className="stat-card">
              <div className="stat-label">Active Job Postings</div>
              <div className="stat-value">{totalJobsCount}</div>
              <div className="stat-sub">Across {totalCompaniesCount} hiring companies</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Canonical Skills</div>
              <div className="stat-value">{totalSkillsCount}</div>
              <div className="stat-sub">Normalized ontology with synonyms</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Curricula Mapped</div>
              <div className="stat-value">{totalCurriculaCount}</div>
              <div className="stat-sub">University syllabi compared in detail</div>
            </div>
          </div>

          {topSkills.length > 0 && (
            <div className="demand-panel">
              <div className="demand-panel-title">Live Market Data</div>
              <h2 className="demand-panel-heading">What employers ask for most</h2>
              {marketProvenance && marketProvenance.sources.length > 0 && (
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                  Source: <strong style={{ color: 'var(--text-secondary)' }}>{marketProvenance.sources.join(' + ')}</strong>
                  {' · '}{marketProvenance.totalJobs} postings
                  {marketProvenance.lastIngestedAt ? ` · synced ${new Date(marketProvenance.lastIngestedAt).toLocaleDateString()}` : ''}
                  <span style={{ marginLeft: '0.5rem' }}><VerificationBadge status="SOURCE_VERIFIED" /></span>
                </div>
              )}
              <div className="demand-list">
                {topSkills.map(rs => {
                  const pct = Math.round(rs.marketDemandFrequency * 100);
                  return (
                    <div key={rs.skillId}>
                      <div className="demand-row-label">
                        <span className="demand-skill">
                          <CheckCircle2 size={14} color="#5eead4" />
                          <span>{rs.skill?.canonicalName || rs.skillId}</span>
                        </span>
                        <span className="demand-pct">{pct}% of jobs</span>
                      </div>
                      <div className="progress-container" style={{ margin: 0 }}>
                        <div className="progress-bar progress-indigo" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div style={{ marginTop: '3rem', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          <div className="about-section">
            <div className="about-heading">
              <span className="about-kicker">About SkillBridge</span>
              <h2 className="about-title">Built for developers ready for real backend work.</h2>
            </div>
            <div className="about-grid">
              <div className="about-card">
                <span className="about-card-kicker">Live Intelligence</span>
                <h3>Real, verified job postings</h3>
                <p>
                  Continuously ingested junior backend roles — remote / work-from-home and onsite — from verified employers. Skills are derived from production requirements rather than speculative advice.
                </p>
              </div>
              <div className="about-card">
                <span className="about-card-kicker">Empirical Baseline</span>
                <h3>Skills measured, not guessed</h3>
                <p>
                  Benchmark your SQL queries and Node.js code against production test assertions, pinpointing deterministic gaps standing between you and target roles.
                </p>
              </div>
              <div className="about-card">
                <span className="about-card-kicker">Transparent Matching</span>
                <h3>Verifiable evidence passport</h3>
                <p>
                  Traceable match scores with full requirement breakdown. Export verified skill passports backed by live sandbox results and GitHub code verification.
                </p>
              </div>
            </div>
          </div>

          <div className="about-section">
            <div className="about-heading">
              <span className="about-kicker">How it works</span>
              <h2 className="about-title">Four steps from “what should I learn?” to “I got the job”.</h2>
            </div>
            <div className="steps-grid">
              {[
                { step: '01', title: 'Market Intelligence', desc: 'Explore exact technologies junior backend employers ask for, derived dynamically from live postings.' },
                { step: '02', title: 'Diagnostic Benchmarks', desc: 'Take practical timed challenges and run SQL & code queries against test assertions in a live sandbox.' },
                { step: '03', title: 'Gap Prioritization', desc: 'Identify high-leverage missing skills prioritized by role weight, employer frequency, and demonstrated proficiency.' },
                { step: '04', title: 'Matching Applications', desc: 'Browse matched remote and onsite postings with explainable compatibility scores and verified skill passports.' }
              ].map(item => (
                <div key={item.step} className="step-card">
                  <span className="step-number">{item.step}</span>
                  <h3>{item.title}</h3>
                  <p>{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // ==========================================
  // MAIN RETURN
  // ==========================================

  const totalJobsCount = landingStats?.jobPostings ?? allJobs.length;
  const totalCurriculaCount = landingStats?.curriculaCount ?? curricula.length;

  return (
    <div>
      {/* CASE A: LOGGED IN CANDIDATE -> FULL SIDEBAR APP LAYOUT */}
      {currentUser ? (
        <div className="app-shell">
          {/* Vertical Sidebar */}
          <aside className="app-sidebar">
            <div className="sidebar-header">
              <div className="sidebar-brand">
                <div className="sidebar-brand-icon">
                  <Terminal size={17} />
                </div>
                <span>SkillBridge</span>
              </div>
              <div className="sidebar-track-card">
                <div className="sidebar-track-label">Active Track</div>
                <div className="sidebar-track-title">
                  <span>{role?.title || 'Junior Backend Engineer'}</span>
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
                </button>
                <button
                  className={`sidebar-item ${activeTab === 'curriculum' ? 'active' : ''}`}
                  onClick={() => setActiveTab('curriculum')}
                >
                  <span className="sidebar-item-content">
                    <GraduationCap size={16} />
                    <span>University Syllabi</span>
                  </span>
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
                </button>
                <button
                  className={`sidebar-item ${activeTab === 'sandbox' ? 'active' : ''}`}
                  onClick={() => setActiveTab('sandbox')}
                >
                  <span className="sidebar-item-content">
                    <Terminal size={16} />
                    <span>SQL & Code Sandbox</span>
                  </span>
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
                </button>
                <button
                  className={`sidebar-item ${activeTab === 'actions' ? 'active' : ''}`}
                  onClick={() => setActiveTab('actions')}
                >
                  <span className="sidebar-item-content">
                    <FolderGit2 size={16} />
                    <span>Projects to Build</span>
                  </span>
                </button>
                <button
                  className={`sidebar-item ${activeTab === 'jobs' ? 'active' : ''}`}
                  onClick={() => setActiveTab('jobs')}
                >
                  <span className="sidebar-item-content">
                    <Briefcase size={16} />
                    <span>Matching Jobs</span>
                  </span>
                </button>
              </div>

              {currentUser?.role === 'ADMIN' && (
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
                  </button>
                </div>
              )}
            </nav>

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
                    {currentUser.role === 'ADMIN' ? 'Administrator' : currentUser.role === 'RECRUITER' ? 'Recruiter' : 'Verified Candidate'}
                  </div>
                </div>
                <button className="sidebar-icon-btn" onClick={handleLogout} title="Sign Out">
                  <LogOut size={15} />
                </button>
              </div>
              <button className="btn btn-secondary sidebar-passport-btn" onClick={handleOpenPassport}>
                <FileText size={14} />
                <span>Skill Passport</span>
              </button>
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
            {activeTab === 'admin' && currentUser?.role === 'ADMIN' && renderAdminView()}
          </main>
        </div>
      ) : (
        /* CASE B: PUBLIC VISITOR (UNAUTHENTICATED) -> CLEAN TOP NAV & LANDING */
        <div>
          <header className="public-navbar">
            <div className="public-nav-container">
              <a href="#" className="brand" onClick={(e) => { e.preventDefault(); setPublicView('home'); }}>
                <span>SkillBridge</span>
              </a>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <button
                  className={`btn btn-ghost ${publicView === 'market' ? 'active' : ''}`}
                  onClick={() => setPublicView('market')}
                >
                  <TrendingUp size={15} /> Job Demand ({totalJobsCount})
                </button>
                <button
                  className={`btn btn-ghost ${publicView === 'curriculum' ? 'active' : ''}`}
                  onClick={() => setPublicView('curriculum')}
                >
                  <GraduationCap size={15} /> University Syllabi ({totalCurriculaCount})
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
                  Try Demo (1-Click)
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
                  style={{ width: '100%', padding: '0.65rem', background: 'var(--bg-input)', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'var(--text-primary)', fontSize: '0.85rem' }}
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
                  style={{ width: '100%', padding: '0.65rem', background: 'var(--bg-input)', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'var(--text-primary)', fontSize: '0.85rem' }}
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
                  style={{ width: '100%', padding: '0.65rem', background: 'var(--bg-input)', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'var(--text-primary)', fontSize: '0.85rem', resize: 'vertical' }}
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

            <div style={{ background: 'var(--bg-inset-panel)', padding: '1.25rem', borderRadius: '8px', border: '1px solid var(--border-color)', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>{passportData.candidate?.name || passportData.candidate?.fullName || 'Candidate'}</h3>
                  <div style={{ fontSize: '0.85rem', color: '#60a5fa' }}>{passportData.candidate?.targetRole || 'Junior Backend Engineer'}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Target Alignment</div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#10b981', fontFamily: 'var(--font-mono)' }}>
                    {passportData.metrics?.overallAlignment ?? passportData.alignmentScore ?? 0}%
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
                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-inset-panel)', padding: '0.75rem', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
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
          <div className="modal-box" style={{ maxWidth: 440 }}>
            <div style={{ position: 'relative' }}>
              <button
                className="btn btn-ghost"
                onClick={() => setShowAuthModal(false)}
                style={{ position: 'absolute', top: 0, right: 0, padding: '0.35rem', borderRadius: '8px' }}
                aria-label="Close"
              >
                <X size={18} />
              </button>

              {/* Brand header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.5rem' }}>
                <div className="auth-brand-mark">
                  <Sliders size={15} />
                </div>
                <div>
                  <h2 style={{ fontSize: '1.15rem', fontWeight: 800, letterSpacing: '-0.01em', lineHeight: 1.2 }}>
                    {authMode === 'LOGIN' ? 'Welcome back' : 'Create your account'}
                  </h2>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>
                    {authMode === 'LOGIN'
                      ? 'Sign in to track your skills and job matches.'
                      : 'Join SkillBridge and start your backend engineering journey.'}
                  </div>
                </div>
              </div>
            </div>

            {/* Mode tabs */}
            <div className="auth-tabs" role="tablist">
              <button
                role="tab"
                aria-selected={authMode === 'LOGIN'}
                className={`auth-tab ${authMode === 'LOGIN' ? 'active' : ''}`}
                onClick={() => { setAuthMode('LOGIN'); setAuthError(''); }}
              >
                <LogIn size={14} /> Sign In
              </button>
              <button
                role="tab"
                aria-selected={authMode === 'REGISTER'}
                className={`auth-tab ${authMode === 'REGISTER' ? 'active' : ''}`}
                onClick={() => { setAuthMode('REGISTER'); setAuthError(''); }}
              >
                <PlusCircle size={14} /> Create Account
              </button>
            </div>

            {authError && (
              <div className="auth-error">
                <AlertCircle size={15} style={{ flexShrink: 0 }} />
                <span>{authError}</span>
              </div>
            )}

            {GOOGLE_CLIENT_ID && (
              <div>
                <button
                  type="button"
                  className="auth-google-btn"
                  onClick={handleGoogleClick}
                  disabled={isAuthLoading}
                >
                  <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
                    <path fill="#FFC107" d="M43.6 20.1H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3l5.7-5.7C34.1 6.1 29.3 4 24 4 13 4 4 13 4 24s9 20 20 20 20-9 20-20c0-1.3-.1-2.6-.4-3.9z" />
                    <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.9 1.2 8 3l5.7-5.7C34.1 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
                    <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2c-2.1 1.5-4.7 2.4-7.2 2.4-5.3 0-9.8-3.4-11.4-8.1l-6.6 5.1C9.6 39.6 16.3 44 24 44z" />
                    <path fill="#1976D2" d="M43.6 20.1H42V20H24v8h11.3c-.8 2.3-2.3 4.3-4.2 5.7l6.2 5.2C35.9 40.9 44 35 44 24c0-1.3-.1-2.6-.4-3.9z" />
                  </svg>
                  <span>Continue with Google</span>
                </button>

                <div className="auth-divider">
                  <span>or continue with email</span>
                </div>
                {/* Hidden GSI host — powers the custom button above */}
                <div ref={googleBtnHiddenRef} style={{ position: 'absolute', width: 1, height: 1, opacity: 0, overflow: 'hidden', pointerEvents: 'none' }} />
              </div>
            )}

            <form onSubmit={handleAuthSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
              {authMode === 'REGISTER' && (
                <div className="auth-field">
                  <label className="auth-label" htmlFor="auth-fullname">Full Name</label>
                  <div className="auth-input-wrap">
                    <Users size={15} className="auth-input-icon" />
                    <input
                      id="auth-fullname"
                      type="text"
                      placeholder="Your full name"
                      value={authForm.fullName}
                      onChange={e => setAuthForm({ ...authForm, fullName: e.target.value })}
                      required
                      className="auth-input"
                    />
                  </div>
                </div>
              )}

              <div className="auth-field">
                <label className="auth-label" htmlFor="auth-email">Email Address</label>
                <div className="auth-input-wrap">
                  <Mail size={15} className="auth-input-icon" />
                  <input
                    id="auth-email"
                    type="email"
                    placeholder="you@example.com"
                    value={authForm.email}
                    onChange={e => setAuthForm({ ...authForm, email: e.target.value })}
                    required
                    className="auth-input"
                  />
                </div>
              </div>

              <div className="auth-field">
                <label className="auth-label" htmlFor="auth-password">Password</label>
                <div className="auth-input-wrap">
                  <Lock size={15} className="auth-input-icon" />
                  <input
                    id="auth-password"
                    type="password"
                    placeholder={authMode === 'REGISTER' ? 'At least 8 characters with letters & numbers' : 'Your password'}
                    value={authForm.password}
                    onChange={e => setAuthForm({ ...authForm, password: e.target.value })}
                    required
                    className="auth-input"
                  />
                </div>
              </div>

              {authMode === 'REGISTER' && (
                <>
                  <div className="auth-field">
                    <label className="auth-label" htmlFor="auth-confirm">Confirm Password</label>
                    <div className="auth-input-wrap">
                      <ShieldCheck size={15} className="auth-input-icon" />
                      <input
                        id="auth-confirm"
                        type="password"
                        placeholder="Re-enter your password"
                        value={authForm.confirmPassword}
                        onChange={e => setAuthForm({ ...authForm, confirmPassword: e.target.value })}
                        required
                        className="auth-input"
                      />
                    </div>
                  </div>

                  <div className="auth-field">
                    <label className="auth-label" htmlFor="auth-status">What best describes you right now?</label>
                    <div className="auth-input-wrap">
                      <GraduationCap size={15} className="auth-input-icon" />
                      <select
                        id="auth-status"
                        value={authForm.currentStatus}
                        onChange={e => setAuthForm({ ...authForm, currentStatus: e.target.value })}
                        required
                        className="auth-input auth-select"
                      >
                        <option value="">Select your current status</option>
                        {CURRENT_STATUS_OPTIONS.map(opt => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </>
              )}

              <button type="submit" className="btn btn-primary auth-submit" disabled={isAuthLoading}>
                {isAuthLoading ? (
                  <>Authenticating…</>
                ) : authMode === 'LOGIN' ? (
                  <>Sign In <ArrowRight size={16} /></>
                ) : (
                  <>Create Account <ArrowRight size={16} /></>
                )}
              </button>

              {authMode === 'LOGIN' && (
                <button
                  type="button"
                  className="auth-demo-btn"
                  onClick={handleDemoLogin}
                  disabled={isAuthLoading}
                >
                  <Play size={14} /> Try the Demo Account (1-click)
                </button>
              )}
            </form>

            <div className="auth-switch">
              {authMode === 'LOGIN' ? (
                <span>
                  New to SkillBridge?{' '}
                  <button onClick={() => { setAuthMode('REGISTER'); setAuthError(''); }}>
                    Create an account
                  </button>
                </span>
              ) : (
                <span>
                  Already have an account?{' '}
                  <button onClick={() => { setAuthMode('LOGIN'); setAuthError(''); }}>
                    Sign in
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
