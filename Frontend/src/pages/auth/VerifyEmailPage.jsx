import React, { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CheckCircle2, MailCheck } from 'lucide-react';
import { Button, Card } from '../../components/ui/Primitives';
import { Navbar } from '../../components/Navbar';
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
        <div className="mx-auto max-w-xl py-8">
      <Card className="bg-[linear-gradient(180deg,var(--auth-surface-strong),var(--auth-surface))] p-8 text-center">
        <div className={`mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full ${status === 'success' ? 'bg-success/10 text-success' : 'bg-primary/10 text-primary'}`}>
          {status === 'success' ? <CheckCircle2 size={48} /> : <MailCheck size={48} />}
        </div>
        <h1 className="text-3xl font-semibold">{status === 'success' ? 'Email verified' : status === 'error' ? 'Verification failed' : 'Verifying email'}</h1>
        <p className="auth-copy mt-4 text-sm leading-7">{message}</p>
        <div className="mt-8 flex justify-center">
          <Link to="/auth"><Button className="auth-primary-button rounded-full px-8 text-white" size="lg">Back to Sign In</Button></Link>
        </div>
      </Card>
        </div>
      </div>
    </div>
  );
};
