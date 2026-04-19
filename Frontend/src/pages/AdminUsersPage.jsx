import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AlertCircle, CheckCircle2, ChevronDown, Mail, RefreshCw, Search, ShieldCheck, UserPlus, UserX, Users } from 'lucide-react';
import { Badge, Button, Card, Input, NoticeBanner } from '../components/ui/Primitives';
import {
  createUserInvite,
  getAdminUsers,
  getAdminInvites,
  resendUserInvite,
  revokeUserInvite,
  updateAdminUserStatus,
} from '../lib/authApi';
import { validateAdminUserSearch, validateUserInvite } from '../lib/authValidation';

const ROLE_OPTIONS = ['', 'STUDENT', 'ADMIN', 'TECHNICIAN'];
const STATUS_OPTIONS = ['', 'ACTIVE', 'PENDING_VERIFICATION', 'DISABLED', 'INVITED'];
const PROVIDER_OPTIONS = ['', 'LOCAL', 'GOOGLE'];
const DEFAULT_FILTERS = { query: '', role: '', status: '', provider: '' };
const INVITE_HISTORY_ROLE_OPTIONS = ['', 'ADMIN', 'TECHNICIAN'];
const INVITE_HISTORY_STATUS_OPTIONS = ['', 'PENDING', 'ACCEPTED', 'REVOKED', 'EXPIRED'];
const DEFAULT_INVITE_HISTORY_FILTERS = { query: '', role: '', status: '' };
const INVITE_ROLE_OPTIONS = [
  { value: 'TECHNICIAN', label: 'Technician', hint: 'Field operations and issue resolution access' },
  { value: 'ADMIN', label: 'Admin', hint: 'Full user management and system administration access' },
];
const filterClearButtonClassName = 'gap-2 self-start rounded-full text-white h-11 min-w-[170px] bg-[linear-gradient(135deg,#0f766e_0%,#10b981_58%,#14b8a6_100%)] shadow-[0_16px_32px_rgba(15,118,110,0.24)] hover:brightness-[0.98]';
const getAccountActionButtonClassName = (status) => (
  status === 'DISABLED'
    ? 'border-teal-800/75 bg-[linear-gradient(180deg,#0f8f85_0%,#0b6f73_100%)] text-white shadow-[0_16px_30px_rgba(15,143,133,0.26)] hover:border-teal-900 hover:bg-[linear-gradient(180deg,#0b7c74_0%,#095f63_100%)] dark:border-emerald-300/20 dark:bg-[linear-gradient(180deg,rgba(20,184,166,0.28)_0%,rgba(13,148,136,0.46)_100%)] dark:text-emerald-50 dark:hover:bg-[linear-gradient(180deg,rgba(20,184,166,0.36)_0%,rgba(13,148,136,0.58)_100%)]'
    : 'border-rose-500/70 bg-[linear-gradient(180deg,#f47298_0%,#db2777_100%)] text-white shadow-[0_16px_30px_rgba(225,29,72,0.22)] hover:border-rose-600 hover:bg-[linear-gradient(180deg,#ec4899_0%,#be185d_100%)] dark:border-rose-300/18 dark:bg-[linear-gradient(180deg,rgba(190,24,93,0.2)_0%,rgba(136,19,55,0.32)_100%)] dark:text-rose-100 dark:hover:bg-[linear-gradient(180deg,rgba(190,24,93,0.28)_0%,rgba(136,19,55,0.42)_100%)]'
);
const inviteHistoryActionClassNames = {
  resend: 'border-[color:var(--auth-chip-border)] bg-[var(--auth-chip-bg)] text-[color:var(--auth-chip-title)] shadow-[0_18px_36px_rgba(15,23,42,0.08)] hover:border-[color:var(--auth-accent)]/30 hover:bg-[var(--auth-chip-bg)] dark:shadow-[0_20px_44px_rgba(2,6,23,0.28)]',
  revoke: 'border-[color:var(--auth-chip-border)] bg-[var(--auth-chip-bg)] text-[color:var(--auth-chip-copy)] shadow-[0_18px_36px_rgba(15,23,42,0.08)] hover:border-rose-300/40 hover:bg-[var(--auth-chip-bg)] hover:text-rose-700 dark:hover:text-rose-200 dark:shadow-[0_20px_44px_rgba(2,6,23,0.28)]',
};

