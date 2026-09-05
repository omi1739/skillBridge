import React, { useState, useCallback, useMemo } from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { SkillBridgeProvider } from '../lib/skillbridge-context';
import GlobalModals from '../components/GlobalModals';
import AppShell from '../components/AppShell';
import { usePathname } from 'next/navigation';
import LandingPage from '../app/page';
import MarketPage from '../app/(app)/market/page';
import CurriculumPage from '../app/(app)/curriculum/page';
import AssessmentPage from '../app/(app)/assessment/page';
import SandboxPage from '../app/(app)/sandbox/page';
import GapsPage from '../app/(app)/gaps/page';
import ActionsPage from '../app/(app)/actions/page';
import JobsPage from '../app/(app)/jobs/page';
import AdminPage from '../app/(app)/admin/page';

const USER = { id: 'demo_user_01', fullName: 'Demo Candidate', email: 'demo@skillbridge.dev' };
const PROFILE = { userId: 'demo_user_01', targetRoleId: 'role_junior_backend' };

const ASSESSMENT = {
  id: 'assessment_backend_diagnostic',
  title: 'Backend Engineering Diagnostic',
  timeLimitMinutes: 6,
  questions: [
    { id: 'q1', prompt: 'Question one', points: 10, options: ['A', 'B', 'C'] },
    { id: 'q2', prompt: 'Question two', points: 10, options: ['A', 'B'] },
    { id: 'q3', prompt: 'Question three', points: 10, options: ['A', 'B'] }
  ]
};

const CHALLENGES = [
  {
    id: 'ch_sql_first',
    type: 'SQL',
    title: 'Find Duplicates',
    difficulty: 'Medium',
    description: 'Write a query',
    schemaPreview: 'orders(id, user_id, total)',
    starterCode: 'SELECT * FROM orders;'
  },
  {
    id: 'ch_js_second',
    type: 'JS',
    title: 'Two Sum',
    difficulty: 'Easy',
    description: 'Solve it',
    starterCode: 'function twoSum() {}'
  }
];

type CapturedCall = { method?: string; url: string; body?: string };

let capturedCalls: CapturedCall[] = [];

function response(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });
}

function setupFetch() {
  capturedCalls = [];
  global.fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    capturedCalls.push({ method: init?.method, url, body: init?.body as string | undefined });

    if (url.includes('/me?userId') || url.includes('/me?user')) {
      return response({ user: USER, profile: PROFILE });
    }
    if (url.includes('/assessments/diagnostic')) {
      return response(ASSESSMENT);
    }
    if (url.includes('/assessments/assessment_backend_diagnostic')) {
      return response(ASSESSMENT);
    }
    if (url.includes('/assessments/') && url.includes('/submit')) {
      return response({ score: 60, passed: false });
    }
    if (url.includes('/sandbox/challenges')) {
      return response(CHALLENGES);
    }
    if (url.includes('/sandbox/run-sql')) {
      return response({ passed: true });
    }
    if (url.includes('/sandbox/run-code')) {
      return response({ passed: true });
    }
    if (url.includes('/roles/role_junior_backend')) {
      return response({
        roleSkills: [],
        marketContext: { region: 'Bangladesh', experienceLevel: 'Junior' }
      });
    }
    if (url.includes('/skills')) {
      return response([]);
    }
    if (url.includes('/stats')) {
      return response({ jobPostings: 27, canonicalSkills: 9, validationPercent: 100 });
    }
    return response([]);
  });
}

const navMock = vi.hoisted(() => ({ ctx: undefined as any }));

vi.mock('next/navigation', async () => {
  const ReactMod = await import('react');
  const NavCtx = ReactMod.createContext<{ path: string; router: any }>({ path: '/', router: undefined });
  navMock.ctx = NavCtx;
  return {
    useRouter: () => ReactMod.useContext(NavCtx).router,
    usePathname: () => ReactMod.useContext(NavCtx).path,
    useSearchParams: () => new URLSearchParams(),
    useParams: () => ({})
  };
});

vi.mock('next/link', async () => {
  const ReactMod = await import('react');
  return {
    __esModule: true,
    default: ({ href, children, className, style }: any) => {
      const ctx = ReactMod.useContext(navMock.ctx) as any;
      return ReactMod.createElement('a', {
        href: String(href),
        className,
        style,
        onClick: (e: any) => { e.preventDefault(); ctx?.router.push(String(href)); }
      }, children);
    }
  };
});

function NavProvider({ children, initialPath = '/' }: { children: React.ReactNode; initialPath?: string }) {
  const [path, setPath] = useState(initialPath);
  const navigate = useCallback((p: string) => { setPath(p); }, []);
  const router = useMemo(() => ({ push: navigate, replace: navigate, back: () => navigate('/'), prefetch: () => {} }), [navigate]);
  const NavCtx = navMock.ctx;
  return (
    <NavCtx.Provider value={{ path, router }}>
      {children}
    </NavCtx.Provider>
  );
}

