import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(undefined);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const savedUser = localStorage.getItem('hub_user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
  }, []);

  const login = (role, details = {}) => {
    const displayName =
      details.name ||
      (details.email
        ? details.email
            .split('@')[0]
            .split(/[._-]/)
            .filter(Boolean)
            .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
            .join(' ')
        : null);

    const mockUser = {
      id: role === 'ADMIN' ? 'admin-1' : role === 'TECHNICIAN' ? 'tech-1' : 'user-1',
      name: displayName || (role === 'ADMIN' ? 'Admin User' : role === 'TECHNICIAN' ? 'Tech Specialist' : 'Campus Student'),
      email: details.email || (role === 'ADMIN' ? 'admin@campus.edu' : role === 'TECHNICIAN' ? 'tech@campus.edu' : 'student@campus.edu'),
      role,
      avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${role}`,
    };
    setUser(mockUser);
    localStorage.setItem('hub_user', JSON.stringify(mockUser));
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('hub_user');
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
