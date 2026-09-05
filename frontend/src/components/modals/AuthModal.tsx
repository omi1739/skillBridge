'use client';

import { X, Sliders, LogIn, PlusCircle, AlertCircle, Users, Mail, Lock, ShieldCheck, GraduationCap, Target, ArrowRight, Play } from 'lucide-react';
import { useSkillBridge } from '@/lib/skillbridge-context';
import { GOOGLE_CLIENT_ID } from '@/lib/config';
import { CURRENT_STATUS_OPTIONS } from '@/lib/constants';

export default function AuthModal() {
  const {
    showAuthModal, setShowAuthModal,
    authMode, setAuthMode,
    authForm, setAuthForm,
    authError, setAuthError,
    isAuthLoading,
    handleAuthSubmit, handleDemoLogin,
    handleGoogleClick, googleBtnHiddenRef,
    allRoles
  } = useSkillBridge();

  if (!showAuthModal) return null;

  return (
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

              <div className="auth-field">
                <label className="auth-label" htmlFor="auth-target-role">What role are you preparing for? <span style={{ fontWeight: 400 }}>(optional)</span></label>
                <div className="auth-input-wrap">
                  <Target size={15} className="auth-input-icon" />
                  <select
                    id="auth-target-role"
                    value={authForm.targetRoleId}
                    onChange={e => setAuthForm({ ...authForm, targetRoleId: e.target.value })}
                    className="auth-input auth-select"
                  >
                    <option value="">Choose now or later</option>
                    {allRoles.map(r => (
                      <option key={r.id} value={r.id}>{r.title}</option>
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
  );
}