function Main() {
  const pathname = usePathname();
  if (pathname === '/') return <LandingPage />;

  let content: React.ReactNode;
  switch (pathname) {
    case '/market': content = <MarketPage />; break;
    case '/curriculum': content = <CurriculumPage />; break;
    case '/assessment': content = <AssessmentPage />; break;
    case '/sandbox': content = <SandboxPage />; break;
    case '/gaps': content = <GapsPage />; break;
    case '/actions': content = <ActionsPage />; break;
    case '/jobs': content = <JobsPage />; break;
    case '/admin': content = <AdminPage />; break;
    default: content = <LandingPage />;
  }
  return <AppShell>{content}</AppShell>;
}

function renderApp(initialPath = '/') {
  return render(
    <NavProvider initialPath={initialPath}>
      <SkillBridgeProvider>
        <Main />
        <GlobalModals />
      </SkillBridgeProvider>
    </NavProvider>
  );
}

async function loginAsDemo(user: ReturnType<typeof userEvent.setup>) {
  const demo = await screen.findByRole('button', { name: /try demo/i });
  await user.click(demo);
  await screen.findByRole('heading', { name: /Junior Backend Job Market Demand/i });
  await screen.findByText(/matching jobs/i);
}

describe('SkillBridge app API contract (multi-route)', () => {
  beforeEach(() => {
    localStorage.clear();
    setupFetch();
  });

  it('submits an assessment with the selectedAnswer payload shape', async () => {
    const user = userEvent.setup();
    renderApp('/');
    await loginAsDemo(user);

    await user.click(await screen.findByRole('button', { name: /^Diagnostic Test$/ }));
    await screen.findByRole('heading', { name: /Backend Engineering Diagnostic/i });

    for (let i = 0; i < ASSESSMENT.questions.length; i++) {
      const options = await screen.findAllByRole('button', { name: /^(A|B|C)$/ });
      await user.click(options[0]);

      if (i < ASSESSMENT.questions.length - 1) {
        await user.click(await screen.findByRole('button', { name: /Next Question/i }));
      } else {
        await user.click(await screen.findByRole('button', { name: /Submit Assessment/i }));
      }
    }

    await waitFor(() => {
      const submit = capturedCalls.find(c => c.url.includes('/submit'));
      expect(submit).toBeDefined();
      expect(submit!.method).toBe('POST');

      const body = JSON.parse(submit!.body!);
      expect(body).toHaveProperty('userId');
      expect(body).toHaveProperty('timeSpentSeconds');
      expect(Array.isArray(body.answers)).toBe(true);
      expect(body.answers).toHaveLength(ASSESSMENT.questions.length);
      for (const a of body.answers) {
        expect(a).toHaveProperty('questionId');
        expect(a).toHaveProperty('selectedAnswer');
      }
    });
  }, 30000);

  it('runs an SQL sandbox challenge with the query payload shape', async () => {
    const user = userEvent.setup();
    renderApp('/');
    await loginAsDemo(user);

    await user.click(await screen.findByRole('button', { name: /SQL & Code Sandbox/i }));
    await screen.findByRole('heading', { name: /SQL & Code Sandbox/i });

    const editor = screen.getByRole('textbox');
    await user.clear(editor);
    await user.type(editor, 'SELECT user_id, COUNT(*) FROM orders GROUP BY user_id;');

    await user.click(await screen.findByRole('button', { name: /Run Solution/i }));

    await waitFor(() => {
      const run = capturedCalls.find(c => c.url.includes('/sandbox/run-sql'));
      expect(run).toBeDefined();
      expect(run!.method).toBe('POST');

      const body = JSON.parse(run!.body!);
      expect(body).toHaveProperty('challengeId', 'ch_sql_first');
      expect(body).toHaveProperty('query');
      expect(body).toHaveProperty('userId');
      expect(body).not.toHaveProperty('code');
    });
  }, 30000);

  it('hides the Admin console tab for a non-admin (USER) user', async () => {
    const user = userEvent.setup();
    renderApp('/');
    await loginAsDemo(user);

    await screen.findByText(/matching jobs/i);
    expect(screen.queryByRole('button', { name: /Admin & Weights/i })).toBeNull();
  }, 20000);

  it('shows the real job posting count from /stats on the public landing page', async () => {
    renderApp('/');
    await screen.findByText(/Real job requirements, measured against real skills/i);
    const matches = await screen.findAllByText('27');
    expect(matches).not.toHaveLength(0);
  }, 20000);
});