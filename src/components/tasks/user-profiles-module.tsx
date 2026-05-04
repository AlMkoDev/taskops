'use client';

import { Download, Upload, UserRoundCheck } from 'lucide-react';
import { useMemo, useState } from 'react';
import { AuthSessionView, AuthUser, EmploymentType, ProfileAuditEntry, User, UserRole } from '../../types/domain';

type UserProfilesModuleProps = {
  users: User[];
  sessionUser: AuthUser | null;
  selectedUserId: string | null;
  onSelectUser: (userId: string | null) => void;
  onAddUsers: (users: User[]) => void;
  onUpdateUser: (userId: string, updates: Partial<User>) => void;
};

const permissionOptions = [
  'tasks:create',
  'tasks:manage',
  'projects:manage',
  'reports:author',
  'reports:review',
  'profiles:manage',
  'analytics:view',
  'settings:manage'
];

const defaultTimezones = ['Africa/Johannesburg', 'UTC', 'Europe/London', 'America/New_York', 'Asia/Dubai'];
const validRoles: UserRole[] = ['admin', 'manager', 'member', 'guest'];
const validEmploymentTypes: EmploymentType[] = ['full_time', 'part_time', 'contract', 'seasonal', 'casual'];
const validStatuses = ['active', 'inactive'];
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function splitList(value: string) {
  return value.split(',').map((item) => item.trim()).filter(Boolean);
}

function joinList(value: string[] | undefined) {
  return (value ?? []).join(', ');
}

function workspaceRoleToAuthRole(role: UserRole): AuthUser['role'] {
  if (role === 'admin') return 'admin';
  if (role === 'manager') return 'manager';
  return 'author';
}

