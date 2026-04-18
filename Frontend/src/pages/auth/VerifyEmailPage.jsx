import React, { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CheckCircle2, MailCheck, Radar } from 'lucide-react';
import { Button } from '../../components/ui/Primitives';
import { Navbar } from '../../components/Navbar';
import authCampusOperationsIllustration from '../../assets/auth-campus-operations-illustration.png';
import { verifyEmailToken } from '../../lib/authApi';

export const VerifyEmailPage = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const [status, setStatus] = useState('loading');
  const [message, setMessage] = useState('Verifying your email address...');
  const processedTokenRef = useRef('');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('This verification link is missing a token.');
      return;
    }
    if (processedTokenRef.current === token) {
      return;
    }

    processedTokenRef.current = token;

    verifyEmailToken(token)
      .then((response) => {
        setStatus('success');
        setMessage(response.message);
      })
      .catch((error) => {
        setStatus('error');
        setMessage(error.message || 'Unable to verify this email link.');
      });
  }, [token]);

  return (
    <div className="auth-page min-h-screen px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <Navbar fixed />

        <section className="surface-strong auth-shell overflow-hidden">
          <div className="grid min-h-[calc(100svh-12rem)] lg:min-h-[640px] lg:grid-cols-[minmax(0,0.88fr)_minmax(0,1.12fr)]">
            <div className="auth-divider order-2 flex items-center px-6 py-8 sm:px-10 lg:order-1 lg:items-start lg:border-r lg:px-14 lg:py-14">
              <div className="mx-auto flex w-full max-w-md flex-col items-center text-center">
                <p className="auth-kicker text-center text-xs font-bold uppercase tracking-[0.36em]">Email verification</p>
                <div className="mt-5 text-center">
                  <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl">
                    {status === 'success' ? 'Email verified' : status === 'error' ? 'Verification failed' : 'Verifying email'}
                  </h1>
                  <p className="auth-copy mx-auto mt-4 max-w-md text-sm leading-7">
                    {message}
                  </p>
                </div>

                <div
                  className={`mx-auto mt-10 flex h-20 w-20 items-center justify-center rounded-full ${
                    status === 'success'
                      ? 'bg-success/10 text-success'
                      : status === 'error'
                        ? 'bg-danger/10 text-danger'
                        : 'bg-[rgba(47,91,255,0.1)] text-[var(--auth-accent)] dark:bg-[rgba(125,167,255,0.14)]'
                  }`}
                >
                  {status === 'success' ? <CheckCircle2 size={48} /> : <MailCheck size={48} />}
                </div>

                <div className="mt-8 flex w-full flex-col gap-3">
                  <Link to="/auth" className="block">
                    <Button className="auth-primary-button w-full rounded-full text-white" size="lg">
                      Back to Sign In
                    </Button>
                  </Link>
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

                <div className="mt-2 max-w-[44rem]">
                  <h2 className="text-[clamp(2rem,2.5vw,3.1rem)] font-semibold tracking-tight leading-[1.04] text-balance">
                    Manage campus operations
                  </h2>
                  <p className="auth-copy mt-2 max-w-2xl text-base leading-7">
                    Review bookings, issue queues, and secure access in one place.
                  </p>
                </div>

                <div className="relative mt-4 flex-1">
                  <div className="auth-illustration-halo absolute inset-x-6 bottom-4 top-6 rounded-[40px] blur-3xl" />
                  <div className="relative overflow-hidden rounded-[38px] border border-transparent bg-transparent p-0 shadow-none">
                    <img
                      src={authCampusOperationsIllustration}
                      alt="Illustration of campus operations dashboards, support checklists, and live activity monitoring"
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
