'use client';

import { useSkillBridge } from '@/lib/skillbridge-context';
import { ShieldAlert } from 'lucide-react';
import { SectionCard, Field, Chip, Alert, EmptyState, Toolbar } from '@/components/ui/primitives';

export default function AdminView() {
  const {
    adminOverview,
    adminDashboard,
    adminUsers,
    adminUsersTotal,
    adminUsersPage,
    adminUsersTotalPages,
    adminUsersSearch,
    setAdminUsersSearch,
    loadUsers,
    adminUserMsg,
    handleChangeUserRole,
    handleDeleteUser,
    currentUser,
    role,
    editingSkillWeight,
    setEditingSkillWeight,
    handleUpdateRoleWeight,
    weightSaveSuccess,
    aliasForm,
    setAliasForm,
    handleCreateAlias,
    aliasSaveSuccess,
    skills,
    adminUsersPageSize,
    setAdminUsersPageSize,
  } = useSkillBridge();

  const dash = adminDashboard || null;
  const roleColor: Record<string, string> = { ADMIN: 'var(--warning)', RECRUITER: 'var(--info)', USER: 'var(--teal)' };

  const roleCount = (r: string) =>
    dash && Array.isArray(dash.byRole)
      ? dash.byRole.find((x: any) => x.role === r)?.count ?? 0
      : 0;

  const donutTotal = dash?.totalUsers ?? 0;
  let cursor = 0;
  const gradients: string[] = (dash?.byRole || []).map((x: any) => {
    const frac = donutTotal ? x.count / donutTotal : 0;
    const start = cursor;
    const end = cursor + frac * 360;
    cursor = end;
    return `${roleColor[x.role] || 'var(--text-muted)'} ${start}deg ${end}deg`;
  });
  const donutBg = gradients.length
    ? `conic-gradient(${gradients.join(', ')})`
    : `conic-gradient(var(--teal) 0deg 360deg)`;

  const signupData = dash?.recentSignups || [];
  const maxSignups = Math.max(1, ...signupData.map((s: any) => s.count));
  const dayLabel = (iso: string) => {
    const d = new Date(iso + 'T00:00:00');
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  };

  if (currentUser?.role !== 'ADMIN') {
    return (
      <EmptyState
        icon={ShieldAlert}
        tone="danger"
        title="Access Restricted"
        subtitle="The Admin & Ontology Console is limited to administrator accounts. Your account does not have the required role."
      />
    );
  }

  return (
    <div className="stack stack-lg">
      <div className="page-header">
        <div>
          <h1 className="page-title">Admin & Ontology Console</h1>
          <p className="page-subtitle">
            Manage canonical skill ontologies, merge synonyms, tune role skill importance weights, and inspect ingestion coverage.
          </p>
        </div>
      </div>

      {adminOverview && (
        <div className="stat-grid-3">
          <div className="stat-card"><div className="stat-label">Total Jobs Ingested</div><div className="stat-value">{adminOverview.totalJobsCount}</div></div>
          <div className="stat-card"><div className="stat-label">Canonical Skills</div><div className="stat-value">{adminOverview.canonicalSkillsCount}</div></div>
          <div className="stat-card"><div className="stat-label">Recognized Aliases</div><div className="stat-value">{adminOverview.totalAliasesCount}</div></div>
        </div>
      )}

      {(dash || !adminUsers.length) && (
        <div className="stack stack-lg">
          <h2 className="card-title mb-0">User Dashboard</h2>

          <div className="stat-grid-4">
            <div className="stat-card"><div className="stat-label">Total Users</div><div className="stat-value">{dash?.totalUsers ?? '—'}</div></div>
            <div className="stat-card"><div className="stat-label">Admins</div><div className="stat-value" style={{ color: 'var(--warning)' }}>{dash ? roleCount('ADMIN') : '—'}</div></div>
            <div className="stat-card"><div className="stat-label">Recruiters</div><div className="stat-value" style={{ color: 'var(--info)' }}>{dash ? roleCount('RECRUITER') : '—'}</div></div>
            <div className="stat-card"><div className="stat-label">Regular Users</div><div className="stat-value" style={{ color: 'var(--teal)' }}>{dash ? roleCount('USER') : '—'}</div></div>
          </div>

          <div className="grid-2">
            <div className="card">
              <h3 className="card-title mb-4">Users by role</h3>
              <div className="row" style={{ alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
                <div className="admin-donut" style={{ background: donutBg }}>
                  <div className="admin-donut-hole">
                    <div className="admin-donut-value">{dash?.totalUsers ?? 0}</div>
                    <div className="admin-donut-label">users</div>
                  </div>
                </div>
                <div className="stack stack-sm" style={{ flex: 1, minWidth: 140 }}>
                  {(dash?.byRole || []).map((x: any) => (
                    <div key={x.role} className="row" style={{ gap: '0.5rem', fontSize: '0.82rem' }}>
                      <span style={{ width: 10, height: 10, borderRadius: 3, background: roleColor[x.role] || 'var(--text-muted)', flexShrink: 0 }} />
                      <span className="text-secondary">{x.role}</span>
                      <strong style={{ color: 'var(--text-primary)', marginLeft: 'auto' }}>{x.count}</strong>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="card">
              <h3 className="card-title mb-4">New users · last 14 days</h3>
              {signupData.length === 0 ? (
                <div className="text-muted small">No signups recorded in this window.</div>
              ) : (
                <div className="row" style={{ alignItems: 'flex-end', gap: '3px', height: 130 }}>
                  {signupData.map((s: any) => (
                    <div key={s.day} className="stack stack-sm" style={{ alignItems: 'center', gap: '0.25rem', flex: 1 }}>
                      <span className="tiny text-muted">{s.count}</span>
                      <div className="admin-bar" style={{ height: `${Math.max(4, (s.count / maxSignups) * 86)}px` }} />
                      <span className="tiny text-muted">{dayLabel(s.day)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="grid-2">
            <div className="card">
              <h3 className="card-title mb-4">By provider</h3>
              {(dash?.byProvider || []).map((x: any) => {
                const pct = donutTotal ? Math.round((x.count / donutTotal) * 100) : 0;
                return (
                  <div key={x.provider} className="mb-4">
                    <div className="demand-row-label">
                      <span className="demand-skill">
                        <span style={{ textTransform: 'capitalize' }}>{x.provider}</span>
                      </span>
                      <span className="demand-pct">{x.count} · {pct}%</span>
                    </div>
                    <div className="progress-container" style={{ margin: 0 }}>
                      <div className="progress-bar progress-indigo" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="card">
              <h3 className="card-title mb-4">By status</h3>
              {(dash?.byStatus || []).map((x: any) => {
                const pct = donutTotal ? Math.round((x.count / donutTotal) * 100) : 0;
                return (
                  <div key={x.status} className="mb-4">
                    <div className="demand-row-label">
                      <span className="demand-skill">
                        <span style={{ textTransform: 'capitalize' }}>{x.status.toLowerCase()}</span>
                      </span>
                      <span className="demand-pct">{x.count} · {pct}%</span>
                    </div>
                    <div className="progress-container" style={{ margin: 0 }}>
                      <div className="progress-bar progress-amber" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <div className="grid-2">
        <SectionCard title="Add Skill Alias Mapping">
          <form onSubmit={handleCreateAlias} className="stack stack-sm">
            <Field label="Raw Job Alias / Synonym">
              <input type="text" className="input" placeholder="e.g. Postgres, PSQL, Node" value={aliasForm.rawAlias} onChange={e => setAliasForm({ ...aliasForm, rawAlias: e.target.value })} />
            </Field>
            <Field label="Maps To Canonical Skill">
              <select className="select" value={aliasForm.canonicalSkillId} onChange={e => setAliasForm({ ...aliasForm, canonicalSkillId: e.target.value })}>
                <option value="">Select canonical skill...</option>
                {skills.map(s => (
                  <option key={s.id} value={s.id}>{s.canonicalName}</option>
                ))}
              </select>
            </Field>
            <button type="submit" className="btn btn-primary">Add Synonym Mapping</button>
            {aliasSaveSuccess && <Alert tone="success">✓ Alias mapping registered.</Alert>}
          </form>
        </SectionCard>

        <SectionCard title="Role Skill Importance Tuner">
          {role && editingSkillWeight ? (
            <form onSubmit={handleUpdateRoleWeight} className="stack stack-sm">
              <Field label="Select Role Skill">
                <select
                  className="select"
                  value={editingSkillWeight.skillId}
                  onChange={e => {
                    const found = role.roleSkills.find(rs => rs.skillId === e.target.value);
                    if (found) {
                      setEditingSkillWeight({
                        skillId: found.skillId,
                        roleWeight: found.roleWeight,
                        marketDemandFrequency: found.marketDemandFrequency
                      });
                    }
                  }}
                >
                  {(role?.roleSkills || []).map(rs => (
                    <option key={rs.skillId} value={rs.skillId}>
                      {rs.skill?.canonicalName || rs.skillId}
                    </option>
                  ))}
                </select>
              </Field>

              <div>
                <div className="row-between small" style={{ marginBottom: '0.3rem' }}>
                  <span>Role Importance Weight:</span>
                  <strong>{Math.round(editingSkillWeight.roleWeight * 100)}%</strong>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={editingSkillWeight.roleWeight}
                  onChange={e => setEditingSkillWeight({ ...editingSkillWeight, roleWeight: parseFloat(e.target.value) })}
                  style={{ width: '100%' }}
                />
              </div>

              <button type="submit" className="btn btn-primary">Save Updated Weight</button>
              {weightSaveSuccess && <Alert tone="success">✓ Role weight updated and gaps recalculated.</Alert>}
            </form>
          ) : (
            <p className="small text-muted">No role selected — choose a target role to tune weights.</p>
          )}
        </SectionCard>
      </div>

      <div className="card">
        <h2 className="card-title mb-1">User Management</h2>
        <p className="text-muted small mb-4">
          List, change roles, and remove registered accounts. You cannot change your own role or delete your own account.
        </p>

        {adminUserMsg && (
          <Alert tone={adminUserMsg.ok ? 'success' : 'danger'} className="mb-4">
            {adminUserMsg.text}
          </Alert>
        )}

        <div className="toolbar toolbar-between mb-4">
          <input
            type="text"
            className="input"
            placeholder="Search by name or email…"
            style={{ maxWidth: 260 }}
            value={adminUsersSearch}
            onChange={e => {
              setAdminUsersSearch(e.target.value);
              if (!e.target.value) loadUsers({ search: '', page: 1 });
            }}
            onKeyDown={e => { if (e.key === 'Enter') loadUsers({ search: adminUsersSearch, page: 1 }); }}
          />
          <div className="row small text-secondary">
            <span>Show</span>
            <select
              className="select select-sm"
              value={adminUsersPageSize}
              onChange={e => {
                const size = Number(e.target.value);
                setAdminUsersPageSize(size);
                loadUsers({ page: 1, pageSize: size });
              }}
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
            </select>
            <span>per page</span>
          </div>
        </div>

        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Name / Email</th>
                <th>Provider</th>
                <th>Status</th>
                <th>Role</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {adminUsers.map(u => {
                const isSelf = currentUser?.id === u.id;
                return (
                  <tr key={u.id}>
                    <td>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                        {u.fullName || '—'} {isSelf && <span style={{ color: 'var(--accent-text)', fontSize: '0.72rem' }}>(you)</span>}
                      </div>
                      <div className="text-muted small">{u.email}</div>
                    </td>
                    <td><span style={{ textTransform: 'capitalize', color: 'var(--text-secondary)' }}>{u.provider || 'EMAIL'}</span></td>
                    <td><span style={{ textTransform: 'capitalize', color: 'var(--text-secondary)' }}>{u.currentStatus ? u.currentStatus.toLowerCase() : '—'}</span></td>
                    <td>
                      {isSelf ? (
                        <span className="text-secondary">{u.role}</span>
                      ) : (
                        <select
                          className="select select-sm"
                          value={u.role}
                          onChange={e => handleChangeUserRole(u.id, e.target.value)}
                        >
                          <option value="USER">USER</option>
                          <option value="RECRUITER">RECRUITER</option>
                          <option value="ADMIN">ADMIN</option>
                        </select>
                      )}
                    </td>
                    <td>
                      <button
                        disabled={isSelf}
                        onClick={() => handleDeleteUser(u.id, u.email)}
                        className="btn btn-sm"
                        style={{ background: 'var(--danger-bg)', color: 'var(--danger-text)', border: '1px solid var(--danger-border)' }}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                );
              })}
              {adminUsers.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-muted" style={{ padding: '1rem' }}>
                    {adminUsersSearch ? `No users match "${adminUsersSearch}".` : 'No users loaded.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="toolbar toolbar-between" style={{ marginTop: '0.9rem' }}>
          <span className="text-muted tiny">
            {adminUsersTotal === 0 ? '0 users' : `Page ${adminUsersPage} of ${adminUsersTotalPages} · ${adminUsersTotal} user${adminUsersTotal === 1 ? '' : 's'}`}
          </span>
          <div className="pagination">
            <button className="pagination-btn" disabled={adminUsersPage <= 1} onClick={() => loadUsers({ page: adminUsersPage - 1 })}>
              ← Prev
            </button>
            {Array.from({ length: adminUsersTotalPages }, (_, i) => i + 1).map(p => (
              <button key={p} className={`pagination-btn ${p === adminUsersPage ? 'active' : ''}`} onClick={() => loadUsers({ page: p })}>
                {p}
              </button>
            ))}
            <button className="pagination-btn" disabled={adminUsersPage >= adminUsersTotalPages} onClick={() => loadUsers({ page: adminUsersPage + 1 })}>
              Next →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}