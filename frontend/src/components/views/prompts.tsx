'use client';

import { Sliders, LogIn, ShieldCheck, BrainCircuit, Terminal } from 'lucide-react';
import { useSkillBridge } from '@/lib/skillbridge-context';

export function RolePromptView() {
  const { allRoles, role, roleDraft, setRoleDraft, handleRoleSelect } = useSkillBridge();
  const roleOptions = allRoles.length > 0 ? allRoles : (role ? [role] : []);
  return (
    <div className="card" style={{ textAlign: 'center', padding: '2.5rem', maxWidth: '560px', margin: '2rem auto' }}>
      <div style={{
        width: '52px', height: '52px', borderRadius: '50%', margin: '0 auto 1rem',
        background: 'rgba(56,189,248,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center'
      }}>
        <Sliders size={22} style={{ color: '#38bdf8' }} />
      </div>
      <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: '0 0 0.6rem' }}>Choose Your Target Role</h2>
      <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: '0 auto 1.5rem', maxWidth: '420px' }}>
        Pick the role you're preparing for to unlock personalized skill gaps, market demand insights, and job matches.
      </p>
      <div style={{ display: 'flex', gap: '0.6rem', justifyContent: 'center', flexWrap: 'wrap' }}>
        <select
          value={roleDraft}
          onChange={e => setRoleDraft(e.target.value)}
          style={{ maxWidth: '280px' }}
        >
          <option value="">Select a role…</option>
          {roleOptions.map(r => (
            <option key={r.id} value={r.id}>{r.title}</option>
          ))}
        </select>
        <button
          className="btn btn-primary"
          disabled={!roleDraft}
          onClick={() => handleRoleSelect(roleDraft)}
        >
          Save Target Role
        </button>
      </div>
    </div>
  );
}

export function SignInPromptView({ title, subtitle }: { title: string; subtitle: string }) {
  const { handleDemoLogin, setAuthMode, setShowAuthModal } = useSkillBridge();
  return (
    <div className="card" style={{ textAlign: 'center', padding: '2.5rem', maxWidth: '560px', margin: '2rem auto' }}>
      <div style={{
        width: '52px', height: '52px', borderRadius: '50%', margin: '0 auto 1rem',
        background: 'rgba(251,191,36,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center'
      }}>
        <LogIn size={22} style={{ color: '#fbbf24' }} />
      </div>
      <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: '0 0 0.6rem' }}>{title}</h2>
      <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: '0 auto 1.5rem', maxWidth: '420px' }}>
        {subtitle}
      </p>
      <div style={{ display: 'flex', gap: '0.6rem', justifyContent: 'center', flexWrap: 'wrap' }}>
        <button className="btn btn-primary" onClick={handleDemoLogin}>
          Try Demo (1-Click)
        </button>
        <button className="btn btn-secondary" onClick={() => { setAuthMode('LOGIN'); setShowAuthModal(true); }}>
          Sign In
        </button>
      </div>
    </div>
  );
}

export function NoEvidenceView() {
  const { navigate } = useSkillBridge();
  return (
    <div className="card" style={{ textAlign: 'center', padding: '2.5rem', maxWidth: '560px', margin: '2rem auto' }}>
      <div style={{
        width: '52px', height: '52px', borderRadius: '50%', margin: '0 auto 1rem',
        background: 'rgba(16,185,129,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center'
      }}>
        <ShieldCheck size={22} style={{ color: '#34d399' }} />
      </div>
      <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: '0 0 0.6rem' }}>You haven't verified any skills yet</h2>
      <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: '0 auto 1.5rem', maxWidth: '440px' }}>
        Take the skill assessment or solve a sandbox challenge to build your skill evidence. Your personalized skill gaps, project recommendations, and job matches will unlock here once you have verified results.
      </p>
      <div style={{ display: 'flex', gap: '0.6rem', justifyContent: 'center', flexWrap: 'wrap' }}>
        <button className="btn btn-primary" onClick={() => navigate('assessment')}>
          <BrainCircuit size={14} /> Take the Skill Assessment
        </button>
        <button className="btn btn-secondary" onClick={() => navigate('sandbox')}>
          <Terminal size={14} /> Try the SQL & Code Sandbox
        </button>
      </div>
    </div>
  );
}