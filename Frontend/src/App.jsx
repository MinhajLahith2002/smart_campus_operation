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
import { ReportIssuePage } from './pages/ReportIssuePage';
import { TicketDetailPage } from './pages/TicketDetailPage';
import { TechnicianTicketsPage } from './pages/TechnicianTicketsPage';

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

const RoleRoute = ({ roles, children }) => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/auth" replace />;
  if (!roles.includes(user.role)) return <Navigate to="/dashboard" replace />;
  return children;
};

const TicketsEntryRedirect = () => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/auth" replace />;
  if (user.role === 'ADMIN') return <Navigate to="/admin/tickets" replace />;
  if (user.role === 'TECHNICIAN') return <Navigate to="/tickets/assigned" replace />;
  return <Navigate to="/tickets/my" replace />;
};

export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/auth" element={<PublicOnlyRoute><AuthPage /></PublicOnlyRoute>} />

            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/catalogue" element={<ProtectedRoute><Catalogue /></ProtectedRoute>} />
            <Route path="/bookings/my" element={<ProtectedRoute><MyBookings /></ProtectedRoute>} />
            <Route path="/bookings/new" element={<ProtectedRoute><BookingRequest /></ProtectedRoute>} />

            <Route path="/tickets" element={<ProtectedRoute><TicketsEntryRedirect /></ProtectedRoute>} />
            <Route path="/tickets/my" element={<ProtectedRoute><RoleRoute roles={['USER']}><MyTickets /></RoleRoute></ProtectedRoute>} />
            <Route path="/tickets/new" element={<ProtectedRoute><RoleRoute roles={['USER', 'ADMIN', 'TECHNICIAN']}><ReportIssuePage /></RoleRoute></ProtectedRoute>} />
            <Route path="/tickets/assigned" element={<ProtectedRoute><RoleRoute roles={['TECHNICIAN']}><TechnicianTicketsPage /></RoleRoute></ProtectedRoute>} />
            <Route path="/tickets/:ticketId" element={<ProtectedRoute><TicketDetailPage /></ProtectedRoute>} />

            <Route path="/notifications" element={<ProtectedRoute><NotificationsPage /></ProtectedRoute>} />
            <Route path="/admin/bookings" element={<ProtectedRoute><RoleRoute roles={['ADMIN']}><AdminBookingsPage /></RoleRoute></ProtectedRoute>} />
            <Route path="/admin/tickets" element={<ProtectedRoute><RoleRoute roles={['ADMIN']}><AdminTicketsPage /></RoleRoute></ProtectedRoute>} />
            <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}
