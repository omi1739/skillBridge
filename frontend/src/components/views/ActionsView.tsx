'use client';

import Link from 'next/link';
import { PlusCircle, FolderGit2, Github, ExternalLink, AlertTriangle, Activity, Lightbulb, BookOpen } from 'lucide-react';
import { ProjectHealthReport, ProjectHealthIssueSeverity, ProjectHealthStatus } from '@skillbridge/types';
import { useSkillBridge } from '@/lib/skillbridge-context';
import { safeExternalUrl } from '@/lib/safe-url';
import { RolePromptView, SignInPromptView, NoEvidenceView } from './prompts';
import { EmptyState, Chip } from '@/components/ui/primitives';

type HealthTone = 'healthy' | 'fair' | 'at-risk' | 'unhealthy';

function healthTone(status: ProjectHealthStatus): HealthTone {
  if (status === 'HEALTHY') return 'healthy';
  if (status === 'FAIR') return 'fair';
  if (status === 'AT_RISK') return 'at-risk';
  return 'unhealthy';
}

function statusChipTone(status: ProjectHealthStatus): 'success' | 'info' | 'warning' | 'danger' {
  if (status === 'HEALTHY') return 'success';
  if (status === 'FAIR') return 'info';
  if (status === 'AT_RISK') return 'warning';
  return 'danger';
}

function statusLabel(status: ProjectHealthStatus): string {
  if (status === 'HEALTHY') return 'Healthy';
  if (status === 'FAIR') return 'Fair';
  if (status === 'AT_RISK') return 'At risk';
  return 'Unhealthy';
}

function severityTone(severity: ProjectHealthIssueSeverity): 'crit' | 'warn' | 'info' {
  if (severity === 'CRIT') return 'crit';
  if (severity === 'WARN') return 'warn';
  return 'info';
}

function factorBarTone(score: number): string {
  if (score >= 0.75) return 'progress-emerald';
  if (score >= 0.4) return 'progress-amber';
  return 'progress-rose';
}

function ProjectHealthPanel({ report }: { report: ProjectHealthReport }) {
  const tone = healthTone(report.status);
  return (
    <div className="health-panel">
      <div className="health-panel-head">
        <div className={`health-score health-score-${tone}`}>
          <span className="health-score-num">{report.overallScore}</span>
          <span className="health-score-grade">Grade {report.grade}</span>
        </div>
        <div className="health-panel-summary">
          <div className="row" style={{ gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <Chip tone={statusChipTone(report.status)}>{statusLabel(report.status)}</Chip>
            <span className="tiny text-muted">
              {report.source === 'ai' ? 'AI-assisted review' : 'Automated review'}
            </span>
          </div>
          <p className="small text-secondary" style={{ marginTop: '0.35rem' }}>
            {report.detectedStack.length > 0
              ? `Tech detected: ${report.detectedStack.join(', ')}${report.primaryLanguage ? ` (primary: ${report.primaryLanguage})` : ''}.`
              : 'No tech stack could be detected from the repository.'}
          </p>
        </div>
      </div>

      <div className="health-factors">
        {report.factors.map(factor => (
          <div className="health-factor" key={factor.key}>
            <div className="health-factor-head">
              <span className="small">{factor.label}</span>
              <span className="small mono text-muted">{Math.round(factor.score * 100)}%</span>
            </div>
            <div className="progress-container">
              <div className={`progress-bar ${factorBarTone(factor.score)}`} style={{ width: `${Math.round(factor.score * 100)}%` }} />
            </div>
            <p className="tiny text-muted" style={{ marginTop: '0.25rem' }}>{factor.detail}</p>
          </div>
        ))}
      </div>

      {report.issues.length > 0 && (
        <div className="health-block">
          <div className="health-block-title">
            <AlertTriangle size={14} /> Issues found ({report.issues.length})
          </div>
          <div className="stack stack-sm">
            {report.issues.map((issue, idx) => {
              const sev = severityTone(issue.severity);
              return (
                <div key={idx} className={`health-issue health-issue-${sev}`}>
                  <span className={`health-issue-dot health-issue-dot-${sev}`} />
                  <div>
                    <div className="health-issue-title">{issue.title}</div>
                    <p className="tiny text-muted" style={{ marginTop: '0.15rem' }}>{issue.detail}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {report.suggestions.length > 0 && (
        <div className="health-block">
          <div className="health-block-title">
            <Lightbulb size={14} /> What to improve
          </div>
          <div className="stack stack-sm">
            {report.suggestions.map((sug, idx) => (
              <div key={idx} className="health-suggestion">
                <div className="row" style={{ gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                  <span className="health-suggestion-title">{sug.title}</span>
                  {sug.category && <span className="badge badge-chip" style={{ fontSize: '0.65rem' }}>{sug.category}</span>}
                </div>
                <p className="small text-secondary" style={{ marginTop: '0.2rem' }}>{sug.detail}</p>
                {sug.learnTopicSlug && (
                  <Link href={`/learn?topic=${sug.learnTopicSlug}`} className="health-suggestion-link small">
                    <BookOpen size={12} /> Learn {sug.learnTopicSlug}
                  </Link>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <p className="tiny text-muted" style={{ marginTop: '0.85rem' }}>
        Analyzed {new Date(report.generatedAt).toLocaleString()}{report.model ? ` · ${report.model}` : ''}
      </p>
    </div>
  );
}

export default function ActionsView() {
  const {
    currentUser,
    activeTargetRoleId,
    recommendations,
    userProjects,
    setShowProjectModal,
    personalDataError,
    projectHealth,
    projectHealthError,
    checkingProjectHealthId,
    checkProjectHealth
  } = useSkillBridge();

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
          <h1 className="page-title">Recommended projects</h1>
          <p className="page-subtitle">
            Projects that cover several of your highest-priority gaps at once. Submit a GitHub repo and we scan it for tests, Dockerfiles, and migrations.
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
            <h2 className="card-title">Submitted projects</h2>
            <p className="card-subtitle">
              Repositories you have submitted and what we detected in them.
            </p>
          </div>
        </div>

        <div className="stack stack-sm">
          {userProjects.length === 0 && (
            <p className="small text-muted">You haven&apos;t submitted any projects yet. Submit one above to unlock health checks.</p>
          )}
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

              <div className="row" style={{ gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.7rem' }}>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => checkProjectHealth(proj.id)}
                  disabled={checkingProjectHealthId === proj.id}
                >
                  <Activity size={13} />
                  {checkingProjectHealthId === proj.id
                    ? 'Analyzing…'
                    : projectHealth[proj.id]
                      ? 'Re-check health'
                      : 'Check health'}
                </button>
              </div>

              {projectHealthError[proj.id] && (
                <p className="small" style={{ color: 'var(--danger-text)', marginTop: '0.6rem' }}>
                  {projectHealthError[proj.id]}
                </p>
              )}

              {projectHealth[proj.id] && <ProjectHealthPanel report={projectHealth[proj.id]} />}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}