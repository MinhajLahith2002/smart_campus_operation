import React, { useEffect, useState } from 'react';
import { Mail, RefreshCw, Search, ShieldCheck, UserPlus, UserX, Users } from 'lucide-react';
import { Badge, Button, Card, Input, NoticeBanner } from '../components/ui/Primitives';
import {
  createUserInvite,
  getAdminUsers,
  getAdminInvites,
  resendUserInvite,
  revokeUserInvite,
  updateAdminUserStatus,
} from '../lib/authApi';

const ROLE_OPTIONS = ['', 'STUDENT', 'ADMIN', 'TECHNICIAN'];
const STATUS_OPTIONS = ['', 'ACTIVE', 'PENDING_VERIFICATION', 'DISABLED', 'INVITED'];
const PROVIDER_OPTIONS = ['', 'LOCAL', 'GOOGLE', 'BOTH'];
const INVITE_ROLE_OPTIONS = [
  { value: 'TECHNICIAN', label: 'Technician', hint: 'Field operations and issue resolution access' },
  { value: 'ADMIN', label: 'Admin', hint: 'Full user management and system administration access' },
];

export const AdminUsersPage = () => {
  const [filters, setFilters] = useState({ query: '', role: '', status: '', provider: '' });
  const [users, setUsers] = useState([]);
  const [invites, setInvites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionError, setActionError] = useState('');
  const [inviteForm, setInviteForm] = useState({ fullName: '', email: '', role: 'TECHNICIAN' });
  const [savingInvite, setSavingInvite] = useState(false);

  const loadData = async (activeFilters = filters) => {
    try {
      setLoading(true);
      setError('');
      const [userData, inviteData] = await Promise.all([
        getAdminUsers(activeFilters),
        getAdminInvites(),
      ]);
      setUsers(userData);
      setInvites(inviteData);
    } catch (requestError) {
      setError(requestError.message || 'Unable to load user management.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleFilterSubmit = async (event) => {
    event.preventDefault();
    await loadData(filters);
  };

  const toggleStatus = async (user) => {
    try {
      setActionError('');
      await updateAdminUserStatus(user.id, user.status === 'DISABLED' ? 'ACTIVE' : 'DISABLED');
      await loadData(filters);
    } catch (requestError) {
      setActionError(requestError.message || 'Unable to update account status.');
    }
  };

  const handleInviteSubmit = async (event) => {
    event.preventDefault();
    try {
      setSavingInvite(true);
      setActionError('');
      await createUserInvite({
        fullName: inviteForm.fullName.trim(),
        email: inviteForm.email.trim().toLowerCase(),
        role: inviteForm.role,
      });
      setInviteForm((current) => ({ fullName: '', email: '', role: current.role }));
      await loadData(filters);
    } catch (requestError) {
      setActionError(requestError.message || 'Unable to create account invite.');
    } finally {
      setSavingInvite(false);
    }
  };

  const runInviteAction = async (action) => {
    try {
      setActionError('');
      await action();
      await loadData(filters);
    } catch (requestError) {
      setActionError(requestError.message || 'Unable to update invite.');
    }
  };

  const totalUsers = users.length;
  const activeUsers = users.filter((user) => user.status === 'ACTIVE').length;
  const disabledUsers = users.filter((user) => user.status === 'DISABLED').length;
  const totalInvites = invites.length;
  const pendingInvites = invites.filter((invite) => invite.status === 'PENDING').length;

  return (
    <div className="space-y-8">
      <section className="auth-page surface-strong overflow-hidden p-6 md:p-8">
        <div className="space-y-8">
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1.3fr)_minmax(280px,0.7fr)] lg:items-end">
            <div className="space-y-6">
              <div className="eyebrow w-fit">Admin user management</div>
              <h1 className="max-w-5xl text-3xl font-semibold tracking-tight text-foreground md:text-[3.25rem] md:leading-[1.02]">
                Manage access, account status, and technician onboarding in one place.
              </h1>
            </div>

            <div className="auth-divider flex h-full flex-col justify-end gap-4 lg:border-l lg:pl-8">
              <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-muted-foreground">
                Overview
              </p>
              <p className="max-w-md text-base leading-8 text-muted-foreground md:text-lg">
                Review roles, providers, and invites with backend-controlled account status.
              </p>
            </div>
          </div>

          <div className="auth-divider grid gap-4 border-t pt-6 md:grid-cols-3">
            <ManagementSnapshotCard
              label="Users"
              value={loading ? '--' : totalUsers}
              description="All tracked accounts currently visible from the backend-controlled directory."
              meta={loading ? 'Syncing account totals' : `${activeUsers} account${activeUsers === 1 ? '' : 's'} currently active`}
              icon={Users}
              tone="primary"
            />
            <ManagementSnapshotCard
              label="Invites"
              value={loading ? '--' : totalInvites}
              description="Admin and technician access invites created from this workspace, including follow-up history."
              meta={loading ? 'Checking invite pipeline' : pendingInvites > 0 ? `${pendingInvites} invite${pendingInvites === 1 ? '' : 's'} awaiting response` : 'No invites awaiting response'}
              icon={UserPlus}
              tone="info"
            />
            <ManagementSnapshotCard
              label="Disabled"
              value={loading ? '--' : disabledUsers}
              description="Accounts that are currently blocked from access and may need admin review."
              meta={loading ? 'Reviewing access states' : disabledUsers > 0 ? `${disabledUsers} account${disabledUsers === 1 ? '' : 's'} access restricted` : 'No accounts currently restricted'}
              metaClassName="whitespace-nowrap px-3 text-[10px] tracking-[0.08em] sm:text-[11px] sm:tracking-[0.12em]"
              icon={UserX}
              tone="danger"
            />
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <Card className="bg-white/70 p-6 dark:bg-white/5">
          <div className="mb-4 flex items-center gap-2 text-lg font-semibold"><Search size={18} className="text-primary" /> Search and filter</div>
          <form className="space-y-4" onSubmit={handleFilterSubmit}>
            <div className="grid gap-4 md:grid-cols-2">
              <Input placeholder="Search name, email, or student ID" value={filters.query} onChange={(event) => setFilters((current) => ({ ...current, query: event.target.value }))} />
              <select className="flex h-11 w-full rounded-xl border border-border bg-white/45 px-3 py-2 text-sm dark:bg-white/5" value={filters.role} onChange={(event) => setFilters((current) => ({ ...current, role: event.target.value }))}>
                {ROLE_OPTIONS.map((option) => <option key={option || 'all-role'} value={option}>{option || 'All roles'}</option>)}
              </select>
              <select className="flex h-11 w-full rounded-xl border border-border bg-white/45 px-3 py-2 text-sm dark:bg-white/5" value={filters.status} onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value }))}>
                {STATUS_OPTIONS.map((option) => <option key={option || 'all-status'} value={option}>{option || 'All statuses'}</option>)}
              </select>
              <select className="flex h-11 w-full rounded-xl border border-border bg-white/45 px-3 py-2 text-sm dark:bg-white/5" value={filters.provider} onChange={(event) => setFilters((current) => ({ ...current, provider: event.target.value }))}>
                {PROVIDER_OPTIONS.map((option) => <option key={option || 'all-provider'} value={option}>{option || 'All providers'}</option>)}
              </select>
            </div>
            <Button type="submit" variant="outline" className="gap-2"><RefreshCw size={16} /> Refresh list</Button>
          </form>
        </Card>

        <Card className="bg-white/70 p-6 dark:bg-white/5">
          <div className="mb-4 flex items-center gap-2 text-lg font-semibold"><Mail size={18} className="text-primary" /> Invite account access</div>
          <form className="space-y-4" onSubmit={handleInviteSubmit}>
            <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_220px]">
              <Input placeholder={inviteForm.role === 'ADMIN' ? 'Admin full name' : 'Technician full name'} value={inviteForm.fullName} onChange={(event) => setInviteForm((current) => ({ ...current, fullName: event.target.value }))} />
              <select className="flex h-11 w-full rounded-xl border border-border bg-white/45 px-3 py-2 text-sm dark:bg-white/5" value={inviteForm.role} onChange={(event) => setInviteForm((current) => ({ ...current, role: event.target.value }))}>
                {INVITE_ROLE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </div>
            <Input type="email" placeholder={inviteForm.role === 'ADMIN' ? 'admin@campus.edu' : 'technician@campus.edu'} value={inviteForm.email} onChange={(event) => setInviteForm((current) => ({ ...current, email: event.target.value }))} />
            <div className="rounded-2xl border border-border/70 bg-white/55 px-4 py-3 text-sm text-muted-foreground dark:bg-white/[0.04]">
              <div className="flex items-start gap-3">
                <ShieldCheck size={16} className="mt-0.5 text-primary" />
                <p>{INVITE_ROLE_OPTIONS.find((option) => option.value === inviteForm.role)?.hint}</p>
              </div>
            </div>
            <Button type="submit" isLoading={savingInvite} disabled={!inviteForm.fullName.trim() || !inviteForm.email.trim() || savingInvite}>
              {inviteForm.role === 'ADMIN' ? 'Send Admin Invite' : 'Send Technician Invite'}
            </Button>
          </form>
        </Card>
      </section>

      <div className="space-y-3">
        {error && (
          <NoticeBanner variant="error" onDismiss={() => setError('')}>
            {error}
          </NoticeBanner>
        )}
        {actionError && (
          <NoticeBanner variant="warning" onDismiss={() => setActionError('')}>
            {actionError}
          </NoticeBanner>
        )}
      </div>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Accounts</h2>
          <Badge variant="info">Backend truth</Badge>
        </div>

        {loading ? (
          <Card className="p-8 text-sm text-muted-foreground">Loading users...</Card>
        ) : (
          <div className="space-y-3">
            {users.map((user) => (
              <Card key={user.id} className="bg-white/70 p-6 dark:bg-white/5">
                <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-lg font-semibold">{user.fullName}</p>
                      <Badge variant="info">{user.role}</Badge>
                      <Badge variant={user.status === 'ACTIVE' ? 'success' : user.status === 'DISABLED' ? 'danger' : 'warning'}>{user.status}</Badge>
                      <Badge variant="neutral">{user.authProviderType}</Badge>
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">{user.email}</p>
                    <div className="mt-3 flex flex-wrap gap-3 text-xs text-muted-foreground">
                      <span>Account ID: {user.id}</span>
                      {user.studentId && <span>Student ID: {user.studentId}</span>}
                      {user.faculty && <span>Faculty: {user.faculty}</span>}
                      {user.campus && <span>Campus: {user.campus}</span>}
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <Button variant={user.status === 'DISABLED' ? 'primary' : 'outline'} onClick={() => toggleStatus(user)}>
                      {user.status === 'DISABLED' ? 'Activate' : 'Disable'}
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Invite history</h2>
          <Badge variant="neutral">Invite workflow</Badge>
        </div>

        <div className="space-y-3">
          {invites.map((invite) => (
            <Card key={invite.id} className="bg-white/70 p-6 dark:bg-white/5">
              <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-lg font-semibold">{invite.fullName}</p>
                    <Badge variant={invite.role === 'ADMIN' ? 'warning' : 'info'}>{invite.role}</Badge>
                    <Badge variant={invite.status === 'ACCEPTED' ? 'success' : invite.status === 'REVOKED' ? 'danger' : invite.status === 'EXPIRED' ? 'warning' : 'info'}>
                      {invite.status}
                    </Badge>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">{invite.email}</p>
                </div>
                <div className="flex gap-3">
                  {invite.status === 'PENDING' && <Button variant="outline" onClick={() => runInviteAction(() => resendUserInvite(invite.id))}>Resend</Button>}
                  {invite.status === 'PENDING' && <Button variant="ghost" onClick={() => runInviteAction(() => revokeUserInvite(invite.id))}>Revoke</Button>}
                </div>
              </div>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
};

const SNAPSHOT_TONES = {
  primary: {
    icon: 'bg-[linear-gradient(180deg,#173069_0%,#2f5bff_100%)] text-white shadow-[0_16px_32px_rgba(23,48,105,0.24)] dark:bg-[linear-gradient(180deg,#7da7ff_0%,#2f5bff_100%)]',
    glow: 'from-[rgba(47,91,255,0.16)] via-[rgba(47,91,255,0.06)] to-transparent dark:from-[rgba(125,167,255,0.18)] dark:via-[rgba(125,167,255,0.08)]',
    dot: 'bg-[#2f5bff] dark:bg-[#8fb3ff]',
  },
  info: {
    icon: 'bg-[linear-gradient(180deg,#0f766e_0%,#10b981_100%)] text-white shadow-[0_16px_32px_rgba(15,118,110,0.22)] dark:bg-[linear-gradient(180deg,#29b39a_0%,#0f766e_100%)]',
    glow: 'from-[rgba(16,185,129,0.14)] via-[rgba(16,185,129,0.05)] to-transparent dark:from-[rgba(41,179,154,0.16)] dark:via-[rgba(41,179,154,0.06)]',
    dot: 'bg-[#10b981] dark:bg-[#7ce1c4]',
  },
  danger: {
    icon: 'bg-[linear-gradient(180deg,#7f1d1d_0%,#ef4444_100%)] text-white shadow-[0_16px_32px_rgba(127,29,29,0.22)] dark:bg-[linear-gradient(180deg,#fb7185_0%,#be123c_100%)]',
    glow: 'from-[rgba(239,68,68,0.14)] via-[rgba(239,68,68,0.05)] to-transparent dark:from-[rgba(251,113,133,0.16)] dark:via-[rgba(251,113,133,0.06)]',
    dot: 'bg-[#ef4444] dark:bg-[#fda4af]',
  },
};

const ManagementSnapshotCard = ({ label, value, description, meta, icon: Icon, tone = 'primary', metaClassName = '' }) => {
  const palette = SNAPSHOT_TONES[tone] || SNAPSHOT_TONES.primary;

  return (
    <div className="auth-brand-pill relative overflow-hidden rounded-[1.6rem] border p-5">
      <div className={`pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b ${palette.glow}`} />
      <div className="relative flex h-full flex-col gap-6">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2">
            <p className="auth-brand-title text-[11px] font-bold uppercase tracking-[0.24em]">{label}</p>
            <p className="auth-brand-title text-4xl font-semibold tracking-tight">{value}</p>
          </div>
          <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${palette.icon}`}>
            <Icon size={20} strokeWidth={2.1} />
          </div>
        </div>

        <div className="space-y-3">
          <p className="auth-brand-copy max-w-[26ch] text-sm leading-6">{description}</p>
          <div className={`inline-flex items-center gap-2 rounded-full border border-[color:var(--auth-chip-border)] bg-[var(--auth-chip-bg)] px-3.5 py-2 text-[11px] font-semibold leading-none tracking-[0.14em] uppercase text-[var(--auth-chip-title)] shadow-[0_12px_28px_rgba(15,23,42,0.06)] dark:shadow-none ${metaClassName}`}>
            <span className={`h-2 w-2 rounded-full ${palette.dot}`} />
            {meta}
          </div>
        </div>
      </div>
    </div>
  );
};

