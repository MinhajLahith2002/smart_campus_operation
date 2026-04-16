import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Card } from '../components/ui/Primitives';
import { useAuth } from '../context/AuthContext';

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
    return <div className="px-4 py-16 text-center text-sm text-muted-foreground">Finishing Google sign-in...</div>;
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-16 sm:px-6">
      <Card className="bg-white/70 p-8 text-center dark:bg-white/5">
        <h1 className="text-3xl font-semibold">Google sign-in failed</h1>
        <p className="mt-4 text-sm leading-7 text-muted-foreground">{error}</p>
        <div className="mt-8 flex justify-center">
          <Button onClick={() => navigate('/auth')}>Back to Sign In</Button>
        </div>
      </Card>
    </div>
  );
};
