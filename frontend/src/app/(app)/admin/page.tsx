'use client';

import { useEffect } from 'react';
import { ShieldAlert } from 'lucide-react';
import { useSkillBridge } from '@/lib/skillbridge-context';
import SkillAdminView from '@/components/views/SkillAdminView';
import AdminView from '@/components/views/AdminView';

export default function AdminPage() {
  const { currentUser, authToken, loadAdminSkillQuestions, setAuthMode, setShowAuthModal } = useSkillBridge();

  useEffect(() => {
    if (currentUser?.role === 'ADMIN' && authToken) {
      loadAdminSkillQuestions();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.role, authToken]);

  if (!currentUser) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: '2.5rem', maxWidth: '560px', margin: '2rem auto' }}>
        <div style={{
          width: '52px', height: '52px', borderRadius: '50%', margin: '0 auto 1rem',
          background: 'var(--warning-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <ShieldAlert size={22} style={{ color: 'var(--warning)' }} />
        </div>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: '0 0 0.6rem' }}>Admin access</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: '0 auto 1.5rem', maxWidth: '420px' }}>
          Please sign in with an administrator account to manage the platform.
        </p>
        <button className="btn btn-primary" onClick={() => { setAuthMode('LOGIN'); setShowAuthModal(true); }}>
          Sign In
        </button>
      </div>
    );
  }

  if (currentUser.role !== 'ADMIN') {
    return (
      <div className="card" style={{ textAlign: 'center', padding: '2.5rem', maxWidth: '560px', margin: '2rem auto' }}>
        <div style={{
          width: '52px', height: '52px', borderRadius: '50%', margin: '0 auto 1rem',
          background: 'var(--danger-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <ShieldAlert size={22} style={{ color: 'var(--danger)' }} />
        </div>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: '0 0 0.6rem' }}>Access Restricted</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: '0 auto 1.5rem', maxWidth: '420px' }}>
          Your account does not have administrator privileges. Contact a platform admin if you believe this is a mistake.
        </p>
      </div>
    );
  }

  return (
    <>
      <SkillAdminView />
      <AdminView />
    </>
  );
}