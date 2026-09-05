'use client';

import { PlusCircle, FolderGit2, Github, ExternalLink } from 'lucide-react';
import { useSkillBridge } from '@/lib/skillbridge-context';
import { RolePromptView, SignInPromptView, NoEvidenceView } from './prompts';

export default function ActionsView() {
  const { currentUser, activeTargetRoleId, recommendations, userProjects, setShowProjectModal } = useSkillBridge();

  if (!currentUser) {
    return (
      <SignInPromptView
        title="Sign in to see recommended projects"
        subtitle="Project recommendations are built from your verified skill gaps to help you bridge multiple high-priority skills at once."
      />
    );
  }
  if (!activeTargetRoleId) return <RolePromptView />;
  if (recommendations.length === 0) return <NoEvidenceView />;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">Recommended Projects to Build</h1>
          <p className="page-subtitle">
            Targeted projects designed to bridge multiple high-priority gaps simultaneously. Submit your GitHub repository URL for automated signal extraction.
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowProjectModal(true)}>
          <PlusCircle size={15} /> Submit GitHub Project
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {recommendations.map(rec => (
          <div key={rec.id} className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
              <div>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 600 }}>{rec.title}</h3>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginTop: '0.2rem' }}>
                  Type: {rec.type} • Est. Time: {rec.estimatedHours} hours
                </div>
              </div>
              <button className="btn btn-secondary" onClick={() => setShowProjectModal(true)} style={{ fontSize: '0.8rem', padding: '0.4rem 0.75rem' }}>
                <FolderGit2 size={13} /> Submit Solution
              </button>
            </div>

            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: '0.5rem 0' }}>
              {rec.description}
            </p>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Target Skills:</span>
              {rec.targetSkillNames?.map((skillName, idx) => (
                <span key={idx} className="badge badge-preferred" style={{ fontSize: '0.675rem' }}>
                  {skillName}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="card">
        <div className="card-header">
          <div>
            <h2 className="card-title">Verified Project Portfolio</h2>
            <p className="card-subtitle">
              GitHub repositories submitted and scanned for Dockerfiles, tests, and database migrations.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {userProjects.map(proj => (
            <div key={proj.id} style={{ background: 'var(--bg-inset-panel)', padding: '1rem', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <a href={proj.repoUrl} target="_blank" rel="noreferrer" style={{ color: '#60a5fa', fontWeight: 600, fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.4rem', textDecoration: 'none' }}>
                  <Github size={14} /> {proj.title} <ExternalLink size={12} />
                </a>
                <span style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                  ~{proj.commitCountEstimate} commits
                </span>
              </div>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', margin: '0.5rem 0' }}>
                {proj.description}
              </p>
              <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                {proj.detectedStack.map((tech, idx) => (
                  <span key={idx} style={{ background: 'var(--bg-chip)', color: '#93c5fd', fontSize: '0.7rem', padding: '0.15rem 0.45rem', borderRadius: '4px' }}>
                    {tech}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
