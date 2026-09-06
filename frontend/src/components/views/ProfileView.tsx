'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Mail, Calendar, ShieldCheck, Globe, Github, Target, Pencil, Check, ArrowLeft, AlertCircle } from 'lucide-react';
import { useSkillBridge } from '@/lib/skillbridge-context';
import Avatar from '@/components/ui/Avatar';
import { CURRENT_STATUS_OPTIONS } from '@/lib/constants';

export default function ProfileView() {
  const {
    currentUser, currentProfile, role, allRoles,
    handleUpdateProfile, profileSaving, profileSuccess, profileError,
    setProfileSuccess, setProfileError
  } = useSkillBridge();
  const router = useRouter();

  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    fullName: '',
    targetRoleId: '',
    githubUrl: '',
    portfolioUrl: '',
    bio: ''
  });

  useEffect(() => {
    if (!editing) {
      setForm({
        fullName: currentProfile?.fullName || currentUser?.email.split('@')[0] || '',
        targetRoleId: currentProfile?.targetRoleId || '',
        githubUrl: currentProfile?.githubUrl || '',
        portfolioUrl: currentProfile?.portfolioUrl || '',
        bio: currentProfile?.bio || ''
      });
    }
  }, [editing, currentProfile]);

  useEffect(() => () => {
    setProfileSuccess('');
    setProfileError('');
  }, [setProfileSuccess, setProfileError]);

  if (!currentUser || !currentProfile) return null;

  const statusLabel = CURRENT_STATUS_OPTIONS.find(o => o.value === (currentUser.currentStatus || 'STUDENT'))?.label || 'Student';
  const targetRoleTitle = allRoles.find(r => r.id === currentProfile.targetRoleId)?.title || role?.title || 'Not set';
  const joined = new Date(currentUser.createdAt).toLocaleDateString(undefined, { month: 'short', year: 'numeric' });
  const isAdmin = currentUser.role === 'ADMIN';

  const save = async () => {
    await handleUpdateProfile({
      fullName: form.fullName.trim() || undefined,
      targetRoleId: form.targetRoleId || undefined,
      githubUrl: form.githubUrl.trim() || undefined,
      portfolioUrl: form.portfolioUrl.trim() || undefined,
      bio: form.bio.trim() || undefined
    });
    setEditing(false);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <button
        className="btn btn-ghost"
        onClick={() => router.push('/market')}
        style={{ alignSelf: 'flex-start', gap: '0.4rem', fontSize: '0.82rem' }}
      >
        <ArrowLeft size={15} /> Back to dashboard
      </button>

      {profileSuccess && (
        <div className="confirmed-banner"><Check size={16} /> {profileSuccess}</div>
      )}
      {profileError && (
        <div className="error-banner"><AlertCircle size={16} /> {profileError}</div>
      )}

      {/* Identity header */}
      <div className="profile-header-card">
        <Avatar
          src={currentUser.avatarUrl}
          name={currentProfile.fullName}
          email={currentUser.email}
          size={72}
          className="profile-avatar-lg"
        />
        <div style={{ flex: 1, minWidth: 0 }}>
          <h1 className="profile-name">{currentProfile.fullName || currentUser.email.split('@')[0]}</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
            <Mail size={13} color="var(--text-muted)" /> {currentUser.email}
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.7rem' }}>
            <span className="badge badge-accent">Target: {targetRoleTitle}</span>
            <span className="badge badge-neutral">{statusLabel}</span>
            {isAdmin && <span className="badge badge-critical">Administrator</span>}
          </div>
        </div>
        {!editing && (
          <button className="btn btn-secondary" onClick={() => setEditing(true)} style={{ gap: '0.4rem', fontSize: '0.82rem' }}>
            <Pencil size={14} /> Edit Profile
          </button>
        )}
      </div>

      <div className="grid-2" style={{ alignItems: 'start' }}>
        {/* Details & edit */}
        <div className="profile-section">
          <h3 className="profile-section-title">About Me</h3>

          {!editing ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <div className="profile-label">Bio</div>
                <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: 1.65 }}>
                  {currentProfile.bio || 'No bio yet — tell potential employers what you are building toward.'}
                </p>
              </div>
              <div>
                <div className="profile-label">GitHub</div>
                {currentProfile.githubUrl ? (
                  <a className="profile-link" href={currentProfile.githubUrl} target="_blank" rel="noopener noreferrer">
                    <Github size={14} /> {currentProfile.githubUrl.replace(/^https?:\/\//, '')}
                  </a>
                ) : (
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Not linked</span>
                )}
              </div>
              <div>
                <div className="profile-label">Portfolio</div>
                {currentProfile.portfolioUrl ? (
                  <a className="profile-link" href={currentProfile.portfolioUrl} target="_blank" rel="noopener noreferrer">
                    <Globe size={14} /> {currentProfile.portfolioUrl.replace(/^https?:\/\//, '')}
                  </a>
                ) : (
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Not linked</span>
                )}
              </div>
            </div>
          ) : (
            <form style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }} onSubmit={e => { e.preventDefault(); save(); }}>
              <div className="auth-field">
                <label className="auth-label" htmlFor="profile-fullname">Full Name</label>
                <div className="auth-input-wrap">
                  <input
                    id="profile-fullname"
                    type="text"
                    className="auth-input"
                    value={form.fullName}
                    onChange={e => setForm({ ...form, fullName: e.target.value })}
                  />
                </div>
              </div>

              <div className="auth-field">
                <label className="auth-label" htmlFor="profile-role">Target Role</label>
                <div className="auth-input-wrap">
                  <select
                    id="profile-role"
                    className="auth-input auth-select"
                    value={form.targetRoleId}
                    onChange={e => setForm({ ...form, targetRoleId: e.target.value })}
                  >
                    <option value="">Choose your target role</option>
                    {allRoles.map(r => (
                      <option key={r.id} value={r.id}>{r.title} — {r.slug}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="auth-field">
                <label className="auth-label" htmlFor="profile-github">GitHub URL</label>
                <div className="auth-input-wrap">
                  <Github size={15} className="auth-input-icon" />
                  <input
                    id="profile-github"
                    type="url"
                    className="auth-input"
                    placeholder="https://github.com/you"
                    value={form.githubUrl}
                    onChange={e => setForm({ ...form, githubUrl: e.target.value })}
                  />
                </div>
              </div>

              <div className="auth-field">
                <label className="auth-label" htmlFor="profile-portfolio">Portfolio URL</label>
                <div className="auth-input-wrap">
                  <Globe size={15} className="auth-input-icon" />
                  <input
                    id="profile-portfolio"
                    type="url"
                    className="auth-input"
                    placeholder="https://yourportfolio.dev"
                    value={form.portfolioUrl}
                    onChange={e => setForm({ ...form, portfolioUrl: e.target.value })}
                  />
                </div>
              </div>

              <div className="auth-field">
                <label className="auth-label" htmlFor="profile-bio">Bio</label>
                <textarea
                  id="profile-bio"
                  className="auth-input profile-textarea"
                  rows={4}
                  placeholder="Short summary of where you are and what you are working toward."
                  value={form.bio}
                  onChange={e => setForm({ ...form, bio: e.target.value })}
                />
              </div>

              <div className="profile-actions">
                <button type="submit" className="btn btn-primary" disabled={profileSaving} style={{ gap: '0.4rem' }}>
                  <Check size={15} /> {profileSaving ? 'Saving…' : 'Save Changes'}
                </button>
                <button type="button" className="btn btn-secondary" onClick={() => setEditing(false)}>
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Account info */}
        <div className="profile-section">
          <h3 className="profile-section-title">Account</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
            <div className="profile-row">
              <span className="profile-row-icon"><Mail size={15} /></span>
              <div>
                <div className="profile-label">Email</div>
                <div style={{ fontSize: '0.88rem', color: 'var(--text-primary)' }}>{currentUser.email}</div>
              </div>
            </div>
            <div className="profile-row">
              <span className="profile-row-icon"><ShieldCheck size={15} /></span>
              <div>
                <div className="profile-label">Sign-in method</div>
                <div style={{ fontSize: '0.88rem', color: 'var(--text-primary)' }}>
                  {currentUser.provider === 'GOOGLE' ? 'Google' : 'Email & password'}
                </div>
              </div>
            </div>
            <div className="profile-row">
              <span className="profile-row-icon"><Calendar size={15} /></span>
              <div>
                <div className="profile-label">Member since</div>
                <div style={{ fontSize: '0.88rem', color: 'var(--text-primary)' }}>{joined}</div>
              </div>
            </div>
            <div className="profile-row">
              <span className="profile-row-icon"><Target size={15} /></span>
              <div>
                <div className="profile-label">Current status</div>
                <div style={{ fontSize: '0.88rem', color: 'var(--text-primary)' }}>{statusLabel}</div>
              </div>
            </div>
            <div className="profile-row">
              <span className="profile-row-icon"><Globe size={15} /></span>
              <div>
                <div className="profile-label">Role on platform</div>
                <div style={{ fontSize: '0.88rem', color: 'var(--text-primary)' }}>
                  {isAdmin ? 'Administrator' : currentUser.role === 'RECRUITER' ? 'Recruiter' : 'Verified Candidate'}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}