'use client';

import { useState, type FormEvent } from 'react';
import { X } from 'lucide-react';
import { useSkillBridge } from '@/lib/skillbridge-context';

export default function ProjectModal() {
  const { showProjectModal, setShowProjectModal, projectForm, setProjectForm, isSubmittingProject, projectSuccessMsg, handleProjectSubmit, skills } = useSkillBridge();
  const [skillError, setSkillError] = useState('');

  if (!showProjectModal) return null;

  const onSubmit = (e: FormEvent) => {
    if (projectForm.primarySkills.length === 0) {
      e.preventDefault();
      setSkillError('Select at least one skill this project demonstrates.');
      return;
    }
    setSkillError('');
    handleProjectSubmit(e);
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-box">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 700 }}>Submit project</h2>
          <button className="btn btn-ghost" onClick={() => setShowProjectModal(false)} style={{ padding: '0.25rem' }} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.3rem' }}>
              Project title
            </label>
            <input
              type="text"
              placeholder="e.g. Scalable Multi-Tenant REST API"
              value={projectForm.title}
              onChange={e => setProjectForm({ ...projectForm, title: e.target.value })}
              required
              minLength={1}
              style={{ width: '100%', padding: '0.65rem', background: 'var(--bg-input)', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'var(--text-primary)', fontSize: '0.85rem' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.3rem' }}>
              GitHub repository URL
            </label>
            <input
              type="url"
              placeholder="https://github.com/username/repo-name"
              value={projectForm.repoUrl}
              onChange={e => setProjectForm({ ...projectForm, repoUrl: e.target.value })}
              required
              pattern="https?://.+"
              title="Please enter a valid GitHub repository URL (https://...)"
              style={{ width: '100%', padding: '0.65rem', background: 'var(--bg-input)', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'var(--text-primary)', fontSize: '0.85rem' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.3rem' }}>
              Short description
            </label>
            <textarea
              placeholder="Implemented PostgreSQL connection pooling, Redis caching layer, Docker containerization..."
              value={projectForm.description}
              onChange={e => setProjectForm({ ...projectForm, description: e.target.value })}
              rows={3}
              required
              minLength={1}
              style={{ width: '100%', padding: '0.65rem', background: 'var(--bg-input)', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'var(--text-primary)', fontSize: '0.85rem', resize: 'vertical' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.3rem' }}>
              Skills demonstrated
            </label>
            <select
              multiple
              required
              value={projectForm.primarySkills}
              onChange={e => {
                const selected = Array.from(e.target.selectedOptions, option => option.value);
                setProjectForm({ ...projectForm, primarySkills: selected });
                if (selected.length > 0) setSkillError('');
              }}
              size={Math.min(6, Math.max(3, skills.length))}
              style={{ width: '100%', padding: '0.65rem', background: 'var(--bg-input)', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'var(--text-primary)', fontSize: '0.85rem' }}
            >
              {skills.map(skill => (
                <option key={skill.id} value={skill.canonicalName}>{skill.canonicalName}</option>
              ))}
            </select>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.3rem' }}>
              Hold Ctrl/Cmd to select more than one. Only selected skills can become project evidence.
            </div>
            {skillError && (
              <div style={{ color: 'var(--danger-text, #f87171)', fontSize: '0.75rem', marginTop: '0.35rem' }}>
                {skillError}
              </div>
            )}
          </div>

          {projectSuccessMsg && (
            <div style={{ color: 'var(--success-text)', fontSize: '0.85rem', background: 'var(--success-bg)', padding: '0.75rem', borderRadius: '6px' }}>
              {projectSuccessMsg}
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
            <button type="button" className="btn btn-secondary" onClick={() => setShowProjectModal(false)}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={isSubmittingProject}>
              {isSubmittingProject ? 'Scanning…' : 'Submit for verification'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}