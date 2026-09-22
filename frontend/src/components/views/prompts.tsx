'use client';

import { Sliders, LogIn, ShieldCheck, BrainCircuit, Terminal } from 'lucide-react';
import { useSkillBridge } from '@/lib/skillbridge-context';
import { EmptyState } from '@/components/ui/primitives';

export function RolePromptView() {
  const { allRoles, role, roleDraft, setRoleDraft, handleRoleSelect } = useSkillBridge();
  const roleOptions = allRoles.length > 0 ? allRoles : (role ? [role] : []);
  return (
    <div className="card">
      <EmptyState
        icon={Sliders}
        tone="info"
        title="Choose Your Target Role"
        subtitle="Pick the role you're preparing for to unlock personalized skill gaps, market demand insights, and job matches."
        actions={
          <div className="toolbar">
            <select className="select" style={{ maxWidth: '280px' }} value={roleDraft} onChange={e => setRoleDraft(e.target.value)}>
              <option value="">Select a role…</option>
              {roleOptions.map(r => (
                <option key={r.id} value={r.id}>{r.title}</option>
              ))}
            </select>
            <button className="btn btn-primary" disabled={!roleDraft} onClick={() => handleRoleSelect(roleDraft)}>
              Save Target Role
            </button>
          </div>
        }
      />
    </div>
  );
}

export function SignInPromptView({ title, subtitle }: { title: string; subtitle: string }) {
  const { handleDemoLogin, isDemoAccessEnabled, setAuthMode, setShowAuthModal } = useSkillBridge();
  return (
    <div className="card">
      <EmptyState
        icon={LogIn}
        tone="warning"
        title={title}
        subtitle={subtitle}
        actions={
          <div className="toolbar">
            {isDemoAccessEnabled && (
              <button className="btn btn-primary" onClick={handleDemoLogin}>
                Try Demo (1-Click)
              </button>
            )}
            <button className="btn btn-secondary" onClick={() => { setAuthMode('LOGIN'); setShowAuthModal(true); }}>
              Sign In
            </button>
          </div>
        }
      />
    </div>
  );
}

export function NoEvidenceView() {
  const { navigate } = useSkillBridge();
  return (
    <div className="card">
      <EmptyState
        icon={ShieldCheck}
        tone="success"
        title="You haven't verified any skills yet"
        subtitle="Take the skill assessment or solve a sandbox challenge to build your skill evidence. Your personalized skill gaps, project recommendations, and job matches will unlock here once you have verified results."
        actions={
          <div className="toolbar">
            <button className="btn btn-primary" onClick={() => navigate('assessment')}>
              <BrainCircuit size={14} /> Take the Skill Assessment
            </button>
            <button className="btn btn-secondary" onClick={() => navigate('sandbox')}>
              <Terminal size={14} /> Try the SQL & Code Sandbox
            </button>
          </div>
        }
      />
    </div>
  );
}