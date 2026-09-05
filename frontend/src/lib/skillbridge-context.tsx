'use client';

import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
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
import { API_BASE, GOOGLE_CLIENT_ID } from './config';

export type AppTab = 'market' | 'curriculum' | 'assessment' | 'sandbox' | 'gaps' | 'actions' | 'jobs' | 'admin';

const TAB_PATH: Record<AppTab, string> = {
  market: '/market',
  curriculum: '/curriculum',
  assessment: '/assessment',
  sandbox: '/sandbox',
  gaps: '/gaps',
  actions: '/actions',
  jobs: '/jobs',
  admin: '/admin'
};

function useSkillBridgeValue() {
  const router = useRouter();

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
    targetRoleId: ''
  });
  const [authError, setAuthError] = useState('');
  const [isAuthLoading, setIsAuthLoading] = useState(false);

  // Role catalog + target role selection (progressive prompt flow)
  const [allRoles, setAllRoles] = useState<Role[]>([]);
  const [roleDraft, setRoleDraft] = useState('');

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

  // Skill-centric assessment state
  const [skillAssessAvailableSkills, setSkillAssessAvailableSkills] = useState<any[]>([]);
  const [skillAssessSelectedSkill, setSkillAssessSelectedSkill] = useState<string>('');
  const [skillAssessCfg, setSkillAssessCfg] = useState({ easy: 2, medium: 5, hard: 3 });
  const [skillSession, setSkillSession] = useState<any | null>(null);
  const [skillQuestionIdx, setSkillQuestionIdx] = useState(0);
  const [skillAnswers, setSkillAnswers] = useState<Record<string, string | string[]>>({});
  const [skillSavedCorrect, setSkillSavedCorrect] = useState<Record<string, boolean>>({});
  const [isStartingSkill, setIsStartingSkill] = useState(false);
  const [isSubmittingSkill, setIsSubmittingSkill] = useState(false);
  const [skillAssessError, setSkillAssessError] = useState('');
  const [skillResult, setSkillResult] = useState<any | null>(null);
  const [skillHistory, setSkillHistory] = useState<any[] | null>(null);
  const [skillProgress, setSkillProgress] = useState<any | null>(null);
  const [viewingResultId, setViewingResultId] = useState<string | null>(null);

  // Sandbox runner state
  const [selectedChallengeIdx, setSelectedChallengeIdx] = useState(0);
  const [sandboxCode, setSandboxCode] = useState('');
  const [isRunningSandbox, setIsRunningSandbox] = useState(false);
  const [sandboxResult, setSandboxResult] = useState<any | null>(null);
  const [isGeneratingChallenge, setIsGeneratingChallenge] = useState(false);
  const [generateError, setGenerateError] = useState('');
  const [referenceSolution, setReferenceSolution] = useState<string | null>(null);
  const [isLoadingSolution, setIsLoadingSolution] = useState(false);

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

  // Admin skill question bank state
  const [adminSkillQuestions, setAdminSkillQuestions] = useState<any[] | null>(null);
  const [adminQStatusFilter, setAdminQStatusFilter] = useState('pending_review');
  const [adminQMsg, setAdminQMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [adminGenForm, setAdminGenForm] = useState({ topic: '', difficulty: 'medium', questionType: 'MCQ', count: 3 });
  const [isGeneratingQuestions, setIsGeneratingQuestions] = useState(false);

  // Landing page market stats (dynamic counts)
  const [landingStats, setLandingStats] = useState<{
    jobPostings: number;
    canonicalSkills: number;
    validationPercent: number;
    curriculaCount?: number;
    activeCompanies?: number;
  } | null>(null);

  // Google sign-in refs
  const googleBtnHiddenRef = useRef<HTMLDivElement>(null);

  const loadDiagnostic = (count = 12) => {
    fetch(`${API_BASE}/assessments/diagnostic?count=${count}`)
      .then(res => res.json())
      .then(data => {
        setAssessment(data);
        setCurrentQuestionIdx(0);
        setUserAnswers({});
        setAttemptResult(null);
        if (data && data.timeLimitMinutes) {
          setTimeRemaining(data.timeLimitMinutes * 60);
        }
      })
      .catch((err) => console.error('[SkillBridge] Data load failed:', err));
  };
  const activeUserId = currentUser ? currentUser.id : 'demo_user_01';

  // Target-role resolution: null when the user has not picked a role yet.
  const activeTargetRoleId = currentProfile?.targetRoleId || null;
  const effectiveRoleId = activeTargetRoleId || 'role_junior_backend';

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

  // ---- Navigation helper (routes each app area to its own URL segment) ----
  const navigate = (tab: AppTab) => {
    router.push(TAB_PATH[tab]);
  };

  // ---- Skill-centric assessment API helpers ----
  const loadSkillAssessSkills = () => {
    fetch(`${API_BASE}/assessments/skills`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          setSkillAssessAvailableSkills(data);
          setSkillAssessSelectedSkill(prev => prev || data[0].id);
        }
      })
      .catch((err) => console.error('[SkillBridge] Skill assessment skills load failed:', err));
  };

  const startSkillAssessment = async () => {
    if (!skillAssessSelectedSkill) return;
    setIsStartingSkill(true);
    setSkillAssessError('');
    setSkillResult(null);
    setViewingResultId(null);
    setSkillAnswers({});
    setSkillQuestionIdx(0);
    try {
      const res = await fetch(`${API_BASE}/assessments`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          skillId: skillAssessSelectedSkill,
          easyCount: skillAssessCfg.easy,
          mediumCount: skillAssessCfg.medium,
          hardCount: skillAssessCfg.hard
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || data.error || 'Could not start assessment.');
      setSkillSession(data);
      setSkillSavedCorrect({});
    } catch (err: any) {
      setSkillAssessError(err.message || 'Could not start assessment.');
    } finally {
      setIsStartingSkill(false);
    }
  };

  const submitSkillAnswer = async (questionId: string, answer: string | string[]) => {
    if (!skillSession) return;
    if (skillSavedCorrect[questionId]) return;
    try {
      const res = await fetch(`${API_BASE}/assessments/session/${skillSession.id}/answers`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ questionId, answer })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Answer could not be saved.');
      setSkillSavedCorrect(prev => ({ ...prev, [questionId]: data.correct }));
      setSkillAnswers(prev => ({ ...prev, [questionId]: answer }));
    } catch (err: any) {
      setSkillAssessError(err.message || 'Answer could not be saved.');
    }
  };

  const goSkillQuestion = (idx: number) => {
    setSkillQuestionIdx(idx);
    setSkillAssessError('');
  };

  const submitSkillAssessment = async () => {
    if (!skillSession) return;
    setIsSubmittingSkill(true);
    setSkillAssessError('');
    try {
      const res = await fetch(`${API_BASE}/assessments/session/${skillSession.id}/submit`, {
        method: 'POST',
        headers: authHeaders()
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Could not submit assessment.');
      setSkillResult(data);
      setSkillSession(null);
      loadSkillAssessHistory();
      if (skillAssessSelectedSkill) loadSkillAssessProgress(skillAssessSelectedSkill);
    } catch (err: any) {
      setSkillAssessError(err.message || 'Could not submit assessment.');
    } finally {
      setIsSubmittingSkill(false);
    }
  };

  const loadSkillAssessResult = async (sessionId: string) => {
    try {
      const res = await fetch(`${API_BASE}/assessments/session/${sessionId}/result`, { headers: authHeaders() });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Could not load result.');
      setSkillResult(data);
      setViewingResultId(sessionId);
      setSkillSession(null);
    } catch (err: any) {
      setSkillAssessError(err.message || 'Could not load result.');
    }
  };

  const loadSkillAssessHistory = () => {
    fetch(`${API_BASE}/assessments/history`, { headers: authHeaders() })
      .then(res => res.json())
      .then(data => setSkillHistory(Array.isArray(data) ? data : null))
      .catch(() => setSkillHistory(null));
  };

  const loadSkillAssessProgress = (skillId: string) => {
    fetch(`${API_BASE}/assessments/skills/${skillId}/progress`, { headers: authHeaders() })
      .then(res => (res.ok ? res.json() : null))
      .then(data => setSkillProgress(data || null))
      .catch(() => setSkillProgress(null));
  };

  const resetSkillAssessment = () => {
    setSkillSession(null);
    setSkillResult(null);
    setViewingResultId(null);
    setSkillAnswers({});
    setSkillSavedCorrect({});
    setSkillQuestionIdx(0);
    setSkillAssessError('');
  };

  const cancelSkillAssessment = () => {
    setSkillAssessError('');
    setSkillSession(null);
    setSkillQuestionIdx(0);
    setSkillAnswers({});
    setSkillSavedCorrect({});
  };

  useEffect(() => {
    loadSkillAssessSkills();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  const refreshUserData = (userId = activeUserId, role?: string, t?: string | null, roleId?: string | null) => {
    if (!(t || authToken)) {
      setGaps([]);
      setRecommendations([]);
      setJobMatches([]);
      setUserProjects([]);
      setAdminOverview(null);
      return;
    }
    const token = t || authToken;
    const targetRole = roleId || currentProfile?.targetRoleId || null;

    if (targetRole) {
      fetch(`${API_BASE}/me/gaps?userId=${userId}&roleId=${targetRole}`, { headers: headersFor(token) })
        .then(res => res.json())
        .then(data => { if (Array.isArray(data)) setGaps(data); })
        .catch((err) => console.error('[SkillBridge] Data load failed:', err));

      fetch(`${API_BASE}/me/recommendations?userId=${userId}&roleId=${targetRole}`, { headers: headersFor(token) })
        .then(res => res.json())
        .then(data => { if (Array.isArray(data)) setRecommendations(data); })
        .catch((err) => console.error('[SkillBridge] Data load failed:', err));

      fetch(`${API_BASE}/jobs/matches?userId=${userId}&roleId=${targetRole}`, { headers: headersFor(token) })
        .then(res => res.json())
        .then(data => { if (Array.isArray(data)) setJobMatches(data); })
        .catch((err) => console.error('[SkillBridge] Data load failed:', err));

      fetchJobs(token);
    } else {
      setGaps([]);
      setRecommendations([]);
      setJobMatches([]);
      setAllJobs([]);
    }

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

  const fetchAllRoles = () => {
    fetch(`${API_BASE}/roles`)
      .then(res => res.json())
      .then(data => setAllRoles(Array.isArray(data) ? data : []))
      .catch((err) => console.error('[SkillBridge] Roles load failed:', err));
  };

  const fetchRoleAndSkills = (roleId = effectiveRoleId) => {
    fetch(`${API_BASE}/roles/${roleId}`)
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

  const handleRoleSelect = (roleId: string) => {
    if (!currentUser || !authToken || !roleId) return;
    setRoleDraft('');
    fetch(`${API_BASE}/me/profile`, {
      method: 'PATCH',
      headers: authHeaders(),
      body: JSON.stringify({ targetRoleId: roleId })
    })
      .then(res => res.json().then((data: any) => ({ ok: res.ok, data })))
      .then(({ ok, data }) => {
        if (ok && data && data.userId) {
          const updatedProfile: Profile = data;
          setCurrentProfile(updatedProfile);
          localStorage.setItem('skillbridge_profile', JSON.stringify(updatedProfile));
          fetchRoleAndSkills(roleId);
          refreshUserData(currentUser.id, currentUser.role, authToken, roleId);
        }
      })
      .catch((err) => console.error('[SkillBridge] Role update failed:', err));
  };

  useEffect(() => {
    // Restore saved session first so the target role is known before data loads.
    const savedToken = localStorage.getItem('skillbridge_token');
    const savedUser = localStorage.getItem('skillbridge_user');
    const savedProfile = localStorage.getItem('skillbridge_profile');
    let restoredUser: User | null = null;
    let restoredProfile: Profile | null = null;
    if (savedToken && savedUser && savedProfile) {
      try {
        restoredUser = JSON.parse(savedUser);
        restoredProfile = JSON.parse(savedProfile);
      } catch {
        restoredUser = null;
        restoredProfile = null;
      }
    }

    const initialRoleId = restoredProfile?.targetRoleId || 'role_junior_backend';
    fetchRoleAndSkills(initialRoleId);
    fetchAllRoles();

    loadDiagnostic(12);

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

    fetch(`${API_BASE}/curriculum/analyze?institutionId=curr_bsc_cse&roleId=${initialRoleId}`)
      .then(res => res.json())
      .then(data => setCurriculumAnalysis(data))
      .catch((err) => console.error('[SkillBridge] Data load failed:', err));

    fetch(`${API_BASE}/stats`)
      .then(res => res.json())
      .then(data => setLandingStats(data))
      .catch((err) => console.error('[SkillBridge] Data load failed:', err));

    fetch(`${API_BASE}/market/demand?roleId=${initialRoleId}`)
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

    if (restoredUser && restoredProfile && savedToken) {
      setCurrentUser(restoredUser);
      setCurrentProfile(restoredProfile);
      setAuthToken(savedToken);
      refreshUserData(restoredUser.id, restoredUser.role, savedToken, restoredProfile.targetRoleId);
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
        navigate('market');
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
          targetRoleId: authForm.targetRoleId || undefined
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
    setAuthForm({ email: '', password: '', confirmPassword: '', fullName: '', currentStatus: '', targetRoleId: '' });
    navigate('market');
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
    router.push('/');
  };

  const handleCurriculumChange = (currId: string) => {
    setSelectedCurriculumId(currId);
    fetch(`${API_BASE}/curriculum/analyze?institutionId=${currId}&roleId=${effectiveRoleId}`)
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
      const res = await fetch(`${API_BASE}/me/report?userId=${activeUserId}&roleId=${effectiveRoleId}`, { headers: authHeaders() });
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
      `**Target Role:** ${candidate.targetRole || 'Not selected'}`,
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
    setReferenceSolution(null);
  };

  const handleGenerateChallenge = async () => {
    setIsGeneratingChallenge(true);
    setGenerateError('');
    setSandboxResult(null);
    setReferenceSolution(null);
    try {
      const res = await fetch(`${API_BASE}/sandbox/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'SQL', skillId: 'skill_sql', difficulty: 'Intermediate' })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || data.error || 'Generation failed.');
      }
      setChallenges(prev => [...prev, data]);
      const newIdx = challenges.length;
      setSelectedChallengeIdx(newIdx);
      setSandboxCode(data.starterCode || '');
    } catch (err: any) {
      setGenerateError(err.message || 'Generation failed.');
    } finally {
      setIsGeneratingChallenge(false);
    }
  };

  const handleShowSolution = async () => {
    const challenge = activeChallenge;
    if (!challenge) return;
    setIsLoadingSolution(true);
    setReferenceSolution(null);
    try {
      const res = await fetch(`${API_BASE}/sandbox/reference-solution/${challenge.id}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || data.error || 'No solution available.');
      setReferenceSolution(data.referenceSolution || '');
    } catch (err: any) {
      setReferenceSolution(`Could not load solution: ${err.message}`);
    } finally {
      setIsLoadingSolution(false);
    }
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

  // ---- Admin skill question bank helpers ----
  const loadAdminSkillQuestions = (status = adminQStatusFilter || 'pending_review') => {
    if (!authToken) return;
    const qs = status ? `?status=${encodeURIComponent(status)}` : '';
    fetch(`${API_BASE}/assessments/admin/questions${qs}`, { headers: authHeaders() })
      .then(res => (res.ok ? res.json() : Promise.reject(res)))
      .then((data: any) => setAdminSkillQuestions(Array.isArray(data) ? data : []))
      .catch(() => setAdminSkillQuestions([]));
  };

  const setAdminQuestionStatus = async (id: string, status: string) => {
    setAdminQMsg(null);
    try {
      const res = await fetch(`${API_BASE}/assessments/admin/questions/${id}/status`, {
        method: 'PATCH',
        headers: authHeaders(),
        body: JSON.stringify({ status })
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || 'Update failed.');
      setAdminQMsg({ ok: true, text: `Question ${status}.` });
      loadAdminSkillQuestions();
    } catch (err: any) {
      setAdminQMsg({ ok: false, text: err.message });
    }
  };

  const generateAdminQuestions = async () => {
    setAdminQMsg(null);
    setIsGeneratingQuestions(true);
    try {
      const res = await fetch(`${API_BASE}/assessments/admin/generate`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          skillId: skillAssessSelectedSkill,
          topic: adminGenForm.topic,
          difficulty: adminGenForm.difficulty,
          questionType: adminGenForm.questionType,
          count: adminGenForm.count
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || data.error || 'Generation failed.');
      setAdminQMsg({ ok: true, text: `Generated ${data.created} question(s); ${data.rejected} rejected.` });
      loadAdminSkillQuestions();
    } catch (err: any) {
      setAdminQMsg({ ok: false, text: err.message });
    } finally {
      setIsGeneratingQuestions(false);
    }
  };

  const activeChallenge = challenges[selectedChallengeIdx];

  return {
    // auth
    currentUser,
    setCurrentUser,
    currentProfile,
    setCurrentProfile,
    authToken,
    showAuthModal,
    setShowAuthModal,
    authMode,
    setAuthMode,
    authForm,
    setAuthForm,
    authError,
    setAuthError,
    isAuthLoading,
    handleDemoLogin,
    handleAuthSubmit,
    handleGoogleCredential,
    handleGoogleClick,
    googleBtnHiddenRef,
    handleLogout,
    // roles
    allRoles,
    roleDraft,
    setRoleDraft,
    handleRoleSelect,
    role,
    skills,
    activeTargetRoleId,
    effectiveRoleId,
    // market
    allJobs,
    marketProvenance,
    expandedSkillPostings,
    setExpandedSkillPostings,
    landingStats,
    // curriculum
    curricula,
    selectedCurriculumId,
    setSelectedCurriculumId,
    curriculumAnalysis,
    handleCurriculumChange,
    // diagnostic assessment
    assessment,
    currentQuestionIdx,
    setCurrentQuestionIdx,
    userAnswers,
    attemptResult,
    isSubmittingAssessment,
    timeRemaining,
    loadDiagnostic,
    handleAnswerSelect,
    handleSubmitAssessment,
    // skill-centric assessment
    skillAssessAvailableSkills,
    skillAssessSelectedSkill,
    setSkillAssessSelectedSkill,
    skillAssessCfg,
    setSkillAssessCfg,
    skillSession,
    skillQuestionIdx,
    setSkillQuestionIdx,
    skillAnswers,
    setSkillAnswers,
    skillSavedCorrect,
    isStartingSkill,
    isSubmittingSkill,
    skillAssessError,
    setSkillAssessError,
    skillResult,
    setSkillResult,
    skillHistory,
    skillProgress,
    setSkillProgress,
    viewingResultId,
    setViewingResultId,
    loadSkillAssessSkills,
    startSkillAssessment,
    submitSkillAnswer,
    goSkillQuestion,
    submitSkillAssessment,
    loadSkillAssessResult,
    loadSkillAssessHistory,
    loadSkillAssessProgress,
    resetSkillAssessment,
    cancelSkillAssessment,
    // sandbox
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
    // personalized data
    gaps,
    recommendations,
    jobMatches,
    userProjects,
    expandedMatchId,
    setExpandedMatchId,
    jobRemoteFilter,
    setJobRemoteFilter,
    jobRegionFilter,
    setJobRegionFilter,
    jobSort,
    setJobSort,
    refreshUserData,
    fetchJobs,
    // project modal
    showProjectModal,
    setShowProjectModal,
    projectForm,
    setProjectForm,
    isSubmittingProject,
    projectSuccessMsg,
    handleProjectSubmit,
    // passport
    showPassportModal,
    setShowPassportModal,
    passportData,
    copySuccess,
    handleOpenPassport,
    handleCopyPassportMarkdown,
    // admin
    adminOverview,
    adminDashboard,
    adminUsers,
    adminUsersTotal,
    adminUsersTotalPages,
    adminUsersSearch,
    setAdminUsersSearch,
    adminUsersPage,
    adminUsersPageSize,
    setAdminUsersPageSize,
    loadUsers,
    adminUserMsg,
    handleChangeUserRole,
    handleDeleteUser,
    editingSkillWeight,
    setEditingSkillWeight,
    aliasForm,
    setAliasForm,
    weightSaveSuccess,
    aliasSaveSuccess,
    handleCreateAlias,
    handleUpdateRoleWeight,
    adminSkillQuestions,
    adminQStatusFilter,
    setAdminQStatusFilter,
    adminQMsg,
    adminGenForm,
    setAdminGenForm,
    isGeneratingQuestions,
    setAdminQuestionStatus,
    generateAdminQuestions,
    loadAdminSkillQuestions,
    activeUserId,
    authHeaders,
    headersFor,
    navigate
  };
}

export type SkillBridgeContextValue = ReturnType<typeof useSkillBridgeValue>;

const SkillBridgeContext = createContext<SkillBridgeContextValue | null>(null);

export function SkillBridgeProvider({ children }: { children: ReactNode }) {
  const value = useSkillBridgeValue();
  return (
    <SkillBridgeContext.Provider value={value}>
      {children}
    </SkillBridgeContext.Provider>
  );
}

export function useSkillBridge() {
  const ctx = useContext(SkillBridgeContext);
  if (!ctx) throw new Error('useSkillBridge must be used within SkillBridgeProvider');
  return ctx;
}