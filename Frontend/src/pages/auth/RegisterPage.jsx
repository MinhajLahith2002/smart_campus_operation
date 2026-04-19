import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { AlertCircle, CheckCircle2, ChevronDown, Radar } from 'lucide-react';
import { Button, Card, Input, NoticeBanner, PasswordInput } from '../../components/ui/Primitives';
import { Navbar } from '../../components/Navbar';
import { completeGoogleOnboarding, getAuthConfig, getGoogleOnboarding, GOOGLE_LOGIN_URL, registerStudent } from '../../lib/authApi';
import { useAuth } from '../../context/AuthContext';
import authRegisterIllustration from '../../assets/auth-register-illustration.png';
import {
  CAMPUS_OPTIONS,
  FACULTY_OPTIONS,
  getPasswordChecklist,
  validateGoogleOnboarding,
  validateRegistration,
} from '../../lib/authValidation';

const initialForm = {
  fullName: '',
  email: '',
  password: '',
  confirmPassword: '',
  studentId: '',
  faculty: '',
  batch: '',
  campus: '',
  phone: '',
  acceptedTerms: false,
};

const initialSubmissionState = {
  complete: false,
  emailDeliveryEnabled: true,
  verificationLinkPreview: '',
};

const registerFieldClassName = 'auth-input h-12 rounded-2xl px-4 focus-visible:ring-[color:var(--auth-accent)] focus-visible:ring-offset-0';
const registerSelectClassName = 'h-12 w-full appearance-none rounded-2xl border px-4 pr-12 text-sm text-foreground backdrop-blur-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--auth-accent)] focus-visible:ring-offset-0';

