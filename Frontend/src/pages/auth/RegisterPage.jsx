import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, ShieldCheck } from 'lucide-react';
import { Badge, Button, Card, Input } from '../../components/ui/Primitives';
import { Navbar } from '../../components/Navbar';
import { completeGoogleOnboarding, getGoogleOnboarding, registerStudent } from '../../lib/authApi';
import { useAuth } from '../../context/AuthContext';
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

export const RegisterPage = () => {
  const navigate = useNavigate();
  const { refreshSession } = useAuth();
  const [searchParams] = useSearchParams();
  const isGoogleMode = searchParams.get('mode') === 'google';
  const [form, setForm] = useState(initialForm);
  const [touched, setTouched] = useState({});
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [serverMessage, setServerMessage] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(isGoogleMode);
  const [googleSessionError, setGoogleSessionError] = useState('');

  const passwordChecklist = useMemo(() => getPasswordChecklist(form.password), [form.password]);
  const validateForm = isGoogleMode ? validateGoogleOnboarding : validateRegistration;
  const formIsValid = Object.keys(validateForm(form)).length === 0;

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

  const applyFieldUpdate = (field, value) => {
    const nextForm = { ...form, [field]: value };
    setForm(nextForm);
    if (Object.keys(touched).length) {
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
        await registerStudent({
          ...form,
          fullName: form.fullName.trim(),
          email: form.email.trim().toLowerCase(),
          studentId: form.studentId.trim().toUpperCase(),
          batch: form.batch.trim(),
          phone: form.phone.trim(),
        });
        setSubmitted(true);
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

  if (submitted) {
    return (
      <div className="min-h-screen px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <Navbar fixed />

          <div className="mx-auto max-w-xl py-8 text-center">
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-success/10 text-success">
              <CheckCircle2 size={48} />
            </div>
            <h1 className="text-3xl font-semibold">Registration submitted</h1>
            <p className="mt-4 text-sm leading-7 text-muted-foreground">
              Your student account was created in a pending verification state. Check your email for the verification link before signing in.
            </p>
            <div className="mt-8 flex flex-col gap-3">
              <Button onClick={() => navigate('/auth')}>Back to Sign In</Button>
              <Button variant="outline" onClick={() => navigate('/')}>Return to Landing Page</Button>
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
                <Button onClick={() => navigate('/auth')}>Back to Sign In</Button>
              </div>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl space-y-8">
        <Navbar fixed />

        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-primary">
          <ArrowLeft size={16} /> Back
        </button>

        <section className="surface-strong p-6 md:p-8">
          <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
            <div>
              <div className="eyebrow mb-4">{isGoogleMode ? 'Student Google onboarding' : 'Student registration'}</div>
              <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
                {isGoogleMode
                  ? 'Finish your Google-based student account with strict identity validation.'
                  : 'Create one verified local student account with strict identity validation.'}
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-muted-foreground">
                {isGoogleMode
                  ? 'Google confirms your identity first, then the onboarding form captures the student data needed to finalize a Google-only student account.'
                  : 'Registration is limited to student users. Roles are assigned by the backend, student IDs stay unique to one email, and new local accounts begin in a pending verification state.'}
              </p>
            </div>
            <div className="rounded-[28px] border border-border bg-slate-950 p-5 text-white">
              <p className="text-xs font-bold uppercase tracking-[0.24em] text-slate-400">Validation rules</p>
              <div className="mt-5 space-y-3 text-sm text-slate-300">
                <p>Student ID prefix must match faculty.</p>
                <p>Batch must match the year encoded in the student ID.</p>
                <p>Phone must match `+94 7XXXXXXXX`.</p>
                <p>{isGoogleMode ? 'Google accounts stay Google-only after onboarding.' : 'Passwords require uppercase, lowercase, number, and symbol.'}</p>
              </div>
            </div>
          </div>
        </section>

        <div className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr]">
          <Card className="bg-white/70 p-8 dark:bg-white/5">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Full Name" error={touched.fullName && errors.fullName}>
                  <Input value={form.fullName} onChange={(event) => applyFieldUpdate('fullName', event.target.value)} onBlur={() => handleBlur('fullName')} />
                </Field>
                <Field label="Email" error={touched.email && errors.email}>
                  <Input
                    type="email"
                    value={form.email}
                    onChange={(event) => applyFieldUpdate('email', event.target.value)}
                    onBlur={() => handleBlur('email')}
                    disabled={isGoogleMode}
                  />
                </Field>
                <Field label="Student ID" error={touched.studentId && errors.studentId}>
                  <Input value={form.studentId} onChange={(event) => applyFieldUpdate('studentId', event.target.value.toUpperCase())} onBlur={() => handleBlur('studentId')} placeholder="IT20240001" />
                </Field>
                <Field label="Faculty" error={touched.faculty && errors.faculty}>
                  <select className="flex h-11 w-full rounded-xl border border-border bg-white/45 px-3 py-2 text-sm dark:bg-white/5" value={form.faculty} onChange={(event) => applyFieldUpdate('faculty', event.target.value)} onBlur={() => handleBlur('faculty')}>
                    <option value="">Select faculty</option>
                    {FACULTY_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                  </select>
                </Field>
                <Field label="Batch" error={touched.batch && errors.batch}>
                  <Input value={form.batch} onChange={(event) => applyFieldUpdate('batch', event.target.value)} onBlur={() => handleBlur('batch')} placeholder="2024" />
                </Field>
                <Field label="Campus" error={touched.campus && errors.campus}>
                  <select className="flex h-11 w-full rounded-xl border border-border bg-white/45 px-3 py-2 text-sm dark:bg-white/5" value={form.campus} onChange={(event) => applyFieldUpdate('campus', event.target.value)} onBlur={() => handleBlur('campus')}>
                    <option value="">Select campus</option>
                    {CAMPUS_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                  </select>
                </Field>
                <Field label="Phone" error={touched.phone && errors.phone}>
                  <Input value={form.phone} onChange={(event) => applyFieldUpdate('phone', event.target.value)} onBlur={() => handleBlur('phone')} placeholder="+94 712345678" />
                </Field>
              </div>

              {!isGoogleMode && (
                <>
                  <div className="grid gap-4 md:grid-cols-2">
                    <Field label="Password" error={touched.password && errors.password}>
                      <Input type="password" value={form.password} onChange={(event) => applyFieldUpdate('password', event.target.value)} onBlur={() => handleBlur('password')} />
                    </Field>
                    <Field label="Confirm Password" error={touched.confirmPassword && errors.confirmPassword}>
                      <Input type="password" value={form.confirmPassword} onChange={(event) => applyFieldUpdate('confirmPassword', event.target.value)} onBlur={() => handleBlur('confirmPassword')} />
                    </Field>
                  </div>

                  <div className="rounded-2xl border border-border bg-muted/55 px-4 py-4 dark:bg-white/5">
                    <p className="text-sm font-semibold">Password checklist</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {passwordChecklist.map((item) => (
                        <Badge key={item.label} variant={item.valid ? 'success' : 'neutral'}>
                          {item.label}
                        </Badge>
                      ))}
                    </div>
                    {form.confirmPassword && (
                      <p className={form.confirmPassword === form.password ? 'mt-3 text-sm text-success' : 'mt-3 text-sm text-warning'}>
                        {form.confirmPassword === form.password ? 'Passwords match.' : 'Passwords do not match yet.'}
                      </p>
                    )}
                  </div>
                </>
              )}

              <label className="flex items-start gap-3 rounded-2xl border border-border bg-white/45 px-4 py-4 text-sm dark:bg-white/5">
                <input
                  type="checkbox"
                  className="mt-1 h-4 w-4 rounded border-border"
                  checked={form.acceptedTerms}
                  onChange={(event) => applyFieldUpdate('acceptedTerms', event.target.checked)}
                  onBlur={() => handleBlur('acceptedTerms')}
                />
                <span>
                  I confirm that my details are accurate and I agree to the student account terms for Smart Campus Operations Hub.
                  {touched.acceptedTerms && errors.acceptedTerms && <span className="mt-2 block text-danger">{errors.acceptedTerms}</span>}
                </span>
              </label>

              {serverMessage && <div className="rounded-2xl border border-danger/30 bg-danger/5 px-4 py-4 text-sm text-danger">{serverMessage}</div>}

              <div className="flex flex-col gap-3 sm:flex-row">
                <Button type="submit" isLoading={submitting} disabled={!formIsValid || submitting}>
                  {isGoogleMode ? 'Complete Google Student Setup' : 'Create Student Account'}
                </Button>
                <Link to="/auth"><Button type="button" variant="outline">Back to Sign In</Button></Link>
              </div>
            </form>
          </Card>

          <div className="space-y-6">
            <Card className="bg-primary/5 p-6 border-primary/20">
              <div className="mb-4 flex items-center gap-2 font-semibold"><ShieldCheck size={18} className="text-primary" /> Account policy</div>
              <p className="text-sm leading-7 text-muted-foreground">
                Admin and technician roles are not available here. Admin access comes from backend bootstrap configuration, technician accounts are created only through admin invitations, and student accounts keep either local or Google sign-in rather than both.
              </p>
            </Card>

            <Card className="bg-white/70 p-6 dark:bg-white/5">
              <p className="text-sm font-semibold">Already have an account?</p>
              <p className="mt-2 text-sm leading-7 text-muted-foreground">
                {isGoogleMode
                  ? 'Finish this onboarding flow to keep your student account Google-only. If you need email and password access instead, return and use local registration.'
                  : 'Local student accounts use email and password only. If you want a Google-based student account, start from the Google button on the sign-in page instead of registering here.'}
              </p>
              <Link to="/auth" className="mt-3 inline-flex text-sm font-semibold text-primary">Return to sign in</Link>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

const Field = ({ label, error, children }) => (
  <label className="space-y-2 text-sm font-semibold">
    <span>{label}</span>
    {children}
    {error && <p className="text-sm text-danger">{error}</p>}
  </label>
);
