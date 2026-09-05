'use client';

import { X } from 'lucide-react';
import { useSkillBridge } from '@/lib/skillbridge-context';

export default function ProjectModal() {
  const { showProjectModal, setShowProjectModal, projectForm, setProjectForm, isSubmittingProject, projectSuccessMsg, handleProjectSubmit } = useSkillBridge();

  if (!showProjectModal) return null;

  return (
    <div className="modal-backdrop">
      <div className="modal-box">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 700 }}>Submit Project Repository</h2>
          <button className="btn btn-ghost" onClick={() => setShowProjectModal(false)} style={{ padding: '0.25rem' }}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleProjectSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.3rem' }}>
              Project Title
            </label>
            <input
              type="text"
              placeholder="e.g. Scalable Multi-Tenant REST API"
              value={projectForm.title}
              onChange={e => setProjectForm({ ...projectForm, title: e.target.value })}
              required
              style={{ width: '100%', padding: '0.65rem', background: 'var(--bg-input)', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'var(--text-primary)', fontSize: '0.85rem' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.3rem' }}>
              GitHub Repository URL
            </label>
            <input
              type="url"
              placeholder="https://github.com/username/repo-name"
              value={projectForm.repoUrl}
              onChange={e => setProjectForm({ ...projectForm, repoUrl: e.target.value })}
              required
              style={{ width: '100%', padding: '0.65rem', background: 'var(--bg-input)', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'var(--text-primary)', fontSize: '0.85rem' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.3rem' }}>
              Brief Technical Architecture Summary
            </label>
            <textarea
              placeholder="Implemented PostgreSQL connection pooling, Redis caching layer, Docker containerization..."
              value={projectForm.description}
              onChange={e => setProjectForm({ ...projectForm, description: e.target.value })}
              rows={3}
              style={{ width: '100%', padding: '0.65rem', background: 'var(--bg-input)', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'var(--text-primary)', fontSize: '0.85rem', resize: 'vertical' }}
            />
          </div>

          {projectSuccessMsg && (
            <div style={{ color: '#6ee7b7', fontSize: '0.85rem', background: 'rgba(16, 185, 129, 0.1)', padding: '0.75rem', borderRadius: '6px' }}>
              {projectSuccessMsg}
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
            <button type="button" className="btn btn-secondary" onClick={() => setShowProjectModal(false)}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={isSubmittingProject}>
              {isSubmittingProject ? 'Scanning Signals...' : 'Verify Repository'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}