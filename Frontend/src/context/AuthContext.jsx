import React, { createContext, useContext, useState, useEffect } from 'react';
import { getRoleCredentials } from '../lib/authDefaults';

const AuthContext = createContext(undefined);

const normaliseUser = (role, details = {}) => {
  const defaults = getRoleCredentials(role);
  return {
    id: details.id || defaults.id,
    name: details.name || defaults.name,
    email: details.email || defaults.email,
    campusId: details.campusId || defaults.campusId,
    role,
    avatar: details.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${role}`,
  };
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const savedUser = localStorage.getItem('hub_user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
  }, []);

  const login = (role, details = {}) => {
    const nextUser = normaliseUser(role, details);
    setUser(nextUser);
    localStorage.setItem('hub_user', JSON.stringify(nextUser));
    return nextUser;
  };

  const setAuthenticatedUser = (details) => {
    const nextUser = normaliseUser(details.role, details);
    setUser(nextUser);
    localStorage.setItem('hub_user', JSON.stringify(nextUser));
    return nextUser;
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('hub_user');
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, setAuthenticatedUser, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
