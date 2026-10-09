'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Lock, ShieldCheck, AlertCircle, ArrowRight, CheckCircle2 } from 'lucide-react';
import BrandMark from '@/components/ui/BrandMark';
import { useSkillBridge } from '@/lib/skillbridge-context';

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token') || '';
  const { resetPassword } = useSkillBridge();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }
    if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) {
      setError('Password must contain at least one letter and one number.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    setLoading(true);
    try {
      await resetPassword(token, password, confirmPassword);
      setDone(true);
    } catch (err: any) {
      setError(err?.message || 'Could not reset your password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop" style={{ position: 'static', minHeight: '100vh', padding: '2rem 1rem' }}>
      <div className="modal-box" style={{ maxWidth: 440, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '1rem' }}>
          <BrandMark size={34} className="auth-brand-mark" />
          <div>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 800, letterSpacing: '-0.01em', lineHeight: 1.2 }}>
              {done ? 'Password updated' : 'Choose a new password'}
            </h2>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>
              {done ? 'You can now sign in with your new password.' : 'Your reset link is valid for one hour.'}
            </div>
          </div>
        </div>

        {!token && !done && (
          <div className="auth-error">
            <AlertCircle size={15} style={{ flexShrink: 0 }} />
            <span>This reset link is missing its token. Please request a new one.</span>
          </div>
        )}

        {error && (
          <div className="auth-error">
            <AlertCircle size={15} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        {done ? (
          <>
            <div className="auth-success">
              <CheckCircle2 size={15} style={{ flexShrink: 0 }} />
              <span>Your password has been reset successfully.</span>
            </div>
            <Link href="/" className="btn btn-primary auth-submit" style={{ display: 'block', textAlign: 'center' }}>
              Go to SkillBridge <ArrowRight size={16} />
            </Link>
          </>
        ) : (
          <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
            <div className="auth-field">
              <label className="auth-label" htmlFor="reset-password">New Password</label>
              <div className="auth-input-wrap">
                <Lock size={15} className="auth-input-icon" />
                <input
                  id="reset-password"
                  type="password"
                  placeholder="At least 8 characters with letters & numbers"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  minLength={8}
                  className="auth-input"
                />
              </div>
            </div>

            <div className="auth-field">
              <label className="auth-label" htmlFor="reset-confirm">Confirm New Password</label>
              <div className="auth-input-wrap">
                <ShieldCheck size={15} className="auth-input-icon" />
                <input
                  id="reset-confirm"
                  type="password"
                  placeholder="Re-enter your new password"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  required
                  className="auth-input"
                />
              </div>
            </div>

            <button type="submit" className="btn btn-primary auth-submit" disabled={loading || !token}>
              {loading ? <>Updating…</> : <>Update password <ArrowRight size={16} /></>}
            </button>
          </form>
        )}

        <div className="auth-switch">
          <span>Back to <Link href="/">sign in</Link></span>
        </div>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div style={{ padding: '2rem', textAlign: 'center' }}>Loading…</div>}>
      <ResetPasswordForm />
    </Suspense>
  );
}
