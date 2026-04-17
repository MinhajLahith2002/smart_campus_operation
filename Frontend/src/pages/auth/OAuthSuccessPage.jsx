import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Card } from '../../components/ui/Primitives';
import { useAuth } from '../../context/AuthContext';
import { Navbar } from '../../components/Navbar';

export const OAuthSuccessPage = () => {
  const navigate = useNavigate();
  const { refreshSession } = useAuth();
  const [error, setError] = useState('');

  useEffect(() => {
    refreshSession()
      .then((currentUser) => {
        if (currentUser) {
          navigate('/dashboard');
          return;
        }
        setError('Unable to complete Google sign-in.');
      })
      .catch((requestError) => {
        setError(requestError.message || 'Unable to complete Google sign-in.');
      });
  }, [navigate, refreshSession]);

  if (!error) {
    return (
      <div className="auth-page min-h-screen px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <Navbar fixed />
          <div className="py-16 text-center text-sm text-muted-foreground">Finishing Google sign-in...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page min-h-screen px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <Navbar fixed />
        <div className="mx-auto max-w-xl py-8">
      <Card className="bg-[linear-gradient(180deg,var(--auth-surface-strong),var(--auth-surface))] p-8 text-center">
        <h1 className="text-3xl font-semibold">Google sign-in failed</h1>
        <p className="auth-copy mt-4 text-sm leading-7">{error}</p>
        <div className="mt-8 flex justify-center">
          <Button className="auth-primary-button rounded-full px-8 text-white" size="lg" onClick={() => navigate('/auth')}>Back to Sign In</Button>
        </div>
      </Card>
        </div>
      </div>
    </div>
  );
};
