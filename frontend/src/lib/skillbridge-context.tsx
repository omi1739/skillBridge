'use client';

import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import {
  Role,
  Assessment,
  AssessmentAttempt,
  SkillGap,
  ActionRecommendation,
  JobMatchResult,
  ProjectEvidence,
  ProjectHealthReport,
  CurriculumProfile,
  CurriculumComparisonResult,
  Skill,
  User,
  Profile
} from '@skillbridge/types';
import { API_BASE, GOOGLE_CLIENT_ID, DEMO_ACCESS_ENABLED } from './config';
import { apiErrorMessage } from './api-error';

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

const API_TIMEOUT_MS = Number(process.env.NEXT_PUBLIC_API_TIMEOUT_MS || 20000);
// Health checks run a live GitHub scan plus optional AI review; allow more
// headroom than standard calls (the backend enforces its own hard budgets).
const HEALTH_CHECK_TIMEOUT_MS = Number(process.env.NEXT_PUBLIC_HEALTH_CHECK_TIMEOUT_MS || 40000);

function hasAuthorizationHeader(init?: RequestInit): boolean {
  if (!init?.headers) return false;
  const headers = new Headers(init.headers);
  return headers.has('Authorization') || headers.has('authorization');
}

let unauthorizedNotifiedAt = 0;

/**
 * Dispatch a single session-expired event when an *authenticated* request is
 * rejected with 401. Login/register calls carry no Authorization header, so a
 * wrong-password 401 does not trigger this.
 */
function notifyUnauthorized(): void {
  if (typeof window === 'undefined') return;
  const now = Date.now();
  if (now - unauthorizedNotifiedAt < 5000) return;
  unauthorizedNotifiedAt = now;
  window.dispatchEvent(new Event('skillbridge:unauthorized'));
}

/**
 * `fetch` with a hard client-side timeout. Every network call in the app goes
 * through this so a slow/unreachable API surfaces a clear message instead of an
 * indefinite spinner, and stale tokens sign the user out exactly once.
 */