export const AdminUsersPage = () => {
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [users, setUsers] = useState([]);
  const [invites, setInvites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionError, setActionError] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');
  const [inviteHistoryActionError, setInviteHistoryActionError] = useState('');
  const [inviteHistoryActionSuccess, setInviteHistoryActionSuccess] = useState('');
  const [searchTouched, setSearchTouched] = useState(false);
  const [inviteHistoryFilters, setInviteHistoryFilters] = useState(DEFAULT_INVITE_HISTORY_FILTERS);
  const [inviteHistorySearchTouched, setInviteHistorySearchTouched] = useState(false);
  const [inviteForm, setInviteForm] = useState({ fullName: '', email: '', role: 'TECHNICIAN' });
  const [inviteDirty, setInviteDirty] = useState({});
  const [inviteTouched, setInviteTouched] = useState({});
  const [inviteErrors, setInviteErrors] = useState({});
  const [savingInvite, setSavingInvite] = useState(false);
  const hasBootstrappedRef = useRef(false);
  const userRequestIdRef = useRef(0);
  const inviteRequestIdRef = useRef(0);
  const inviteValidation = useMemo(() => validateUserInvite(inviteForm), [inviteForm]);
  const searchError = useMemo(() => validateAdminUserSearch(filters.query), [filters.query]);
  const inviteHistorySearchError = useMemo(() => validateAdminUserSearch(inviteHistoryFilters.query), [inviteHistoryFilters.query]);
  const selectedInviteRole = INVITE_ROLE_OPTIONS.find((option) => option.value === inviteForm.role) || INVITE_ROLE_OPTIONS[0];
  const inviteEmail = inviteForm.email.trim().toLowerCase();
  const emailLooksLikeCampus = /@campus\.edu$/i.test(inviteEmail);
  const inviteReadinessScore = [
    !inviteValidation.fullName && inviteForm.fullName.trim(),
    !inviteValidation.email && inviteEmail,
    !inviteValidation.role && inviteForm.role,
  ].filter(Boolean).length;
  const inviteReadinessLabel = inviteReadinessScore === 3 ? 'Ready to send' : inviteReadinessScore === 2 ? 'Almost ready' : 'Needs attention';
  const inviteReadinessClass = inviteReadinessScore === 3 ? 'text-success' : inviteReadinessScore === 2 ? 'text-warning' : 'text-danger';
  const inviteProgressClass = inviteReadinessScore === 3 ? 'bg-success' : inviteReadinessScore === 2 ? 'bg-warning' : 'bg-danger';
  const showInviteValidation = (field) => Boolean(inviteDirty[field] || inviteTouched[field]);
  const inviteFieldClassName = (field) => `auth-input h-12 rounded-2xl px-4 !font-normal text-[color:var(--auth-chip-copy)] placeholder:!font-normal placeholder:!text-[color:var(--auth-chip-copy)] placeholder:opacity-100 focus-visible:ring-[color:var(--auth-accent)] focus-visible:ring-offset-0 ${showInviteValidation(field) && inviteErrors[field] ? 'border-danger/60 focus-visible:ring-danger' : ''}`;
  const inviteSelectClassName = (field) => `h-12 w-full appearance-none rounded-2xl border px-4 pr-12 text-sm !font-normal text-[color:var(--auth-chip-copy)] backdrop-blur-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--auth-accent)] focus-visible:ring-offset-0 ${showInviteValidation(field) && inviteErrors[field] ? 'border-danger/60 focus-visible:ring-danger' : ''}`;

  const loadUsers = async (activeFilters = filters, options = {}) => {
    const { showLoadingState = false } = options;
    const requestId = userRequestIdRef.current + 1;
    userRequestIdRef.current = requestId;

    try {
      if (showLoadingState) {
        setLoading(true);
      }
      setError('');
      const userData = await getAdminUsers(activeFilters);
      if (requestId !== userRequestIdRef.current) return;
      setUsers(userData);
    } catch (requestError) {
      if (requestId !== userRequestIdRef.current) return;
      setError(requestError.message || 'Unable to load user management.');
    } finally {
      if (showLoadingState && requestId === userRequestIdRef.current) {
        setLoading(false);
      }
    }
  };

  const loadInvites = async () => {
    const requestId = inviteRequestIdRef.current + 1;
    inviteRequestIdRef.current = requestId;

    try {
      setError('');
      const inviteData = await getAdminInvites();
      if (requestId !== inviteRequestIdRef.current) return;
      setInvites(inviteData);
    } catch (requestError) {
      if (requestId !== inviteRequestIdRef.current) return;
      setError(requestError.message || 'Unable to load invite management.');
    }
  };

  useEffect(() => {
    if (!hasBootstrappedRef.current) return;
    if (searchError) return;

    const debounceMs = filters.query ? 120 : 0;
    const timerId = window.setTimeout(() => {
      loadUsers(filters, { showLoadingState: false });
    }, debounceMs);

    return () => window.clearTimeout(timerId);
  }, [filters, searchError]);

  useEffect(() => {
    const bootstrap = async () => {
      setLoading(true);
      try {
        await Promise.all([
          loadUsers(filters, { showLoadingState: false }),
          loadInvites(),
        ]);
      } finally {
        hasBootstrappedRef.current = true;
        setLoading(false);
      }
    };

    bootstrap();
  }, []);

  const handleFilterSubmit = async (event) => {
    event.preventDefault();
    setSearchTouched(true);
    if (searchError) return;
    await loadUsers(filters, { showLoadingState: false });
  };

  const handleClearFilters = () => {
    setFilters(DEFAULT_FILTERS);
    setSearchTouched(false);
    setError('');
  };

  const toggleStatus = async (user) => {
    try {
      setActionError('');
      setActionSuccess('');
      const nextStatus = user.status === 'DISABLED' ? 'ACTIVE' : 'DISABLED';
      await updateAdminUserStatus(user.id, user.status === 'DISABLED' ? 'ACTIVE' : 'DISABLED');
      await loadUsers(filters, { showLoadingState: false });
      setActionSuccess(
        nextStatus === 'ACTIVE'
          ? `${user.fullName} is active again and can sign in if the rest of the account flow is complete.`
          : `${user.fullName} has been disabled and access is now blocked until an admin reactivates the account.`
      );
    } catch (requestError) {
      setActionError(requestError.message || 'Unable to update account status.');
    }
  };

  const handleInviteSubmit = async (event) => {
    event.preventDefault();
    const nextErrors = validateUserInvite(inviteForm);
    setInviteTouched({ fullName: true, email: true, role: true });
    setInviteErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    try {
      setSavingInvite(true);
      setActionError('');
      await createUserInvite({
        fullName: inviteForm.fullName.trim(),
        email: inviteForm.email.trim().toLowerCase(),
        role: inviteForm.role,
      });
      setInviteForm((current) => ({ fullName: '', email: '', role: current.role }));
      setInviteDirty({});
      setInviteTouched({});
      setInviteErrors({});
      await Promise.all([
        loadUsers(filters, { showLoadingState: false }),
        loadInvites(),
      ]);
    } catch (requestError) {
      if (requestError.details?.fields) {
        setInviteErrors((current) => ({ ...current, ...requestError.details.fields }));
      }
      setActionError(requestError.message || 'Unable to create account invite.');
    } finally {
      setSavingInvite(false);
    }
  };

  const handleInviteChange = (field, value) => {
    const nextForm = { ...inviteForm, [field]: value };
    setInviteForm(nextForm);
    setInviteDirty((current) => ({ ...current, [field]: true }));
    if (showInviteValidation(field) || Object.keys(inviteTouched).length) {
      setInviteErrors(validateUserInvite(nextForm));
    }
  };

  const handleInviteBlur = (field) => {
    setInviteTouched((current) => ({ ...current, [field]: true }));
    setInviteErrors(validateUserInvite(inviteForm));
  };

  const runInviteAction = async (action, successMessage) => {
    try {
      setInviteHistoryActionError('');
      setInviteHistoryActionSuccess('');
      await action();
      await Promise.all([
        loadUsers(filters, { showLoadingState: false }),
        loadInvites(),
      ]);
      setInviteHistoryActionSuccess(successMessage);
    } catch (requestError) {
      setInviteHistoryActionError(requestError.message || 'Unable to update invite.');
    }
  };

  const totalUsers = users.length;
  const activeUsers = users.filter((user) => user.status === 'ACTIVE').length;
  const disabledUsers = users.filter((user) => user.status === 'DISABLED').length;
  const totalInvites = invites.length;
  const pendingInvites = invites.filter((invite) => invite.status === 'PENDING').length;
  const filteredInvites = useMemo(() => {
    if (inviteHistorySearchError) {
      return invites;
    }

    const normalizedQuery = inviteHistoryFilters.query.trim().toLowerCase();

    return invites.filter((invite) => {
      const matchesQuery = !normalizedQuery
        || invite.fullName.toLowerCase().includes(normalizedQuery)
        || invite.email.toLowerCase().includes(normalizedQuery);
      const matchesRole = !inviteHistoryFilters.role || invite.role === inviteHistoryFilters.role;
      const matchesStatus = !inviteHistoryFilters.status || invite.status === inviteHistoryFilters.status;

      return matchesQuery && matchesRole && matchesStatus;
    });
  }, [invites, inviteHistoryFilters, inviteHistorySearchError]);

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

      <section className="auth-page space-y-6">
        <Card className="bg-[linear-gradient(180deg,var(--auth-surface-strong),var(--auth-surface))] p-6">
          <div className="mb-5 flex items-center gap-2 text-lg font-semibold"><Mail size={18} className="text-primary" /> Invite account access</div>
          <form className="space-y-5" onSubmit={handleInviteSubmit}>
            <div className="grid gap-5 xl:grid-cols-[minmax(0,1.55fr)_minmax(320px,0.9fr)] xl:items-stretch">
              <div className="flex h-full flex-col gap-4">
                <div className="grid gap-4 xl:grid-cols-[minmax(0,1.45fr)_240px] xl:items-start">
                  <InviteField fieldId="invite-full-name" label="Full name" error={showInviteValidation('fullName') && inviteErrors.fullName}>
                    <Input
                      id="invite-full-name"
                      placeholder={inviteForm.role === 'ADMIN' ? 'Admin full name' : 'Technician full name'}
                      value={inviteForm.fullName}
                      onChange={(event) => handleInviteChange('fullName', event.target.value)}
                      onBlur={() => handleInviteBlur('fullName')}
                      className={inviteFieldClassName('fullName')}
                      style={{ color: 'var(--auth-chip-copy)', fontWeight: 400 }}
                    />
                  </InviteField>
                  <InviteField fieldId="invite-role" label="Access role" error={showInviteValidation('role') && inviteErrors.role}>
                    <div className="relative">
                      <select
                        id="invite-role"
                        className={inviteSelectClassName('role')}
                        style={{
                          background: 'var(--auth-input-bg)',
                          borderColor: showInviteValidation('role') && inviteErrors.role ? 'rgb(239 68 68 / 0.6)' : 'var(--auth-input-border)',
                          color: 'var(--auth-chip-copy)',
                          fontWeight: 400,
                          boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.22), 0 0 0 1px transparent',
                        }}
                        value={inviteForm.role}
                        onChange={(event) => handleInviteChange('role', event.target.value)}
                        onBlur={() => handleInviteBlur('role')}
                      >
                        {INVITE_ROLE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                      </select>
                      <ChevronDown size={18} className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    </div>
                  </InviteField>
                </div>

                <InviteField fieldId="invite-email" label="Email" error={showInviteValidation('email') && inviteErrors.email}>
                  <Input
                    id="invite-email"
                    type="email"
                    placeholder={inviteForm.role === 'ADMIN' ? 'admin@campus.edu' : 'technician@campus.edu'}
                    value={inviteForm.email}
                    onChange={(event) => handleInviteChange('email', event.target.value)}
                    onBlur={() => handleInviteBlur('email')}
                    className={inviteFieldClassName('email')}
                    style={{ color: 'var(--auth-chip-copy)', fontWeight: 400 }}
                  />
                </InviteField>

                <div className="rounded-[22px] border border-[color:var(--auth-input-border)] bg-[var(--auth-chip-bg)] px-4 py-4 text-sm leading-7 shadow-[0_12px_28px_rgba(15,23,42,0.05)] dark:shadow-[0_20px_44px_rgba(2,6,23,0.24)] xl:flex-1">
                  <div className="mb-2 flex items-center gap-2 font-semibold text-foreground">
                    <ShieldCheck size={16} className="text-[var(--auth-accent)]" />
                    Access profile
                  </div>
                  <p className="auth-copy">{selectedInviteRole.hint}. The invite link stays local-auth only and the user completes setup from the secure invite page.</p>
                </div>
              </div>

              <div className="auth-brand-pill flex h-full flex-col rounded-[24px] px-5 py-4 xl:min-h-[100%]">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.28em] text-muted-foreground">
                    Invite readiness
                  </p>
                  <span className={`text-sm font-semibold ${inviteReadinessClass}`}>
                    {inviteReadinessLabel}
                  </span>
                </div>

                <div className="mt-3 grid grid-cols-3 gap-2">
                  {[0, 1, 2].map((index) => (
                    <div
                      key={index}
                      className={`h-2.5 rounded-full transition-colors ${
                        index < inviteReadinessScore ? inviteProgressClass : 'bg-slate-200 dark:bg-white/10'
                      }`}
                    />
                  ))}
                </div>

                <div className="mt-4 grid gap-3">
                  <InviteChecklistItem
                    valid={!inviteValidation.fullName && Boolean(inviteForm.fullName.trim())}
                    label={inviteValidation.fullName || 'Professional full name looks good'}
                  />
                  <InviteChecklistItem
                    valid={!inviteValidation.email && Boolean(inviteEmail)}
                    label={inviteValidation.email || (emailLooksLikeCampus ? 'Campus email format detected' : 'Valid email format ready for invite')}
                  />
                  <InviteChecklistItem
                    valid={!inviteValidation.role && Boolean(inviteForm.role)}
                    label={selectedInviteRole.label === 'Admin' ? 'Admin-level access will be granted after setup' : 'Technician access will be granted after setup'}
                  />
                  <InviteChecklistItem
                    valid={emailLooksLikeCampus}
                    neutral={!inviteEmail || inviteValidation.email}
                    label={emailLooksLikeCampus ? 'Recommended campus domain is in use' : 'A non-campus email can still be invited if intended'}
                  />
                </div>

                <div className="mt-5 xl:mt-auto">
                  <Button type="submit" isLoading={savingInvite} disabled={savingInvite || Object.keys(inviteValidation).length > 0} className="auth-primary-button w-full rounded-full text-white" size="lg">
                    {inviteForm.role === 'ADMIN' ? 'Send Admin Invite' : 'Send Technician Invite'}
                  </Button>
                </div>
              </div>
            </div>
          </form>
        </Card>

        <Card className="bg-[linear-gradient(180deg,var(--auth-surface-strong),var(--auth-surface))] p-6">
          <div className="mb-5 flex items-center gap-2 text-lg font-semibold"><Search size={18} className="text-primary" /> Search and filter</div>
          <form className="space-y-4" onSubmit={handleFilterSubmit}>
            <div className="flex flex-col gap-4 lg:flex-row lg:flex-wrap lg:items-start xl:flex-nowrap">
              <div className="relative min-h-[4.7rem] lg:min-w-[18rem] lg:flex-[1.4]">
                <Input
                  className={`auth-input h-11 rounded-2xl px-4 focus-visible:ring-[color:var(--auth-accent)] focus-visible:ring-offset-0 ${searchTouched && searchError ? 'border-danger/60 focus-visible:ring-danger' : ''}`}
                  placeholder="Search name, email, or student ID"
                  value={filters.query}
                  onChange={(event) => {
                    const nextQuery = event.target.value;
                    setFilters((current) => ({ ...current, query: nextQuery }));
                    setSearchTouched(nextQuery.trim().length > 0);
                  }}
                  onBlur={() => setSearchTouched(true)}
                />
                {searchTouched && searchError && (
                  <p className="mt-2 text-sm leading-5 text-danger">{searchError}</p>
                )}
              </div>
              <select className="h-11 w-full appearance-none rounded-2xl border px-4 pr-12 text-sm text-[color:var(--auth-chip-copy)] backdrop-blur-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--auth-accent)] focus-visible:ring-offset-0 lg:w-[220px] lg:min-w-[220px]" style={{ background: 'var(--auth-input-bg)', borderColor: 'var(--auth-input-border)', boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.22), 0 0 0 1px transparent' }} value={filters.role} onChange={(event) => setFilters((current) => ({ ...current, role: event.target.value }))}>
                {ROLE_OPTIONS.map((option) => <option key={option || 'all-role'} value={option}>{option || 'All roles'}</option>)}
              </select>
              <select className="h-11 w-full appearance-none rounded-2xl border px-4 pr-12 text-sm text-[color:var(--auth-chip-copy)] backdrop-blur-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--auth-accent)] focus-visible:ring-offset-0 lg:w-[220px] lg:min-w-[220px]" style={{ background: 'var(--auth-input-bg)', borderColor: 'var(--auth-input-border)', boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.22), 0 0 0 1px transparent' }} value={filters.status} onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value }))}>
                {STATUS_OPTIONS.map((option) => <option key={option || 'all-status'} value={option}>{option || 'All statuses'}</option>)}
              </select>
              <select className="h-11 w-full appearance-none rounded-2xl border px-4 pr-12 text-sm text-[color:var(--auth-chip-copy)] backdrop-blur-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--auth-accent)] focus-visible:ring-offset-0 lg:w-[220px] lg:min-w-[220px]" style={{ background: 'var(--auth-input-bg)', borderColor: 'var(--auth-input-border)', boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.22), 0 0 0 1px transparent' }} value={filters.provider} onChange={(event) => setFilters((current) => ({ ...current, provider: event.target.value }))}>
                {PROVIDER_OPTIONS.map((option) => <option key={option || 'all-provider'} value={option}>{option || 'All providers'}</option>)}
              </select>
              <Button type="button" variant="ghost" onClick={handleClearFilters} className={filterClearButtonClassName} size="lg"><RefreshCw size={16} /> Clear filters</Button>
            </div>
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
        {actionSuccess && (
          <NoticeBanner variant="success" onDismiss={() => setActionSuccess('')}>
            {actionSuccess}
          </NoticeBanner>
        )}
      </div>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Accounts</h2>

        {loading ? (
          <Card className="p-8 text-sm text-muted-foreground">Loading users...</Card>
        ) : (
          <Card className="bg-white/70 p-3 dark:bg-white/5">
            <div className="max-h-[34rem] space-y-3 overflow-y-auto pr-2">
              {users.map((user) => (
                <Card key={user.id} className="bg-white/80 p-6 dark:bg-white/5">
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                    <div>
                      <p className="text-lg font-semibold">{user.fullName}</p>
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <Badge variant="info" className="min-w-[7.5rem] justify-center text-center">{user.role}</Badge>
                        <Badge variant={user.status === 'ACTIVE' ? 'success' : user.status === 'DISABLED' ? 'danger' : 'warning'} className="min-w-[7.5rem] justify-center text-center">{user.status}</Badge>
                        <Badge variant="neutral" className="min-w-[6rem] justify-center text-center">{user.authProviderType}</Badge>
                      </div>
                      <p className="mt-3 text-sm text-muted-foreground">{user.email}</p>
                      <div className="mt-3 flex flex-wrap gap-3 text-xs text-muted-foreground">
                        <span>Account ID: {user.id}</span>
                        {user.studentId && <span>Student ID: {user.studentId}</span>}
                        {user.faculty && <span>Faculty: {user.faculty}</span>}
                        {user.campus && <span>Campus: {user.campus}</span>}
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <Button
                        variant="outline"
                        className={getAccountActionButtonClassName(user.status)}
                        onClick={() => toggleStatus(user)}
                      >
                        {user.status === 'DISABLED' ? 'Activate' : 'Disable'}
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </Card>
        )}
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Invite history</h2>

        {(inviteHistoryActionError || inviteHistoryActionSuccess) && (
          <div className="space-y-3">
            {inviteHistoryActionError && (
              <NoticeBanner variant="warning" onDismiss={() => setInviteHistoryActionError('')}>
                {inviteHistoryActionError}
              </NoticeBanner>
            )}
            {inviteHistoryActionSuccess && (
              <NoticeBanner variant="success" onDismiss={() => setInviteHistoryActionSuccess('')}>
                {inviteHistoryActionSuccess}
              </NoticeBanner>
            )}
          </div>
        )}

        <Card className="bg-[linear-gradient(180deg,var(--auth-surface-strong),var(--auth-surface))] p-4 sm:p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:flex-wrap lg:items-start xl:flex-nowrap">
              <div className="relative min-h-[4.7rem] lg:min-w-[18rem] lg:flex-[1.35]">
                <Input
                  className={`auth-input h-11 rounded-2xl px-4 focus-visible:ring-[color:var(--auth-accent)] focus-visible:ring-offset-0 ${inviteHistorySearchTouched && inviteHistorySearchError ? 'border-danger/60 focus-visible:ring-danger' : ''}`}
                  placeholder="Filter invite name or email"
                  value={inviteHistoryFilters.query}
                  onChange={(event) => {
                    const nextQuery = event.target.value;
                    setInviteHistoryFilters((current) => ({ ...current, query: nextQuery }));
                    setInviteHistorySearchTouched(nextQuery.trim().length > 0);
                  }}
                  onBlur={() => setInviteHistorySearchTouched(true)}
                />
                {inviteHistorySearchTouched && inviteHistorySearchError && (
                  <p className="mt-2 text-sm leading-5 text-danger">{inviteHistorySearchError}</p>
                )}
              </div>
            <select
              className="h-11 w-full appearance-none rounded-2xl border px-4 pr-12 text-sm text-[color:var(--auth-chip-copy)] backdrop-blur-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--auth-accent)] focus-visible:ring-offset-0 lg:w-[220px] lg:min-w-[220px]"
              style={{ background: 'var(--auth-input-bg)', borderColor: 'var(--auth-input-border)', boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.22), 0 0 0 1px transparent' }}
              value={inviteHistoryFilters.role}
              onChange={(event) => setInviteHistoryFilters((current) => ({ ...current, role: event.target.value }))}
            >
              {INVITE_HISTORY_ROLE_OPTIONS.map((option) => <option key={option || 'all-invite-role'} value={option}>{option || 'All invite roles'}</option>)}
            </select>
            <select
              className="h-11 w-full appearance-none rounded-2xl border px-4 pr-12 text-sm text-[color:var(--auth-chip-copy)] backdrop-blur-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--auth-accent)] focus-visible:ring-offset-0 lg:w-[220px] lg:min-w-[220px]"
              style={{ background: 'var(--auth-input-bg)', borderColor: 'var(--auth-input-border)', boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.22), 0 0 0 1px transparent' }}
              value={inviteHistoryFilters.status}
              onChange={(event) => setInviteHistoryFilters((current) => ({ ...current, status: event.target.value }))}
            >
              {INVITE_HISTORY_STATUS_OPTIONS.map((option) => <option key={option || 'all-invite-status'} value={option}>{option || 'All invite statuses'}</option>)}
            </select>
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setInviteHistoryFilters(DEFAULT_INVITE_HISTORY_FILTERS);
                setInviteHistorySearchTouched(false);
              }}
              className={filterClearButtonClassName}
              size="lg"
            >
              <RefreshCw size={16} />
              Clear filters
            </Button>
          </div>
        </Card>

        <Card className="bg-white/70 p-3 dark:bg-white/5">
          <div className="max-h-[28rem] space-y-3 overflow-y-auto pr-2">
            {filteredInvites.length === 0 && (
              <Card className="bg-white/80 p-6 text-sm text-muted-foreground dark:bg-white/5">
                No invite history matches the current filters.
              </Card>
            )}
            {filteredInvites.map((invite) => (
              <Card key={invite.id} className="bg-white/80 p-6 dark:bg-white/5">
                <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                  <div className="min-w-0">
                    <div className="flex min-w-0 items-center gap-2 whitespace-nowrap">
                      <p className="min-w-0 truncate text-lg font-semibold">{invite.fullName}</p>
                      <Badge variant={invite.role === 'ADMIN' ? 'warning' : 'info'} className="shrink-0">{invite.role}</Badge>
                      <Badge variant={invite.status === 'ACCEPTED' ? 'success' : invite.status === 'REVOKED' ? 'danger' : invite.status === 'EXPIRED' ? 'warning' : 'info'} className="shrink-0">
                        {invite.status}
                      </Badge>
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">{invite.email}</p>
                  </div>
                  <div className="flex gap-3">
                    {invite.status === 'PENDING' && (
                      <Button
                        variant="outline"
                        className={inviteHistoryActionClassNames.resend}
                        onClick={() => runInviteAction(
                          () => resendUserInvite(invite.id),
                          `A fresh invite email was sent to ${invite.email}.`
                        )}
                      >
                        Resend
                      </Button>
                    )}
                    {invite.status === 'PENDING' && (
                      <Button
                        variant="outline"
                        className={inviteHistoryActionClassNames.revoke}
                        onClick={() => runInviteAction(
                          () => revokeUserInvite(invite.id),
                          `${invite.fullName} has been revoked and can no longer use this invite.`
                        )}
                      >
                        Revoke
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </Card>
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

const InviteField = ({ fieldId, label, error, children }) => (
  <div className="space-y-2">
    <label htmlFor={fieldId} className="block text-sm font-semibold">
      {label}
    </label>
    {children}
    {error && <p className="text-sm text-danger">{error}</p>}
  </div>
);

const InviteChecklistItem = ({ valid, label, neutral = false }) => {
  const textClass = neutral ? 'text-muted-foreground' : valid ? 'text-success' : 'text-danger';
  const iconClass = neutral
    ? 'bg-slate-200 text-muted-foreground dark:bg-white/10'
    : valid
      ? 'bg-success/12 text-success'
      : 'bg-danger/10 text-danger';

  return (
    <div className={`flex min-h-[2.75rem] items-start gap-2 text-sm leading-5 ${textClass}`}>
      <span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${iconClass}`}>
        {neutral ? <ShieldCheck size={12} /> : valid ? <CheckCircle2 size={12} /> : <AlertCircle size={12} />}
      </span>
      <span>{label}</span>
    </div>
  );
};

