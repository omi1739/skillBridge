'use client';

import { useState, useEffect } from 'react';
import { ShieldAlert, Database, LayoutDashboard } from 'lucide-react';
import { useSkillBridge } from '@/lib/skillbridge-context';
import SkillAdminView from '@/components/views/SkillAdminView';
import AdminView from '@/components/views/AdminView';
import { Segmented, EmptyState } from '@/components/ui/primitives';

export default function AdminPage() {
  const { currentUser, authToken, loadAdminSkillQuestions, setAuthMode, setShowAuthModal } = useSkillBridge();
  const [tab, setTab] = useState<'console' | 'questions'>('console');

  useEffect(() => {
    if (currentUser?.role === 'ADMIN' && authToken) {
      loadAdminSkillQuestions();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.role, authToken]);

  if (!currentUser) {
    return (
      <EmptyState
        icon={ShieldAlert}
        tone="warning"
        title="Admin access"
        subtitle="Please sign in with an administrator account to manage the platform."
        actions={<button className="btn btn-primary" onClick={() => { setAuthMode('LOGIN'); setShowAuthModal(true); }}>Sign In</button>}
      />
    );
  }

  if (currentUser.role !== 'ADMIN') {
    return (
      <EmptyState
        icon={ShieldAlert}
        tone="danger"
        title="Access Restricted"
        subtitle="Your account does not have administrator privileges. Contact a platform admin if you believe this is a mistake."
      />
    );
  }

  return (
    <div className="stack stack-lg">
      <div className="toolbar">
        <Segmented
          value={tab}
          onChange={v => setTab(v as 'console' | 'questions')}
          options={[
            { value: 'console', label: <><LayoutDashboard size={14} /> Console</> },
            { value: 'questions', label: <><Database size={14} /> Skill Question Bank</> }
          ]}
        />
      </div>

      <div key={tab}>
        {tab === 'console' ? <AdminView /> : <SkillAdminView />}
      </div>
    </div>
  );
}