export const RegisterPage = () => {
  const navigate = useNavigate();
  const { refreshSession } = useAuth();
  const [searchParams] = useSearchParams();
  const isGoogleMode = searchParams.get('mode') === 'google';
  const [form, setForm] = useState(initialForm);
  const [dirty, setDirty] = useState({});
  const [touched, setTouched] = useState({});
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [serverMessage, setServerMessage] = useState('');
  const [submitted, setSubmitted] = useState(initialSubmissionState);
  const [googleLoading, setGoogleLoading] = useState(isGoogleMode);
  const [googleSessionError, setGoogleSessionError] = useState('');
  const [googleEnabled, setGoogleEnabled] = useState(true);

  const passwordChecklist = useMemo(() => getPasswordChecklist(form.password), [form.password]);
  const validateForm = isGoogleMode ? validateGoogleOnboarding : validateRegistration;
  const formIsValid = Object.keys(validateForm(form)).length === 0;
  const passwordScore = passwordChecklist.filter((item) => item.valid).length;
  const passwordIsStrong = passwordScore === passwordChecklist.length;
  const passwordStrengthLabel = passwordIsStrong ? 'Strong' : passwordScore >= 3 ? 'Medium' : 'Weak';
  const passwordStrengthClass = passwordIsStrong ? 'text-success' : passwordScore >= 3 ? 'text-warning' : 'text-danger';
  const passwordBarClass = passwordIsStrong ? 'bg-success' : passwordScore >= 3 ? 'bg-warning' : 'bg-danger';
  const confirmTouched = touched.confirmPassword || dirty.confirmPassword || !!form.confirmPassword;
  const confirmMatches = !!form.confirmPassword && form.confirmPassword === form.password;
  const showPasswordHelper = !isGoogleMode && Boolean(form.password || dirty.password || touched.password);
  const showConfirmHelper = !isGoogleMode && Boolean(form.confirmPassword || dirty.confirmPassword || touched.confirmPassword);
  const shouldShowValidation = (field) => Boolean(dirty[field] || touched[field]);

  useEffect(() => {
    if (!isGoogleMode) return;

    let ignore = false;
    setGoogleLoading(true);
    getGoogleOnboarding()
      .then((payload) => {
        if (ignore) return;
        setForm((current) => ({
          ...current,
          fullName: payload.fullName || current.fullName,
          email: payload.email || current.email,
        }));
        setGoogleSessionError('');
      })
      .catch((error) => {
        if (ignore) return;
        setGoogleSessionError(error.message || 'Your Google onboarding session has expired. Please continue with Google again.');
      })
      .finally(() => {
        if (!ignore) setGoogleLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, [isGoogleMode]);

  useEffect(() => {
    let ignore = false;
    getAuthConfig()
      .then((config) => {
        if (!ignore) setGoogleEnabled(config.googleEnabled);
      })
      .catch(() => {
        if (!ignore) setGoogleEnabled(true);
      });

    return () => {
      ignore = true;
    };
  }, []);

  const applyFieldUpdate = (field, value) => {
    const nextForm = { ...form, [field]: value };
    setForm(nextForm);
    setDirty((current) => ({ ...current, [field]: true }));
    if (Object.keys(touched).length || Object.keys(dirty).length) {
      setErrors(validateForm(nextForm));
    }
  };

  const handleBlur = (field) => {
    setTouched((current) => ({ ...current, [field]: true }));
    setErrors(validateForm(form));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const keysToTouch = isGoogleMode
      ? ['fullName', 'studentId', 'faculty', 'batch', 'campus', 'phone', 'acceptedTerms']
      : Object.keys(form);
    const nextErrors = validateForm(form);
    setTouched(keysToTouch.reduce((accumulator, key) => ({ ...accumulator, [key]: true }), {}));
    setErrors(nextErrors);
    setServerMessage('');
    if (Object.keys(nextErrors).length) return;

    try {
      setSubmitting(true);
      if (isGoogleMode) {
        await completeGoogleOnboarding({
          fullName: form.fullName.trim(),
          studentId: form.studentId.trim().toUpperCase(),
          faculty: form.faculty,
          batch: form.batch.trim(),
          campus: form.campus,
          phone: form.phone.trim(),
          acceptedTerms: form.acceptedTerms,
        });
        await refreshSession();
        navigate('/dashboard', { replace: true });
      } else {
        const response = await registerStudent({
          ...form,
          fullName: form.fullName.trim(),
          email: form.email.trim().toLowerCase(),
          studentId: form.studentId.trim().toUpperCase(),
          batch: form.batch.trim(),
          phone: form.phone.trim(),
        });
        setSubmitted({
          complete: true,
          emailDeliveryEnabled: response?.emailDeliveryEnabled ?? true,
          verificationLinkPreview: response?.verificationLinkPreview || '',
        });
      }
    } catch (error) {
      if (error.details?.fields) {
        setErrors(error.details.fields);
      }
      setServerMessage(error.message || 'Unable to create your account.');
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted.complete) {
    return (
      <div className="min-h-screen px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <Navbar fixed />

          <div className="mx-auto max-w-xl py-8 text-center">
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-success/10 text-success">
              <CheckCircle2 size={48} />
            </div>
            <h1 className="text-3xl font-semibold">Registration submitted</h1>
            {submitted.emailDeliveryEnabled ? (
              <p className="mt-4 text-sm leading-7 text-muted-foreground">
                Your student account was created in a pending verification state. Check your email for the verification link before signing in.
              </p>
            ) : (
              <div className="mt-4 space-y-4">
                <NoticeBanner variant="warning" autoHideMs={0} dismissible={false} className="text-left">
                  Email delivery is not configured on this backend yet, so no real verification mail was sent.
                </NoticeBanner>
                <p className="text-sm leading-7 text-muted-foreground">
                  Your account was created successfully. Use the verification link below for now, or configure SMTP in the backend to send real emails.
                </p>
                {submitted.verificationLinkPreview ? (
                  <div className="rounded-2xl border border-border/70 bg-white/60 p-4 text-left backdrop-blur-sm dark:bg-white/5">
                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">Verification link</p>
                    <a
                      href={submitted.verificationLinkPreview}
                      className="mt-2 block break-all text-sm font-medium text-primary hover:underline"
                    >
                      {submitted.verificationLinkPreview}
                    </a>
                  </div>
                ) : null}
              </div>
            )}
            <div className="mt-8 flex flex-col gap-3">
              {!submitted.emailDeliveryEnabled && submitted.verificationLinkPreview ? (
                <Button
                  className="auth-primary-button w-full rounded-full text-white"
                  size="lg"
                  onClick={() => window.location.assign(submitted.verificationLinkPreview)}
                >
                  Verify Account Now
                </Button>
              ) : null}
              <Button
                className="auth-primary-button w-full rounded-full text-white"
                size="lg"
                onClick={() => navigate('/auth')}
              >
                Back to Sign In
              </Button>
              <Button
                variant="outline"
                className="w-full rounded-full border-[color:var(--auth-input-border)] bg-[var(--auth-chip-bg)] text-foreground"
                size="lg"
                onClick={() => navigate('/')}
              >
                Return to Landing Page
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (isGoogleMode && googleLoading) {
    return (
      <div className="min-h-screen px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <Navbar fixed />
          <div className="py-16 text-center text-sm text-muted-foreground">Loading Google student onboarding...</div>
        </div>
      </div>
    );
  }

  if (isGoogleMode && googleSessionError) {
    return (
      <div className="min-h-screen px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <Navbar fixed />
          <div className="mx-auto max-w-xl py-8 text-center">
            <Card className="bg-white/70 p-8 dark:bg-white/5">
              <h1 className="text-3xl font-semibold">Google onboarding unavailable</h1>
              <p className="mt-4 text-sm leading-7 text-muted-foreground">{googleSessionError}</p>
              <div className="mt-8 flex justify-center">
                <Button
                  className="auth-primary-button rounded-full px-8 text-white"
                  size="lg"
                  onClick={() => navigate('/auth')}
                >
                  Back to Sign In
                </Button>
              </div>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page min-h-screen px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <Navbar fixed />

        <section className="surface-strong auth-shell overflow-hidden">
          <div className="grid min-h-[calc(100svh-12rem)] lg:min-h-[720px] lg:grid-cols-[minmax(0,1fr)_minmax(0,0.94fr)]">
            <div className="auth-divider order-2 flex items-center px-6 py-8 sm:px-10 lg:order-1 lg:items-start lg:border-r lg:px-14 lg:py-14">
              <div className="mx-auto w-full max-w-xl">
                <p className="auth-kicker text-center text-xs font-bold uppercase tracking-[0.36em]">
                  {isGoogleMode ? 'Student Google onboarding' : 'Student registration'}
                </p>
                <div className="mt-5 text-center">
                  <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl">
                    {isGoogleMode ? 'Complete Setup' : 'Create Account'}
                  </h1>
                  <p className="auth-copy mx-auto mt-4 max-w-xl text-sm leading-7">
                    {isGoogleMode
                      ? 'Finish your student account details to continue with Google-based access.'
                      : 'Create your verified student account with the required academic details.'}
                  </p>
                </div>

                <div className="mt-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              {serverMessage && (
                <NoticeBanner variant="error" onDismiss={() => setServerMessage('')}>
                  {serverMessage}
                </NoticeBanner>
              )}

              <div className="grid gap-4 md:grid-cols-2">
                <Field className="md:col-span-2" label="Full name" error={shouldShowValidation('fullName') && errors.fullName}>
                  <Input className={registerFieldClassName} value={form.fullName} onChange={(event) => applyFieldUpdate('fullName', event.target.value)} onBlur={() => handleBlur('fullName')} placeholder="Enter your full name" />
                </Field>
                <Field label="Email" error={shouldShowValidation('email') && errors.email}>
                  <Input
                    className={registerFieldClassName}
                    type="email"
                    value={form.email}
                    onChange={(event) => applyFieldUpdate('email', event.target.value)}
                    onBlur={() => handleBlur('email')}
                    disabled={isGoogleMode}
                    placeholder="student@university.edu"
                  />
                </Field>
                <Field label="Phone" error={shouldShowValidation('phone') && errors.phone}>
                  <Input className={registerFieldClassName} value={form.phone} onChange={(event) => applyFieldUpdate('phone', event.target.value)} onBlur={() => handleBlur('phone')} placeholder="+94 761207356" />
                </Field>
                <Field label="Student ID" error={shouldShowValidation('studentId') && errors.studentId}>
                  <Input className={registerFieldClassName} value={form.studentId} onChange={(event) => applyFieldUpdate('studentId', event.target.value.toUpperCase())} onBlur={() => handleBlur('studentId')} placeholder="IT26833848" />
                </Field>
                <Field label="Faculty" error={shouldShowValidation('faculty') && errors.faculty}>
                  <div className="relative">
                    <select
                      className={registerSelectClassName}
                      style={{
                        background: 'var(--auth-input-bg)',
                        borderColor: 'var(--auth-input-border)',
                        boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.22), 0 0 0 1px transparent',
                      }}
                      value={form.faculty}
                      onChange={(event) => applyFieldUpdate('faculty', event.target.value)}
                      onBlur={() => handleBlur('faculty')}
                    >
                      <option value="">Select faculty</option>
                      {FACULTY_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                    </select>
                    <ChevronDown size={18} className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  </div>
                </Field>
                <Field label="SLIIT campus" error={shouldShowValidation('campus') && errors.campus}>
                  <div className="relative">
                    <select
                      className={registerSelectClassName}
                      style={{
                        background: 'var(--auth-input-bg)',
                        borderColor: 'var(--auth-input-border)',
                        boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.22), 0 0 0 1px transparent',
                      }}
                      value={form.campus}
                      onChange={(event) => applyFieldUpdate('campus', event.target.value)}
                      onBlur={() => handleBlur('campus')}
                    >
                      <option value="">Select campus</option>
                      {CAMPUS_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                    </select>
                    <ChevronDown size={18} className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  </div>
                </Field>
                <Field label="Batch" error={shouldShowValidation('batch') && errors.batch}>
                  <Input className={registerFieldClassName} value={form.batch} onChange={(event) => applyFieldUpdate('batch', event.target.value)} onBlur={() => handleBlur('batch')} placeholder="2026" />
                </Field>
              </div>

              {!isGoogleMode && (
                <>
                  <div className="grid gap-4 md:grid-cols-2">
                    <Field label="Password" error={shouldShowValidation('password') && errors.password}>
                      <PasswordInput className={registerFieldClassName} value={form.password} onChange={(event) => applyFieldUpdate('password', event.target.value)} onBlur={() => handleBlur('password')} placeholder="Create a strong password" />
                    </Field>
                    <Field label="Confirm password" error={shouldShowValidation('confirmPassword') && errors.confirmPassword}>
                      <PasswordInput className={registerFieldClassName} value={form.confirmPassword} onChange={(event) => applyFieldUpdate('confirmPassword', event.target.value)} onBlur={() => handleBlur('confirmPassword')} placeholder="Repeat your password" />
                    </Field>
                  </div>

                  {(showPasswordHelper || showConfirmHelper) && (
                    <div className={`grid gap-4 ${showPasswordHelper && showConfirmHelper ? 'lg:grid-cols-2' : ''}`}>
                      {showPasswordHelper && (
                        <div className={`rounded-[24px] border border-border/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.78),rgba(245,247,251,0.96))] px-5 py-4 shadow-[0_14px_30px_rgba(15,23,42,0.05)] dark:border-white/8 dark:bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.03))] ${showConfirmHelper ? '' : 'lg:col-span-2'}`}>
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-muted-foreground">
                          Password strength
                        </p>
                        <span className={`text-sm font-semibold ${passwordStrengthClass}`}>
                          {passwordStrengthLabel}
                        </span>
                      </div>

                      <div className="mt-3 grid grid-cols-5 gap-2">
                        {passwordChecklist.map((item, index) => (
                          <div
                            key={item.label}
                            className={`h-2.5 rounded-full transition-colors ${
                              index < passwordScore ? passwordBarClass : 'bg-slate-200 dark:bg-white/10'
                            }`}
                          />
                        ))}
                      </div>

                      <div className="mt-3 grid gap-x-4 gap-y-3 sm:grid-cols-2">
                        {passwordChecklist.map((item) => (
                          <div key={item.label} className={`flex min-h-[2.75rem] items-start gap-2 text-sm leading-5 ${item.valid ? 'text-success' : 'text-danger'}`}>
                            <span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${
                              item.valid ? 'bg-success/12 text-success' : 'bg-danger/10 text-danger'
                            }`}>
                              {item.valid ? <CheckCircle2 size={12} /> : <AlertCircle size={12} />}
                            </span>
                            <span>{item.label}</span>
                          </div>
                        ))}
                      </div>
                        </div>
                      )}

                      {showConfirmHelper && (
                        <div className="rounded-[24px] border border-border/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.78),rgba(245,247,251,0.96))] px-5 py-4 shadow-[0_14px_30px_rgba(15,23,42,0.05)] dark:border-white/8 dark:bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.03))]">
                      <div className="flex items-start justify-between gap-3">
                        <p className="max-w-[8rem] text-xs font-semibold uppercase tracking-[0.28em] text-muted-foreground">
                          Confirm password
                        </p>
                        <span className={`text-sm font-semibold ${confirmMatches ? 'text-success' : confirmTouched ? 'text-danger' : 'text-muted-foreground'}`}>
                          {confirmMatches ? 'Matched' : confirmTouched ? 'Not matched' : 'Pending'}
                        </span>
                      </div>

                      <div className="mt-3 grid grid-cols-2 gap-2">
                        <div className={`h-2.5 rounded-full transition-colors ${confirmMatches ? 'bg-success' : confirmTouched ? 'bg-danger' : 'bg-slate-200 dark:bg-white/10'}`} />
                        <div className={`h-2.5 rounded-full transition-colors ${confirmMatches ? 'bg-success' : 'bg-slate-200 dark:bg-white/10'}`} />
                      </div>

                      <div className={`mt-4 flex min-h-[8.5rem] items-start gap-2 text-sm leading-5 ${confirmMatches ? 'text-success' : confirmTouched ? 'text-danger' : 'text-muted-foreground'}`}>
                        <span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${
                          confirmMatches
                            ? 'bg-success/12 text-success'
                            : confirmTouched
                              ? 'bg-danger/10 text-danger'
                              : 'bg-slate-200 text-muted-foreground dark:bg-white/10'
                        }`}>
                          {confirmMatches ? <CheckCircle2 size={12} /> : <AlertCircle size={12} />}
                        </span>
                        <span>
                          {confirmMatches
                            ? 'Confirm password matches the password.'
                            : confirmTouched
                              ? 'Confirm password must match the password.'
                          : 'Re-enter the same password to confirm it.'}
                        </span>
                      </div>
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}

              <label className="flex items-start gap-3 text-sm">
                <span
                  className="relative mt-1 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-[4px] border shadow-sm transition"
                  style={{
                    borderColor: form.acceptedTerms ? 'var(--auth-consent-checkbox-active-border)' : 'var(--auth-consent-checkbox-border)',
                    backgroundColor: form.acceptedTerms ? 'var(--auth-consent-checkbox-active-bg)' : 'var(--auth-consent-checkbox-bg)',
                  }}
                >
                  <input
                    type="checkbox"
                    className="peer absolute inset-0 z-10 m-0 cursor-pointer opacity-0"
                    checked={form.acceptedTerms}
                    onChange={(event) => applyFieldUpdate('acceptedTerms', event.target.checked)}
                    onBlur={() => handleBlur('acceptedTerms')}
                  />
                  <svg
                    className={`pointer-events-none h-3.5 w-3.5 transition ${form.acceptedTerms ? 'opacity-100 text-white' : 'opacity-0 text-transparent'}`}
                    viewBox="0 0 16 16"
                    aria-hidden="true"
                  >
                    <path d="M3.75 8.25 6.4 10.9l5.85-5.85" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" />
                  </svg>
                </span>
                <span className="leading-7 font-medium" style={{ color: 'var(--auth-consent-text)' }}>
                  I confirm that my details are accurate and I agree to the campus platform access terms.
                  {shouldShowValidation('acceptedTerms') && errors.acceptedTerms && <span className="mt-2 block text-danger">{errors.acceptedTerms}</span>}
                </span>
              </label>
              <div className="mt-1">
                <Button
                  type="submit"
                  className="auth-primary-button w-full rounded-full text-white"
                  size="lg"
                  isLoading={submitting}
                  disabled={!formIsValid || submitting}
                >
                  {isGoogleMode ? 'Complete Google Student Setup' : 'Create Student Account'}
                </Button>
              </div>

              {!isGoogleMode && (
                <>
                  <div className="auth-option-divider auth-copy my-4 flex items-center gap-3 text-[11px] font-bold uppercase tracking-[0.28em]">
                    <div className="auth-option-divider-line h-px flex-1" />
                    Or
                    <div className="auth-option-divider-line h-px flex-1" />
                  </div>

                  <p className="auth-copy -mt-1 mb-5 text-center text-sm">
                    Students can create an account above or use Google login below.
                  </p>

                  <Button
                    type="button"
                    variant="outline"
                    size="lg"
                    className="auth-google-button w-full gap-2 rounded-full disabled:opacity-80 disabled:text-muted-foreground"
                    onClick={() => window.location.assign(GOOGLE_LOGIN_URL)}
                    disabled={!googleEnabled}
                  >
                    <GoogleMark />
                    Continue with Google
                  </Button>

                  {googleEnabled ? (
                    <p className="auth-copy mt-3 text-center text-sm">
                      Google sign-in creates or continues student access only. Admin and technician accounts remain local.
                    </p>
                  ) : (
                    <p className="auth-copy mt-3 text-center text-sm text-warning">
                      Google sign-in is currently unavailable because backend Google OAuth credentials are not configured yet.
                    </p>
                  )}
                </>
              )}

              <p className="auth-copy text-center text-sm">
                {isGoogleMode ? 'Need a different account? ' : 'Already registered? '}
                <Link to="/auth" className="auth-link font-semibold">
                  {isGoogleMode ? 'Login' : 'Login'}
                </Link>
              </p>
            </form>
                </div>
              </div>
            </div>

            <div className="auth-aside auth-divider relative order-1 flex items-center border-b px-6 py-8 sm:px-10 lg:order-2 lg:items-start lg:border-b-0 lg:px-12 lg:py-14">
              <div className="relative mx-auto flex w-full max-w-none flex-col">
                <div className="inline-flex w-fit items-center gap-3">
                  <div className="auth-brand-icon flex h-12 w-12 items-center justify-center rounded-2xl text-white">
                    <Radar size={20} />
                  </div>
                  <div className="min-w-0 sm:min-w-max">
                    <p className="auth-brand-title text-xs font-bold uppercase tracking-[0.24em]">CampusHub</p>
                    <p className="auth-brand-copy text-sm font-semibold sm:whitespace-nowrap">Bookings, assets, and maintenance</p>
                  </div>
                </div>

                <div className="mt-2 max-w-[42rem]">
                  <h2 className="text-[clamp(1.95rem,2.45vw,3rem)] font-semibold tracking-tight leading-[1.06] text-balance">
                    {isGoogleMode ? 'Finish your student onboarding' : 'Create your verified student account'}
                  </h2>
                  <p className="auth-copy mt-2 max-w-2xl text-base leading-7">
                    {isGoogleMode
                      ? 'Confirm your academic identity details and complete the final step for Google-based student access.'
                      : 'Provide your student details, secure password, and account consent to complete registration.'}
                  </p>
                </div>

                <div className="relative mt-4 flex-1">
                  <div className="auth-illustration-halo absolute inset-x-6 bottom-4 top-6 rounded-[40px] blur-3xl" />
                  <div className="relative overflow-hidden rounded-[38px] border border-transparent bg-transparent p-0 shadow-none">
                    <img
                      src={authRegisterIllustration}
                      alt="Illustration of a secure student sign up flow with profile setup and account verification"
                      className="relative mx-auto w-full max-w-[620px] object-contain"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

const Field = ({ label, error, children, className }) => (
  <label className={`space-y-2 text-sm font-semibold ${className || ''}`}>
    <span>{label}</span>
    {children}
    {error && <p className="text-sm text-danger">{error}</p>}
  </label>
);

const GoogleMark = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
    <path fill="#EA4335" d="M9 7.364v3.491h4.85C13.637 11.978 11.66 13.5 9 13.5A4.5 4.5 0 1 1 9 4.5c1.278 0 2.438.48 3.32 1.267l2.475-2.475A8.727 8.727 0 0 0 9 1.125a7.875 7.875 0 1 0 0 15.75c4.538 0 7.538-3.188 7.538-7.688 0-.516-.055-1.002-.153-1.823z" />
    <path fill="#4285F4" d="M16.538 9.188c0-.516-.055-1.002-.153-1.823H9v3.491h4.85c-.213 1.123-.99 2.078-2.1 2.72l3.222 2.497c1.878-1.73 2.966-4.278 2.966-6.885z" />
    <path fill="#FBBC05" d="M4.31 10.188A4.736 4.736 0 0 1 4.062 9c0-.413.09-.805.248-1.188L1.008 5.25A7.875 7.875 0 0 0 1.125 12.75z" />
    <path fill="#34A853" d="M9 16.875c2.16 0 3.973-.71 5.297-1.927l-3.222-2.497c-.895.6-2.04.95-3.075.95A4.5 4.5 0 0 1 4.31 10.19l-3.302 2.56A7.875 7.875 0 0 0 9 16.875z" />
  </svg>
);