async function apiFetch(
  input: RequestInfo | URL,
  init: RequestInit = {},
  timeoutMs: number = API_TIMEOUT_MS
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), Math.max(1000, timeoutMs));
  try {
    const res = await globalThis.fetch(input, { ...init, signal: init.signal ?? controller.signal });
    if (res.status === 401 && hasAuthorizationHeader(init)) notifyUnauthorized();
    return res;
  } catch (err: any) {
    if (err?.name === 'AbortError') {
      throw new Error('The request timed out. Please check your connection and try again.', { cause: err });
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

function fetchJSON<T>(input: RequestInfo | URL, init?: RequestInit, timeoutMs?: number): Promise<T> {
  return apiFetch(input, init, timeoutMs).then(async res => {
    const body = await res.json().catch(() => null);
    if (!res.ok) {
      throw new Error(apiErrorMessage(body, `Request failed (${res.status})`));
    }
    return body as T;
  });
}

function useSkillBridgeValue() {
  const router = useRouter();
  const pathname = usePathname();

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

  // Global, user-facing error surface for async failures that previously
  // only logged to the console.
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [personalDataError, setPersonalDataError] = useState(false);

  const reportError = (msg: string) => setGlobalError(msg);
  const dismissGlobalError = () => setGlobalError(null);

  useEffect(() => {
    if (!globalError) return;
    const timer = setTimeout(() => setGlobalError(null), 6000);
    return () => clearTimeout(timer);
  }, [globalError]);

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
  const [diagnosticAttemptId, setDiagnosticAttemptId] = useState<string | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<number>(30 * 60);

  // Skill-centric assessment state
  const [skillAssessAvailableSkills, setSkillAssessAvailableSkills] = useState<any[]>([]);
  const [skillAssessSelectedSkill, setSkillAssessSelectedSkill] = useState<string>('');
  const [skillAssessCfg, setSkillAssessCfg] = useState({ easy: 2, medium: 5, hard: 3 });
  const [skillSession, setSkillSession] = useState<any | null>(null);
  const [skillQuestionIdx, setSkillQuestionIdx] = useState(0);
  const [skillAnswers, setSkillAnswers] = useState<Record<string, string | string[]>>({});
  const [skillSavedCorrect, setSkillSavedCorrect] = useState<Record<string, boolean>>({});
  const [skillAnswered, setSkillAnswered] = useState<Record<string, boolean>>({});
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

  // Candidate personalized data
  const [gaps, setGaps] = useState<SkillGap[]>([]);
  const [recommendations, setRecommendations] = useState<ActionRecommendation[]>([]);
  const [jobMatches, setJobMatches] = useState<JobMatchResult[]>([]);
  const [expandedMatchId, setExpandedMatchId] = useState<string | null>(null);
  const [jobRemoteFilter, setJobRemoteFilter] = useState<'ALL' | 'REMOTE' | 'ONSITE'>('ALL');
  const [jobRegionFilter, setJobRegionFilter] = useState<'ALL' | 'BANGLADESH' | 'INTERNATIONAL'>('ALL');
  const [jobSort, setJobSort] = useState<'recent' | 'priority'>('recent');
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

  // Project health check state (keyed by project id)
  const [projectHealth, setProjectHealth] = useState<Record<string, ProjectHealthReport>>({});
  const [projectHealthError, setProjectHealthError] = useState<Record<string, string>>({});
  const [checkingProjectHealthId, setCheckingProjectHealthId] = useState<string | null>(null);

  // Skill passport state
  const [showPassportModal, setShowPassportModal] = useState(false);
  const [passportData, setPassportData] = useState<any | null>(null);
  const [copySuccess, setCopySuccess] = useState(false);

  // Profile editing modal state
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profileForm, setProfileForm] = useState({ fullName: '', githubUrl: '', portfolioUrl: '', bio: '', targetRoleId: '' });
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState('');
  const [profileError, setProfileError] = useState('');

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
    remoteJobs?: number;
  } | null>(null);

  // Google sign-in refs
  const googleBtnHiddenRef = useRef<HTMLDivElement>(null);

  const loadDiagnostic = async (count = 12, token?: string | null) => {
    const effectiveToken = token !== undefined ? token : authToken;
    setAssessment(null);
    setAttemptResult(null);
    setTimeRemaining(0);
    try {
      const diagRes = await apiFetch(`${API_BASE}/assessments/diagnostic?count=${count}`);
      const data = await diagRes.json().catch(() => null);
      if (!diagRes.ok) throw new Error(apiErrorMessage(data, 'Could not load the assessment.'));

      let timeLimitMinutes = data?.timeLimitMinutes || 15;
      let attemptId: string | null = null;

      // Server-sided `/start`: only meaningful once there's an account to hold
      // the attempt window against. Anonymous demo visitors have no token, so
      // the JWT guard would 401 them — a server attempt is impossible anyway,
      // so skip straight to the client timer in that case (matches the legacy
      // demo behaviour). For signed-in users, a 404/405 means the deployed
      // backend predates the route (deploy lag) → graceful client timer. Any
      // other non-2xx (real 401 on expired tokens, 400 on expired attempts, …)
      // stays a hard error so auth/expiry problems are never masked.
      if (effectiveToken) {
        const startRes = await apiFetch(`${API_BASE}/assessments/assessment_backend_diagnostic/start`, {
          method: 'POST',
          headers: headersFor(effectiveToken),
          body: JSON.stringify({ count })
        });
        if (startRes.ok) {
          const start = await startRes.json().catch(() => null);
          if (start?.attemptId) {
            attemptId = start.attemptId;
            timeLimitMinutes = start.timeLimitMinutes || timeLimitMinutes;
            // The server window is authoritative: a re-used attempt (page
            // reload / remount within the window) still counts from its
            // original startedAt, so the client countdown must honour the
            // remaining time rather than resetting to a fresh full timer.
            if (start?.startedAt) {
              const elapsedSec = Math.floor((Date.now() - new Date(start.startedAt).getTime()) / 1000);
              const remainingSec = Math.max(0, timeLimitMinutes * 60 - elapsedSec);
              if (remainingSec > 0) setTimeRemaining(remainingSec);
            }
          }
          // The server authoritatively decides the served subset per attempt.
          // Use it so grading never covers questions the user wasn't shown, and
          // so re-renders (Retry, tab remounts) present the same questions.
          if (start?.questions && Array.isArray(start.questions) && start.questions.length > 0) {
            data.questions = start.questions;
            data.questionCount = start.questions.length;
          }
        } else if (startRes.status !== 404 && startRes.status !== 405) {
          const start = await startRes.json().catch(() => null);
          throw new Error(apiErrorMessage(start, 'Could not start the assessment. Please sign in first.'));
        } else {
          // 404/405 — backend not re-deployed yet; keep the client timer (legacy mode).
          console.warn('[SkillBridge] /assessments/:id/start unavailable on the API host; using the client-sided timer (legacy backend).');
        }
      }

      setDiagnosticAttemptId(attemptId);
      setAssessment(data);
      setCurrentQuestionIdx(0);
      setUserAnswers({});
      setTimeRemaining(timeLimitMinutes * 60);
    } catch (err: any) {
      console.error('[SkillBridge] Data load failed:', err);
      reportError(err.message || 'Could not load the assessment.');
    }
  };
  const activeUserId = currentUser ? currentUser.id : 'demo_user_01';

  // Target-role resolution: null when the user has not picked a role yet.
  const activeTargetRoleId = currentProfile?.targetRoleId || null;
  const effectiveRoleId = activeTargetRoleId || 'role_full_stack';

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
    apiFetch(`${API_BASE}/assessments/skills`)
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
    setSkillAnswered({});
    setSkillQuestionIdx(0);
    try {
      const res = await apiFetch(`${API_BASE}/assessments`, {
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
      if (!res.ok) throw new Error(apiErrorMessage(data, 'Could not start assessment.'));
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
    try {
      const res = await apiFetch(`${API_BASE}/assessments/session/${skillSession.id}/answers`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ questionId, answer })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(apiErrorMessage(data, 'Answer could not be saved.'));
      setSkillSavedCorrect(prev => ({ ...prev, [questionId]: data.correct }));
      setSkillAnswers(prev => ({ ...prev, [questionId]: answer }));
      setSkillAnswered(prev => ({ ...prev, [questionId]: true }));
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
      const res = await apiFetch(`${API_BASE}/assessments/session/${skillSession.id}/submit`, {
        method: 'POST',
        headers: authHeaders()
      });
      const data = await res.json();
      if (!res.ok) throw new Error(apiErrorMessage(data, 'Could not submit assessment.'));
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
      const res = await apiFetch(`${API_BASE}/assessments/session/${sessionId}/result`, { headers: authHeaders() });
      const data = await res.json();
      if (!res.ok) throw new Error(apiErrorMessage(data, 'Could not load result.'));
      setSkillResult(data);
      setViewingResultId(sessionId);
      setSkillSession(null);
    } catch (err: any) {
      setSkillAssessError(err.message || 'Could not load result.');
    }
  };

  const loadSkillAssessHistory = () => {
    apiFetch(`${API_BASE}/assessments/history`, { headers: authHeaders() })
      .then(res => res.json())
      .then(data => setSkillHistory(Array.isArray(data) ? data : null))
      .catch(() => setSkillHistory(null));
  };

  const loadSkillAssessProgress = (skillId: string) => {
    apiFetch(`${API_BASE}/assessments/skills/${skillId}/progress`, { headers: authHeaders() })
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
    setSkillAnswered({});
    setSkillQuestionIdx(0);
    setSkillAssessError('');
  };

  const cancelSkillAssessment = () => {
    setSkillAssessError('');
    setSkillSession(null);
    setSkillQuestionIdx(0);
    setSkillAnswers({});
    setSkillSavedCorrect({});
    setSkillAnswered({});
  };

  useEffect(() => {
    loadSkillAssessSkills();
  }, []);

  // Raw job postings are only served to authenticated members. This also
  // powers the public market view's posting drilldown once a user signs in.
  const fetchJobs = (t?: string | null) => {
    if (!(t || authToken)) {
      setAllJobs([]);
      return;
    }
    apiFetch(`${API_BASE}/jobs`, { headers: headersFor(t) })
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
    setPersonalDataError(false);

    if (targetRole) {
      fetchJSON<SkillGap[]>(`${API_BASE}/me/gaps?userId=${userId}&roleId=${targetRole}`, { headers: headersFor(token) })
        .then(data => { if (Array.isArray(data)) setGaps(data); })
        .catch((err) => { console.error('[SkillBridge] Data load failed:', err); setPersonalDataError(true); });

      fetchJSON<ActionRecommendation[]>(`${API_BASE}/me/recommendations?userId=${userId}&roleId=${targetRole}`, { headers: headersFor(token) })
        .then(data => { if (Array.isArray(data)) setRecommendations(data); })
        .catch((err) => { console.error('[SkillBridge] Data load failed:', err); setPersonalDataError(true); });

      fetchJSON<JobMatchResult[]>(`${API_BASE}/jobs/matches?userId=${userId}&roleId=${targetRole}`, { headers: headersFor(token) })
        .then(data => { if (Array.isArray(data)) setJobMatches(data); })
        .catch((err) => { console.error('[SkillBridge] Data load failed:', err); setPersonalDataError(true); });

      fetchJobs(token);
    } else {
      setGaps([]);
      setRecommendations([]);
      setJobMatches([]);
      setAllJobs([]);
    }

    fetchJSON<ProjectEvidence[]>(`${API_BASE}/me/projects?userId=${userId}`, { headers: headersFor(token) })
      .then(data => setUserProjects(Array.isArray(data) ? data : []))
      .catch((err) => { console.error('[SkillBridge] Data load failed:', err); setPersonalDataError(true); });

    if (role === 'ADMIN') {
      fetchJSON<any>(`${API_BASE}/admin/overview`, { headers: headersFor(token) })
        .then(data => setAdminOverview(data))
        .catch((err) => {
          console.error('[SkillBridge] Admin overview load failed:', err);
          setAdminOverview(null);
        });
      fetchJSON<any>(`${API_BASE}/admin/dashboard`, { headers: headersFor(token) })
        .then(data => setAdminDashboard(data))
        .catch((err) => {
          console.error('[SkillBridge] Admin dashboard load failed:', err);
          setAdminDashboard(null);
        });
      loadUsers({ token });
    } else {
      setAdminOverview(null);
      setAdminDashboard(null);
      setAdminUsers([]);
    }
  };

  const loadUsers = (opts?: { page?: number; pageSize?: number; search?: string; token?: string | null }) => {
    // Accept an explicit token (fresh from auth) so a call right after
    // login/setAuthToken never reads a stale pre-render closure value.
    const token = opts?.token !== undefined ? opts.token : authToken;
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
    apiFetch(`${API_BASE}/admin/users?${qs.toString()}`, { headers: headersFor(token) })
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
    apiFetch(`${API_BASE}/admin/users/${userId}/role`, {
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
    apiFetch(`${API_BASE}/admin/users/${userId}`, {
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

  const handleResetUserPassword = (userId: string, email: string) => {
    const newPassword = window.prompt(`Set a new password for ${email}\n(min 8 characters, at least one letter and one number)`);
    if (!newPassword) return;
    if (newPassword.length < 8) {
      setAdminUserMsg({ ok: false, text: 'Password must be at least 8 characters.' });
      return;
    }
    setAdminUserMsg(null);
    apiFetch(`${API_BASE}/admin/users/${userId}/password`, {
      method: 'PATCH',
      headers: authHeaders(),
      body: JSON.stringify({ newPassword })
    })
      .then(res => res.json().then((data: any) => ({ ok: res.ok, data })))
      .then(({ ok, data }) => {
        if (ok && data?.success) {
          setAdminUserMsg({ ok: true, text: `Password reset for ${email}. Share it securely and ask them to change it.` });
        } else {
          setAdminUserMsg({ ok: false, text: (data?.message) || 'Could not reset password.' });
        }
      })
      .catch(() => setAdminUserMsg({ ok: false, text: 'Reset failed.' }));
  };

  const fetchAllRoles = () => {
    fetchJSON<Role[]>(`${API_BASE}/roles`)
      .then(data => setAllRoles(Array.isArray(data) ? data : []))
      .catch((err) => console.error('[SkillBridge] Roles load failed:', err));
  };

  const fetchRoleAndSkills = (roleId = effectiveRoleId) => {
    fetchJSON<Role>(`${API_BASE}/roles/${roleId}`)
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

    fetchJSON<Skill[]>(`${API_BASE}/skills`)
      .then(data => setSkills(Array.isArray(data) ? data : []))
      .catch((err) => console.error('[SkillBridge] Data load failed:', err));
  };

  const handleRoleSelect = (roleId: string) => {
    if (!currentUser || !authToken || !roleId) return;
    setRoleDraft('');
    apiFetch(`${API_BASE}/me/profile`, {
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

  /**
   * `null` means "clear this field"; an omitted key means "leave it alone".
   * The server treats them differently, so the type has to allow nulls.
   */
  const handleUpdateProfile = async (patch: Partial<{ [K in keyof Profile]: Profile[K] | null }>) => {
    if (!currentUser || !authToken) return;
    setProfileSaving(true);
    setProfileError('');
    setProfileSuccess('');
    try {
      const res = await apiFetch(`${API_BASE}/me/profile`, {
        method: 'PATCH',
        headers: authHeaders(),
        body: JSON.stringify(patch)
      });
      const data = await res.json().then((d: any) => ({ ok: res.ok, data: d }));
      if (!data.ok || !data.data?.userId) {
        throw new Error(apiErrorMessage(data.data, 'Could not update profile.'));
      }
      const updatedProfile: Profile = data.data;
      setCurrentProfile(updatedProfile);
      localStorage.setItem('skillbridge_profile', JSON.stringify(updatedProfile));
      if (patch.targetRoleId) {
        refreshUserData(currentUser.id, currentUser.role, authToken, patch.targetRoleId);
        fetchRoleAndSkills(patch.targetRoleId);
      }
      setProfileSuccess('Profile updated.');
    } catch (err: any) {
      setProfileError(err.message || 'Profile update failed.');
    } finally {
      setProfileSaving(false);
    }
  };

  const handleChangePassword = async (
    currentPassword: string,
    newPassword: string,
    confirmPassword: string
  ): Promise<{ ok: boolean; message: string }> => {
    if (!currentUser || !authToken) return { ok: false, message: 'You must be signed in.' };
    try {
      const res = await apiFetch(`${API_BASE}/me/password`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          currentPassword: currentPassword || undefined,
          newPassword,
          confirmPassword
        })
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) return { ok: false, message: apiErrorMessage(data, 'Could not change password.') };
      return { ok: true, message: 'Password updated.' };
    } catch (err: any) {
      return { ok: false, message: err?.message || 'Could not change password.' };
    }
  };

  // Request a self-service password-reset email. Resolves with `devResetUrl`
  // only when the API is running without an email provider in non-production.
  const requestPasswordReset = async (email: string): Promise<{ devResetUrl?: string }> => {
    const res = await apiFetch(`${API_BASE}/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.trim() })
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) throw new Error(apiErrorMessage(data, 'Could not send the reset email.'));
    return { devResetUrl: data?.devResetUrl };
  };

  // Complete a password reset using the token from the emailed link.
  const resetPassword = async (token: string, newPassword: string, confirmPassword: string): Promise<void> => {
    const res = await apiFetch(`${API_BASE}/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, newPassword, confirmPassword })
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) throw new Error(apiErrorMessage(data, 'Could not reset your password.'));
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

    const initialRoleId = restoredProfile?.targetRoleId || 'role_full_stack';
    fetchRoleAndSkills(initialRoleId);
    fetchAllRoles();

    // Load the diagnostic immediately. A restored session must be passed
    // explicitly: on first render `authToken` is still null, so the closure
    // would otherwise skip the server-side `/start` and the first submission
    // would be rejected by the backend as "not started".
    loadDiagnostic(12, savedToken);

    fetchJSON<any[]>(`${API_BASE}/sandbox/challenges`)
      .then(data => {
        const list = Array.isArray(data) ? data : [];
        setChallenges(list);
        if (list.length > 0) {
          setSandboxCode(list[0].starterCode);
        }
      })
      .catch((err) => console.error('[SkillBridge] Data load failed:', err));

    fetchJSON<CurriculumProfile[]>(`${API_BASE}/curriculum/institutions`)
      .then(data => setCurricula(Array.isArray(data) ? data : []))
      .catch((err) => console.error('[SkillBridge] Data load failed:', err));

    fetchJSON<CurriculumComparisonResult>(`${API_BASE}/curriculum/analyze?institutionId=curr_bsc_cse&roleId=${initialRoleId}`)
      .then(data => setCurriculumAnalysis(data))
      .catch((err) => {
        console.error('[SkillBridge] Curriculum analysis load failed:', err);
        setCurriculumAnalysis(null);
      });

    fetchJSON<any>(`${API_BASE}/stats`)
      .then(data => setLandingStats(data))
      .catch((err) => console.error('[SkillBridge] Data load failed:', err));

    fetchJSON<any>(`${API_BASE}/market/demand?roleId=${initialRoleId}`)
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
    // Mount-only: seeds global state once. The referenced loaders are
    // store-backed functions, not reactive values.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // `timeRemaining > 0` is extracted so the dependency is a plain boolean: the
  // interval must be (re)created when the assessment changes or when the
  // countdown crosses back above zero, and nothing else.
  const timerRunning = timeRemaining > 0;

  useEffect(() => {
    if (!assessment || !timerRunning) return;
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
  }, [assessment, timerRunning]);

  /**
   * Where sign-in drops the user. Normally the dashboard — but someone who
   * signs in *to submit* an in-progress diagnostic must stay on it, or their
   * answers look lost.
   */
  const navigateAfterAuth = () => {
    if (pathname === TAB_PATH.assessment && assessment && !attemptResult) return;
    navigate('market');
  };

  const handleDemoLogin = async () => {
    if (!DEMO_ACCESS_ENABLED) {
      reportError('Demo access is disabled in this environment.');
      return;
    }
    setIsAuthLoading(true);
    try {
      const token = 'demo_token_demo_user_01';
      const res = await apiFetch(`${API_BASE}/me`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.user || !data?.profile) {
        throw new Error(apiErrorMessage(data, 'Demo sign-in failed.'));
      }
      setCurrentUser(data.user);
      setCurrentProfile(data.profile);
      setAuthToken(token);
      localStorage.setItem('skillbridge_token', token);
      localStorage.setItem('skillbridge_user', JSON.stringify(data.user));
      localStorage.setItem('skillbridge_profile', JSON.stringify(data.profile));
      setShowAuthModal(false);
      navigateAfterAuth();
      refreshUserData('demo_user_01', data.user.role, token, data.profile.targetRoleId);
    } catch (err: any) {
      console.error(err);
      reportError(err?.message || 'Demo login failed. Please try again.');
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setIsAuthLoading(true);

    const email = authForm.email.trim();
    const password = authForm.password;

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setIsAuthLoading(false);
      setAuthError('Please enter a valid email address.');
      return;
    }

    if (authMode === 'REGISTER') {
      if (password.length < 8) {
        setIsAuthLoading(false);
        setAuthError('Password must be at least 8 characters long.');
        return;
      }
      if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) {
        setIsAuthLoading(false);
        setAuthError('Password must contain at least one letter and one number.');
        return;
      }
      if (password !== authForm.confirmPassword) {
        setIsAuthLoading(false);
        setAuthError('Passwords do not match.');
        return;
      }
      if (!authForm.fullName.trim()) {
        setIsAuthLoading(false);
        setAuthError('Full name is required.');
        return;
      }
      if (!authForm.currentStatus) {
        setIsAuthLoading(false);
        setAuthError('Please select your current status.');
        return;
      }
    } else if (!password) {
      setIsAuthLoading(false);
      setAuthError('Password is required.');
      return;
    }

    const endpoint = authMode === 'REGISTER' ? `${API_BASE}/auth/register` : `${API_BASE}/auth/login`;
    const payload = authMode === 'REGISTER'
      ? {
          email,
          password,
          confirmPassword: authForm.confirmPassword,
          fullName: authForm.fullName.trim(),
          currentStatus: authForm.currentStatus,
          targetRoleId: authForm.targetRoleId || undefined
        }
      : {
          email,
          password
        };

    try {
      const res = await apiFetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(apiErrorMessage(data, 'Authentication failed.'));
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
    navigateAfterAuth();
    refreshUserData(data.user.id, data.user.role, data.token, data.profile.targetRoleId);
  };

  const handleGoogleCredential = async (credential: string) => {
    setIsAuthLoading(true);
    setAuthError('');
    try {
      const res = await apiFetch(`${API_BASE}/auth/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          idToken: credential,
          currentStatus: authForm.currentStatus || undefined
        })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(apiErrorMessage(data, 'Google sign-in failed.'));
      }
      applyAuthResult(data);
    } catch (err: any) {
      setAuthError(err.message || 'Google sign-in failed.');
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleGoogleClick = () => {
    // GSI renders the real button into googleBtnRef. Click whatever button
    // GSI produced (its iframe may be cross-origin, so we trigger from the
    // visible button's wrapping element which GSI wires up itself).
    const host = googleBtnHiddenRef.current;
    if (!host) return;
    const btn = host.querySelector('button');
    if (btn) { btn.click(); return; }
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

  // Sign the user out when the API rejects a stored token (expired JWT, changed
  // password, deleted account). A ref keeps the listener bound once while always
  // calling the latest handler.
  const logoutRef = useRef(handleLogout);
  useEffect(() => {
    logoutRef.current = handleLogout;
  });
  useEffect(() => {
    const onUnauthorized = () => {
      setGlobalError('Your session expired. Please sign in again.');
      logoutRef.current();
    };
    window.addEventListener('skillbridge:unauthorized', onUnauthorized);
    return () => window.removeEventListener('skillbridge:unauthorized', onUnauthorized);
  }, []);

  const handleCurriculumChange = (currId: string) => {
    setSelectedCurriculumId(currId);
    fetchJSON<CurriculumComparisonResult>(`${API_BASE}/curriculum/analyze?institutionId=${currId}&roleId=${effectiveRoleId}`)
      .then(data => setCurriculumAnalysis(data))
      .catch((err) => {
        console.error('[SkillBridge] Curriculum analysis load failed:', err);
        setCurriculumAnalysis(null);
      });
  };

  const handleOpenPassport = async () => {
    if (!currentUser) {
      setAuthMode('LOGIN');
      setShowAuthModal(true);
      return;
    }
    try {
      const res = await apiFetch(`${API_BASE}/me/report?userId=${activeUserId}&roleId=${effectiveRoleId}`, { headers: authHeaders() });
      const data = await res.json();
      if (!res.ok) throw new Error(apiErrorMessage(data, 'Could not load your skill passport.'));
      setPassportData(data);
      setShowPassportModal(true);
    } catch (err: any) {
      console.error(err);
      reportError(err.message || 'Could not load your skill passport.');
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

  /**
   * Open a server-side attempt over the questions currently on screen.
   *
   * `loadDiagnostic` only calls `/start` when it already has a token, so a
   * visitor who loaded the test anonymously holds questions but no attempt —
   * submitting one is rejected with "not started". Replaying the displayed ids
   * makes the attempt cover exactly what the user answered (a plain `/start`
   * would draw a different random subset and grade against that instead).
   *
   * Returns the attempt id, or null when the host predates `/start` (legacy
   * backend), in which case submission must fall back to the old contract.
   */
  const startAttemptForCurrentQuestions = async (): Promise<string | null> => {
    const current = assessment;
    if (!current) return null;
    const questions = current.questions || [];
    const res = await apiFetch(`${API_BASE}/assessments/${current.id}/start`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ count: questions.length || 12, questionIds: questions.map(q => q.id) })
    });
    if (res.status === 404 || res.status === 405) return null;
    const body = await res.json().catch(() => null);
    if (!res.ok) throw new Error(apiErrorMessage(body, 'Could not start the assessment. Please reload and try again.'));

    // An attempt already in progress (started in an earlier session) keeps its
    // own recorded subset. Adopt those questions so grading matches what the
    // server will actually count; answers are keyed by question id, so any
    // overlapping responses survive the swap.
    if (Array.isArray(body?.questions) && body.questions.length > 0) {
      const servedIds = body.questions.map((q: { id: string }) => q.id);
      const shownIds = questions.map(q => q.id);
      const differs = servedIds.length !== shownIds.length || servedIds.some((id: string, i: number) => id !== shownIds[i]);
      if (differs) {
        setAssessment({ ...current, questions: body.questions });
        setCurrentQuestionIdx(0);
      }
    }
    return body?.attemptId ?? null;
  };

  const handleSubmitAssessment = async () => {
    if (!assessment) return;
    setIsSubmittingAssessment(true);

    const answersPayload = Object.entries(userAnswers).map(([questionId, selectedAnswer]) => ({
      questionId,
      selectedAnswer
    }));

    try {
      // Submitting requires an account. Keep the answers on screen and let the
      // user sign in, rather than burning them on a 401 they cannot act on.
      if (!authToken) {
        setShowAuthModal(true);
        throw new Error('Sign in to submit your answers — they will be kept.');
      }

      let attemptId = diagnosticAttemptId || undefined;
      if (!attemptId) {
        attemptId = (await startAttemptForCurrentQuestions()) || undefined;
        if (attemptId) setDiagnosticAttemptId(attemptId);
      }

      const res = await apiFetch(`${API_BASE}/assessments/${assessment.id}/submit`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          answers: answersPayload,
          attemptId
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(apiErrorMessage(data, 'Could not submit assessment.'));
      }
      // The backend returns `{ attempt, gaps, detailedResults }`; the view reads
      // score/passed/points off the attempt, so merge the top-level
      // detailedResults back onto it.
      if (data && data.attempt) {
        setAttemptResult({ ...data.attempt, detailedResults: data.detailedResults });
      } else {
        setAttemptResult(data);
      }
      refreshUserData();
    } catch (err: any) {
      reportError(err.message || 'Could not submit assessment.');
      console.error('[SkillBridge] Assessment submit failed:', err);
    } finally {
      setIsSubmittingAssessment(false);
    }
  };

  useEffect(() => {
    if (assessment && timeRemaining === 0 && Object.keys(userAnswers).length > 0 && !attemptResult && !isSubmittingAssessment) {
      handleSubmitAssessment();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeRemaining]);

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID || !showAuthModal) return;
    const w = window as any;
    let cancelled = false;
    const initGoogle = () => {
      if (cancelled) return;
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
          type: 'standard',
          shape: 'rectangular',
          width: '300',
        });
      }
    };
    if (w.google?.accounts?.id) { initGoogle(); return; }
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.onload = initGoogle;
    document.body.appendChild(script);
    return () => { cancelled = true; script.remove(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showAuthModal]);

  const handleSelectChallenge = (idx: number) => {
    setSelectedChallengeIdx(idx);
    setSandboxCode(challenges[idx].starterCode);
    setSandboxResult(null);
  };

  const handleGenerateChallenge = async () => {
    setIsGeneratingChallenge(true);
    setGenerateError('');
    setSandboxResult(null);
    try {
      const res = await apiFetch(`${API_BASE}/sandbox/generate`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ type: 'SQL', skillId: 'skill_sql', difficulty: 'Intermediate' })
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(apiErrorMessage(data, 'Generation failed.'));
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

  const handleRunSandbox = async () => {
    const challenge = challenges[selectedChallengeIdx];
    if (!challenge) return;

    setIsRunningSandbox(true);
    setSandboxResult(null);

    const endpoint = challenge.type === 'SQL' ? `${API_BASE}/sandbox/run-sql` : `${API_BASE}/sandbox/run-code`;
    const payload = challenge.type === 'SQL'
      ? { challengeId: challenge.id, query: sandboxCode }
      : { challengeId: challenge.id, code: sandboxCode };

    try {
      const res = await apiFetch(endpoint, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify(payload)
      });
      const data = await res.json().catch(() => null);
      // A 401/429 body is `{statusCode, message, error}` — storing it as the
      // result renders a blank panel, so surface it as a failure instead.
      if (!res.ok) {
        throw new Error(apiErrorMessage(data, 'Could not run your solution.'));
      }
      setSandboxResult(data);
      if (data?.passed) {
        refreshUserData();
      }
    } catch (err: any) {
      console.error(err);
      setSandboxResult({ passed: false, error: err?.message || 'Failed to run code.' });
    } finally {
      setIsRunningSandbox(false);
    }
  };

  const handleProjectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // The server requires all three; mirror that here so a rejected submit
    // never looks like a button that does nothing.
    if (!projectForm.title.trim() || !projectForm.repoUrl.trim() || !projectForm.description.trim()) return;

    setIsSubmittingProject(true);
    setProjectSuccessMsg('');

    try {
      const res = await apiFetch(`${API_BASE}/me/projects`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          title: projectForm.title.trim(),
          repoUrl: projectForm.repoUrl.trim(),
          description: projectForm.description.trim(),
          primarySkills: projectForm.primarySkills
        })
      });

      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.project) {
        throw new Error(apiErrorMessage(data, 'Could not submit project.'));
      }
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
    } catch (err: any) {
      console.error(err);
      reportError(err.message || 'Could not submit project.');
    } finally {
      setIsSubmittingProject(false);
    }
  };

  const checkProjectHealth = async (projectId: string) => {
    if (!authToken) return;
    setCheckingProjectHealthId(projectId);
    setProjectHealthError(prev => {
      if (!(projectId in prev)) return prev;
      const next = { ...prev };
      delete next[projectId];
      return next;
    });
    try {
      const report = await fetchJSON<ProjectHealthReport>(
        `${API_BASE}/me/projects/${encodeURIComponent(projectId)}/health`,
        { headers: authHeaders() },
        // Live GitHub scan + optional AI enrichment can take longer than the
        // default budget; the backend is time-bounded well under this.
        HEALTH_CHECK_TIMEOUT_MS
      );
      setProjectHealth(prev => ({ ...prev, [projectId]: report }));
    } catch (err: any) {
      console.error('[SkillBridge] Project health check failed:', err);
      const message = err?.message || 'Could not analyze this project.';
      setProjectHealthError(prev => ({ ...prev, [projectId]: message }));
      reportError(message);
    } finally {
      setCheckingProjectHealthId(null);
    }
  };

  const handleCreateAlias = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aliasForm.rawAlias.trim() || !aliasForm.canonicalSkillId) return;

    try {
      const res = await apiFetch(`${API_BASE}/admin/skills/alias`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          alias: aliasForm.rawAlias.trim(),
          skillId: aliasForm.canonicalSkillId
        })
      });
      const data = await res.json();
      if (data.success) {
        setAliasSaveSuccess(true);
        setAliasForm({ rawAlias: '', canonicalSkillId: '' });
        refreshUserData();
        setTimeout(() => setAliasSaveSuccess(false), 3000);
      } else {
        throw new Error(apiErrorMessage(data, 'Could not create alias.'));
      }
    } catch (err: any) {
      console.error(err);
      reportError(err.message || 'Could not create alias.');
    }
  };

  const handleUpdateRoleWeight = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!role || !editingSkillWeight) return;

    try {
      const res = await apiFetch(`${API_BASE}/admin/roles/${role.id}/weights`, {
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
      } else {
        throw new Error(apiErrorMessage(data, 'Could not update role weights.'));
      }
    } catch (err: any) {
      console.error(err);
      reportError(err.message || 'Could not update role weights.');
    }
  };

  // ---- Admin skill question bank helpers ----
  const loadAdminSkillQuestions = (status = adminQStatusFilter || 'pending_review') => {
    if (!authToken) return;
    const qs = status ? `?status=${encodeURIComponent(status)}` : '';
    apiFetch(`${API_BASE}/assessments/admin/questions${qs}`, { headers: authHeaders() })
      .then(res => (res.ok ? res.json() : Promise.reject(res)))
      .then((data: any) => setAdminSkillQuestions(Array.isArray(data) ? data : []))
      .catch(() => setAdminSkillQuestions([]));
  };

  const setAdminQuestionStatus = async (id: string, status: string) => {
    setAdminQMsg(null);
    try {
      const res = await apiFetch(`${API_BASE}/assessments/admin/questions/${id}/status`, {
        method: 'PATCH',
        headers: authHeaders(),
        body: JSON.stringify({ status })
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(apiErrorMessage(data, 'Update failed.'));
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
      const res = await apiFetch(`${API_BASE}/assessments/admin/generate`, {
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
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(apiErrorMessage(data, 'Generation failed.'));
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
    // global error surface
    globalError,
    dismissGlobalError,
    reportError,
    personalDataError,
    setPersonalDataError,
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
    isDemoAccessEnabled: DEMO_ACCESS_ENABLED,
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
    skillAnswered,
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
    activeChallenge,
    handleSelectChallenge,
    handleGenerateChallenge,
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
    // project health check
    projectHealth,
    projectHealthError,
    checkingProjectHealthId,
    checkProjectHealth,
    // passport
    showPassportModal,
    setShowPassportModal,
    passportData,
    copySuccess,
    handleOpenPassport,
    handleCopyPassportMarkdown,
    // profile editing
    showProfileModal,
    setShowProfileModal,
    profileForm,
    setProfileForm,
    profileSaving,
    profileSuccess,
    setProfileSuccess,
    profileError,
    setProfileError,
    handleUpdateProfile,
    handleChangePassword,
    requestPasswordReset,
    resetPassword,
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
    handleResetUserPassword,
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