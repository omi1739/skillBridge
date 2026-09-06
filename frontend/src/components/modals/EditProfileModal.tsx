'use client';

import { X } from 'lucide-react';
import { useSkillBridge } from '@/lib/skillbridge-context';

export default function EditProfileModal() {
  const {
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
    allRoles
  } = useSkillBridge();

  if (!showProfileModal) return null;

  return (
    <div className="modal-backdrop">
      <div className="modal-box" style={{ maxWidth: 480 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <div>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 700 }}>Edit Profile</h2>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>
              Update your name, target role, and public links.
            </div>
          </div>
          <button className="btn btn-ghost" onClick={() => { setShowProfileModal(false); setProfileSuccess(''); setProfileError(''); }} style={{ padding: '0.35rem' }}>
            <X size={18} />
          </button>
        </div>

        {profileSuccess && (
          <div className="confirmed-banner" style={{ marginBottom: '1rem', background: 'var(--success-bg)', border: '1px solid var(--success-border)', color: 'var(--success-text)', padding: '0.6rem 0.8rem', borderRadius: '6px', fontSize: '0.82rem' }}>
            {profileSuccess}
          </div>
        )}
        {profileError && (
          <div className="error-banner" style={{ marginBottom: '1rem' }}>{profileError}</div>
        )}

        <form
          onSubmit={async (e) => {
            e.preventDefault();
            await handleUpdateProfile({
              fullName: profileForm.fullName.trim(),
              targetRoleId: profileForm.targetRoleId || undefined,
              githubUrl: profileForm.githubUrl.trim() || undefined,
              portfolioUrl: profileForm.portfolioUrl.trim() || undefined,
              bio: profileForm.bio.trim() || undefined
            });
          }}
          style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}
        >
          <div className="auth-field">
            <label className="auth-label" htmlFor="profile-fullname">Full Name</label>
            <div className="auth-input-wrap">
              <input
                id="profile-fullname"
                type="text"
                className="auth-input"
                value={profileForm.fullName}
                onChange={(e) => setProfileForm(p => ({ ...p, fullName: e.target.value }))}
                required
              />
            </div>
          </div>

          <div className="auth-field">
            <label className="auth-label" htmlFor="profile-role">Target Role</label>
            <div className="auth-input-wrap">
              <select
                id="profile-role"
                className="auth-input auth-select"
                value={profileForm.targetRoleId}
                onChange={(e) => setProfileForm(p => ({ ...p, targetRoleId: e.target.value }))}
              >
                <option value="">No target role</option>
                {allRoles.map(r => (
                  <option key={r.id} value={r.id}>{r.title}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="auth-field">
            <label className="auth-label" htmlFor="profile-github">GitHub URL</label>
            <div className="auth-input-wrap">
              <input
                id="profile-github"
                type="url"
                placeholder="https://github.com/yourusername"
                className="auth-input"
                value={profileForm.githubUrl}
                onChange={(e) => setProfileForm(p => ({ ...p, githubUrl: e.target.value }))}
              />
            </div>
          </div>

          <div className="auth-field">
            <label className="auth-label" htmlFor="profile-portfolio">Portfolio URL</label>
            <div className="auth-input-wrap">
              <input
                id="profile-portfolio"
                type="url"
                placeholder="https://yourportfolio.dev"
                className="auth-input"
                value={profileForm.portfolioUrl}
                onChange={(e) => setProfileForm(p => ({ ...p, portfolioUrl: e.target.value }))}
              />
            </div>
          </div>

          <div className="auth-field">
            <label className="auth-label" htmlFor="profile-bio">Bio</label>
            <div className="auth-input-wrap">
              <textarea
                id="profile-bio"
                rows={3}
                placeholder="A short summary of your background and goals"
                className="auth-input"
                value={profileForm.bio}
                onChange={(e) => setProfileForm(p => ({ ...p, bio: e.target.value }))}
                style={{ resize: 'vertical', fontFamily: 'var(--font-sans)' }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '0.25rem' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => { setShowProfileModal(false); setProfileSuccess(''); setProfileError(''); }}
            >
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={profileSaving}>
              {profileSaving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
