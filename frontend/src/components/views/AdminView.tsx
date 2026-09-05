'use client';

import { useSkillBridge } from '@/lib/skillbridge-context';

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
  const roleColor: Record<string, string> = { ADMIN: '#f59e0b', RECRUITER: '#22d3ee', USER: '#14b8a6' };

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
    return `${roleColor[x.role] || '#64748b'} ${start}deg ${end}deg`;
  });
  const donutBg = gradients.length
    ? `conic-gradient(${gradients.join(', ')})`
    : `conic-gradient(#14b8a6 0deg 360deg)`;

  const signupData = dash?.recentSignups || [];
  const maxSignups = Math.max(1, ...signupData.map((s: any) => s.count));
  const dayLabel = (iso: string) => {
    const d = new Date(iso + 'T00:00:00');
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
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
          <div className="stat-card">
            <div className="stat-label">Total Jobs Ingested</div>
            <div className="stat-value">{adminOverview.totalJobsCount}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Canonical Skills</div>
            <div className="stat-value">{adminOverview.canonicalSkillsCount}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Recognized Aliases</div>
            <div className="stat-value">{adminOverview.totalAliasesCount}</div>
          </div>
        </div>
      )}

      {/* ---- User Dashboard ---- */}
      {(dash || !adminUsers.length) && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <h2 className="card-title" style={{ marginBottom: 0 }}>User Dashboard</h2>

          <div className="stat-grid-4">
            <div className="stat-card">
              <div className="stat-label">Total Users</div>
              <div className="stat-value">{dash?.totalUsers ?? '—'}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Admins</div>
              <div className="stat-value" style={{ color: '#f59e0b' }}>{dash ? roleCount('ADMIN') : '—'}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Recruiters</div>
              <div className="stat-value" style={{ color: '#22d3ee' }}>{dash ? roleCount('RECRUITER') : '—'}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Regular Users</div>
              <div className="stat-value" style={{ color: '#14b8a6' }}>{dash ? roleCount('USER') : '—'}</div>
            </div>
          </div>

          <div className="grid-2">
            <div className="card">
              <h3 className="card-title" style={{ marginBottom: '1rem' }}>Users by role</h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
                <div
                  className="admin-donut"
                  style={{ background: donutBg }}
                >
                  <div className="admin-donut-hole">
                    <div className="admin-donut-value">{dash?.totalUsers ?? 0}</div>
                    <div className="admin-donut-label">users</div>
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', minWidth: 140 }}>
                  {(dash?.byRole || []).map((x: any) => (
                    <div key={x.role} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.82rem' }}>
                      <span style={{ width: 10, height: 10, borderRadius: 3, background: roleColor[x.role] || '#64748b' }} />
                      <span style={{ color: 'var(--text-secondary)' }}>{x.role}</span>
                      <strong style={{ color: 'var(--text-primary)', marginLeft: 'auto' }}>{x.count}</strong>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="card">
              <h3 className="card-title" style={{ marginBottom: '1rem' }}>New users · last 14 days</h3>
              {signupData.length === 0 ? (
                <div style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>No signups recorded in this window.</div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: '3px', height: 130 }}>
                  {signupData.map((s: any) => (
                    <div key={s.day} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.25rem', flex: 1 }}>
                      <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>{s.count}</span>
                      <div
                        className="admin-bar"
                        style={{ height: `${Math.max(4, (s.count / maxSignups) * 86)}px` }}
                      />
                      <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>{dayLabel(s.day)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="grid-2">
            <div className="card">
              <h3 className="card-title" style={{ marginBottom: '1rem' }}>By provider</h3>
              {(dash?.byProvider || []).map((x: any) => {
                const pct = donutTotal ? Math.round((x.count / donutTotal) * 100) : 0;
                return (
                  <div key={x.provider} style={{ marginBottom: '0.85rem' }}>
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
              <h3 className="card-title" style={{ marginBottom: '1rem' }}>By status</h3>
              {(dash?.byStatus || []).map((x: any) => {
                const pct = donutTotal ? Math.round((x.count / donutTotal) * 100) : 0;
                return (
                  <div key={x.status} style={{ marginBottom: '0.85rem' }}>
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
        <div className="card">
          <h2 className="card-title" style={{ marginBottom: '1rem' }}>Add Skill Alias Mapping</h2>
          <form onSubmit={handleCreateAlias} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.3rem' }}>
                Raw Job Alias / Synonym
              </label>
              <input
                type="text"
                placeholder="e.g. Postgres, PSQL, Node"
                value={aliasForm.rawAlias}
                onChange={e => setAliasForm({ ...aliasForm, rawAlias: e.target.value })}
                style={{ width: '100%', padding: '0.65rem', background: 'var(--bg-input)', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'var(--text-primary)', fontSize: '0.85rem' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.3rem' }}>
                Maps To Canonical Skill
              </label>
              <select
                value={aliasForm.canonicalSkillId}
                onChange={e => setAliasForm({ ...aliasForm, canonicalSkillId: e.target.value })}
                style={{ width: '100%', padding: '0.65rem', background: 'var(--bg-input)', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'var(--text-primary)', fontSize: '0.85rem' }}
              >
                <option value="">Select canonical skill...</option>
                {skills.map(s => (
                  <option key={s.id} value={s.id}>{s.canonicalName}</option>
                ))}
              </select>
            </div>

            <button type="submit" className="btn btn-primary" style={{ marginTop: '0.5rem' }}>
              Add Synonym Mapping
            </button>

            {aliasSaveSuccess && (
              <div style={{ color: '#6ee7b7', fontSize: '0.8rem' }}>✓ Alias mapping registered.</div>
            )}
          </form>
        </div>

        <div className="card">
          <h2 className="card-title" style={{ marginBottom: '1rem' }}>Role Skill Importance Tuner</h2>
          {role && editingSkillWeight && (
            <form onSubmit={handleUpdateRoleWeight} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.3rem' }}>
                  Select Role Skill
                </label>
                <select
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
                  style={{ width: '100%', padding: '0.65rem', background: 'var(--bg-input)', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'var(--text-primary)', fontSize: '0.85rem' }}
                >
                  {(role?.roleSkills || []).map(rs => (
                    <option key={rs.skillId} value={rs.skillId}>
                      {rs.skill?.canonicalName || rs.skillId}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '0.3rem' }}>
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

              <button type="submit" className="btn btn-primary" style={{ marginTop: '0.5rem' }}>
                Save Updated Weight
              </button>

              {weightSaveSuccess && (
                <div style={{ color: '#6ee7b7', fontSize: '0.8rem' }}>✓ Role weight updated and gaps recalculated.</div>
              )}
            </form>
          )}
        </div>
      </div>

      <div className="card" style={{ padding: '1.25rem' }}>
        <h2 className="card-title" style={{ marginBottom: '0.25rem' }}>User Management</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', marginBottom: '1rem' }}>
          List, change roles, and remove registered accounts. You cannot change your own role or delete your own account.
        </p>

        {adminUserMsg && (
          <div style={{ marginBottom: '0.9rem', padding: '0.6rem 0.8rem', borderRadius: '6px', fontSize: '0.82rem', background: adminUserMsg.ok ? 'rgba(16,185,129,0.12)' : 'rgba(248,113,113,0.14)', color: adminUserMsg.ok ? '#6ee7b7' : '#fca5a5' }}>
            {adminUserMsg.text}
          </div>
        )}

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.9rem' }}>
          <input
            type="text"
            placeholder="Search by name or email…"
            value={adminUsersSearch}
            onChange={e => {
              setAdminUsersSearch(e.target.value);
              if (!e.target.value) loadUsers({ search: '', page: 1 });
            }}
            onKeyDown={e => { if (e.key === 'Enter') loadUsers({ search: adminUsersSearch, page: 1 }); }}
            style={{ padding: '0.5rem 0.7rem', background: 'var(--bg-input)', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'var(--text-primary)', fontSize: '0.82rem', minWidth: 220 }}
          />
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            <span>Show</span>
            <select
              value={adminUsersPageSize}
              onChange={e => {
                const size = Number(e.target.value);
                setAdminUsersPageSize(size);
                loadUsers({ page: 1, pageSize: size });
              }}
              style={{ padding: '0.35rem 0.5rem', background: 'var(--bg-input)', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'var(--text-primary)', fontSize: '0.78rem' }}
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
            </select>
            <span>per page</span>
          </div>
        </div>

        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
          <thead>
            <tr style={{ textAlign: 'left', color: 'var(--text-muted)', borderBottom: '1px solid var(--border-color)' }}>
              <th style={{ padding: '0.5rem 0.5rem 0.5rem 0' }}>Name / Email</th>
              <th style={{ padding: '0.5rem' }}>Provider</th>
              <th style={{ padding: '0.5rem' }}>Status</th>
              <th style={{ padding: '0.5rem' }}>Role</th>
              <th style={{ padding: '0.5rem' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {adminUsers.map(u => {
              const isSelf = currentUser?.id === u.id;
              return (
                <tr key={u.id} style={{ borderBottom: '1px solid var(--border-faint)' }}>
                  <td style={{ padding: '0.6rem 0.5rem 0.6rem 0' }}>
                    <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                      {u.fullName || '—'} {isSelf && <span style={{ color: '#5eead4', fontSize: '0.72rem' }}>(you)</span>}
                    </div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>{u.email}</div>
                  </td>
                  <td style={{ padding: '0.6rem 0.5rem' }}>
                    <span style={{ textTransform: 'capitalize', color: 'var(--text-secondary)' }}>{u.provider || 'EMAIL'}</span>
                  </td>
                  <td style={{ padding: '0.6rem 0.5rem' }}>
                    <span style={{ textTransform: 'capitalize', color: 'var(--text-secondary)' }}>{u.currentStatus ? u.currentStatus.toLowerCase() : '—'}</span>
                  </td>
                  <td style={{ padding: '0.6rem 0.5rem' }}>
                    {isSelf ? (
                      <span style={{ color: 'var(--text-secondary)' }}>{u.role}</span>
                    ) : (
                      <select
                        value={u.role}
                        onChange={e => handleChangeUserRole(u.id, e.target.value)}
                        style={{ padding: '0.35rem 0.5rem', background: 'var(--bg-input)', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'var(--text-primary)', fontSize: '0.78rem' }}
                      >
                        <option value="USER">USER</option>
                        <option value="RECRUITER">RECRUITER</option>
                        <option value="ADMIN">ADMIN</option>
                      </select>
                    )}
                  </td>
                  <td style={{ padding: '0.6rem 0.5rem' }}>
                    <button
                      disabled={isSelf}
                      onClick={() => handleDeleteUser(u.id, u.email)}
                      className="btn"
                      style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem', background: 'rgba(248,113,113,0.12)', color: '#fca5a5', border: '1px solid rgba(248,113,113,0.35)' }}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              );
            })}
            {adminUsers.length === 0 && (
              <tr>
                <td colSpan={5} style={{ padding: '1rem', color: 'var(--text-muted)' }}>
                  {adminUsersSearch ? `No users match "${adminUsersSearch}".` : 'No users loaded.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {/* Pagination */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center', justifyContent: 'space-between', marginTop: '0.9rem' }}>
          <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>
            {adminUsersTotal === 0 ? '0 users' : `Page ${adminUsersPage} of ${adminUsersTotalPages} · ${adminUsersTotal} user${adminUsersTotal === 1 ? '' : 's'}`}
          </span>
          <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <button
              className="btn"
              disabled={adminUsersPage <= 1}
              onClick={() => loadUsers({ page: adminUsersPage - 1 })}
              style={{ padding: '0.4rem 0.8rem', fontSize: '0.78rem' }}
            >
              ← Prev
            </button>
            {Array.from({ length: adminUsersTotalPages }, (_, i) => i + 1).map(p => (
              <button
                key={p}
                className="btn"
                disabled={p === adminUsersPage}
                onClick={() => loadUsers({ page: p })}
                style={{ padding: '0.4rem 0.68rem', fontSize: '0.78rem', opacity: p === adminUsersPage ? 0.6 : 1 }}
              >
                {p}
              </button>
            ))}
            <button
              className="btn"
              disabled={adminUsersPage >= adminUsersTotalPages}
              onClick={() => loadUsers({ page: adminUsersPage + 1 })}
              style={{ padding: '0.4rem 0.8rem', fontSize: '0.78rem' }}
            >
              Next →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
