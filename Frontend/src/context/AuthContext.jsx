import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { getCurrentUser, loginWithEmail, logoutSession } from '../lib/authApi';

const AuthContext = createContext(undefined);

const normaliseUser = (role, details = {}) => {
  const defaults = getRoleCredentials(role);
  return {
    id: details.id || defaults.id,
    name: details.name || defaults.name,
    email: details.email || defaults.email,
    campusId: details.campusId || defaults.campusId,
    phone: details.phone || defaults.phone,
    role,
    avatar: details.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${role}`,
  };
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  useEffect(() => {
    refreshSession();
  }, []);

  const mapUser = (payload) => {
    const apiUser = payload?.user || payload;
    if (!apiUser) return null;

    const frontendRole = apiUser.role === 'STUDENT' ? 'USER' : apiUser.role;
    return {
      id: apiUser.id,
      name: apiUser.fullName,
      email: apiUser.email,
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
      avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(apiUser.email)}`,
    };
  };

  const refreshSession = async () => {
    try {
      const data = await getCurrentUser();
      const mapped = mapUser(data);
      setUser(mapped);
      return mapped;
    } catch (error) {
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
      const data = await loginWithEmail(credentials);
      const mapped = mapUser(data);
      setUser(mapped);
      return mapped;
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