function buildAudit(action: string, actorName: string, details: string): ProfileAuditEntry {
  return {
    id: `profile_audit_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    action,
    actorName,
    details,
    createdAt: new Date().toISOString()
  };
}

function parseCsvLine(line: string) {
  const cells: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const next = line[index + 1];
    if (char === '"' && inQuotes && next === '"') {
      current += '"';
      index += 1;
    } else if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      cells.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  cells.push(current.trim());
  return cells;
}

function csvEscape(value: unknown) {
  const text = String(value ?? '');
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function profileDuplicateKey(name: string | undefined, team: string | undefined) {
  const normalizedName = name?.trim().toLowerCase();
  const normalizedTeam = team?.trim().toLowerCase();
  return normalizedName && normalizedTeam ? `${normalizedName}|${normalizedTeam}` : '';
}

function downloadCsv(users: User[]) {
  const headers = [
    'name',
    'email',
    'phone',
    'role',
    'status',
    'team',
    'department',
    'location',
    'position',
    'manager',
    'skills',
    'certifications',
    'employmentType',
    'startDate',
    'timezone',
    'capacityHoursPerWeek',
    'loginAccess'
  ];
  const rows = users.map((user) => [
    user.name,
    user.email,
    user.phone,
    user.role,
    user.status ?? 'active',
    user.team,
    user.department,
    user.location,
    user.position,
    user.managerId,
    joinList(user.skills),
    joinList(user.certifications),
    user.employmentType,
    user.startDate,
    user.timezone,
    user.capacityHoursPerWeek,
    user.loginAccess?.enabled ? 'enabled' : 'disabled'
  ]);
  const csv = [headers, ...rows].map((row) => row.map(csvEscape).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'taskops-user-profiles.csv';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function parseProfileCsv(text: string, existingUsers: User[], actorName: string) {
  const lines = text.replace(/^\uFEFF/, '').split(/\r?\n/).filter((line) => line.trim());
  if (lines.length < 2) return { users: [] as User[], errors: ['CSV requires a header row and at least one profile row.'] };
  const headers = parseCsvLine(lines[0]).map((header) => header.trim());
  const rows = lines.slice(1).map(parseCsvLine);
  const get = (cells: string[], name: string) => {
    const index = headers.findIndex((header) => header.trim().toLowerCase() === name.toLowerCase());
    return index >= 0 ? (cells[index] ?? '').trim() : '';
  };

  const existingEmails = new Set(existingUsers.map((user) => user.email?.toLowerCase()).filter(Boolean));
  const existingProfileKeys = new Set(existingUsers.map((user) => profileDuplicateKey(user.name, user.team)).filter(Boolean));
  const batchEmails = new Set<string>();
  const batchProfileKeys = new Set<string>();
  const errors: string[] = [];
  const users = rows.map((cells, index) => {
    const name = get(cells, 'name');
    const email = get(cells, 'email').toLowerCase();
    const team = get(cells, 'team') || 'Unassigned';
    const profileKey = profileDuplicateKey(name, team);
    const role = get(cells, 'role') as UserRole;
    const status = get(cells, 'status').toLowerCase();
    const employmentType = get(cells, 'employmentType') as EmploymentType;
    const capacityHoursPerWeek = get(cells, 'capacityHoursPerWeek');
    const startDate = get(cells, 'startDate');

    if (!name) errors.push(`Row ${index + 2}: name is required.`);
    if (email && !emailPattern.test(email)) errors.push(`Row ${index + 2}: email format is invalid.`);
    if (email && existingEmails.has(email)) errors.push(`Row ${index + 2}: email already exists.`);
    if (email && batchEmails.has(email)) errors.push(`Row ${index + 2}: duplicate email in import.`);
    if (email) batchEmails.add(email);
    if (profileKey && existingProfileKeys.has(profileKey)) errors.push(`Row ${index + 2}: name and team already exist.`);
    if (profileKey && batchProfileKeys.has(profileKey)) errors.push(`Row ${index + 2}: duplicate name and team in import.`);
    if (profileKey) batchProfileKeys.add(profileKey);
    if (role && !validRoles.includes(role)) errors.push(`Row ${index + 2}: role must be admin, manager, member, or guest.`);
    if (status && !validStatuses.includes(status)) errors.push(`Row ${index + 2}: status must be active or inactive.`);
    if (employmentType && !validEmploymentTypes.includes(employmentType)) errors.push(`Row ${index + 2}: employmentType is invalid.`);
    if (capacityHoursPerWeek && (!Number.isFinite(Number(capacityHoursPerWeek)) || Number(capacityHoursPerWeek) <= 0)) errors.push(`Row ${index + 2}: capacityHoursPerWeek must be a positive number.`);
    if (startDate && Number.isNaN(new Date(startDate).getTime())) errors.push(`Row ${index + 2}: startDate must be a valid date.`);

    const imported: User = {
      id: `user_profile_${Date.now()}_${index}`,
      name: name || `Imported Profile ${index + 1}`,
      email: email || undefined,
      phone: get(cells, 'phone') || undefined,
      role: validRoles.includes(role) ? role : 'member',
      status: status === 'inactive' ? 'inactive' : 'active',
      team,
      department: get(cells, 'department') || undefined,
      location: get(cells, 'location') || undefined,
      position: get(cells, 'position') || undefined,
      managerId: get(cells, 'manager') || undefined,
      skills: splitList(get(cells, 'skills')),
      certifications: splitList(get(cells, 'certifications')),
      employmentType: validEmploymentTypes.includes(employmentType) ? employmentType : undefined,
      startDate: startDate || undefined,
      timezone: get(cells, 'timezone') || undefined,
      capacityHoursPerWeek: Number(capacityHoursPerWeek) || undefined,
      loginAccess: get(cells, 'loginAccess').toLowerCase() === 'enabled'
        ? { enabled: true, role: 'author', status: 'active' }
        : undefined,
      auditTrail: [buildAudit('profile_imported', actorName, 'Imported through the User Profiles CSV flow.')]
    };
    return imported;
  });

  return { users, errors };
}

export function UserProfilesModule({ users, sessionUser, selectedUserId, onSelectUser, onAddUsers, onUpdateUser }: UserProfilesModuleProps) {
  const [query, setQuery] = useState('');
  const [message, setMessage] = useState('');
  const [sessions, setSessions] = useState<AuthSessionView[]>([]);
  const [securityActivity, setSecurityActivity] = useState<string[]>([]);
  const [passwordDraft, setPasswordDraft] = useState('');
  const selectedUser = users.find((user) => user.id === selectedUserId) ?? users[0] ?? null;
  const canManageProfiles = sessionUser?.role === 'admin' || sessionUser?.role === 'manager';
  const selfProfile = sessionUser
    ? users.find((user) => user.loginAccess?.authUserId === sessionUser.id || user.email?.toLowerCase() === sessionUser.email.toLowerCase())
    : null;

  const filteredUsers = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return users;
    return users.filter((user) => [
      user.name,
      user.email,
      user.phone,
      user.team,
      user.department,
      user.location,
      user.position,
      user.status
    ].some((value) => value?.toLowerCase().includes(normalized)));
  }, [query, users]);

  const duplicateEmails = useMemo(() => {
    const counts = users.reduce<Record<string, number>>((acc, user) => {
      const email = user.email?.trim().toLowerCase();
      if (email) acc[email] = (acc[email] ?? 0) + 1;
      return acc;
    }, {});
    return new Set(Object.entries(counts).filter(([, count]) => count > 1).map(([email]) => email));
  }, [users]);
  const duplicateProfiles = useMemo(() => {
    const counts = users.reduce<Record<string, number>>((acc, user) => {
      const key = profileDuplicateKey(user.name, user.team);
      if (key) acc[key] = (acc[key] ?? 0) + 1;
      return acc;
    }, {});
    return new Set(Object.entries(counts).filter(([, count]) => count > 1).map(([key]) => key));
  }, [users]);

  function updateSelected(updates: Partial<User>, action: string, details: string) {
    if (!selectedUser) return;
    const audit = buildAudit(action, sessionUser?.name ?? 'Workspace user', details);
    onUpdateUser(selectedUser.id, {
      ...updates,
      auditTrail: [audit, ...(selectedUser.auditTrail ?? [])]
    });
    setMessage(details);
  }

  async function saveLoginAccess() {
    if (!selectedUser) return;
    if (!canManageProfiles) {
      setMessage('Sign in as a manager or admin to manage login access.');
      return;
    }
    if (!selectedUser.email) {
      setMessage('Email is required before enabling login access.');
      return;
    }
    if (!selectedUser.loginAccess?.authUserId && !passwordDraft.trim()) {
      setMessage('Temporary password is required for a new login account.');
      return;
    }

    const response = await fetch('/api/auth/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: selectedUser.loginAccess?.authUserId,
        name: selectedUser.name,
        email: selectedUser.email,
        role: selectedUser.loginAccess?.role ?? workspaceRoleToAuthRole(selectedUser.role),
        team: selectedUser.team,
        status: selectedUser.loginAccess?.status ?? 'active',
        password: passwordDraft.trim() || undefined
      })
    });
    const payload = await response.json() as { data?: AuthUser; error?: string; meta?: { inviteQueued?: boolean; passwordResetLogged?: boolean } };
    if (!response.ok || !payload.data) {
      setMessage(payload.error ?? 'Failed to save login access.');
      return;
    }

    setPasswordDraft('');
    updateSelected({
      email: payload.data.email,
      loginAccess: {
        enabled: true,
        authUserId: payload.data.id,
        role: payload.data.role,
        status: payload.data.status,
        mustChangePassword: payload.data.mustChangePassword,
        lastSyncedAt: new Date().toISOString()
      }
    }, payload.meta?.inviteQueued ? 'invite_queued' : payload.meta?.passwordResetLogged ? 'password_reset' : 'login_access_saved', `Login access saved for ${payload.data.email}.`);
  }

  async function loadSecurity() {
    const [sessionResponse, activityResponse] = await Promise.all([
      fetch('/api/auth/sessions', { cache: 'no-store' }),
      fetch('/api/auth/activity', { cache: 'no-store' })
    ]);
    if (sessionResponse.ok) {
      const payload = await sessionResponse.json() as { data?: AuthSessionView[] };
      setSessions(payload.data ?? []);
    }
    if (activityResponse.ok) {
      const payload = await activityResponse.json() as { data?: { auditEntries?: Array<{ details: string; createdAt: string }> } };
      setSecurityActivity((payload.data?.auditEntries ?? []).slice(0, 8).map((entry) => `${entry.createdAt}: ${entry.details}`));
    }
  }

  async function revokeSession(sessionId: string) {
    const response = await fetch('/api/auth/sessions', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId })
    });
    setMessage(response.ok ? 'Session revoked.' : 'Failed to revoke session.');
    await loadSecurity();
  }

  async function handleImport(file: File | null) {
    if (!file) return;
    const text = await file.text();
    const parsed = parseProfileCsv(text, users, sessionUser?.name ?? 'Workspace user');
    if (parsed.errors.length > 0) {
      setMessage(parsed.errors.slice(0, 4).join(' '));
      return;
    }
    onAddUsers(parsed.users);
    setMessage(`${parsed.users.length} profile${parsed.users.length === 1 ? '' : 's'} imported.`);
  }

  if (!selectedUser) {
    return (
      <section className="settings-card">
        <h3>User Profiles</h3>
        <p className="settings-copy">Create or import team profiles to begin.</p>
      </section>
    );
  }

  return (
    <section className="team-module-shell">
      <div className="team-overview-card settings-card">
        <div className="team-card-top">
          <div>
            <h3>User Profiles</h3>
            <p className="settings-copy">Unified profile administration, optional login access, permissions, and audit history.</p>
          </div>
          <div className="settings-actions">
            <button className="ghost-button" onClick={() => downloadCsv(users)}><Download size={14} />Export CSV</button>
            <label className="ghost-button">
              <Upload size={14} />Import CSV
              <input className="hidden" type="file" accept=".csv,text/csv" onChange={(event) => void handleImport(event.target.files?.[0] ?? null)} />
            </label>
          </div>
        </div>
        <div className="team-kpi-row">
          <div className="metric-box project-card"><strong>{users.length}</strong><span>Total profiles</span></div>
          <div className="metric-box project-card"><strong>{users.filter((user) => (user.status ?? 'active') === 'active').length}</strong><span>Active</span></div>
          <div className="metric-box project-card"><strong>{users.filter((user) => user.loginAccess?.enabled).length}</strong><span>Login enabled</span></div>
          <div className="metric-box project-card"><strong>{duplicateEmails.size + duplicateProfiles.size}</strong><span>Duplicate records</span></div>
        </div>
      </div>

      <div className="team-management-grid">
        <section className="settings-card">
          <div className="team-section-head">
            <div><h3>Directory</h3><p className="settings-copy">{filteredUsers.length} visible profiles</p></div>
          </div>
          <label className="settings-field settings-field-full">
            <span>Search</span>
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search name, email, team, site..." />
          </label>
          <div className="settings-list">
            {filteredUsers.map((user) => (
              <button key={user.id} className="settings-list-row" onClick={() => onSelectUser(user.id)}>
                <div>
                  <strong>{user.name}</strong>
                  <small>{user.email ?? 'No email'} · {user.team} · {user.status ?? 'active'}</small>
                </div>
                <span className={`status-badge ${user.loginAccess?.enabled ? 'status-green' : 'status-slate'}`}>{user.loginAccess?.enabled ? 'Login' : 'Profile'}</span>
              </button>
            ))}
          </div>
        </section>

        <section className="settings-card">
          <div className="team-section-head">
            <div><h3>Profile Details</h3><p className="settings-copy">{selectedUser.name}</p></div>
            <span className={`status-badge ${(selectedUser.status ?? 'active') === 'active' ? 'status-green' : 'status-slate'}`}>{selectedUser.status ?? 'active'}</span>
          </div>
          <div className="settings-form-grid">
            <label className="settings-field"><span>Name</span><input value={selectedUser.name} onChange={(event) => updateSelected({ name: event.target.value }, 'profile_updated', 'Updated profile name.')} /></label>
            <label className="settings-field"><span>Email</span><input value={selectedUser.email ?? ''} onChange={(event) => updateSelected({ email: event.target.value || undefined }, 'profile_updated', 'Updated email.')} /></label>
            <label className="settings-field"><span>Phone</span><input value={selectedUser.phone ?? ''} onChange={(event) => updateSelected({ phone: event.target.value || undefined }, 'profile_updated', 'Updated phone.')} /></label>
            <label className="settings-field"><span>Avatar URL</span><input value={selectedUser.avatarUrl ?? ''} onChange={(event) => updateSelected({ avatarUrl: event.target.value || undefined }, 'profile_updated', 'Updated avatar.')} /></label>
            <label className="settings-field"><span>Team</span><input value={selectedUser.team} onChange={(event) => updateSelected({ team: event.target.value }, 'profile_updated', 'Updated team.')} /></label>
            <label className="settings-field"><span>Department</span><input value={selectedUser.department ?? ''} onChange={(event) => updateSelected({ department: event.target.value || undefined }, 'profile_updated', 'Updated department.')} /></label>
            <label className="settings-field"><span>Location / Site</span><input value={selectedUser.location ?? ''} onChange={(event) => updateSelected({ location: event.target.value || undefined }, 'profile_updated', 'Updated location/site.')} /></label>
            <label className="settings-field"><span>Position</span><input value={selectedUser.position ?? ''} onChange={(event) => updateSelected({ position: event.target.value || undefined }, 'profile_updated', 'Updated position.')} /></label>
            <label className="settings-field"><span>Manager</span><select value={selectedUser.managerId ?? ''} onChange={(event) => updateSelected({ managerId: event.target.value || undefined }, 'profile_updated', 'Updated manager.')}><option value="">No manager</option>{users.filter((user) => user.id !== selectedUser.id).map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}</select></label>
            <label className="settings-field"><span>Employment Type</span><select value={selectedUser.employmentType ?? ''} onChange={(event) => updateSelected({ employmentType: (event.target.value || undefined) as EmploymentType | undefined }, 'profile_updated', 'Updated employment type.')}><option value="">Not set</option><option value="full_time">Full time</option><option value="part_time">Part time</option><option value="contract">Contract</option><option value="seasonal">Seasonal</option><option value="casual">Casual</option></select></label>
            <label className="settings-field"><span>Start Date</span><input type="date" value={selectedUser.startDate ?? ''} onChange={(event) => updateSelected({ startDate: event.target.value || undefined }, 'profile_updated', 'Updated start date.')} /></label>
            <label className="settings-field"><span>Timezone</span><input list="profile-timezones" value={selectedUser.timezone ?? ''} onChange={(event) => updateSelected({ timezone: event.target.value || undefined }, 'profile_updated', 'Updated timezone.')} /></label>
            <label className="settings-field settings-field-full"><span>Skills</span><input value={joinList(selectedUser.skills)} onChange={(event) => updateSelected({ skills: splitList(event.target.value) }, 'profile_updated', 'Updated skills.')} placeholder="Forklift, QA, scheduling" /></label>
            <label className="settings-field settings-field-full"><span>Certifications</span><input value={joinList(selectedUser.certifications)} onChange={(event) => updateSelected({ certifications: splitList(event.target.value) }, 'profile_updated', 'Updated certifications.')} placeholder="OSHA, HACCP, first aid" /></label>
          </div>
          <datalist id="profile-timezones">{defaultTimezones.map((zone) => <option key={zone} value={zone} />)}</datalist>
          <div className="settings-actions">
            <button className="ghost-button" onClick={() => updateSelected({ status: (selectedUser.status ?? 'active') === 'active' ? 'inactive' : 'active' }, (selectedUser.status ?? 'active') === 'active' ? 'profile_deactivated' : 'profile_reactivated', `${selectedUser.name} ${(selectedUser.status ?? 'active') === 'active' ? 'deactivated' : 'reactivated'}.`)}>
              {(selectedUser.status ?? 'active') === 'active' ? 'Deactivate' : 'Reactivate'}
            </button>
          </div>
          {message ? <div className={`reports-alert ${message.includes('Failed') || message.includes('required') || message.includes('duplicate') || message.includes('exists') ? 'error' : 'success'}`}>{message}</div> : null}
        </section>
      </div>

      <div className="team-management-grid">
        <section className="settings-card">
          <div className="team-section-head"><div><h3>Permissions & Login</h3><p className="settings-copy">Optional app access per profile</p></div></div>
          <div className="settings-form-grid">
            <label className="settings-field"><span>Workspace Role</span><select value={selectedUser.role} onChange={(event) => updateSelected({ role: event.target.value as UserRole }, 'permissions_updated', 'Updated workspace role.')}><option value="member">Member</option><option value="manager">Manager</option><option value="admin">Admin</option><option value="guest">Guest</option></select></label>
            <label className="settings-field"><span>Login Role</span><select value={selectedUser.loginAccess?.role ?? workspaceRoleToAuthRole(selectedUser.role)} onChange={(event) => updateSelected({ loginAccess: { enabled: true, authUserId: selectedUser.loginAccess?.authUserId, role: event.target.value as AuthUser['role'], status: selectedUser.loginAccess?.status ?? 'active' } }, 'permissions_updated', 'Updated login role.')}><option value="author">Author</option><option value="reviewer">Reviewer</option><option value="manager">Manager</option><option value="admin">Admin</option></select></label>
            <label className="settings-field"><span>Login Status</span><select value={selectedUser.loginAccess?.status ?? 'active'} onChange={(event) => updateSelected({ loginAccess: { enabled: true, authUserId: selectedUser.loginAccess?.authUserId, role: selectedUser.loginAccess?.role ?? workspaceRoleToAuthRole(selectedUser.role), status: event.target.value as AuthUser['status'] } }, 'permissions_updated', 'Updated login status.')}><option value="active">Active</option><option value="disabled">Disabled</option></select></label>
            <label className="settings-field"><span>{selectedUser.loginAccess?.authUserId ? 'New Password' : 'Temporary Password'}</span><input type="password" value={passwordDraft} onChange={(event) => setPasswordDraft(event.target.value)} placeholder={selectedUser.loginAccess?.authUserId ? 'Leave blank to keep current' : 'Required for invite'} /></label>
          </div>
          <div className="settings-list">
            {permissionOptions.map((permission) => {
              const enabled = selectedUser.permissions?.includes(permission) ?? false;
              return (
                <label key={permission} className="settings-list-row">
                  <div><strong>{permission}</strong><small>{enabled ? 'Allowed' : 'Not granted'}</small></div>
                  <input type="checkbox" checked={enabled} onChange={(event) => {
                    const current = selectedUser.permissions ?? [];
                    updateSelected({ permissions: event.target.checked ? [...current, permission] : current.filter((item) => item !== permission) }, 'permissions_updated', `Updated ${permission}.`);
                  }} />
                </label>
              );
            })}
          </div>
          <div className="settings-actions">
            <button className="primary-button" onClick={saveLoginAccess} disabled={!canManageProfiles}>Save Login / Invite</button>
            <button className="ghost-button" onClick={() => updateSelected({ loginAccess: selectedUser.loginAccess ? { ...selectedUser.loginAccess, enabled: false, status: 'disabled' } : undefined }, 'login_deactivated', 'Login access disabled for this profile.')}>Disable Login</button>
          </div>
        </section>

        <section className="settings-card">
          <div className="team-section-head"><div><h3>My Profile & Security</h3><p className="settings-copy">{selfProfile ? selfProfile.name : 'No linked self profile'}</p></div><button className="ghost-button" onClick={loadSecurity}>Refresh</button></div>
          {selfProfile ? (
            <div className="team-profile-summary">
              <div className="team-profile-placeholder"><UserRoundCheck size={18} /></div>
              <div><strong>{selfProfile.name}</strong><p>{selfProfile.email ?? sessionUser?.email} · {selfProfile.timezone ?? 'No timezone'}</p></div>
            </div>
          ) : <p className="settings-copy">Sign in and link your team profile email to use this panel.</p>}
          <div className="settings-list">
            {sessions.map((session) => (
              <div key={session.id} className="settings-list-row">
                <div><strong>{session.current ? 'Current session' : 'Signed-in session'}</strong><small>Expires {session.expiresAt}</small></div>
                {!session.current ? <button className="ghost-button" onClick={() => void revokeSession(session.id)}>Revoke</button> : <span className="status-badge status-green">Current</span>}
              </div>
            ))}
            {securityActivity.map((entry) => <div key={entry} className="settings-list-row"><small>{entry}</small></div>)}
          </div>
        </section>
      </div>

      <section className="settings-card">
        <div className="team-section-head"><div><h3>Profile Audit Trail</h3><p className="settings-copy">Local profile changes and linked login actions</p></div></div>
        <div className="settings-list">
          {(selectedUser.auditTrail ?? []).length > 0 ? (selectedUser.auditTrail ?? []).map((entry) => (
            <div key={entry.id} className="settings-list-row">
              <div><strong>{entry.action}</strong><small>{entry.createdAt} · {entry.actorName}</small><p>{entry.details}</p></div>
            </div>
          )) : <div className="settings-list-row"><div><strong>No profile audit yet</strong><small>Profile edits, deactivations, invites, and permission changes will appear here.</small></div></div>}
        </div>
      </section>
    </section>
  );
}
