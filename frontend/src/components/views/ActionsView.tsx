'use client';

import { PlusCircle, FolderGit2, Github, ExternalLink, AlertTriangle } from 'lucide-react';
import { useSkillBridge } from '@/lib/skillbridge-context';
import { safeExternalUrl } from '@/lib/safe-url';
import { RolePromptView, SignInPromptView, NoEvidenceView } from './prompts';
import { EmptyState, Chip } from '@/components/ui/primitives';

export default function ActionsView() {
  const { currentUser, activeTargetRoleId, recommendations, userProjects, setShowProjectModal, personalDataError } = useSkillBridge();

  if (!currentUser) {
    return (
      <SignInPromptView
        title="Sign in to see recommended projects"
        subtitle="Project recommendations are built from your verified skill gaps to help you bridge multiple high-priority skills at once."
      />
    );
  }
  if (!activeTargetRoleId) return <RolePromptView />;
  if (personalDataError) {
    return (
      <EmptyState
        icon={AlertTriangle}
        tone="danger"
        title="Could not load your recommendations"
        subtitle="We hit an error while fetching your project recommendations. Please try again."
      />
    );
  }
  if (recommendations.length === 0) return <NoEvidenceView />;

  return (
    <div className="stack stack-lg">
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

      <div className="stack stack-sm">
        {recommendations.map(rec => (
          <div key={rec.id} className="card">
            <div className="row-between" style={{ alignItems: 'flex-start', marginBottom: '0.5rem' }}>
              <div>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 600 }}>{rec.title}</h3>
                <div className="small text-muted mono" style={{ marginTop: '0.2rem' }}>
                  Type: {rec.type} • Est. Time: {rec.estimatedHours} hours
                </div>
              </div>
              <button className="btn btn-secondary" onClick={() => setShowProjectModal(true)} style={{ fontSize: '0.8rem', padding: '0.4rem 0.75rem' }}>
                <FolderGit2 size={13} /> Submit Solution
              </button>
            </div>

            <p className="text-secondary" style={{ fontSize: '0.85rem', margin: '0.5rem 0' }}>
              {rec.description}
            </p>

            <div className="row" style={{ gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
              <span className="small text-muted">Target Skills:</span>
              {rec.targetSkillNames?.map((skillName, idx) => (
                <Chip key={idx} tone="accent">{skillName}</Chip>
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

        <div className="stack stack-sm">
          {userProjects.map(proj => (
            <div key={proj.id} className="list-item">
              <div className="row-between">
                <a href={safeExternalUrl(proj.repoUrl)} target="_blank" rel="noreferrer" style={{ color: 'var(--info)', fontWeight: 600, fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.4rem', textDecoration: 'none' }}>
                  <Github size={14} /> {proj.title} <ExternalLink size={12} />
                </a>
                <span className="small mono text-muted">~{proj.commitCountEstimate} commits</span>
              </div>
              <p className="text-secondary small" style={{ margin: '0.5rem 0' }}>
                {proj.description}
              </p>
              <div className="row" style={{ gap: '0.4rem', flexWrap: 'wrap' }}>
                {proj.detectedStack.map((tech, idx) => (
                  <span key={idx} className="badge badge-chip" style={{ fontSize: '0.7rem' }}>
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