import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { AppShell } from './components/AppShell';
import { LandingPage } from './pages/LandingPage';
import { Dashboard } from './pages/Dashboard';
import { Catalogue } from './pages/Catalogue';
import { BookingRequest } from './pages/BookingRequest';
import { MyBookings } from './pages/MyBookings';
import { MyTickets } from './pages/MyTickets';
import { AuthPage } from './pages/AuthPage';
import { NotificationsPage } from './pages/NotificationsPage';
import { AdminBookingsPage } from './pages/AdminBookingsPage';
import { AdminTicketsPage } from './pages/AdminTicketsPage';
import { SettingsPage } from './pages/SettingsPage';

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) return <Navigate to="/auth" replace />;
  return <AppShell>{children}</AppShell>;
};

const PublicOnlyRoute = ({ children }) => {
  const { isAuthenticated } = useAuth();
  if (isAuthenticated) return <Navigate to="/dashboard" replace />;
  return children;
};

export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/auth" element={<PublicOnlyRoute><AuthPage /></PublicOnlyRoute>} />
            
            <Route path="/dashboard" element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            } />
            
            <Route path="/catalogue" element={
              <ProtectedRoute>
                <Catalogue />
              </ProtectedRoute>
            } />

            <Route path="/bookings/my" element={<ProtectedRoute><MyBookings /></ProtectedRoute>} />
            <Route path="/bookings/new" element={<ProtectedRoute><BookingRequest /></ProtectedRoute>} />
            <Route path="/tickets/my" element={<ProtectedRoute><MyTickets /></ProtectedRoute>} />
            <Route path="/tickets/new" element={<ProtectedRoute><PlaceholderPage title="Report Issue" /></ProtectedRoute>} />
            <Route path="/notifications" element={<ProtectedRoute><NotificationsPage /></ProtectedRoute>} />
            <Route path="/admin/bookings" element={<ProtectedRoute><AdminBookingsPage /></ProtectedRoute>} />
            <Route path="/admin/tickets" element={<ProtectedRoute><AdminTicketsPage /></ProtectedRoute>} />
            <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
            
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}

const PlaceholderPage = ({ title }) => (
  <div className="py-12 text-center">
    <h1 className="text-3xl font-bold mb-4">{title}</h1>
    <p className="text-muted-foreground">This page is currently under development as part of the premium frontend handover.</p>
    <div className="mt-8 max-w-md mx-auto p-6 border border-dashed border-border rounded-2xl">
      <div className="animate-pulse space-y-4">
        <div className="h-4 bg-muted rounded w-3/4 mx-auto" />
        <div className="h-4 bg-muted rounded w-1/2 mx-auto" />
        <div className="grid grid-cols-3 gap-4 mt-8">
          <div className="h-20 bg-muted rounded-xl" />
          <div className="h-20 bg-muted rounded-xl" />
          <div className="h-20 bg-muted rounded-xl" />
        </div>
      </div>
    </div>
  </div>
);
