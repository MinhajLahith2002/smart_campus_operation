import React, { useEffect, useState } from 'react';
import { Mail, RefreshCw, Search } from 'lucide-react';
import { Badge, Button, Card, Input, NoticeBanner } from '../components/ui/Primitives';
import {
  createTechnicianInvite,
  getAdminUsers,
  getTechnicianInvites,
  resendTechnicianInvite,
  revokeTechnicianInvite,
  updateAdminUserStatus,
} from '../lib/authApi';

const ROLE_OPTIONS = ['', 'STUDENT', 'ADMIN', 'TECHNICIAN'];
const STATUS_OPTIONS = ['', 'ACTIVE', 'PENDING_VERIFICATION', 'DISABLED', 'INVITED'];
const PROVIDER_OPTIONS = ['', 'LOCAL', 'GOOGLE', 'BOTH'];

export const AdminUsersPage = () => {
  const [filters, setFilters] = useState({ query: '', role: '', status: '', provider: '' });
  const [users, setUsers] = useState([]);
  const [invites, setInvites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionError, setActionError] = useState('');
  const [inviteForm, setInviteForm] = useState({ fullName: '', email: '' });
  const [savingInvite, setSavingInvite] = useState(false);

  const loadData = async (activeFilters = filters) => {
    try {
      setLoading(true);
      setError('');
      const [userData, inviteData] = await Promise.all([
        getAdminUsers(activeFilters),
        getTechnicianInvites(),
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
      await createTechnicianInvite({
        fullName: inviteForm.fullName.trim(),
        email: inviteForm.email.trim().toLowerCase(),
      });
      setInviteForm({ fullName: '', email: '' });
      await loadData(filters);
    } catch (requestError) {
      setActionError(requestError.message || 'Unable to create technician invite.');
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

  return (
    <div className="space-y-8">
      <section className="surface-strong p-6 md:p-8">
        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <div className="eyebrow mb-4">Admin user management</div>
            <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">Manage access, account status, and technician onboarding from one operations desk.</h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-muted-foreground">
              Roles, status, and auth provider visibility come straight from the backend. Technician onboarding stays invite-controlled and account activation stays admin-managed.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <MetricCard label="Users" value={`${users.length}`} />
            <MetricCard label="Invites" value={`${invites.length}`} />
            <MetricCard label="Disabled" value={`${users.filter((item) => item.status === 'DISABLED').length}`} />
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
          <div className="mb-4 flex items-center gap-2 text-lg font-semibold"><Mail size={18} className="text-primary" /> Invite technician</div>
          <form className="space-y-4" onSubmit={handleInviteSubmit}>
            <Input placeholder="Technician full name" value={inviteForm.fullName} onChange={(event) => setInviteForm((current) => ({ ...current, fullName: event.target.value }))} />
            <Input type="email" placeholder="technician@campus.edu" value={inviteForm.email} onChange={(event) => setInviteForm((current) => ({ ...current, email: event.target.value }))} />
            <Button type="submit" isLoading={savingInvite} disabled={!inviteForm.fullName.trim() || !inviteForm.email.trim() || savingInvite}>Send Technician Invite</Button>
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
          <h2 className="text-xl font-semibold">Technician invite history</h2>
          <Badge variant="neutral">Invite workflow</Badge>
        </div>

        <div className="space-y-3">
          {invites.map((invite) => (
            <Card key={invite.id} className="bg-white/70 p-6 dark:bg-white/5">
              <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-lg font-semibold">{invite.fullName}</p>
                    <Badge variant={invite.status === 'ACCEPTED' ? 'success' : invite.status === 'REVOKED' ? 'danger' : invite.status === 'EXPIRED' ? 'warning' : 'info'}>
                      {invite.status}
                    </Badge>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">{invite.email}</p>
                </div>
                <div className="flex gap-3">
                  {invite.status === 'PENDING' && <Button variant="outline" onClick={() => runInviteAction(() => resendTechnicianInvite(invite.id))}>Resend</Button>}
                  {invite.status === 'PENDING' && <Button variant="ghost" onClick={() => runInviteAction(() => revokeTechnicianInvite(invite.id))}>Revoke</Button>}
                </div>
              </div>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
};

const MetricCard = ({ label, value }) => (
  <Card className="bg-white/65 p-5 text-center dark:bg-white/5">
    <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-muted-foreground">{label}</p>
    <p className="mt-3 text-3xl font-semibold">{value}</p>
  </Card>
);
