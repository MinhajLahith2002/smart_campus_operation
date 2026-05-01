import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { getCurrentUser, loginWithEmail, logoutSession } from '../lib/authApi';

const AuthContext = createContext(undefined);

const resolveDisplayName = (apiUser) => {
  const rawName = apiUser?.fullName || apiUser?.name || apiUser?.full_name || '';
  const trimmedName = typeof rawName === 'string' ? rawName.trim() : '';
  if (trimmedName) return trimmedName;

  const rawEmail = typeof apiUser?.email === 'string' ? apiUser.email.trim() : '';
  if (rawEmail.includes('@')) {
    return rawEmail.split('@')[0];
  }

  return 'Campus User';
};

const mapUser = (payload) => {
  const apiUser = payload?.user || payload;
  if (!apiUser) return null;

  const frontendRole = apiUser.role === 'STUDENT' ? 'USER' : apiUser.role;
  const email = typeof apiUser.email === 'string' ? apiUser.email.trim().toLowerCase() : '';

  return {
    id: apiUser.id,
    name: resolveDisplayName(apiUser),
    email,
    role: frontendRole,
    backendRole: apiUser.role,
    status: apiUser.status,
    authProviderType: apiUser.authProviderType,
    emailVerified: apiUser.emailVerified,
    studentId: apiUser.studentId,
    faculty: apiUser.faculty,
    batch: apiUser.batch,
    campus: apiUser.campus,
    phone: apiUser.phone,
    avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(email || apiUser.id || frontendRole || 'campus-user')}`,
  };
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  useEffect(() => {
    refreshSession();
  }, []);

  const refreshSession = async () => {
    try {
      const data = await getCurrentUser();
      const mapped = mapUser(data);
      setUser(mapped);
      return mapped;
    } catch (error) {
      if (error.status === 0) {
        setUser(null);
        return null;
      }
      if (error.status !== 401) {
        console.error(error);
        throw error;
      }
      setUser(null);
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (credentials) => {
    setIsAuthenticating(true);
    try {
      await loginWithEmail(credentials);
      return await refreshSession();
    } finally {
      setIsAuthenticating(false);
    }
  };

  const logout = async () => {
    try {
      await logoutSession();
    } finally {
      setUser(null);
    }
  };

  const value = useMemo(() => ({
    user,
    login,
    logout,
    refreshSession,
    isAuthenticated: !!user,
    isLoading,
    isAuthenticating,
  }), [user, isLoading, isAuthenticating]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
